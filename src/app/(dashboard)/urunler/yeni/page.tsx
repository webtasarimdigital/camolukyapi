'use client';

import Link from 'next/link';
import { createProduct } from '../actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function YeniUrunPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createProduct(formData);
      toast.success('Ürün başarıyla kaydedildi!');
      router.push('/urunler');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/urunler" className="text-text-muted hover:text-text">
          &larr; Geri
        </Link>
        <h1 className="text-xl font-bold text-text">Yeni Ürün Ekle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-border">
        {/* Temel Bilgiler */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Temel Bilgiler</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Ürün Kodu *</label>
              <input type="text" name="product_code" required className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Ürün Adı *</label>
              <input type="text" name="product_name" required className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        {/* Sınıflandırma */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Sınıflandırma</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Grup</label>
              <input type="text" name="product_group" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Seri</label>
              <input type="text" name="series_name" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Ebat</label>
              <input type="text" name="size" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Marka</label>
              <input type="text" name="brand" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        {/* Birim & Stok */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Birim & Stok</h2>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Birim</label>
              <select name="unit" className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                <option value="M2">M2</option>
                <option value="ADT">ADT</option>
                <option value="MT">MT</option>
                <option value="PAKET">PAKET</option>
                <option value="KOLİ">KOLİ</option>
                <option value="KG">KG</option>
                <option value="LT">LT</option>
                <option value="SET">SET</option>
                <option value="DİĞER">DİĞER</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Açılış Stoğu</label>
              <input type="number" step="any" name="stock_qty" defaultValue="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Min Stok</label>
              <input type="number" step="any" name="min_stock_qty" defaultValue="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-3 flex items-center gap-2 mt-2">
              <input type="checkbox" id="allows_decimal_qty" name="allows_decimal_qty" />
              <label htmlFor="allows_decimal_qty" className="text-sm text-text-muted">Ondalıklı miktara izin ver (örn: 1.5 m2)</label>
            </div>
          </div>
        </section>

        {/* Fiyatlar */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Fiyatlar (₺)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">1. Kalite Fiyatı</label>
              <input type="text" name="price_quality_1" className="w-full border border-border rounded-lg px-3 py-2 text-sm" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">2. Kalite Fiyatı</label>
              <input type="text" name="price_quality_2" className="w-full border border-border rounded-lg px-3 py-2 text-sm" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Ticari Fiyat</label>
              <input type="text" name="price_commercial" className="w-full border border-border rounded-lg px-3 py-2 text-sm" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Maliyet (Opsiyonel)</label>
              <input type="text" name="cost_price" className="w-full border border-border rounded-lg px-3 py-2 text-sm" placeholder="0,00" />
            </div>
          </div>
        </section>

        {/* Notlar */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Notlar</h2>
          <textarea name="notes" rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm"></textarea>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Link href="/urunler" className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text rounded-lg">
            İptal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-gold text-brand-navy px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Ürünü Kaydet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
