import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default async function HareketlerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const { data: rawData } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("transaction_date", { ascending: false })
    .limit(50);
  
  const hareketler = (rawData || []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Tüm Finansal Hareketler</h1>
          <p className="text-sm text-text-muted">Kayıtlı tüm gelir ve gider işlemleri</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tür</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Kategori</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Açıklama</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tutar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Kaynak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hareketler.length > 0 ? hareketler.map(h => (
              <tr key={h.id} className="hover:bg-surface transition">
                <td className="px-4 py-3">{formatDate(h.transaction_date)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${h.transaction_type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {h.transaction_type === 'income' ? 'Gelir' : 'Gider'}
                  </span>
                </td>
                <td className="px-4 py-3">{h.category || '-'}</td>
                <td className="px-4 py-3">{h.description || '-'}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${h.transaction_type === 'income' ? 'text-green-700' : 'text-brand-red'}`}>
                   {formatCurrency(h.amount)}
                </td>
                <td className="px-4 py-3 text-text-muted">{h.source_type}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
