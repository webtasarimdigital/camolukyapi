import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatQty } from '@/lib/formatters';
import { Suspense } from 'react';

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', userData.user.id)
    .single();

  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect('/login');

  const q = typeof searchParams.q === 'string' ? searchParams.q : '';
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('company_id', profile.company_id)
    .is('deleted_at', null)
    .range(from, to);

  if (q) {
    query = query.or(`product_code.ilike.%${q}%,product_name.ilike.%${q}%,series_name.ilike.%${q}%`);
  }

  const { data: rawProducts, count } = await query;
  const products = rawProducts as any[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Ürünler</h1>
          <p className="text-sm text-text-muted">Tüm ürünlerinizi buradan yönetebilirsiniz.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/import"
            className="bg-surface border border-border text-text px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
          >
            Excel Yükle
          </Link>
          <Link
            href="/urunler/yeni"
            className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
          >
            + Yeni Ürün
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border flex gap-4 items-center">
        <form className="flex gap-4 flex-1">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Ürün kodu, adı veya seri ara..."
            className="border border-border rounded-lg px-3 py-2 text-sm w-full max-w-sm"
          />
          <button type="submit" className="bg-brand-navy text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Ara
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm sticky-header">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Ürün Kodu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Ürün Adı</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Ebat</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Grup</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Seri</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Birim</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">1. Kalite</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">2. Kalite</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Ticari</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Stok</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Durum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products?.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-text-muted">
                    Kayıtlı ürün bulunamadı.
                  </td>
                </tr>
              )}
              {products?.map((product) => {
                const isCritical = product.min_stock_qty > 0 && product.stock_qty <= product.min_stock_qty;
                return (
                  <tr key={product.id} className="hover:bg-surface transition">
                    <td className="px-4 py-3">{product.product_code}</td>
                    <td className="px-4 py-3 font-medium">{product.product_name}</td>
                    <td className="px-4 py-3 text-text-muted">{product.size}</td>
                    <td className="px-4 py-3 text-text-muted">{product.product_group}</td>
                    <td className="px-4 py-3 text-text-muted">{product.series_name}</td>
                    <td className="px-4 py-3 text-text-muted">{product.unit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(product.price_quality_1)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(product.price_quality_2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(product.price_commercial)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isCritical ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {formatQty(product.stock_qty)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Aktif
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-navy hover:underline">
                      <Link href={`/urunler/${product.id}`}>Düzenle</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Toplam {count} kayıttan {from + 1}-{Math.min(to + 1, count || 0)} arası gösteriliyor.</p>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={`/urunler?page=${page - 1}${q ? `&q=${q}` : ''}`} className="px-3 py-1 border border-border rounded text-sm hover:bg-surface">
              Önceki
            </Link>
          )}
          {((count || 0) > to + 1) && (
            <Link href={`/urunler?page=${page + 1}${q ? `&q=${q}` : ''}`} className="px-3 py-1 border border-border rounded text-sm hover:bg-surface">
              Sonraki
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
