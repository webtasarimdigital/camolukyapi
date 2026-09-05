import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const q = sp?.q || "";
  const typeFilter = sp?.type || "";
  const statusFilter = sp?.status || "";

  let query = supabase
    .from("customers")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`company_name.ilike.%${q}%,contact_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }
  if (statusFilter) {
    query = query.eq("is_active", statusFilter === "aktif");
  }

  const { data: rawData, error } = await query.limit(50);
  const customers = rawData as any[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Müşteriler</h1>
          <p className="text-sm text-text-muted">Müşteri listesi ve yönetimi</p>
        </div>
        <Link
          href="/musteriler/yeni"
          className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition"
        >
          + Yeni Müşteri
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-border flex gap-4">
        <form className="flex gap-4 w-full">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Müşteri Adı, Kişi veya Telefon Ara..."
            className="border border-border rounded px-3 py-2 text-sm flex-1"
          />
          <select name="type" defaultValue={typeFilter} className="border border-border rounded px-3 py-2 text-sm">
            <option value="">Tüm Türler</option>
            <option value="bireysel">Bireysel</option>
            <option value="kurumsal">Kurumsal</option>
          </select>
          <select name="status" defaultValue={statusFilter} className="border border-border rounded px-3 py-2 text-sm">
            <option value="">Tüm Durumlar</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
          <button type="submit" className="bg-brand-navy text-white px-4 py-2 rounded text-sm font-semibold">
            Ara
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm sticky-header">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Müşteri Adı/Ünvanı</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">İletişim Kişisi</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Telefon</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">E-posta</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Tür</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Durum</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers && customers.length > 0 ? (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-surface transition">
                  <td className="px-4 py-3">{c.type === "kurumsal" ? c.company_name : c.contact_name}</td>
                  <td className="px-4 py-3">{c.contact_name}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3">{c.email}</td>
                  <td className="px-4 py-3">
                    {c.type === "kurumsal" ? "Kurumsal" : "Bireysel"}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Pasif</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/musteriler/${c.id}`} className="text-brand-navy hover:underline">
                      Görüntüle
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
