import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";
import { voidPartnerMovement } from "../actions";

export default async function OrtakDetayPage({ params }: { params: { partnerId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") redirect("/dashboard");

  const { data: partnerData, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", params.partnerId)
    .eq("company_id", profile.company_id)
    .single();

  if (error || !partnerData) {
    return <div className="text-center p-8">Ortak bulunamadı.</div>;
  }
  const partner = partnerData as any;

  const { data: rawData } = await supabase
    .from("partner_ledger")
    .select("*, profiles!partner_ledger_created_by_fkey(full_name)")
    .eq("partner_id", partner.id)
    .order("transaction_date", { ascending: false });
  
  const movements = (rawData || []) as any[];

  // calc net
  const validMovements = movements.filter(m => !m.voided_at);
  const verdi = validMovements.filter(m => m.direction === 'partner_to_company').reduce((sum, m) => sum + Number(m.amount), 0);
  const aldi = validMovements.filter(m => m.direction === 'company_to_partner').reduce((sum, m) => sum + Number(m.amount), 0);
  const net = verdi - aldi;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">{partner.name}</h1>
          <p className="text-sm text-text-muted">Ortak cari detayları ve hareketleri</p>
        </div>
        <button className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition">
          + Hareket Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-4 max-w-sm">
        <h2 className="text-lg font-bold text-brand-navy border-b border-border pb-2">Bakiye Özeti</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Ortağın Firmaya Verdiği:</span>
            <span className="font-semibold text-green-700">{formatCurrency(verdi)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Firmanın Ortağa Verdiği:</span>
            <span className="font-semibold text-brand-red">{formatCurrency(aldi)}</span>
          </div>
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Net Bakiye:</span>
              <span className={`text-lg font-bold ${net > 0 ? "text-brand-red" : net < 0 ? "text-orange-600" : "text-green-700"}`}>
                 {formatCurrency(Math.abs(net))}
              </span>
            </div>
            <div className="text-xs text-right mt-1">
               {net > 0 ? `Firma ${partner.name}'a ${formatCurrency(net)} borçlu` : net < 0 ? `${partner.name} firmaya ${formatCurrency(Math.abs(net))} borçlu` : 'Bakiye kapalı'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Yön</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tutar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Sebep</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Belge No</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Ekleyen</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">İptal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movements.length > 0 ? movements.map(m => (
              <tr key={m.id} className={`hover:bg-surface transition ${m.voided_at ? 'opacity-50 line-through' : ''}`}>
                <td className="px-4 py-3">{formatDate(m.transaction_date)}</td>
                <td className="px-4 py-3">
                  {m.direction === 'partner_to_company' ? 
                    <span className="text-green-700 font-medium">Ortak Firmaya Verdi</span> : 
                    <span className="text-brand-red font-medium">Firma Ortağa Verdi</span>}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${m.direction === 'partner_to_company' ? 'text-green-700' : 'text-brand-red'}`}>
                  {formatCurrency(m.amount)}
                </td>
                <td className="px-4 py-3">{m.reason}</td>
                <td className="px-4 py-3">{m.doc_no || '-'}</td>
                <td className="px-4 py-3">{m.profiles?.full_name || 'Bilinmeyen'}</td>
                <td className="px-4 py-3">
                  {!m.voided_at && (
                    <form action={async () => { "use server"; await voidPartnerMovement(m.id, "İptal Edildi"); }}>
                      <button type="submit" className="text-xs text-white bg-brand-red px-2 py-1 rounded hover:bg-red-800">İptal</button>
                    </form>
                  )}
                  {m.voided_at && <span className="text-xs text-brand-red">İptal Edildi</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">Kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
