"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { CompanyPortal, TaliBayiOption } from "./types";

async function getCompanyAndUser() {
  const supabase = await createClient();
  const service = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let companyId = "a0000000-0000-0000-0000-000000000001";
  let userName = "Admin";
  let userRole = "staff";

  if (user) {
    const { data: profile } = (await service
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

  return { supabase, service, user, companyId, userName, userRole };
}

/**
 * Sistemdeki aktif tali bayileri çeker (Admin paneli yetkilendirme seçimi için)
 */
export async function getTaliBayiler(): Promise<TaliBayiOption[]> {
  try {
    const { service, companyId } = await getCompanyAndUser();
    const { data, error } = await service
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("company_id", companyId)
      .in("role", ["tali_bayi", "bayi"])
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("getTaliBayiler error:", error);
      return [];
    }

    return (data || []).map((b: any) => ({
      id: b.id,
      full_name: b.full_name || "Tali Bayi",
      role: b.role,
      is_active: b.is_active,
    }));
  } catch (err) {
    console.error("getTaliBayiler catch:", err);
    return [];
  }
}

/**
 * Şirket portallarını çeker.
 * Tali bayiler için sunucu tarafında filtre uygulanır:
 * Yalnızca kendi kullanıcı ID'si 'allowed_bayi_ids' listesinde olan portallar döner.
 * Yeni tali bayiler için varsayılan olarak tüm portallar KAPALIDIR.
 */
export async function getPortals(): Promise<CompanyPortal[]> {
  try {
    const { service, user, companyId, userRole } = await getCompanyAndUser();
    const { data, error } = await (service.from("portals") as any)
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getPortals error:", error);
      return [];
    }

    let portalList: CompanyPortal[] = (data || []) as CompanyPortal[];

    // Tablo boş ise başlangıç portallarını otomatik ekle
    if (portalList.length === 0) {
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

      const { data: seeded } = await (service.from("portals") as any)
        .insert(initialPortals)
        .select();

      portalList = (seeded || []) as CompanyPortal[];
    }

    // camlica_firca_rows üzerinden her portal için yetkili tali bayileri çek
    const { data: permRows } = await (service
      .from("camlica_firca_rows") as any)
      .select("row_data")
      .eq("company_id", companyId)
      .eq("row_data->>_module", "portal_bayi_access");

    const permMap = new Map<string, string[]>();
    (permRows || []).forEach((row: any) => {
      const pId = row.row_data?.portal_id;
      const bayiIds = Array.isArray(row.row_data?.allowed_bayi_ids)
        ? row.row_data.allowed_bayi_ids
        : [];
      if (pId) {
        permMap.set(pId, bayiIds);
      }
    });

    const enrichedPortals = portalList.map((p) => ({
      ...p,
      allowed_bayi_ids: permMap.get(p.id) || [],
    }));

    // GÜVENLİK FİLTRESİ: Tali bayiler sadece yetki verilmiş portalları görebilir!
    if (["tali_bayi", "bayi"].includes(userRole)) {
      const userId = user?.id;
      if (!userId) return [];
      return enrichedPortals.filter(
        (p) => Array.isArray(p.allowed_bayi_ids) && p.allowed_bayi_ids.includes(userId)
      );
    }

    return enrichedPortals;
  } catch (err) {
    console.error("getPortals catch:", err);
    return [];
  }
}

/**
 * Bir portal için yetkili tali bayileri günceller
 */
export async function updatePortalBayiPermissions(
  portalId: string,
  allowed_bayi_ids: string[]
) {
  try {
    const { service, companyId, userRole } = await getCompanyAndUser();
    if (!["admin", "muhasebe1"].includes(userRole)) {
      return { success: false, error: "Yetkiniz bulunmuyor! Yalnızca yöneticiler yetki verebilir." };
    }

    const { data: existing } = await (service.from("camlica_firca_rows") as any)
      .select("id")
      .eq("company_id", companyId)
      .eq("row_data->>_module", "portal_bayi_access")
      .eq("row_data->>portal_id", portalId);

    const now = new Date().toISOString();
    const payload = {
      _module: "portal_bayi_access",
      portal_id: portalId,
      allowed_bayi_ids: Array.isArray(allowed_bayi_ids) ? allowed_bayi_ids : [],
      updated_at: now,
    };

    if (existing && existing.length > 0) {
      const { error } = await (service.from("camlica_firca_rows") as any)
        .update({ row_data: payload })
        .eq("id", existing[0].id);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await (service.from("camlica_firca_rows") as any)
        .insert({
          company_id: companyId,
          row_data: payload,
        });

      if (error) throw new Error(error.message);
    }

    revalidatePath("/portallar");
    return { success: true };
  } catch (err: any) {
    console.error("updatePortalBayiPermissions error:", err);
    return { success: false, error: err?.message || "Yetkiler kaydedilemedi." };
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
  allowed_bayi_ids?: string[];
}) {
  try {
    const { service, companyId, userName, userRole } = await getCompanyAndUser();
    if (["tali_bayi", "bayi", "depo", "sofor"].includes(userRole)) {
      return { success: false, error: "Yetkiniz bulunmuyor! Yalnızca görüntüleme yetkiniz bulunmaktadır." };
    }
    const now = new Date().toISOString();

    let portalRecord: CompanyPortal;

    if (input.id) {
      const { data, error } = await (service.from("portals") as any)
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
      portalRecord = data as CompanyPortal;
    } else {
      const { data, error } = await (service.from("portals") as any)
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
      portalRecord = data as CompanyPortal;
    }

    // Yetkili tali bayileri kaydet (varsa)
    if (input.allowed_bayi_ids !== undefined) {
      await updatePortalBayiPermissions(portalRecord.id, input.allowed_bayi_ids);
    }

    revalidatePath("/portallar");
    return {
      success: true,
      portal: {
        ...portalRecord,
        allowed_bayi_ids: input.allowed_bayi_ids || [],
      },
    };
  } catch (err: any) {
    console.error("savePortal error:", err);
    return { success: false, error: err?.message || "Portal kaydedilemedi." };
  }
}

export async function deletePortal(id: string) {
  try {
    const { service, companyId, userRole } = await getCompanyAndUser();
    if (!["admin", "muhasebe1"].includes(userRole)) {
      return { success: false, error: "Yetkiniz bulunmuyor! Yalnızca yöneticiler portal silebilir." };
    }

    // 1. Portal tablosundan sil
    const { error } = await (service.from("portals") as any).delete().eq("id", id);
    if (error) throw new Error(error.message);

    // 2. Yetki tablosundan sil
    try {
      await (service
        .from("camlica_firca_rows") as any)
        .delete()
        .eq("company_id", companyId)
        .eq("row_data->>_module", "portal_bayi_access")
        .eq("row_data->>portal_id", id);
    } catch {}

    revalidatePath("/portallar");
    return { success: true };
  } catch (err: any) {
    console.error("deletePortal error:", err);
    return { success: false, error: err?.message || "Portal silinemedi." };
  }
}
