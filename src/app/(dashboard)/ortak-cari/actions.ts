'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addPartnerMovement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== 'admin') throw new Error("Unauthorized");

  const partner_id = formData.get("partner_id") as string;
  const direction = formData.get("direction") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const transaction_date = formData.get("transaction_date") as string;
  const reason = formData.get("reason") as string;
  const notes = formData.get("notes") as string | null;
  const doc_no = formData.get("doc_no") as string | null;

  const { error } = await supabase
    .from("partner_ledger")
    .insert({
      company_id: profile.company_id,
      partner_id,
      direction,
      amount,
      transaction_date,
      reason,
      notes,
      doc_no,
      created_by: user.id
    } as never);

  if (error) throw error;
  
  await supabase.from("audit_logs").insert({
    company_id: profile.company_id,
    user_id: user.id,
    action: "CREATE",
    entity_type: "partner_ledger",
    details: { partner_id, direction, amount, reason }
  } as never);

  revalidatePath("/ortak-cari");
  revalidatePath(`/ortak-cari/${partner_id}`);
}

export async function voidPartnerMovement(id: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== 'admin') throw new Error("Unauthorized");

  const { error } = await supabase
    .from("partner_ledger")
    .update({
      voided_at: new Date().toISOString(),
      void_reason: reason,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    } as never)
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .is("voided_at", null);

  if (error) throw error;
  
  await supabase.from("audit_logs").insert({
    company_id: profile.company_id,
    user_id: user.id,
    action: "VOID",
    entity_type: "partner_ledger",
    details: { id, reason }
  } as never);

  revalidatePath("/ortak-cari");
}

export async function createPartner(name: string, phone?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== 'admin') throw new Error("Unauthorized");

  const { error } = await supabase.from("partners").insert({
    company_id: profile.company_id,
    name,
    phone,
    is_active: true
  } as never);

  if (error) throw error;
  revalidatePath("/ortak-cari");
}
