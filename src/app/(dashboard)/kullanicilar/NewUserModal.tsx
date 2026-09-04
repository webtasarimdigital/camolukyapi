'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function NewUserModal({ companyId }: { companyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // In a real scenario, you'd call a server action here that uses Supabase Service Role Key
  // to create a user since normal users can't create other users in Supabase Auth.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    // Simulating server call. For full implementation, need service role actions.ts
    setTimeout(() => {
      toast.success('Kullanıcı oluşturuldu (Demo)');
      setIsOpen(false);
      setLoading(false);
    }, 1000);
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90">
        + Yeni Kullanıcı
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">Yeni Kullanıcı Ekle</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Ad Soyad</label>
            <input type="text" name="full_name" required className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Kullanıcı Adı (Email)</label>
            <div className="flex">
              <input type="text" name="username" required className="w-full border border-r-0 border-border rounded-l-lg px-3 py-2 text-sm" />
              <span className="inline-flex items-center px-3 border border-l-0 border-border rounded-r-lg bg-gray-50 text-gray-500 text-sm">
                @camolukyapi.com
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Şifre</label>
            <input type="password" name="password" required minLength={6} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Rol</label>
            <select name="role" required className="w-full border border-border rounded-lg px-3 py-2 text-sm">
              <option value="staff">Personel</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-text-muted">İptal</button>
            <button type="submit" disabled={loading} className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold">
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
