"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
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
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SaveUploadedQuoteInput {
  title: string;
  customer_name?: string | null;
  quote_date?: string | null;
  amount?: number | null;
  notes?: string | null;
  file_name: string;
  file_url: string;
  file_size?: number | null;
}

async function getCompanyAndUser() {
  let companyId = "a0000000-0000-0000-0000-000000000001";
  let userName = "Admin";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = (await supabase
        .from("profiles")
        .select("company_id, full_name, role")
        .eq("id", user.id)
        .single()) as any;

      if (profile?.company_id) companyId = profile.company_id;
      if (profile?.full_name) userName = profile.full_name;
    }
  } catch {}

  try {
    const cookieStore = await cookies();
    const cookieName = cookieStore.get("app_user_name")?.value;
    if (cookieName) userName = cookieName;
  } catch {}

  const serviceClient = await createServiceClient();
  return { supabase: serviceClient, companyId, userName };
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

export async function saveUploadedQuote(input: SaveUploadedQuoteInput | FormData) {
  try {
    const { supabase, companyId, userName } = await getCompanyAndUser();

    let title = "Teklif PDF";
    let customer_name: string | null = null;
    let quote_date = new Date().toISOString().split("T")[0];
    let amount = 0;
    let notes: string | null = null;
    let file_name = "teklif.pdf";
    let file_url = "";
    let file_size = 0;

    if (typeof (input as any)?.get === "function") {
      const fd = input as FormData;
      title = (fd.get("title") as string) || "Teklif PDF";
      customer_name = (fd.get("customer_name") as string) || null;
      quote_date = (fd.get("quote_date") as string) || quote_date;
      const rawAmount = fd.get("amount") as string;
      amount = parseFloat(rawAmount?.replace(/\./g, "").replace(",", ".") || "0") || 0;
      notes = (fd.get("notes") as string) || null;
      file_name = (fd.get("file_name") as string) || "teklif.pdf";
      file_url = (fd.get("file_url") as string) || "";
      file_size = parseInt(fd.get("file_size") as string, 10) || 0;
    } else {
      const obj = input as SaveUploadedQuoteInput;
      title = obj.title || "Teklif PDF";
      customer_name = obj.customer_name || null;
      quote_date = obj.quote_date || quote_date;
      amount = Number(obj.amount) || 0;
      notes = obj.notes || null;
      file_name = obj.file_name || "teklif.pdf";
      file_url = obj.file_url || "";
      file_size = Number(obj.file_size) || 0;
    }

    if (!file_url) {
      return { success: false, error: "Lütfen bir PDF dosyası seçin." };
    }

    const now = new Date().toISOString();
    const { data, error } = await (supabase
      .from("uploaded_quotes") as any)
      .insert({
        company_id: companyId,
        title: title.trim(),
        customer_name: customer_name ? customer_name.trim() : null,
        quote_date,
        amount: isNaN(amount) ? 0 : amount,
        file_name,
        file_url,
        file_size: isNaN(file_size) ? 0 : file_size,
        notes: notes ? notes.trim() : null,
        created_by_name: userName,
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert uploaded_quotes error:", error);
      throw new Error(error.message);
    }

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
