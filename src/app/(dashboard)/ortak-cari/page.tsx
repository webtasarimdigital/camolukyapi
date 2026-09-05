import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { PartnerCard } from "./PartnerCard";
import { PartnerNotesSection, NoteItem } from "./PartnerNotesSection";
import {
  Handshake,
  ShieldCheck,
  Building2,
  TrendingUp,
  StickyNote,
  Users2,
  ArrowRightLeft,
} from "lucide-react";

export default async function OrtakCariPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  let partners = (partnersData || []) as Array<{
    id: string;
    name: string;
    phone?: string | null;
  }>;

  // Eğer sistemde ortak yoksa varsayılan ortakları (Ahmet ve Mehmet) ekle
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

    partners = (seeded || []) as Array<{
      id: string;
      name: string;
      phone?: string | null;
    }>;
  }

  // Tüm hareketleri ve notları çek
  const { data: rawLedgerData } = await supabase
    .from("partner_ledger")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const allRecords = (rawLedgerData || []) as any[];

  // Finansal hareketleri ve özel notları ayrıştır
  const movements = allRecords.filter((r) => r.doc_no !== "NOTE" && !r.voided_at);
  const rawNotes = allRecords.filter((r) => r.doc_no === "NOTE" && !r.voided_at);

  // Notları ayrıştır
  const parsedNotes: NoteItem[] = rawNotes.map((r) => {
    let meta: any = {};
    try {
      meta = r.notes ? JSON.parse(r.notes) : {};
    } catch {
      meta = {};
    }

    const partner = partners.find((p) => p.id === r.partner_id);

    return {
      id: r.id,
      partner_id: r.partner_id,
      partner_name: meta.partner_name || partner?.name || "Ortaklar",
      title: meta.title || r.reason?.replace("[NOT] ", "") || "Not",
      content: meta.content || "",
      amount: meta.amount ?? (r.amount > 0 ? Number(r.amount) : null),
      due_date: meta.due_date || (r.transaction_date !== new Date().toISOString().split("T")[0] ? r.transaction_date : null),
      priority: meta.priority || "normal",
      is_completed: !!meta.is_completed,
      created_at: r.created_at,
    };
  });

  // Partner bazında finansal hesaplamalar
  let totalCompanyDebtToPartners = 0;
  let totalPartnersDebtToCompany = 0;
  let totalProfitDistributed = 0;
  let totalLossCovered = 0;

  // Ortaklar arası şahsi borçlaşma (Ahmet ↔ Mehmet)
  // P2P hareketlerinde: from_partner verdi (+), to_partner borçlandı (-)
  let p2pAhmetToMehmet = 0;

  const partnerMetrics = partners.map((p) => {
    const pMovements = movements.filter((m) => m.partner_id === p.id);
    const verdi = pMovements
      .filter((m) => m.direction === "partner_to_company")
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const aldi = pMovements
      .filter((m) => m.direction === "company_to_partner")
      .reduce((sum, m) => sum + Number(m.amount), 0);
    const net = verdi - aldi;

    if (net > 0) totalCompanyDebtToPartners += net;
    if (net < 0) totalPartnersDebtToCompany += Math.abs(net);

    // Kâr / Zarar kayıtları
    pMovements.forEach((m) => {
      try {
        const meta = m.notes ? JSON.parse(m.notes) : {};
        if (meta.is_profit_dist) totalProfitDistributed += Number(m.amount);
        if (meta.is_loss_coverage) totalLossCovered += Number(m.amount);
      } catch {}
    });

    return {
      partner: p,
      verdi,
      aldi,
      net,
      recentMovements: pMovements.slice(0, 3),
    };
  });

  // P2P net hesaplama:
  // Eğer iki ortak varsa (Ahmet ve Mehmet), aralarındaki P2P transferleri tara
  let partnerAP2PNet = 0;
  let partnerBP2PNet = 0;

  if (partners.length >= 2) {
    const pA = partners[0];
    const pB = partners[1];

    movements.forEach((m) => {
      try {
        const meta = m.notes ? JSON.parse(m.notes) : {};
        if (meta.is_p2p) {
          if (meta.from_partner_id === pA.id && meta.to_partner_id === pB.id && m.doc_no === "P2P_GIVER") {
            p2pAhmetToMehmet += Number(m.amount);
          } else if (meta.from_partner_id === pB.id && meta.to_partner_id === pA.id && m.doc_no === "P2P_GIVER") {
            p2pAhmetToMehmet -= Number(m.amount);
          }
        }
      } catch {}
    });

    partnerAP2PNet = p2pAhmetToMehmet;
    partnerBP2PNet = -p2pAhmetToMehmet;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Üst Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl">
              <Handshake size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-text">
                Ortak Finans (Cari Hesaplar & Not Defteri)
              </h1>
              <p className="text-xs text-text-muted">
                Ahmet ve Mehmet ortaklığına özel şahsi borçlar, borç sebepleri, kâr dağıtımı ve notlar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Finansal İzolasyon Güvence Rozeti */}
      <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-emerald-50/50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
        <ShieldCheck className="text-emerald-700 shrink-0 mt-0.5" size={20} />
        <div className="text-xs text-amber-950 leading-relaxed">
          <span className="font-bold text-emerald-900">
            %100 Bağımsız Finansal İzolasyon Garantisi:
          </span>{" "}
          Bu alanda eklenen kâr/zarar, borç verme/alma ve ortak notları tamamen Ahmet ve Mehmet&apos;in
          şahsi takibine aittir. Firmanın genel cirosunu, günlük satış tahsilatlarını veya kasa
          defterini <strong>kesinlikle etkilemez</strong>.
        </div>
      </div>

      {/* ÜST KPI KARTLARI (Şık Yönetici Özeti) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kart 1: Firmanın Ortaklara Toplam Borcu */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Firmanın Ortaklara Borcu
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Building2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700 tabular-nums">
              {formatCurrency(totalCompanyDebtToPartners)}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Ortakların firmaya verdiği net alacak toplamı
            </p>
          </div>
        </div>

        {/* Kart 2: Ortakların Firmaya Borcu */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Ortakların Firmaya Borcu
            </span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <Users2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-rose-700 tabular-nums">
              {formatCurrency(totalPartnersDebtToCompany)}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Kasadan çekilen şahsi avans / geri ödenecekler
            </p>
          </div>
        </div>

        {/* Kart 3: Ortaklar Arası Şahsi Borçlaşma (Ahmet ↔ Mehmet) */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Ortaklar Arası Şahsi Bakiye
            </span>
            <div className="p-2 bg-cyan-50 text-cyan-700 rounded-xl">
              <ArrowRightLeft size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-cyan-900 tabular-nums">
              {formatCurrency(Math.abs(p2pAhmetToMehmet))}
            </div>
            <p className="text-[11px] font-semibold text-cyan-800 mt-1">
              {partners.length >= 2 ? (
                p2pAhmetToMehmet > 0 ? (
                  `${partners[1].name}, ${partners[0].name}'a borçlu`
                ) : p2pAhmetToMehmet < 0 ? (
                  `${partners[0].name}, ${partners[1].name}'a borçlu`
                ) : (
                  "Aralarında şahsi borç yok (sıfır)"
                )
              ) : (
                "2 ortak tanımlı"
              )}
            </p>
          </div>
        </div>

        {/* Kart 4: Bağımsız Kâr / Zarar & Not Havuzu */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Bağımsız Kâr / Zarar
            </span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-purple-900 tabular-nums">
              {formatCurrency(totalProfitDistributed)}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Paylaşılan kâr ({rawNotes.filter((n) => !n.is_completed).length} aktif not)
            </p>
          </div>
        </div>
      </div>

      {/* ORTAK PROFİL KARTLARI (Ahmet ve Mehmet) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {partnerMetrics.map((pm, idx) => {
          const isFirst = idx === 0;
          const other = partners.find((p) => p.id !== pm.partner.id);
          const p2pNet = isFirst ? partnerAP2PNet : partnerBP2PNet;

          return (
            <PartnerCard
              key={pm.partner.id}
              partner={pm.partner}
              partners={partners}
              verdi={pm.verdi}
              aldi={pm.aldi}
              net={pm.net}
              p2pNet={p2pNet}
              otherPartnerName={other?.name}
              recentMovements={pm.recentMovements}
            />
          );
        })}
      </div>

      {/* ORTAKLAR ARASI ÖZEL NOT DEFTERİ (Projeden Bağımsız) */}
      <PartnerNotesSection partners={partners} notes={parsedNotes} />
    </div>
  );
}
