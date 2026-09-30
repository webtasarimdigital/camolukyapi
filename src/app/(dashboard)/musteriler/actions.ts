'use server';

import { createClient, createServiceClient } from "@/lib/supabase/server";
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

  const serviceClient = await createServiceClient();
  const { data: profileData } = await serviceClient.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") throw new Error("Yalnızca yöneticiler müşteri silebilir.");

  // Önce ilişkili satış veya teklif var mı kontrol et
  const { count: salesCount } = await serviceClient
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);

  const { count: quotesCount } = await serviceClient
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);

  if ((salesCount || 0) > 0 || (quotesCount || 0) > 0) {
    // Geçmişi olan müşteriyi silmek muhasebeyi bozacağı için pasife alıyoruz
    await serviceClient
      .from("customers")
      .update({ is_active: false, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("company_id", profile.company_id);
    revalidatePath("/musteriler");
    return { success: true, softDeleted: true, message: "Müşterinin geçmiş satış/teklifleri bulunduğu için silinmek yerine arşive (pasife) alındı." };
  }

  // Geçmiş kaydı yoksa tamamen sil
  const { error } = await serviceClient
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
import type { CustomerImportRow } from "./types";

export async function importCustomersBatch(rows: CustomerImportRow[]): Promise<{
  success: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}> {
  try {
    if (!rows || rows.length === 0) return { success: true, inserted: 0, skipped: 0 };

    const serviceClient = await createServiceClient();

    // Check user & company
    let userId: string | null = null;
    let companyId = "a0000000-0000-0000-0000-000000000001";
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: profileData } = await serviceClient
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();
        const profile = profileData as { company_id: string } | null;
        if (profile?.company_id) {
          companyId = profile.company_id;
        }
      }
    } catch {
      // Fallback gracefully
    }

    // High performance RPC execution directly in PostgreSQL
    const { data, error } = await (serviceClient as any).rpc("import_customers_batch", {
      p_rows: rows,
      p_company_id: companyId,
      p_user_id: userId,
    });

    if (error) {
      console.warn("import_customers_batch RPC failed, using serviceClient direct fallback:", error);
      // Fallback: batch insert directly with serviceClient
      const toInsert = rows
        .filter(r => r.contact_name && r.contact_name.trim().length > 0)
        .map(r => ({
          company_id: companyId,
          type: r.type || "kurumsal",
          company_name: r.company_name?.trim() || null,
          contact_name: r.contact_name.trim(),
          phone: r.phone?.trim() || null,
          email: r.email?.trim() || null,
          address: r.address?.trim() || null,
          tax_office: r.tax_office?.trim() || null,
          tax_number: r.tax_number?.trim() || null,
          notes: r.notes?.trim() || null,
          is_active: true,
          created_by: userId,
        }));

      if (toInsert.length > 0) {
        const { error: insertErr } = await serviceClient.from("customers").insert(toInsert as never);
        if (insertErr) {
          return { success: false, inserted: 0, skipped: 0, error: insertErr.message };
        }
      }
      return { success: true, inserted: toInsert.length, skipped: 0 };
    }

    const res = data as { success: boolean; inserted: number; skipped: number };
    return {
      success: res?.success ?? true,
      inserted: res?.inserted ?? 0,
      skipped: res?.skipped ?? 0,
    };
  } catch (err: unknown) {
    console.error("importCustomersBatch exception:", err);
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      error: (err as Error)?.message || "İçe aktarım sırasında beklenmeyen bir hata oluştu.",
    };
  }
}

export async function finishCustomerImport() {
  revalidatePath("/musteriler");
  return { success: true };
}

