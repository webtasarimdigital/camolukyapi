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

    // Taksitleri sayısal olarak sırala
    const sorted = (data || []).map((l: any) => ({
      ...l,
      installments: (l.installments || []).sort(
        (a: any, b: any) => Number(a.installment_no) - Number(b.installment_no)
      ),
    }));

    return sorted;
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

    // Yeni kredi ekleme
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

    // Taksit planını otomatik oluştur
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
        custom_fields: {},
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

// ──────────────────── TAKSİT DÜZENLEME & KALAN TAKSİTLERİ YENİDEN HESAPLAMA ────────────────────

export async function updateLoanInstallment(params: {
  installmentId: string;
  loanId: string;
  amount: number;
  principal_portion?: number;
  interest_portion?: number;
  due_date?: string;
  notes?: string;
  recalculateRemaining?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const service: any = await createServiceClient();

    // 1. İlgili kredinin tüm taksitlerini çek
    const { data: allInst, error: fetchErr } = await service
      .from("bank_loan_installments")
      .select("*")
      .eq("loan_id", params.loanId)
      .order("installment_no", { ascending: true });

    if (fetchErr || !allInst) {
      return { success: false, error: fetchErr?.message || "Taksitler bulunamadı" };
    }

    const currentInst = allInst.find((i: any) => i.id === params.installmentId);
    if (!currentInst) return { success: false, error: "Taksit bulunamadı" };

    const newAmount = Number(params.amount);
    const customFields = currentInst.custom_fields || {};
    const paidAmount = Number(customFields.paid_amount) || 0;
    const remainingAmount = Math.max(0, newAmount - paidAmount);

    let status = currentInst.status;
    if (paidAmount > 0) {
      status = remainingAmount <= 0.01 ? "Ödendi" : "Kısmi Ödendi";
    }

    // Hedef taksiti güncelle
    const { error: updateTargetErr } = await service
      .from("bank_loan_installments")
      .update({
        amount: newAmount,
        principal_portion:
          params.principal_portion !== undefined
            ? Number(params.principal_portion)
            : currentInst.principal_portion,
        interest_portion:
          params.interest_portion !== undefined
            ? Number(params.interest_portion)
            : currentInst.interest_portion,
        due_date: params.due_date || currentInst.due_date,
        notes: params.notes !== undefined ? params.notes : currentInst.notes,
        status: status,
        custom_fields: {
          ...customFields,
          remaining_amount: remainingAmount,
        },
      })
      .eq("id", params.installmentId);

    if (updateTargetErr) return { success: false, error: updateTargetErr.message };

    // 2. KULLANICI İSTEDİĞİNDE KALAN TAKSİTLERİ YENİDEN HESAPLA
    // "örneğin ilk 2 taksitin ödeme tutarını değiştirdiğimde kalan taksitler de ona göre tekrar hesaplanmalı"
    if (params.recalculateRemaining) {
      // Toplam kredi planı tutarını bul (eski toplam)
      const totalLoanExpected = allInst.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);

      // Hedef taksitten sonraki ve henüz Ödenmedi olan taksitler
      const targetNo = Number(currentInst.installment_no);
      const remainingInstallments = allInst.filter(
        (i: any) => Number(i.installment_no) > targetNo && i.status !== "Ödendi"
      );

      if (remainingInstallments.length > 0) {
        // Hedefe kadar olan veya ödenmiş taksitlerin toplamı (güncel hedef taksit tutarı dahil)
        const fixedSum = allInst
          .filter((i: any) => Number(i.installment_no) <= targetNo || i.status === "Ödendi")
          .reduce((sum: number, i: any) => {
            if (i.id === params.installmentId) return sum + newAmount;
            return sum + Number(i.amount || 0);
          }, 0);

        const remainingTotalToDistribute = Math.max(0, totalLoanExpected - fixedSum);
        const count = remainingInstallments.length;
        const newPerInstallmentAmount = Math.round((remainingTotalToDistribute / count) * 100) / 100;

        // Kalan taksitleri güncelle
        for (const remInst of remainingInstallments) {
          const remPaid = Number(remInst.custom_fields?.paid_amount) || 0;
          const remRem = Math.max(0, newPerInstallmentAmount - remPaid);
          const remStatus = remPaid > 0 ? (remRem <= 0.01 ? "Ödendi" : "Kısmi Ödendi") : "Ödenmedi";

          // Anapara & faiz oranını orantılı ayarla
          const ratio = remInst.amount > 0 ? newPerInstallmentAmount / remInst.amount : 1;
          const newPrincipal = Math.round((Number(remInst.principal_portion || 0) * ratio) * 100) / 100;
          const newInterest = Math.max(0, newPerInstallmentAmount - newPrincipal);

          await service
            .from("bank_loan_installments")
            .update({
              amount: newPerInstallmentAmount,
              principal_portion: newPrincipal,
              interest_portion: newInterest,
              status: remStatus,
              custom_fields: {
                ...(remInst.custom_fields || {}),
                remaining_amount: remRem,
              },
            })
            .eq("id", remInst.id);
        }

        // Kredinin aylık taksit ortalamasını güncelle
        await service
          .from("bank_loans")
          .update({
            monthly_installment: newPerInstallmentAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.loanId);
      }
    }

    revalidatePath("/finans/bankalar");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ──────────────────── PARÇALI ÖDEME & ÖDEME TARİHÇESİ ────────────────────

export async function makePartialPayment(params: {
  targetType: "installment" | "credit_card" | "account";
  targetId: string;
  loanId?: string;
  amount: number;
  paymentDate: string;
  paymentSource?: string;
  notes?: string;
  userName?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();
    const payAmount = Number(params.amount);

    if (payAmount <= 0) {
      return { success: false, error: "Ödeme tutarı 0'dan büyük olmalıdır" };
    }

    const paymentId = "pay_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    const newPaymentEntry = {
      id: paymentId,
      amount: payAmount,
      payment_date: params.paymentDate,
      payment_source: params.paymentSource || "Banka / Kasa",
      notes: params.notes || "",
      user_name: params.userName || "Kullanıcı",
      created_at: new Date().toISOString(),
    };

    // 1. KREDİ TAKSİTİNE PARÇALI ÖDEME
    if (params.targetType === "installment") {
      const { data: inst, error: instErr } = await service
        .from("bank_loan_installments")
        .select("*, loan:bank_loans(bank_name, loan_name)")
        .eq("id", params.targetId)
        .single();

      if (instErr || !inst) return { success: false, error: "Taksit bulunamadı" };

      const customFields = inst.custom_fields || {};
      const currentPayments = Array.isArray(customFields.payments) ? customFields.payments : [];
      const updatedPayments = [...currentPayments, newPaymentEntry];

      const totalPaid = updatedPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const remaining = Math.max(0, Number(inst.amount) - totalPaid);
      const isFullPaid = remaining <= 0.01;
      const nextStatus = isFullPaid ? "Ödendi" : "Kısmi Ödendi";

      const { error: updateErr } = await service
        .from("bank_loan_installments")
        .update({
          status: nextStatus,
          payment_date: params.paymentDate,
          custom_fields: {
            ...customFields,
            payments: updatedPayments,
            paid_amount: totalPaid,
            remaining_amount: remaining,
          },
        })
        .eq("id", params.targetId);

      if (updateErr) throw updateErr;

      // Kredinin ödenen taksit sayısını güncelle
      const loanId = params.loanId || inst.loan_id;
      if (loanId) {
        const { data: countData } = await service
          .from("bank_loan_installments")
          .select("id")
          .eq("loan_id", loanId)
          .eq("status", "Ödendi");

        await service
          .from("bank_loans")
          .update({ paid_installments: countData?.length || 0 })
          .eq("id", loanId);
      }

      // Genel tarihçeye de yaz (camlica_firca_rows üzerinden)
      await service.from("camlica_firca_rows").insert({
        company_id: companyId,
        row_data: {
          _module: "bank_payment_history",
          payment_id: paymentId,
          target_type: "installment",
          target_id: params.targetId,
          loan_id: loanId,
          title: `${inst.loan?.bank_name || "Kredi"} #${inst.installment_no}. Taksit`,
          amount: payAmount,
          payment_date: params.paymentDate,
          payment_source: params.paymentSource || "",
          notes: params.notes || "",
          user_name: params.userName || "",
          remaining_amount: remaining,
        },
        sort_order: 0,
      });

      revalidatePath("/finans/bankalar");
      return { success: true, data: { paid_amount: totalPaid, remaining, status: nextStatus } };
    }

    // 2. KREDİ KARTINA PARÇALI BORÇ ÖDEME
    if (params.targetType === "credit_card") {
      const { data: acc, error: accErr } = await service
        .from("bank_accounts")
        .select("*")
        .eq("id", params.targetId)
        .single();

      if (accErr || !acc) return { success: false, error: "Kredi kartı bulunamadı" };

      const currentBalance = Number(acc.balance) || 0;
      const newBalance = Math.max(0, currentBalance - payAmount);
      const customFields = acc.custom_fields || {};
      const currentPayments = Array.isArray(customFields.payments) ? customFields.payments : [];
      const updatedPayments = [
        ...currentPayments,
        { ...newPaymentEntry, prev_balance: currentBalance, new_balance: newBalance },
      ];

      const { error: updateErr } = await service
        .from("bank_accounts")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
          custom_fields: {
            ...customFields,
            payments: updatedPayments,
          },
        })
        .eq("id", params.targetId);

      if (updateErr) throw updateErr;

      // Genel tarihçeye ekle
      await service.from("camlica_firca_rows").insert({
        company_id: companyId,
        row_data: {
          _module: "bank_payment_history",
          payment_id: paymentId,
          target_type: "credit_card",
          target_id: params.targetId,
          title: `${acc.bank_name} (${acc.account_name}) Kart Borcu Ödemesi`,
          amount: payAmount,
          payment_date: params.paymentDate,
          payment_source: params.paymentSource || "",
          notes: params.notes || "",
          user_name: params.userName || "",
          prev_balance: currentBalance,
          new_balance: newBalance,
        },
        sort_order: 0,
      });

      revalidatePath("/finans/bankalar");
      return { success: true, data: { new_balance: newBalance } };
    }

    // 3. VADESİZ / KMH / MASRAF HESABINA ÖDEME VEYA PARA GİRİŞİ
    if (params.targetType === "account") {
      const { data: acc, error: accErr } = await service
        .from("bank_accounts")
        .select("*")
        .eq("id", params.targetId)
        .single();

      if (accErr || !acc) return { success: false, error: "Banka hesabı bulunamadı" };

      const currentBalance = Number(acc.balance) || 0;
      const newBalance = currentBalance + payAmount;
      const customFields = acc.custom_fields || {};
      const currentPayments = Array.isArray(customFields.payments) ? customFields.payments : [];
      const updatedPayments = [
        ...currentPayments,
        { ...newPaymentEntry, prev_balance: currentBalance, new_balance: newBalance },
      ];

      const { error: updateErr } = await service
        .from("bank_accounts")
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
          custom_fields: {
            ...customFields,
            payments: updatedPayments,
          },
        })
        .eq("id", params.targetId);

      if (updateErr) throw updateErr;

      // Genel tarihçeye ekle
      await service.from("camlica_firca_rows").insert({
        company_id: companyId,
        row_data: {
          _module: "bank_payment_history",
          payment_id: paymentId,
          target_type: "account",
          target_id: params.targetId,
          title: `${acc.bank_name} (${acc.account_name}) Para Girişi / Ödeme`,
          amount: payAmount,
          payment_date: params.paymentDate,
          payment_source: params.paymentSource || "",
          notes: params.notes || "",
          user_name: params.userName || "",
          prev_balance: currentBalance,
          new_balance: newBalance,
        },
        sort_order: 0,
      });

      revalidatePath("/finans/bankalar");
      return { success: true, data: { new_balance: newBalance } };
    }

    return { success: false, error: "Geçersiz hedef türü" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ──────────────────── ÖDEMEYİ GERİ AL / SİL ────────────────────

export async function deletePaymentRecord(params: {
  paymentId: string;
  targetType: "installment" | "credit_card" | "account";
  targetId: string;
  loanId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const service: any = await createServiceClient();

    if (params.targetType === "installment") {
      const { data: inst } = await service
        .from("bank_loan_installments")
        .select("*")
        .eq("id", params.targetId)
        .single();

      if (inst) {
        const customFields = inst.custom_fields || {};
        const currentPayments = Array.isArray(customFields.payments) ? customFields.payments : [];
        const filtered = currentPayments.filter((p: any) => p.id !== params.paymentId);
        const totalPaid = filtered.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        const remaining = Math.max(0, Number(inst.amount) - totalPaid);

        let status = "Ödenmedi";
        if (totalPaid > 0) {
          status = remaining <= 0.01 ? "Ödendi" : "Kısmi Ödendi";
        }

        await service
          .from("bank_loan_installments")
          .update({
            status,
            custom_fields: {
              ...customFields,
              payments: filtered,
              paid_amount: totalPaid,
              remaining_amount: remaining,
            },
          })
          .eq("id", params.targetId);

        const loanId = params.loanId || inst.loan_id;
        if (loanId) {
          const { data: countData } = await service
            .from("bank_loan_installments")
            .select("id")
            .eq("loan_id", loanId)
            .eq("status", "Ödendi");

          await service
            .from("bank_loans")
            .update({ paid_installments: countData?.length || 0 })
            .eq("id", loanId);
        }
      }
    } else if (params.targetType === "credit_card" || params.targetType === "account") {
      const { data: acc } = await service
        .from("bank_accounts")
        .select("*")
        .eq("id", params.targetId)
        .single();

      if (acc) {
        const customFields = acc.custom_fields || {};
        const currentPayments = Array.isArray(customFields.payments) ? customFields.payments : [];
        const targetPayment = currentPayments.find((p: any) => p.id === params.paymentId);
        const filtered = currentPayments.filter((p: any) => p.id !== params.paymentId);

        let restoredBalance = Number(acc.balance) || 0;
        if (targetPayment) {
          if (params.targetType === "credit_card") {
            restoredBalance += Number(targetPayment.amount); // borcu geri ekle
          } else {
            restoredBalance -= Number(targetPayment.amount); // parayı geri düş
          }
        }

        await service
          .from("bank_accounts")
          .update({
            balance: restoredBalance,
            custom_fields: {
              ...customFields,
              payments: filtered,
            },
          })
          .eq("id", params.targetId);
      }
    }

    // Genel tarihçeden de sil
    await service
      .from("camlica_firca_rows")
      .delete()
      .eq("row_data->>payment_id", params.paymentId);

    revalidatePath("/finans/bankalar");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ──────────────────── TÜM ÖDEME TARİHÇESİNİ GETİR ────────────────────

export async function getBankPaymentHistory(): Promise<any[]> {
  try {
    const companyId = await getCompanyId();
    const service: any = await createServiceClient();

    const { data, error } = await service
      .from("camlica_firca_rows")
      .select("*")
      .eq("company_id", companyId)
      .eq("row_data->>_module", "bank_payment_history")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getBankPaymentHistory error:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      ...r.row_data,
      created_at: r.created_at,
    }));
  } catch (err) {
    console.error("getBankPaymentHistory catch:", err);
    return [];
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
