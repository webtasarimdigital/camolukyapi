"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { CompanyPortal } from "./types";

async function getCompanyAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let companyId = "a0000000-0000-0000-0000-000000000001";
  let userName = "Admin";
  let userRole = "staff";

  if (user) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("company_id, full_name, role")
      .eq("id", user.id)
      .single()) as any;

    if (profile?.company_id) companyId = profile.company_id;
    if (profile?.full_name) userName = profile.full_name;
    if (profile?.role) userRole = profile.role;
  }

  const cookieStore = await cookies();
  const cookieName = cookieStore.get("app_user_name")?.value;
  if (cookieName) userName = cookieName;

  const cookieRole = cookieStore.get("app_active_role")?.value;
  if (userRole === "admin" && cookieRole) userRole = cookieRole;

  return { supabase, user, companyId, userName, userRole };
}

export async function getPortals(): Promise<CompanyPortal[]> {
  try {
    const { supabase, companyId } = await getCompanyAndUser();
    const { data, error } = await (supabase.from("portals") as any)
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getPortals error:", error);
      return [];
    }

    // Tablo boş ise başlangıç portallarını otomatik ekle
    if (!data || data.length === 0) {
      const initialPortals = [
        {
          company_id: companyId,
          title: "Petrol Ofisi Otobil Portalı",
          category: "Filo / GPS",
          url: "https://web.otobil.com.tr",
          username: "camoluk@camolukyapi.com",
          password: "",
          notes: "Araç filo yakıt ve GPS telemetri takip sistemi",
          created_by_name: "Sistem",
        },
        {
          company_id: companyId,
          title: "Kütahya Seramik B2B Portalı",
          category: "B2B Tedarikçi",
          url: "https://b2b.kutahyaseramik.com.tr",
          username: "camoluk_b2b",
          password: "",
          notes: "Seramik stok sorgulama, sipariş ve bayi ekstresi",
          created_by_name: "Sistem",
        },
        {
          company_id: companyId,
          title: "GİB E-Fatura & E-Arşiv Portalı",
          category: "E-Dönüşüm / Fatura",
          url: "https://ebelge.gib.gov.tr",
          username: "",
          password: "",
          notes: "Resmi e-fatura sorgulama ve iptal/itiraz portalı",
          created_by_name: "Sistem",
        },
      ];

      const { data: seeded } = await (supabase.from("portals") as any)
        .insert(initialPortals)
        .select();

      return (seeded || []) as CompanyPortal[];
    }

    return (data || []) as CompanyPortal[];
  } catch (err) {
    console.error("getPortals catch:", err);
    return [];
  }
}

export async function savePortal(input: {
  id?: string;
  title: string;
  category: CompanyPortal["category"];
  url: string;
  username?: string;
  password?: string;
  notes?: string;
}) {
  try {
    const { supabase, companyId, userName, userRole } = await getCompanyAndUser();
    if (["tali_bayi", "bayi", "depo", "sofor"].includes(userRole)) {
      return { success: false, error: "Yetkiniz bulunmuyor! Yalnızca görüntüleme yetkiniz bulunmaktadır." };
    }
    const now = new Date().toISOString();

    if (input.id) {
      const { data, error } = await (supabase.from("portals") as any)
        .update({
          title: input.title.trim(),
          category: input.category,
          url: input.url.trim(),
          username: input.username?.trim() || null,
          password: input.password?.trim() || null,
          notes: input.notes?.trim() || null,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      revalidatePath("/portallar");
      return { success: true, portal: data as CompanyPortal };
    } else {
      const { data, error } = await (supabase.from("portals") as any)
        .insert({
          company_id: companyId,
          title: input.title.trim(),
          category: input.category,
          url: input.url.trim(),
          username: input.username?.trim() || null,
          password: input.password?.trim() || null,
          notes: input.notes?.trim() || null,
          created_by_name: userName,
          created_at: now,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      revalidatePath("/portallar");
      return { success: true, portal: data as CompanyPortal };
    }
  } catch (err: any) {
    console.error("savePortal error:", err);
    return { success: false, error: err?.message || "Portal kaydedilemedi." };
  }
}

export async function deletePortal(id: string) {
  try {
    const { supabase, userRole } = await getCompanyAndUser();
    if (!["admin", "muhasebe1"].includes(userRole)) {
      return { success: false, error: "Yetkiniz bulunmuyor! Yalnızca yöneticiler portal silebilir." };
    }
    const { error } = await (supabase.from("portals") as any).delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/portallar");
    return { success: true };
  } catch (err: any) {
    console.error("deletePortal error:", err);
    return { success: false, error: err?.message || "Portal silinemedi." };
  }
}
