"use client";

import { useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PrintActions({ quoteId, quoteCode }: { quoteId: string; quoteCode: string }) {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("autoPrint=true")) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="no-print max-w-[210mm] mx-auto mb-4 flex items-center justify-between bg-white px-5 py-3 rounded-2xl shadow-sm border border-neutral-200">
      <div className="flex items-center gap-3">
        <Link
          href={`/teklifler/${quoteId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black transition"
        >
          <ArrowLeft size={16} /> Teklife Dön
        </Link>
        <span className="text-neutral-300">|</span>
        <span className="text-xs font-medium text-neutral-500">
          Teklif No: <b className="text-black">TKF-{quoteCode}</b>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-brand-navy hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Printer size={16} /> Yazdır / PDF Olarak Kaydet
        </button>
      </div>
    </div>
  );
}
