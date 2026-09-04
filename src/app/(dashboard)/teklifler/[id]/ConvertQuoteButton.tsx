"use client";

import { useState } from "react";
import { convertAndCompleteSale } from "./actions";
import { toast } from "sonner";
import { ShoppingCart, Loader2, CheckCircle2 } from "lucide-react";

export function ConvertQuoteButton({
  quoteId,
  isConverted,
}: {
  quoteId: string;
  isConverted: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConvert() {
    if (
      !confirm(
        "Müşteri bu teklifi onayladı mı? Satış işlemi tamamlanacak, stoktan otomatik düşülecek ve ciro/gelir defterine yansıtılacaktır."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await convertAndCompleteSale(quoteId);
      toast.success("Teklif başarıyla satışa dönüştürüldü!");
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
    <button
      type="button"
      disabled={loading}
      onClick={handleConvert}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" /> Satışa Dönüştürülüyor...
        </>
      ) : (
        <>
          <ShoppingCart size={16} /> Satışa Dönüştür & Onayla
        </>
      )}
    </button>
  );
}
