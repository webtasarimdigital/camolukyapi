import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity_type?: string; date?: string; user?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id || profile.role !== "admin") redirect("/dashboard");

  let query = supabase
    .from("audit_logs")
    .select("*, profiles!audit_logs_user_id_fkey(full_name)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (sp?.entity_type) query = query.eq("entity_type", sp.entity_type);
  
  const { data: logsData } = await query.limit(50);
  const logs = (logsData || []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Audit Log</h1>
          <p className="text-sm text-text-muted">Sistemdeki tüm işlemlerin geçmişi (Sadece Admin)</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border">
        <form className="flex gap-4">
          <select name="entity_type" defaultValue={sp?.entity_type || ""} className="border border-border rounded px-3 py-2 text-sm flex-1">
            <option value="">Tüm Varlık Tipleri</option>
            <option value="sales">Satışlar</option>
            <option value="quotes">Teklifler</option>
            <option value="products">Ürünler</option>
            <option value="payments">Tahsilatlar</option>
            <option value="partner_ledger">Ortak Cari</option>
          </select>
          <button type="submit" className="bg-brand-navy text-white px-4 py-2 rounded text-sm font-semibold">
            Filtrele
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Kullanıcı</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">İşlem</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Varlık Tipi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.length > 0 ? logs.map(l => (
              <tr key={l.id} className="hover:bg-surface transition">
                <td className="px-4 py-3">{formatDate(l.created_at)}</td>
                <td className="px-4 py-3">{l.profiles?.full_name || 'Bilinmeyen'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${l.action === 'CREATE' ? 'bg-green-100 text-green-700' : l.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-3">{l.entity_type}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">Kayıt bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
