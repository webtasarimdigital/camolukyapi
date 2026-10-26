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

export async function getTaxRecords() {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();
    const { data, error } = await service
      .from("tax_records")
      .select("*")
      .eq("company_id", companyId)
      .order("due_date", { ascending: false });

    if (error) {
      console.error("getTaxRecords error:", error);
      return [];
    }
    return (data || []) as any[];
  } catch (err) {
    console.error("getTaxRecords catch:", err);
    return [];
  }
}

export async function saveTaxRecord(formData: {
  id?: string;
  period: string; // '2026-10'
  tax_type: string;
  accrual_date?: string;
  due_date: string;
  amount: number;
  status?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    if (formData.id) {
      const { data, error } = await service
        .from("tax_records")
        .update({
          period: formData.period,
          tax_type: formData.tax_type,
          accrual_date: formData.accrual_date || new Date().toISOString().split("T")[0],
          due_date: formData.due_date,
          amount: Number(formData.amount),
          status: formData.status || "Ödenmedi",
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      revalidatePath("/finans/vergi-ssk");
      return { success: true, data };
    }

    const { data, error } = await service
      .from("tax_records")
      .insert({
        company_id: companyId,
        period: formData.period,
        tax_type: formData.tax_type,
        accrual_date: formData.accrual_date || new Date().toISOString().split("T")[0],
        due_date: formData.due_date,
        amount: Number(formData.amount),
        status: formData.status || "Ödenmedi",
        notes: formData.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/vergi-ssk");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleTaxRecordStatus(
  id: string,
  newStatus: "Ödendi" | "Ödenmedi"
): Promise<{ success: boolean; error?: string }> {
  try {
    const service: any = await createServiceClient();
    const isPaid = newStatus === "Ödendi";

    const { error } = await service
      .from("tax_records")
      .update({
        status: newStatus,
        payment_date: isPaid ? new Date().toISOString().split("T")[0] : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/vergi-ssk");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTaxRecord(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const service: any = await createServiceClient();
    const { error } = await service.from("tax_records").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/vergi-ssk");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
