import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatQty } from '@/lib/formatters';
import AdjustStockModal from './AdjustStockModal';

export default async function StokPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
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

  const q = typeof sp.q === 'string' ? sp.q : '';
  const criticalOnly = sp.critical === 'true';

  let query = supabase
    .from('products')
    .select('*')
    .eq('company_id', profile.company_id)
    .is('deleted_at', null);

  if (q) {
    query = query.or(`product_code.ilike.%${q}%,product_name.ilike.%${q}%`);
  }

  const { data: rawProducts } = await query;
  let products = rawProducts as any[] | null;

  if (criticalOnly && products) {
    products = products.filter(p => p.min_stock_qty > 0 && p.stock_qty <= p.min_stock_qty);
  }

  const totalProducts = products?.length || 0;
  const criticalCount = products?.filter(p => p.min_stock_qty > 0 && p.stock_qty <= p.min_stock_qty).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Stok Yönetimi</h1>
          <p className="text-sm text-text-muted">Ürün stoklarını izleyin ve düzenleyin.</p>
        </div>
        <Link
          href="/stok/hareketler"
          className="bg-surface border border-border text-text px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition"
        >
          Stok Hareketleri
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border">
          <p className="text-sm text-text-muted">Toplam Ürün</p>
          <p className="text-2xl font-bold text-text">{totalProducts}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border">
          <p className="text-sm text-text-muted">Kritik Stok Sayısı</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border flex gap-4 items-center">
        <form className="flex gap-4 flex-1 items-center">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Ürün ara..."
            className="border border-border rounded-lg px-3 py-2 text-sm w-full max-w-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="critical" value="true" defaultChecked={criticalOnly} />
            Sadece kritik stok
          </label>
          <button type="submit" className="bg-brand-navy text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Filtrele
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Ürün Kodu</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Ürün Adı</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Birim</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Mevcut Stok</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Min Stok</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Durum</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  Stok kaydı bulunamadı.
                </td>
              </tr>
            )}
            {products?.map((product) => {
              const isCritical = product.min_stock_qty > 0 && product.stock_qty <= product.min_stock_qty;
              return (
                <tr key={product.id} className="hover:bg-surface transition">
                  <td className="px-4 py-3">{product.product_code}</td>
                  <td className="px-4 py-3 font-medium">{product.product_name}</td>
                  <td className="px-4 py-3 text-text-muted">{product.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatQty(product.stock_qty)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted">{formatQty(product.min_stock_qty)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isCritical ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {isCritical ? 'Kritik' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdjustStockModal product={product} companyId={profile.company_id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
