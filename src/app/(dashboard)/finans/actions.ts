'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) throw new Error("Company not found");

  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("app_active_role")?.value;
  const isActualAdmin = profile.role === "admin";
  const activeRole = isActualAdmin ? (cookieRole || "admin") : profile.role;

  if (activeRole !== "admin" && activeRole !== "muhasebe2") {
    throw new Error("Yetkiniz bulunmuyor! Gider ekleme yetkisi yalnızca Yönetici ve Muhasebe 2'dedir.");
  }

  const amount = parseFloat(formData.get("amount") as string);
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const payment_method = formData.get("payment_method") as string;
  const transaction_date = formData.get("transaction_date") as string;

  const { error } = await supabase
    .from("financial_transactions")
    .insert({
      company_id: profile.company_id,
      transaction_type: "expense",
      source_type: "manual_expense",
      amount,
      category,
      description,
      payment_method,
      transaction_date,
      created_by: user.id
    } as never);

  if (error) throw error;
  
  await supabase.from("audit_logs").insert({
    company_id: profile.company_id,
    user_id: user.id,
    action: "CREATE",
    entity_type: "expense",
    details: { amount, category, description }
  } as never);

  revalidatePath("/finans/giderler");
  revalidatePath("/finans");
}
