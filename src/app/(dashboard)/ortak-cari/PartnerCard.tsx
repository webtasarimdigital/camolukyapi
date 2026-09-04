"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import AddMovementModal from "./AddMovementModal";
import { Handshake, ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";

export function PartnerCard({
  partner,
  verdi,
  aldi,
  net,
}: {
  partner: { id: string; name: string; phone?: string | null };
  verdi: number;
  aldi: number;
  net: number;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm hover:border-brand-gold transition flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <Handshake size={20} />
              </div>
              <h2 className="text-lg font-bold text-brand-navy">{partner.name}</h2>
            </div>
            <span className="text-xs bg-surface px-2.5 py-1 rounded-full font-medium text-text-muted">
              Firma Ortağı
            </span>
          </div>

          <div className="space-y-2.5 pt-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted flex items-center gap-1.5">
                <ArrowUpRight size={15} className="text-emerald-600" />
                Ortağın Firmaya Verdiği:
              </span>
              <span className="font-semibold text-emerald-600 tabular-nums">
                {formatCurrency(verdi)}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted flex items-center gap-1.5">
                <ArrowDownLeft size={15} className="text-rose-600" />
                Firmanın Ortağa Verdiği:
              </span>
              <span className="font-semibold text-rose-600 tabular-nums">
                {formatCurrency(aldi)}
              </span>
            </div>

            <div className="pt-3 border-t border-border space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-text uppercase">Net Bakiye:</span>
                <span
                  className={`text-base font-bold tabular-nums ${
                    net > 0
                      ? "text-rose-600"
                      : net < 0
                      ? "text-emerald-600"
                      : "text-text-muted"
                  }`}
                >
                  {formatCurrency(Math.abs(net))}
                </span>
              </div>
              <p className="text-xs font-medium text-right">
                {net > 0 ? (
                  <span className="text-rose-600">Firma {partner.name}&apos;a borçlu</span>
                ) : net < 0 ? (
                  <span className="text-emerald-600">{partner.name} firmaya borçlu</span>
                ) : (
                  <span className="text-text-muted">Bakiye sıfır (kapalı)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 pt-3 border-t border-border">
          <Link
            href={`/ortak-cari/${partner.id}`}
            className="flex-1 text-center bg-surface hover:bg-gray-200 border border-border py-2 rounded-xl text-xs font-semibold text-text transition"
          >
            Ekstre / Detay
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white py-2 rounded-xl text-xs font-semibold transition"
          >
            <Plus size={14} /> Hareket Ekle
          </button>
        </div>
      </div>

      {showModal && (
        <AddMovementModal
          partnerId={partner.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
