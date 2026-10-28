"use client";

import { useState, useTransition, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Landmark,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  FileText,
  DollarSign,
  TrendingDown,
  Info,
  Edit3,
  History,
  RotateCcw,
  Receipt,
  X,
  Check,
  Building2,
  Calculator,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";
import {
  CustomColumnButton,
  CustomColumnCell,
} from "@/components/ui/CustomColumnManager";
import { CustomColumn } from "@/lib/data/custom-columns-actions";
import { MonthFilter } from "@/components/ui/MonthFilter";
import {
  saveBankAccount,
  deleteBankAccount,
  saveBankLoan,
  deleteBankLoan,
  toggleLoanInstallmentStatus,
  updateLoanInstallment,
  makePartialPayment,
  deletePaymentRecord,
  getBankPaymentHistory,
} from "./actions";

interface BankalarClientProps {
  initialAccounts: any[];
  initialLoans: any[];
  accountCustomColumns: CustomColumn[];
  loanCustomColumns: CustomColumn[];
  installmentCustomColumns: CustomColumn[];
  initialPaymentHistory?: any[];
  userName?: string;
}

export function BankalarClient({
  initialAccounts,
  initialLoans,
  accountCustomColumns,
  loanCustomColumns,
  installmentCustomColumns,
  initialPaymentHistory = [],
  userName = "Yönetici",
}: BankalarClientProps) {
  const [activeTab, setActiveTab] = useState<"krediler" | "kartlar" | "hesaplar" | "tarihce">("krediler");
  const [accounts, setAccounts] = useState(initialAccounts);
  const [loans, setLoans] = useState(initialLoans);
  const [paymentHistory, setPaymentHistory] = useState<any[]>(initialPaymentHistory);

  const currentYM = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYM);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(
    initialLoans[0]?.id || null
  );

  const [isPending, startTransition] = useTransition();

  // Custom columns state
  const [accountCols, setAccountCols] = useState(accountCustomColumns);
  const [loanCols, setLoanCols] = useState(loanCustomColumns);
  const [instCols, setInstCols] = useState(installmentCustomColumns);

  // ──────────────────── MODAL STATES ────────────────────
  // 1. Hesap / Kart Modal (Ekle & Düzenle)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountFormData, setAccountFormData] = useState<any>({
    bank_name: "",
    account_name: "",
    account_type: "vadesiz",
    branch: "",
    account_no: "",
    iban: "",
    balance: 0,
    credit_limit: 0,
    interest_rate: 0,
    cutoff_day: 1,
    due_day: 15,
    min_payment: 0,
    notes: "",
  });

  // 2. Kredi Modal (Ekle & Düzenle)
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [loanFormData, setLoanFormData] = useState<any>({
    bank_name: "",
    branch: "",
    loan_name: "",
    loan_code: "",
    principal_amount: 0,
    interest_rate: 0,
    monthly_installment: 0,
    total_installments: 12,
    start_date: new Date().toISOString().split("T")[0],
    due_day: 15,
    notes: "",
  });

  // 3. Taksit Düzenleme & Otomatik Yeniden Hesaplama Modalı
  const [isEditInstallmentModalOpen, setIsEditInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<any>(null);
  const [installmentFormData, setInstallmentFormData] = useState({
    amount: 0,
    principal_portion: 0,
    interest_portion: 0,
    due_date: "",
    notes: "",
    recalculateRemaining: true,
  });

  // 4. Parçalı Ödeme Modalı
  const [isPartialPayModalOpen, setIsPartialPayModalOpen] = useState(false);
  const [partialPayTarget, setPartialPayTarget] = useState<{
    targetType: "installment" | "credit_card" | "account";
    targetId: string;
    loanId?: string;
    title: string;
    totalAmount: number;
    paidSoFar: number;
    remainingAmount: number;
  } | null>(null);
  const [partialPayForm, setPartialPayForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentSource: "Şirket Vadesiz Hesabı",
    notes: "",
  });

  // 5. Tekil Kalem Ödeme Tarihçesi Modalı
  const [isItemHistoryModalOpen, setIsItemHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{
    targetType: "installment" | "credit_card" | "account";
    targetId: string;
    loanId?: string;
    title: string;
    payments: any[];
  } | null>(null);

  // Tarih sabitleri
  const todayStr = new Date().toISOString().split("T")[0];
  const next7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  // Sıralanmış krediler (Taksitler doğal sayısal sırayla: 1, 2, 3... 18)
  const sortedLoans = useMemo(() => {
    return loans.map((l: any) => ({
      ...l,
      installments: [...(l.installments || [])].sort(
        (a: any, b: any) => Number(a.installment_no) - Number(b.installment_no)
      ),
    }));
  }, [loans]);

  const allInstallments = useMemo(() => {
    return sortedLoans.flatMap((l) =>
      (l.installments || []).map((inst: any) => ({
        ...inst,
        bank_name: l.bank_name,
        loan_name: l.loan_name,
        loan_id: l.id,
      }))
    );
  }, [sortedLoans]);

  const dueToday = allInstallments.filter(
    (i) => i.due_date === todayStr && i.status !== "Ödendi"
  );
  const dueUpcoming = allInstallments.filter(
    (i) =>
      i.due_date > todayStr &&
      i.due_date <= next7DaysStr &&
      i.status !== "Ödendi"
  );
  const dueOverdue = allInstallments.filter(
    (i) => i.due_date < todayStr && i.status !== "Ödendi"
  );

  // Alt listeler
  const creditCards = useMemo(() => accounts.filter((a) => a.account_type === "kredi_karti"), [accounts]);
  const regularAccounts = useMemo(() => accounts.filter((a) => a.account_type !== "kredi_karti"), [accounts]);

  // KPI Hesaplamaları
  const totalLoanDebt = useMemo(() => {
    return sortedLoans.reduce(
      (sum, l) =>
        sum +
        (l.installments || [])
          .filter((i: any) => i.status !== "Ödendi")
          .reduce((s: number, i: any) => {
            const rem = i.custom_fields?.remaining_amount !== undefined
              ? Number(i.custom_fields.remaining_amount)
              : Number(i.amount || 0);
            return s + rem;
          }, 0),
      0
    );
  }, [sortedLoans]);

  const totalCardDebt = useMemo(() => {
    return creditCards.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
  }, [creditCards]);

  const totalBankBalance = useMemo(() => {
    return regularAccounts
      .filter((a) => a.account_type === "vadesiz")
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [regularAccounts]);

  // Ay bazında taksit toplamları
  const monthInstallments = useMemo(() => {
    return allInstallments.filter((i) =>
      selectedMonth === "all" ? true : (i.due_date || "").startsWith(selectedMonth)
    );
  }, [allInstallments, selectedMonth]);

  const monthInstallmentsTotal = useMemo(() => {
    return monthInstallments.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [monthInstallments]);

  const monthInstallmentsPaid = useMemo(() => {
    return monthInstallments
      .filter((i) => i.status === "Ödendi")
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [monthInstallments]);

  const monthInstallmentsPending = monthInstallmentsTotal - monthInstallmentsPaid;

  // ──────────────────── HESAP & KART İŞLEMLERİ ────────────────────
  function openNewAccountModal(type: "vadesiz" | "kredi_karti" | "esnek_hesap" = "vadesiz") {
    setEditingAccountId(null);
    setAccountFormData({
      bank_name: "",
      account_name: "",
      account_type: type,
      branch: "",
      account_no: "",
      iban: "",
      balance: 0,
      credit_limit: 0,
      interest_rate: 0,
      cutoff_day: 1,
      due_day: 15,
      min_payment: 0,
      notes: "",
    });
    setIsAccountModalOpen(true);
  }

  function openEditAccountModal(acc: any) {
    setEditingAccountId(acc.id);
    setAccountFormData({
      id: acc.id,
      bank_name: acc.bank_name || "",
      account_name: acc.account_name || "",
      account_type: acc.account_type || "vadesiz",
      branch: acc.branch || "",
      account_no: acc.account_no || "",
      iban: acc.iban || "",
      balance: Number(acc.balance) || 0,
      credit_limit: Number(acc.credit_limit) || 0,
      interest_rate: Number(acc.interest_rate) || 0,
      cutoff_day: acc.cutoff_day || 1,
      due_day: acc.due_day || 15,
      min_payment: Number(acc.min_payment) || 0,
      notes: acc.notes || "",
    });
    setIsAccountModalOpen(true);
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveBankAccount({
        ...accountFormData,
        id: editingAccountId || undefined,
      });
      if (res.success && res.data) {
        if (editingAccountId) {
          setAccounts((prev) =>
            prev.map((a) => (a.id === editingAccountId ? { ...a, ...res.data } : a))
          );
        } else {
          setAccounts((prev) => [res.data, ...prev]);
        }
        setIsAccountModalOpen(false);
      } else {
        alert(res.error || "Hesap kaydedilemedi");
      }
    });
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("Bu hesabı/kartı silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteBankAccount(id);
      if (res.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert("Silinemedi: " + res.error);
      }
    });
  }

  // ──────────────────── KREDİ İŞLEMLERİ ────────────────────
  function openNewLoanModal() {
    setEditingLoanId(null);
    setLoanFormData({
      bank_name: "",
      branch: "",
      loan_name: "",
      loan_code: "",
      principal_amount: 0,
      interest_rate: 0,
      monthly_installment: 0,
      total_installments: 12,
      start_date: new Date().toISOString().split("T")[0],
      due_day: 15,
      notes: "",
    });
    setIsLoanModalOpen(true);
  }

  function openEditLoanModal(loan: any) {
    setEditingLoanId(loan.id);
    setLoanFormData({
      id: loan.id,
      bank_name: loan.bank_name || "",
      branch: loan.branch || "",
      loan_name: loan.loan_name || "",
      loan_code: loan.loan_code || "",
      principal_amount: Number(loan.principal_amount) || 0,
      interest_rate: Number(loan.interest_rate) || 0,
      monthly_installment: Number(loan.monthly_installment) || 0,
      total_installments: Number(loan.total_installments) || 12,
      start_date: loan.start_date || new Date().toISOString().split("T")[0],
      due_day: Number(loan.due_day) || 15,
      notes: loan.notes || "",
    });
    setIsLoanModalOpen(true);
  }

  async function handleSaveLoan(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveBankLoan({
        ...loanFormData,
        id: editingLoanId || undefined,
      });
      if (res.success && res.data) {
        window.location.reload();
      } else {
        alert(res.error || "Kredi kaydedilemedi");
      }
    });
  }

  async function handleDeleteLoan(id: string) {
    if (!confirm("Bu krediyi ve tüm taksit planını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteBankLoan(id);
      if (res.success) {
        setLoans((prev) => prev.filter((l) => l.id !== id));
      } else {
        alert("Silinemedi: " + res.error);
      }
    });
  }

  // ──────────────────── TAKSİT DÜZENLEME & YENİDEN HESAPLAMA ────────────────────
  function openEditInstallmentModal(inst: any, loan: any) {
    setEditingInstallment({ ...inst, loan });
    setInstallmentFormData({
      amount: Number(inst.amount) || 0,
      principal_portion: Number(inst.principal_portion) || 0,
      interest_portion: Number(inst.interest_portion) || 0,
      due_date: inst.due_date || "",
      notes: inst.notes || "",
      recalculateRemaining: true,
    });
    setIsEditInstallmentModalOpen(true);
  }

  async function handleSaveInstallment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingInstallment) return;

    startTransition(async () => {
      const res = await updateLoanInstallment({
        installmentId: editingInstallment.id,
        loanId: editingInstallment.loan_id || editingInstallment.loan?.id,
        amount: installmentFormData.amount,
        principal_portion: installmentFormData.principal_portion,
        interest_portion: installmentFormData.interest_portion,
        due_date: installmentFormData.due_date,
        notes: installmentFormData.notes,
        recalculateRemaining: installmentFormData.recalculateRemaining,
      });

      if (res.success) {
        setIsEditInstallmentModalOpen(false);
        window.location.reload();
      } else {
        alert("Taksit güncellenemedi: " + res.error);
      }
    });
  }

  // ──────────────────── PARÇALI ÖDEME MODAL AÇ & KAYDET ────────────────────
  function openPartialPayModal(target: {
    targetType: "installment" | "credit_card" | "account";
    targetId: string;
    loanId?: string;
    title: string;
    totalAmount: number;
    paidSoFar: number;
    remainingAmount: number;
  }) {
    setPartialPayTarget(target);
    setPartialPayForm({
      amount: target.remainingAmount,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentSource: "Şirket Vadesiz Hesabı",
      notes: "",
    });
    setIsPartialPayModalOpen(true);
  }

  async function handleSavePartialPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!partialPayTarget) return;

    if (partialPayForm.amount <= 0) {
      alert("Ödeme tutarı 0'dan büyük olmalıdır.");
      return;
    }

    startTransition(async () => {
      const res = await makePartialPayment({
        targetType: partialPayTarget.targetType,
        targetId: partialPayTarget.targetId,
        loanId: partialPayTarget.loanId,
        amount: partialPayForm.amount,
        paymentDate: partialPayForm.paymentDate,
        paymentSource: partialPayForm.paymentSource,
        notes: partialPayForm.notes,
        userName: userName,
      });

      if (res.success) {
        setIsPartialPayModalOpen(false);
        window.location.reload();
      } else {
        alert("Ödeme kaydedilemedi: " + res.error);
      }
    });
  }

  // ──────────────────── TEKİL KALEM TARİHÇESİ AÇ & SİL ────────────────────
  function openItemHistoryModal(target: {
    targetType: "installment" | "credit_card" | "account";
    targetId: string;
    loanId?: string;
    title: string;
    payments: any[];
  }) {
    setHistoryTarget(target);
    setIsItemHistoryModalOpen(true);
  }

  async function handleDeletePayment(paymentId: string) {
    if (!historyTarget) return;
    if (!confirm("Bu ödemeyi silip iptal etmek istediğinize emin misiniz? Tutar ve durum eski haline geri dönecektir.")) return;

    startTransition(async () => {
      const res = await deletePaymentRecord({
        paymentId,
        targetType: historyTarget.targetType,
        targetId: historyTarget.targetId,
        loanId: historyTarget.loanId,
      });

      if (res.success) {
        setIsItemHistoryModalOpen(false);
        window.location.reload();
      } else {
        alert("Ödeme silinemedi: " + res.error);
      }
    });
  }

  async function handleToggleInstallment(installmentId: string, loanId: string, currentStatus: string) {
    const nextStatus = currentStatus === "Ödendi" ? "Ödenmedi" : "Ödendi";
    startTransition(async () => {
      const res = await toggleLoanInstallmentStatus(installmentId, loanId, nextStatus as any);
      if (res.success) {
        setLoans((prev) =>
          prev.map((l) => {
            if (l.id !== loanId) return l;
            const updatedInst = (l.installments || []).map((inst: any) => {
              if (inst.id !== installmentId) return inst;
              return {
                ...inst,
                status: nextStatus,
                payment_date: nextStatus === "Ödendi" ? todayStr : null,
              };
            });
            return {
              ...l,
              paid_installments: res.paidCount,
              installments: updatedInst,
            };
          })
        );
      }
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 🚨 GÜNLÜK & YAKLAŞAN KREDİ TAKSİT HATIRLATICISI */}
      {(dueToday.length > 0 || dueUpcoming.length > 0 || dueOverdue.length > 0) && (
        <div className="space-y-2">
          {dueToday.map((item: any) => (
            <div
              key={item.id}
              className="bg-amber-500 text-brand-navy p-4 rounded-2xl shadow-sm border border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 bg-amber-600/20 rounded-xl">
                  <AlertTriangle size={24} className="text-amber-950 animate-bounce" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs uppercase px-2 py-0.5 bg-amber-600 text-white rounded-md tracking-wider">
                      BUGÜN ÖDEME GÜNÜ
                    </span>
                    <h3 className="font-black text-sm text-slate-950">
                      {item.bank_name} — {item.loan_name} (Taksit #{item.installment_no})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-900 mt-0.5">
                    Bugün vadesi gelen <strong>{item.installment_no}. taksit</strong> ödemesini yapmayı unutmayınız. Tutar:{" "}
                    <span className="font-black text-sm underline">{formatCurrency(item.amount)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openPartialPayModal({
                      targetType: "installment",
                      targetId: item.id,
                      loanId: item.loan_id,
                      title: `${item.bank_name} #${item.installment_no}. Taksit`,
                      totalAmount: Number(item.amount),
                      paidSoFar: Number(item.custom_fields?.paid_amount) || 0,
                      remainingAmount:
                        item.custom_fields?.remaining_amount !== undefined
                          ? Number(item.custom_fields.remaining_amount)
                          : Number(item.amount),
                    })
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
                >
                  <DollarSign size={14} />
                  <span>Parçalı Öde</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleInstallment(item.id, item.loan_id, item.status)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs whitespace-nowrap"
                >
                  <CheckCircle2 size={16} />
                  <span>Tam Ödendi Yap</span>
                </button>
              </div>
            </div>
          ))}

          {dueOverdue.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium">
                <XCircle size={16} className="text-rose-600 shrink-0" />
                <span>
                  <strong>{dueOverdue.length} Adet Gecikmiş Kredi Taksiti:</strong>{" "}
                  {dueOverdue.map((o: any) => `${o.bank_name} (${formatCurrency(o.amount)})`).join(", ")}
                </span>
              </div>
            </div>
          )}

          {dueUpcoming.length > 0 && dueToday.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl flex items-center gap-2 text-xs">
              <Clock size={16} className="text-blue-600 shrink-0" />
              <span>
                <strong>Yaklaşan Taksit (7 Gün İçinde):</strong> {dueUpcoming[0].bank_name} - {dueUpcoming[0].installment_no}. taksit ({formatDate(dueUpcoming[0].due_date)}) — {formatCurrency(dueUpcoming[0].amount)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Başlık ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Landmark className="text-brand-gold" />
            Bankalar & Krediler
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Banka hesapları, faiz oranları, kredi kartları, esnek hesap (KMH), taksitli kredi takibi, parçalı ödemeler ve tarihçe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MonthFilter
            selectedMonth={selectedMonth}
            onChange={setSelectedMonth}
          />

          {activeTab === "krediler" && (
            <button
              type="button"
              onClick={openNewLoanModal}
              className="inline-flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Plus size={16} />
              <span>Yeni Kredi Ekle</span>
            </button>
          )}

          {activeTab === "kartlar" && (
            <button
              type="button"
              onClick={() => openNewAccountModal("kredi_karti")}
              className="inline-flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Plus size={16} />
              <span>Kredi Kartı Ekle</span>
            </button>
          )}

          {activeTab === "hesaplar" && (
            <button
              type="button"
              onClick={() => openNewAccountModal("vadesiz")}
              className="inline-flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Plus size={16} />
              <span>Banka Hesabı Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Coins size={14} className="text-emerald-600" />
            Toplam Vadesiz Banka Bakiyesi
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalBankBalance)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {regularAccounts.filter((a) => a.account_type === "vadesiz").length} Aktif Vadesiz Hesap
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <CreditCard size={14} className="text-rose-600" />
            Toplam Kredi Kartı Borcu
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(totalCardDebt)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {creditCards.length} Tanımlı Şirket Kartı
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Landmark size={14} className="text-amber-600" />
            Kalan Kredi Borcu
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {formatCurrency(totalLoanDebt)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {loans.length} Aktif Taksitli Kredi
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Calendar size={14} className="text-blue-600" />
            {selectedMonth === "all" ? "Tüm Taksitler" : "Bu Ay Vadesi Gelen Taksitler"}
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {formatCurrency(monthInstallmentsPending)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {monthInstallments.filter((i) => i.status !== "Ödendi").length} Bekleyen / {monthInstallments.length} Toplam
          </span>
        </div>
      </div>

      {/* ──────────────────── 4 ANA SEKME ──────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("krediler")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "krediler"
              ? "bg-brand-navy text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Landmark size={14} />
          <span>Taksitli Krediler & Aylık Plan ({loans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("kartlar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "kartlar"
              ? "bg-brand-navy text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CreditCard size={14} />
          <span>Kredi Kartları ({creditCards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hesaplar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "hesaplar"
              ? "bg-brand-navy text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Coins size={14} />
          <span>Cari Hesaplar, KMH & Masraflar ({regularAccounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tarihce")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "tarihce"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <History size={14} />
          <span>📜 Tüm Ödeme Tarihçesi ({paymentHistory.length})</span>
        </button>
      </div>

      {/* ──────────────────── TAB 1: TAKSİTLİ KREDİLER ──────────────────── */}
      {activeTab === "krediler" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Aktif Krediler Listesi</h2>
            <CustomColumnButton
              tableId="bank_loans"
              revalidateUrl="/finans/bankalar"
              existingColumns={loanCols}
              onColumnAdded={(col) => setLoanCols((prev) => [...prev, col])}
              onColumnDeleted={(key) => setLoanCols((prev) => prev.filter((c) => c.column_key !== key))}
            />
          </div>

          {sortedLoans.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-border text-slate-400">
              <Landmark size={40} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">Henüz kayıtlı kredi bulunmuyor</p>
              <p className="text-xs text-slate-400 mt-1">
                Sağ üstteki "+ Yeni Kredi Ekle" butonuna basarak kredinizi ve otomatik taksit planını oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedLoans.map((loan: any) => {
                const isExpanded = expandedLoanId === loan.id;
                const installments = loan.installments || [];
                const paidCount = installments.filter((i: any) => i.status === "Ödendi").length;
                const totalCount = installments.length || loan.total_installments;
                const progressPct = Math.round((paidCount / (totalCount || 1)) * 100);

                return (
                  <div
                    key={loan.id}
                    className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden transition"
                  >
                    {/* Kredi Ana Kartı */}
                    <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center font-bold text-brand-navy">
                          <Landmark size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900">{loan.bank_name}</h3>
                            <span className="text-xs text-slate-500 font-medium">({loan.branch || "Merkez Şube"})</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {loan.loan_name}
                            </span>
                            {loan.interest_rate > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                Faiz: %{loan.interest_rate}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Sözleşme No: {loan.loan_code || "—"} • Başlangıç: {formatDate(loan.start_date)} • Ödeme Günü: Her ayın {loan.due_day}. günü
                          </p>
                        </div>
                      </div>

                      {/* Taksit Durum & İlerleme Çubuğu */}
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-medium">Aylık Taksit</span>
                          <span className="text-sm font-black text-slate-900">
                            {formatCurrency(loan.monthly_installment)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-medium">Toplam Anapara</span>
                          <span className="text-sm font-bold text-slate-700">
                            {formatCurrency(loan.principal_amount)}
                          </span>
                        </div>

                        <div className="min-w-[140px]">
                          <div className="flex items-center justify-between text-xs mb-1 font-semibold text-slate-700">
                            <span>Taksit: {paidCount} / {totalCount}</span>
                            <span>%{progressPct}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditLoanModal(loan)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                            title="Krediyi ve Faiz Oranını Düzenle"
                          >
                            <Edit3 size={13} />
                            <span>Düzenle</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
                          >
                            <span>Aylık Plan</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Krediyi Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* AYLIK ÖDEME PLANI TABLOSU (Sayısal Sıralı #1, #2, #3 ... #18) */}
                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar size={14} className="text-brand-gold" />
                              {loan.bank_name} — Aylık Taksit Ödeme Planı ({installments.length} Taksit)
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Taksit tutarını değiştirdiğinizde kalan taksitler otomatik dengelenir. Kısmi ödeme yapabilirsiniz.
                            </p>
                          </div>

                          <CustomColumnButton
                            tableId="bank_loan_installments"
                            revalidateUrl="/finans/bankalar"
                            existingColumns={instCols}
                            onColumnAdded={(col) => setInstCols((prev) => [...prev, col])}
                            onColumnDeleted={(key) => setInstCols((prev) => prev.filter((c) => c.column_key !== key))}
                          />
                        </div>

                        <InteractiveTable tableId={`loan-installments-${loan.id}`}>
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                              <tr>
                                <th className="py-2.5 px-3 text-center">Taksit #</th>
                                <th className="py-2.5 px-3">Vade Tarihi</th>
                                <th className="py-2.5 px-3 text-right">Taksit Tutarı</th>
                                <th className="py-2.5 px-3 text-right">Ödenen / Kalan</th>
                                <th className="py-2.5 px-3 text-right">Anapara</th>
                                <th className="py-2.5 px-3 text-right">Faiz</th>
                                <th className="py-2.5 px-3 text-center">Durum</th>
                                <th className="py-2.5 px-3">Ödeme Tarihi</th>
                                <th className="py-2.5 px-3 text-center">İşlemler</th>
                                {/* Özel Sütun Başlıkları */}
                                {instCols.map((col) => (
                                  <th key={col.column_key} className="py-2.5 px-3">
                                    {col.column_name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {installments.map((inst: any) => {
                                const isPaid = inst.status === "Ödendi";
                                const isPartial = inst.status === "Kısmi Ödendi";
                                const isToday = inst.due_date === todayStr;
                                const isOverdue = inst.due_date < todayStr && !isPaid;

                                const customFields = inst.custom_fields || {};
                                const paidAmount = Number(customFields.paid_amount) || (isPaid ? Number(inst.amount) : 0);
                                const remainingAmount = customFields.remaining_amount !== undefined
                                  ? Number(customFields.remaining_amount)
                                  : (isPaid ? 0 : Number(inst.amount));
                                const paymentCount = Array.isArray(customFields.payments) ? customFields.payments.length : 0;
                                const percentPaid = inst.amount > 0 ? Math.round((paidAmount / inst.amount) * 100) : 0;

                                return (
                                  <tr
                                    key={inst.id}
                                    className={`hover:bg-slate-50 transition ${
                                      isToday ? "bg-amber-50/60 font-semibold" : isOverdue ? "bg-rose-50/40" : ""
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                      #{inst.installment_no}
                                    </td>
                                    <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                                      {formatDate(inst.due_date)}
                                      {isToday && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                                          BUGÜN
                                        </span>
                                      )}
                                      {isOverdue && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                                          GECİKMİŞ
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                                      {formatCurrency(inst.amount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                      {paidAmount > 0 && (
                                        <div className="text-emerald-700 font-bold text-[11px]">
                                          Ödendi: {formatCurrency(paidAmount)}
                                        </div>
                                      )}
                                      {remainingAmount > 0 && paidAmount > 0 && (
                                        <div className="text-rose-600 font-bold text-[11px]">
                                          Kalan: {formatCurrency(remainingAmount)}
                                        </div>
                                      )}
                                      {paidAmount === 0 && (
                                        <span className="text-slate-400 text-xs">—</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                                      {formatCurrency(inst.principal_portion || 0)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                                      {formatCurrency(inst.interest_portion || 0)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                      {isPaid ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                          <CheckCircle2 size={12} />
                                          Ödendi
                                        </span>
                                      ) : isPartial ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                          <Clock size={12} />
                                          Kısmi Ödendi (%{percentPaid})
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                          <XCircle size={12} />
                                          Ödenmedi
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                      {inst.payment_date ? formatDate(inst.payment_date) : "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                      <div className="inline-flex items-center gap-1">
                                        {/* Parçalı / Tam Ödeme Butonu */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openPartialPayModal({
                                              targetType: "installment",
                                              targetId: inst.id,
                                              loanId: loan.id,
                                              title: `${loan.bank_name} #${inst.installment_no}. Taksit`,
                                              totalAmount: Number(inst.amount),
                                              paidSoFar: paidAmount,
                                              remainingAmount: remainingAmount,
                                            })
                                          }
                                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg transition"
                                          title="Ödeme Yap"
                                        >
                                          💵 Öde
                                        </button>

                                        {/* Taksit Tutarı & Vade Düzenleme (Kalanları Yeniden Hesaplama) */}
                                        <button
                                          type="button"
                                          onClick={() => openEditInstallmentModal(inst, loan)}
                                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                          title="Taksit Tutarını ve Kalanları Düzenle"
                                        >
                                          <Edit3 size={13} />
                                        </button>

                                        {/* Tarihçe Butonu */}
                                        {paymentCount > 0 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openItemHistoryModal({
                                                targetType: "installment",
                                                targetId: inst.id,
                                                loanId: loan.id,
                                                title: `${loan.bank_name} #${inst.installment_no}. Taksit Ödeme Geçmişi`,
                                                payments: customFields.payments || [],
                                              })
                                            }
                                            className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-md transition"
                                            title="Ödeme Tarihçesi"
                                          >
                                            📜 {paymentCount}
                                          </button>
                                        )}

                                        {/* Hızlı Toggle */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleInstallment(inst.id, loan.id, inst.status)}
                                          className="text-[10px] text-slate-400 hover:text-slate-700 underline transition"
                                        >
                                          {isPaid ? "Geri Al" : "Tamamla"}
                                        </button>
                                      </div>
                                    </td>
                                    {/* Özel Sütun Hücreleri */}
                                    {instCols.map((col) => (
                                      <td key={col.column_key} className="py-2.5 px-3">
                                        <CustomColumnCell
                                          tableName="bank_loan_installments"
                                          rowId={inst.id}
                                          column={col}
                                          initialValue={inst.custom_fields?.[col.column_key]}
                                          revalidateUrl="/finans/bankalar"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </InteractiveTable>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────── TAB 2: KREDİ KARTLARI ──────────────────── */}
      {activeTab === "kartlar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Şirket Kredi Kartları</h2>
            <CustomColumnButton
              tableId="bank_accounts"
              revalidateUrl="/finans/bankalar"
              existingColumns={accountCols}
              onColumnAdded={(col) => setAccountCols((prev) => [...prev, col])}
              onColumnDeleted={(key) => setAccountCols((prev) => prev.filter((c) => c.column_key !== key))}
            />
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
            {creditCards.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CreditCard size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">Henüz kayıtlı kredi kartı yok</p>
                <p className="text-xs text-slate-400 mt-1">
                  Sağ üstten "+ Kredi Kartı Ekle" butonuna basarak ilk kartınızı ekleyebilirsiniz.
                </p>
              </div>
            ) : (
              <InteractiveTable tableId="credit-cards-table">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Banka & Kart Adı</th>
                      <th className="py-3 px-4">Şube / Kart No</th>
                      <th className="py-3 px-4 text-right">Kart Limiti</th>
                      <th className="py-3 px-4 text-right">Güncel Borç</th>
                      <th className="py-3 px-4 text-center">Faiz Oranı</th>
                      <th className="py-3 px-4 text-center">Hesap Kesim</th>
                      <th className="py-3 px-4 text-center">Son Ödeme</th>
                      <th className="py-3 px-4 text-right">Asgari Tutar</th>
                      <th className="py-3 px-4 text-center">Durum</th>
                      {/* Özel Sütunlar */}
                      {accountCols.map((col) => (
                        <th key={col.column_key} className="py-3 px-4">
                          {col.column_name}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {creditCards.map((card: any) => {
                      const payments = Array.isArray(card.custom_fields?.payments) ? card.custom_fields.payments : [];

                      return (
                        <tr key={card.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <CreditCard size={15} className="text-brand-gold" />
                              <span>{card.bank_name}</span>
                              <span className="text-slate-500 font-normal">({card.account_name})</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            {card.account_no || card.branch || "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {formatCurrency(card.credit_limit || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 whitespace-nowrap">
                            {formatCurrency(card.balance || 0)}
                          </td>
                          <td className="py-3 px-4 text-center text-purple-700 font-bold">
                            {card.interest_rate ? `%{card.interest_rate}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {card.cutoff_day ? `Her ayın ${card.cutoff_day}'i` : "—"}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700 font-semibold">
                            {card.due_day ? `Her ayın ${card.due_day}'i` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-800 font-medium">
                            {formatCurrency(card.min_payment || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {card.status || "Aktif"}
                            </span>
                          </td>
                          {/* Özel Sütunlar */}
                          {accountCols.map((col) => (
                            <td key={col.column_key} className="py-3 px-4">
                              <CustomColumnCell
                                tableName="bank_accounts"
                                rowId={card.id}
                                column={col}
                                initialValue={card.custom_fields?.[col.column_key]}
                                revalidateUrl="/finans/bankalar"
                              />
                            </td>
                          ))}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {/* Kart Borcu Ödeme Butonu */}
                              <button
                                type="button"
                                onClick={() =>
                                  openPartialPayModal({
                                    targetType: "credit_card",
                                    targetId: card.id,
                                    title: `${card.bank_name} (${card.account_name}) Kart Borcu Ödeme`,
                                    totalAmount: Number(card.balance) || 0,
                                    paidSoFar: 0,
                                    remainingAmount: Number(card.balance) || 0,
                                  })
                                }
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg transition"
                                title="Borç Öde"
                              >
                                💵 Borç Öde
                              </button>

                              {/* Düzenle Butonu */}
                              <button
                                type="button"
                                onClick={() => openEditAccountModal(card)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Kartı ve Faiz Oranını Düzenle"
                              >
                                <Edit3 size={13} />
                              </button>

                              {/* Tarihçe Butonu */}
                              {payments.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openItemHistoryModal({
                                      targetType: "credit_card",
                                      targetId: card.id,
                                      title: `${card.bank_name} (${card.account_name}) Ödeme Geçmişi`,
                                      payments,
                                    })
                                  }
                                  className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-md transition"
                                  title="Ödeme Tarihçesi"
                                >
                                  📜 {payments.length}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(card.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                title="Kartı Sil"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </InteractiveTable>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────── TAB 3: CARİ HESAPLAR, ESNEK HESAP (KMH) & MASRAFLAR ──────────────────── */}
      {activeTab === "hesaplar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Cari Hesaplar, Esnek Hesap (KMH) & Masraflar</h2>
            <CustomColumnButton
              tableId="bank_accounts"
              revalidateUrl="/finans/bankalar"
              existingColumns={accountCols}
              onColumnAdded={(col) => setAccountCols((prev) => [...prev, col])}
              onColumnDeleted={(key) => setAccountCols((prev) => prev.filter((c) => c.column_key !== key))}
            />
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
            {regularAccounts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Coins size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">Henüz kayıtlı banka hesabı yok</p>
                <p className="text-xs text-slate-400 mt-1">
                  Sağ üstten "+ Banka Hesabı Ekle" butonuna basarak vadesiz veya esnek hesabınızı ekleyebilirsiniz.
                </p>
              </div>
            ) : (
              <InteractiveTable tableId="regular-bank-accounts-table">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Banka & Şube</th>
                      <th className="py-3 px-4">Hesap Adı</th>
                      <th className="py-3 px-4">Tür</th>
                      <th className="py-3 px-4">IBAN / Hesap No</th>
                      <th className="py-3 px-4 text-right">Bakiye</th>
                      <th className="py-3 px-4 text-right">KMH / Limit</th>
                      <th className="py-3 px-4 text-center">Faiz Oranı</th>
                      <th className="py-3 px-4 text-center">Son Ödeme</th>
                      {/* Özel Sütunlar */}
                      {accountCols.map((col) => (
                        <th key={col.column_key} className="py-3 px-4">
                          {col.column_name}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {regularAccounts.map((acc: any) => {
                      const isKMH = acc.account_type === "esnek_hesap";
                      const isExpense = acc.account_type === "masraf";
                      const payments = Array.isArray(acc.custom_fields?.payments) ? acc.custom_fields.payments : [];

                      return (
                        <tr key={acc.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div>{acc.bank_name}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{acc.branch || "Merkez"}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {acc.account_name}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isKMH
                                  ? "bg-purple-100 text-purple-800"
                                  : isExpense
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isKMH ? "Esnek Hesap (KMH)" : isExpense ? "Masraf Hesabı" : "Vadesiz Ticari"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {acc.iban || acc.account_no || "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            {formatCurrency(acc.balance || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {acc.credit_limit ? formatCurrency(acc.credit_limit) : "—"}
                          </td>
                          <td className="py-3 px-4 text-center text-purple-700 font-bold">
                            {acc.interest_rate ? `%{acc.interest_rate}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {acc.due_day ? `Her ayın ${acc.due_day}'i` : "—"}
                          </td>
                          {/* Özel Sütunlar */}
                          {accountCols.map((col) => (
                            <td key={col.column_key} className="py-3 px-4">
                              <CustomColumnCell
                                tableName="bank_accounts"
                                rowId={acc.id}
                                column={col}
                                initialValue={acc.custom_fields?.[col.column_key]}
                                revalidateUrl="/finans/bankalar"
                              />
                            </td>
                          ))}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {/* Para Yatır / Çek */}
                              <button
                                type="button"
                                onClick={() =>
                                  openPartialPayModal({
                                    targetType: "account",
                                    targetId: acc.id,
                                    title: `${acc.bank_name} (${acc.account_name}) Para Girişi / Ödeme`,
                                    totalAmount: Number(acc.balance) || 0,
                                    paidSoFar: 0,
                                    remainingAmount: 0,
                                  })
                                }
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg transition"
                                title="Para Yatır veya Ödeme Yap"
                              >
                                💵 Para Yatır
                              </button>

                              {/* Düzenle */}
                              <button
                                type="button"
                                onClick={() => openEditAccountModal(acc)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Hesabı ve Faiz Oranını Düzenle"
                              >
                                <Edit3 size={13} />
                              </button>

                              {/* Tarihçe */}
                              {payments.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openItemHistoryModal({
                                      targetType: "account",
                                      targetId: acc.id,
                                      title: `${acc.bank_name} (${acc.account_name}) Hareket Geçmişi`,
                                      payments,
                                    })
                                  }
                                  className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-md transition"
                                  title="Hareket Tarihçesi"
                                >
                                  📜 {payments.length}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                title="Hesabı Sil"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </InteractiveTable>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────── TAB 4: TÜM ÖDEME TARİHÇESİ (UNIFIED AUDIT LOG) ──────────────────── */}
      {activeTab === "tarihce" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Şirket Banka & Kredi Ödeme Tarihçesi</h2>
              <p className="text-xs text-slate-500">
                Yapılan tüm kısmi ödemeler, kredi taksitleri ve kart ödemeleri kronolojik olarak listelenir.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Toplam {paymentHistory.length} Ödeme Kaydı
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
            {paymentHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <History size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">Henüz kaydedilmiş ödeme hareketi yok</p>
                <p className="text-xs text-slate-400 mt-1">
                  Kredi taksitlerine veya kredi kartlarına ödeme yaptığınızda tüm detaylar burada listelenir.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Tarih</th>
                      <th className="py-3 px-4">İşlem Başlığı</th>
                      <th className="py-3 px-4">Tür</th>
                      <th className="py-3 px-4 text-right">Ödenen Tutar</th>
                      <th className="py-3 px-4">Ödeme Kaynağı</th>
                      <th className="py-3 px-4">İşlem Yapan</th>
                      <th className="py-3 px-4">Açıklama / Not</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paymentHistory.map((item: any, idx: number) => {
                      const isInstallment = item.target_type === "installment";
                      const isCard = item.target_type === "credit_card";

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {formatDate(item.payment_date || item.created_at?.slice(0, 10))}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.title || "Ödeme"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isInstallment
                                  ? "bg-amber-100 text-amber-800"
                                  : isCard
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isInstallment ? "Kredi Taksiti" : isCard ? "Kredi Kartı" : "Banka Hesabı"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600 whitespace-nowrap text-sm">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.payment_source || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {item.user_name || "Yönetici"}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {item.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────── MODAL 1: HESAP / KREDİ KARTI EKLE / DÜZENLE ──────────────────── */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-gold/20 text-brand-navy flex items-center justify-center font-bold">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {editingAccountId ? "Banka Hesabını / Kartını Düzenle" : "Yeni Hesap veya Kart Ekle"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Faiz oranı, bakiye, limit ve vade bilgilerini giriniz
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hesap Türü *</label>
                  <select
                    value={accountFormData.account_type}
                    onChange={(e) =>
                      setAccountFormData((prev: any) => ({ ...prev, account_type: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                  >
                    <option value="vadesiz">Vadesiz Ticari Hesap</option>
                    <option value="kredi_karti">Kredi Kartı</option>
                    <option value="esnek_hesap">Esnek Hesap (KMH)</option>
                    <option value="masraf">Masraf Hesabı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Banka Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="örn: Garanti BBVA, Halkbank..."
                    value={accountFormData.bank_name}
                    onChange={(e) =>
                      setAccountFormData((prev: any) => ({ ...prev, bank_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hesap / Kart Tanımı *</label>
                  <input
                    type="text"
                    required
                    placeholder="örn: Şirket Kartı #1, Ana Vadesiz..."
                    value={accountFormData.account_name}
                    onChange={(e) =>
                      setAccountFormData((prev: any) => ({ ...prev, account_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Şube Adı</label>
                  <input
                    type="text"
                    placeholder="örn: Kadıköy Şubesi"
                    value={accountFormData.branch}
                    onChange={(e) =>
                      setAccountFormData((prev: any) => ({ ...prev, branch: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IBAN / Hesap No / Kart No</label>
                <input
                  type="text"
                  placeholder="TR..."
                  value={accountFormData.iban || accountFormData.account_no}
                  onChange={(e) =>
                    setAccountFormData((prev: any) => ({
                      ...prev,
                      iban: e.target.value,
                      account_no: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                />
              </div>

              {/* MİKTARLAR & FAİZ ORANI (Kullanıcı talebi doğrultusunda) */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                  Miktarlar, Limitler ve Faiz Oranı
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {accountFormData.account_type === "kredi_karti" ? "Güncel Borç (₺)" : "Güncel Bakiye (₺)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={accountFormData.balance}
                      onChange={(e) =>
                        setAccountFormData((prev: any) => ({ ...prev, balance: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {accountFormData.account_type === "kredi_karti" ? "Kart Limiti (₺)" : "KMH Limiti (₺)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={accountFormData.credit_limit}
                      onChange={(e) =>
                        setAccountFormData((prev: any) => ({ ...prev, credit_limit: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                      Faiz Oranı (% Aylık/Yıllık)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="%4.5"
                      value={accountFormData.interest_rate}
                      onChange={(e) =>
                        setAccountFormData((prev: any) => ({ ...prev, interest_rate: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs font-bold text-purple-800 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {accountFormData.account_type === "kredi_karti" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Hesap Kesim Günü
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1"
                        value={accountFormData.cutoff_day}
                        onChange={(e) =>
                          setAccountFormData((prev: any) => ({ ...prev, cutoff_day: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Son Ödeme Günü
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="15"
                        value={accountFormData.due_day}
                        onChange={(e) =>
                          setAccountFormData((prev: any) => ({ ...prev, due_day: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Asgari Ödeme (₺)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={accountFormData.min_payment}
                        onChange={(e) =>
                          setAccountFormData((prev: any) => ({ ...prev, min_payment: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notlar</label>
                <textarea
                  rows={2}
                  value={accountFormData.notes}
                  onChange={(e) =>
                    setAccountFormData((prev: any) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold text-xs rounded-xl shadow-xs transition"
                >
                  {isPending ? "Kaydediliyor..." : editingAccountId ? "Değişiklikleri Güncelle" : "Hesabı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────── MODAL 2: KREDİ EKLE / DÜZENLE ──────────────────── */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-gold/20 text-brand-navy flex items-center justify-center font-bold">
                  <Landmark size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {editingLoanId ? "Krediyi ve Faiz Oranını Düzenle" : "Yeni Kredi ve Taksit Planı Ekle"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kredi anaparası, faiz oranı ve aylık taksit tutarını giriniz
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLoanModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Banka Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="örn: Yapı Kredi, Akbank..."
                    value={loanFormData.bank_name}
                    onChange={(e) =>
                      setLoanFormData((prev: any) => ({ ...prev, bank_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Şube Adı</label>
                  <input
                    type="text"
                    placeholder="örn: Libadiye"
                    value={loanFormData.branch}
                    onChange={(e) =>
                      setLoanFormData((prev: any) => ({ ...prev, branch: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kredi Adı / Tanımı *</label>
                  <input
                    type="text"
                    required
                    placeholder="örn: Taşıt Kredisi, Yapım Kredisi..."
                    value={loanFormData.loan_name}
                    onChange={(e) =>
                      setLoanFormData((prev: any) => ({ ...prev, loan_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sözleşme / Kredi No</label>
                  <input
                    type="text"
                    placeholder="örn: K900857"
                    value={loanFormData.loan_code}
                    onChange={(e) =>
                      setLoanFormData((prev: any) => ({ ...prev, loan_code: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                  />
                </div>
              </div>

              {/* ANAPARA, FAİZ VE TAKSİT TUTARLARI */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                  Kredi Tutarları ve Faiz Oranı
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Toplam Anapara (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={loanFormData.principal_amount}
                      onChange={(e) =>
                        setLoanFormData((prev: any) => ({ ...prev, principal_amount: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                      Faiz Oranı (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="%3.9"
                      value={loanFormData.interest_rate}
                      onChange={(e) =>
                        setLoanFormData((prev: any) => ({ ...prev, interest_rate: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs font-bold text-purple-800 bg-white border border-purple-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Aylık Taksit (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={loanFormData.monthly_installment}
                      onChange={(e) =>
                        setLoanFormData((prev: any) => ({ ...prev, monthly_installment: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Toplam Taksit Sayısı
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={loanFormData.total_installments}
                      onChange={(e) =>
                        setLoanFormData((prev: any) => ({ ...prev, total_installments: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={loanFormData.start_date}
                      onChange={(e) =>
                        setLoanFormData((prev: any) => ({ ...prev, start_date: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Her Ayın Ödeme Günü
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={loanFormData.due_day}
                      onChange={(e) =>
                        setLoanFormData((prev: any) => ({ ...prev, due_day: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notlar</label>
                <textarea
                  rows={2}
                  value={loanFormData.notes}
                  onChange={(e) =>
                    setLoanFormData((prev: any) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-gold focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold text-xs rounded-xl shadow-xs transition"
                >
                  {isPending ? "Kaydediliyor..." : editingLoanId ? "Krediyi Güncelle" : "Krediyi Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────── MODAL 3: TAKSİT DÜZENLEME & KALANLARI YENİDEN HESAPLAMA ──────────────────── */}
      {isEditInstallmentModalOpen && editingInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Calculator size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Taksit #{editingInstallment.installment_no} Düzenle
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingInstallment.loan?.bank_name} — {editingInstallment.loan?.loan_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditInstallmentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveInstallment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Taksit Tutarı (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={installmentFormData.amount}
                  onChange={(e) =>
                    setInstallmentFormData((prev) => ({
                      ...prev,
                      amount: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Anapara Tutarı (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={installmentFormData.principal_portion}
                    onChange={(e) =>
                      setInstallmentFormData((prev) => ({
                        ...prev,
                        principal_portion: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Faiz Tutarı (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={installmentFormData.interest_portion}
                    onChange={(e) =>
                      setInstallmentFormData((prev) => ({
                        ...prev,
                        interest_portion: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vade Tarihi</label>
                <input
                  type="date"
                  value={installmentFormData.due_date}
                  onChange={(e) =>
                    setInstallmentFormData((prev) => ({ ...prev, due_date: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* OTOMATİK YENİDEN HESAPLAMA ANAHTARI */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={installmentFormData.recalculateRemaining}
                    onChange={(e) =>
                      setInstallmentFormData((prev) => ({
                        ...prev,
                        recalculateRemaining: e.target.checked,
                      }))
                    }
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Kalan taksitleri otomatik yeniden hesapla
                    </span>
                    <span className="text-[11px] text-indigo-700 leading-tight block mt-0.5">
                      Bu taksiti değiştirdiğinizde kredinin kalan borcu ödenmemiş diğer taksitlere eşit dağıtılır.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Not / Açıklama</label>
                <input
                  type="text"
                  placeholder="İsteğe bağlı not..."
                  value={installmentFormData.notes}
                  onChange={(e) =>
                    setInstallmentFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditInstallmentModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  {isPending ? "Hesaplanıyor..." : "Kaydet ve Yeniden Dağıt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────── MODAL 4: PARÇALI ÖDEME YAP ──────────────────── */}
      {isPartialPayModalOpen && partialPayTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {partialPayTarget.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kısmi veya tam ödeme tutarını giriniz
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPartialPayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePartialPayment} className="space-y-4">
              {/* Özet Bilgiler */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Toplam Borç:</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(partialPayTarget.totalAmount)}
                  </span>
                </div>
                {partialPayTarget.paidSoFar > 0 && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Daha Önce Ödenen:</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(partialPayTarget.paidSoFar)}
                    </span>
                  </div>
                )}
                <div className="col-span-2 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-600 text-xs">Kalan Ödenecek Tutar:</span>
                  <span className="font-black text-rose-600 text-sm">
                    {formatCurrency(partialPayTarget.remainingAmount)}
                  </span>
                </div>
              </div>

              {/* Ödenecek Tutar Girişi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Şimdi Ödenecek Tutar (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={partialPayForm.amount}
                  onChange={(e) =>
                    setPartialPayForm((prev) => ({
                      ...prev,
                      amount: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 text-base font-black text-emerald-700 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  autoFocus
                />
              </div>

              {/* Tarih & Ödeme Kaynağı */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ödeme Tarihi</label>
                  <input
                    type="date"
                    required
                    value={partialPayForm.paymentDate}
                    onChange={(e) =>
                      setPartialPayForm((prev) => ({ ...prev, paymentDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ödeme Kaynağı</label>
                  <input
                    type="text"
                    placeholder="örn: Garanti Vadesiz, Nakit..."
                    value={partialPayForm.paymentSource}
                    onChange={(e) =>
                      setPartialPayForm((prev) => ({ ...prev, paymentSource: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Açıklama / Not</label>
                <input
                  type="text"
                  placeholder="örn: Kısmi EFT yapıldı, dekont no..."
                  value={partialPayForm.notes}
                  onChange={(e) =>
                    setPartialPayForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPartialPayModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  {isPending ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────── MODAL 5: TEKİL KALEM ÖDEME GEÇMİŞİ ──────────────────── */}
      {isItemHistoryModalOpen && historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {historyTarget.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bu kaleme yapılan parçalı ve tam ödemeler
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsItemHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {historyTarget.payments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Henüz ödeme kaydı bulunmuyor.
                </div>
              ) : (
                historyTarget.payments.map((p: any, idx: number) => (
                  <div
                    key={p.id || idx}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {formatDate(p.payment_date || p.created_at?.slice(0, 10))}
                        </span>
                        <span className="text-[11px] text-slate-400">• {p.payment_source || "Banka"}</span>
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        {p.notes || "Not belirtilmemiş"} (İşlem: {p.user_name || "Kullanıcı"})
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-600 text-sm">
                        {formatCurrency(p.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Bu Ödemeyi İptal Et / Geri Al"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsItemHistoryModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
