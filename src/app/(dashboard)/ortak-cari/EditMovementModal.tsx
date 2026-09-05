"use client";

import { useState } from "react";
import { updatePartnerMovement } from "./actions";
import { MOVEMENT_CATEGORIES } from "./types";
import { toast } from "sonner";
import { X, Loader2, CheckCircle2, Banknote, Calendar, FileText, Tag, Edit3 } from "lucide-react";

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

  const [amount, setAmount] = useState(String(movement.amount || ""));
  const [transactionDate, setTransactionDate] = useState(
    movement.transaction_date || new Date().toISOString().split("T")[0]
  );
  const [category, setCategory] = useState(meta.category || "diger");
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
              {partnerName} için finansal kayıt düzenleme
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
          {/* Tutar & Tarih */}
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
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text outline-none focus:border-brand-gold transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-text-muted" /> Tarih *
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

          {/* Kategori Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5 flex items-center gap-1.5">
              <Tag size={14} className="text-text-muted" /> Kategori / Sebep
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 border border-border rounded-xl bg-surface/50">
              {MOVEMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    category === cat.key
                      ? "bg-brand-navy text-white"
                      : "bg-white text-text hover:bg-gray-100 border border-border"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-text-muted" /> Açıklama
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand-gold transition"
            />
          </div>

          {/* Özel Notlar */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Özel Notlar (İsteğe Bağlı)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-text outline-none focus:border-brand-gold transition"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
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
                  <Loader2 size={15} className="animate-spin text-brand-gold" />
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
