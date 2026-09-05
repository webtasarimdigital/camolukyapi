"use client";

import { useState, useEffect } from "react";
import { addPartnerMovement } from "./actions";
import { MOVEMENT_CATEGORIES } from "./types";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Handshake,
  TrendingUp,
  Loader2,
  Calendar,
  Banknote,
  FileText,
  CheckCircle2,
  Lock,
  Clock,
  PlusCircle,
  Gem,
  Users2
} from "lucide-react";

export default function AddMovementModal({
  partners,
  defaultPartnerId,
  onClose,
}: {
  partners: Array<{ id: string; name: string }>;
  defaultPartnerId?: string;
  onClose: () => void;
}) {
  const [partnerId, setPartnerId] = useState(
    defaultPartnerId || (partners.length > 0 ? partners[0].id : "")
  );
  
  // 3 Primary heads requested by user + P2P transfer
  const [movementType, setMovementType] = useState<
    "partner_to_company" | "company_to_partner" | "sahsi_gelir" | "partner_to_partner"
  >("sahsi_gelir");

  const [targetPartnerId, setTargetPartnerId] = useState(
    partners.find((p) => p.id !== (defaultPartnerId || (partners.length > 0 ? partners[0].id : "")))?.id || ""
  );

  const [splitBoth, setSplitBoth] = useState(true);
  const [category, setCategory] = useState("kira");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [docNo, setDocNo] = useState("");
  const [loading, setLoading] = useState(false);

  const [submittedInfo, setSubmittedInfo] = useState<{
    partnerName: string;
    targetPartnerName?: string;
    movementTypeLabel: string;
    amount: number;
    reason: string;
    transactionDate: string;
    isSplit?: boolean;
  } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const lastTimeStr = sessionStorage.getItem("camoluk_partner_debt_cooldown");
    if (lastTimeStr) {
      const elapsedSec = Math.floor((Date.now() - parseInt(lastTimeStr, 10)) / 1000);
      if (elapsedSec < 10) {
        setCooldown(10 - elapsedSec);
      }
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Adjust default category based on selected movement type
  const handleTypeChange = (type: typeof movementType) => {
    setMovementType(type);
    if (type === "sahsi_gelir") {
      setCategory("kira");
      if (!reason || reason === "Cari Hareket") setReason("Dükkan / Mülk Kirası");
    } else if (type === "partner_to_company") {
      setCategory("sermaye");
      if (!reason || reason.includes("Kira")) setReason("Firmaya Masraf / Sermaye Katkısı");
    } else if (type === "company_to_partner") {
      setCategory("sahsi_avans");
      if (!reason || reason.includes("Kira")) setReason("Kasadan Şahsi Avans / Çekim");
    } else if (type === "partner_to_partner") {
      setCategory("ortaklar_arasi");
      if (!reason || reason.includes("Kira")) setReason("Ortaklar Arası Şahsi Borç");
    }
  };

  const selectedCategoryDef = MOVEMENT_CATEGORIES.find((c) => c.key === category);

  function getMovementLabel(type: string) {
    switch (type) {
      case "partner_to_company":
        return "Firmaya Verdiği (Borç / Sermaye)";
      case "company_to_partner":
        return "Firmadan Aldığı (Şahsi Çekim / Avans)";
      case "sahsi_gelir":
        return "Şahsi Gelir & Kâr (Kira / Kâr Payı)";
      case "partner_to_partner":
        return "Ortaklar Arası Şahsi Borç";
      default:
        return "Cari Hareket";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) {
      toast.warning(`Yeni işlem girmek için lütfen ${cooldown} saniye bekleyin.`);
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Lütfen geçerli bir tutar girin.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("partner_id", partnerId);
      formData.set("movement_type", movementType);
      formData.set("target_partner_id", targetPartnerId);
      formData.set("amount", amount);
      formData.set("transaction_date", transactionDate);
      formData.set("category", category);
      const finalReason = reason.trim() || selectedCategoryDef?.label || "Cari Hareket";
      formData.set("reason", finalReason);
      formData.set("notes", notes);
      formData.set("doc_no", docNo);
      formData.set("split_both", movementType === "sahsi_gelir" && splitBoth ? "true" : "false");

      await addPartnerMovement(formData);

      const currentPartner = partners.find((p) => p.id === partnerId)?.name || "Ortak";
      const targetPartner = targetPartnerId
        ? partners.find((p) => p.id === targetPartnerId)?.name
        : undefined;

      sessionStorage.setItem("camoluk_partner_debt_cooldown", Date.now().toString());
      setCooldown(10);
      setSubmittedInfo({
        partnerName: currentPartner,
        targetPartnerName: movementType === "sahsi_gelir" && splitBoth ? targetPartner : (movementType === "partner_to_partner" ? targetPartner : undefined),
        movementTypeLabel: getMovementLabel(movementType),
        amount: numAmount,
        reason: finalReason,
        transactionDate,
        isSplit: movementType === "sahsi_gelir" && splitBoth,
      });

      toast.success(
        movementType === "sahsi_gelir" && splitBoth
          ? "Şahsi gelir her iki ortağa da (Ahmet ve Mehmet) başarıyla işlendi!"
          : "Cari hareket başarıyla eklendi!"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "İşlem kaydedilemedi";
      toast.error("Hata: " + msg);
    } finally {
      setLoading(false);
    }
  }

  function handleResetForNewEntry() {
    setAmount("");
    setReason("");
    setNotes("");
    setDocNo("");
    setSubmittedInfo(null);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Handshake className="text-brand-navy" size={20} />
              Yeni Ortak Finans Hareketi
            </h2>
            <p className="text-xs text-text-muted">
              Şirket resmi muhasebesinden bağımsız ortak şahsi gelir ve borç takibi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text p-1.5 rounded-lg hover:bg-gray-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Dialog with 10s cooldown */}
        {submittedInfo ? (
          <div className="p-6 space-y-5 overflow-y-auto flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle2 size={46} className="text-emerald-600" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400 border-dashed animate-spin" style={{ animationDuration: '8s' }}></div>
            </div>

            <div>
              <h3 className="text-xl font-black text-emerald-900 flex items-center justify-center gap-2">
                İşlem Başarıyla Eklendi!
              </h3>
              <p className="text-xs text-text-muted mt-1">
                Ortak cari ekstresine anında işlendi ve bakiyeler güncellendi.
              </p>
            </div>

            <div className="w-full bg-surface border border-border rounded-2xl p-4 text-left space-y-2.5 shadow-2xs">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-text-muted">İşlem Tipi:</span>
                <span className="text-xs font-bold text-brand-navy">
                  {submittedInfo.movementTypeLabel}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-text-muted">İlgili Ortak:</span>
                <span className="text-xs font-bold text-text">
                  {submittedInfo.partnerName}
                  {submittedInfo.targetPartnerName
                    ? (submittedInfo.isSplit ? ` ve ${submittedInfo.targetPartnerName} (Eşit)` : ` ➔ ${submittedInfo.targetPartnerName}`)
                    : ""}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-text-muted">İşlenen Tutar:</span>
                <span className="text-sm font-black text-emerald-700 tabular-nums">
                  {formatCurrency(submittedInfo.amount)}
                  {submittedInfo.isSplit && <span className="text-xs font-normal text-text-muted ml-1">(her birine)</span>}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-text-muted">Açıklama:</span>
                <span className="text-xs font-semibold text-text truncate max-w-[200px]">
                  {submittedInfo.reason}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted">İşlem Tarihi:</span>
                <span className="text-xs font-medium text-text">
                  {new Date(submittedInfo.transactionDate).toLocaleDateString("tr-TR")}
                </span>
              </div>
            </div>

            <div className="w-full bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Clock size={15} className="text-amber-700 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>Güvenlik Kilidi (Çift Basım Koruması)</span>
                </div>
                <span className="text-xs font-black text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full tabular-nums">
                  {cooldown > 0 ? `${cooldown} sn` : "Hazır"}
                </span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Yanlışlıkla iki kere basıp mükerrer kayıt oluşturmayı önlemek için 10 saniyelik bekleme koruması aktiftir.
              </p>
              <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-600 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((10 - cooldown) / 10) * 100}%` }}
                />
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl text-xs font-bold bg-white text-text border border-border hover:bg-surface transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} className="text-emerald-600" />
                Kapat ve Ekstreyi Gör
              </button>

              <button
                type="button"
                disabled={cooldown > 0}
                onClick={handleResetForNewEntry}
                className={`w-full py-3 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 ${
                  cooldown > 0
                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                    : "bg-brand-navy hover:bg-brand-navy-2 text-white"
                }`}
              >
                {cooldown > 0 ? (
                  <>
                    <Lock size={14} /> Yeni Kayıt (${cooldown} sn)
                  </>
                ) : (
                  <>
                    <PlusCircle size={15} /> Yeni Hareket Ekle
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {cooldown > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-700 animate-spin" />
                  <span>Yeni bir kayıt için lütfen bekleyin...</span>
                </div>
                <span className="font-bold tabular-nums bg-amber-200 px-2 py-0.5 rounded-md">
                  {cooldown} saniye
                </span>
              </div>
            )}

            {/* 3 Prominent Heads Requested by User */}
            <div>
              <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                İşlem Başlığı (Kategori Türü) *
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Firmaya Verdiği */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTypeChange("partner_to_company")}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                    movementType === "partner_to_company"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-border hover:bg-surface text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 mb-1">
                    <ArrowUpRight size={16} className="text-emerald-600 shrink-0" />
                    <span>Firmaya Verdiği</span>
                  </div>
                  <p className="text-[10.5px] text-emerald-700/80 leading-snug">
                    Ortak cebinden firmaya borç / sermaye verdi veya masraf karşıladı.
                  </p>
                </button>

                {/* 2. Firmadan Aldığı */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTypeChange("company_to_partner")}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                    movementType === "company_to_partner"
                      ? "border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 shadow-xs"
                      : "border-border hover:bg-surface text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800 mb-1">
                    <ArrowDownLeft size={16} className="text-rose-600 shrink-0" />
                    <span>Firmadan Aldığı</span>
                  </div>
                  <p className="text-[10.5px] text-rose-700/80 leading-snug">
                    Ortak kasadan şahsi avans çekti / firmaya şahsi harcamasını ödetti.
                  </p>
                </button>

                {/* 3. Şahsi Gelir (Kira / Kâr) */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTypeChange("sahsi_gelir")}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                    movementType === "sahsi_gelir"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20 shadow-xs"
                      : "border-border hover:bg-surface text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900 mb-1">
                    <Gem size={16} className="text-purple-600 shrink-0" />
                    <span>Şahsi Gelir / Kira</span>
                  </div>
                  <p className="text-[10.5px] text-purple-800/80 leading-snug">
                    Kira, kâr payı veya hak ediş kazancı (Şirkete borç değildir, adamlara kâr yazar).
                  </p>
                </button>
              </div>

              {/* 4th Optional: Ortaklar Arası Transfer */}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => handleTypeChange("partner_to_partner")}
                  className={`text-[11px] font-bold px-3 py-1 rounded-lg border transition inline-flex items-center gap-1 cursor-pointer ${
                    movementType === "partner_to_partner"
                      ? "bg-cyan-50 border-cyan-300 text-cyan-800 ring-1 ring-cyan-400"
                      : "border-border text-text-muted hover:text-text bg-white"
                  }`}
                >
                  <Handshake size={13} />
                  Ahmet ↔ Mehmet Arası Şahsi Borç Transferi
                </button>
              </div>
            </div>

            {/* Ortak Seçimi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  {movementType === "partner_to_partner" ? "Borç Veren Ortak *" : "İlgili Ortak *"}
                </label>
                <select
                  value={partnerId}
                  disabled={loading}
                  onChange={(e) => {
                    setPartnerId(e.target.value);
                    if (movementType === "partner_to_partner" && e.target.value === targetPartnerId) {
                      const other = partners.find((p) => p.id !== e.target.value);
                      if (other) setTargetPartnerId(other.id);
                    }
                  }}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-xs bg-white text-text font-bold focus:ring-2 focus:ring-brand-gold focus:outline-none"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {movementType === "partner_to_partner" && (
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Borç Alan Ortak *
                  </label>
                  <select
                    value={targetPartnerId}
                    disabled={loading}
                    onChange={(e) => setTargetPartnerId(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-xs bg-white text-text font-bold focus:ring-2 focus:ring-brand-gold focus:outline-none"
                  >
                    {partners
                      .filter((p) => p.id !== partnerId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Şahsi Gelir için "Her İki Ortağa Eşit Ekle" Seçeneği */}
            {movementType === "sahsi_gelir" && partners.length >= 2 && (
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="splitBoth"
                    checked={splitBoth}
                    onChange={(e) => setSplitBoth(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="splitBoth" className="font-bold text-purple-950 cursor-pointer">
                    Her iki ortağa da eşit gelir ekle (Ahmet ve Mehmet)
                  </label>
                </div>
                <span className="text-[11px] text-purple-800 font-semibold bg-white/80 px-2 py-0.5 rounded border border-purple-200">
                  {splitBoth ? "Tek tıkla ikisine de işler" : "Yalnızca seçili ortağa"}
                </span>
              </div>
            )}

            {/* Tutar & Tarih */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                  <Banknote size={14} className="text-emerald-600" /> 
                  {movementType === "sahsi_gelir" && splitBoth ? "Ortak Başına Tutar (₺) *" : "Tutar (₺) *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    disabled={loading}
                    placeholder="Örn: 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-base font-black text-text focus:ring-2 focus:ring-brand-gold focus:outline-none pl-8 tabular-nums"
                  />
                  <span className="absolute left-3 top-3 text-text-muted font-bold text-sm">₺</span>
                </div>
                {movementType === "sahsi_gelir" && splitBoth && amount && !isNaN(parseFloat(amount)) && (
                  <p className="text-[10.5px] text-purple-800 mt-1">
                    Toplam Gelen Kira: <b>{formatCurrency(parseFloat(amount) * 2)}</b> (Ahmet: {formatCurrency(parseFloat(amount))}, Mehmet: {formatCurrency(parseFloat(amount))})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-text-muted" /> İşlem Tarihi *
                </label>
                <input
                  type="date"
                  required
                  disabled={loading}
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-xs bg-white text-text font-semibold focus:ring-2 focus:ring-brand-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Kategori Seçimi */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Kategori
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {MOVEMENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setCategory(cat.key);
                      if (!reason || reason === "Cari Hareket") {
                        setReason(cat.label);
                      }
                    }}
                    className={`p-2 rounded-lg border text-left text-xs font-medium transition cursor-pointer truncate ${
                      category === cat.key
                        ? "border-brand-navy bg-brand-navy text-white shadow-xs font-bold"
                        : "border-border bg-white text-text hover:bg-surface"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Açıklama / Sebep */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-text-muted" /> İşlem Sebebi / Açıklama *
              </label>
              <input
                type="text"
                required
                disabled={loading}
                placeholder="Örn: Dükkan Kirası, Kamyonet Mazotu, Acil Seramik Bedeli vb."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-xs font-medium text-text focus:ring-2 focus:ring-brand-gold focus:outline-none"
              />
            </div>

            {/* Ekstra Notlar */}
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Özel Not (Opsiyonel)
              </label>
              <textarea
                rows={2}
                disabled={loading}
                placeholder="Ortaklar arası özel notlar, detaylar..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-xs font-normal text-text focus:ring-2 focus:ring-brand-gold focus:outline-none resize-none"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-surface text-text hover:bg-gray-200 border border-border transition"
              >
                Vazgeç
              </button>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-brand-navy hover:bg-brand-navy-2 text-white transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Hareketi Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
