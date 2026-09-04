'use client';

import { useState } from "react";
import { createCustomer } from "../actions";
import Link from "next/link";

export default function YeniMusteriPage() {
  const [type, setType] = useState("bireysel");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Yeni Müşteri</h1>
          <p className="text-sm text-text-muted">Sisteme yeni müşteri ekle</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-6">
        <form action={createCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Müşteri Türü</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="type" value="bireysel" checked={type === "bireysel"} onChange={() => setType("bireysel")} />
                Bireysel
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="type" value="kurumsal" checked={type === "kurumsal"} onChange={() => setType("kurumsal")} />
                Kurumsal
              </label>
            </div>
          </div>

          {type === "kurumsal" && (
            <div>
              <label className="block text-sm font-medium text-text mb-1">Firma Adı (Ünvan) *</label>
              <input type="text" name="company_name" required className="w-full border border-border rounded px-3 py-2 text-sm" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">İletişim Kişisi *</label>
            <input type="text" name="contact_name" required className="w-full border border-border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Telefon *</label>
            <input type="tel" name="phone" required className="w-full border border-border rounded px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">E-posta</label>
            <input type="email" name="email" className="w-full border border-border rounded px-3 py-2 text-sm" />
          </div>

          {type === "kurumsal" && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text mb-1">Vergi Dairesi</label>
                <input type="text" name="tax_office" className="w-full border border-border rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-text mb-1">Vergi Numarası</label>
                <input type="text" name="tax_number" className="w-full border border-border rounded px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Adres</label>
            <textarea name="address" rows={3} className="w-full border border-border rounded px-3 py-2 text-sm"></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Notlar</label>
            <textarea name="notes" rows={2} className="w-full border border-border rounded px-3 py-2 text-sm"></textarea>
          </div>

          <div className="pt-4 flex gap-4 justify-end">
            <Link href="/musteriler" className="px-4 py-2 rounded text-sm font-medium text-text bg-surface border border-border hover:bg-gray-100">
              İptal
            </Link>
            <button type="submit" className="px-4 py-2 rounded text-sm font-semibold bg-brand-gold text-brand-navy hover:bg-brand-gold-light">
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
