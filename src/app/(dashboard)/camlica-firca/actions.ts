"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

export interface CamlicaColumn {
  id: string;
  company_id: string;
  column_key: string;
  column_name: string;
  column_type: string;
  sort_order: number;
  created_at: string;
}

export interface CamlicaRow {
  id: string;
  company_id: string;
  row_data: Record<string, any>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getCamlicaFircaData(): Promise<{
  columns: CamlicaColumn[];
  rows: CamlicaRow[];
}> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    // Sütunları çek
    const { data: columns, error: colError } = await service
      .from("camlica_firca_columns")
      .select("*")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (colError) console.error("camlica_firca_columns error:", colError);

    // Satırları çek (sadece Çamlıca Fırça satırları)
    const { data: rows, error: rowError } = await service
      .from("camlica_firca_rows")
      .select("*")
      .eq("company_id", companyId)
      .or("row_data->>_module.is.null,row_data->>_module.eq.camlica_firca")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (rowError) console.error("camlica_firca_rows error:", rowError);

    return {
      columns: (columns || []) as CamlicaColumn[],
      rows: (rows || []) as CamlicaRow[],
    };
  } catch (err) {
    console.error("getCamlicaFircaData catch:", err);
    return { columns: [], rows: [] };
  }
}

// Sütun Ekle
export async function addCamlicaFircaColumn(columnName: string, columnType: string = "text") {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    // Benzersiz anahtar üret
    const sanitizedKey = "col_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);

    const { data: existingCols } = await service
      .from("camlica_firca_columns")
      .select("sort_order")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = existingCols && existingCols[0]?.sort_order ? existingCols[0].sort_order + 1 : 0;

    const { data, error } = await service
      .from("camlica_firca_columns")
      .insert({
        company_id: companyId,
        column_key: sanitizedKey,
        column_name: columnName.trim(),
        column_type: columnType,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/camlica-firca");
    return { success: true, data };
  } catch (err: any) {
    console.error("addCamlicaFircaColumn error:", err);
    return { success: false, error: err.message };
  }
}

// Sütun Güncelle
export async function updateCamlicaFircaColumn(columnKey: string, newName: string) {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { data, error } = await service
      .from("camlica_firca_columns")
      .update({ column_name: newName.trim() })
      .eq("company_id", companyId)
      .eq("column_key", columnKey)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/camlica-firca");
    return { success: true, data };
  } catch (err: any) {
    console.error("updateCamlicaFircaColumn error:", err);
    return { success: false, error: err.message };
  }
}

// Sütun Sil
export async function deleteCamlicaFircaColumn(columnKey: string) {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { error } = await service
      .from("camlica_firca_columns")
      .delete()
      .eq("company_id", companyId)
      .eq("column_key", columnKey);

    if (error) throw error;
    revalidatePath("/camlica-firca");
    return { success: true };
  } catch (err: any) {
    console.error("deleteCamlicaFircaColumn error:", err);
    return { success: false, error: err.message };
  }
}

// Satır Ekle
export async function addCamlicaFircaRow(initialData: Record<string, any> = {}) {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { data: existingRows } = await service
      .from("camlica_firca_rows")
      .select("sort_order")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = existingRows && existingRows[0]?.sort_order ? existingRows[0].sort_order + 1 : 0;

    const { data, error } = await service
      .from("camlica_firca_rows")
      .insert({
        company_id: companyId,
        row_data: initialData,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/camlica-firca");
    return { success: true, data };
  } catch (err: any) {
    console.error("addCamlicaFircaRow error:", err);
    return { success: false, error: err.message };
  }
}

// Hücre Güncelle (Tek hücre güncellemesi)
export async function updateCamlicaFircaCell(rowId: string, columnKey: string, value: any) {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    // Mevcut row_data'yı al
    const { data: row, error: fetchErr } = await service
      .from("camlica_firca_rows")
      .select("row_data")
      .eq("company_id", companyId)
      .eq("id", rowId)
      .single();

    if (fetchErr) throw fetchErr;

    const updatedData = { ...(row?.row_data || {}), [columnKey]: value };

    const { data, error } = await service
      .from("camlica_firca_rows")
      .update({
        row_data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", rowId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error("updateCamlicaFircaCell error:", err);
    return { success: false, error: err.message };
  }
}

// Tüm Satırı Güncelle
export async function updateCamlicaFircaRow(rowId: string, rowData: Record<string, any>) {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { data, error } = await service
      .from("camlica_firca_rows")
      .update({
        row_data: rowData,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("id", rowId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/camlica-firca");
    return { success: true, data };
  } catch (err: any) {
    console.error("updateCamlicaFircaRow error:", err);
    return { success: false, error: err.message };
  }
}

// Satır Sil
export async function deleteCamlicaFircaRow(rowId: string) {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { error } = await service
      .from("camlica_firca_rows")
      .delete()
      .eq("company_id", companyId)
      .eq("id", rowId);

    if (error) throw error;
    revalidatePath("/camlica-firca");
    return { success: true };
  } catch (err: any) {
    console.error("deleteCamlicaFircaRow error:", err);
    return { success: false, error: err.message };
  }
}

// Çoklu Satır Sil
export async function deleteCamlicaFircaRows(rowIds: string[]) {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { error } = await service
      .from("camlica_firca_rows")
      .delete()
      .eq("company_id", companyId)
      .in("id", rowIds);

    if (error) throw error;
    revalidatePath("/camlica-firca");
    return { success: true };
  } catch (err: any) {
    console.error("deleteCamlicaFircaRows error:", err);
    return { success: false, error: err.message };
  }
}
