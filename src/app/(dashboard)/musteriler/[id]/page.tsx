import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";
import { CustomerDetailActions } from "../CustomerDetailActions";
import { Briefcase } from "lucide-react";
import { extractPlasiyer, extractAccountCode, extractLandline } from "@/lib/customer-helpers";

export default async function MusteriDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const { data: customerData, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
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
        <CustomerDetailActions customer={customer} />
      </div>

      {(() => {
        const plasiyer = extractPlasiyer(customer.notes);
        const accountCode = extractAccountCode(customer.notes);
        const landline = extractLandline(customer.notes);

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Kart 1: İletişim Bilgileri */}
            <div className="bg-white p-6 rounded-xl border border-border">
              <h2 className="font-semibold mb-4 text-brand-navy">İletişim Bilgileri</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-text-muted">İlgili Kişi:</dt><dd className="font-medium">{customer.contact_name}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Cep Telefonu:</dt><dd className="font-medium">{customer.phone}</dd></div>
                {landline && (
                  <div className="flex justify-between"><dt className="text-text-muted">Sabit Hat:</dt><dd className="font-medium">{landline}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-text-muted">E-posta:</dt><dd>{customer.email || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Adres:</dt><dd className="text-right max-w-[200px] truncate" title={customer.address}>{customer.address || '-'}</dd></div>
              </dl>
            </div>

            {/* Kart 2: Plasiyer & Portföy Bilgisi */}
            <div className="bg-white p-6 rounded-xl border border-border">
              <h2 className="font-semibold mb-4 text-brand-navy flex items-center gap-2">
                <Briefcase size={18} className="text-amber-600" />
                <span>Plasiyer & Portföy</span>
              </h2>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-text-muted">Plasiyer:</dt>
                  <dd>
                    {plasiyer ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        👔 {plasiyer}
                      </span>
                    ) : (
                      <span className="text-text-muted italic text-xs">Atanmamış</span>
                    )}
                  </dd>
                </div>
                {accountCode && (
                  <div className="flex justify-between items-center">
                    <dt className="text-text-muted">Hesap Kodu:</dt>
                    <dd className="font-mono font-bold text-xs bg-surface px-2.5 py-1 rounded border border-border">
                      {accountCode}
                    </dd>
                  </div>
                )}
                {customer.notes && (
                  <div className="pt-2 border-t border-border mt-2">
                    <dt className="text-text-muted text-[11px] mb-1">Kayıt Notu & Bilgiler:</dt>
                    <dd className="text-xs text-text bg-surface/60 p-2 rounded-lg border border-border font-sans break-words whitespace-pre-wrap max-h-24 overflow-y-auto">
                      {customer.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Kart 3: Vergi Bilgileri */}
            <div className="bg-white p-6 rounded-xl border border-border">
              <h2 className="font-semibold mb-4 text-brand-navy">Vergi Bilgileri</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-text-muted">Ünvan:</dt><dd className="font-medium text-right max-w-[180px] truncate" title={customer.company_name || '-'}>{customer.company_name || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Vergi Dairesi:</dt><dd>{customer.tax_office || '-'}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Vergi No / TCKN:</dt><dd className="font-mono font-semibold">{customer.tax_number || '-'}</dd></div>
              </dl>
            </div>
          </div>
        );
      })()}

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
              <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase">Ödeme Vadesi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sales.length > 0 ? sales.map(s => {
              const today = new Date().toISOString().split("T")[0];
              const isPaid = s.payment_status === "paid";
              const isOverdue = !isPaid && s.due_date && s.due_date < today;
              const isToday = !isPaid && s.due_date && s.due_date === today;
              const diffTime = s.due_date ? new Date(s.due_date).getTime() - new Date(today).getTime() : 0;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              return (
                <tr key={s.id} className="hover:bg-surface transition">
                  <td className="px-4 py-3 font-semibold text-brand-navy">
                    <Link href={`/satislar/${s.id}`} className="hover:underline">
                      {s.sale_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(s.sale_date)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(s.grand_total)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      s.payment_status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : s.payment_status === 'partial' 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {s.payment_status === 'paid' ? 'Ödendi' : s.payment_status === 'partial' ? 'Kısmi' : 'Ödenmedi'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap text-xs">
                    {s.due_date ? (
                      isPaid ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono text-[11px] text-text-muted">{formatDate(s.due_date)}</span>
                          <span className="text-[10px] text-emerald-600 font-semibold">Ödendi</span>
                        </div>
                      ) : isOverdue ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            ⚠️ {formatDate(s.due_date)}
                          </span>
                          <span className="text-[9.5px] text-rose-600 font-bold mt-0.5">
                            {Math.abs(diffDays)} gün geçti!
                          </span>
                        </div>
                      ) : isToday ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            🔔 Bugün Son Gün
                          </span>
                          <span className="text-[9.5px] text-amber-700 font-bold mt-0.5">
                            {formatDate(s.due_date)}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono text-[11px] font-semibold text-text">{formatDate(s.due_date)}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{diffDays} gün kaldı</span>
                        </div>
                      )
                    ) : (
                      <span className="text-text-muted text-[11px] italic">Peşin / -</span>
                    )}
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={5} className="px-4 py-4 text-center text-text-muted">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
