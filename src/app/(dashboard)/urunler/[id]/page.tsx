'use client';

import Link from 'next/link';
import { updateProduct, deactivateProduct } from '../actions';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle2, Trash2 } from 'lucide-react';

export default function DuzenleUrunPage() {
  const routeParams = useParams();
  const router = useRouter();
  const id = routeParams?.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) {
        toast.error('Ürün yüklenemedi');
      } else {
        setProduct(data);
      }
      setLoading(false);
    }
    loadProduct();
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateProduct(id, formData);
      toast.success('Ürün başarıyla güncellendi!');
      router.push('/urunler');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      setDeleting(true);
      try {
        await deactivateProduct(id);
        toast.success('Ürün silindi.');
        router.push('/urunler');
      } catch (error: any) {
        toast.error('Hata: ' + error.message);
        setDeleting(false);
      }
    }
  }

  if (loading) return <div className="animate-pulse bg-gray-200 rounded h-64 w-full max-w-3xl"></div>;
  if (!product) return <div>Ürün bulunamadı.</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/urunler" className="text-text-muted hover:text-text">
            &larr; Geri
          </Link>
          <h1 className="text-xl font-bold text-text">Ürün Düzenle</h1>
        </div>
        <button
          type="button"
          disabled={deleting || saving}
          onClick={handleDelete}
          className="bg-brand-red text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center gap-1.5 disabled:opacity-50"
        >
          {deleting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Siliniyor...
            </>
          ) : (
            <>
              <Trash2 size={14} /> Ürünü Sil
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-border">
        {/* Temel Bilgiler */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Temel Bilgiler</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Ürün Kodu</label>
              <input type="text" name="product_code" readOnly defaultValue={product.product_code} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Ürün Adı *</label>
              <input type="text" name="product_name" required defaultValue={product.product_name} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        {/* Sınıflandırma */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Sınıflandırma</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Grup</label>
              <input type="text" name="product_group" defaultValue={product.product_group} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Seri</label>
              <input type="text" name="series_name" defaultValue={product.series_name} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Ebat</label>
              <input type="text" name="size" defaultValue={product.size} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Marka</label>
              <input type="text" name="brand" defaultValue={product.brand} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        {/* Birim & Stok */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Birim & Stok</h2>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Birim</label>
              <select name="unit" defaultValue={product.unit} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
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
              <label className="block text-sm font-medium text-text mb-1">Mevcut Stok</label>
              <input type="text" readOnly value={product.stock_qty} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Min Stok</label>
              <input type="number" step="any" name="min_stock_qty" defaultValue={product.min_stock_qty} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-3 flex items-center gap-2 mt-2">
              <input type="checkbox" id="allows_decimal_qty" name="allows_decimal_qty" defaultChecked={product.allows_decimal_qty} />
              <label htmlFor="allows_decimal_qty" className="text-sm text-text-muted">Ondalıklı miktara izin ver</label>
            </div>
          </div>
        </section>

        {/* Fiyatlar */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Fiyatlar (₺)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">1. Kalite Fiyatı</label>
              <input type="text" name="price_quality_1" defaultValue={product.price_quality_1} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">2. Kalite Fiyatı</label>
              <input type="text" name="price_quality_2" defaultValue={product.price_quality_2} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Ticari Fiyat</label>
              <input type="text" name="price_commercial" defaultValue={product.price_commercial} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Maliyet</label>
              <input type="text" name="cost_price" defaultValue={product.cost_price} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        {/* Notlar */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Notlar</h2>
          <textarea name="notes" rows={3} defaultValue={product.notes} className="w-full border border-border rounded-lg px-3 py-2 text-sm"></textarea>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Link href="/urunler" className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text rounded-lg">
            İptal
          </Link>
          <button
            type="submit"
            disabled={saving || deleting}
            className="bg-brand-gold text-brand-navy px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Güncelleniyor...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Güncelle ve Kaydet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
