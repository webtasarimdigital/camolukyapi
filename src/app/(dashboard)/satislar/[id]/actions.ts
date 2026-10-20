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

  const { error } = await supabase.rpc("cancel_sale" as never, { 
    p_sale_id: saleId, 
    p_user_id: userData.user.id, 
    p_reason: reason || "Kullanıcı tarafından iptal edildi" 
  } as never);
  if (error) throw new Error(error.message);

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
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

  // 7. Satışı sil
  const { error } = await service.from("sales").delete().eq("id", saleId);
  if (error) {
    console.warn("Sale hard delete error, falling back to cancelled status:", error.message);
    await (service.from("sales") as any).update({ status: "cancelled", notes: "Silindi / İptal" }).eq("id", saleId);
  }

  revalidatePath("/satislar");
  revalidatePath("/dashboard");
  revalidatePath("/stok");
  revalidatePath("/finans");
  return { success: true };
}
