'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ParsedProductRow {
  product_code: string;
  product_name: string;
  product_group?: string;
  series_name?: string;
  size?: string;
  unit?: string;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
  default_sale_price?: number | null;
}

export async function saveExcelProducts(payload: {
  fileName: string;
  sheetName: string;
  products: ParsedProductRow[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açılmamış.");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Şirket profili bulunamadı.");

  const companyId = profile.company_id;

  // 1. Import kaydı aç
  const { data: importRecord, error: importErr } = await supabase
    .from("product_imports")
    .insert({
      company_id: companyId,
      file_name: payload.fileName,
      storage_path: "excel/" + payload.fileName,
      sheet_name: payload.sheetName,
      status: "processing",
      total_rows: payload.products.length,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (importErr) throw new Error(importErr.message);
  const importId = (importRecord as { id: string })?.id;

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  // 2. Ürünleri batch halinde upsert et
  for (const item of payload.products) {
    if (!item.product_code || !item.product_name) {
      errors++;
      continue;
    }

    // Mevcut ürün var mı?
    const { data: existingData } = await supabase
      .from("products")
      .select("id, price_quality_1, price_quality_2, price_commercial")
      .eq("company_id", companyId)
      .eq("product_code", item.product_code.trim())
      .single();

    const existing = existingData as {
      id: string;
      price_quality_1: number | null;
      price_quality_2: number | null;
      price_commercial: number | null;
    } | null;

    if (existing) {
      // Güncelle
      const { error: updateErr } = await supabase
        .from("products")
        .update({
          product_name: item.product_name.trim(),
          product_group: item.product_group?.trim() || null,
          series_name: item.series_name?.trim() || null,
          size: item.size?.trim() || null,
          unit: item.unit?.trim() || "M2",
          price_quality_1: item.price_quality_1 ?? existing.price_quality_1,
          price_quality_2: item.price_quality_2 ?? existing.price_quality_2,
          price_commercial: item.price_commercial ?? existing.price_commercial,
          default_sale_price: item.default_sale_price ?? item.price_quality_1,
          last_import_id: importId,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        } as never)
        .eq("id", existing.id);

      if (updateErr) {
        errors++;
      } else {
        updated++;
        // Fiyat değiştiyse fiyat geçmişi yaz
        if (
          item.price_quality_1 !== existing.price_quality_1 ||
          item.price_quality_2 !== existing.price_quality_2 ||
          item.price_commercial !== existing.price_commercial
        ) {
          await supabase.from("product_price_history").insert({
            company_id: companyId,
            product_id: existing.id,
            price_quality_1: item.price_quality_1,
            price_quality_2: item.price_quality_2,
            price_commercial: item.price_commercial,
            source_import_id: importId,
            created_by: user.id,
          } as never);
        }
      }
    } else {
      // Yeni Ekle
      const { error: insertErr } = await supabase.from("products").insert({
        company_id: companyId,
        product_code: item.product_code.trim(),
        product_name: item.product_name.trim(),
        product_group: item.product_group?.trim() || null,
        series_name: item.series_name?.trim() || null,
        size: item.size?.trim() || null,
        unit: item.unit?.trim() || "M2",
        price_quality_1: item.price_quality_1 ?? null,
        price_quality_2: item.price_quality_2 ?? null,
        price_commercial: item.price_commercial ?? null,
        default_sale_price: item.default_sale_price ?? item.price_quality_1 ?? 0,
        stock_qty: 0,
        min_stock_qty: 0,
        allows_decimal_qty: true,
        last_import_id: importId,
        created_by: user.id,
      } as never);

      if (insertErr) {
        errors++;
      } else {
        inserted++;
      }
    }
  }

  // 3. Import durumunu güncelle
  await supabase
    .from("product_imports")
    .update({
      status: "completed",
      inserted_rows: inserted,
      updated_rows: updated,
      error_rows: errors,
      completed_at: new Date().toISOString(),
      summary: `Toplam: ${payload.products.length}, Yeni: ${inserted}, Güncellenen: ${updated}, Hatalı: ${errors}`,
    } as never)
    .eq("id", importId);

  revalidatePath("/import");
  revalidatePath("/urunler");

  return { success: true, inserted, updated, errors };
}

export async function savePdfDocument(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açılmamış.");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Şirket profili bulunamadı.");

  const title = formData.get("title") as string;
  const category = (formData.get("category") as string) || "Fiyat Listesi";
  const notes = (formData.get("notes") as string) || "";
  const file = formData.get("file") as File | null;

  if (!title) throw new Error("Belge başlığı gereklidir.");

  const fileName = file?.name || `${title}.pdf`;
  const storagePath = `pdf/${Date.now()}_${fileName}`;

  // product_imports tablosunda belge kaydı oluştur
  const { data: importRecord, error } = await supabase
    .from("product_imports")
    .insert({
      company_id: profile.company_id,
      file_name: `[PDF - ${category}] ${title} (${fileName})`,
      storage_path: storagePath,
      sheet_name: "PDF_KATALOG",
      status: "completed",
      total_rows: 1,
      inserted_rows: 1,
      updated_rows: 0,
      error_rows: 0,
      summary: `PDF Belgesi: ${category}. Notlar: ${notes}`,
      created_by: user.id,
      completed_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/import");
  return { success: true, id: (importRecord as { id: string })?.id };
}
