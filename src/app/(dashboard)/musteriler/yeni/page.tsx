"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomer } from "../actions";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserPlus,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function YeniMusteriPage() {
  const router = useRouter();
  const [type, setType] = useState<"bireysel" | "kurumsal">("bireysel");
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!contactName.trim()) {
      toast.error("Lütfen iletişim kişisi adını girin.");
      return;
    }

    if (!phone.trim()) {
      toast.error("Lütfen telefon numarasını girin.");
      return;
    }

    if (type === "kurumsal" && !companyName.trim()) {
      toast.error("Kurumsal müşteriler için Firma Ünvanı zorunludur.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("contact_name", contactName.trim());
      formData.set("phone", phone.trim());
      formData.set("company_name", type === "kurumsal" ? companyName.trim() : "");
      formData.set("email", email.trim());
      formData.set("tax_office", taxOffice.trim());
      formData.set("tax_number", taxNumber.trim());
      formData.set("address", address.trim());
      formData.set("notes", notes.trim());

      const res = await createCustomer(formData);
      toast.success("Müşteri başarıyla kaydedildi!");

      if (res?.id) {
        router.push(`/musteriler/${res.id}`);
      } else {
        router.push("/musteriler");
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Müşteri kaydedilemedi";
      toast.error("Hata: " + msg);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Üst Bar */}
      <div className="flex items-center gap-3">
        <Link
          href="/musteriler"
          className="p-2 rounded-xl border border-border hover:bg-white text-text-muted hover:text-text transition shadow-2xs"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-text flex items-center gap-2">
            <UserPlus className="text-brand-gold" size={22} />
            Yeni Müşteri Ekle
          </h1>
          <p className="text-xs text-text-muted">
            Sisteme yeni bireysel veya kurumsal müşteri kaydı oluşturun.
          </p>
        </div>
      </div>

      {/* Form Kartı */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Müşteri Türü Seçimi */}
          <div>
            <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
              Müşteri Türü *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("bireysel")}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition ${
                  type === "bireysel"
                    ? "border-brand-navy bg-brand-navy/5 text-brand-navy ring-2 ring-brand-navy/20 font-bold"
                    : "border-border hover:bg-surface text-text-muted"
                }`}
              >
                <User size={18} className={type === "bireysel" ? "text-brand-navy" : "text-text-muted"} />
                <div>
                  <div className="text-xs font-bold">Bireysel Müşteri</div>
                  <div className="text-[11px] text-text-muted">Şahıs / Perakende Müşteri</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType("kurumsal")}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition ${
                  type === "kurumsal"
                    ? "border-brand-navy bg-brand-navy/5 text-brand-navy ring-2 ring-brand-navy/20 font-bold"
                    : "border-border hover:bg-surface text-text-muted"
                }`}
              >
                <Building2 size={18} className={type === "kurumsal" ? "text-brand-navy" : "text-text-muted"} />
                <div>
                  <div className="text-xs font-bold">Kurumsal Müşteri</div>
                  <div className="text-[11px] text-text-muted">Firma / Müteahhit / Şirket</div>
                </div>
              </button>
            </div>
          </div>

          {/* Kurumsal: Firma Ünvanı */}
          {type === "kurumsal" && (
            <div>
              <label className="block text-xs font-bold text-text mb-1 flex items-center gap-1.5">
                <Building2 size={14} className="text-text-muted" /> Firma Ünvanı *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Örn: Anadolu İnşaat San. ve Tic. Ltd. Şti."
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text outline-none focus:border-brand-gold transition"
              />
            </div>
          )}

          {/* İletişim Kişisi */}
          <div>
            <label className="block text-xs font-bold text-text mb-1 flex items-center gap-1.5">
              <User size={14} className="text-text-muted" /> İletişim Kişisi / Ad Soyad *
            </label>
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Örn: Ömer Faruk"
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text outline-none focus:border-brand-gold transition"
            />
          </div>

          {/* Telefon ve E-posta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text mb-1 flex items-center gap-1.5">
                <Phone size={14} className="text-text-muted" /> Telefon *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Örn: 0537 603 95 08"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text outline-none focus:border-brand-gold transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text mb-1 flex items-center gap-1.5">
                <Mail size={14} className="text-text-muted" /> E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Örn: omer@example.com"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand-gold transition"
              />
            </div>
          </div>

          {/* Kurumsal: Vergi Dairesi ve No */}
          {type === "kurumsal" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text mb-1">Vergi Dairesi</label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  placeholder="Örn: Üsküdar V.D."
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand-gold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">Vergi Numarası</label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="Örn: 1234567890"
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-brand-gold transition"
                />
              </div>
            </div>
          )}

          {/* Adres */}
          <div>
            <label className="block text-xs font-bold text-text mb-1 flex items-center gap-1.5">
              <MapPin size={14} className="text-text-muted" /> Adres
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Mahalle, cadde, sokak, ilçe / il..."
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-text outline-none focus:border-brand-gold transition"
            />
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-xs font-bold text-text mb-1 flex items-center gap-1.5">
              <StickyNote size={14} className="text-text-muted" /> Müşteri Notları
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Özel iskonto şartları, teslimat tercihleri..."
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-text outline-none focus:border-brand-gold transition"
            />
          </div>

          {/* Aksiyon Butonları */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <Link
              href="/musteriler"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-text bg-surface border border-border hover:bg-gray-200 transition"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-2.5 rounded-xl text-xs font-bold bg-brand-gold hover:bg-brand-gold-light text-brand-navy flex items-center gap-2 transition disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Kaydediliyor...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
