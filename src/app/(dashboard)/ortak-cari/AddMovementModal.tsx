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
  const [movementType, setMovementType] = useState<
    "partner_to_company" | "company_to_partner" | "partner_to_partner" | "profit_distribution"
  >("partner_to_company");
  const [targetPartnerId, setTargetPartnerId] = useState(
    partners.find((p) => p.id !== (defaultPartnerId || (partners.length > 0 ? partners[0].id : "")))?.id || ""
  );
  const [category, setCategory] = useState("akaryakit");
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

  const selectedCategoryDef = MOVEMENT_CATEGORIES.find((c) => c.key === category);

  function getMovementLabel(type: string) {
    switch (type) {
      case "partner_to_company":
        return "Ortak Firmaya Borç Verdi";
      case "company_to_partner":
        return "Firma Ortağa Para Verdi (Ödeme / Avans)";
      case "partner_to_partner":
        return "Ortaklar Arası Şahsi Borç";
      case "profit_distribution":
        return "Bağımsız Kâr Dağıtımı (Kâr Payı)";
      default:
        return "Cari Hareket";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) {
      toast.warning(`Yeni borç girmek için lütfen ${cooldown} saniye bekleyin.`);
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

      await addPartnerMovement(formData);

      const currentPartner = partners.find((p) => p.id === partnerId)?.name || "Ortak";
      const targetPartner = targetPartnerId
        ? partners.find((p) => p.id === targetPartnerId)?.name
        : undefined;

      sessionStorage.setItem("camoluk_partner_debt_cooldown", Date.now().toString());
      setCooldown(10);
      setSubmittedInfo({
        partnerName: currentPartner,
        targetPartnerName: targetPartner,
        movementTypeLabel: getMovementLabel(movementType),
        amount: numAmount,
        reason: finalReason,
        transactionDate,
      });

      toast.success("Cari hareket başarıyla eklendi!");
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
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Handshake className="text-amber-600" size={20} />
              Yeni Ortak Finans Hareketi
            </h2>
            <p className="text-xs text-text-muted">
              Şirket resmi muhasebesinden bağımsız ortak cari kaydı
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
                    ? ` ➔ ${submittedInfo.targetPartnerName}`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-text-muted">İşlem Tutarı:</span>
                <span className="text-sm font-black text-emerald-700 tabular-nums">
                  {formatCurrency(submittedInfo.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs text-text-muted">Sebep / Açıklama:</span>
                <span className="text-xs font-semibold text-text max-w-[280px] truncate">
                  {submittedInfo.reason}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted">Tarih:</span>
                <span className="text-xs font-medium text-text-muted">
                  {submittedInfo.transactionDate}
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
                  {cooldown > 0 ? `${cooldown} sn` : "Süre Doldu (Hazır)"}
                </span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Yanlışlıkla iki kere basıp mükerrer borç eklemeyi önlemek için 10 saniyelik bekleme koruması aktiftir.
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
                Kapat ve Bakiyeyi Gör
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
                    <Lock size={14} /> Yeni Borç ({cooldown} sn)
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

            <div>
              <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                İşlem Tipi *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setMovementType("partner_to_company")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                    movementType === "partner_to_company"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "border-border hover:bg-surface text-text-muted"
                  }`}
                >
                  <ArrowUpRight className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="text-xs font-bold text-emerald-800">
                      Ortak Firmaya Borç Verdi
                    </div>
                    <div className="text-[11px] text-emerald-700/80">
                      Ortağın alacağı, firmanın borcu artar
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setMovementType("company_to_partner")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                    movementType === "company_to_partner"
                      ? "border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20"
                      : "border-border hover:bg-surface text-text-muted"
                  }`}
                >
                  <ArrowDownLeft className="text-rose-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="text-xs font-bold text-rose-800">
                      Firma Ortağa Para Verdi
                    </div>
                    <div className="text-[11px] text-rose-700/80">
                      Borç geri ödemesi veya şahsi avans
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setMovementType("partner_to_partner")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                    movementType === "partner_to_partner"
                      ? "border-cyan-600 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20"
                      : "border-border hover:bg-surface text-text-muted"
                  }`}
                >
                  <Handshake className="text-cyan-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="text-xs font-bold text-cyan-800">
                      Ortaklar Arası Şahsi Borç
                    </div>
                    <div className="text-[11px] text-cyan-700/80">
                      Ahmet ↔ Mehmet şahsi borçlaşma
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setMovementType("profit_distribution")}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                    movementType === "profit_distribution"
                      ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20"
                      : "border-border hover:bg-surface text-text-muted"
                  }`}
                >
                  <TrendingUp className="text-purple-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="text-xs font-bold text-purple-800">
                      Bağımsız Kâr Dağıtımı
                    </div>
                    <div className="text-[11px] text-purple-700/80">
                      Projeden bağımsız ortak kâr payı
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div
              className={`grid gap-4 ${
                movementType === "partner_to_partner"
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  {movementType === "partner_to_partner"
                    ? "Borç Veren Ortak *"
                    : "İlgili Ortak *"}
                </label>
                <select
                  disabled={loading}
                  value={partnerId}
                  onChange={(e) => {
                    setPartnerId(e.target.value);
                    const other = partners.find((p) => p.id !== e.target.value);
                    if (other) setTargetPartnerId(other.id);
                  }}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text outline-none focus:border-brand-gold transition disabled:opacity-50"
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
                    Borcu Alan Ortak *
                  </label>
                  <select
                    disabled={loading}
                    value={targetPartnerId}
                    onChange={(e) => setTargetPartnerId(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text outline-none focus:border-brand-gold transition disabled:opacity-50"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                  <Banknote size={14} className="text-emerald-600" /> Tutar (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  disabled={loading}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Örn: 50000"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text outline-none focus:border-brand-gold transition disabled:opacity-50"
                />
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
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand-gold transition disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
                Borç Sebebi / Kategori *
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-border rounded-xl bg-surface/50">
                {MOVEMENT_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setCategory(cat.key);
                        if (!reason || MOVEMENT_CATEGORIES.some((c) => c.label === reason)) {
                          setReason(cat.label);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-brand-navy text-white shadow-sm"
                          : "bg-white text-text hover:bg-gray-100 border border-border"
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-text-muted" /> Açıklama / Borç Nedeni
              </label>
              <input
                type="text"
                disabled={loading}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Örn: Kamyonet mazotu ve şantiye teslim nakliyesi"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand-gold transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Özel Notlar (İsteğe Bağlı)
              </label>
              <textarea
                rows={2}
                disabled={loading}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Geri ödeme planı, anlaşma detayları..."
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-text outline-none focus:border-brand-gold transition disabled:opacity-50"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-border">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text bg-surface border border-border hover:bg-gray-200 transition disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition shadow-sm ${
                  loading || cooldown > 0
                    ? "bg-gray-400 cursor-not-allowed opacity-75"
                    : "bg-brand-navy hover:bg-brand-navy-2 active:scale-95"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-brand-gold" />
                    <span>Kaydediliyor, Lütfen Bekleyin...</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <Lock size={14} />
                    <span>Lütfen Bekleyin ({cooldown} sn)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
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
