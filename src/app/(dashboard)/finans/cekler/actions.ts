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

export async function getChecks() {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();
    const { data, error } = await service
      .from("checks")
      .select("*")
      .eq("company_id", companyId)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("getChecks error:", error);
      return [];
    }
    return (data || []) as any[];
  } catch (err) {
    console.error("getChecks catch:", err);
    return [];
  }
}

export async function saveCheck(formData: {
  id?: string;
  type: "verilen" | "alinan";
  check_date?: string;
  due_date: string;
  company_name: string;
  bank_name: string;
  branch_name?: string;
  account_no?: string;
  check_no: string;
  amount: number;
  status?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    if (formData.id) {
      const { data, error } = await service
        .from("checks")
        .update({
          type: formData.type,
          check_date: formData.check_date || new Date().toISOString().split("T")[0],
          due_date: formData.due_date,
          company_name: formData.company_name,
          bank_name: formData.bank_name,
          branch_name: formData.branch_name || null,
          account_no: formData.account_no || null,
          check_no: formData.check_no,
          amount: Number(formData.amount),
          status: formData.status || "Ödenmedi",
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      revalidatePath("/finans/cekler");
      return { success: true, data };
    }

    const { data, error } = await service
      .from("checks")
      .insert({
        company_id: companyId,
        type: formData.type || "verilen",
        check_date: formData.check_date || new Date().toISOString().split("T")[0],
        due_date: formData.due_date,
        company_name: formData.company_name,
        bank_name: formData.bank_name,
        branch_name: formData.branch_name || null,
        account_no: formData.account_no || null,
        check_no: formData.check_no,
        amount: Number(formData.amount),
        status: formData.status || "Ödenmedi",
        notes: formData.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/cekler");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleCheckStatus(
  checkId: string,
  newStatus: "Ödendi" | "Ödenmedi" | "Tahsil Edildi" | "Karşılıksız" | "Portföyde"
): Promise<{ success: boolean; error?: string }> {
  try {
    const service: any = await createServiceClient();
    const isPaid = newStatus === "Ödendi" || newStatus === "Tahsil Edildi";

    const { error } = await service
      .from("checks")
      .update({
        status: newStatus,
        payment_date: isPaid ? new Date().toISOString().split("T")[0] : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/cekler");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCheck(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const service: any = await createServiceClient();
    const { error } = await service.from("checks").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/cekler");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
