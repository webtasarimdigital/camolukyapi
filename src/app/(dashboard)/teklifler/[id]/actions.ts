'use server';

import { createClient } from "@/lib/supabase/server";
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
  const { error: quoteErr } = await supabase
    .from("quotes")
    .update({
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
    } as never)
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

  return { success: true };
}

export async function deleteQuote(quoteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("quotes")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", quoteId);

  if (error) throw new Error(error.message);
  revalidatePath(`/teklifler`);
}
