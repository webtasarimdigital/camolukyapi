"use server";
import { createClient } from "@/lib/supabase/server";

export async function finalizeSale(saleId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  
  const { error } = await supabase.rpc("finalize_sale" as never, { p_sale_id: saleId, p_user_id: userData.user.id } as never);
  if (error) throw new Error(error.message);
}

export async function cancelSale(saleId: string, reason: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  
  const { error } = await supabase.rpc("cancel_sale" as never, { p_sale_id: saleId, p_user_id: userData.user.id, p_reason: reason } as never);
  if (error) throw new Error(error.message);
}

export async function addPayment(saleId: string, amount: number, method: string, date: string, referenceNo?: string, notes?: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({ sale_id: saleId, amount, payment_method: method, payment_date: date, reference_no: referenceNo, notes } as never);
  if (error) throw new Error(error.message);
}
