import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default async function GiderlerPage() {
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
    .eq("transaction_type", "expense")
    .order("transaction_date", { ascending: false })
    .limit(50);
  
  const giderler = (rawData || []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Giderler</h1>
          <p className="text-sm text-text-muted">Firma giderleri yönetimi</p>
        </div>
        <button className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition">
          + Gider Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Kategori</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Açıklama</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Yöntem</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {giderler.length > 0 ? giderler.map(g => (
              <tr key={g.id} className="hover:bg-surface transition">
                <td className="px-4 py-3">{formatDate(g.transaction_date)}</td>
                <td className="px-4 py-3">{g.category}</td>
                <td className="px-4 py-3">{g.description}</td>
                <td className="px-4 py-3">{g.payment_method}</td>
                <td className="px-4 py-3 text-right tabular-nums text-brand-red">{formatCurrency(g.amount)}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">Gider bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
