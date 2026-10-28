'use server';

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateLine, calculateTotals } from "@/lib/calculations";

export async function updateQuoteStatus(quoteId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("quotes")
    .update({ status } as never)
    .eq("id", quoteId);

  if (error) throw new Error(error.message);
  revalidatePath(`/teklifler/${quoteId}`);
  revalidatePath(`/teklifler`);
}

/**
 * Teklifi doğrudan onaylayıp satışa dönüştürür ve satışı tamamlar:
 * - Stoktan otomatik düşer
 * - Finans gelirlerine (ciro ve tahsilat) yansıtır
 * - Teklif durumunu 'converted_to_sale' yapar
 */
export async function convertAndCompleteSale(quoteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açılmamış.");

  // 1. Teklifi satışa dönüştür (RPC)
  const { data: convData, error: convErr } = await supabase.rpc("convert_quote_to_sale" as never, {
    p_quote_id: quoteId,
    p_user_id: user.id,
  } as never);

  if (convErr) throw new Error(convErr.message);

  const result = convData as { success: boolean; sale_id: string; sale_code: string } | null;
  const saleId = result?.sale_id;
  if (!saleId) throw new Error("Satış oluşturulamadı.");

  // 2. Satışı tamamla (Stok düşürür, tahsilat & gelir tablosuna işler)
  const { error: finErr } = await supabase.rpc("finalize_sale" as never, {
    p_sale_id: saleId,
    p_user_id: user.id,
  } as never);

  if (finErr) throw new Error(finErr.message);

  revalidatePath(`/teklifler`);
  revalidatePath(`/teklifler/${quoteId}`);
  revalidatePath(`/satislar`);
  revalidatePath(`/satislar/${saleId}`);
  revalidatePath(`/dashboard`);
  revalidatePath(`/finans`);
  revalidatePath(`/stok`);

  redirect(`/satislar/${saleId}`);
}

/**
 * Teklifi güncelleme (ürün ekleme / çıkartma / miktar / fiyat değişimi)
 */
export async function updateQuote(
  quoteId: string,
  data: {
    items: Array<{
      product_id: string | null;
      product_code_snapshot: string;
      product_name_snapshot: string;
      description_snapshot?: string;
      unit_snapshot: string;
      price_source?: string;
      quantity: number;
      unit_price: number;
      discount_type?: "percent" | "fixed" | null;
      discount_value?: number;
    }>;
    customerId?: string | null;
    customerSnapshot?: any;
    generalDiscountType?: "percent" | "fixed" | null;
    generalDiscountValue?: number;
    vatRate?: number;
    validUntil?: string;
    deliveryTerms?: string;
    paymentTerms?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açılmamış.");

  // Sunucu tarafında satır ve toplamları baştan hesapla
  const lines = data.items.map((item) =>
    calculateLine({
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
    })
  );

  const vatRate = data.vatRate ?? 20;
  const totals = calculateTotals(lines, vatRate, data.generalDiscountType, data.generalDiscountValue);

  // 1. Quotes tablosunu güncelle
  const updatePayload: Record<string, any> = {
    subtotal: totals.subtotal,
    line_discount_total: totals.line_discount_total,
    general_discount_type: data.generalDiscountType,
    general_discount_value: data.generalDiscountValue,
    general_discount_amount: totals.general_discount_amount,
    net_total: totals.net_total,
    vat_rate: vatRate,
    vat_total: totals.vat_total,
    grand_total: totals.grand_total,
    valid_until: data.validUntil,
    delivery_terms: data.deliveryTerms,
    payment_terms: data.paymentTerms,
    notes: data.notes,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  if (data.customerId !== undefined) {
    updatePayload.customer_id = data.customerId;
  }
  if (data.customerSnapshot !== undefined) {
    updatePayload.customer_snapshot = data.customerSnapshot;
  }

  const { error: quoteErr } = await supabase
    .from("quotes")
    .update(updatePayload as never)
    .eq("id", quoteId);

  if (quoteErr) throw new Error(quoteErr.message);

  // 2. Eski kalemleri sil ve yenilerini ekle
  await supabase.from("quote_items").delete().eq("quote_id", quoteId);

  const newItems = data.items.map((item, idx) => ({
    quote_id: quoteId,
    sort_order: idx + 1,
    product_id: item.product_id,
    product_code_snapshot: item.product_code_snapshot,
    product_name_snapshot: item.product_name_snapshot,
    description_snapshot: item.description_snapshot || "",
    unit_snapshot: item.unit_snapshot,
    price_source: item.price_source || "quality_1",
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_type: item.discount_type,
    discount_value: item.discount_value,
    discount_amount: lines[idx].discount_amount,
    line_subtotal: lines[idx].line_subtotal,
    line_total: lines[idx].line_total,
  }));

  const { error: itemsErr } = await supabase.from("quote_items").insert(newItems as never);
  if (itemsErr) throw new Error(itemsErr.message);

  revalidatePath(`/teklifler`);
  revalidatePath(`/teklifler/${quoteId}`);
  revalidatePath(`/teklif-onizleme/${quoteId}`);
  revalidatePath(`/teklif-yazdir/${quoteId}`);

  return { success: true };
}

export async function deleteQuote(quoteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as any)?.role || "staff";
  if (!["admin", "muhasebe1"].includes(role)) {
    throw new Error("Yetkiniz bulunmuyor! Yalnızca muhasebe ve yöneticiler teklif silebilir.");
  }

  const service = await createServiceClient();

  // Soft delete: quote_items'ları silmiyoruz ki geri kurtarılabilsin (iPhone Çöp Kutusu mantığı)
  const { error } = await (service.from("quotes") as any)
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (error) {
    throw new Error("Teklif son silinenlere taşınırken hata oluştu: " + error.message);
  }

  revalidatePath("/teklifler");
  revalidatePath(`/teklifler/${quoteId}`);
  return { success: true };
}

/**
 * Son Silinenlerdeki teklifi geri kurtarma (Restore)
 */
export async function restoreQuote(quoteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as any)?.role || "staff";
  if (!["admin", "muhasebe1"].includes(role)) {
    throw new Error("Yetkiniz bulunmuyor! Yalnızca muhasebe ve yöneticiler teklif kurtarabilir.");
  }

  const service = await createServiceClient();

  const { error } = await (service.from("quotes") as any)
    .update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  if (error) {
    throw new Error("Teklif kurtarılırken hata oluştu: " + error.message);
  }

  revalidatePath("/teklifler");
  revalidatePath(`/teklifler/${quoteId}`);
  return { success: true };
}

/**
 * Teklifi kalıcı olarak sistemden ve veritabanından silme (Permanent Delete)
 */
export async function permanentDeleteQuote(quoteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as any)?.role || "staff";
  if (!["admin", "muhasebe1"].includes(role)) {
    throw new Error("Yetkiniz bulunmuyor! Yalnızca muhasebe ve yöneticiler kalıcı silme yapabilir.");
  }

  const service = await createServiceClient();

  // 1. Satış bağlantısı varsa kaldır
  try {
    await (service.from("sales") as any).update({ quote_id: null }).eq("quote_id", quoteId);
  } catch (e) {
    console.warn("Unlink sales warning:", e);
  }

  // 2. Teklif kalemlerini sil
  try {
    await service.from("quote_items").delete().eq("quote_id", quoteId);
  } catch (e) {
    console.warn("Delete items warning:", e);
  }

  // 3. Teklifi kalıcı sil
  const { error } = await service.from("quotes").delete().eq("id", quoteId);
  if (error) {
    throw new Error("Teklif kalıcı olarak silinirken hata: " + error.message);
  }

  revalidatePath("/teklifler");
  return { success: true };
}

/**
 * Son silinenlerdeki TÜM teklifleri geri kurtarma
 */
export async function restoreAllQuotes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");

  const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const role = (profile as any)?.role || "staff";
  if (!["admin", "muhasebe1"].includes(role)) {
    throw new Error("Yetkiniz bulunmuyor! Yalnızca muhasebe ve yöneticiler bu işlemi yapabilir.");
  }
  const companyId = (profile as any)?.company_id;
  if (!companyId) throw new Error("Şirket kaydı bulunamadı.");

  const service = await createServiceClient();

  const { error } = await (service.from("quotes") as any)
    .update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error("Teklifler kurtarılırken hata oluştu: " + error.message);
  }

  revalidatePath("/teklifler");
  return { success: true };
}

/**
 * Çöp kutusunu tamamen boşaltma (Tüm silinenleri kalıcı sil)
 */
export async function emptyTrashQuotes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");

  const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const role = (profile as any)?.role || "staff";
  if (!["admin", "muhasebe1"].includes(role)) {
    throw new Error("Yetkiniz bulunmuyor! Yalnızca muhasebe ve yöneticiler bu işlemi yapabilir.");
  }
  const companyId = (profile as any)?.company_id;
  if (!companyId) throw new Error("Şirket kaydı bulunamadı.");

  const service = await createServiceClient();

  const { data: deletedQuotes } = await service
    .from("quotes")
    .select("id")
    .eq("company_id", companyId)
    .not("deleted_at", "is", null);

  const ids = (deletedQuotes || []).map((q: any) => q.id);
  if (ids.length === 0) return { success: true, count: 0 };

  try {
    await (service.from("sales") as any).update({ quote_id: null }).in("quote_id", ids);
  } catch {}

  try {
    await service.from("quote_items").delete().in("quote_id", ids);
  } catch {}

  const { error } = await service.from("quotes").delete().in("id", ids);
  if (error) {
    throw new Error("Çöp kutusu boşaltılırken hata: " + error.message);
  }

  revalidatePath("/teklifler");
  return { success: true, count: ids.length };
}
