import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { redirect } from "next/navigation";

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
    .limit(50);
    
  const sales = salesData as any[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Satışlar</h1>
          <p className="text-sm text-text-muted">Gerçekleşen satışlar ve tahsilat durumları</p>
        </div>
        <Link
          href="/satis/yeni"
          className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition"
        >
          + Yeni Satış
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Satış No</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Müşteri</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Tutar</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Kalan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Statü</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Ödeme</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sales?.map((sale) => (
              <tr key={sale.id} className="hover:bg-surface transition">
                <td className="px-4 py-3 font-mono text-xs">STS-{sale.sale_code}</td>
                <td className="px-4 py-3">{new Date(sale.created_at).toLocaleDateString("tr-TR")}</td>
                <td className="px-4 py-3">{sale.customer?.company_name || sale.customer?.contact_name || "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(sale.total_amount)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-brand-red font-medium">{formatCurrency(sale.remaining_amount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sale.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {sale.status === 'completed' ? 'Tamamlandı' : sale.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' : sale.payment_status === 'partial' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                    {sale.payment_status === 'paid' ? 'Ödendi' : sale.payment_status === 'partial' ? 'Kısmi' : 'Ödenmedi'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/satislar/${sale.id}`} className="text-brand-navy hover:underline text-xs font-medium">Görüntüle</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
