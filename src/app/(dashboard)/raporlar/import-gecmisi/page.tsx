import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/formatters";

export default async function ImportGecmisiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const { data: rawData } = await supabase
    .from("product_imports")
    .select("*, profiles!product_imports_user_id_fkey(full_name)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });
  
  const imports = (rawData || []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Import Geçmişi</h1>
          <p className="text-sm text-text-muted">Toplu ürün yükleme işlemleri</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Dosya Adı</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Yükleyen</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Durum</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Toplam</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Eklenen</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Güncellenen</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Hatalı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {imports.length > 0 ? imports.map(i => (
              <tr key={i.id} className="hover:bg-surface transition cursor-pointer">
                <td className="px-4 py-3 font-medium text-brand-navy">{i.filename}</td>
                <td className="px-4 py-3">{formatDate(i.created_at)}</td>
                <td className="px-4 py-3">{i.profiles?.full_name || 'Bilinmeyen'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    i.status === 'completed' ? 'bg-green-100 text-green-700' :
                    i.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {i.status === 'completed' ? 'Tamamlandı' : i.status === 'processing' ? 'İşleniyor' : 'Hata'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{i.total_rows}</td>
                <td className="px-4 py-3 text-right tabular-nums text-green-700">{i.inserted_rows}</td>
                <td className="px-4 py-3 text-right tabular-nums text-blue-700">{i.updated_rows}</td>
                <td className="px-4 py-3 text-right tabular-nums text-brand-red">{i.failed_rows}</td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">Import kaydı bulunamadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
