"use client";
import { useState } from "react";
import { createAndFinalizeSale } from "./actions";

export function SaleForm({ creatorName }: { creatorName: string }) {
  const [loading, setLoading] = useState(false);
  const handleSave = async () => {
    setLoading(true);
    try {
      await createAndFinalizeSale({});
      alert("Satış kaydedildi!");
    } catch (e: any) {
      alert("Hata: " + e.message);
    }
    setLoading(false);
  };
  
  return (
    <div className="bg-white p-5 rounded-xl border border-border">
      <p>Satış Formu Yükleniyor... (Temsilci: {creatorName})</p>
      <button onClick={handleSave} disabled={loading} className="bg-brand-gold px-4 py-2 mt-4 rounded text-sm">
        {loading ? "Kaydediliyor..." : "Satışı Tamamla"}
      </button>
    </div>
  );
}
