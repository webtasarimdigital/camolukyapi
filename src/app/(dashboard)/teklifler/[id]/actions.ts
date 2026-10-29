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

export interface ConvertSalePaymentDetails {
  paymentStatus: "paid" | "partial" | "unpaid";
  paidAmount: number;
  paymentMethod: string;
  dueDate?: string;
  notes?: string;
}

/**
 * Teklifi doğrudan onaylayıp satışa dönüştürür ve satışı tamamlar:
 * - Stoktan otomatik düşer
 * - Belirlenen ödeme durumu ve tahsilat tutarını işler
 * - Teklif durumunu 'converted_to_sale' yapar
 */
export async function convertAndCompleteSale(
  quoteId: string,
  paymentDetails?: ConvertSalePaymentDetails
) {
  const supabase = await createClient();
  const service = await createServiceClient();
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

  // 2. Ödeme detayları varsa satışı güncelle
  if (paymentDetails) {
    const { data: saleRow } = await (service
      .from("sales") as any)
      .select("grand_total")
      .eq("id", saleId)
      .single();

    const grandTotal = Number(saleRow?.grand_total) || 0;
    const paidAmount = Math.max(0, Number(paymentDetails.paidAmount) || 0);
    const remainingAmount = Math.max(0, grandTotal - paidAmount);

    await (service
      .from("sales") as any)
      .update({
        payment_status: paymentDetails.paymentStatus,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        due_date: paymentDetails.dueDate || null,
      })
      .eq("id", saleId);
  }

  // 3. Satışı tamamla (Stok düşürür)
  const { error: finErr } = await supabase.rpc("finalize_sale" as never, {
    p_sale_id: saleId,
    p_user_id: user.id,
  } as never);

  if (finErr) {
    console.warn("finalize_sale RPC uyarı:", finErr.message);
    await (service
      .from("sales") as any)
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", saleId);
  }

  // 4. Tahsilat yapıldıysa payments tablosuna işle
  if (paymentDetails && paymentDetails.paidAmount > 0) {
    const { data: saleFull } = await (service
      .from("sales") as any)
      .select("company_id, customer_id, sale_code")
      .eq("id", saleId)
      .single();

    if (saleFull) {
      const today = new Date().toISOString().split("T")[0];
      await (service.from("payments") as any).insert({
        company_id: saleFull.company_id,
        sale_id: saleId,
        customer_id: saleFull.customer_id || null,
        amount: paymentDetails.paidAmount,
        payment_date: today,
        payment_method: paymentDetails.paymentMethod || "nakit",
        reference_no: saleFull.sale_code,
        notes: paymentDetails.notes || `Tekliften satışa dönüşüm tahsilatı: ${saleFull.sale_code}`,
        created_by: user.id,
      });
    }
  }

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
      product_code_snapshot?: string;
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın." };

    const service = await createServiceClient();

    // Sunucu tarafında satır ve toplamları baştan hesapla
    const lines = (data.items || []).map((item) =>
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
      valid_until: data.validUntil || null,
      delivery_terms: data.deliveryTerms || "",
      payment_terms: data.paymentTerms || "",
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (data.customerId !== undefined) {
      updatePayload.customer_id = data.customerId || null;
    }
    if (data.customerSnapshot !== undefined) {
      updatePayload.customer_snapshot = data.customerSnapshot;
    }

    const { error: quoteErr } = await (service
      .from("quotes") as any)
      .update(updatePayload)
      .eq("id", quoteId);

    if (quoteErr) return { success: false, error: "Teklif güncellenemedi: " + quoteErr.message };

    // 2. Eski kalemleri sil ve yenilerini ekle
    await (service.from("quote_items") as any).delete().eq("quote_id", quoteId);

    const newItems = (data.items || []).map((item, idx) => {
      let cleanProductId: string | null = null;
      if (item.product_id && typeof item.product_id === "string" && item.product_id.trim().length > 10) {
        cleanProductId = item.product_id.trim();
      }

      return {
        quote_id: quoteId,
        sort_order: idx + 1,
        product_id: cleanProductId,
        product_code_snapshot: item.product_code_snapshot || "",
        product_name_snapshot: item.product_name_snapshot || "Ürün",
        description_snapshot: item.description_snapshot || "",
        unit_snapshot: item.unit_snapshot || "M2",
        price_source: item.price_source || "custom",
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        discount_type: item.discount_type || null,
        discount_value: Number(item.discount_value) || 0,
        discount_amount: lines[idx]?.discount_amount || 0,
        line_subtotal: lines[idx]?.line_subtotal || 0,
        line_total: lines[idx]?.line_total || 0,
      };
    });

    if (newItems.length > 0) {
      const { error: itemsErr } = await (service
        .from("quote_items") as any)
        .insert(newItems);
      if (itemsErr) return { success: false, error: "Teklif kalemleri güncellenemedi: " + itemsErr.message };
    }

    revalidatePath(`/teklifler`);
    revalidatePath(`/teklifler/${quoteId}`);
    revalidatePath(`/teklif-onizleme/${quoteId}`);
    revalidatePath(`/teklif-yazdir/${quoteId}`);

    return { success: true };
  } catch (err: any) {
    console.error("updateQuote catch error:", err);
    return { success: false, error: err?.message || "Teklif güncellenirken bir hata oluştu." };
  }
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
