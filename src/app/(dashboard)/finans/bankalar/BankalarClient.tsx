"use client";

import { useState } from "react";
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
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";
import {
  CustomColumnButton,
  CustomColumnCell,
} from "@/components/ui/CustomColumnManager";
import { CustomColumn } from "@/lib/data/custom-columns-actions";
import {
  saveBankAccount,
  deleteBankAccount,
  saveBankLoan,
  deleteBankLoan,
  toggleLoanInstallmentStatus,
} from "./actions";

interface BankalarClientProps {
  initialAccounts: any[];
  initialLoans: any[];
  accountCustomColumns: CustomColumn[];
  loanCustomColumns: CustomColumn[];
  installmentCustomColumns: CustomColumn[];
}

export function BankalarClient({
  initialAccounts,
  initialLoans,
  accountCustomColumns,
  loanCustomColumns,
  installmentCustomColumns,
}: BankalarClientProps) {
  const [activeTab, setActiveTab] = useState<"krediler" | "kartlar" | "hesaplar">("krediler");
  const [accounts, setAccounts] = useState(initialAccounts);
  const [loans, setLoans] = useState(initialLoans);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(
    initialLoans[0]?.id || null
  );

  // Custom columns state
  const [accountCols, setAccountCols] = useState(accountCustomColumns);
  const [loanCols, setLoanCols] = useState(loanCustomColumns);
  const [instCols, setInstCols] = useState(installmentCustomColumns);

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
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

  // Calculate Today and Due Reminders
  const todayStr = new Date().toISOString().split("T")[0];
  const next7DaysStr = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const allInstallments = loans.flatMap((l) =>
    (l.installments || []).map((inst: any) => ({
      ...inst,
      bank_name: l.bank_name,
      loan_name: l.loan_name,
      loan_id: l.id,
    }))
  );

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

  // Sub-lists
  const creditCards = accounts.filter((a) => a.account_type === "kredi_karti");
  const regularAccounts = accounts.filter(
    (a) => a.account_type !== "kredi_karti"
  );

  // KPI Calculations
  const totalLoanDebt = loans.reduce(
    (sum, l) =>
      sum +
      (l.installments || [])
        .filter((i: any) => i.status !== "Ödendi")
        .reduce((s: number, i: any) => s + Number(i.amount || 0), 0),
    0
  );
  const totalCardDebt = creditCards.reduce(
    (sum, c) => sum + (Number(c.balance) || 0),
    0
  );
  const totalBankBalance = regularAccounts
    .filter((a) => a.account_type === "vadesiz")
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await saveBankAccount(accountFormData);
    if (res.success && res.data) {
      setAccounts((prev) => [res.data, ...prev.filter((a) => a.id !== res.data.id)]);
      setIsAccountModalOpen(false);
    } else {
      alert(res.error || "Hesap kaydedilemedi");
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("Bu hesabı/kartı silmek istediğinize emin misiniz?")) return;
    const res = await deleteBankAccount(id);
    if (res.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    }
  }

  async function handleSaveLoan(e: React.FormEvent) {
    e.preventDefault();
    const res = await saveBankLoan(loanFormData);
    if (res.success && res.data) {
      window.location.reload();
    } else {
      alert(res.error || "Kredi kaydedilemedi");
    }
  }

  async function handleDeleteLoan(id: string) {
    if (!confirm("Bu krediyi ve tüm taksit planını silmek istediğinize emin misiniz?")) return;
    const res = await deleteBankLoan(id);
    if (res.success) {
      setLoans((prev) => prev.filter((l) => l.id !== id));
    }
  }

  async function handleToggleInstallment(installmentId: string, loanId: string, currentStatus: string) {
    const nextStatus = currentStatus === "Ödendi" ? "Ödenmedi" : "Ödendi";
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
              <button
                type="button"
                onClick={() => handleToggleInstallment(item.id, item.loan_id, item.status)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition shadow-xs whitespace-nowrap"
              >
                <CheckCircle2 size={16} />
                <span>Ödendi Olarak İşaretle</span>
              </button>
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
            Banka hesapları, kredi kartları, esnek hesap (KMH), taksitli kredi takibi ve aylık ödeme planları.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "krediler" ? (
            <button
              type="button"
              onClick={() => setIsLoanModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Plus size={16} />
              <span>Yeni Kredi Ekle</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAccountFormData((prev: any) => ({
                  ...prev,
                  account_type: activeTab === "kartlar" ? "kredi_karti" : "vadesiz",
                }));
                setIsAccountModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Plus size={16} />
              <span>{activeTab === "kartlar" ? "Kredi Kartı Ekle" : "Banka Hesabı Ekle"}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            Kalan Kredi Anapara Borcu
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {formatCurrency(totalLoanDebt)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {loans.length} Aktif Taksitli Kredi
          </span>
        </div>
      </div>

      {/* Sekmeler (Tabs) */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
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
          <span>Cari Hesaplar, Esnek Hesap (KMH) & Masraflar ({regularAccounts.length})</span>
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

          {loans.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-border text-slate-400">
              <Landmark size={40} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">Henüz kayıtlı kredi bulunmuyor</p>
              <p className="text-xs text-slate-400 mt-1">
                Sağ üstteki "+ Yeni Kredi Ekle" butonuna basarak kredinizi ve otomatik taksit planını oluşturabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan: any) => {
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

                    {/* AYLIK ÖDEME PLANI TABLOSU (Açılır Detay) */}
                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={14} className="text-brand-gold" />
                            {loan.bank_name} — Aylık Taksit Ödeme Planı ({installments.length} Taksit)
                          </h4>
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
                                <th className="py-2.5 px-3 text-right">Anapara</th>
                                <th className="py-2.5 px-3 text-right">Faiz</th>
                                <th className="py-2.5 px-3 text-center">Durum</th>
                                <th className="py-2.5 px-3">Ödeme Tarihi</th>
                                <th className="py-2.5 px-3 text-center">İşlem</th>
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
                                const isToday = inst.due_date === todayStr;
                                const isOverdue = inst.due_date < todayStr && !isPaid;

                                return (
                                  <tr
                                    key={inst.id}
                                    className={`hover:bg-slate-50 transition ${
                                      isToday ? "bg-amber-50/60 font-semibold" : isOverdue ? "bg-rose-50/40" : ""
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                      #{inst.installment_no}
                                    </td>
                                    <td className="py-2.5 px-3 font-medium text-slate-800">
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
                                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                      {formatCurrency(inst.amount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-600">
                                      {formatCurrency(inst.principal_portion || 0)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-slate-600">
                                      {formatCurrency(inst.interest_portion || 0)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleInstallment(inst.id, loan.id, inst.status)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition shadow-2xs ${
                                          isPaid
                                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                            : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                                        }`}
                                      >
                                        {isPaid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                        <span>{isPaid ? "Ödendi" : "Ödenmedi"}</span>
                                      </button>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500">
                                      {inst.payment_date ? formatDate(inst.payment_date) : "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleInstallment(inst.id, loan.id, inst.status)}
                                        className="text-[11px] text-brand-navy underline font-bold hover:text-brand-gold transition"
                                      >
                                        {isPaid ? "Geri Al" : "Ödendi Yap"}
                                      </button>
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
                      <th className="py-3 px-4 text-center">Hesap Kesim</th>
                      <th className="py-3 px-4 text-center">Son Ödeme</th>
                      <th className="py-3 px-4 text-right">Asgari Tutar</th>
                      <th className="py-3 px-4 text-center">Durum</th>
                      <th className="py-3 px-4">Notlar</th>
                      {/* Özel Sütunlar */}
                      {accountCols.map((col) => (
                        <th key={col.column_key} className="py-3 px-4">
                          {col.column_name}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {creditCards.map((card: any) => (
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
                        <td className="py-3 px-4 text-right font-black text-rose-600">
                          {formatCurrency(card.balance || 0)}
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
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {card.notes || "—"}
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
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(card.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                            title="Kartı Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
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
                      <th className="py-3 px-4">Notlar</th>
                      {/* Özel Sütunlar */}
                      {accountCols.map((col) => (
                        <th key={col.column_key} className="py-3 px-4">
                          {col.column_name}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {regularAccounts.map((acc: any) => {
                      const isKMH = acc.account_type === "esnek_hesap";
                      const isExpense = acc.account_type === "masraf";

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
                          <td className="py-3 px-4 text-center text-slate-600">
                            {acc.interest_rate ? `%{acc.interest_rate}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {acc.due_day ? `Her ayın ${acc.due_day}'i` : "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {acc.notes || "—"}
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
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                              title="Hesabı Sil"
                            >
                              <Trash2 size={14} />
                            </button>
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

      {/* ──────────────────── MODAL 1: YENİ KREDİ EKLE (Otomatik Taksit Planı) ──────────────────── */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-border animate-in fade-in zoom-in duration-150 my-8">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-border">
              <Landmark size={20} className="text-brand-gold" />
              Yeni Taksitli Kredi & Ödeme Planı Tanımla
            </h3>

            <form onSubmit={handleSaveLoan} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Banka Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Garanti BBVA, Vakıfbank..."
                    value={loanFormData.bank_name}
                    onChange={(e) => setLoanFormData({ ...loanFormData, bank_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Şube Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: Kadıköy Ticari..."
                    value={loanFormData.branch}
                    onChange={(e) => setLoanFormData({ ...loanFormData, branch: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kredi Adı / Türü *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Taşıt Kredisi, Rotatif Kredi..."
                    value={loanFormData.loan_name}
                    onChange={(e) => setLoanFormData({ ...loanFormData, loan_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sözleşme / Kredi No</label>
                  <input
                    type="text"
                    placeholder="Örn: KRD-2026-99"
                    value={loanFormData.loan_code}
                    onChange={(e) => setLoanFormData({ ...loanFormData, loan_code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Çekilen Tutar (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="500000"
                    value={loanFormData.principal_amount || ""}
                    onChange={(e) => setLoanFormData({ ...loanFormData, principal_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Aylık Taksit (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="25000"
                    value={loanFormData.monthly_installment || ""}
                    onChange={(e) => setLoanFormData({ ...loanFormData, monthly_installment: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold text-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Taksit Sayısı (Ay) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="24"
                    value={loanFormData.total_installments || ""}
                    onChange={(e) => setLoanFormData({ ...loanFormData, total_installments: parseInt(e.target.value) || 12 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">İlk Taksit Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={loanFormData.start_date}
                    onChange={(e) => setLoanFormData({ ...loanFormData, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeme Günü (Ayın Kaçı) *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={loanFormData.due_day || 15}
                    onChange={(e) => setLoanFormData({ ...loanFormData, due_day: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notlar / Açıklama</label>
                <textarea
                  rows={2}
                  value={loanFormData.notes}
                  onChange={(e) => setLoanFormData({ ...loanFormData, notes: e.target.value })}
                  placeholder="Kredi vadesi, kefalet veya ek bilgiler..."
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Krediyi kaydettiğinizde, belirttiğiniz taksit sayısı kadar (örn: {loanFormData.total_installments} ay) <strong>Aylık Ödeme Planı</strong> ve <strong>Günlük Ödeme Hatırlatıcıları</strong> otomatik olarak oluşturulacaktır.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-brand-navy bg-brand-gold hover:bg-brand-gold-light rounded-xl transition shadow-xs"
                >
                  Krediyi & Planı Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────── MODAL 2: YENİ HESAP / KREDİ KARTI EKLE ──────────────────── */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-border animate-in fade-in zoom-in duration-150 my-8">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-border">
              <CreditCard size={20} className="text-brand-gold" />
              Banka Hesabı veya Kredi Kartı Ekle
            </h3>

            <form onSubmit={handleSaveAccount} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hesap Türü *</label>
                <select
                  value={accountFormData.account_type}
                  onChange={(e) => setAccountFormData({ ...accountFormData, account_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                >
                  <option value="vadesiz">Vadesiz Ticari Hesap</option>
                  <option value="kredi_karti">Şirket Kredi Kartı</option>
                  <option value="esnek_hesap">Esnek Hesap (KMH)</option>
                  <option value="masraf">Masraf Hesabı / POS</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Banka Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Garanti BBVA, Akbank..."
                    value={accountFormData.bank_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bank_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hesap / Kart Tanımı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Çamoluk Ticari Kart, Ana Vadesiz..."
                    value={accountFormData.account_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Şube Adı</label>
                  <input
                    type="text"
                    placeholder="Örn: Ümraniye Şubesi"
                    value={accountFormData.branch}
                    onChange={(e) => setAccountFormData({ ...accountFormData, branch: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hesap No / Kart No</label>
                  <input
                    type="text"
                    placeholder="Örn: **** 4589"
                    value={accountFormData.account_no}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_no: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IBAN</label>
                <input
                  type="text"
                  placeholder="TR..."
                  value={accountFormData.iban}
                  onChange={(e) => setAccountFormData({ ...accountFormData, iban: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {accountFormData.account_type === "kredi_karti" ? "Güncel Borç (₺)" : "Bakiye (₺)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={accountFormData.balance || ""}
                    onChange={(e) => setAccountFormData({ ...accountFormData, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Limit (₺)</label>
                  <input
                    type="number"
                    step="any"
                    value={accountFormData.credit_limit || ""}
                    onChange={(e) => setAccountFormData({ ...accountFormData, credit_limit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Faiz Oranı (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={accountFormData.interest_rate || ""}
                    onChange={(e) => setAccountFormData({ ...accountFormData, interest_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
              </div>

              {accountFormData.account_type === "kredi_karti" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hesap Kesim Günü</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={accountFormData.cutoff_day || 1}
                      onChange={(e) => setAccountFormData({ ...accountFormData, cutoff_day: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Son Ödeme Günü</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={accountFormData.due_day || 15}
                      onChange={(e) => setAccountFormData({ ...accountFormData, due_day: parseInt(e.target.value) || 15 })}
                      className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Asgari Ödeme (₺)</label>
                    <input
                      type="number"
                      step="any"
                      value={accountFormData.min_payment || ""}
                      onChange={(e) => setAccountFormData({ ...accountFormData, min_payment: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notlar</label>
                <textarea
                  rows={2}
                  value={accountFormData.notes}
                  onChange={(e) => setAccountFormData({ ...accountFormData, notes: e.target.value })}
                  placeholder="Hesap ile ilgili notlar..."
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-brand-navy bg-brand-gold hover:bg-brand-gold-light rounded-xl transition shadow-xs"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
