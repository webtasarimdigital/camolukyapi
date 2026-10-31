"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type {
  ProcurementRecord,
  ProcurementStatus,
  NewProcurementItemInput,
  CreateManualProcurementInput,
} from "./types";

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
 * Tedarik modülündeki tüm kayıtları çeker
 */
export async function getProcurementRecords(): Promise<ProcurementRecord[]> {
  try {
    const { service, companyId } = await getCompanyAndUser();

    const { data, error } = await (service
      .from("camlica_firca_rows") as any)
      .select("id, company_id, row_data, created_at")
      .eq("company_id", companyId)
      .eq("row_data->>_module", "tedarik")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getProcurementRecords error:", error);
      return [];
    }

    return (data || []).map((row: any) => {
      const rd = row.row_data || {};
      return {
        id: row.id,
        company_id: row.company_id,
        _module: "tedarik" as const,
        sale_id: rd.sale_id || "",
        sale_code: rd.sale_code || "",
        sale_item_id: rd.sale_item_id || undefined,
        customer_id: rd.customer_id || undefined,
        customer_name: rd.customer_name || "Müşteri",
        customer_phone: rd.customer_phone || "",
        product_id: rd.product_id || undefined,
        product_name: rd.product_name || "",
        product_code: rd.product_code || "",
        quantity: Number(rd.quantity) || 1,
        unit: rd.unit || "Adet",
        supplier_name: rd.supplier_name || "",
        status: (rd.status as ProcurementStatus) || "bekliyor",
        notes: rd.notes || "",
        created_by_name: rd.created_by_name || "Admin",
        updated_by_name: rd.updated_by_name || null,
        created_at: rd.created_at || row.created_at,
        updated_at: rd.updated_at || row.created_at,
      };
    });
  } catch (err) {
    console.error("getProcurementRecords catch:", err);
    return [];
  }
}

/**
 * Belirli bir satışa ait tedarik kayıtlarını çeker (Satış detayı sayfası için)
 */
export async function getSaleProcurementItems(saleId: string): Promise<ProcurementRecord[]> {
  try {
    const { service, companyId } = await getCompanyAndUser();

    const { data, error } = await (service
      .from("camlica_firca_rows") as any)
      .select("id, company_id, row_data, created_at")
      .eq("company_id", companyId)
      .eq("row_data->>_module", "tedarik")
      .eq("row_data->>sale_id", saleId);

    if (error) {
      console.error("getSaleProcurementItems error:", error);
      return [];
    }

    return (data || []).map((row: any) => {
      const rd = row.row_data || {};
      return {
        id: row.id,
        company_id: row.company_id,
        _module: "tedarik" as const,
        sale_id: rd.sale_id || "",
        sale_code: rd.sale_code || "",
        sale_item_id: rd.sale_item_id || undefined,
        customer_id: rd.customer_id || undefined,
        customer_name: rd.customer_name || "Müşteri",
        customer_phone: rd.customer_phone || "",
        product_id: rd.product_id || undefined,
        product_name: rd.product_name || "",
        product_code: rd.product_code || "",
        quantity: Number(rd.quantity) || 1,
        unit: rd.unit || "Adet",
        supplier_name: rd.supplier_name || "",
        status: (rd.status as ProcurementStatus) || "bekliyor",
        notes: rd.notes || "",
        created_by_name: rd.created_by_name || "Admin",
        updated_by_name: rd.updated_by_name || null,
        created_at: rd.created_at || row.created_at,
        updated_at: rd.updated_at || row.created_at,
      };
    });
  } catch (err) {
    console.error("getSaleProcurementItems catch:", err);
    return [];
  }
}

/**
 * Satış detayından seçilen ürünleri Tedarik modülüne aktarır
 */
export async function sendItemsToProcurement(
  items: NewProcurementItemInput[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "Gönderilecek ürün seçilmedi." };
    }

    const { service, companyId, userName } = await getCompanyAndUser();
    const now = new Date().toISOString();

    const rowsToInsert = items.map((item) => ({
      company_id: companyId,
      row_data: {
        _module: "tedarik",
        sale_id: item.sale_id,
        sale_code: item.sale_code,
        sale_item_id: item.sale_item_id || null,
        customer_id: item.customer_id || null,
        customer_name: item.customer_name || "Müşteri",
        customer_phone: item.customer_phone || "",
        product_id: item.product_id || null,
        product_name: item.product_name,
        product_code: item.product_code || "",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "Adet",
        supplier_name: "",
        status: "bekliyor",
        notes: item.notes || "",
        created_by_name: userName,
        created_at: now,
        updated_at: now,
      },
    }));

    const { error } = await (service.from("camlica_firca_rows") as any).insert(rowsToInsert);

    if (error) {
      console.error("sendItemsToProcurement error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/tedarik");
    if (items[0]?.sale_id) {
      revalidatePath(`/satislar/${items[0].sale_id}`);
    }

    return { success: true, count: items.length };
  } catch (err: any) {
    console.error("sendItemsToProcurement catch:", err);
    return { success: false, error: err?.message || "Ürünler tedariğe aktarılamadı." };
  }
}

/**
 * Tedarikçi firma bilgisini günceller (Hücreden doğrudan giriş)
 */
export async function updateProcurementSupplier(
  id: string,
  supplierName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { service, companyId, userName } = await getCompanyAndUser();

    const { data: row, error: fetchErr } = await (service
      .from("camlica_firca_rows") as any)
      .select("id, row_data")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (fetchErr || !row) {
      return { success: false, error: "Tedarik kaydı bulunamadı." };
    }

    const rowData = (row as any).row_data || {};
    const updatedData = {
      ...rowData,
      supplier_name: (supplierName || "").trim(),
      updated_by_name: userName,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await (service
      .from("camlica_firca_rows") as any)
      .update({ row_data: updatedData })
      .eq("id", id);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath("/tedarik");
    if (rowData.sale_id) {
      revalidatePath(`/satislar/${rowData.sale_id}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("updateProcurementSupplier catch:", err);
    return { success: false, error: err?.message || "Tedarikçi güncellenemedi." };
  }
}

/**
 * Tedarik statüsünü günceller (bekliyor, siparis_verildi, tedarik_edildi, iptal)
 */
export async function updateProcurementStatus(
  id: string,
  status: ProcurementStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const { service, companyId, userName } = await getCompanyAndUser();

    const { data: row, error: fetchErr } = await (service
      .from("camlica_firca_rows") as any)
      .select("id, row_data")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (fetchErr || !row) {
      return { success: false, error: "Tedarik kaydı bulunamadı." };
    }

    const rowData = (row as any).row_data || {};
    const updatedData = {
      ...rowData,
      status,
      updated_by_name: userName,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await (service
      .from("camlica_firca_rows") as any)
      .update({ row_data: updatedData })
      .eq("id", id);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    revalidatePath("/tedarik");
    if (rowData.sale_id) {
      revalidatePath(`/satislar/${rowData.sale_id}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("updateProcurementStatus catch:", err);
    return { success: false, error: err?.message || "Statü güncellenemedi." };
  }
}

/**
 * Tedarik kaydını siler
 */
export async function deleteProcurementRecord(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { service, companyId } = await getCompanyAndUser();

    const { data: row } = await (service
      .from("camlica_firca_rows") as any)
      .select("row_data")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    const rowData = (row as any)?.row_data;

    const { error } = await (service
      .from("camlica_firca_rows") as any)
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/tedarik");
    if (rowData?.sale_id) {
      revalidatePath(`/satislar/${rowData.sale_id}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteProcurementRecord catch:", err);
    return { success: false, error: err?.message || "Tedarik kaydı silinemedi." };
  }
}

/**
 * Tedarik modülüne doğrudan müşteri bazlı manuel kayıt ekler
 */
export async function createManualProcurementItem(
  input: CreateManualProcurementInput
): Promise<{ success: boolean; record?: ProcurementRecord; error?: string }> {
  try {
    if (!input.customer_name?.trim()) {
      return { success: false, error: "Müşteri adı zorunludur." };
    }
    if (!input.product_name?.trim()) {
      return { success: false, error: "Ürün adı zorunludur." };
    }
    if (!input.quantity || Number(input.quantity) <= 0) {
      return { success: false, error: "Geçerli bir miktar giriniz." };
    }

    const { service, companyId, userName } = await getCompanyAndUser();
    const now = new Date().toISOString();

    const row_data = {
      _module: "tedarik",
      sale_id: "",
      sale_code: "Manuel Giriş",
      customer_id: input.customer_id || null,
      customer_name: input.customer_name.trim(),
      customer_phone: input.customer_phone?.trim() || "",
      product_id: null,
      product_name: input.product_name.trim(),
      product_code: input.product_code?.trim() || "",
      quantity: Number(input.quantity),
      unit: input.unit?.trim() || "Adet",
      supplier_name: input.supplier_name?.trim() || "",
      status: input.status || "bekliyor",
      notes: input.notes?.trim() || "",
      created_by_name: userName,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await (service
      .from("camlica_firca_rows") as any)
      .insert({
        company_id: companyId,
        row_data,
      })
      .select("id, company_id, row_data, created_at")
      .single();

    if (error) {
      console.error("createManualProcurementItem error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/tedarik");

    return {
      success: true,
      record: {
        id: data.id,
        company_id: data.company_id,
        _module: "tedarik",
        sale_id: "",
        sale_code: "Manuel Giriş",
        customer_id: input.customer_id,
        customer_name: input.customer_name.trim(),
        customer_phone: input.customer_phone?.trim() || "",
        product_name: input.product_name.trim(),
        product_code: input.product_code?.trim() || "",
        quantity: Number(input.quantity),
        unit: input.unit?.trim() || "Adet",
        supplier_name: input.supplier_name?.trim() || "",
        status: input.status || "bekliyor",
        notes: input.notes?.trim() || "",
        created_at: now,
        updated_at: now,
      },
    };
  } catch (err: any) {
    console.error("createManualProcurementItem catch:", err);
    return { success: false, error: err?.message || "Tedarik kaydı oluşturulamadı." };
  }
}

