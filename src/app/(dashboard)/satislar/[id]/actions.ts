"use server";

import { createClient } from "@/lib/supabase/server";
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
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Oturum açmanız gerekiyor.");

  const { data: saleData } = await supabase
    .from("sales")
    .select("*")
    .eq("id", saleId)
    .single();
  if (!saleData) throw new Error("Satış bulunamadı");
  const sale = saleData as any;

  // If completed, cancel first to restore stock
  if (sale.status === "completed") {
    const { error: cancelErr } = await supabase.rpc("cancel_sale" as never, {
      p_sale_id: saleId,
      p_user_id: userData.user.id,
      p_reason: "Silme işlemi öncesi otomatik iptal"
    } as never);
    if (cancelErr) throw new Error("Stok iadesi yapılamadı: " + cancelErr.message);
  }

  // Delete sale items
  await supabase.from("sale_items").delete().eq("sale_id", saleId);
  // Delete payments
  await supabase.from("payments").delete().eq("sale_id", saleId);
  // Delete sale
  const { error } = await supabase.from("sales").delete().eq("id", saleId);
  if (error) throw new Error(error.message);

  revalidatePath("/satislar");
  revalidatePath("/dashboard");
  revalidatePath("/stok");
  revalidatePath("/finans");
}
