"use client";

import { useState } from "react";
import { MessageSquare, Phone, X, ExternalLink, Copy, Check } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export interface WhatsAppQuoteModalProps {
  quoteId: string;
  quoteCode: string;
  customerName: string;
  customerPhone?: string | null;
  grandTotal?: number;
  itemsCount?: number;
  variant?: "button" | "icon";
}

export function formatWhatsAppPhone(raw: string): string {
  const digits = (raw || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("05") && digits.length === 11) return "9" + digits;
  if (digits.startsWith("5") && digits.length === 10) return "90" + digits;
  return digits;
}

export function WhatsAppQuoteModal({
  quoteId,
  quoteCode,
  customerName,
  customerPhone,
  grandTotal,
  itemsCount,
  variant = "button",
}: WhatsAppQuoteModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState(customerPhone || "");
  const [copied, setCopied] = useState(false);

  const getPdfUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/teklif-yazdir/${quoteId}`;
    }
    return `/teklif-yazdir/${quoteId}`;
  };

  const buildMessage = () => {
    const url = getPdfUrl();
    let msg = `Merhaba, Çamoluk Yapı olarak TKF-${quoteCode} numaralı teklif listeniz hazırlanmıştır.\n\n`;
    msg += `📄 Teklif Detayları ve PDF Çıktısı:\n${url}\n\n`;
    if (grandTotal && grandTotal > 0) {
      msg += `💰 Toplam Tutar: ${formatCurrency(grandTotal)}\n`;
    }
    msg += `Çamoluk Yapı İletişim: 0552 676 19 07`;
    return msg;
  };

  const [message, setMessage] = useState("");

  function handleOpen() {
    setPhone(customerPhone || "");
    setMessage(buildMessage());
    setIsOpen(true);
  }

  function handleSend() {
    const validPhone = formatWhatsAppPhone(phone);
    if (!validPhone || validPhone.length < 10) {
      toast.error("Lütfen geçerli bir telefon numarası giriniz.");
      return;
    }
    const finalMsg = message.trim() || buildMessage();
    const url = `https://wa.me/${validPhone}?text=${encodeURIComponent(finalMsg)}`;
    window.open(url, "_blank");
    setIsOpen(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(message || buildMessage());
    setCopied(true);
    toast.success("Mesaj panoya kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={handleOpen}
          title="WhatsApp ile Gönder"
          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition cursor-pointer"
        >
          <MessageSquare size={14} className="fill-emerald-600" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          title="WhatsApp ile Müşteriye Teklif Gönder"
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <MessageSquare size={14} className="fill-white" />
          <span>WhatsApp ile Gönder</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border">
            {/* Header */}
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare size={18} className="fill-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">WhatsApp ile Teklif Gönder</h3>
                  <p className="text-[11px] text-emerald-100">TKF-{quoteCode} • {customerName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Phone Input with manual editing */}
              <div>
                <label className="block font-bold text-text mb-1 flex items-center justify-between">
                  <span>Gönderilecek Telefon Numarası:</span>
                  <span className="text-[11px] font-normal text-text-muted">Numarayı düzenleyebilirsiniz</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Müşteri rehberindeki numara otomatik getirildi. Gerekirse başka numara yazabilirsiniz.
                </p>
              </div>

              {/* Message Preview & Edit */}
              <div>
                <label className="block font-bold text-text mb-1 flex items-center justify-between">
                  <span>Gönderilecek Mesaj:</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? "Kopyalandı" : "Metni Kopyala"}</span>
                  </button>
                </label>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border border-border rounded-xl font-sans text-xs outline-none focus:border-emerald-500 bg-surface/40"
                />
              </div>

              {/* Company Info Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 flex items-center justify-between">
                <div>
                  <p className="font-bold">Çamoluk Yapı İletişim Numarası:</p>
                  <p className="font-mono font-bold text-emerald-700 text-xs mt-0.5">0552 676 19 07</p>
                </div>
                <div className="text-right text-[10px] text-emerald-800">
                  <span>PDF bağlantısı mesaja eklidir</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface/50 border-t border-border flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-text-muted hover:text-text font-semibold text-xs cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <MessageSquare size={14} className="fill-white" />
                <span>WhatsApp&apos;ı Aç ve Gönder</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
