"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
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
  Wallet,
  Palmtree,
  Copy,
  Check,
  Plus,
  Trash2,
  Loader2,
  Building,
  CreditCard,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  CalendarDays,
  CircleAlert,
} from "lucide-react";

interface Props {
  employee: Employee;
  userName: string;
  onClose: () => void;
  onEmployeeUpdated?: (updated: Employee) => void;
}

const MONTHS_TR = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
];

function monthLabel(dateStr: string) {
  try {
    const [y, m] = dateStr.split("-");
    return `${MONTHS_TR[parseInt(m, 10) - 1]} ${y}`;
  } catch {
    return dateStr;
  }
}

function monthKey(dateStr: string) {
  try {
    return dateStr.slice(0, 7); // "2026-09"
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d} ${MONTHS_TR[parseInt(m, 10) - 1]} ${y}`;
  } catch {
    return dateStr;
  }
}

export function EmployeeDetailDrawer({
  employee,
  userName,
  onClose,
  onEmployeeUpdated,
}: Props) {
  const [activeTab, setActiveTab] = useState<"advances" | "leaves" | "salary">("leaves");
  const [transactions, setTransactions] = useState<EmployeeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIban, setCopiedIban] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Hangi aylar açık (accordion)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

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
      // En son ayı otomatik aç
      if (data.length > 0) {
        const latestKey = monthKey(data[0].transaction_date);
        setOpenMonths({ [latestKey]: true });
      }
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

  function toggleMonth(key: string) {
    setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const advances = useMemo(
    () => transactions.filter((t) => t.type === "avans").sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
    [transactions]
  );
  const leaves = useMemo(
    () => transactions.filter((t) => t.type === "izin").sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
    [transactions]
  );

  // ─── İzin özeti ───────────────────────────────────────────────
  const totalLeaveEntitlement =
    (Number(employee.used_leave_days) || 0) + (Number(employee.remaining_leave_days) || 0);
  const usedLeaveDaysFromTrans = leaves.reduce((s, l) => s + (Number(l.days) || 0), 0);
  const usedLeaveDays = Math.max(Number(employee.used_leave_days) || 0, usedLeaveDaysFromTrans);
  const remainingLeaveDays = Math.max(0, totalLeaveEntitlement - usedLeaveDays);

  // ─── Avans özeti ──────────────────────────────────────────────
  const totalAdvFromTrans = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalAdvances = Math.max(Number(employee.total_advances) || 0, totalAdvFromTrans);
  const official = Number(employee.official_salary) || 0;
  const unofficial = Number(employee.unofficial_salary) || 0;
  const totalSalary = Number(employee.salary) || (official + unofficial);
  const netSalaryToPay = Math.max(0, totalSalary - totalAdvances);

  // Bu ayın avansı
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthAdvances = advances
    .filter((a) => monthKey(a.transaction_date) === thisMonthKey)
    .reduce((s, a) => s + (Number(a.amount) || 0), 0);

  // ─── Aylara göre gruplama ─────────────────────────────────────
  function groupByMonth(items: EmployeeTransaction[]) {
    const groups: Record<string, EmployeeTransaction[]> = {};
    for (const item of items) {
      const key = monthKey(item.transaction_date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    // En yeni ay üste
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }

  const advanceGroups = useMemo(() => groupByMonth(advances), [advances]);
  const leaveGroups = useMemo(() => groupByMonth(leaves), [leaves]);

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
        // Yeni avansın ayını aç
        const newKey = monthKey(advanceDate);
        setOpenMonths((prev) => ({ ...prev, [newKey]: true }));
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
        const newKey = monthKey(leaveDate);
        setOpenMonths((prev) => ({ ...prev, [newKey]: true }));
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

        {/* ── BAŞLIK ── */}
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
                {employee.start_date && <span>• İşe Başlama: {formatDate(employee.start_date)}</span>}
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

        {/* ── GÖVDE ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* IBAN & MAAŞ KARTI */}
          <div className="bg-surface/50 border border-border rounded-2xl p-4 space-y-3">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-border">
                <span className="text-text-muted block text-[10px] font-semibold uppercase">Resmi (Banka)</span>
                <strong className="text-sm font-bold text-text font-mono mt-0.5 block">{formatCurrency(official)}</strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-border">
                <span className="text-text-muted block text-[10px] font-semibold uppercase">Elden</span>
                <strong className="text-sm font-bold text-text font-mono mt-0.5 block">{formatCurrency(unofficial)}</strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-border">
                <span className="text-text-muted block text-[10px] font-semibold uppercase">Toplam Net</span>
                <strong className="text-sm font-black text-brand-navy font-mono mt-0.5 block">{formatCurrency(totalSalary)}</strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <span className="text-emerald-800 block text-[10px] font-bold uppercase">Kalan Ödenecek</span>
                <strong className="text-sm font-black text-emerald-800 font-mono mt-0.5 block">{formatCurrency(netSalaryToPay)}</strong>
              </div>
            </div>
          </div>

          {/* SEKMELER */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("leaves")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "leaves"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Palmtree size={15} />
              İzin Geçmişi
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "leaves" ? "bg-blue-100 text-blue-700" : "bg-surface text-text-muted"}`}>
                {leaves.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("advances")}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                activeTab === "advances"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Wallet size={15} />
              Avans Geçmişi
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "advances" ? "bg-amber-100 text-amber-700" : "bg-surface text-text-muted"}`}>
                {advances.length}
              </span>
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
              Bordro
            </button>
          </div>

          {/* ── SEKME: İZİN GEÇMİŞİ ── */}
          {activeTab === "leaves" && (
            <div className="space-y-4">

              {/* İzin Özet Kartları */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                  <CalendarDays size={20} className="text-blue-500 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-blue-700 uppercase mb-1">Toplam Hak</div>
                  <div className="text-2xl font-black text-blue-800">{totalLeaveEntitlement || "—"}</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">gün</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                  <TrendingDown size={20} className="text-rose-500 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-rose-700 uppercase mb-1">Kullanılan</div>
                  <div className="text-2xl font-black text-rose-700">{usedLeaveDays}</div>
                  <div className="text-[10px] text-rose-600 mt-0.5">gün ({leaveGroups.length} dönem)</div>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${remainingLeaveDays > 0 ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                  <Palmtree size={20} className={`mx-auto mb-1 ${remainingLeaveDays > 0 ? "text-emerald-500" : "text-gray-400"}`} />
                  <div className={`text-[10px] font-bold uppercase mb-1 ${remainingLeaveDays > 0 ? "text-emerald-700" : "text-gray-500"}`}>Kalan</div>
                  <div className={`text-2xl font-black ${remainingLeaveDays > 0 ? "text-emerald-800" : "text-gray-500"}`}>{remainingLeaveDays}</div>
                  <div className={`text-[10px] mt-0.5 ${remainingLeaveDays > 0 ? "text-emerald-600" : "text-gray-400"}`}>gün bakiye</div>
                </div>
              </div>

              {/* Yeni İzin Formu */}
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
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">Gün Sayısı *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="1"
                      value={leaveDays}
                      onChange={(e) => setLeaveDays(e.target.value)}
                      required
                      className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">İzin Sebebi</label>
                    <input
                      type="text"
                      placeholder="Memleket, sağlık, yıllık..."
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

              {/* İzin Geçmişi - Aylara Göre Accordion */}
              {loading ? (
                <div className="flex items-center justify-center py-10 text-text-muted">
                  <Loader2 size={20} className="animate-spin mr-2" /> Yükleniyor…
                </div>
              ) : leaveGroups.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-sm">
                  <Palmtree size={32} className="mx-auto mb-2 opacity-30" />
                  Henüz kayıtlı izin hareketi bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {leaveGroups.map(([key, items]) => {
                    const monthTotal = items.reduce((s, i) => s + (Number(i.days) || 0), 0);
                    const isOpen = !!openMonths[key];
                    return (
                      <div key={key} className="border border-border rounded-xl overflow-hidden">
                        {/* Ay başlığı */}
                        <button
                          type="button"
                          onClick={() => toggleMonth(key)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-surface/60 hover:bg-surface transition text-left"
                        >
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown size={15} className="text-blue-600" /> : <ChevronRight size={15} className="text-text-muted" />}
                            <span className="text-sm font-bold text-text">{monthLabel(key)}</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                              {items.length} kayıt
                            </span>
                          </div>
                          <span className="text-base font-black text-blue-700">
                            {monthTotal} Gün
                          </span>
                        </button>
                        {/* İzin satırları */}
                        {isOpen && (
                          <table className="w-full text-left text-xs">
                            <thead className="bg-white border-t border-border">
                              <tr className="text-text-muted font-semibold uppercase">
                                <th className="py-2 px-4">Tarih</th>
                                <th className="py-2 px-4">Sebep / Açıklama</th>
                                <th className="py-2 px-4 text-center">Gün</th>
                                <th className="py-2 px-4 text-center w-10">Sil</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {items.map((l) => (
                                <tr key={l.id} className="hover:bg-blue-50/30">
                                  <td className="py-2.5 px-4 font-semibold text-text">{formatDate(l.transaction_date)}</td>
                                  <td className="py-2.5 px-4 text-text-muted">{l.description || <span className="italic opacity-50">—</span>}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 font-black text-xs px-2.5 py-1 rounded-lg min-w-[2.5rem]">
                                      {l.days} Gün
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
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
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Kümülatif özet şeridi */}
              {leaveGroups.length > 0 && (
                <div className="flex items-center justify-between bg-blue-900 text-white rounded-2xl px-5 py-3 text-sm font-bold">
                  <span>Toplam Kullanılan İzin:</span>
                  <span className="text-lg font-black text-blue-200">{usedLeaveDays} Gün</span>
                  <span className="text-blue-300 text-xs">→ Kalan: <strong className="text-white text-base">{remainingLeaveDays} Gün</strong></span>
                </div>
              )}
            </div>
          )}

          {/* ── SEKME: AVANS GEÇMİŞİ ── */}
          {activeTab === "advances" && (
            <div className="space-y-4">

              {/* Avans Özet Kartları */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <CalendarDays size={20} className="text-amber-500 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-amber-700 uppercase mb-1">Bu Ay</div>
                  <div className="text-lg font-black text-amber-800">{formatCurrency(thisMonthAdvances)}</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">çekildi</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                  <TrendingDown size={20} className="text-rose-500 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-rose-700 uppercase mb-1">Toplam Avans</div>
                  <div className="text-lg font-black text-rose-700">{formatCurrency(totalAdvances)}</div>
                  <div className="text-[10px] text-rose-600 mt-0.5">{advances.length} kayıt</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <Wallet size={20} className="text-emerald-500 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Ödenecek Kalan</div>
                  <div className="text-lg font-black text-emerald-800">{formatCurrency(netSalaryToPay)}</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">maaştan sonra</div>
                </div>
              </div>

              {/* Yeni Avans Formu */}
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
                      className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1">Neden / Açıklama</label>
                    <input
                      type="text"
                      placeholder="Acil ihtiyaç, bayram harçlığı..."
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

              {/* Avans Geçmişi - Aylara Göre Accordion */}
              {loading ? (
                <div className="flex items-center justify-center py-10 text-text-muted">
                  <Loader2 size={20} className="animate-spin mr-2" /> Yükleniyor…
                </div>
              ) : advanceGroups.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-sm">
                  <Wallet size={32} className="mx-auto mb-2 opacity-30" />
                  Henüz kayıtlı avans hareketi bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {advanceGroups.map(([key, items]) => {
                    const monthTotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
                    const isOpen = !!openMonths[key];
                    return (
                      <div key={key} className="border border-border rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleMonth(key)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-surface/60 hover:bg-surface transition text-left"
                        >
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown size={15} className="text-amber-600" /> : <ChevronRight size={15} className="text-text-muted" />}
                            <span className="text-sm font-bold text-text">{monthLabel(key)}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                              {items.length} kayıt
                            </span>
                          </div>
                          <span className="text-base font-black text-amber-700">
                            {formatCurrency(monthTotal)}
                          </span>
                        </button>
                        {isOpen && (
                          <table className="w-full text-left text-xs">
                            <thead className="bg-white border-t border-border">
                              <tr className="text-text-muted font-semibold uppercase">
                                <th className="py-2 px-4">Tarih</th>
                                <th className="py-2 px-4">Neden / Açıklama</th>
                                <th className="py-2 px-4 text-right">Tutar</th>
                                <th className="py-2 px-4 text-center w-10">Sil</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {items.map((adv) => (
                                <tr key={adv.id} className="hover:bg-amber-50/30">
                                  <td className="py-2.5 px-4 font-semibold text-text">{formatDate(adv.transaction_date)}</td>
                                  <td className="py-2.5 px-4 text-text-muted">{adv.description || <span className="italic opacity-50">—</span>}</td>
                                  <td className="py-2.5 px-4 text-right font-mono font-black text-rose-700">
                                    {formatCurrency(adv.amount)}
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
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
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Kümülatif özet şeridi */}
              {advanceGroups.length > 0 && (
                <div className="flex items-center justify-between bg-amber-900 text-white rounded-2xl px-5 py-3 text-sm font-bold">
                  <span>Toplam Çekilen Avans:</span>
                  <span className="text-lg font-black text-amber-200">{formatCurrency(totalAdvances)}</span>
                  <span className="text-amber-300 text-xs">→ Net Kalan: <strong className="text-white text-base">{formatCurrency(netSalaryToPay)}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* ── SEKME: BORDRO ── */}
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

                {/* İzin durumu bilgi kartı */}
                <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                  <Palmtree size={18} className="text-blue-500 shrink-0" />
                  <div className="text-xs text-blue-900">
                    <span className="font-semibold">{usedLeaveDays} gün izin kullandı</span>
                    {totalLeaveEntitlement > 0 && (
                      <span className="text-blue-600"> / {totalLeaveEntitlement} günlük haktan</span>
                    )}
                    {remainingLeaveDays > 0 && (
                      <span className="font-bold text-blue-800"> → Bakiye: {remainingLeaveDays} gün</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
