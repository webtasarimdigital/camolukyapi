'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Company not found");

  const type = formData.get("type") as string;
  const company_name = formData.get("company_name") as string | null;
  const contact_name = formData.get("contact_name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string | null;
  const address = formData.get("address") as string | null;
  const tax_office = formData.get("tax_office") as string | null;
  const tax_number = formData.get("tax_number") as string | null;
  const notes = formData.get("notes") as string | null;

  const { data: customerData, error } = await supabase
    .from("customers")
    .insert({
      company_id: profile.company_id,
      type,
      company_name,
      contact_name,
      phone,
      email,
      address,
      tax_office,
      tax_number,
      notes,
      is_active: true,
      created_by: user.id
    } as never)
    .select("id")
    .single();

  if (error) throw error;

  const customer = customerData as { id: string } | null;
  revalidatePath("/musteriler");
  if (customer?.id) {
    redirect(`/musteriler/${customer.id}`);
  } else {
    redirect("/musteriler");
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Company not found");

  const company_name = formData.get("company_name") as string | null;
  const contact_name = formData.get("contact_name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string | null;
  const address = formData.get("address") as string | null;
  const tax_office = formData.get("tax_office") as string | null;
  const tax_number = formData.get("tax_number") as string | null;
  const notes = formData.get("notes") as string | null;

  const { error } = await supabase
    .from("customers")
    .update({
      company_name,
      contact_name,
      phone,
      email,
      address,
      tax_office,
      tax_number,
      notes,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    } as never)
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) throw error;
  revalidatePath("/musteriler");
  revalidatePath(`/musteriler/${id}`);
}

export async function toggleCustomerActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Company not found");

  const { error } = await supabase
    .from("customers")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    } as never)
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) throw error;
  revalidatePath("/musteriler");
  revalidatePath(`/musteriler/${id}`);
}
