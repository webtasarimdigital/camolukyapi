import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RaporlarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const reports = [
    { title: "Satış Raporu", desc: "Günlük ve aylık satış analizleri", href: "/raporlar/satis" },
    { title: "Ürün Bazlı Satış", desc: "En çok satılan ürünler", href: "/raporlar/urun-satis" },
    { title: "Müşteri Bazlı Satış", desc: "Ciroya göre en iyi müşteriler", href: "/raporlar/musteri-satis" },
    { title: "Tahsilat Raporu", desc: "Tahsilat özetleri", href: "/raporlar/tahsilat" },
    { title: "Gider Raporu", desc: "Kategori bazlı gider analizi", href: "/raporlar/gider" },
    { title: "Kritik Stok", desc: "Minimum seviye altına düşen ürünler", href: "/raporlar/kritik-stok" },
    { title: "Import Geçmişi", desc: "Excel yükleme geçmişi", href: "/raporlar/import-gecmisi" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Raporlar</h1>
          <p className="text-sm text-text-muted">Sistem raporları ve analizler</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((r, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-6 flex flex-col">
            <h2 className="text-lg font-bold text-brand-navy mb-2">{r.title}</h2>
            <p className="text-sm text-text-muted mb-6 flex-1">{r.desc}</p>
            <Link href={r.href} className="block text-center bg-surface border border-border py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">
              Görüntüle
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
