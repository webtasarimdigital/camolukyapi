import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { PartnerCard } from "./PartnerCard";
import { Handshake, ShieldAlert } from "lucide-react";

export default async function OrtakCariPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) redirect("/login");

  // Ortakları çek
  let { data: partnersData } = await supabase
    .from("partners")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true });

  let partners = (partnersData || []) as Array<{ id: string; name: string; phone?: string | null }>;

  // Eğer sistemde ortak yoksa varsayılan ortakları (Ahmet ve Mehmet) otomatik ekle
  if (partners.length === 0) {
    await supabase.from("partners").insert([
      { company_id: profile.company_id, name: "Ahmet", is_active: true },
      { company_id: profile.company_id, name: "Mehmet", is_active: true },
    ] as never);

    const { data: seeded } = await supabase
      .from("partners")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: true });

    partners = (seeded || []) as Array<{ id: string; name: string; phone?: string | null }>;
  }

  // Hareketleri çek
  const { data: ledgerData } = await supabase
    .from("partner_ledger")
    .select("*")
    .eq("company_id", profile.company_id)
    .is("voided_at", null);

  const ledgers = (ledgerData || []) as any[];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2.5">
            <Handshake className="text-amber-600" />
            Ortak Finans (Cari Hesaplar)
          </h1>
          <p className="text-sm text-text-muted">
            Firma ortakları (Ahmet ve Mehmet) arasındaki şahsi borç/alacak ve firmaya para verme/çekme hareketleri.
          </p>
        </div>
      </div>

      {/* Bilgilendirme Notu */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldAlert className="text-amber-700 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Tam Finansal İzolasyon İlkesi:</span> Ortakların firmaya şahsi
          olarak para vermesi veya firmadan para alması işlemleri tamamen bu defterde tutulur. Şirketin
          ana cirosunu, günlük satış tahsilatlarını veya müşteri alacaklarını kesinlikle etkilemez.
        </div>
      </div>

      {/* Ortak Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {partners.map((p) => {
          const pLedger = ledgers.filter((l) => l.partner_id === p.id);
          const verdi = pLedger
            .filter((l) => l.direction === "partner_to_company")
            .reduce((sum, l) => sum + Number(l.amount), 0);
          const aldi = pLedger
            .filter((l) => l.direction === "company_to_partner")
            .reduce((sum, l) => sum + Number(l.amount), 0);
          const net = verdi - aldi;

          return (
            <PartnerCard
              key={p.id}
              partner={p}
              verdi={verdi}
              aldi={aldi}
              net={net}
            />
          );
        })}
      </div>
    </div>
  );
}
