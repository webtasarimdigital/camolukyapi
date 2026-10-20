"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2, X, PackageX, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { deleteAllStock } from "./actions";

interface Props {
  totalCount: number;
}

export function DeleteAllStockModal({ totalCount }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"all_products" | "zero_stock">("all_products");
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const isConfirmValid =
    mode === "zero_stock" || confirmText.trim().toUpperCase() === "SİL";

  function handleOpen() {
    setMode("all_products");
    setConfirmText("");
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
    setConfirmText("");
  }

  function handleSubmit() {
    if (!isConfirmValid || isPending) return;

    startTransition(async () => {
      const res = await deleteAllStock(mode);
      if (res.success) {
        toast.success(res.message || "İşlem başarıyla tamamlandı.");
        setIsOpen(false);
        setConfirmText("");
        router.refresh();
      } else {
        toast.error(res.error || "İşlem sırasında bir hata oluştu.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
        title="Tüm stok ve ürünleri toplu sil"
      >
        <Trash2 size={15} />
        <span>Toplu Sil</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-text">Toplu Stok Silme</h3>
                  <p className="text-xs text-text-muted">
                    Sistemde şu an kayıtlı{" "}
                    <strong className="text-rose-600 font-bold">{totalCount} adet</strong> ürün/stok var.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-surface transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Seçenekler */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                İşlem Türünü Seçin:
              </label>

              {/* Seçenek 1: Tüm Ürünleri ve Stoğu Kalıcı Sil */}
              <div
                onClick={() => setMode("all_products")}
                className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                  mode === "all_products"
                    ? "border-rose-500 bg-rose-50/60 shadow-xs"
                    : "border-border hover:border-border/80 bg-surface/40"
                }`}
              >
                <input
                  type="radio"
                  name="stock_delete_mode"
                  checked={mode === "all_products"}
                  onChange={() => setMode("all_products")}
                  className="mt-1 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PackageX size={16} className="text-rose-600" />
                    <span className="font-bold text-sm text-text">
                      Tüm Kataloğu ve Stoğu Sil (Kalıcı)
                    </span>
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Önerilen
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Sistemdeki tüm kayıtlı ürün kartlarını ve stokları tamamen siler.
                    Ürün listesi sıfırlanır (0 ürün). Yeni bir liste yüklemek için idealdir.
                  </p>
                </div>
              </div>

              {/* Seçenek 2: Sadece Stok Miktarlarını Sıfırla */}
              <div
                onClick={() => setMode("zero_stock")}
                className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                  mode === "zero_stock"
                    ? "border-amber-500 bg-amber-50/60 shadow-xs"
                    : "border-border hover:border-border/80 bg-surface/40"
                }`}
              >
                <input
                  type="radio"
                  name="stock_delete_mode"
                  checked={mode === "zero_stock"}
                  onChange={() => setMode("zero_stock")}
                  className="mt-1 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RotateCcw size={16} className="text-amber-600" />
                    <span className="font-bold text-sm text-text">
                      Sadece Stok Adetlerini Sıfırla (0 Yap)
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Ürün kartları, ürün kodları ve fiyatları korunur; yalnızca mevcut stok miktarlarının tamamı 0 adet olarak güncellenir.
                  </p>
                </div>
              </div>
            </div>

            {/* Güvenlik Onay Alanı */}
            {mode === "all_products" ? (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2 text-rose-800 text-xs font-semibold">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    DİKKAT: Bu işlem geri alınamaz. Onaylamak için aşağıdaki kutucuğa{" "}
                    <strong className="underline decoration-2">SİL</strong> yazınız:
                  </span>
                </div>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Onaylamak için SİL yazınız..."
                  disabled={isPending}
                  className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-sm font-bold text-rose-900 placeholder:text-rose-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  Tüm ürünlerin stok miktarları 0 yapılacaktır. Ürün kartları ve fiyat tanımları silinmeyecektir.
                </span>
              </div>
            )}

            {/* Butonlar */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:text-text hover:bg-surface transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isConfirmValid || isPending}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === "all_products"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Siliniyor...</span>
                  </>
                ) : mode === "all_products" ? (
                  <>
                    <Trash2 size={13} />
                    <span>Evet, Tüm Stoğu Sil</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={13} />
                    <span>Evet, Stokları Sıfırla</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
