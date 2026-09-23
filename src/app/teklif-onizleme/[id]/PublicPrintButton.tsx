"use client";

import { Printer } from "lucide-react";

export function PublicPrintButton({ quoteCode }: { quoteCode: string }) {
  return (
    <div className="no-print max-w-[210mm] mx-auto mb-4 flex items-center justify-between bg-white px-5 py-3 rounded-2xl shadow-sm border border-neutral-200">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-500">Çamoluk Yapı Teklif Belgesi:</span>
        <span className="font-mono font-bold text-xs text-brand-navy">TKF-{quoteCode}</span>
      </div>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 bg-brand-navy hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
      >
        <Printer size={15} /> Yazdır / PDF Olarak İndir
      </button>
    </div>
  );
}
