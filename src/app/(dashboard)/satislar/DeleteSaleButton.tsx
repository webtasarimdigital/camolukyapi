"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSale } from "./[id]/actions";

interface Props {
  saleId: string;
  saleCode: string;
}

export function DeleteSaleButton({ saleId, saleCode }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSale(saleId);
        toast.success(`${saleCode} satışı silindi.`);
        setIsOpen(false);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Satış silinirken hata oluştu.";
        toast.error(msg);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        title="Satışı Sil"
        className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-border hover:border-rose-200 transition"
      >
        {isPending ? <Loader2 size={13} className="animate-spin text-rose-500" /> : <Trash2 size={13} />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-border">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <h3 className="font-bold text-base text-text">Satışı Sil</h3>
            </div>
            <p className="text-sm text-text-muted">
              <strong className="text-text">{saleCode}</strong> numaralı satış kaydını silmek istediğinize emin misiniz? Tamamlanmış satışlar için stok iadesi otomatik yapılır.
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
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
