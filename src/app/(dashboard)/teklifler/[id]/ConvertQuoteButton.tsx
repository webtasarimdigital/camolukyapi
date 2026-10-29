"use client";

import { useState } from "react";
import { convertAndCompleteSale, type ConvertSalePaymentDetails } from "./actions";
import { toast } from "sonner";
import {
  ShoppingCart,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface ConvertQuoteButtonProps {
  quoteId: string;
  quoteCode: string;
  isConverted: boolean;
  grandTotal: number;
  customerName: string;
}

export function ConvertQuoteButton({
  quoteId,
  quoteCode,
  isConverted,
  grandTotal,
  customerName,
}: ConvertQuoteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ödeme Form Alanları
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paidAmount, setPaidAmount] = useState<number | string>(grandTotal || 0);
  const [paymentMethod, setPaymentMethod] = useState("nakit");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");

  const handleStatusSelect = (status: "paid" | "partial" | "unpaid") => {
    setPaymentStatus(status);
    if (status === "paid") {
      setPaidAmount(grandTotal);
      if (paymentMethod === "acik_hesap") setPaymentMethod("nakit");
    } else if (status === "unpaid") {
      setPaidAmount(0);
      setPaymentMethod("acik_hesap");
    } else {
      // partial
      const half = Math.round(grandTotal / 2);
      setPaidAmount(half > 0 ? half : 0);
      if (paymentMethod === "acik_hesap") setPaymentMethod("nakit");
    }
  };

  const calculatedRemaining = Math.max(0, grandTotal - (Number(paidAmount) || 0));

  async function handleConfirmConvert(e: React.FormEvent) {
    e.preventDefault();

    const pAmount = Number(paidAmount) || 0;
    if (paymentStatus === "paid" && pAmount <= 0 && grandTotal > 0) {
      toast.error("Lütfen tahsil edilen tutarı giriniz.");
      return;
    }
    if (paymentStatus === "partial" && (pAmount <= 0 || pAmount >= grandTotal)) {
      toast.error("Kısmi ödemede peşinat tutarı 0'dan büyük ve toplamdan küçük olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const details: ConvertSalePaymentDetails = {
        paymentStatus,
        paidAmount: paymentStatus === "unpaid" ? 0 : pAmount,
        paymentMethod: paymentStatus === "unpaid" ? "acik_hesap" : paymentMethod,
        dueDate: paymentStatus !== "paid" ? dueDate : undefined,
        notes: notes.trim() || undefined,
      };

      await convertAndCompleteSale(quoteId, details);
      toast.success("Teklif başarıyla satışa dönüştürüldü!");
      setIsOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Satışa dönüştürme başarısız.";
      toast.error("Hata: " + msg);
      setLoading(false);
    }
  }

  if (isConverted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg border border-purple-200">
        <CheckCircle2 size={15} /> Satışa Döndü
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setPaymentStatus("paid");
          setPaidAmount(grandTotal);
          setIsOpen(true);
        }}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
      >
        <ShoppingCart size={16} /> Satışa Dönüştür & Onayla
      </button>

      {/* Ödeme Yöntemi & Onay Modalı */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-border shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ShoppingCart size={20} />
                </span>
                <div>
                  <h3 className="text-base font-black text-text">
                    Teklifi Satışa Dönüştür & Onayla
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    TKF-{quoteCode} • {customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmConvert} className="p-5 space-y-4 text-xs">
              {/* Tutar Özeti */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 block">
                    Satış Genel Toplamı (KDV Dahil)
                  </span>
                  <span className="text-xs text-emerald-700">
                    Depo stokları bu onayla otomatik düşecektir.
                  </span>
                </div>
                <span className="text-xl font-black text-emerald-700 tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Ödeme Durumu Seçenekleri */}
              <div>
                <label className="block text-xs font-bold text-text mb-2">
                  Ödeme / Tahsilat Durumu Seçin <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Tamamı Ödendi */}
                  <button
                    type="button"
                    onClick={() => handleStatusSelect("paid")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentStatus === "paid"
                        ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20"
                        : "border-border bg-white text-text-muted hover:border-text-muted"
                    }`}
                  >
                    <span className="block text-xs font-bold text-text">Tamamı Ödendi</span>
                    <span className="text-[10px] text-text-muted mt-0.5 block">Peşin / Tahsil Edildi</span>
                  </button>

                  {/* Kısmi Tahsilat */}
                  <button
                    type="button"
                    onClick={() => handleStatusSelect("partial")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentStatus === "partial"
                        ? "border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20"
                        : "border-border bg-white text-text-muted hover:border-text-muted"
                    }`}
                  >
                    <span className="block text-xs font-bold text-text">Kısmi Tahsilat</span>
                    <span className="text-[10px] text-text-muted mt-0.5 block">Peşinat Alındı</span>
                  </button>

                  {/* Ödenmedi */}
                  <button
                    type="button"
                    onClick={() => handleStatusSelect("unpaid")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentStatus === "unpaid"
                        ? "border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-500/20"
                        : "border-border bg-white text-text-muted hover:border-text-muted"
                    }`}
                  >
                    <span className="block text-xs font-bold text-text">Ödenmedi</span>
                    <span className="text-[10px] text-text-muted mt-0.5 block">Açık Hesap / Vadeli</span>
                  </button>
                </div>
              </div>

              {/* Ödeme Detayları: Tamamı veya Kısmi Ödendiğinde */}
              {paymentStatus !== "unpaid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface/40 p-3.5 rounded-xl border border-border">
                  <div>
                    <label className="block text-xs font-bold text-text mb-1">
                      {paymentStatus === "paid" ? "Tahsil Edilen Tutar (₺)" : "Alınan Peşinat (₺)"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={grandTotal}
                      required
                      disabled={paymentStatus === "paid"}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border bg-white text-text font-bold tabular-nums focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text mb-1">
                      Ödeme Yöntemi / Şekli <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border bg-white text-text font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="nakit">💵 Nakit</option>
                      <option value="havale">🏦 Banka Havalesi / EFT</option>
                      <option value="kredi_karti">💳 Kredi Kartı</option>
                      <option value="cek">📑 Çek</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Kalan Borç & Vade Tarihi (Kısmi veya Ödenmedi ise) */}
              {paymentStatus !== "paid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200">
                  <div>
                    <span className="block text-xs font-bold text-amber-900 mb-1">
                      Kalan Açık Hesap / Borç
                    </span>
                    <span className="text-base font-black text-rose-700 tabular-nums">
                      {formatCurrency(calculatedRemaining)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">
                      Kalan İçin Vade Tarihi
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full p-2 rounded-lg border border-amber-300 bg-white text-text text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
              )}

              {/* Tahsilat / İşlem Notu */}
              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  Ödeme / Sipariş Notu (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Garanti Bankası EFT ile alındı, teslimatta bakiye kapanacak..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-text focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-border text-text hover:bg-surface transition-colors disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Satışa Dönüştürülüyor...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={15} />
                      Satışı Onayla ve Tamamla
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
