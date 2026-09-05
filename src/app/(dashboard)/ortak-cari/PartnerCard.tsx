"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import AddMovementModal from "./AddMovementModal";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  TrendingUp,
  FileText,
  UserCheck,
  Fuel,
  Boxes,
  Building2,
  Users2,
  Landmark,
  Wallet,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  akaryakit: Fuel,
  malzeme: Boxes,
  kira: Building2,
  personel: Users2,
  sermaye: Landmark,
  sahsi_avans: Wallet,
};

export function PartnerCard({
  partner,
  partners,
  verdi,
  aldi,
  net,
  p2pNet,
  otherPartnerName,
  recentMovements,
}: {
  partner: { id: string; name: string; phone?: string | null };
  partners: Array<{ id: string; name: string }>;
  verdi: number;
  aldi: number;
  net: number;
  p2pNet: number; // >0: this partner gave personal debt to the other partner; <0: owes other partner
  otherPartnerName?: string;
  recentMovements: Array<{
    id: string;
    direction: string;
    amount: number;
    reason: string;
    notes?: string | null;
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
                  : "Bakiye Sıfır"}
              </span>
            </div>
          </div>

          {/* Büyük Vurgulu Net Bakiye Kartı */}
          <div
            className={`my-4 p-4 rounded-2xl border ${
              isFirmaBorclu
                ? "bg-emerald-50/60 border-emerald-200"
                : isOrtakBorclu
                ? "bg-rose-50/60 border-rose-200"
                : "bg-surface border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-text uppercase tracking-wider">
                Şirket ile Net Bakiye:
              </span>
              <span className="text-[11px] font-medium text-text-muted">
                {isFirmaBorclu
                  ? `Firma ${partner.name}'a Borçlu`
                  : isOrtakBorclu
                  ? `${partner.name} Firmaya Borçlu`
                  : "Hesap Kapalı"}
              </span>
            </div>
            <div
              className={`text-2xl font-black tabular-nums ${
                isFirmaBorclu
                  ? "text-emerald-700"
                  : isOrtakBorclu
                  ? "text-rose-700"
                  : "text-text-muted"
              }`}
            >
              {formatCurrency(Math.abs(net))}
            </div>
          </div>

          {/* İstatistik Kırılımları */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
            <div className="p-3 bg-surface rounded-xl border border-border">
              <div className="flex items-center gap-1 text-text-muted mb-1">
                <ArrowUpRight size={14} className="text-emerald-600" />
                <span>Firmaya Verdiği:</span>
              </div>
              <div className="text-sm font-bold text-emerald-700 tabular-nums">
                {formatCurrency(verdi)}
              </div>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-border">
              <div className="flex items-center gap-1 text-text-muted mb-1">
                <ArrowDownLeft size={14} className="text-rose-600" />
                <span>Firmadan Aldığı:</span>
              </div>
              <div className="text-sm font-bold text-rose-700 tabular-nums">
                {formatCurrency(aldi)}
              </div>
            </div>
          </div>

          {/* Ortaklar Arası Şahsi Borç Durumu */}
          {otherPartnerName && (
            <div className="mt-3 p-3 bg-cyan-50/50 rounded-xl border border-cyan-200/80 text-xs">
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

          {/* Son Hareketler Mini Özeti */}
          {recentMovements.length > 0 && (
            <div className="pt-3 space-y-1.5">
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Son Hareketler
              </div>
              <div className="space-y-1">
                {recentMovements.slice(0, 2).map((m) => {
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-surface/60 border border-border/50"
                    >
                      <span className="text-text truncate max-w-[180px] font-medium">
                        {m.reason}
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          m.direction === "partner_to_company"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {m.direction === "partner_to_company" ? "+" : "-"}
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
            className="flex-1 text-center bg-surface hover:bg-gray-200 border border-border py-2.5 rounded-xl text-xs font-bold text-text transition flex items-center justify-center gap-1.5"
          >
            <FileText size={14} /> Ekstre / Detaylar
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
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
