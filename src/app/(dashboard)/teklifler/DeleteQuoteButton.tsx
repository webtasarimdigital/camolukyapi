"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteQuote } from "./[id]/actions";

interface Props {
  quoteId: string;
  quoteCode?: string;
  redirectTo?: string;
  variant?: "icon" | "button";
}

export function DeleteQuoteButton({ quoteId, quoteCode, redirectTo, variant = "icon" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteQuote(quoteId);
        toast.success(
          quoteCode
            ? `TKF-${quoteCode} teklifi Son Silinenler'e taşındı.`
            : "Teklif Son Silinenler klasörüne taşındı."
        );
        setIsOpen(false);
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Teklif silinirken hata oluştu.";
        toast.error(msg);
      }
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={isPending}
          title="Son Silinenler'e Taşı"
          className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-border hover:border-rose-200 transition"
        >
          {isPending ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <Trash2 size={14} />}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3.5 py-2 rounded-lg text-sm font-semibold transition border border-rose-200"
        >
          {isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          Teklifi Sil
        </button>
      )}

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-border">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-text">Son Silinenlere Taşı</h3>
                <p className="text-xs text-text-muted">iPhone Çöp Kutusu Mantığı</p>
              </div>
            </div>
            <p className="text-sm text-text-muted">
              {quoteCode ? (
                <>
                  <strong className="text-text">TKF-{quoteCode}</strong> numaralı teklif{" "}
                  <strong className="text-rose-600">Son Silinenler</strong> klasörüne taşınacaktır.
                  Dilediğiniz zaman Son Silinenler sekmesinden tek tıkla geri kurtarabilirsiniz.
                </>
              ) : (
                <>
                  Bu teklif <strong className="text-rose-600">Son Silinenler</strong> klasörüne taşınacaktır.
                  Dilediğiniz zaman Son Silinenler sekmesinden tek tıkla geri kurtarabilirsiniz.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface rounded-xl transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                Son Silinenlere Taşı
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
