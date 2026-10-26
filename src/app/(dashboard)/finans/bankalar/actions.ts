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

// ──────────────────── BANKA HESAPLARI & KARTLAR ────────────────────

export async function getBankAccounts() {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();
    const { data, error } = await service
      .from("bank_accounts")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getBankAccounts error:", error);
      return [];
    }
    return (data || []) as any[];
  } catch (err) {
    console.error("getBankAccounts catch:", err);
    return [];
  }
}

export async function saveBankAccount(formData: {
  id?: string;
  bank_name: string;
  account_name: string;
  account_type: "vadesiz" | "kredi_karti" | "esnek_hesap" | "masraf" | "pos";
  branch?: string;
  account_no?: string;
  iban?: string;
  currency?: string;
  balance?: number;
  credit_limit?: number;
  interest_rate?: number;
  cutoff_day?: number;
  due_day?: number;
  min_payment?: number;
  status?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    if (formData.id) {
      const { data, error } = await service
        .from("bank_accounts")
        .update({
          bank_name: formData.bank_name,
          account_name: formData.account_name,
          account_type: formData.account_type,
          branch: formData.branch || null,
          account_no: formData.account_no || null,
          iban: formData.iban || null,
          currency: formData.currency || "TRY",
          balance: Number(formData.balance) || 0,
          credit_limit: Number(formData.credit_limit) || 0,
          interest_rate: Number(formData.interest_rate) || 0,
          cutoff_day: formData.cutoff_day ? Number(formData.cutoff_day) : null,
          due_day: formData.due_day ? Number(formData.due_day) : null,
          min_payment: Number(formData.min_payment) || 0,
          status: formData.status || "Aktif",
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      revalidatePath("/finans/bankalar");
      return { success: true, data };
    }

    const { data, error } = await service
      .from("bank_accounts")
      .insert({
        company_id: companyId,
        bank_name: formData.bank_name,
        account_name: formData.account_name,
        account_type: formData.account_type,
        branch: formData.branch || null,
        account_no: formData.account_no || null,
        iban: formData.iban || null,
        currency: formData.currency || "TRY",
        balance: Number(formData.balance) || 0,
        credit_limit: Number(formData.credit_limit) || 0,
        interest_rate: Number(formData.interest_rate) || 0,
        cutoff_day: formData.cutoff_day ? Number(formData.cutoff_day) : null,
        due_day: formData.due_day ? Number(formData.due_day) : null,
        min_payment: Number(formData.min_payment) || 0,
        status: formData.status || "Aktif",
        notes: formData.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/bankalar");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBankAccount(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const service: any = await createServiceClient();
    const { error } = await service.from("bank_accounts").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/bankalar");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ──────────────────── KREDİLER & TAKSİTLER ────────────────────

export async function getBankLoans() {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();
    const { data, error } = await service
      .from("bank_loans")
      .select("*, installments:bank_loan_installments(*)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getBankLoans error:", error);
      return [];
    }
    return (data || []) as any[];
  } catch (err) {
    console.error("getBankLoans catch:", err);
    return [];
  }
}

export async function saveBankLoan(formData: {
  id?: string;
  bank_name: string;
  branch?: string;
  loan_name: string;
  loan_code?: string;
  principal_amount: number;
  interest_rate?: number;
  monthly_installment: number;
  total_installments: number;
  start_date: string; // '2026-10-15'
  due_day: number;
  notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    if (formData.id) {
      const { data, error } = await service
        .from("bank_loans")
        .update({
          bank_name: formData.bank_name,
          branch: formData.branch || null,
          loan_name: formData.loan_name,
          loan_code: formData.loan_code || null,
          principal_amount: Number(formData.principal_amount),
          interest_rate: Number(formData.interest_rate) || 0,
          monthly_installment: Number(formData.monthly_installment),
          total_installments: Number(formData.total_installments),
          start_date: formData.start_date,
          due_day: Number(formData.due_day),
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      revalidatePath("/finans/bankalar");
      return { success: true, data };
    }

    // Insert new loan
    const { data: loan, error } = await service
      .from("bank_loans")
      .insert({
        company_id: companyId,
        bank_name: formData.bank_name,
        branch: formData.branch || null,
        loan_name: formData.loan_name,
        loan_code: formData.loan_code || null,
        principal_amount: Number(formData.principal_amount),
        interest_rate: Number(formData.interest_rate) || 0,
        monthly_installment: Number(formData.monthly_installment),
        total_installments: Number(formData.total_installments),
        paid_installments: 0,
        start_date: formData.start_date,
        due_day: Number(formData.due_day),
        notes: formData.notes || null,
      })
      .select()
      .single();

    if (error || !loan) {
      return { success: false, error: error?.message || "Kredi kaydedilemedi" };
    }

    // Automatically generate installment plan for all months
    const totalInst = Number(formData.total_installments);
    const monthlyAmt = Number(formData.monthly_installment);
    const startDateObj = new Date(formData.start_date);
    const day = Number(formData.due_day) || startDateObj.getDate();

    const installmentsToInsert = [];
    for (let i = 1; i <= totalInst; i++) {
      const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + (i - 1), day);
      const isoDate = d.toISOString().split("T")[0];

      installmentsToInsert.push({
        company_id: companyId,
        loan_id: (loan as any).id,
        installment_no: i,
        due_date: isoDate,
        amount: monthlyAmt,
        principal_portion: Math.round(Number(formData.principal_amount) / totalInst),
        interest_portion: Math.max(0, monthlyAmt - Math.round(Number(formData.principal_amount) / totalInst)),
        status: "Ödenmedi",
      });
    }

    if (installmentsToInsert.length > 0) {
      await service.from("bank_loan_installments").insert(installmentsToInsert);
    }

    revalidatePath("/finans/bankalar");
    return { success: true, data: loan };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleLoanInstallmentStatus(
  installmentId: string,
  loanId: string,
  newStatus: "Ödendi" | "Ödenmedi"
): Promise<{ success: boolean; paidCount?: number; error?: string }> {
  try {
    const service: any = await createServiceClient();

    const { error } = await service
      .from("bank_loan_installments")
      .update({
        status: newStatus,
        payment_date: newStatus === "Ödendi" ? new Date().toISOString().split("T")[0] : null,
      })
      .eq("id", installmentId);

    if (error) return { success: false, error: error.message };

    // Update paid_installments count on the loan
    const { data: countData } = await service
      .from("bank_loan_installments")
      .select("id")
      .eq("loan_id", loanId)
      .eq("status", "Ödendi");

    const paidCount = countData?.length || 0;
    await service
      .from("bank_loans")
      .update({ paid_installments: paidCount })
      .eq("id", loanId);

    revalidatePath("/finans/bankalar");
    return { success: true, paidCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBankLoan(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const service: any = await createServiceClient();
    const { error } = await service.from("bank_loans").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/bankalar");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
