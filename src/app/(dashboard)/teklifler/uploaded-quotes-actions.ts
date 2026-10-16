"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export interface UploadedQuote {
  id: string;
  company_id: string;
  title: string;
  customer_name?: string | null;
  quote_date?: string | null;
  amount?: number | null;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

async function getCompanyAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let companyId = "a0000000-0000-0000-0000-000000000001";
  let userName = "Admin";

  if (user) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("company_id, full_name, role")
      .eq("id", user.id)
      .single()) as any;

    if (profile?.company_id) companyId = profile.company_id;
    if (profile?.full_name) userName = profile.full_name;
  }

  const cookieStore = await cookies();
  const cookieName = cookieStore.get("app_user_name")?.value;
  if (cookieName) userName = cookieName;

  return { supabase, user, companyId, userName };
}

export async function getUploadedQuotes(): Promise<UploadedQuote[]> {
  try {
    const { supabase, companyId } = await getCompanyAndUser();
    const { data, error } = await supabase
      .from("uploaded_quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getUploadedQuotes error:", error);
      return [];
    }
    return (data || []) as UploadedQuote[];
  } catch (err) {
    console.error("getUploadedQuotes catch:", err);
    return [];
  }
}

export async function saveUploadedQuote(formData: FormData) {
  try {
    const { supabase, companyId } = await getCompanyAndUser();
    const title = (formData.get("title") as string) || "Teklif PDF";
    const customer_name = (formData.get("customer_name") as string) || "";
    const quote_date =
      (formData.get("quote_date") as string) ||
      new Date().toISOString().split("T")[0];
    const amount = parseFloat(formData.get("amount") as string) || 0;
    const notes = (formData.get("notes") as string) || "";
    const file_name = (formData.get("file_name") as string) || "teklif.pdf";
    const file_url = (formData.get("file_url") as string) || "";
    const file_size = parseInt(formData.get("file_size") as string, 10) || 0;

    if (!file_url) {
      return { success: false, error: "Lütfen bir PDF dosyası seçin." };
    }

    const now = new Date().toISOString();
    const { data, error } = await (supabase
      .from("uploaded_quotes") as any)
      .insert({
        company_id: companyId,
        title: title.trim(),
        customer_name: customer_name.trim() || null,
        quote_date,
        amount,
        file_name,
        file_url,
        file_size,
        notes: notes.trim() || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    try {
      revalidatePath("/teklifler");
    } catch {}

    return { success: true, quote: data as UploadedQuote };
  } catch (err: any) {
    console.error("saveUploadedQuote error:", err);
    return { success: false, error: err?.message || "PDF teklif kaydedilemedi." };
  }
}

export async function deleteUploadedQuote(id: string) {
  try {
    const { supabase, companyId } = await getCompanyAndUser();
    const { error } = await (supabase
      .from("uploaded_quotes") as any)
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw new Error(error.message);

    try {
      revalidatePath("/teklifler");
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error("deleteUploadedQuote error:", err);
    return { success: false, error: err?.message || "PDF teklif silinemedi." };
  }
}
