import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { redirect } from "next/navigation";
import { ShoppingCart, Plus, ArrowRight } from "lucide-react";

export default async function SalesPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userData.user.id)
    .single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) redirect("/login");

  const { data: salesData } = await supabase
    .from("sales")
    .select("*, customer:customers(company_name, contact_name), creator:profiles(full_name)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(100);
    
  const sales = salesData as any[] | null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <ShoppingCart className="text-brand-navy" size={22} />
            Satışlar
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Gerçekleşen satışlar, stok çıkışları ve tahsilat durumları</p>
        </div>
        <Link
          href="/satis/yeni"
          className="bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus size={16} /> Yeni Satış Yap
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-surface border-b border-border text-text-muted uppercase text-[10px] font-bold">
            <tr>
              <th className="text-left px-4 py-3">Satış No</th>
              <th className="text-left px-4 py-3">Tarih</th>
              <th className="text-left px-4 py-3">Müşteri</th>
              <th className="text-right px-4 py-3">Genel Toplam</th>
              <th className="text-right px-4 py-3">Tahsil Edilen</th>
              <th className="text-right px-4 py-3">Kalan Alacak</th>
              <th className="text-center px-4 py-3">Statü</th>
              <th className="text-center px-4 py-3">Ödeme</th>
              <th className="text-right px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(!sales || sales.length === 0) ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-text-muted">
                  Henüz kaydedilmiş bir satış bulunmuyor.
                  <div className="mt-2">
                    <Link href="/satis/yeni" className="text-brand-navy font-bold hover:underline">
                      + İlk Satışı Oluştur
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const customerName = sale.customer_snapshot?.company_name || sale.customer?.company_name || sale.customer_snapshot?.contact_name || sale.customer?.contact_name || "Perakende Müşteri";
                const totalAmount = sale.grand_total ?? sale.total_amount ?? 0;
                const paidAmount = sale.paid_amount ?? 0;
                const remaining = sale.remaining_amount ?? Math.max(0, totalAmount - paidAmount);

                return (
                  <tr key={sale.id} className="hover:bg-surface/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-text">
                      {sale.sale_code}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(sale.sale_date || sale.created_at).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 font-medium text-text">
                      {customerName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-text">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600">
                      {formatCurrency(paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-rose-600">
                      {formatCurrency(remaining)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sale.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : sale.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {sale.status === 'completed' ? 'Tamamlandı' : sale.status === 'cancelled' ? 'İptal' : 'Taslak'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sale.payment_status === 'paid' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : sale.payment_status === 'partial' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {sale.payment_status === 'paid' ? 'Ödendi' : sale.payment_status === 'partial' ? 'Kısmi' : 'Ödenmedi'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link 
                        href={`/satislar/${sale.id}`} 
                        className="inline-flex items-center gap-1 text-brand-navy hover:text-black font-bold text-xs bg-surface px-2.5 py-1 rounded-lg border border-border hover:border-brand-navy transition"
                      >
                        Detay <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
