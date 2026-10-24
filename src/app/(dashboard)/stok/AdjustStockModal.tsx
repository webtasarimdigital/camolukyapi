'use client';

import { useState } from 'react';
import { adjustStock } from './actions';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function AdjustStockModal({ product, companyId }: { product: any, companyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movementType, setMovementType] = useState<string>('manual_correction');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const qty = Number(formData.get('quantity'));
      if (isNaN(qty)) {
        throw new Error('Lütfen geçerli bir miktar giriniz.');
      }
      const reason = (formData.get('reason') as string) || 'Manuel stok düzenlemesi';

      await adjustStock(
        product.id,
        companyId,
        movementType,
        qty,
        reason
      );
      toast.success('Stok başarıyla güncellendi!');
      setIsOpen(false);
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold text-brand-navy bg-brand-navy/5 hover:bg-brand-navy hover:text-white px-2 py-1 rounded transition border border-brand-navy/15 cursor-pointer"
        title="Hızlı Stok Düzenle"
      >
        Stok Düzenle
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <h3 className="text-base font-bold text-text truncate max-w-[320px]">
            {product.product_name}
          </h3>
          <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text font-bold text-lg">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="bg-surface p-3 rounded-lg border border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Mevcut Sistem Stoğu:</span>
            <span className="text-sm font-bold text-brand-navy">
              {product.stock_qty} {product.unit || 'Birim'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">İşlem Tipi</label>
            <select
              name="movement_type"
              required
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-xs font-semibold bg-white outline-none focus:border-brand-navy"
            >
              <option value="manual_correction">Manuel Düzeltme (Yeni Toplam Stoğu Gir)</option>
              <option value="adjustment_in">Giriş Düzeltme (+ Ekle)</option>
              <option value="adjustment_out">Çıkış Düzeltme (- Düş)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              {movementType === 'manual_correction'
                ? `Yeni Toplam Stok Miktarı (${product.unit || 'Birim'}) *`
                : movementType === 'adjustment_out'
                ? `Düşülecek Miktar (${product.unit || 'Birim'}) *`
                : `Eklenecek Miktar (${product.unit || 'Birim'}) *`}
            </label>
            <input
              type="number"
              step="any"
              name="quantity"
              required
              placeholder={movementType === 'manual_correction' ? String(product.stock_qty) : '0'}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-bold text-brand-navy bg-white outline-none focus:border-brand-navy"
              autoFocus
            />
            {movementType === 'manual_correction' && (
              <p className="text-[11px] text-text-muted mt-1">
                Örn: Sistemde {product.stock_qty} yazıyor, gerçekte 1600 ise buraya doğrudan <b>1600</b> yazın.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Açıklama (Opsiyonel)</label>
            <input
              type="text"
              name="reason"
              placeholder="Örn: Sayım düzeltmesi, depo sayımı vb."
              className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-brand-navy"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text rounded-lg border border-border cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-gold text-brand-navy px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition hover:opacity-90 disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Stoğu Güncelle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
