"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  ShoppingCart,
  XCircle,
  Trash2,
  RotateCcw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  rejectDealerOrder,
  deleteDealerOrder,
  reopenDealerOrder,
} from "./[id]/actions";

interface Props {
  orderId: string;
  orderCode: string;
  status: string;
  convertedSaleId?: string | null;
}

export function DealerOrderRowActions({
  orderId,
  orderCode,
  status,
  convertedSaleId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("Stokta ürün bulunmuyor / Ürün yok");

  const isConverted = status === "converted_to_sale";
  const isRejected = status === "rejected";
  const isCancelled = status === "cancelled";
  const isPendingOrder = status === "sent" || status === "draft";

  function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await rejectDealerOrder(orderId, rejectReason);
        setIsRejectModalOpen(false);
        toast.success(`${orderCode} numaralı sipariş başarıyla reddedildi.`);
        router.refresh();
      } catch (err: any) {
        toast.error("Hata: " + (err?.message || "Sipariş reddedilemedi"));
      }
    });
  }

  function handleDelete() {
    const msg = isConverted
      ? `${orderCode} numaralı sipariş SATIŞA DÖNÜŞTÜRÜLMÜŞ durumdadır.\n\nSiparişi silerseniz bağlı resmi satış ve stok düşüşleri de otomatik iptal edilecektir.\n\nTamamen silmek istediğinize emin misiniz?`
      : `${orderCode} numaralı bayi siparişini tamamen silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`;

    if (!confirm(msg)) return;

    startTransition(async () => {
      try {
        await deleteDealerOrder(orderId);
        toast.success(`${orderCode} numaralı sipariş tamamen silindi.`);
        router.refresh();
      } catch (err: any) {
        toast.error("Silme hatası: " + (err?.message || "Sipariş silinemedi"));
      }
    });
  }

  function handleReopen() {
    if (!confirm(`${orderCode} numaralı siparişi yeniden onaya sunmak istiyor musunuz?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await reopenDealerOrder(orderId);
        toast.success(`${orderCode} yeniden onaya alındı.`);
        router.refresh();
      } catch (err: any) {
        toast.error("Hata: " + (err?.message || "İşlem başarısız"));
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {/* İncele / Satışa Dönüştür Linki */}
        <Link
          href={`/bayi-siparisleri/${orderId}`}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs ${
            isPendingOrder
              ? "bg-brand-navy hover:bg-brand-navy-2 text-white"
              : "bg-slate-100 hover:bg-slate-200 text-slate-800"
          }`}
          title="Sipariş Detayı ve Düzenleme"
        >
          {isPendingOrder ? (
            <>
              <ShoppingCart size={13} />
              <span>İncele & Onayla</span>
            </>
          ) : (
            <>
              <Eye size={13} />
              <span>İncele</span>
            </>
          )}
        </Link>

        {/* Satış Belgesi (Eğer dönüştüyse) */}
        {isConverted && convertedSaleId && (
          <Link
            href={`/satislar/${convertedSaleId}`}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            title="Resmi Satış Belgesine Git"
          >
            <ExternalLink size={12} />
            <span>Satış</span>
          </Link>
        )}

        {/* Reddet Butonu (Henüz reddedilmediyse) */}
        {!isRejected && !isCancelled && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setIsRejectModalOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
            title="Ürün Yok / Siparişi Reddet"
          >
            <XCircle size={13} className="text-rose-600" />
            <span>Reddet</span>
          </button>
        )}

        {/* Yeniden Onaya Al (Eğer reddedildiyse/iptalse) */}
        {(isRejected || isCancelled) && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleReopen}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition disabled:opacity-50"
            title="Tekrar Onaya Al"
          >
            <RotateCcw size={12} />
            <span>Onaya Al</span>
          </button>
        )}

        {/* Sil Butonu */}
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
          title="Siparişi Tamamen Sil"
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin text-rose-600" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>

      {/* Reddetme Modalı */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Siparişi Reddet ({orderCode})
                </h3>
                <p className="text-xs text-slate-500">
                  Bu işlem sipariş durumunu "Reddedildi" yapar ve bayiye bildirilir.
                </p>
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reddetme Gerekçesi
                </label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Stokta ürün bulunmuyor / Ürün yok",
                      "Talep edilen miktar temin edilemiyor",
                      "Fiyat ve iskonto anlaşmazlığı",
                      "Bayi talebi üzerine iptal edildi",
                    ].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRejectReason(opt)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition ${
                          rejectReason === opt
                            ? "bg-rose-50 border-rose-300 text-rose-700 font-bold"
                            : "bg-surface border-border text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Örn: Stokta ürün bulunmamaktadır..."
                    className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    required
                  />
                </div>
              </div>

              {isConverted && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-medium">
                  ⚠️ Bu sipariş daha önce satışa dönüştürülmüştü. Reddedildiğinde bağlı satış iptal edilecek ve düşülen stoklar depoya geri eklenecektir.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={13} />
                      <span>Siparişi Reddet</span>
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
