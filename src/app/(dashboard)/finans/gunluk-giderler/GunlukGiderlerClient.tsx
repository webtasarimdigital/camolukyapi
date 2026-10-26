"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Coins,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Truck,
  UserCheck,
  Receipt,
  Filter,
  DollarSign,
  Coffee,
  Info,
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";
import {
  CustomColumnButton,
  CustomColumnCell,
} from "@/components/ui/CustomColumnManager";
import { CustomColumn } from "@/lib/data/custom-columns-actions";
import {
  saveDailyExpense,
  deleteDailyExpense,
  toggleDailyExpenseStatus,
} from "./actions";

interface GunlukGiderlerClientProps {
  initialExpenses: any[];
  customColumns: CustomColumn[];
}

const EXPENSE_CATEGORIES = [
  "Ofis & Mutfak",
  "Yemek & İkram",
  "Kargo & Kurye",
  "Hırdavat & Sarf Malzeme",
  "Tamir & Bakım",
  "Yakıt & Akaryakıt",
  "Personel Masrafı",
  "Kırtasiye",
  "Diğer Genel Gider",
];

export function GunlukGiderlerClient({
  initialExpenses,
  customColumns,
}: GunlukGiderlerClientProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [cols, setCols] = useState(customColumns);
  const [filterSource, setFilterSource] = useState<"all" | "manual" | "fuel" | "advance">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "odenen" | "bekleyen">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<any>({
    expense_date: new Date().toISOString().split("T")[0],
    category: "Ofis & Mutfak",
    description: "",
    amount: 0,
    status: "Ödendi",
    payment_method: "Nakit",
    notes: "",
  });

  // Filtered List
  const filtered = expenses.filter((e) => {
    if (filterSource === "manual" && e.source_type !== "manual") return false;
    if (filterSource === "fuel" && e.source_type !== "vehicle_fuel") return false;
    if (filterSource === "advance" && e.source_type !== "employee_advance") return false;
    if (filterStatus === "odenen" && e.status !== "Ödendi") return false;
    if (filterStatus === "bekleyen" && e.status === "Ödendi") return false;
    return true;
  });

  // Total Volumes (Fuel & Advance dynamically increase total as requested!)
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const fuelExpense = expenses
    .filter((e) => e.source_type === "vehicle_fuel")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const advanceExpense = expenses
    .filter((e) => e.source_type === "employee_advance")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const manualExpense = expenses
    .filter((e) => e.source_type === "manual")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await saveDailyExpense(formData);
    if (res.success && res.data) {
      setExpenses((prev) => [
        { ...res.data, is_manual: true, source_type: "manual" },
        ...prev.filter((item) => item.id !== res.data.id),
      ]);
      setIsModalOpen(false);
      setFilterSource("all");
      setFormData({
        expense_date: new Date().toISOString().split("T")[0],
        category: "Ofis & Mutfak",
        description: "",
        amount: 0,
        status: "Ödendi",
        payment_method: "Nakit",
        notes: "",
      });
    } else {
      alert(res.error || "Gider kaydedilemedi");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu gider kaydını silmek istediğinize emin misiniz?")) return;
    const res = await deleteDailyExpense(id);
    if (res.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } else {
      alert(res.error);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === "Ödendi" ? "Ödenmedi" : "Ödendi";
    const res = await toggleDailyExpenseStatus(id, nextStatus as any);
    if (res.success) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e))
      );
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Başlık ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Coins className="text-brand-gold" />
            Günlük Giderler
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Şirket günlük harcamaları, araç akaryakıt masrafları ve personel avansları tek havuzda toplanır.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CustomColumnButton
            tableId="daily_expenses"
            revalidateUrl="/finans/gunluk-giderler"
            existingColumns={cols}
            onColumnAdded={(col) => setCols((prev) => [...prev, col])}
            onColumnDeleted={(key) => setCols((prev) => prev.filter((c) => c.column_key !== key))}
          />

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
          >
            <Plus size={16} />
            <span>Gider Ekle</span>
          </button>
        </div>
      </div>

      {/* KPI Kartları - Benzin ve Avans Toplamı Büyütür */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Coins size={14} className="text-brand-gold" />
            Genel Toplam Gider
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(totalExpense)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {expenses.length} Toplam Harcama Kalemi
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
            <Truck size={14} />
            Araç Akaryakıt (Otomatik)
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(fuelExpense)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {expenses.filter((e) => e.source_type === "vehicle_fuel").length} Fiş / Dolum
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
            <UserCheck size={14} />
            Personel Avansları (Otomatik)
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(advanceExpense)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {expenses.filter((e) => e.source_type === "employee_advance").length} Avans Ödemesi
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <Receipt size={14} />
            Manuel Firma Giderleri
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(manualExpense)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {expenses.filter((e) => e.source_type === "manual").length} Ofis & Genel Masraf
          </span>
        </div>
      </div>

      {/* Filtre Barı */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter size={13} /> Kaynak:
          </span>
          <button
            type="button"
            onClick={() => setFilterSource("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterSource === "all" ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tüm Giderler ({expenses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSource("fuel")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterSource === "fuel" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ⛽ Akaryakıt & Benzin ({expenses.filter((e) => e.source_type === "vehicle_fuel").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSource("advance")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterSource === "advance" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            👤 Personel Avansı ({expenses.filter((e) => e.source_type === "employee_advance").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSource("manual")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterSource === "manual" ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Ofis & Manuel Giderler ({expenses.filter((e) => e.source_type === "manual").length})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1">Durum:</span>
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              filterStatus === "all" ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("odenen")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              filterStatus === "odenen" ? "bg-emerald-100 text-emerald-800" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Ödenenler
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("bekleyen")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              filterStatus === "bekleyen" ? "bg-rose-100 text-rose-800" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Ödenmeyenler
          </button>
        </div>
      </div>

      {/* Gider Tablosu */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Coins size={40} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Gider kaydı bulunamadı</p>
            <p className="text-xs text-slate-400 mt-1">
              Sağ üstteki "+ Gider Ekle" butonuna basarak ilk harcamanızı kaydedebilirsiniz.
            </p>
          </div>
        ) : (
          <InteractiveTable tableId="daily-expenses-main-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Kaynak</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Açıklama</th>
                  <th className="py-3 px-4 text-right">Fiyat / Tutar</th>
                  <th className="py-3 px-4 text-center">Ödeme Yöntemi</th>
                  <th className="py-3 px-4 text-center">Durum</th>
                  <th className="py-3 px-4">Notlar</th>
                  {/* Özel Sütunlar */}
                  {cols.map((col) => (
                    <th key={col.column_key} className="py-3 px-4">
                      {col.column_name}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e: any) => {
                  const isPaid = e.status === "Ödendi";
                  const isFuel = e.source_type === "vehicle_fuel";
                  const isAdvance = e.source_type === "employee_advance";

                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {formatDate(e.expense_date)}
                      </td>
                      <td className="py-3 px-4">
                        {isFuel ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            <Truck size={11} />
                            Araç Yakıtı
                          </span>
                        ) : isAdvance ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
                            <UserCheck size={11} />
                            Personel Avansı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                            <Receipt size={11} />
                            Manuel Gider
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {e.category}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {e.description}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">
                        {e.payment_method || "Nakit"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(e.id, e.status)}
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
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={e.notes || ""}>
                        {e.notes || "—"}
                      </td>
                      {/* Özel Sütunlar */}
                      {cols.map((col) => (
                        <td key={col.column_key} className="py-3 px-4">
                          <CustomColumnCell
                            tableName="daily_expenses"
                            rowId={e.id}
                            column={col}
                            initialValue={e.custom_fields?.[col.column_key]}
                            revalidateUrl="/finans/gunluk-giderler"
                          />
                        </td>
                      ))}
                      <td className="py-3 px-4 text-center">
                        {e.is_manual ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                            title="Gideri Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <span
                            className="text-[10px] text-slate-400 font-semibold"
                            title="Bu harcama araç veya personel sayfasından otomatik aktarılmıştır"
                          >
                            Otomatik
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </InteractiveTable>
        )}
      </div>

      {/* YENİ GİDER EKLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-border animate-in fade-in zoom-in duration-150 my-8">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-border">
              <Coins size={20} className="text-brand-gold" />
              Yeni Günlük Gider Ekle
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gider Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gider Açıklaması *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ofis mutfak çay kahve alışverişi, kargo bedeli..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fiyat / Tutar (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="750"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold text-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeme Yöntemi</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                  >
                    <option value="Nakit">Nakit</option>
                    <option value="Kredi Kartı">Kredi Kartı</option>
                    <option value="Havale/EFT">Havale / EFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Durum</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                >
                  <option value="Ödendi">Ödendi</option>
                  <option value="Ödenmedi">Ödenmedi (Bekleyen)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notlar</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Fiş no veya detaylı not..."
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-brand-navy bg-brand-gold hover:bg-brand-gold-light rounded-xl transition shadow-xs"
                >
                  Gideri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
