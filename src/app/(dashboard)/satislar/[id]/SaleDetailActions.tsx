"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPayment, cancelSale, deleteSale } from "./actions";
import { toast } from "sonner";
import { 
  CreditCard, 
  Trash2, 
  Ban, 
  Loader2, 
  CheckCircle2, 
  Printer, 
  X,
  PlusCircle
} from "lucide-react";

export function SaleDetailActions({
  saleId,
  saleCode,
  status,
  remainingAmount,
}: {
  saleId: string;
  saleCode: string;
  status: string;
  remainingAmount: number;
}) {
  const router = useRouter();

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState(remainingAmount > 0 ? remainingAmount : 0);
  const [payMethod, setPayMethod] = useState("nakit");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNotes, setPayNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Cancel Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle Add Payment
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      toast.error("Lütfen geçerli bir tahsilat tutarı giriniz.");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await addPayment(saleId, payAmount, payMethod, payDate, undefined, payNotes);
      toast.success("Tahsilat başarıyla kaydedildi!", {
        icon: <CheckCircle2 className="text-green-500" />,
      });
      setShowPaymentModal(false);
      router.refresh();
    } catch (err: any) {
      toast.error("Hata: " + (err.message || "Tahsilat kaydedilemedi."));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle Cancel Sale
  const handleCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCancelling(true);
    try {
      await cancelSale(saleId, cancelReason);
      toast.success("Satış iptal edildi ve stoklar iade edildi!");
      setShowCancelModal(false);
      router.refresh();
    } catch (err: any) {
      toast.error("Hata: " + (err.message || "Satış iptal edilemedi."));
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Delete Sale
  const handleDeleteSale = async () => {
    if (!confirm(`${saleCode} numaralı satışı tamamen silmek istediğinize emin misiniz?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteSale(saleId);
      toast.success("Satış kaydı silindi.");
      router.push("/satislar");
    } catch (err: any) {
      toast.error("Hata: " + (err.message || "Satış silinemedi."));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Add Payment button (if remaining > 0) */}
        {remainingAmount > 0 && status !== "cancelled" && (
          <button
            type="button"
            onClick={() => { setPayAmount(remainingAmount); setShowPaymentModal(true); }}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <PlusCircle size={15} />
            Tahsilat Ekle
          </button>
        )}

        {/* Print Button */}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 bg-surface hover:bg-neutral-200 text-text text-xs font-semibold px-3 py-2 rounded-xl border border-border transition cursor-pointer"
        >
          <Printer size={15} />
          Yazdır
        </button>

        {/* Cancel Sale button */}
        {status !== "cancelled" && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer"
          >
            <Ban size={15} />
            İptal Et
          </button>
        )}

        {/* Delete Sale button */}
        <button
          type="button"
          onClick={handleDeleteSale}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-semibold px-3 py-2 rounded-xl transition disabled:opacity-50 cursor-pointer"
        >
          {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          Sil
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-600" />
                Tahsilat Girişi
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-text-muted hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  Tahsil Edilen Tutar (₺)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full text-base font-bold text-emerald-700 border border-border rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand-gold focus:outline-none"
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  Kalan Toplam Alacak: <b>₺{Number(remainingAmount).toFixed(2)}</b>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    Ödeme Yöntemi
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full text-xs border border-border rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="nakit">Nakit (Kasa)</option>
                    <option value="havale_eft">Havale / EFT</option>
                    <option value="kredi_karti">Kredi Kartı (POS)</option>
                    <option value="cek">Çek</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">
                    Tarih
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full text-xs border border-border rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  Açıklama / Referans
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Dekont no, ödeme notu vb."
                  className="w-full text-xs border border-border rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand-gold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-border hover:bg-surface text-text-muted"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPayment ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Tahsilatı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <Ban size={18} className="text-amber-600" />
                Satışı İptal Et
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-text-muted hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Satış iptal edildiğinde, satılan ürünler otomatik olarak <b>stoklara geri iade edilir</b>.
            </p>

            <form onSubmit={handleCancelSale} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  İptal Sebebi
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Müşteri vazgeçti, hatalı giriş vb."
                  required
                  className="w-full text-xs border border-border rounded-xl p-3 focus:ring-2 focus:ring-brand-gold focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-border hover:bg-surface text-text-muted"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isCancelling ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                  İptali Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
