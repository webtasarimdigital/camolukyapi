"use client";

import { useState } from "react";
import { updateCustomer } from "./actions";
import { toast } from "sonner";
import { X, Loader2, CheckCircle2, User, Building, Phone, Mail, MapPin } from "lucide-react";

export function EditCustomerModal({
  customer,
  onClose,
}: {
  customer: {
    id: string;
    type: string;
    company_name?: string | null;
    contact_name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    tax_office?: string | null;
    tax_number?: string | null;
    notes?: string | null;
  };
  onClose: () => void;
}) {
  const [type, setType] = useState(customer.type || "bireysel");
  const [companyName, setCompanyName] = useState(customer.company_name || "");
  const [contactName, setContactName] = useState(customer.contact_name || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [email, setEmail] = useState(customer.email || "");
  const [address, setAddress] = useState(customer.address || "");
  const [taxOffice, setTaxOffice] = useState(customer.tax_office || "");
  const [taxNumber, setTaxNumber] = useState(customer.tax_number || "");
  const [notes, setNotes] = useState(customer.notes || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim()) {
      toast.error("İletişim kişisi / Müşteri adı zorunludur.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("company_name", companyName);
      formData.set("contact_name", contactName);
      formData.set("phone", phone);
      formData.set("email", email);
      formData.set("address", address);
      formData.set("tax_office", taxOffice);
      formData.set("tax_number", taxNumber);
      formData.set("notes", notes);

      await updateCustomer(customer.id, formData);
      toast.success("Müşteri bilgileri başarıyla güncellendi!");
      onClose();
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <User className="text-brand-navy" size={20} />
              Müşteri Düzenle
            </h2>
            <p className="text-xs text-text-muted">
              Müşteri iletişim ve fatura bilgilerini güncelleyin
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Tür Seçimi */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="radio"
                name="type"
                value="bireysel"
                checked={type === "bireysel"}
                onChange={() => setType("bireysel")}
              />
              Bireysel Müşteri
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="radio"
                name="type"
                value="kurumsal"
                checked={type === "kurumsal"}
                onChange={() => setType("kurumsal")}
              />
              Kurumsal (Firma)
            </label>
          </div>

          {type === "kurumsal" && (
            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <Building size={14} className="text-text-muted" /> Firma Ünvanı *
              </label>
              <input
                type="text"
                required={type === "kurumsal"}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
              <User size={14} className="text-text-muted" /> İletişim Kişisi / Ad Soyad *
            </label>
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <Phone size={14} className="text-text-muted" /> Telefon
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
                <Mail size={14} className="text-text-muted" /> E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1.5">
              <MapPin size={14} className="text-text-muted" /> Adres
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-gold transition"
            />
          </div>

          {type === "kurumsal" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Vergi Dairesi</label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Vergi Numarası</label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Özel Notlar</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm outline-none focus:border-brand-gold transition"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text bg-surface border border-border hover:bg-gray-200 transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-navy hover:bg-brand-navy-2 text-white flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin text-brand-gold" />
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Değişiklikleri Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
