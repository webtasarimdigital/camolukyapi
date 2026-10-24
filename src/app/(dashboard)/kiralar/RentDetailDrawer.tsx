"use client";

import { useState, useTransition, useMemo } from "react";
import type { Rent, RentPayment } from "@/lib/data/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  actionAddRentPayment,
  actionDeleteRentPayment,
} from "@/lib/data/actions";
import * as XLSX from "xlsx";
import {
  X,
  Building2,
  User,
  Wallet,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Loader2,
  Coins,
  Download,
  FileSpreadsheet,
} from "lucide-react";

interface Props {
  rent: Rent;
  userName: string;
  onClose: () => void;
  onRentUpdated?: (updated: Rent) => void;
}

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function monthLabel(ymStr: string) {
  try {
    const [y, m] = ymStr.split("-");
    const monthIdx = parseInt(m, 10) - 1;
    return `${MONTHS_TR[monthIdx] || m} ${y}`;
  } catch {
    return ymStr;
  }
}

export function RentDetailDrawer({
  rent: initialRent,
  userName,
  onClose,
  onRentUpdated,
}: Props) {
  const [rent, setRent] = useState<Rent>(initialRent);
  const [isPending, startTransition] = useTransition();

  // Accordion açık aylar
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  // Yeni Parça Ödeme Formu State'leri
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = now.toISOString().split("T")[0];

  const [paymentPeriod, setPaymentPeriod] = useState<string>(currentYM);
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>(rent.payment_method || "Havale/EFT");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Mevcut parça ödemeler
  const payments = useMemo(() => {
    return rent.payments || [];
  }, [rent.payments]);

  // Son 12 ayı ve varsa daha eski ödemesi olan ayları listele
  const monthList = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Son 8 ayı otomatik ekle (günümüzden geriye)
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthsSet.add(ym);
    }

    // Ödeme yapılmış diğer ayları da ekle
    payments.forEach((p) => {
      if (p.period) monthsSet.add(p.period);
    });

    // Kronolojik olarak ters sırala (en yeni ay en üstte)
    return Array.from(monthsSet).sort().reverse();
  }, [payments, now]);

  // Aylara göre ödemeleri ve kalan tutarları hesapla
  const monthCalculations = useMemo(() => {
    const map: Record<
      string,
      {
        monthRent: number;
        paidTotal: number;
        remaining: number;
        isFullyPaid: boolean;
        isPartiallyPaid: boolean;
        isUnpaid: boolean;
        payments: RentPayment[];
      }
    > = {};

    let cumulativeTotalDue = 0;
    let cumulativeTotalPaid = 0;

    monthList.forEach((ym) => {
      const monthPayments = payments.filter((p) => p.period === ym);
      const paid = monthPayments.reduce((s, p) => s + p.amount, 0);
      const due = rent.amount;
      const remaining = Math.max(0, due - paid);

      cumulativeTotalDue += due;
      cumulativeTotalPaid += paid;

      map[ym] = {
        monthRent: due,
        paidTotal: paid,
        remaining,
        isFullyPaid: paid >= due,
        isPartiallyPaid: paid > 0 && paid < due,
        isUnpaid: paid === 0,
        payments: monthPayments,
      };
    });

    const netRemainingDebt = Math.max(0, cumulativeTotalDue - cumulativeTotalPaid);

    return {
      monthMap: map,
      cumulativeTotalDue,
      cumulativeTotalPaid,
      netRemainingDebt,
    };
  }, [monthList, payments, rent.amount]);

  function toggleMonth(ym: string) {
    setOpenMonths((prev) => ({ ...prev, [ym]: !prev[ym] }));
  }

  // Yeni Parça Ödeme Kaydet
  function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount.replace(",", "."));
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Lütfen geçerli bir ödeme tutarı girin.");
      return;
    }

    startTransition(async () => {
      const res = await actionAddRentPayment(rent.id, {
        period: paymentPeriod,
        payment_date: paymentDate,
        amount: amountNum,
        payment_method: paymentMethod,
        notes: paymentNotes || `${monthLabel(paymentPeriod)} kirası parça ödeme`,
        created_by_name: userName || "Kullanıcı",
      });

      if (res.success && res.rent) {
        setRent(res.rent);
        if (onRentUpdated) onRentUpdated(res.rent);
        toast.success(`${formatCurrency(amountNum)} parça ödeme kaydedildi!`);
        setPaymentAmount("");
        setPaymentNotes("");
        setShowAddForm(false);
        // Ödeme yapılan ayı aç
        setOpenMonths((prev) => ({ ...prev, [paymentPeriod]: true }));
      } else {
        toast.error(res.error || "Ödeme kaydedilemedi.");
      }
    });
  }

  // Parça Ödeme Sil
  function handleDeletePayment(paymentId: string) {
    if (!confirm("Bu parça ödeme kaydını silmek istediğinize emin misiniz?")) return;

    startTransition(async () => {
      const res = await actionDeleteRentPayment(rent.id, paymentId);
      if (res.success && res.rent) {
        setRent(res.rent);
        if (onRentUpdated) onRentUpdated(res.rent);
        toast.success("Parça ödeme silindi.");
      } else {
        toast.error(res.error || "Ödeme silinemedi.");
      }
    });
  }

  // 🌟 TÜM DETAYLARI VE AY AY KİRA GEÇMİŞİNİ EXCEL'E AKTARMA
  function handleExportExcel() {
    try {
      // 1. Sayfa: Ay Ay Detaylı Kira Dökümü
      const monthlyRows = monthList.map((ym) => {
        const calc = monthCalculations.monthMap[ym];
        const due = calc ? calc.monthRent : rent.amount;
        const paid = calc ? calc.paidTotal : 0;
        const rem = calc ? calc.remaining : due;
        const status = calc
          ? calc.isFullyPaid
            ? "Tam Ödendi"
            : calc.isPartiallyPaid
            ? `Kısmi Ödendi (${formatCurrency(rem)} Kalan)`
            : "Ödenmedi"
          : "Ödenmedi";
        const mPayments = calc ? calc.payments : [];

        return {
          "Dönem (Ay / Yıl)": monthLabel(ym),
          "Dönem Kodu": ym,
          "Kişi / Kurum": rent.counterpart_name,
          "Kira Türü": rent.type === "toplanan" ? "Kiracı (Gelir)" : "Mülk Sahibi (Gider)",
          "Mülk / Konum": rent.title || "-",
          "Ödeme Günü": rent.payment_day ? `Her ayın ${rent.payment_day}. günü` : "-",
          "Sözleşme Kira Bedeli (₺)": Number(due) || 0,
          "Ödenen Tutar (₺)": Number(paid) || 0,
          "Kalan Güncel Borç (₺)": Number(rem) || 0,
          "Ödeme Durumu": status,
          "Parça Ödeme Sayısı": mPayments.length,
          "Ödeme Tarihleri": mPayments.map((p) => p.payment_date).join(", ") || "-",
          "Ödeme Tutarları (₺)": mPayments.map((p) => formatCurrency(p.amount)).join(" + ") || "-",
          "Ödeme Yöntemleri": Array.from(new Set(mPayments.map((p) => p.payment_method).filter(Boolean))).join(", ") || rent.payment_method || "-",
          "Ödeme Notları & Açıklamalar": mPayments.map((p) => p.notes).filter(Boolean).join(" | ") || "-",
        };
      });

      // 2. Sayfa: Tüm Parça Ödemelerin Tekil İşlem Dökümü
      const paymentRows = (payments || []).map((p, idx) => ({
        "Sıra": idx + 1,
        "Ödeme Tarihi": p.payment_date || "-",
        "Ait Olduğu Dönem": monthLabel(p.period),
        "Dönem Kodu": p.period,
        "Kişi / Kurum": rent.counterpart_name,
        "Mülk / Konum": rent.title || "-",
        "Kira Türü": rent.type === "toplanan" ? "Kiracı (Gelir)" : "Mülk Sahibi (Gider)",
        "Ödenen Tutar (₺)": Number(p.amount) || 0,
        "Ödeme Yöntemi": p.payment_method || rent.payment_method || "-",
        "İşlemi Kaydeden Yetkili": p.created_by_name || "-",
        "Açıklama / Not": p.notes || "-",
        "Kayıt Tarihi": p.created_at ? p.created_at.replace("T", " ").substring(0, 19) : "-",
      }));

      // 3. Sayfa: Genel Finansal Özet Kartı
      const summaryRows = [
        { "Bilgi Alanı": "Kişi / Kurum", "Detay": rent.counterpart_name },
        { "Bilgi Alanı": "Mülk / Konum", "Detay": rent.title || "-" },
        { "Bilgi Alanı": "Kira Türü", "Detay": rent.type === "toplanan" ? "Kiracı (Gelir)" : "Mülk Sahibi (Gider)" },
        { "Bilgi Alanı": "Ödeme / Vade Günü", "Detay": rent.payment_day ? `Her ayın ${rent.payment_day}. günü` : "-" },
        { "Bilgi Alanı": "Ödeme Yöntemi", "Detay": rent.payment_method || "-" },
        { "Bilgi Alanı": "Aylık Sözleşme Kirası", "Detay": formatCurrency(rent.amount) },
        { "Bilgi Alanı": "Toplam Ödenen (Tüm Aylar)", "Detay": formatCurrency(monthCalculations.cumulativeTotalPaid) },
        { "Bilgi Alanı": "Toplam Tahakkuk Eden Kira", "Detay": formatCurrency(monthCalculations.cumulativeTotalDue) },
        { "Bilgi Alanı": "Kalan Güncel Borç", "Detay": formatCurrency(monthCalculations.netRemainingDebt) },
        { "Bilgi Alanı": "Borç Durumu", "Detay": monthCalculations.netRemainingDebt > 0 ? "Kişinin bekleyen kira borcu vardır!" : "Tüm kiralar eksiksiz ödendi!" },
        { "Bilgi Alanı": "Toplam Parça Ödeme Sayısı", "Detay": `${payments.length} Adet` },
        { "Bilgi Alanı": "Rapor Alınma Tarihi", "Detay": new Date().toLocaleString("tr-TR") },
      ];

      const wb = XLSX.utils.book_new();

      // 1. Sheet: Ay Ay Döküm
      const wsMonthly = XLSX.utils.json_to_sheet(monthlyRows);
      wsMonthly["!cols"] = [
        { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 20 },
        { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 20 },
        { wch: 20 }, { wch: 26 }, { wch: 18 }, { wch: 24 },
        { wch: 28 }, { wch: 20 }, { wch: 45 },
      ];
      XLSX.utils.book_append_sheet(wb, wsMonthly, "Ay Ay Kira Dökümü");

      // 2. Sheet: Parça Ödemeler
      if (paymentRows.length > 0) {
        const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
        wsPayments["!cols"] = [
          { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
          { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 18 },
          { wch: 18 }, { wch: 22 }, { wch: 35 }, { wch: 20 },
        ];
        XLSX.utils.book_append_sheet(wb, wsPayments, "Parça Ödemeler Detayı");
      }

      // 3. Sheet: Genel Özet
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 28 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Genel Özet");

      const safeName = (rent.counterpart_name || "Kira").replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, "_");
      const todayStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Kira_Detay_${safeName}_${todayStr}.xlsx`);
      toast.success(`${rent.counterpart_name} için tüm detaylar Excel olarak indirildi!`);
    } catch (err: unknown) {
      console.error("Excel export error:", err);
      toast.error("Excel dosyası oluşturulurken bir hata meydana geldi.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* ÜST BAŞLIK */}
        <div className="px-5 py-4 bg-brand-navy text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${rent.type === "toplanan" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
              {rent.type === "toplanan" ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black">{rent.counterpart_name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  rent.type === "toplanan" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                }`}>
                  {rent.type === "toplanan" ? "Kiracı (Gelir)" : "Mülk Sahibi (Gider)"}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Building2 size={13} />
                <span>{rent.title}</span>
                <span className="text-slate-400">·</span>
                <span>Her ayın {rent.payment_day}. günü</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Tüm aylık dökümü ve parça ödemeleri Excel'e indir"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Excel İndir</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* GÖVDE: KAYDIRILABİLİR İÇERİK */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* 🌟 GÜNCEL BORÇ VE FİNANSAL ÖZET KARTLARI 🌟 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Aylık Sabit Kira */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                AYLIK SÖZLEŞME KİRASI
              </span>
              <p className="text-lg font-black text-slate-900 tabular-nums">
                {formatCurrency(rent.amount)}
              </p>
              <span className="text-[10px] text-slate-500 block">
                Ödeme: {rent.payment_method}
              </span>
            </div>

            {/* Toplam Yapılan Ödemeler */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                TOPLAM ÖDENEN
              </span>
              <p className="text-lg font-black text-emerald-700 tabular-nums">
                {formatCurrency(monthCalculations.cumulativeTotalPaid)}
              </p>
              <span className="text-[10px] text-emerald-600 block">
                {payments.length} Adet Parça Ödeme
              </span>
            </div>

            {/* Kalan Güncel Borç (Kullanıcının En Çok İstediği!) */}
            <div className={`p-3.5 rounded-2xl space-y-1 border ${
              monthCalculations.netRemainingDebt > 0
                ? "bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-200"
                : "bg-emerald-100/70 border-emerald-300 text-emerald-950"
            }`}>
              <span className="text-[11px] font-extrabold uppercase block">
                {monthCalculations.netRemainingDebt > 0 ? "🔴 KALAN GÜNCEL BORCU" : "✅ BORÇ DURUMU"}
              </span>
              <p className="text-lg font-black tabular-nums">
                {monthCalculations.netRemainingDebt > 0
                  ? formatCurrency(monthCalculations.netRemainingDebt)
                  : "₺0,00 (Borcu Yok)"}
              </p>
              <span className="text-[10px] font-semibold block">
                {monthCalculations.netRemainingDebt > 0
                  ? "Kişinin bekleyen kira borcu vardır!"
                  : "Tüm kiralar eksiksiz ödendi!"}
              </span>
            </div>
          </div>

          {/* PARÇA ÖDEME EKLE BUTONU VE FORMU */}
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="text-brand-navy" size={16} />
                <span className="font-bold text-sm text-text">Parça Ödeme / Tahsilat Kaydı</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-brand-navy hover:bg-black text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus size={14} />
                <span>{showAddForm ? "Formu Kapat" : "+ Yeni Parça Ödeme Ekle"}</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddPayment} className="pt-2 border-t border-border space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Hangi Ay İçin */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">
                      Hangi Ayın Kirası? *
                    </label>
                    <select
                      value={paymentPeriod}
                      onChange={(e) => setPaymentPeriod(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 bg-white font-semibold text-xs outline-none focus:border-brand-navy"
                    >
                      {monthList.map((ym) => (
                        <option key={ym} value={ym}>
                          {monthLabel(ym)} (Kira: {formatCurrency(rent.amount)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ödeme Tarihi */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">
                      Ödeme Yapılan Tarih *
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="w-full border border-border rounded-xl px-3 py-2 bg-white font-medium text-xs outline-none focus:border-brand-navy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ödenen Tutar */}
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                      Ödenen Tutar (₺) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                      placeholder="Örn: 10000"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 bg-white font-black text-sm text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  {/* Ödeme Şekli */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted mb-1">
                      Ödeme Yöntemi
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 bg-white font-medium text-xs outline-none focus:border-brand-navy"
                    >
                      <option value="Havale/EFT">Havale / EFT</option>
                      <option value="Nakit">Nakit (Elden)</option>
                      <option value="Banka">Banka Hesabı</option>
                      <option value="Kredi Kartı">Kredi Kartı</option>
                      <option value="Çek">Çek</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                  </div>
                </div>

                {/* Açıklama / Not */}
                <div>
                  <label className="block text-[11px] font-bold text-text-muted mb-1">
                    Ödeme Açıklaması / Dekont Notu
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Örn: Haziran ayı 1. parça elden verildi / Dekont No: 9812"
                    className="w-full border border-border rounded-xl px-3 py-2 bg-white text-xs outline-none focus:border-brand-navy"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-lg text-text-muted hover:text-text font-semibold hover:bg-slate-200 transition"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-xs"
                  >
                    {isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span>Parça Ödemeyi Kaydet</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 🌟 AYLARA GÖRE KİRA VE PARÇA ÖDEME DÖKÜMÜ (ACCORDION) 🌟 */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="font-bold text-sm text-text flex items-center gap-1.5">
                <Calendar size={16} className="text-brand-navy" />
                Aylık Kira Geçmişi & Parça Ödeme Dökümü
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Tüm aylık dökümü ve parça ödemeleri Excel'e aktar"
                >
                  <FileSpreadsheet size={14} className="text-emerald-700" />
                  <span>Tüm Detayları Excel'e İndir</span>
                </button>
                <span className="text-[11px] text-text-muted hidden md:inline">
                  (Aylara tıklayarak parça ödemeleri görebilirsiniz)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {monthList.map((ym) => {
                const calc = monthCalculations.monthMap[ym];
                if (!calc) return null;
                const isOpen = openMonths[ym] ?? false;

                return (
                  <div
                    key={ym}
                    className={`border rounded-2xl overflow-hidden transition shadow-xs ${
                      calc.isFullyPaid
                        ? "border-emerald-200 bg-white"
                        : calc.isPartiallyPaid
                        ? "border-amber-300 bg-amber-50/20"
                        : "border-rose-200 bg-rose-50/20"
                    }`}
                  >
                    {/* ACCORDION BAŞLIĞI */}
                    <div
                      onClick={() => toggleMonth(ym)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <button className="text-text-muted">
                          {isOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                        </button>
                        <div>
                          <span className="font-black text-sm text-text block">
                            {monthLabel(ym)}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            Kira Bedeli: <strong className="text-text font-bold">{formatCurrency(calc.monthRent)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Sağ Taraf: Ödenen, Kalan ve Durum Rozeti */}
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-text-muted block">Ödenen / Kalan</span>
                          <span className="font-bold text-xs tabular-nums text-text">
                            <span className="text-emerald-700">{formatCurrency(calc.paidTotal)}</span>
                            {" / "}
                            <span className={calc.remaining > 0 ? "text-rose-600 font-black" : "text-emerald-700"}>
                              {formatCurrency(calc.remaining)}
                            </span>
                          </span>
                        </div>

                        {/* Rozet */}
                        {calc.isFullyPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={12} /> Tam Ödendi
                          </span>
                        ) : calc.isPartiallyPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock size={12} /> Kısmi ({formatCurrency(calc.remaining)} Kalan)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle size={12} /> Ödenmedi ({formatCurrency(calc.monthRent)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ACCORDION İÇERİĞİ (PARÇA ÖDEMELER LİSTESİ) */}
                    {isOpen && (
                      <div className="p-3.5 bg-slate-50/60 border-t border-border space-y-2 animate-in fade-in duration-150">
                        {/* Hızlı Ekleme ve Bilgi Çubuğu */}
                        <div className="flex items-center justify-between text-[11px] text-text-muted">
                          <span>
                            Bu ay yapılan toplam ödeme: <strong className="text-emerald-700 font-bold">{formatCurrency(calc.paidTotal)}</strong>
                            {calc.remaining > 0 && (
                              <span className="text-rose-600 font-bold ml-2">
                                (Kalan Borç: {formatCurrency(calc.remaining)})
                              </span>
                            )}
                          </span>

                          {calc.remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentPeriod(ym);
                                setPaymentAmount(String(calc.remaining));
                                setPaymentNotes(`${monthLabel(ym)} kirası kalan bakiye ödemesi`);
                                setShowAddForm(true);
                              }}
                              className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              + Bu Aya Ödeme Ekle
                            </button>
                          )}
                        </div>

                        {/* Parça Ödemeler Tablosu / Listesi */}
                        {calc.payments.length === 0 ? (
                          <div className="py-4 text-center text-text-muted bg-white rounded-xl border border-dashed border-border">
                            Bu ay için henüz yapılmış bir parça ödeme kaydı bulunmuyor.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {calc.payments.map((p) => (
                              <div
                                key={p.id}
                                className="bg-white p-2.5 rounded-xl border border-border flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-emerald-700 tabular-nums text-sm">
                                      +{formatCurrency(p.amount)}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-semibold text-text-muted">
                                      {p.payment_method}
                                    </span>
                                    <span className="text-[10px] text-text-muted">
                                      {formatDate(p.payment_date)}
                                    </span>
                                  </div>
                                  {p.notes && (
                                    <p className="text-[11px] text-text-muted">
                                      {p.notes}
                                    </p>
                                  )}
                                  <span className="text-[9px] text-slate-400 block">
                                    Kaydeden: {p.created_by_name}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p.id)}
                                  className="text-text-muted hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                                  title="Bu parça ödemeyi sil"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ALT KAPATMA VE AKSİYON BARI */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              Kişi: <strong className="text-text">{rent.counterpart_name}</strong>
            </span>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Tüm Detayları Excel'e İndir</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-navy hover:bg-black text-white rounded-xl font-bold text-xs transition shadow-xs cursor-pointer"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
