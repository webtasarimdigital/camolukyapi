'use client';

import { useState } from 'react';
import { adjustStock } from './actions';
import { toast } from 'sonner';

export default function AdjustStockModal({ product, companyId }: { product: any, companyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await adjustStock(
        product.id,
        companyId,
        formData.get('movement_type') as string,
        Number(formData.get('quantity')),
        formData.get('reason') as string
      );
      toast.success('Stok güncellendi');
      setIsOpen(false);
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="text-brand-navy hover:underline text-sm font-semibold">
        Stok Düzenle
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">{product.product_name} - Stok Düzenle</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Mevcut Stok: {product.stock_qty} {product.unit}</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">İşlem Tipi</label>
            <select name="movement_type" required className="w-full border border-border rounded-lg px-3 py-2 text-sm">
              <option value="adjustment_in">Giriş Düzeltme (+)</option>
              <option value="adjustment_out">Çıkış Düzeltme (-)</option>
              <option value="manual_correction">Manuel Düzeltme (Tam Değer)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Miktar</label>
            <input type="number" step="any" name="quantity" required className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Açıklama (Zorunlu)</label>
            <input type="text" name="reason" required className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-text-muted">İptal</button>
            <button type="submit" disabled={loading} className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold">
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
