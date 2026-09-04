import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";
import { toggleCustomerActive } from "../actions";

export default async function MusteriDetayPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const { data: customerData, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .single();

  if (error || !customerData) {
    return <div className="text-center p-8">Müşteri bulunamadı.</div>;
  }
  const customer = customerData as any;

  // Fetch some summary data for tabs
  const { data: salesData } = await supabase.from("sales").select("*").eq("customer_id", customer.id);
  const sales = (salesData || []) as any[];

  const { data: quotesData } = await supabase.from("quotes").select("*").eq("customer_id", customer.id);
  const quotes = (quotesData || []) as any[];

  const totalSales = sales.length;
  const totalAmount = sales.reduce((acc, s) => acc + Number(s.grand_total || 0), 0);
  const paidAmount = sales.reduce((acc, s) => acc + (s.payment_status === 'paid' ? Number(s.grand_total || 0) : 0), 0); // Simplified paid calculation for now
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">
            {customer.type === "kurumsal" ? customer.company_name : customer.contact_name}
          </h1>
          <p className="text-sm text-text-muted">
            {customer.type === "kurumsal" ? "Kurumsal Müşteri" : "Bireysel Müşteri"} | {customer.is_active ? 'Aktif' : 'Pasif'}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={async () => { "use server"; await toggleCustomerActive(customer.id, !customer.is_active); }}>
            <button type="submit" className="bg-brand-red text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-800 transition">
              {customer.is_active ? 'Pasife Al' : 'Aktife Al'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-border">
          <h2 className="font-semibold mb-4 text-brand-navy">İletişim Bilgileri</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-text-muted">İlgili Kişi:</dt><dd>{customer.contact_name}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Telefon:</dt><dd>{customer.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">E-posta:</dt><dd>{customer.email || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Adres:</dt><dd className="text-right">{customer.address || '-'}</dd></div>
          </dl>
        </div>
        
        {customer.type === "kurumsal" && (
          <div className="bg-white p-6 rounded-xl border border-border">
            <h2 className="font-semibold mb-4 text-brand-navy">Vergi Bilgileri</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-text-muted">Ünvan:</dt><dd>{customer.company_name}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Vergi Dairesi:</dt><dd>{customer.tax_office || '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Vergi No:</dt><dd>{customer.tax_number || '-'}</dd></div>
            </dl>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold mb-4 text-brand-navy">Özet</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="bg-surface p-4 rounded-lg">
             <div className="text-sm text-text-muted">Toplam Satış</div>
             <div className="text-lg font-bold">{totalSales}</div>
           </div>
           <div className="bg-surface p-4 rounded-lg">
             <div className="text-sm text-text-muted">Toplam Tutar</div>
             <div className="text-lg font-bold tabular-nums">{formatCurrency(totalAmount)}</div>
           </div>
           <div className="bg-surface p-4 rounded-lg">
             <div className="text-sm text-text-muted text-green-700">Tahsil Edilen</div>
             <div className="text-lg font-bold tabular-nums text-green-700">{formatCurrency(paidAmount)}</div>
           </div>
           <div className="bg-surface p-4 rounded-lg">
             <div className="text-sm text-text-muted text-brand-red">Bekleyen</div>
             <div className="text-lg font-bold tabular-nums text-brand-red">{formatCurrency(pendingAmount)}</div>
           </div>
        </div>
      </div>
      
      {/* Tabs would typically be interactive, but simplified for server components here */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 bg-surface border-b border-border">
          <h2 className="font-semibold text-brand-navy">Son Satışlar</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Kod</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tutar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sales.length > 0 ? sales.map(s => (
              <tr key={s.id} className="hover:bg-surface transition">
                <td className="px-4 py-3">{s.sale_code}</td>
                <td className="px-4 py-3">{formatDate(s.sale_date)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(s.grand_total)}</td>
                <td className="px-4 py-3">{s.payment_status}</td>
              </tr>
            )) : <tr><td colSpan={4} className="px-4 py-4 text-center text-text-muted">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
