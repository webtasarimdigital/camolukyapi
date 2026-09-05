"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import AddMovementModal from "./AddMovementModal";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  FileText,
  UserCheck,
  Fuel,
  Boxes,
  Building2,
  Users2,
  Landmark,
  Wallet,
  Gem,
  ArrowRight
} from "lucide-react";

export function PartnerCard({
  partner,
  partners,
  verdi,
  aldi,
  sahsiGelir = 0,
  net,
  p2pNet,
  otherPartnerName,
  recentMovements,
}: {
  partner: { id: string; name: string; phone?: string | null };
  partners: Array<{ id: string; name: string }>;
  verdi: number;
  aldi: number;
  sahsiGelir?: number;
  net: number;
  p2pNet: number;
  otherPartnerName?: string;
  recentMovements: Array<{
    id: string;
    direction: string;
    amount: number;
    reason: string;
    notes?: string | null;
    doc_no?: string | null;
  }>;
}) {
  const [showModal, setShowModal] = useState(false);

  const isFirmaBorclu = net > 0;
  const isOrtakBorclu = net < 0;

  return (
    <>
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs hover:border-brand-gold/60 transition flex flex-col justify-between space-y-5">
        <div>
          {/* Üst Başlık & Profil */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-navy to-brand-navy-2 text-white flex items-center justify-center font-extrabold text-base shadow-xs">
                {partner.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-text">{partner.name}</h2>
                  <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UserCheck size={11} /> Kurucu Ortak
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {partner.phone ? partner.phone : "Şahsi Cari Defteri"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  isFirmaBorclu
                    ? "bg-emerald-100 text-emerald-800"
                    : isOrtakBorclu
                    ? "bg-rose-100 text-rose-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {isFirmaBorclu
                  ? "Firma Alacaklısı"
                  : isOrtakBorclu
                  ? "Firmaya Borçlu"
                  : "Bakiye Dengede"}
              </span>
            </div>
          </div>

          {/* 3 Başlık Metrikleri (Firmaya Verdiği, Firmadan Aldığı, Şahsi Gelir) */}
          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            {/* 1. Firmaya Verdiği */}
            <div className="p-3 bg-surface rounded-xl border border-border">
              <div className="flex items-center gap-1 text-emerald-800 font-semibold mb-1 text-[11px]">
                <ArrowUpRight size={13} className="text-emerald-600" />
                <span>Firmaya Verdiği:</span>
              </div>
              <div className="text-sm font-black text-emerald-700 tabular-nums">
                {formatCurrency(verdi)}
              </div>
            </div>

            {/* 2. Firmadan Aldığı */}
            <div className="p-3 bg-surface rounded-xl border border-border">
              <div className="flex items-center gap-1 text-rose-800 font-semibold mb-1 text-[11px]">
                <ArrowDownLeft size={13} className="text-rose-600" />
                <span>Firmadan Aldığı:</span>
              </div>
              <div className="text-sm font-black text-rose-700 tabular-nums">
                {formatCurrency(aldi)}
              </div>
            </div>

            {/* 3. Şahsi Gelir & Kâr (Kira vb.) */}
            <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200">
              <div className="flex items-center gap-1 text-purple-950 font-semibold mb-1 text-[11px]">
                <Gem size={13} className="text-purple-600" />
                <span>Şahsi Gelir / Kira:</span>
              </div>
              <div className="text-sm font-black text-purple-900 tabular-nums">
                {formatCurrency(sahsiGelir)}
              </div>
            </div>
          </div>

          {/* Net Bakiye Özeti */}
          <div className="mt-3 p-3 bg-surface/70 rounded-xl border border-border flex items-center justify-between text-xs">
            <span className="font-bold text-text">Firma ile Net Cari Bakiye:</span>
            <span className={`font-black text-base tabular-nums ${
              net > 0 ? "text-emerald-700" : net < 0 ? "text-rose-700" : "text-text"
            }`}>
              {formatCurrency(Math.abs(net))}
              <span className="text-[10px] font-normal ml-1 text-text-muted">
                {net > 0 ? "(Alacaklı)" : net < 0 ? "(Borçlu)" : "(Dengede)"}
              </span>
            </span>
          </div>

          {/* Ortaklar Arası Şahsi Borç Durumu */}
          {otherPartnerName && (
            <div className="mt-2.5 p-3 bg-cyan-50/50 rounded-xl border border-cyan-200/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-900">
                  {otherPartnerName} ile Şahsi Bakiye:
                </span>
                <span className="font-bold tabular-nums text-cyan-900">
                  {formatCurrency(Math.abs(p2pNet))}
                </span>
              </div>
              <div className="text-[11px] text-cyan-800 mt-0.5">
                {p2pNet > 0 ? (
                  <span>
                    {otherPartnerName}, {partner.name}&apos;a borçlu
                  </span>
                ) : p2pNet < 0 ? (
                  <span>
                    {partner.name}, {otherPartnerName}&apos;a borçlu
                  </span>
                ) : (
                  <span className="text-cyan-700/80">Karşılıklı şahsi borç yok (sıfır)</span>
                )}
              </div>
            </div>
          )}

          {/* Son Hareketler Bölümü (4 Adet Gösterilir + Tümünü Gör Linki) */}
          {recentMovements.length > 0 && (
            <div className="pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <span>Son Hareketler</span>
                <Link
                  href={`/ortak-cari/${partner.id}`}
                  className="text-brand-navy hover:underline lowercase font-semibold flex items-center gap-1 normal-case text-xs"
                >
                  Tümünü Gör ({recentMovements.length}) <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-1">
                {recentMovements.slice(0, 4).map((m) => {
                  let meta: any = {};
                  try {
                    meta = m.notes ? JSON.parse(m.notes) : {};
                  } catch {}

                  const isIncome = meta.is_personal_income || m.doc_no === "SAHSI_GELIR" || meta.category === "kira" || meta.category === "kar_dagitimi";

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-surface/60 border border-border/50"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        {isIncome ? (
                          <Gem size={13} className="text-purple-600 shrink-0" />
                        ) : m.direction === "partner_to_company" ? (
                          <ArrowUpRight size={13} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowDownLeft size={13} className="text-rose-600 shrink-0" />
                        )}
                        <span className="text-text truncate font-medium">
                          {m.reason}
                        </span>
                      </div>

                      <span
                        className={`font-bold tabular-nums shrink-0 ${
                          isIncome 
                            ? "text-purple-800" 
                            : m.direction === "partner_to_company"
                              ? "text-emerald-700"
                              : "text-rose-700"
                        }`}
                      >
                        {isIncome || m.direction === "partner_to_company" ? "+" : "-"}
                        {formatCurrency(m.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Butonlar */}
        <div className="flex gap-2.5 pt-4 border-t border-border">
          <Link
            href={`/ortak-cari/${partner.id}`}
            className="flex-1 text-center bg-surface hover:bg-gray-200 border border-border py-2.5 rounded-xl text-xs font-bold text-text transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText size={14} /> Tüm Ekstre / Detaylar
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={15} /> Hareket Ekle
          </button>
        </div>
      </div>

      {showModal && (
        <AddMovementModal
          partners={partners}
          defaultPartnerId={partner.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
