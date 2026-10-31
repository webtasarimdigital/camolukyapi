"use client";

import { useState } from "react";
import { MessageSquare, Phone, X, ExternalLink, Copy, Check, Boxes, Package } from "lucide-react";
import { toast } from "sonner";
import { formatWhatsAppPhone } from "./WhatsAppQuoteModal";

export interface TedarikItemSummary {
  product_name: string;
  total_quantity: number;
  unit: string;
}

export interface WhatsAppTedarikModalProps {
  items: TedarikItemSummary[];
  supplierName?: string;
  supplierPhone?: string;
  variant?: "button" | "header" | "item";
  title?: string;
}

export function WhatsAppTedarikModal({
  items,
  supplierName = "",
  supplierPhone = "",
  variant = "button",
  title = "Tedarik Listesi",
}: WhatsAppTedarikModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState(supplierPhone || "");
  const [targetName, setTargetName] = useState(supplierName || "");
  const [copied, setCopied] = useState(false);

  const buildMessage = () => {
    let msg = "Merhaba, Çamoluk Yapı olarak tedarik etmek istediğimiz ürün listesi aşağıda yer almaktadır:\n\n";
    if (items && items.length > 0) {
      items.forEach((it, i) => {
        msg += `${i + 1}. ${it.product_name} - ${it.total_quantity} ${it.unit}\n`;
      });
    } else {
      msg += "(Tedarik edilecek ürün bulunamadı)\n";
    }
    msg += "\nEn kısa sürede fiyat ve termin dönüşü yapmanızı rica ederiz.\n\n";
    msg += "Çamoluk Yapı İletişim: 0552 676 19 07";
    return msg;
  };

  const [message, setMessage] = useState("");

  function handleOpen() {
    setPhone(supplierPhone || "");
    setTargetName(supplierName || "");
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
      {variant === "header" ? (
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <MessageSquare size={15} className="fill-white" />
          <span>WhatsApp ile Tedarik Listesi Gönder</span>
        </button>
      ) : variant === "item" ? (
        <button
          type="button"
          onClick={handleOpen}
          title="Bu Ürün İçin WhatsApp ile Tedarik Mesajı Gönder"
          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition cursor-pointer"
        >
          <MessageSquare size={13} className="fill-emerald-600" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <MessageSquare size={14} className="fill-white" />
          <span>WhatsApp&apos;tan İste</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150 text-left">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border">
            {/* Header */}
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">WhatsApp ile Tedarik Talebi</h3>
                  <p className="text-[11px] text-emerald-100">{title} • {items.length} Kalem Ürün</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text mb-1">
                    Tedarikçi Firma / Kişi:
                  </label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="Örn: Aragonit veya Mehmet Bey"
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text mb-1 flex items-center justify-between">
                    <span>Telefon Numarası:</span>
                    <span className="text-[10px] font-normal text-text-muted">Manuel düzenlenebilir</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className="w-full pl-8 pr-3 py-2.5 border border-border rounded-xl text-xs font-semibold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Message Preview & Edit */}
              <div>
                <label className="block font-bold text-text mb-1 flex items-center justify-between">
                  <span>Gönderilecek Mesaj ve Ürün Listesi:</span>
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
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border border-border rounded-xl font-mono text-[11px] outline-none focus:border-emerald-500 bg-surface/40 leading-relaxed"
                />
              </div>

              {/* Company Info Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 flex items-center justify-between">
                <div>
                  <p className="font-bold">Çamoluk Yapı İletişim Numarası:</p>
                  <p className="font-mono font-bold text-emerald-700 text-xs mt-0.5">0552 676 19 07</p>
                </div>
                <div className="text-right text-[10px] text-emerald-800">
                  <span>Listede {items.length} ürün yer almaktadır</span>
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
