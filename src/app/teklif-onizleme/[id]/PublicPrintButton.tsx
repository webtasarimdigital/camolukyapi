"use client";

import { Printer } from "lucide-react";

export function PublicPrintButton({ quoteCode }: { quoteCode: string }) {
  return (
    <div className="no-print w-full max-w-[210mm] mx-auto mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2.5 bg-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm border border-neutral-200">
      <div className="flex items-center gap-2">
        <span className="text-[11px] sm:text-xs font-semibold text-neutral-500">Çamoluk Yapı Teklifi:</span>
        <span className="font-mono font-bold text-xs text-brand-navy">TKF-{quoteCode}</span>
      </div>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 sm:gap-2 bg-brand-navy hover:bg-black text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition shadow-sm cursor-pointer"
      >
        <Printer size={15} /> Yazdır / PDF İndir
      </button>
    </div>
  );
}
