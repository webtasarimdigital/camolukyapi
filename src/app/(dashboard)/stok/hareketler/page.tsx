import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { formatQty } from '@/lib/formatters';

const MOVEMENT_TYPES: Record<string, string> = {
  opening: 'Açılış',
  purchase: 'Satın Alma',
  sale: 'Satış',
  sale_cancel: 'Satış İptali',
  return: 'İade',
  adjustment_in: 'Giriş Düzeltme',
  adjustment_out: 'Çıkış Düzeltme',
  manual_correction: 'Manuel Düzeltme'
};

export default async function StokHareketlerPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect('/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) redirect('/login');

  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('stock_movements')
    .select(`
      *,
      products (product_code, product_name, unit),
      profiles (full_name)
    `, { count: 'exact' })
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (searchParams.movement_type) {
    query = query.eq('movement_type', searchParams.movement_type as string);
  }

  const { data: rawMovements, count } = await query;
  const movements = rawMovements as any[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Stok Hareketleri</h1>
          <p className="text-sm text-text-muted">Tüm giriş/çıkış ve düzeltme hareketleri.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Ürün</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Hareket Tipi</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Miktar</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Önce</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Sonra</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Açıklama</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Kullanıcı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movements?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  Hareket bulunamadı.
                </td>
              </tr>
            )}
            {movements?.map((m) => (
              <tr key={m.id} className="hover:bg-surface transition">
                <td className="px-4 py-3 text-text-muted">{new Date(m.created_at).toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{m.products?.product_name}</div>
                  <div className="text-xs text-text-muted">{m.products?.product_code}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {MOVEMENT_TYPES[m.movement_type] || m.movement_type}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {m.quantity > 0 ? '+' : ''}{formatQty(m.quantity)} {m.products?.unit}
                </td>
                <td className="px-4 py-3 text-right text-text-muted tabular-nums">{formatQty(m.stock_before)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatQty(m.stock_after)}</td>
                <td className="px-4 py-3 text-text-muted">{m.notes}</td>
                <td className="px-4 py-3 text-text-muted">{m.profiles?.full_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
