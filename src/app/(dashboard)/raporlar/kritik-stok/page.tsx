import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function KritikStokPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const { data: rawData } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", profile.company_id)
    .gt("min_stock_qty", 0);
  
  const products = (rawData || []) as any[];
  const criticalProducts = products.filter(p => Number(p.stock_qty) <= Number(p.min_stock_qty));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Kritik Stok Raporu</h1>
          <p className="text-sm text-text-muted">Minimum stok seviyesinin altına düşen ürünler</p>
        </div>
        <button className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition">
          CSV İndir
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Ürün Kodu</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Ad</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Birim</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Mevcut Stok</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Min Stok</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Fark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {criticalProducts.length > 0 ? criticalProducts.map(p => {
              const fark = Number(p.stock_qty) - Number(p.min_stock_qty);
              return (
                <tr key={p.id} className="hover:bg-surface transition">
                  <td className="px-4 py-3">{p.product_code}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{p.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.stock_qty}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.min_stock_qty}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-red font-bold">{fark}</td>
                </tr>
              )
            }) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Kritik stok seviyesinde ürün bulunmamaktadır.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
