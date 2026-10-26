"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CustomColumn {
  id: string;
  table_id: string;
  column_key: string;
  column_name: string;
  column_type: "text" | "number" | "date" | "badge";
  created_at?: string;
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

export async function getCustomColumns(tableId: string): Promise<CustomColumn[]> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();
    const { data, error } = await service
      .from("table_custom_columns")
      .select("*")
      .eq("company_id", companyId)
      .eq("table_id", tableId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getCustomColumns error:", error);
      return [];
    }
    return (data || []) as CustomColumn[];
  } catch (err) {
    console.error("getCustomColumns catch:", err);
    return [];
  }
}

export async function addCustomColumn(
  tableId: string,
  columnName: string,
  columnType: "text" | "number" | "date" | "badge" = "text",
  revalidateUrl?: string
): Promise<{ success: boolean; column?: CustomColumn; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    // Create a safe key: "İlgili Kişi" -> "ilgili_kisi"
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

    if (error) {
      return { success: false, error: error.message };
    }

    if (revalidateUrl) {
      revalidatePath(revalidateUrl);
    }

    return { success: true, column: data as CustomColumn };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCustomColumn(
  tableId: string,
  columnKey: string,
  revalidateUrl?: string
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

    if (error) {
      return { success: false, error: error.message };
    }

    if (revalidateUrl) {
      revalidatePath(revalidateUrl);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateRowCustomFieldValue(
  tableName: string,
  rowId: string,
  columnKey: string,
  value: any,
  revalidateUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const service: any = await createServiceClient();

    // First fetch current custom_fields
    const { data: row } = await service
      .from(tableName)
      .select("custom_fields")
      .eq("id", rowId)
      .single();

    const existingFields = ((row as any)?.custom_fields as Record<string, any>) || {};
    const updatedFields = {
      ...existingFields,
      [columnKey]: value,
    };

    const { error } = await service
      .from(tableName)
      .update({ custom_fields: updatedFields })
      .eq("id", rowId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (revalidateUrl) {
      revalidatePath(revalidateUrl);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
