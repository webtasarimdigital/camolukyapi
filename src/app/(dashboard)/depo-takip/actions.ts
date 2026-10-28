"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface WarehouseBrokenRecord {
  id: string;
  company_id?: string;
  image_url: string;
  images?: string[];
  reason: string;
  broken_date: string;
  customer_id?: string;
  customer_name?: string;
  product_name?: string;
  reported_by?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export type DeliveryType = "depodan_teslim_alinan" | "depoya_teslim_edilen";

export interface WarehouseDeliveryRecord {
  id: string;
  company_id?: string;
  delivery_type?: DeliveryType;
  customer_id?: string;
  customer_name: string;
  // Depoya Teslim Edilen (Giriş)
  received_date?: string;
  received_by?: string;
  received_image_url?: string;
  // Depodan Teslim Alınan (Çıkış)
  delivered_date?: string;
  delivered_by?: string;
  delivered_image_url?: string;
  // Geriye dönük uyumluluk alanları
  delivery_date?: string;
  receipt_image_url?: string;
  receipt_images?: string[];
  notes?: string;
  custom_fields?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface WarehouseCustomColumn {
  id: string;
  table_id: string; // 'depo_kiriklar' | 'depo_teslimi'
  column_key: string;
  column_name: string;
  column_type: string;
  created_at?: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  phone?: string;
}

async function getCompanyId(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      const p = profile as any;
      if (p?.company_id) return p.company_id;
    }
  } catch {}
  return "a0000000-0000-0000-0000-000000000001";
}

export async function getWarehousePageData(): Promise<{
  brokenRecords: WarehouseBrokenRecord[];
  deliveryRecords: WarehouseDeliveryRecord[];
  brokenColumns: WarehouseCustomColumn[];
  deliveryColumns: WarehouseCustomColumn[];
  customers: CustomerOption[];
}> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    // 1. Müşterileri çek
    const { data: custData } = await service
      .from("customers")
      .select("id, company_name, contact_name, phone")
      .eq("company_id", companyId)
      .order("company_name", { ascending: true })
      .limit(500);

    const customers: CustomerOption[] = (custData || []).map((c: any) => ({
      id: c.id,
      name: (c.company_name || c.contact_name || "İsimsiz Müşteri").trim(),
      phone: c.phone || "",
    }));

    // 2. Dinamik Sütunları Çek
    const { data: colsData } = await service
      .from("table_custom_columns")
      .select("*")
      .eq("company_id", companyId)
      .in("table_id", ["depo_kiriklar", "depo_teslimi"])
      .order("created_at", { ascending: true });

    const brokenColumns: WarehouseCustomColumn[] = (colsData || [])
      .filter((c: any) => c.table_id === "depo_kiriklar")
      .map((c: any) => ({
        id: c.id,
        table_id: c.table_id,
        column_key: c.column_key,
        column_name: c.column_name,
        column_type: c.column_type || "text",
        created_at: c.created_at,
      }));

    const deliveryColumns: WarehouseCustomColumn[] = (colsData || [])
      .filter((c: any) => c.table_id === "depo_teslimi")
      .map((c: any) => ({
        id: c.id,
        table_id: c.table_id,
        column_key: c.column_key,
        column_name: c.column_name,
        column_type: c.column_type || "text",
        created_at: c.created_at,
      }));

    // 3. Kırıklar Kayıtlarını Çek
    const { data: brokenRows, error: brokenErr } = await service
      .from("camlica_firca_rows")
      .select("*")
      .eq("company_id", companyId)
      .eq("row_data->>_module", "depo_kiriklar")
      .order("created_at", { ascending: false });

    if (brokenErr) console.error("depo_kiriklar query error:", brokenErr);

    const brokenRecords: WarehouseBrokenRecord[] = (brokenRows || []).map((r: any) => {
      const data = r.row_data || {};
      return {
        id: r.id,
        company_id: r.company_id,
        image_url: data.image_url || "",
        images: data.images || (data.image_url ? [data.image_url] : []),
        reason: data.reason || "",
        broken_date: data.broken_date || r.created_at?.slice(0, 10) || "",
        customer_id: data.customer_id || undefined,
        customer_name: data.customer_name || "",
        product_name: data.product_name || "",
        reported_by: data.reported_by || "",
        notes: data.notes || "",
        custom_fields: data.custom_fields || {},
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    // 4. Depo Teslimatı Kayıtlarını Çek
    const { data: deliveryRows, error: delErr } = await service
      .from("camlica_firca_rows")
      .select("*")
      .eq("company_id", companyId)
      .eq("row_data->>_module", "depo_teslimi")
      .order("created_at", { ascending: false });

    if (delErr) console.error("depo_teslimi query error:", delErr);

    const deliveryRecords: WarehouseDeliveryRecord[] = (deliveryRows || []).map((r: any) => {
      const data = r.row_data || {};
      const isDepoya = data.delivery_type === "depoya_teslim_edilen";
      return {
        id: r.id,
        company_id: r.company_id,
        delivery_type: (data.delivery_type as DeliveryType) || (data.received_image_url || data.received_date ? "depoya_teslim_edilen" : "depodan_teslim_alinan"),
        customer_id: data.customer_id || undefined,
        customer_name: data.customer_name || "",
        // Depoya Teslim Edilen
        received_date: data.received_date || (isDepoya ? data.delivery_date : "") || "",
        received_by: data.received_by || (isDepoya ? data.delivered_by : "") || "",
        received_image_url: data.received_image_url || (isDepoya ? data.receipt_image_url : "") || "",
        // Depodan Teslim Alınan
        delivered_date: data.delivered_date || (!isDepoya && data.delivery_date ? data.delivery_date : "") || "",
        delivered_by: data.delivered_by || (!isDepoya && data.delivered_by ? data.delivered_by : "") || "",
        delivered_image_url: data.delivered_image_url || (!isDepoya && data.receipt_image_url ? data.receipt_image_url : "") || "",
        // Geriye dönük uyumluluk
        delivery_date: data.delivery_date || data.received_date || data.delivered_date || r.created_at?.slice(0, 10) || "",
        delivered_by_legacy: data.delivered_by || "",
        receipt_image_url: data.receipt_image_url || data.received_image_url || data.delivered_image_url || "",
        receipt_images: data.receipt_images || (data.receipt_image_url ? [data.receipt_image_url] : []),
        notes: data.notes || "",
        custom_fields: data.custom_fields || {},
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    return {
      brokenRecords,
      deliveryRecords,
      brokenColumns,
      deliveryColumns,
      customers,
    };
  } catch (err) {
    console.error("getWarehousePageData error:", err);
    return {
      brokenRecords: [],
      deliveryRecords: [],
      brokenColumns: [],
      deliveryColumns: [],
      customers: [],
    };
  }
}

// -------------------------------------------------------------
// Kırıklar CRUD
// -------------------------------------------------------------
export async function saveBrokenRecord(record: {
  id?: string;
  image_url: string;
  images?: string[];
  reason: string;
  broken_date: string;
  customer_id?: string;
  customer_name?: string;
  product_name?: string;
  reported_by?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const rowData = {
      _module: "depo_kiriklar",
      image_url: record.image_url,
      images: record.images || (record.image_url ? [record.image_url] : []),
      reason: record.reason,
      broken_date: record.broken_date,
      customer_id: record.customer_id || null,
      customer_name: record.customer_name || "",
      product_name: record.product_name || "",
      reported_by: record.reported_by || "",
      notes: record.notes || "",
      custom_fields: record.custom_fields || {},
    };

    if (record.id) {
      // Güncelle
      const { data, error } = await service
        .from("camlica_firca_rows")
        .update({
          row_data: rowData,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", record.id)
        .select()
        .single();

      if (error) throw error;
      revalidatePath("/depo-takip");
      return { success: true, data };
    } else {
      // Ekle
      const { data, error } = await service
        .from("camlica_firca_rows")
        .insert({
          company_id: companyId,
          row_data: rowData,
          sort_order: 0,
        })
        .select()
        .single();

      if (error) throw error;
      revalidatePath("/depo-takip");
      return { success: true, data };
    }
  } catch (err: any) {
    console.error("saveBrokenRecord error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteBrokenRecord(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { error } = await service
      .from("camlica_firca_rows")
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/depo-takip");
    return { success: true };
  } catch (err: any) {
    console.error("deleteBrokenRecord error:", err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// Depo Teslimatı CRUD
// -------------------------------------------------------------
export async function saveDeliveryRecord(record: {
  id?: string;
  delivery_type?: DeliveryType;
  customer_id?: string;
  customer_name: string;
  // Depoya Teslim Edilen
  received_date?: string;
  received_by?: string;
  received_image_url?: string;
  // Depodan Teslim Alınan
  delivered_date?: string;
  delivered_by?: string;
  delivered_image_url?: string;
  // Geriye dönük uyumluluk alanları
  delivery_date?: string;
  delivered_by_legacy?: string;
  receipt_image_url?: string;
  receipt_images?: string[];
  notes?: string;
  custom_fields?: Record<string, any>;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    let prevData: any = {};
    if (record.id) {
      const { data: existing } = await service
        .from("camlica_firca_rows")
        .select("row_data")
        .eq("company_id", companyId)
        .eq("id", record.id)
        .single();
      if (existing?.row_data) {
        prevData = existing.row_data;
      }
    }

    const rowData = {
      _module: "depo_teslimi",
      delivery_type: record.delivery_type || prevData.delivery_type || "depoya_teslim_edilen",
      customer_id: record.customer_id !== undefined ? record.customer_id : (prevData.customer_id || null),
      customer_name: record.customer_name || prevData.customer_name || "",
      // Depoya Teslim Edilen
      received_date: record.received_date !== undefined ? record.received_date : (prevData.received_date || ""),
      received_by: record.received_by !== undefined ? record.received_by : (prevData.received_by || ""),
      received_image_url: record.received_image_url !== undefined ? record.received_image_url : (prevData.received_image_url || ""),
      // Depodan Teslim Alınan
      delivered_date: record.delivered_date !== undefined ? record.delivered_date : (prevData.delivered_date || ""),
      delivered_by: record.delivered_by !== undefined ? record.delivered_by : (prevData.delivered_by || ""),
      delivered_image_url: record.delivered_image_url !== undefined ? record.delivered_image_url : (prevData.delivered_image_url || ""),
      // Geriye uyumluluk
      delivery_date: record.received_date || record.delivered_date || record.delivery_date || prevData.delivery_date || "",
      receipt_image_url: record.received_image_url || record.delivered_image_url || record.receipt_image_url || prevData.receipt_image_url || "",
      receipt_images: record.receipt_images || prevData.receipt_images || [],
      notes: record.notes !== undefined ? record.notes : (prevData.notes || ""),
      custom_fields: record.custom_fields || prevData.custom_fields || {},
    };

    if (record.id) {
      // Güncelle
      const { data, error } = await service
        .from("camlica_firca_rows")
        .update({
          row_data: rowData,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", record.id)
        .select()
        .single();

      if (error) throw error;
      revalidatePath("/depo-takip");
      return { success: true, data };
    } else {
      // Ekle
      const { data, error } = await service
        .from("camlica_firca_rows")
        .insert({
          company_id: companyId,
          row_data: rowData,
          sort_order: 0,
        })
        .select()
        .single();

      if (error) throw error;
      revalidatePath("/depo-takip");
      return { success: true, data };
    }
  } catch (err: any) {
    console.error("saveDeliveryRecord error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteDeliveryRecord(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { error } = await service
      .from("camlica_firca_rows")
      .delete()
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/depo-takip");
    return { success: true };
  } catch (err: any) {
    console.error("deleteDeliveryRecord error:", err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// Dinamik Sütunlar CRUD
// -------------------------------------------------------------
export async function addWarehouseCustomColumn(
  tableId: "depo_kiriklar" | "depo_teslimi",
  columnName: string,
  columnType: string = "text"
): Promise<{ success: boolean; column?: WarehouseCustomColumn; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const columnKey =
      columnName
        .toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "") || `col_${Date.now()}`;

    const { data, error } = await service
      .from("table_custom_columns")
      .insert({
        company_id: companyId,
        table_id: tableId,
        column_key: columnKey,
        column_name: columnName.trim(),
        column_type: columnType,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/depo-takip");
    return { success: true, column: data as WarehouseCustomColumn };
  } catch (err: any) {
    console.error("addWarehouseCustomColumn error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteWarehouseCustomColumn(
  tableId: "depo_kiriklar" | "depo_teslimi",
  columnKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { error } = await service
      .from("table_custom_columns")
      .delete()
      .eq("company_id", companyId)
      .eq("table_id", tableId)
      .eq("column_key", columnKey);

    if (error) throw error;
    revalidatePath("/depo-takip");
    return { success: true };
  } catch (err: any) {
    console.error("deleteWarehouseCustomColumn error:", err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// Tekil Hücre Güncelleme
// -------------------------------------------------------------
export async function updateWarehouseCell(
  rowId: string,
  columnKey: string,
  value: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { data: row, error: fetchErr } = await service
      .from("camlica_firca_rows")
      .select("row_data")
      .eq("company_id", companyId)
      .eq("id", rowId)
      .single();

    if (fetchErr) throw fetchErr;

    const rowData = row?.row_data || {};
    const customFields = rowData.custom_fields || {};

    let updatedRowData: Record<string, any>;
    if (["reason", "broken_date", "product_name", "reported_by", "notes", "customer_name", "delivery_date", "delivered_by", "delivery_type"].includes(columnKey)) {
      updatedRowData = { ...rowData, [columnKey]: value };
    } else {
      updatedRowData = {
        ...rowData,
        custom_fields: {
          ...customFields,
          [columnKey]: value,
        },
      };
    }

    const { error: updateErr } = await service
      .from("camlica_firca_rows")
      .update({
        row_data: updatedRowData,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", rowId);

    if (updateErr) throw updateErr;
    return { success: true };
  } catch (err: any) {
    console.error("updateWarehouseCell error:", err);
    return { success: false, error: err.message };
  }
}
