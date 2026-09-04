import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";

export default async function OrtakCariPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") redirect("/dashboard");

  // simplified implementation for fetching partner stats
  const { data: partnersData } = await supabase.from("partners").select("*").eq("company_id", profile.company_id);
  const partners = (partnersData || []) as any[];
  
  const { data: ledgerData } = await supabase.from("partner_ledger").select("*").eq("company_id", profile.company_id).is("voided_at", null);
  const ledgers = (ledgerData || []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Ortak Cari</h1>
          <p className="text-sm text-text-muted">Firma ortaklarının finansal hareketleri ve bakiyeleri</p>
        </div>
        <button className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition">
          + Ortak Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {partners.map(p => {
          const pLedger = ledgers.filter(l => l.partner_id === p.id);
          const verdi = pLedger.filter(l => l.direction === "partner_to_company").reduce((sum, l) => sum + Number(l.amount), 0);
          const aldi = pLedger.filter(l => l.direction === "company_to_partner").reduce((sum, l) => sum + Number(l.amount), 0);
          const net = verdi - aldi;
          
          return (
            <div key={p.id} className="bg-white rounded-xl border border-border p-6 space-y-4">
              <h2 className="text-lg font-bold text-brand-navy border-b border-border pb-2">{p.name}</h2>
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
                     {net > 0 ? `Firma ${p.name}'a ${formatCurrency(net)} borçlu` : net < 0 ? `${p.name} firmaya ${formatCurrency(Math.abs(net))} borçlu` : 'Bakiye kapalı'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                 <Link href={`/ortak-cari/${p.id}`} className="flex-1 text-center bg-surface border border-border py-2 rounded text-sm font-semibold hover:bg-gray-100 transition">Detay</Link>
                 <button className="flex-1 text-center bg-brand-navy text-white py-2 rounded text-sm font-semibold hover:bg-opacity-90 transition">Hareket Ekle</button>
              </div>
            </div>
          )
        })}
        {partners.length === 0 && (
          <div className="col-span-3 text-center p-8 bg-white rounded-xl border border-border text-text-muted">
            Kayıtlı ortak bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
