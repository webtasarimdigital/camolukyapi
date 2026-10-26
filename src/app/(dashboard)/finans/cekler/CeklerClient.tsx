"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
  Building,
  Check,
  XCircle,
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";
import {
  CustomColumnButton,
  CustomColumnCell,
} from "@/components/ui/CustomColumnManager";
import { CustomColumn } from "@/lib/data/custom-columns-actions";
import { saveCheck, deleteCheck, toggleCheckStatus } from "./actions";

interface CeklerClientProps {
  initialChecks: any[];
  customColumns: CustomColumn[];
}

export function CeklerClient({ initialChecks, customColumns }: CeklerClientProps) {
  const [checks, setChecks] = useState(initialChecks);
  const [cols, setCols] = useState(customColumns);
  const [filterType, setFilterType] = useState<"all" | "verilen" | "alinan">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "bekleyen" | "odenen">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<any>({
    type: "verilen",
    check_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    company_name: "",
    bank_name: "",
    branch_name: "",
    account_no: "",
    check_no: "",
    amount: 0,
    status: "Ödenmedi",
    notes: "",
  });

  // KPI Calculations
  const filteredChecks = checks.filter((c) => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatus === "bekleyen" && (c.status === "Ödendi" || c.status === "Tahsil Edildi")) return false;
    if (filterStatus === "odenen" && c.status !== "Ödendi" && c.status !== "Tahsil Edildi") return false;
    return true;
  });

  const totalVolume = checks.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const pendingVolume = checks
    .filter((c) => c.status !== "Ödendi" && c.status !== "Tahsil Edildi")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const paidVolume = checks
    .filter((c) => c.status === "Ödendi" || c.status === "Tahsil Edildi")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await saveCheck(formData);
    if (res.success && res.data) {
      setChecks((prev) => [res.data, ...prev.filter((c) => c.id !== res.data.id)]);
      setIsModalOpen(false);
      setFormData({
        type: "verilen",
        check_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        company_name: "",
        bank_name: "",
        branch_name: "",
        account_no: "",
        check_no: "",
        amount: 0,
        status: "Ödenmedi",
        notes: "",
      });
    } else {
      alert(res.error || "Çek kaydedilemedi");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu çeki silmek istediğinize emin misiniz?")) return;
    const res = await deleteCheck(id);
    if (res.success) {
      setChecks((prev) => prev.filter((c) => c.id !== id));
    }
  }

  async function handleStatusChange(checkId: string, newStatus: any) {
    const res = await toggleCheckStatus(checkId, newStatus);
    if (res.success) {
      setChecks((prev) =>
        prev.map((c) => (c.id === checkId ? { ...c, status: newStatus } : c))
      );
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Başlık ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="text-brand-gold" />
            Çek Takibi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Verilen (şirketimizin) ve alınan (müşteri) çeklerin vadeleri, banka ve ödeme durumları.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CustomColumnButton
            tableId="checks"
            revalidateUrl="/finans/cekler"
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
            <span>+ Yeni Çek Girişi</span>
          </button>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Receipt size={14} className="text-brand-gold" />
            Toplam Çek Portföyü
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalVolume)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {checks.length} Adet Toplam Kayıtlı Çek
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
            <Clock size={14} />
            Vadesi Bekleyen Çekler
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {formatCurrency(pendingVolume)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {checks.filter((c) => c.status !== "Ödendi" && c.status !== "Tahsil Edildi").length} Adet Bekleyen Çek
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            Ödenen / Tahsil Edilen
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(paidVolume)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {checks.filter((c) => c.status === "Ödendi" || c.status === "Tahsil Edildi").length} Adet Tamamlanan Çek
          </span>
        </div>
      </div>

      {/* Filtre Butonları */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter size={13} /> Tür:
          </span>
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === "all" ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Tümü ({checks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("verilen")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === "verilen" ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Verilen Çekler ({checks.filter((c) => c.type === "verilen").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("alinan")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === "alinan" ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Alınan Müşteri Çekleri ({checks.filter((c) => c.type === "alinan").length})
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
            onClick={() => setFilterStatus("bekleyen")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              filterStatus === "bekleyen" ? "bg-amber-100 text-amber-800" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Bekleyenler
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("odenen")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
              filterStatus === "odenen" ? "bg-emerald-100 text-emerald-800" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Ödenen / Tahsil Olanlar
          </button>
        </div>
      </div>

      {/* Çekler Tablosu */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {filteredChecks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt size={40} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Kayıtlı çek bulunamadı</p>
            <p className="text-xs text-slate-400 mt-1">
              Sağ üstteki "+ Yeni Çek Girişi" butonuna tıklayarak ilk çek kaydını ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          <InteractiveTable tableId="checks-main-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Çek No</th>
                  <th className="py-3 px-4">Tür</th>
                  <th className="py-3 px-4">Firma / Keşideci</th>
                  <th className="py-3 px-4">Banka & Şube</th>
                  <th className="py-3 px-4">Hesap No</th>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Vade Tarihi</th>
                  <th className="py-3 px-4 text-right">Tutar</th>
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
                {filteredChecks.map((check: any) => {
                  const isPaid = check.status === "Ödendi" || check.status === "Tahsil Edildi";
                  const isBounce = check.status === "Karşılıksız";

                  return (
                    <tr key={check.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold font-mono text-slate-900">
                        {check.check_no}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            check.type === "verilen"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {check.type === "verilen" ? "Verilen Çek" : "Alınan Çek"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {check.company_name}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{check.bank_name}</div>
                        {check.branch_name && (
                          <div className="text-[11px] text-slate-400">{check.branch_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {check.account_no || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(check.check_date)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatDate(check.due_date)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(check.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <select
                          value={check.status}
                          onChange={(e) => handleStatusChange(check.id, e.target.value)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-hidden transition ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : isBounce
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          <option value="Ödenmedi">Ödenmedi (Bekliyor)</option>
                          <option value="Ödendi">Ödendi</option>
                          <option value="Tahsil Edildi">Tahsil Edildi</option>
                          <option value="Karşılıksız">Karşılıksız</option>
                          <option value="Portföyde">Portföyde</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={check.notes || ""}>
                        {check.notes || "—"}
                      </td>
                      {/* Özel Sütunlar */}
                      {cols.map((col) => (
                        <td key={col.column_key} className="py-3 px-4">
                          <CustomColumnCell
                            tableName="checks"
                            rowId={check.id}
                            column={col}
                            initialValue={check.custom_fields?.[col.column_key]}
                            revalidateUrl="/finans/cekler"
                          />
                        </td>
                      ))}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(check.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Çeki Sil"
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

      {/* YENİ ÇEK EKLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-border animate-in fade-in zoom-in duration-150 my-8">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-border">
              <Receipt size={20} className="text-brand-gold" />
              Yeni Çek Girişi
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Çek Türü *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "verilen" })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formData.type === "verilen"
                        ? "bg-rose-50 text-rose-700 border-rose-400"
                        : "bg-slate-50 text-slate-600 border-border"
                    }`}
                  >
                    Verilen Çek (Bizim Çekimiz)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "alinan" })}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formData.type === "alinan"
                        ? "bg-blue-50 text-blue-700 border-blue-400"
                        : "bg-slate-50 text-slate-600 border-border"
                    }`}
                  >
                    Alınan Çek (Müşteri Çeki)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Çek No *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 984512"
                    value={formData.check_no}
                    onChange={(e) => setFormData({ ...formData, check_no: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Firma / Lehtar *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: ABC Yapı Sanayi Ltd."
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Banka Adı *</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Garanti BBVA"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Şube</label>
                  <input
                    type="text"
                    placeholder="Örn: İkitelli"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hesap No</label>
                  <input
                    type="text"
                    placeholder="Örn: 6284910"
                    value={formData.account_no}
                    onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Çek Tutarı (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="125000"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giriş Tarihi</label>
                  <input
                    type="date"
                    value={formData.check_date}
                    onChange={(e) => setFormData({ ...formData, check_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vade Tarihi *</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Durum</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                >
                  <option value="Ödenmedi">Ödenmedi (Vadesi Bekliyor)</option>
                  <option value="Ödendi">Ödendi</option>
                  <option value="Tahsil Edildi">Tahsil Edildi</option>
                  <option value="Karşılıksız">Karşılıksız</option>
                  <option value="Portföyde">Portföyde</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notlar / Açıklama</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Fatura referansı veya ek notlar..."
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
                  Çeki Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
