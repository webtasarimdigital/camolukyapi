"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calculateLine, calculateTotals } from "@/lib/calculations";

export interface EditableOrderItem {
  id?: string;
  product_id: string | null;
  product_code_snapshot: string;
  product_name_snapshot: string;
  unit_snapshot: string;
  quantity: number;
  unit_price: number;
  discount_type?: "percent" | "fixed" | null;
  discount_value?: number;
}

export interface UpdateOrderPayload {
  orderId: string;
  customerId?: string | null;
  customerSnapshot?: any;
  items: EditableOrderItem[];
  vatRate: number;
  generalDiscountType?: "percent" | "fixed" | null;
  generalDiscountValue?: number;
  notes?: string;
}

/**
 * Siparişteki fiyat, iskonto ve KDV düzenlemelerini kaydeder.
 */
export async function updateDealerOrder(payload: UpdateOrderPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");

  if (!payload.items || payload.items.length === 0) {
    throw new Error("Siparişte en az 1 ürün kalmalıdır.");
  }

  // Server-side recalculation
  const lines = payload.items.map((item) =>
    calculateLine({
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
    })
  );

  const vatRate = Number(payload.vatRate ?? 20);
  const totals = calculateTotals(
    lines,
    vatRate,
    payload.generalDiscountType,
    payload.generalDiscountValue
  );

  // 1. Update quotes record
  const updateData: Record<string, any> = {
    subtotal: totals.subtotal,
    line_discount_total: totals.line_discount_total,
    general_discount_type: payload.generalDiscountType || null,
    general_discount_value: payload.generalDiscountValue || 0,
    general_discount_amount: totals.general_discount_amount,
    net_total: totals.net_total,
    vat_rate: vatRate,
    vat_total: totals.vat_total,
    grand_total: totals.grand_total,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  if (payload.customerId !== undefined) {
    updateData.customer_id = payload.customerId;
  }
  if (payload.customerSnapshot !== undefined) {
    updateData.customer_snapshot = payload.customerSnapshot;
  }
  if (payload.notes !== undefined) {
    updateData.notes = payload.notes;
  }

  const service = await createServiceClient();

  const { error: quoteErr } = await (service.from("quotes") as any)
    .update(updateData)
    .eq("id", payload.orderId);

  if (quoteErr) throw new Error("Sipariş güncellenemedi: " + quoteErr.message);

  // 2. Replace quote_items
  await service.from("quote_items").delete().eq("quote_id", payload.orderId);

  const newItems = payload.items.map((item, idx) => ({
    quote_id: payload.orderId,
    sort_order: idx + 1,
    product_id: item.product_id || null,
    product_code_snapshot: item.product_code_snapshot,
    product_name_snapshot: item.product_name_snapshot,
    description_snapshot: "",
    unit_snapshot: item.unit_snapshot || "ADET",
    price_source: "custom",
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_type: item.discount_type || null,
    discount_value: item.discount_value || 0,
    discount_amount: lines[idx].discount_amount,
    line_subtotal: lines[idx].line_subtotal,
    line_total: lines[idx].line_total,
  }));

  const { error: itemsErr } = await (service.from("quote_items") as any)
    .insert(newItems);

  if (itemsErr) throw new Error("Sipariş kalemleri güncellenemedi: " + itemsErr.message);

  revalidatePath(`/bayi-siparisleri`);
  revalidatePath(`/bayi-siparisleri/${payload.orderId}`);
  revalidatePath(`/bayi-siparis`);

  return { success: true };
}

/**
 * Fiyat, iskonto ve KDV'si düzenlenen bayi siparişini ONAYLAYIP RESMİ SATIŞA DÖNÜŞTÜRÜR:
 * - Düzenlenen fiyat ve iskontoları quote tablosuna yazar
 * - convert_quote_to_sale RPC'si ile sales & sale_items oluşturur
 * - finalize_sale RPC'si ile depodaki stokları otomatik düşer
 * - Sipariş durumunu 'converted_to_sale' yapar ve satış ID'sini bağlar
 */
export async function convertDealerOrderToSale(payload: UpdateOrderPayload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");

  // Önce en güncel fiyat ve iskontoları kaydet
  await updateDealerOrder(payload);

  // 1. Teklifi satışa dönüştür (RPC)
  const { data: convData, error: convErr } = await supabase.rpc(
    "convert_quote_to_sale" as never,
    {
      p_quote_id: payload.orderId,
      p_user_id: user.id,
    } as never
  );

  if (convErr) {
    throw new Error("Satışa dönüştürme hatası: " + convErr.message);
  }

  const result = convData as { success: boolean; sale_id: string; sale_code: string } | null;
  const saleId = result?.sale_id;
  if (!saleId) throw new Error("Satış kaydı oluşturulamadı.");

  // 2. Satışı tamamla (Stok düşürür, finans gelirlerine işler)
  const { error: finErr } = await supabase.rpc("finalize_sale" as never, {
    p_sale_id: saleId,
    p_user_id: user.id,
  } as never);

  if (finErr) {
    console.warn("finalize_sale uyarısı, manuel tamamlanıyor:", finErr.message);
    await (supabase.from("sales") as any)
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", saleId);
  }

  revalidatePath("/bayi-siparisleri");
  revalidatePath(`/bayi-siparisleri/${payload.orderId}`);
  revalidatePath("/bayi-siparis");
  revalidatePath("/satislar");
  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/stok");
  revalidatePath("/urunler");
  revalidatePath("/dashboard");

  return {
    success: true,
    saleId,
    saleCode: result?.sale_code,
  };
}

/**
 * Tali bayi için anında cari/müşteri hesabı oluşturma
 */
export async function createCustomerForDealer(data: {
  companyName: string;
  contactName?: string;
  phone?: string;
  address?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");

  const service = await createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const companyId = (profile as any)?.company_id || "a0000000-0000-0000-0000-000000000001";

  const { data: customer, error } = await service
    .from("customers")
    .insert({
      company_id: companyId,
      company_name: data.companyName.trim(),
      contact_name: data.contactName?.trim() || data.companyName.trim(),
      phone: data.phone?.trim() || "-",
      address: data.address?.trim() || null,
      type: "kurumsal",
      created_by: user.id,
      is_active: true,
    } as any)
    .select()
    .single();

  if (error || !customer) {
    throw new Error("Müşteri hesabı oluşturulamadı: " + (error?.message || "Bilinmeyen hata"));
  }

  revalidatePath("/musteriler");
  return { success: true, customer: customer as any };
}
