"use client";

import { useEffect } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WhatsAppQuoteModal } from "@/components/whatsapp/WhatsAppQuoteModal";

export function PrintActions({
  quoteId,
  quoteCode,
  customerName,
  customerPhone,
  grandTotal,
}: {
  quoteId: string;
  quoteCode: string;
  customerName?: string;
  customerPhone?: string | null;
  grandTotal?: number;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("autoPrint=true")) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="no-print w-full max-w-[210mm] mx-auto mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2.5 bg-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm border border-neutral-200">
      <div className="flex items-center gap-2.5">
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
        {customerName && (
          <WhatsAppQuoteModal
            quoteId={quoteId}
            quoteCode={quoteCode}
            customerName={customerName}
            customerPhone={customerPhone}
            grandTotal={grandTotal}
            variant="button"
          />
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 sm:gap-2 bg-brand-navy hover:bg-black text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Printer size={15} /> Yazdır / PDF Olarak Kaydet
        </button>
      </div>
    </div>
  );
}
