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

  // Mükerrer müşteri kontrolü (Aynı telefon veya isim kontrolü)
  const trimmedName = contact_name.trim();
  const trimmedPhone = phone.trim();

  let dupQuery = supabase
    .from("customers")
    .select("id")
    .eq("company_id", profile.company_id)
    .ilike("contact_name", trimmedName);

  if (trimmedPhone) {
    dupQuery = dupQuery.or(`phone.eq.${trimmedPhone},contact_name.ilike.${trimmedName}`);
  }

  const { data: existingCust } = await dupQuery.limit(1);

  if (existingCust && existingCust.length > 0) {
    throw new Error(`"${trimmedName}" adında veya aynı telefonla kayıtlı bir müşteri zaten mevcut!`);
  }

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
  return { success: true, id: customer?.id };
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Company not found");

  const type = (formData.get("type") as string) || "bireysel";
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
      type,
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
  return { success: true };
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") throw new Error("Yalnızca yöneticiler müşteri silebilir.");

  // Önce ilişkili satış veya teklif var mı kontrol et
  const { count: salesCount } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);

  const { count: quotesCount } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);

  if ((salesCount || 0) > 0 || (quotesCount || 0) > 0) {
    // Geçmişi olan müşteriyi silmek muhasebeyi bozacağı için pasife alıyoruz
    await supabase
      .from("customers")
      .update({ is_active: false, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("company_id", profile.company_id);
    revalidatePath("/musteriler");
    return { success: true, softDeleted: true, message: "Müşterinin geçmiş satış/teklifleri bulunduğu için silinmek yerine arşive (pasife) alındı." };
  }

  // Geçmiş kaydı yoksa tamamen sil
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) throw error;

  revalidatePath("/musteriler");
  return { success: true, softDeleted: false, message: "Müşteri kaydı kalıcı olarak silindi." };
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
  return { success: true };
}

// ──────────────────── EXCEL TOPLU İÇE AKTARMA ────────────────────
export interface CustomerImportRow {
  type: "bireysel" | "kurumsal";
  company_name?: string | null;
  contact_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_office?: string | null;
  tax_number?: string | null;
  notes?: string | null;
}

export async function importCustomersBatch(rows: CustomerImportRow[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Company not found");

  if (!rows || rows.length === 0) return { inserted: 0, skipped: 0 };

  // 1. Get existing contact_names for this batch to prevent duplicates
  const names = rows.map((r) => r.contact_name.trim()).filter(Boolean);
  const { data: existing } = await supabase
    .from("customers")
    .select("contact_name")
    .eq("company_id", profile.company_id)
    .in("contact_name", names);

  const existingSet = new Set((existing || []).map((e: any) => e.contact_name?.toLowerCase()));

  // 2. Filter out duplicates
  const toInsert: any[] = [];
  let skipped = 0;
  const seenInBatch = new Set<string>();

  for (const r of rows) {
    const trimmed = r.contact_name?.trim() || "";
    const lower = trimmed.toLowerCase();
    if (!trimmed || existingSet.has(lower) || seenInBatch.has(lower)) {
      skipped++;
      continue;
    }
    seenInBatch.add(lower);
    toInsert.push({
      company_id: profile.company_id,
      type: r.type || "kurumsal",
      company_name: r.company_name?.trim() || null,
      contact_name: trimmed,
      phone: r.phone?.trim() || null,
      email: r.email?.trim() || null,
      address: r.address?.trim() || null,
      tax_office: r.tax_office?.trim() || null,
      tax_number: r.tax_number?.trim() || null,
      notes: r.notes?.trim() || null,
      is_active: true,
      created_by: user.id,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("customers").insert(toInsert as never);
    if (error) throw new Error(error.message);
  }

  return { inserted: toInsert.length, skipped };
}

export async function finishCustomerImport() {
  revalidatePath("/musteriler");
  return { success: true };
}

