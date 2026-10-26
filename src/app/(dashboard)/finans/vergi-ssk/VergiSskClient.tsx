"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  Filter,
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";
import {
  CustomColumnButton,
  CustomColumnCell,
} from "@/components/ui/CustomColumnManager";
import { CustomColumn } from "@/lib/data/custom-columns-actions";
import { saveTaxRecord, deleteTaxRecord, toggleTaxRecordStatus } from "./actions";

interface VergiSskClientProps {
  initialRecords: any[];
  customColumns: CustomColumn[];
}

const TAX_TYPES = [
  "KDV",
  "Muhtasar (Stopaj)",
  "Geçici Vergi",
  "Kurumlar Vergisi",
  "SGK Primi",
  "Bağkur",
  "Damga Vergisi",
  "MTV (Motorlu Taşıtlar)",
  "Diğer",
];

export function VergiSskClient({ initialRecords, customColumns }: VergiSskClientProps) {
  const [records, setRecords] = useState(initialRecords);
  const [cols, setCols] = useState(customColumns);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<any>({
    period: new Date().toISOString().slice(0, 7), // '2026-10'
    tax_type: "KDV",
    accrual_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    amount: 0,
    status: "Ödenmedi",
    notes: "",
  });

  const filteredRecords = records.filter((r) => {
    if (selectedType !== "all" && r.tax_type !== selectedType) return false;
    if (selectedStatus === "odenen" && r.status !== "Ödendi") return false;
    if (selectedStatus === "bekleyen" && r.status === "Ödendi") return false;
    return true;
  });

  const totalAmount = records.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const pendingAmount = records
    .filter((r) => r.status !== "Ödendi")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const paidAmount = records
    .filter((r) => r.status === "Ödendi")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await saveTaxRecord(formData);
    if (res.success && res.data) {
      setRecords((prev) => [res.data, ...prev.filter((r) => r.id !== res.data.id)]);
      setIsModalOpen(false);
      setFormData({
        period: new Date().toISOString().slice(0, 7),
        tax_type: "KDV",
        accrual_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        amount: 0,
        status: "Ödenmedi",
        notes: "",
      });
    } else {
      alert(res.error || "Vergi/SSK kaydı kaydedilemedi");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    const res = await deleteTaxRecord(id);
    if (res.success) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === "Ödendi" ? "Ödenmedi" : "Ödendi";
    const res = await toggleTaxRecordStatus(id, nextStatus as any);
    if (res.success) {
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
      );
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Başlık ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="text-brand-gold" />
            Vergi ve SSK Girişleri
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            KDV, Muhtasar, Geçici Vergi, Kurumlar Vergisi ve SGK Prim tahakkuk ve ödeme takibi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CustomColumnButton
            tableId="tax_records"
            revalidateUrl="/finans/vergi-ssk"
            existingColumns={cols}
            onColumnAdded={(col) => setCols((prev) => [...prev, col])}
            onColumnDeleted={(key) => setCols((prev) => prev.filter((c) => c.column_key !== key))}
          />

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
          >
            <Plus size={16} />
            <span>+ Yeni Vergi / SSK Girişi</span>
          </button>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <FileSpreadsheet size={14} className="text-brand-gold" />
            Toplam Vergi / SSK Tahakkuku
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalAmount)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {records.length} Adet Beyanname & Tahakkuk
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
            <Clock size={14} />
            Ödenecek / Bekleyen Vergi & SSK
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {formatCurrency(pendingAmount)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {records.filter((r) => r.status !== "Ödendi").length} Adet Vadesi Bekleyen
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            Ödenen Vergi & Primler
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(paidAmount)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {records.filter((r) => r.status === "Ödendi").length} Adet Ödenmiş Kayıt
          </span>
        </div>
      </div>

      {/* Filtre Barı */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter size={13} /> Tür:
          </span>
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedType === "all" ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tümü
          </button>
          {TAX_TYPES.slice(0, 6).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedType === type ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1">Durum:</span>
          <button
            type="button"
            onClick={() => setSelectedStatus("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              selectedStatus === "all" ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("bekleyen")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              selectedStatus === "bekleyen" ? "bg-amber-100 text-amber-800" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Ödenmeyenler
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("odenen")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              selectedStatus === "odenen" ? "bg-emerald-100 text-emerald-800" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Ödenenler
          </button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileSpreadsheet size={40} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Vergi veya SSK kaydı bulunamadı</p>
            <p className="text-xs text-slate-400 mt-1">
              Sağ üstteki "+ Yeni Vergi / SSK Girişi" butonuna tıklayarak ilk tahakkuk kaydını ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          <InteractiveTable tableId="tax-records-main-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Dönem (Ay)</th>
                  <th className="py-3 px-4">Vergi / SSK Türü</th>
                  <th className="py-3 px-4">Tahakkuk Tarihi</th>
                  <th className="py-3 px-4">Son Ödeme Tarihi</th>
                  <th className="py-3 px-4 text-right">Ödenecek Tutar</th>
                  <th className="py-3 px-4 text-center">Durum</th>
                  <th className="py-3 px-4">Ödeme Tarihi</th>
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
                {filteredRecords.map((r: any) => {
                  const isPaid = r.status === "Ödendi";

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {r.period}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
                          {r.tax_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {r.accrual_date ? formatDate(r.accrual_date) : "—"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatDate(r.due_date)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(r.id, r.status)}
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
                      <td className="py-3 px-4 text-slate-500">
                        {r.payment_date ? formatDate(r.payment_date) : "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={r.notes || ""}>
                        {r.notes || "—"}
                      </td>
                      {/* Özel Sütunlar */}
                      {cols.map((col) => (
                        <td key={col.column_key} className="py-3 px-4">
                          <CustomColumnCell
                            tableName="tax_records"
                            rowId={r.id}
                            column={col}
                            initialValue={r.custom_fields?.[col.column_key]}
                            revalidateUrl="/finans/vergi-ssk"
                          />
                        </td>
                      ))}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Kaydı Sil"
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

      {/* YENİ GİRİŞ MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-border animate-in fade-in zoom-in duration-150 my-8">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-border">
              <FileSpreadsheet size={20} className="text-brand-gold" />
              Vergi veya SSK Girişi Ekle
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dönem (Yıl-Ay) *</label>
                  <input
                    type="month"
                    required
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vergi / SSK Türü *</label>
                  <select
                    value={formData.tax_type}
                    onChange={(e) => setFormData({ ...formData, tax_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                  >
                    {TAX_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahakkuk Tarihi</label>
                  <input
                    type="date"
                    value={formData.accrual_date}
                    onChange={(e) => setFormData({ ...formData, accrual_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Son Ödeme Tarihi *</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ödenecek Tutar (₺) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="34500"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Durum</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                >
                  <option value="Ödenmedi">Ödenmedi (Vadesi Bekliyor)</option>
                  <option value="Ödendi">Ödendi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notlar / Açıklama</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Beyanname no, tahakkuk fiş no veya açıklama..."
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
