"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import type { Rent } from "@/lib/data/types";
import { Building2, ArrowUpRight, CheckCircle2, Clock, ExternalLink } from "lucide-react";

interface Props {
  rents: Rent[];
  partners: Array<{ id: string; name: string }>;
}

export function PartnerRentShareCard({ rents, partners }: Props) {
  const rentalIncomes = rents.filter((r) => r.type === "toplanan");
  const totalMonthlyIncome = rentalIncomes.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const perPartnerShare = partners.length > 0 ? totalMonthlyIncome / partners.length : 0;

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base text-text">Sabit Kira Gelirleri & Ortak Dağılımı</h3>
            <p className="text-xs text-text-muted">Şirkete ait mülklerden toplanan aylık sabit kira gelirleri ve ortak payı</p>
          </div>
        </div>
        <Link
          href="/kiralar"
          className="text-xs font-semibold text-brand-navy hover:text-brand-gold flex items-center gap-1 transition"
        >
          Kira Modülüne Git <ExternalLink size={12} />
        </Link>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-3.5">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">
            Toplam Aylık Kira Geliri
          </span>
          <span className="text-xl font-black text-purple-900 font-mono">
            {formatCurrency(totalMonthlyIncome)}
          </span>
          <span className="text-[10px] text-purple-700 block mt-1">
            {rentalIncomes.length} adet kayıtlı kiracı mülkü
          </span>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Ortak Başına Düşen Pay (%50)
          </span>
          <span className="text-xl font-black text-emerald-900 font-mono">
            {formatCurrency(perPartnerShare)}
          </span>
          <span className="text-[10px] text-emerald-700 block mt-1">
            {partners.map((p) => p.name).join(" ve ")} için eşit paylaşım
          </span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-1">
            Tahsilat Durumu
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              {rentalIncomes.filter((r) => r.status === "Ödendi").length} Ödendi
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              {rentalIncomes.filter((r) => r.status !== "Ödendi").length} Bekliyor
            </span>
          </div>
          <span className="text-[10px] text-text-muted block mt-1">Bu ay tahsilatları</span>
        </div>
      </div>

      {/* Mülk & Kiracı Listesi */}
      {rentalIncomes.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-4 border border-dashed rounded-xl">
          Kayıtlı kira geliri bulunamadı. Kiralar sayfasından yeni sözleşme ekleyebilirsiniz.
        </p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface text-text-muted uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Mülk / Kira Başlığı</th>
                <th className="py-2.5 px-3">Kiracı / Muhatap</th>
                <th className="py-2.5 px-3">Ödeme Günü</th>
                <th className="py-2.5 px-3 text-right">Aylık Kira Bedeli</th>
                <th className="py-2.5 px-3 text-right">Ortak Başı Pay</th>
                <th className="py-2.5 px-3 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rentalIncomes.map((r) => {
                const partnerShare = partners.length > 0 ? r.amount / partners.length : r.amount;
                return (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="py-2.5 px-3 font-bold text-text">{r.title}</td>
                    <td className="py-2.5 px-3 text-text-muted">{r.counterpart_name}</td>
                    <td className="py-2.5 px-3 text-text-muted">Her ayın {r.payment_day}. günü</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-text">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                      {formatCurrency(partnerShare)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === "Ödendi"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
