"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function finalizeSale(saleId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Oturum açmanız gerekiyor.");
  
  const { error } = await supabase.rpc("finalize_sale" as never, { 
    p_sale_id: saleId, 
    p_user_id: userData.user.id 
  } as never);
  if (error) throw new Error(error.message);

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  revalidatePath("/dashboard");
}

export async function cancelSale(saleId: string, reason: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Oturum açmanız gerekiyor.");
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  const role = (profile as any)?.role || "staff";
  if (!["admin", "muhasebe1"].includes(role)) {
    throw new Error("Yetkiniz bulunmuyor! Yalnızca muhasebe ve yöneticiler satışı iptal edebilir.");
  }

  const service = await createServiceClient();
  const { data: saleData } = await service.from("sales").select("source_quote_id").eq("id", saleId).single();
  const sourceQuoteId = (saleData as any)?.source_quote_id;

  const { error } = await supabase.rpc("cancel_sale" as never, { 
    p_sale_id: saleId, 
    p_user_id: userData.user.id, 
    p_reason: reason || "Kullanıcı tarafından iptal edildi" 
  } as never);
  if (error) throw new Error(error.message);

  if (sourceQuoteId) {
    try {
      await (service.from("quotes") as any)
        .update({
          status: "cancelled",
          converted_sale_id: null,
          notes: `[Bağlı Satış İptal Edildi: ${reason || "Kullanıcı iptali"}]`
        })
        .eq("id", sourceQuoteId);
    } catch (e) {
      console.warn("Could not sync quote status on cancelSale:", e);
    }
  }

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  revalidatePath("/bayi-siparisleri");
  revalidatePath("/bayi-siparis");
  revalidatePath("/teklifler");
  revalidatePath("/dashboard");
  revalidatePath("/stok");
}

export async function addPayment(
  saleId: string, 
  amount: number, 
  method: string, 
  date: string, 
  referenceNo?: string, 
  notes?: string
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Oturum açmanız gerekiyor.");

  // Fetch sale
  const { data: saleData } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .single();
  if (!saleData) throw new Error("Satış bulunamadı");
  const sale = saleData as any;

  // Insert payment
  const { error: pErr } = await supabase.from("payments").insert({
    company_id: sale.company_id,
    sale_id: saleId,
    customer_id: sale.customer_id,
    amount,
    payment_date: date || new Date().toISOString().split("T")[0],
    payment_method: method || "nakit",
    reference_no: referenceNo || null,
    notes: notes || null,
    created_by: userData.user.id,
  } as any);

  if (pErr) throw new Error(pErr.message);

  // Recalculate sale payment totals
  const newPaidAmount = (Number(sale.paid_amount) || 0) + Number(amount);
  const grandTotal = Number(sale.grand_total) || 0;
  const newRemaining = Math.max(0, grandTotal - newPaidAmount);
  const newStatus = newRemaining <= 0.01 ? "paid" : "partial";

  await (supabase.from("sales") as any).update({
    paid_amount: newPaidAmount,
    remaining_amount: newRemaining,
    payment_status: newStatus,
  }).eq("id", saleId);

  // Financial transaction log
  await supabase.from("financial_transactions").insert({
    company_id: sale.company_id,
    transaction_type: "income",
    category: "satis_tahsilat",
    amount,
    transaction_date: date || new Date().toISOString().split("T")[0],
    source_type: "payment",
    source_id: saleId,
    customer_id: sale.customer_id,
    description: `Tahsilat: ${sale.sale_code} (${notes || method})`,
    payment_method: method,
    created_by: userData.user.id,
  } as any);

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  revalidatePath("/finans");
  revalidatePath("/dashboard");
}

export async function deleteSale(saleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as any)?.role || "staff";
  if (!["admin", "muhasebe1"].includes(role)) {
    throw new Error("Yetkiniz bulunmuyor! Yalnızca muhasebe ve yöneticiler satış kaydını silebilir.");
  }

  const service = await createServiceClient();

  const { data: saleData } = await service
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .single();

  if (!saleData) {
    revalidatePath("/satislar");
    return { success: true };
  }
  const sale = saleData as any;

  // 1. Tamamlanmış satış ise stok iadesi yapmayı dene
  if (sale.status === "completed") {
    try {
      await service.rpc("cancel_sale" as never, {
        p_sale_id: saleId,
        p_user_id: "00000000-0000-0000-0000-000000000000",
        p_reason: "Silme işlemi öncesi otomatik iptal"
      } as never);
    } catch (e) {
      console.warn("Stock cancel RPC warning:", e);
    }
  }

  // 2. Sevkiyatları temizle
  try {
    await service.from("shipments").delete().eq("sale_id", saleId);
  } catch {}

  // 3. Finansal hareketleri temizle
  try {
    await service.from("financial_transactions").delete().eq("source_id", saleId);
  } catch {}

  // 4. Tahsilat / ödemeleri sil
  try {
    await service.from("payments").delete().eq("sale_id", saleId);
  } catch {}

  // 5. Müşteri ekstre hareketlerini temizle
  try {
    await (service.from("customer_transactions") as any).delete().eq("reference_id", saleId);
  } catch {}

  // 6. Satış kalemlerini sil
  try {
    await service.from("sale_items").delete().eq("sale_id", saleId);
  } catch {}

  const sourceQuoteId = sale.source_quote_id;

  // 7. Satışı sil
  const { error } = await service.from("sales").delete().eq("id", saleId);
  if (error) {
    console.warn("Sale hard delete error, falling back to cancelled status:", error.message);
    await (service.from("sales") as any).update({ status: "cancelled", notes: "Silindi / İptal" }).eq("id", saleId);
  }

  // 8. Bağlı kaynak teklif/bayi siparişi varsa durumunu iptal et
  if (sourceQuoteId) {
    try {
      await (service.from("quotes") as any)
        .update({
          status: "cancelled",
          converted_sale_id: null,
          notes: (sale.notes ? `${sale.notes} | ` : "") + "Bağlı satış kaydı silindi"
        })
        .eq("id", sourceQuoteId);
    } catch (e) {
      console.warn("Could not sync quote on deleteSale:", e);
    }
  }

  revalidatePath("/satislar");
  revalidatePath("/bayi-siparisleri");
  revalidatePath("/bayi-siparis");
  revalidatePath("/teklifler");
  revalidatePath("/dashboard");
  revalidatePath("/stok");
  revalidatePath("/finans");
  return { success: true };
}

export interface UpdateSaleItemInput {
  id?: string;
  productId?: string | null;
  productCode?: string | null;
  productName: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountType?: "percent" | "fixed" | null;
  discountValue?: number;
  discountAmount?: number;
  lineTotal: number;
}

export interface UpdateSaleInput {
  saleId: string;
  items: UpdateSaleItemInput[];
  vatRate: number;
  subtotal: number;
  discountTotal: number;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  notes?: string;
  dueDate?: string | null;
  saleDate?: string | null;
}

export async function updateSale(input: UpdateSaleInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum açmanız gerekiyor.");

  const { data: profile } = await supabase.from("profiles").select("role, company_id, full_name").eq("id", user.id).single();
  const role = (profile as any)?.role || "staff";
  if (!["admin", "muhasebe1", "satis"].includes(role)) {
    throw new Error("Yetkiniz bulunmuyor! Yalnızca yetkili kullanıcılar satış düzenleyebilir.");
  }

  const companyId = (profile as any)?.company_id;
  const service = await createServiceClient();

  // Fetch current sale with items
  const { data: currentSaleData, error: fetchErr } = await service
    .from("sales")
    .select("*, items:sale_items(*)")
    .eq("id", input.saleId)
    .single();

  if (fetchErr || !currentSaleData) throw new Error("Satış bulunamadı");
  const currentSale = currentSaleData as any;
  const oldItems = currentSale.items || [];

  // Calculate payment status & remaining amount
  const paidAmount = Number(input.paidAmount) || 0;
  const grandTotal = Number(input.grandTotal) || 0;
  const remainingAmount = Math.max(0, grandTotal - paidAmount);
  const paymentStatus = remainingAmount <= 0.01 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

  // 1. Stock adjustments for completed sale
  if (currentSale.status === "completed") {
    const oldItemsMap = new Map<string, any>();
    for (const oi of oldItems) {
      if (oi.product_id) {
        oldItemsMap.set(oi.id, oi);
      }
    }

    const processedOldItemIds = new Set<string>();

    for (const newItem of input.items) {
      if (newItem.id && oldItemsMap.has(newItem.id)) {
        processedOldItemIds.add(newItem.id);
        const oldItem = oldItemsMap.get(newItem.id);
        const delta = (Number(oldItem.quantity) || 0) - (Number(newItem.quantity) || 0);
        if (delta !== 0 && oldItem.product_id) {
          try {
            await service.rpc("add_stock_movement" as never, {
              p_company_id: companyId || currentSale.company_id,
              p_product_id: oldItem.product_id,
              p_movement_type: "manual_correction",
              p_quantity: delta,
              p_reference_type: "sale_edit",
              p_reference_id: input.saleId,
              p_reason: `Satış Düzenleme: ${currentSale.sale_code}`,
              p_user_id: user.id
            } as never);
          } catch (e) {
            console.warn("Stock adjust error:", e);
          }
        }
      } else if (!newItem.id && newItem.productId) {
        try {
          await service.rpc("add_stock_movement" as never, {
            p_company_id: companyId || currentSale.company_id,
            p_product_id: newItem.productId,
            p_movement_type: "sale",
            p_quantity: -Number(newItem.quantity || 0),
            p_reference_type: "sale_edit",
            p_reference_id: input.saleId,
            p_reason: `Satışa Yeni Kalem Eklendi: ${currentSale.sale_code}`,
            p_user_id: user.id
          } as never);
        } catch (e) {
          console.warn("Stock deduct error:", e);
        }
      }
    }

    for (const [oldId, oldItem] of oldItemsMap.entries()) {
      if (!processedOldItemIds.has(oldId) && oldItem.product_id) {
        try {
          await service.rpc("add_stock_movement" as never, {
            p_company_id: companyId || currentSale.company_id,
            p_product_id: oldItem.product_id,
            p_movement_type: "manual_correction",
            p_quantity: Number(oldItem.quantity || 0),
            p_reference_type: "sale_edit",
            p_reference_id: input.saleId,
            p_reason: `Satıştan Kalem Çıkarıldı (İade): ${currentSale.sale_code}`,
            p_user_id: user.id
          } as never);
        } catch (e) {
          console.warn("Stock return error:", e);
        }
      }
    }
  }

  // 2. Delete existing sale_items and re-insert updated ones
  await service.from("sale_items").delete().eq("sale_id", input.saleId);

  const itemsToInsert = input.items.map((item, idx) => ({
    sale_id: input.saleId,
    sort_order: idx + 1,
    product_id: item.productId || null,
    product_code_snapshot: item.productCode || null,
    product_name_snapshot: item.productName,
    unit_snapshot: item.unit || "ADET",
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unitPrice) || 0,
    discount_type: item.discountType || null,
    discount_value: Number(item.discountValue) || 0,
    discount_amount: Number(item.discountAmount) || 0,
    line_total: Number(item.lineTotal) || 0,
  }));

  const { error: insertItemsErr } = await service.from("sale_items").insert(itemsToInsert as any);
  if (insertItemsErr) throw new Error("Satış kalemleri güncellenemedi: " + insertItemsErr.message);

  // 3. Update sales record
  const updatePayload: any = {
    vat_rate: Number(input.vatRate) || 0,
    subtotal: Number(input.subtotal) || 0,
    discount_total: Number(input.discountTotal) || 0,
    net_total: Number(input.netTotal) || 0,
    vat_total: Number(input.vatTotal) || 0,
    grand_total: grandTotal,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    payment_status: paymentStatus,
    notes: input.notes ?? currentSale.notes,
    due_date: input.dueDate || null,
  };

  if (input.saleDate) {
    updatePayload.sale_date = input.saleDate;
  }

  const { error: updateSaleErr } = await (service.from("sales") as any).update(updatePayload).eq("id", input.saleId);
  if (updateSaleErr) throw new Error("Satış kaydı güncellenemedi: " + updateSaleErr.message);

  // 4. Financial transactions update if paidAmount changed
  if (paidAmount !== Number(currentSale.paid_amount)) {
    const { data: ftData } = await service
      .from("financial_transactions")
      .select("id")
      .eq("source_id", input.saleId)
      .eq("category", "satis_tahsilat")
      .limit(1);

    if (ftData && ftData.length > 0) {
      await (service.from("financial_transactions") as any).update({ amount: paidAmount }).eq("id", (ftData[0] as any).id);
    }
  }

  revalidatePath(`/satislar/${input.saleId}`);
  revalidatePath(`/satislar/${input.saleId}/duzenle`);
  revalidatePath("/satislar");
  revalidatePath("/dashboard");
  revalidatePath("/musteriler");
  revalidatePath("/finans");
  revalidatePath("/stok");
  revalidatePath("/urunler");

  return { success: true };
}
