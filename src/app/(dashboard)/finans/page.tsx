import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";

export default async function FinansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  // simplified KPI queries
  const today = new Date().toISOString().split('T')[0];
  const { data: salesData } = await supabase
    .from("sales")
    .select("grand_total")
    .eq("company_id", profile.company_id)
    .eq("status", "completed")
    .eq("sale_date", today);
  const todayCiro = (salesData as any[])?.reduce((acc, s) => acc + Number(s.grand_total), 0) || 0;

  const { data: paymentsData } = await supabase
    .from("payments")
    .select("amount")
    .eq("company_id", profile.company_id)
    .eq("payment_date", today)
    .is("voided_at", null);
  const todayTahsilat = (paymentsData as any[])?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

  // placeholder remaining KPIs
  const aylikCiro = 0; 
  const yillikCiro = 0;
  const bekleyenAlacak = 0;
  const aylikTahsilat = 0;
  const buAyGider = 0;
  const netNakit = aylikTahsilat - buAyGider;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Finans</h1>
        <div className="flex gap-2">
          <Link href="/finans/tahsilatlar" className="bg-surface border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100">Tahsilatlar</Link>
          <Link href="/finans/giderler" className="bg-surface border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100">Giderler</Link>
          <Link href="/finans/hareketler" className="bg-surface border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100">Tüm Hareketler</Link>
          <Link href="/ortak-cari" className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-200">Ortak Finans (Cari)</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="text-sm text-text-muted mb-2">Bugünkü Ciro</div>
          <div className="text-2xl font-bold tabular-nums">{formatCurrency(todayCiro)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="text-sm text-text-muted mb-2">Aylık Ciro</div>
          <div className="text-2xl font-bold tabular-nums">{formatCurrency(aylikCiro)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="text-sm text-text-muted mb-2">Yıllık Ciro</div>
          <div className="text-2xl font-bold tabular-nums">{formatCurrency(yillikCiro)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="text-sm text-text-muted mb-2 text-brand-red">Bekleyen Alacak</div>
          <div className="text-2xl font-bold tabular-nums text-brand-red">{formatCurrency(bekleyenAlacak)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="text-sm text-text-muted mb-2 text-green-700">Bugünkü Tahsilat</div>
          <div className="text-2xl font-bold tabular-nums text-green-700">{formatCurrency(todayTahsilat)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="text-sm text-text-muted mb-2 text-green-700">Aylık Tahsilat</div>
          <div className="text-2xl font-bold tabular-nums text-green-700">{formatCurrency(aylikTahsilat)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="text-sm text-text-muted mb-2 text-brand-red">Bu Ay Gider</div>
          <div className="text-2xl font-bold tabular-nums text-brand-red">{formatCurrency(buAyGider)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-border">
          <div className="text-sm text-text-muted mb-2 text-brand-navy">Net Nakit</div>
          <div className="text-2xl font-bold tabular-nums text-brand-navy">{formatCurrency(netNakit)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b border-border">
             <h2 className="font-semibold text-brand-navy">Son Tahsilatlar</h2>
          </div>
          <table className="w-full text-sm">
             <tbody className="divide-y divide-border">
               <tr><td className="px-4 py-8 text-center text-text-muted">Geliştirme Aşamasında</td></tr>
             </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b border-border">
             <h2 className="font-semibold text-brand-navy">Son Giderler</h2>
          </div>
          <table className="w-full text-sm">
             <tbody className="divide-y divide-border">
               <tr><td className="px-4 py-8 text-center text-text-muted">Geliştirme Aşamasında</td></tr>
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
