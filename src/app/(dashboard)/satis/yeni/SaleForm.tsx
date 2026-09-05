"use client";
import { useState } from "react";
import { createAndFinalizeSale } from "./actions";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export function SaleForm({ creatorName }: { creatorName: string }) {
  const [loading, setLoading] = useState(false);
  const handleSave = async () => {
    setLoading(true);
    try {
      await createAndFinalizeSale({});
      toast.success("Satış başarıyla kaydedildi!");
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
      <p className="text-sm text-text-muted">Satış Formu (Temsilci: <span className="font-bold text-text">{creatorName}</span>)</p>
      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-brand-gold text-brand-navy px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition hover:opacity-90 disabled:opacity-50 shadow-xs"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Satış Kaydediliyor...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            <span>Satışı Tamamla</span>
          </>
        )}
      </button>
    </div>
  );
}
