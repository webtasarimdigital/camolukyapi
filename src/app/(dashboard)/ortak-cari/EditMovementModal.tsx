"use client";

import { useState } from "react";
import { updatePartnerMovement } from "./actions";
import { MOVEMENT_CATEGORIES } from "./types";
import { toast } from "sonner";
import { 
  X, 
  Loader2, 
  CheckCircle2, 
  Banknote, 
  Calendar, 
  FileText, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gem 
} from "lucide-react";

export function EditMovementModal({
  movement,
  partnerName,
  onClose,
}: {
  movement: {
    id: string;
    amount: number;
    transaction_date: string;
    reason: string;
    notes?: string | null;
    direction: string;
    doc_no?: string | null;
  };
  partnerName: string;
  onClose: () => void;
}) {
  let meta: any = {};
  try {
    meta = movement.notes ? JSON.parse(movement.notes) : {};
  } catch {
    meta = {};
  }

  const initialType = (movement.doc_no === "SAHSI_GELIR" || meta.is_personal_income)
    ? "sahsi_gelir"
    : movement.direction === "partner_to_company"
      ? "partner_to_company"
      : "company_to_partner";

  const [movementType, setMovementType] = useState<
    "partner_to_company" | "company_to_partner" | "sahsi_gelir"
  >(initialType);

  const [amount, setAmount] = useState(String(movement.amount || ""));
  const [transactionDate, setTransactionDate] = useState(
    movement.transaction_date || new Date().toISOString().split("T")[0]
  );
  const [category, setCategory] = useState(meta.category || (initialType === "sahsi_gelir" ? "kira" : "diger"));
  const [reason, setReason] = useState(movement.reason || "");
  const [notes, setNotes] = useState(meta.custom_notes || "");
  const [loading, setLoading] = useState(false);

  const selectedCategoryDef = MOVEMENT_CATEGORIES.find((c) => c.key === category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Lütfen geçerli bir tutar girin.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("amount", amount);
      formData.set("transaction_date", transactionDate);
      formData.set("category", category);
      formData.set("movement_type", movementType);
      formData.set("reason", reason.trim() || selectedCategoryDef?.label || "Cari Hareket");
      formData.set("notes", notes);

      await updatePartnerMovement(movement.id, formData);
      toast.success("Cari hareket başarıyla güncellendi!");
      onClose();
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Edit3 className="text-brand-navy" size={20} />
              Cari Hareketi Düzenle
            </h2>
            <p className="text-xs text-text-muted">
              {partnerName} için kayıt detaylarını güncelle
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Movement Type Radio / Buttons */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              İşlem Başlığı *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMovementType("partner_to_company")}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                  movementType === "partner_to_company"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400/20"
                    : "border-border text-text-muted hover:bg-surface"
                }`}
              >
                <ArrowUpRight size={16} className="text-emerald-600" />
                <span>Firmaya Verdiği</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType("company_to_partner")}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                  movementType === "company_to_partner"
                    ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-400/20"
                    : "border-border text-text-muted hover:bg-surface"
                }`}
              >
                <ArrowDownLeft size={16} className="text-rose-600" />
                <span>Firmadan Aldığı</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementType("sahsi_gelir")}
                className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                  movementType === "sahsi_gelir"
                    ? "bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-400/20"
                    : "border-border text-text-muted hover:bg-surface"
                }`}
              >
                <Gem size={16} className="text-purple-600" />
                <span>Şahsi Gelir / Kira</span>
              </button>
            </div>
          </div>

          {/* Tutar & Tarih */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <Banknote size={14} className="text-emerald-600" /> Tutar (₺) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-base font-black text-text focus:ring-2 focus:ring-brand-gold focus:outline-none tabular-nums"
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
                className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-white text-text font-semibold focus:ring-2 focus:ring-brand-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Kategori
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {MOVEMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`p-2 rounded-lg border text-left text-xs font-medium transition cursor-pointer truncate ${
                    category === cat.key
                      ? "border-brand-navy bg-brand-navy text-white font-bold"
                      : "border-border bg-white text-text hover:bg-surface"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sebep */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-text-muted" /> Borç Sebebi / Açıklama *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-xs font-medium text-text focus:ring-2 focus:ring-brand-gold focus:outline-none"
            />
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Özel Not
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-xs font-normal text-text focus:ring-2 focus:ring-brand-gold focus:outline-none resize-none"
            />
          </div>

          {/* Butonlar */}
          <div className="flex gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-surface text-text hover:bg-gray-200 border border-border transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-brand-navy hover:bg-brand-navy-2 text-white transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Değişiklikleri Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
