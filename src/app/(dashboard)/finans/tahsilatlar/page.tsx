import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default async function TahsilatlarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const { data: rawData } = await supabase
    .from("payments")
    .select("*, customers(company_name, contact_name, type), sales(sale_code)")
    .eq("company_id", profile.company_id)
    .order("payment_date", { ascending: false })
    .limit(50);
  
  const tahsilatlar = (rawData || []) as any[];
  
  const methods = {
    nakit: 'Nakit',
    havale_eft: 'Havale/EFT',
    kredi_karti: 'Kredi Kartı',
    cek: 'Çek',
    diger: 'Diğer'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Tahsilatlar</h1>
          <p className="text-sm text-text-muted">Gelen ödemeler ve tahsilatlar</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Müşteri</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Satış Kodu</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tutar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Yöntem</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Referans</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tahsilatlar.length > 0 ? tahsilatlar.map(t => {
              const musteriAd = t.customers?.type === 'kurumsal' ? t.customers?.company_name : t.customers?.contact_name;
              return (
                <tr key={t.id} className="hover:bg-surface transition">
                  <td className="px-4 py-3">{formatDate(t.payment_date)}</td>
                  <td className="px-4 py-3">{musteriAd || '-'}</td>
                  <td className="px-4 py-3">{t.sales?.sale_code || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">{formatCurrency(t.amount)}</td>
                  <td className="px-4 py-3">{(methods as any)[t.payment_method] || t.payment_method}</td>
                  <td className="px-4 py-3">{t.reference_no || '-'}</td>
                </tr>
              )
            }) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Tahsilat bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
