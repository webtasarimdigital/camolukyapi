"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/formatters";
import type { PaymentFollowup, Rent, Transporter, Employee } from "@/lib/data/types";
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Users,
  Truck,
  Building2,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Coins,
} from "lucide-react";

interface Props {
  sales: any[];
  followups: PaymentFollowup[];
  rents: Rent[];
  transporters: Transporter[];
  employees: Employee[];
}

export function MonthlyCashFlowPlan({
  sales,
  followups,
  rents,
  transporters,
  employees,
}: Props) {
  // Varsayılan olarak mevcut yıl-ay (Örn: 2026-10)
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedYM, setSelectedYM] = useState(currentYM);
  const [activeTab, setActiveTab] = useState<"overview" | "salaries" | "transports" | "rents" | "debts">("overview");

  // Ay değiştirme fonksiyonları
  function handlePrevMonth() {
    const [year, month] = selectedYM.split("-").map(Number);
    const d = new Date(year, month - 2, 1);
    setSelectedYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function handleNextMonth() {
    const [year, month] = selectedYM.split("-").map(Number);
    const d = new Date(year, month, 1);
    setSelectedYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const monthLabel = useMemo(() => {
    const [year, month] = selectedYM.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  }, [selectedYM]);

  // 1. Personel Maaşları (Resmi + Gayriresmi + Avans Düşümü)
  const salaryData = useMemo(() => {
    const totalOfficial = employees.reduce((sum, e) => sum + (Number(e.official_salary) || 0), 0);
    const totalUnofficial = employees.reduce((sum, e) => sum + (Number(e.unofficial_salary) || 0), 0);
    const totalBaseSalary = employees.reduce((sum, e) => sum + (Number(e.salary) || (Number(e.official_salary) || 0) + (Number(e.unofficial_salary) || 0)), 0);
    const totalAdvances = employees.reduce((sum, e) => sum + (Number(e.total_advances) || 0), 0);
    const netPayable = Math.max(0, totalBaseSalary - totalAdvances);

    return {
      count: employees.length,
      totalOfficial,
      totalUnofficial,
      totalBaseSalary,
      totalAdvances,
      netPayable,
    };
  }, [employees]);

  // 2. Nakliyeler (12 Gün Kuralına göre bu aya vadesi gelen nakliye seferleri)
  const transportData = useMemo(() => {
    const monthTransports = transporters.filter((t) => {
      const ym = (t.due_date || t.transport_date || "").substring(0, 7);
      return ym === selectedYM;
    });

    const totalAmount = monthTransports.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const paidAmount = monthTransports
      .filter((t) => t.status === "Ödendi")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pendingAmount = totalAmount - paidAmount;

    return {
      items: monthTransports,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }, [transporters, selectedYM]);

  // 3. Kiralar (Her ay tekrarlayan kira giderleri ve kira gelirleri)
  const rentData = useMemo(() => {
    const toplananRents = rents.filter((r) => r.type === "toplanan");
    const verilenRents = rents.filter((r) => r.type === "verilen");

    const totalToplanan = toplananRents.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalVerilen = verilenRents.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return {
      toplananRents,
      verilenRents,
      totalToplanan,
      totalVerilen,
    };
  }, [rents]);

  // 4. Borç & Alacak Vadeleri (`payment_followups` tablosundan)
  const followupData = useMemo(() => {
    const monthFollowups = followups.filter((f) => {
      const ym = (f.due_date || f.contact_date || "").substring(0, 7);
      return ym === selectedYM;
    });

    // Alacaklar (Müşteri tahsilat vadeleri)
    const alacakItems = monthFollowups.filter((f) => f.type === "alacak");
    const totalAlacak = alacakItems.reduce((sum, f) => sum + (Number(f.total_amount) || 0), 0);
    const collectedAlacak = alacakItems.reduce((sum, f) => sum + (Number(f.paid_amount) || 0), 0);
    const remainingAlacak = totalAlacak - collectedAlacak;

    // Borçlar (Tedarikçi vadeleri / Krediler)
    const borcItems = monthFollowups.filter((f) => f.type === "borc");
    const totalBorc = borcItems.reduce((sum, f) => sum + (Number(f.total_amount) || 0), 0);
    const paidBorc = borcItems.reduce((sum, f) => sum + (Number(f.paid_amount) || 0), 0);
    const remainingBorc = totalBorc - paidBorc;

    return {
      alacakItems,
      totalAlacak,
      collectedAlacak,
      remainingAlacak,
      borcItems,
      totalBorc,
      paidBorc,
      remainingBorc,
    };
  }, [followups, selectedYM]);

  // 5. Satış Tahsilatları (Bu ayda gerçekleşen satışlar)
  const salesData = useMemo(() => {
    const monthSales = sales.filter((s) => {
      const ym = (s.sale_date || s.created_at || "").substring(0, 7);
      return ym === selectedYM;
    });

    const totalRevenue = monthSales.reduce((sum, s) => sum + (Number(s.grand_total) || 0), 0);
    const collectedRevenue = monthSales.reduce((sum, s) => sum + (Number(s.paid_amount) || 0), 0);
    const pendingRevenue = totalRevenue - collectedRevenue;

    return {
      count: monthSales.length,
      totalRevenue,
      collectedRevenue,
      pendingRevenue,
    };
  }, [sales, selectedYM]);

  // TOPLAM GİRİŞ VE ÇIKIŞLAR (Kira gelirleri/alacakları finans analizine dahil edilmez, sadece ödenecek kiralar gider olarak alınır)
  const totalInflow = salesData.collectedRevenue + followupData.collectedAlacak;
  const projectedInflow = salesData.totalRevenue + followupData.totalAlacak;

  const totalOutflow = salaryData.netPayable + transportData.totalAmount + rentData.totalVerilen + followupData.totalBorc;
  const netProjected = projectedInflow - totalOutflow;

  return (
    <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-6">
      {/* Başlık ve Ay Seçici */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Calendar className="text-brand-navy" size={20} />
            Aylık Nakit Akışı & Ödeme Planı
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Maaşlar, 12 gün vadeli nakliyeler, kiralar ve tedarikçi borçlarının dönemsel çizelgesi
          </p>
        </div>

        {/* Ay Gezgini */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-white rounded-lg text-text-muted hover:text-text transition"
            title="Önceki Ay"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 text-xs font-bold text-brand-navy uppercase tracking-wider min-w-[130px] text-center">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-white rounded-lg text-text-muted hover:text-text transition"
            title="Sonraki Ay"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedYM(currentYM)}
            className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-neutral-100 rounded-md border border-border text-text transition"
          >
            Bu Ay
          </button>
        </div>
      </div>

      {/* KPI Kartları: Girişler vs Çıkışlar vs Net Durum */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Toplam Giriş */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">Planlanan Nakit Girişi</span>
            <ArrowUpRight size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 tabular-nums">
            {formatCurrency(projectedInflow)}
          </div>
          <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-1 border-t border-emerald-200/60">
            <span>Tahsil Edilen (Kasa/Banka):</span>
            <strong className="font-mono">{formatCurrency(totalInflow)}</strong>
          </div>
        </div>

        {/* Toplam Çıkış (Giderler) */}
        <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold uppercase tracking-wider">Aylık Ödeme Yükümlülüğü</span>
            <ArrowDownRight size={18} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 tabular-nums">
            {formatCurrency(totalOutflow)}
          </div>
          <div className="text-[11px] text-rose-800 flex items-center justify-between pt-1 border-t border-rose-200/60">
            <span>Maaş + Nakliye + Kira + Borç:</span>
            <strong className="font-mono">{formatCurrency(totalOutflow)}</strong>
          </div>
        </div>

        {/* Net Nakit Dengesi */}
        <div className={`border rounded-xl p-4 space-y-2 ${
          netProjected >= 0 ? "bg-blue-50/50 border-blue-200 text-blue-900" : "bg-amber-50/50 border-amber-200 text-amber-900"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Öngörülen Net Bakiye</span>
            <Wallet size={18} className={netProjected >= 0 ? "text-blue-600" : "text-amber-600"} />
          </div>
          <div className={`text-2xl font-black tabular-nums ${netProjected >= 0 ? "text-blue-700" : "text-amber-700"}`}>
            {formatCurrency(netProjected)}
          </div>
          <div className="text-[11px] flex items-center justify-between pt-1 border-t border-current/20">
            <span>Fark Durumu:</span>
            <strong className="font-semibold">{netProjected >= 0 ? "✓ Nakit Fazlası" : "⚠ Ek Finansman İhtiyacı"}</strong>
          </div>
        </div>
      </div>

      {/* Sekmeler: Detay Görünümü */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { key: "overview", label: "Genel Dağılım", icon: Coins },
          { key: "salaries", label: `Personel Maaşları (${salaryData.count})`, icon: Users },
          { key: "transports", label: `Nakliyeler (12 Gün) (${transportData.items.length})`, icon: Truck },
          { key: "rents", label: `Kira Giderleri (${rentData.verilenRents.length})`, icon: Building2 },
          { key: "debts", label: `Vadeli Borçlar (${followupData.borcItems.length})`, icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? "bg-brand-navy text-white shadow-xs"
                  : "bg-surface hover:bg-neutral-200 text-text-muted hover:text-text"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sekme İçerikleri */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gider Kalemleri Özeti */}
          <div className="border border-border rounded-xl p-4 bg-surface/30 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
              <ArrowDownRight size={15} className="text-rose-600" />
              Bu Ayın Ödeme Kalemleri
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-border">
                <span className="font-medium text-text flex items-center gap-2">
                  <Users size={14} className="text-neutral-500" /> Personel Maaşları (Net Ödenecek)
                </span>
                <strong className="font-mono text-rose-700">{formatCurrency(salaryData.netPayable)}</strong>
              </div>
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-border">
                <span className="font-medium text-text flex items-center gap-2">
                  <Truck size={14} className="text-neutral-500" /> Nakliye Ödemeleri (12 Gün Vadeli)
                </span>
                <strong className="font-mono text-rose-700">{formatCurrency(transportData.totalAmount)}</strong>
              </div>
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-border">
                <span className="font-medium text-text flex items-center gap-2">
                  <Building2 size={14} className="text-neutral-500" /> Kira Giderleri (Ödenecek Kiralar)
                </span>
                <strong className="font-mono text-rose-700">{formatCurrency(rentData.totalVerilen)}</strong>
              </div>
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-border">
                <span className="font-medium text-text flex items-center gap-2">
                  <Receipt size={14} className="text-neutral-500" /> Tedarikçi Borçları & Vadeli Çıkışlar
                </span>
                <strong className="font-mono text-rose-700">{formatCurrency(followupData.totalBorc)}</strong>
              </div>
            </div>
          </div>

          {/* Gelir Kalemleri Özeti */}
          <div className="border border-border rounded-xl p-4 bg-surface/30 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text flex items-center gap-1.5">
              <ArrowUpRight size={15} className="text-emerald-600" />
              Bu Ayın Gelir / Tahsilat Kalemleri
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-border">
                <span className="font-medium text-text flex items-center gap-2">
                  <Coins size={14} className="text-neutral-500" /> Müşteri Satış Ciroları (Bu Ay)
                </span>
                <strong className="font-mono text-emerald-700">{formatCurrency(salesData.totalRevenue)}</strong>
              </div>
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-border">
                <span className="font-medium text-text flex items-center gap-2">
                  <Receipt size={14} className="text-neutral-500" /> Tahsil Edilecek Vadeli Alacaklar
                </span>
                <strong className="font-mono text-emerald-700">{formatCurrency(followupData.totalAlacak)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maaşlar Detayı */}
      {activeTab === "salaries" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-surface/40 p-3 rounded-xl border border-border">
            <div>
              <span className="text-text-muted">Resmi Maaşlar:</span>
              <p className="font-bold font-mono text-text">{formatCurrency(salaryData.totalOfficial)}</p>
            </div>
            <div>
              <span className="text-text-muted">Gayriresmi / Elden:</span>
              <p className="font-bold font-mono text-text">{formatCurrency(salaryData.totalUnofficial)}</p>
            </div>
            <div>
              <span className="text-text-muted">Çekilen Avanslar:</span>
              <p className="font-bold font-mono text-amber-600">-{formatCurrency(salaryData.totalAdvances)}</p>
            </div>
            <div>
              <span className="text-text-muted">Ödenecek Net Maaş:</span>
              <p className="font-bold font-mono text-emerald-700 text-sm">{formatCurrency(salaryData.netPayable)}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-text-muted uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Personel</th>
                  <th className="py-2.5 px-3">Görev</th>
                  <th className="py-2.5 px-3 text-right">Resmi Maaş</th>
                  <th className="py-2.5 px-3 text-right">Gayriresmi</th>
                  <th className="py-2.5 px-3 text-right">Toplam Maaş</th>
                  <th className="py-2.5 px-3 text-right">Avanslar</th>
                  <th className="py-2.5 px-3 text-right">Kalan Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => {
                  const off = Number(emp.official_salary) || 0;
                  const unoff = Number(emp.unofficial_salary) || 0;
                  const total = Number(emp.salary) || (off + unoff);
                  const adv = Number(emp.total_advances) || 0;
                  const net = Math.max(0, total - adv);

                  return (
                    <tr key={emp.id} className="hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-bold text-text">{emp.full_name}</td>
                      <td className="py-2.5 px-3 text-text-muted">{emp.position || "-"}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-text-muted">{formatCurrency(off)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-text-muted">{formatCurrency(unoff)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-text">{formatCurrency(total)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600">-{formatCurrency(adv)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">{formatCurrency(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nakliyeler Detayı */}
      {activeTab === "transports" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-muted font-medium">Bu ay ({monthLabel}) vadeli nakliyeler toplamı:</span>
            <strong className="font-bold text-sm text-text font-mono">{formatCurrency(transportData.totalAmount)}</strong>
          </div>
          {transportData.items.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6 border border-dashed rounded-xl">
              Bu ay için henüz vadeli nakliye kaydı bulunmuyor.
            </p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-text-muted uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Nakliyeci</th>
                    <th className="py-2.5 px-3">Sevk Tarihi</th>
                    <th className="py-2.5 px-3">Vade (12 Gün)</th>
                    <th className="py-2.5 px-3 text-right">Tutar</th>
                    <th className="py-2.5 px-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transportData.items.map((t) => (
                    <tr key={t.id} className="hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-bold text-text">{t.transporter_name}</td>
                      <td className="py-2.5 px-3 text-text-muted">{t.transport_date}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-600">{t.due_date}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-text">{formatCurrency(t.amount)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === "Ödendi" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Kiralar Detayı (Sadece Ödenecek Kira Giderleri) */}
      {activeTab === "rents" && (
        <div className="border border-border rounded-xl p-4 bg-surface/20 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-bold text-rose-700 uppercase flex items-center gap-2">
              <Building2 size={16} />
              Ödenecek Kira Giderleri (Dükkan, Depo vb.)
            </h4>
            <span className="font-mono font-bold text-sm text-rose-700">
              Toplam: {formatCurrency(rentData.totalVerilen)}
            </span>
          </div>
          {rentData.verilenRents.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">Bu ay için kayıtlı kira gideri bulunmuyor.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {rentData.verilenRents.map((r) => (
                <div key={r.id} className="p-3 bg-white border border-border rounded-lg flex justify-between items-center text-xs shadow-2xs">
                  <div>
                    <span className="font-bold text-text block">{r.title}</span>
                    <span className="text-[11px] text-text-muted block mt-0.5">{r.counterpart_name} • Her ayın {r.payment_day}. günü</span>
                    <span className="text-[10px] text-neutral-400 font-medium">{r.payment_method}</span>
                  </div>
                  <strong className="font-mono text-sm text-rose-600 font-bold">{formatCurrency(r.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Borçlar Detayı */}
      {activeTab === "debts" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-muted font-medium">Bu ay vadesi gelen tedarikçi & borç ödemeleri:</span>
            <strong className="font-bold text-sm text-rose-700 font-mono">{formatCurrency(followupData.totalBorc)}</strong>
          </div>
          {followupData.borcItems.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6 border border-dashed rounded-xl">
              Bu ay için vadesi gelen kayıtlı borç takibi bulunmuyor.
            </p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-text-muted uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Tedarikçi / Muhatap</th>
                    <th className="py-2.5 px-3">Açıklama</th>
                    <th className="py-2.5 px-3">Vade Tarihi</th>
                    <th className="py-2.5 px-3 text-right">Tutar</th>
                    <th className="py-2.5 px-3 text-right">Ödenen</th>
                    <th className="py-2.5 px-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {followupData.borcItems.map((b) => (
                    <tr key={b.id} className="hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-bold text-text">{b.contact_name}</td>
                      <td className="py-2.5 px-3 text-text-muted">{b.description || "-"}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-600">{b.due_date}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-text">{formatCurrency(b.total_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(b.paid_amount || 0)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === "Ödendi" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
