"use client";

import { useState, useEffect, useTransition } from "react";
import type { Employee, EmployeeTransaction } from "@/lib/data/types";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  actionGetEmployeeTransactions,
  actionSaveEmployeeTransaction,
  actionDeleteEmployeeTransaction,
} from "@/lib/data/actions";
import {
  X,
  User,
  Phone,
  Briefcase,
  Calendar,
  Wallet,
  Palmtree,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  Building,
  CreditCard,
} from "lucide-react";

interface Props {
  employee: Employee;
  userName: string;
  onClose: () => void;
  onEmployeeUpdated?: (updated: Employee) => void;
}

export function EmployeeDetailDrawer({
  employee,
  userName,
  onClose,
  onEmployeeUpdated,
}: Props) {
  const [activeTab, setActiveTab] = useState<"advances" | "leaves" | "salary">("advances");
  const [transactions, setTransactions] = useState<EmployeeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIban, setCopiedIban] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Yeni Avans Formu
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDesc, setAdvanceDesc] = useState("");

  // Yeni İzin Formu
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveDays, setLeaveDays] = useState("1");
  const [leaveDesc, setLeaveDesc] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await actionGetEmployeeTransactions(employee.id);
      setTransactions(data);
      setLoading(false);
    }
    loadData();
  }, [employee.id]);

  function copyIban() {
    if (!employee.iban) return;
    navigator.clipboard.writeText(employee.iban.replace(/\s+/g, ""));
    setCopiedIban(true);
    toast.success("IBAN panoya kopyalandı!");
    setTimeout(() => setCopiedIban(false), 2000);
  }

  const advances = transactions.filter((t) => t.type === "avans");
  const leaves = transactions.filter((t) => t.type === "izin");

  const totalAdvFromTrans = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalLeaveDaysFromTrans = leaves.reduce((s, l) => s + (Number(l.days) || 0), 0);

  const official = Number(employee.official_salary) || 0;
  const unofficial = Number(employee.unofficial_salary) || 0;
  const totalSalary = Number(employee.salary) || (official + unofficial);
  const totalAdvances = Math.max(employee.total_advances || 0, totalAdvFromTrans);
  const netSalaryToPay = Math.max(0, totalSalary - totalAdvances);

  async function handleAddAdvance(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(advanceAmount);
    if (!amt || amt <= 0) {
      toast.error("Lütfen geçerli bir avans tutarı giriniz.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("employee_id", employee.id);
      formData.set("type", "avans");
      formData.set("transaction_date", advanceDate);
      formData.set("amount", String(amt));
      formData.set("description", advanceDesc.trim());

      const res = await actionSaveEmployeeTransaction(formData);
      if (res.success && res.transaction) {
        setTransactions((prev) => [res.transaction!, ...prev]);
        setAdvanceAmount("");
        setAdvanceDesc("");
        toast.success("Avans kaydı başarıyla eklendi!");
      } else {
        toast.error(res.error || "Avans kaydedilemedi.");
      }
    });
  }

  async function handleAddLeave(e: React.FormEvent) {
    e.preventDefault();
    const days = parseFloat(leaveDays);
    if (!days || days <= 0) {
      toast.error("Lütfen geçerli bir gün sayısı giriniz.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("employee_id", employee.id);
      formData.set("type", "izin");
      formData.set("transaction_date", leaveDate);
      formData.set("days", String(days));
      formData.set("description", leaveDesc.trim());

      const res = await actionSaveEmployeeTransaction(formData);
      if (res.success && res.transaction) {
        setTransactions((prev) => [res.transaction!, ...prev]);
        setLeaveDays("1");
        setLeaveDesc("");
        toast.success("İzin kaydı başarıyla eklendi!");
      } else {
        toast.error(res.error || "İzin kaydedilemedi.");
      }
    });
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await actionDeleteEmployeeTransaction(id, employee.id);
      if (res.success) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        toast.success("Kayıt silindi.");
      } else {
        toast.error("Silinemedi.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Üst Başlık & Kapatma */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-navy text-brand-gold flex items-center justify-center font-bold text-base shadow-xs">
              {employee.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-text flex items-center gap-2">
                {employee.full_name}
                <span className="text-[11px] font-semibold text-brand-navy bg-brand-navy/10 px-2 py-0.5 rounded-full">
                  {employee.position}
                </span>
              </h2>
              <p className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                {employee.phone && <span>Tel: {employee.phone}</span>}
                {employee.start_date && <span>• İşe Başlama: {employee.start_date}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text hover:bg-surface rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Gövde / Scroll Alanı */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* IBAN & MAAŞ BİLGİ KARTI */}
          <div className="bg-surface/50 border border-border rounded-2xl p-4 space-y-3">
            {/* IBAN Satırı */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-brand-navy" />
                <span className="text-xs font-semibold text-text-muted uppercase">Banka IBAN:</span>
                <span className="font-mono text-xs font-bold text-text tracking-wider">
                  {employee.iban || "Henüz IBAN girilmemiş"}
                </span>
              </div>
              {employee.iban && (
                <button
                  type="button"
                  onClick={copyIban}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-navy bg-white hover:bg-neutral-100 border border-border px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
                >
                  {copiedIban ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedIban ? "Kopyalandı!" : "IBAN Kopyala"}</span>
                </button>
              )}
            </div>

            {/* Maaş Kırılımı (Resmi vs Gayriresmi) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-border">
                <span className="text-text-muted block text-[10px] font-semibold uppercase">Resmi (Banka)</span>
                <strong className="text-sm font-bold text-text font-mono mt-0.5 block">
                  {formatCurrency(official)}
                </strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-border">
                <span className="text-text-muted block text-[10px] font-semibold uppercase">Gayriresmi (Elden)</span>
                <strong className="text-sm font-bold text-text font-mono mt-0.5 block">
                  {formatCurrency(unofficial)}
                </strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-border">
                <span className="text-text-muted block text-[10px] font-semibold uppercase">Toplam Net Maaş</span>
                <strong className="text-sm font-black text-brand-navy font-mono mt-0.5 block">
                  {formatCurrency(totalSalary)}
                </strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <span className="text-emerald-800 block text-[10px] font-bold uppercase">Kalan Ödenecek</span>
                <strong className="text-sm font-black text-emerald-800 font-mono mt-0.5 block">
                  {formatCurrency(netSalaryToPay)}
                </strong>
              </div>
            </div>
          </div>

          {/* SEKME BAŞLIKLARI */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("advances")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "advances"
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Wallet size={15} />
              Avans Geçmişi ({advances.length})
            </button>
            <button
              onClick={() => setActiveTab("leaves")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "leaves"
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Palmtree size={15} />
              İzin Kullanımı ({leaves.length})
            </button>
            <button
              onClick={() => setActiveTab("salary")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "salary"
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Building size={15} />
              Maaş & Bordro Özeti
            </button>
          </div>

          {/* SEKME 1: AVANSLAR */}
          {activeTab === "advances" && (
            <div className="space-y-4">
              {/* Yeni Avans Ekle Formu */}
              <form onSubmit={handleAddAdvance} className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase">
                  <Plus size={14} /> Yeni Avans Girişi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">Tarih</label>
                    <input
                      type="date"
                      value={advanceDate}
                      onChange={(e) => setAdvanceDate(e.target.value)}
                      required
                      className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">Avans Tutarı (₺) *</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="Örn: 5000"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      required
                      className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white font-bold outline-none focus:border-brand-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">Avans Nedeni / Açıklama</label>
                    <input
                      type="text"
                      placeholder="Acil ihtiyaç, bayram harçlığı vb."
                      value={advanceDesc}
                      onChange={(e) => setAdvanceDesc(e.target.value)}
                      className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                    Avansı Kaydet
                  </button>
                </div>
              </form>

              {/* Avans Listesi */}
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-text-muted font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Tarih</th>
                      <th className="py-2.5 px-3">Açıklama / Sebep</th>
                      <th className="py-2.5 px-3 text-right">Tutar</th>
                      <th className="py-2.5 px-3">Ekleyen</th>
                      <th className="py-2.5 px-3 text-center w-12">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {advances.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-text-muted">
                          Henüz kayıtlı avans hareketi bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      advances.map((adv) => (
                        <tr key={adv.id} className="hover:bg-surface/50">
                          <td className="py-2.5 px-3 font-semibold text-text">{adv.transaction_date}</td>
                          <td className="py-2.5 px-3 text-text-muted">{adv.description || "-"}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                            {formatCurrency(adv.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-text-muted">{adv.created_by_name || "-"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(adv.id)}
                              disabled={isPending}
                              className="text-text-muted hover:text-rose-600 transition p-1"
                              title="Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEKME 2: İZİNLER */}
          {activeTab === "leaves" && (
            <div className="space-y-4">
              {/* Yeni İzin Ekle Formu */}
              <form onSubmit={handleAddLeave} className="bg-blue-50/40 border border-blue-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase">
                  <Plus size={14} /> Yeni İzin Girişi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">İzin Tarihi</label>
                    <input
                      type="date"
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                      required
                      className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">Kullanılan Gün Sayısı *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.5"
                      placeholder="1"
                      value={leaveDays}
                      onChange={(e) => setLeaveDays(e.target.value)}
                      required
                      className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white font-bold outline-none focus:border-brand-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">İzin Sebebi (Ne İçin Aldı?)</label>
                    <input
                      type="text"
                      placeholder="Memleket ziyareti, sağlık raporu, yıllık izin..."
                      value={leaveDesc}
                      onChange={(e) => setLeaveDesc(e.target.value)}
                      className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                    İzni Kaydet
                  </button>
                </div>
              </form>

              {/* İzin Listesi */}
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-text-muted font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Tarih</th>
                      <th className="py-2.5 px-3">Süre</th>
                      <th className="py-2.5 px-3">İzin Sebebi</th>
                      <th className="py-2.5 px-3">Ekleyen</th>
                      <th className="py-2.5 px-3 text-center w-12">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-text-muted">
                          Henüz kayıtlı izin hareketi bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      leaves.map((l) => (
                        <tr key={l.id} className="hover:bg-surface/50">
                          <td className="py-2.5 px-3 font-semibold text-text">{l.transaction_date}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-700">{l.days} Gün</td>
                          <td className="py-2.5 px-3 text-text-muted">{l.description || "-"}</td>
                          <td className="py-2.5 px-3 text-text-muted">{l.created_by_name || "-"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(l.id)}
                              disabled={isPending}
                              className="text-text-muted hover:text-rose-600 transition p-1"
                              title="Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEKME 3: BORDRO ÖZETİ */}
          {activeTab === "salary" && (
            <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <Building size={16} className="text-brand-navy" />
                Maaş Hesabı ve Hakediş Tablosu
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-text-muted">Resmi Maaş Tutarı (Banka):</span>
                  <strong className="font-mono text-sm">{formatCurrency(official)}</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-text-muted">Gayriresmi / Elden Ödeme:</span>
                  <strong className="font-mono text-sm">{formatCurrency(unofficial)}</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border bg-surface/50 px-2 rounded-lg">
                  <span className="font-bold text-text">Toplam Aylık Net Maaş:</span>
                  <strong className="font-mono text-base font-black text-brand-navy">{formatCurrency(totalSalary)}</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-amber-800 font-semibold">Toplam Çekilen Avanslar:</span>
                  <strong className="font-mono text-sm text-amber-700">-{formatCurrency(totalAdvances)}</strong>
                </div>
                <div className="flex justify-between items-center py-3 bg-emerald-50 px-3 rounded-xl border border-emerald-200">
                  <span className="font-black text-emerald-900 text-sm">Personele Ödenecek Kalan Net Tutar:</span>
                  <strong className="font-mono text-lg font-black text-emerald-800">{formatCurrency(netSalaryToPay)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
