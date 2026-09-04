import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { redirect } from "next/navigation";

export default async function TekliflerPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userData.user.id)
    .single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) redirect("/login");

  let query = supabase
    .from("quotes")
    .select("*, customer:customers(company_name, contact_name), creator:profiles(full_name)")
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (searchParams.q) {
    query = query.ilike("quote_code", `%${searchParams.q}%`);
  }
  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: quotesData } = await query;
  const quotes = quotesData as any[] | null;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-orange-100 text-orange-700",
    converted_to_sale: "bg-purple-100 text-purple-700",
    cancelled: "bg-gray-800 text-gray-100",
  };

  const statusLabels: Record<string, string> = {
    draft: "Taslak",
    sent: "Gönderildi",
    accepted: "Kabul Edildi",
    rejected: "Reddedildi",
    expired: "Süresi Doldu",
    converted_to_sale: "Satışa Döndü",
    cancelled: "İptal",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Teklifler</h1>
          <p className="text-sm text-text-muted">Müşterilere verilen fiyat teklifleri</p>
        </div>
        <Link
          href="/teklif/yeni"
          className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition"
        >
          + Yeni Teklif
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border flex gap-4">
        <input
          type="text"
          placeholder="Teklif No ile Bul (örn: TKF-1234567890)"
          className="border border-border rounded-lg px-4 py-2 text-sm flex-1"
        />
        <select className="border border-border rounded-lg px-4 py-2 text-sm">
          <option value="">Tüm Durumlar</option>
          <option value="draft">Taslak</option>
          <option value="sent">Gönderildi</option>
          <option value="accepted">Kabul Edildi</option>
        </select>
        <button className="bg-brand-navy text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Ara
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Teklif No</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Müşteri</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Temsilci</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Tutar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Durum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quotes?.map((quote) => (
              <tr key={quote.id} className="hover:bg-surface transition">
                <td className="px-4 py-3 font-mono text-xs">TKF-{quote.quote_code}</td>
                <td className="px-4 py-3">{new Date(quote.created_at).toLocaleDateString("tr-TR")}</td>
                <td className="px-4 py-3">{quote.customer?.company_name || quote.customer?.contact_name || "-"}</td>
                <td className="px-4 py-3">{quote.creator?.full_name || "-"}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(quote.total_amount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[quote.status] || "bg-gray-100 text-gray-700"}`}>
                    {statusLabels[quote.status] || quote.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Link href={`/teklifler/${quote.id}`} className="text-brand-navy hover:underline text-xs font-medium">Görüntüle</Link>
                </td>
              </tr>
            ))}
            {(!quotes || quotes.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted text-sm">
                  Kayıtlı teklif bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
