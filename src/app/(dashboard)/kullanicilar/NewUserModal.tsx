"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, X, ShieldCheck } from "lucide-react";
import { actionCreateUser } from "./actions";

export default function NewUserModal({ companyId }: { companyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await actionCreateUser(formData);
      if (res.success) {
        toast.success(res.message || "Kullanıcı başarıyla oluşturuldu!");
        setIsOpen(false);
        form.reset();
      } else {
        toast.error(res.error || "Kullanıcı oluşturulurken hata meydana geldi.");
      }
    } catch (err: any) {
      toast.error("Bağlantı hatası: " + (err?.message || "Sunucuya ulaşılamadı"));
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
      >
        <UserPlus size={15} /> + Yeni Kullanıcı Ekle
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-navy/10 text-brand-navy flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Yeni Kullanıcı Oluştur</h3>
              <p className="text-[11px] text-text-muted">Doğrudan Supabase Auth ve Profil kaydı</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-text-muted hover:text-text p-1 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-text mb-1">Ad Soyad *</label>
            <input
              type="text"
              name="full_name"
              required
              placeholder="Örn: Hasan Çelik"
              className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-surface outline-none focus:border-brand-navy focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-text mb-1">Kullanıcı Adı veya E-Posta *</label>
            <input
              type="text"
              name="email"
              required
              placeholder="Örn: hasan veya hasan@camolukyapi.com"
              className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-surface outline-none focus:border-brand-navy focus:bg-white transition font-mono"
            />
            <p className="text-[10px] text-text-muted mt-0.5">
              Yalnızca isim yazarsanız otomatik olarak <b>@camolukyapi.com</b> eklenecektir.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-text mb-1">Giriş Şifresi *</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="En az 6 karakter"
              className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-surface outline-none focus:border-brand-navy focus:bg-white transition font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-text mb-1">Yetki ve Rol Seçimi *</label>
            <select
              name="role"
              required
              defaultValue="staff"
              className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-surface outline-none focus:border-brand-navy focus:bg-white transition font-medium"
            >
              <option value="muhasebe1">Muhasebe 1 (Genel Muhasebe, Teklif, Satış, Ödemeler)</option>
              <option value="muhasebe2">Muhasebe 2 (Tüm Muhasebe + Finans & Ortak Cari)</option>
              <option value="sevkiyat">Sevkiyat Sorumlusu (Sevkiyat, Otobil GPS & Stok)</option>
              <option value="staff">Personel (Standart Personel Erişimi)</option>
              <option value="admin">Yönetici / Admin (Tam Yetkili)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text rounded-xl"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-navy hover:bg-brand-navy-light text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Kullanıcı Açılıyor...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="text-brand-gold" />
                  <span>Kullanıcıyı Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
