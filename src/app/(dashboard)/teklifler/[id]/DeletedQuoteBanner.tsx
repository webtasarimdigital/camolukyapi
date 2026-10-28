"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { restoreQuote, permanentDeleteQuote } from "./actions";
import { formatDate } from "@/lib/formatters";

interface Props {
  quoteId: string;
  quoteCode: string;
  deletedAt: string;
  canManage?: boolean;
}

export function DeletedQuoteBanner({
  quoteId,
  quoteCode,
  deletedAt,
  canManage = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function handleRestore() {
    startTransition(async () => {
      try {
        await restoreQuote(quoteId);
        toast.success(`TKF-${quoteCode} teklifi başarıyla geri kurtarıldı!`);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Teklif kurtarılamadı.";
        toast.error(msg);
      }
    });
  }

  function handlePermanentDelete() {
    startTransition(async () => {
      try {
        await permanentDeleteQuote(quoteId);
        toast.success(`TKF-${quoteCode} teklifi kalıcı olarak silindi.`);
        setIsConfirmOpen(false);
        router.push("/teklifler?tab=trash");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Kalıcı silme işlemi başarısız.";
        toast.error(msg);
      }
    });
  }

  const dateFormatted = new Date(deletedAt).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="bg-rose-50 border-2 border-rose-300 text-rose-950 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-200/70 text-rose-700 flex items-center justify-center shrink-0">
            <Trash2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-rose-900">
                Bu Teklif Son Silinenler Klasöründedir
              </h3>
              <span className="bg-rose-200 text-rose-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                Silindi
              </span>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">
              Silinme Tarihi: <strong className="font-semibold">{dateFormatted}</strong>. Bu teklif ana listede gizlidir ancak henüz kalıcı olarak silinmemiştir.
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleRestore}
              disabled={isPending}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              Teklifi Kurtar / Geri Getir
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isPending}
              className="flex items-center gap-1.5 bg-white hover:bg-rose-100 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-300 transition"
            >
              <Trash2 size={14} />
              Kalıcı Sil
            </button>
          </div>
        )}
      </div>

      {/* Kalıcı Silme Onay Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-border">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-text">Kalıcı Silinsin mi?</h3>
                <p className="text-xs text-rose-600 font-semibold">Bu işlem geri alınamaz!</p>
              </div>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              <strong className="text-text">TKF-{quoteCode}</strong> numaralı teklif ve tüm ürün kalemleri veritabanından tamamen silinecektir. Tekrar geri getiremezsiniz.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface rounded-xl transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                Evet, Kalıcı Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
