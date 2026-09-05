"use client";

import { useState } from "react";
import { addPartnerMovement } from "./actions";
import { MOVEMENT_CATEGORIES } from "./types";
import { toast } from "sonner";
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Handshake,
  TrendingUp,
  Loader2,
  Calendar,
  Banknote,
  FileText,
} from "lucide-react";

export default function AddMovementModal({
  partners,
  defaultPartnerId,
  onClose,
}: {
  partners: Array<{ id: string; name: string }>;
  defaultPartnerId?: string;
  onClose: () => void;
}) {
  const [partnerId, setPartnerId] = useState(
    defaultPartnerId || (partners.length > 0 ? partners[0].id : "")
  );
  const [movementType, setMovementType] = useState<
    "partner_to_company" | "company_to_partner" | "partner_to_partner" | "profit_distribution"
  >("partner_to_company");
  const [targetPartnerId, setTargetPartnerId] = useState(
    partners.find((p) => p.id !== partnerId)?.id || ""
  );
  const [category, setCategory] = useState("akaryakit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [docNo, setDocNo] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedCategoryDef = MOVEMENT_CATEGORIES.find((c) => c.key === category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Lütfen geçerli bir tutar girin.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("partner_id", partnerId);
      formData.set("movement_type", movementType);
      formData.set("target_partner_id", targetPartnerId);
      formData.set("amount", amount);
      formData.set("transaction_date", transactionDate);
      formData.set("category", category);
      formData.set(
        "reason",
        reason.trim() || selectedCategoryDef?.label || "Cari Hareket"
      );
      formData.set("notes", notes);
      formData.set("doc_no", docNo);

      await addPartnerMovement(formData);
      toast.success("Cari hareket başarıyla kaydedildi!");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "İşlem kaydedilemedi";
      toast.error("Hata: " + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Handshake className="text-amber-600" size={20} />
              Yeni Ortak Finans Hareketi Ekle
            </h2>
            <p className="text-xs text-text-muted">
              Şirket resmi muhasebesinden bağımsız ortak cari kaydı
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-gray-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Hareket Tipi Seçimi */}
          <div>
            <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
              İşlem Tipi *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMovementType("partner_to_company")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  movementType === "partner_to_company"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                    : "border-border hover:bg-surface text-text-muted"
                }`}
              >
                <ArrowUpRight className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <div className="text-xs font-bold text-emerald-800">
                    Ortak Firmaya Borç Verdi
                  </div>
                  <div className="text-[11px] text-emerald-700/80">
                    Ortağın alacağı, firmanın borcu artar
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMovementType("company_to_partner")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  movementType === "company_to_partner"
                    ? "border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20"
                    : "border-border hover:bg-surface text-text-muted"
                }`}
              >
                <ArrowDownLeft className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <div className="text-xs font-bold text-rose-800">
                    Firma Ortağa Para Verdi
                  </div>
                  <div className="text-[11px] text-rose-700/80">
                    Borç geri ödemesi veya şahsi avans
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMovementType("partner_to_partner")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  movementType === "partner_to_partner"
                    ? "border-cyan-600 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20"
                    : "border-border hover:bg-surface text-text-muted"
                }`}
              >
                <Handshake className="text-cyan-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <div className="text-xs font-bold text-cyan-800">
                    Ortaklar Arası Şahsi Borç
                  </div>
                  <div className="text-[11px] text-cyan-700/80">
                    Ahmet ↔ Mehmet şahsi borçlaşma
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMovementType("profit_distribution")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  movementType === "profit_distribution"
                    ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20"
                    : "border-border hover:bg-surface text-text-muted"
                }`}
              >
                <TrendingUp className="text-purple-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <div className="text-xs font-bold text-purple-800">
                    Bağımsız Kâr Dağıtımı
                  </div>
                  <div className="text-[11px] text-purple-700/80">
                    Projeden bağımsız kâr payı
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Ortak Seçimi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                {movementType === "partner_to_partner" ? "Borç Veren Ortak *" : "İlgili Ortak *"}
              </label>
              <select
                value={partnerId}
                onChange={(e) => {
                  setPartnerId(e.target.value);
                  const other = partners.find((p) => p.id !== e.target.value);
                  if (other) setTargetPartnerId(other.id);
                }}
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text outline-none focus:border-brand-gold transition"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {movementType === "partner_to_partner" && (
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Borcu Alan Ortak *
                </label>
                <select
                  value={targetPartnerId}
                  onChange={(e) => setTargetPartnerId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text outline-none focus:border-brand-gold transition"
                >
                  {partners
                    .filter((p) => p.id !== partnerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Tutar ve Tarih */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <Banknote size={14} className="text-emerald-600" /> Tutar (₺) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Örn: 50000"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text outline-none focus:border-brand-gold transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-text-muted" /> İşlem Tarihi *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand-gold transition"
              />
            </div>
          </div>

          {/* Borç Sebebi Kategorisi */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Borç Sebebi / Kategori *
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-border rounded-xl bg-surface/50">
              {MOVEMENT_CATEGORIES.map((cat) => {
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setCategory(cat.key);
                      if (!reason || MOVEMENT_CATEGORIES.some((c) => c.label === reason)) {
                        setReason(cat.label);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-brand-navy text-white shadow-sm"
                        : "bg-white text-text hover:bg-gray-100 border border-border"
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detaylı Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-text-muted" /> Açıklama / Borç Nedeni
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: Kamyonet mazotu ve şantiye teslim nakliyesi"
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand-gold transition"
            />
          </div>

          {/* İsteğe Bağlı Ek Notlar */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Özel Notlar (İsteğe Bağlı)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Geri ödeme planı, anlaşma detayları..."
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-text outline-none focus:border-brand-gold transition"
            />
          </div>

          {/* Butonlar */}
          <div className="pt-2 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text bg-surface border border-border hover:bg-gray-200 transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-navy hover:bg-brand-navy-2 text-white flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Kaydediliyor...
                </>
              ) : (
                "Hareketi Kaydet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
