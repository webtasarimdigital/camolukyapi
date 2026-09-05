import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/formatters";
import {
  Handshake,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  TrendingUp,
  Gem
} from "lucide-react";
import { PartnerCard } from "./PartnerCard";
import { PartnerNotesSection, NoteItem } from "./PartnerNotesSection";

export default async function OrtakCariPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user!.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) {
    return <div>Şirket bulunamadı.</div>;
  }

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

  // Partner bazında 3 ana başlık hesaplamaları:
  // 1. Firmaya Verdiği (Alacak)
  // 2. Firmadan Aldığı (Borç)
  // 3. Şahsi Gelir & Kâr (Kira vb.)
  let totalCompanyDebtToPartners = 0;
  let totalPartnersDebtToCompany = 0;
  let totalPersonalIncome = 0;
  let p2pAhmetToMehmet = 0;

  const partnerMetrics = partners.map((p) => {
    const pMovements = movements.filter((m) => m.partner_id === p.id);
    
    let verdi = 0;
    let aldi = 0;
    let sahsiGelir = 0;

    pMovements.forEach((m) => {
      let meta: any = {};
      try {
        meta = m.notes ? JSON.parse(m.notes) : {};
      } catch {}

      const isIncome = meta.is_personal_income || m.doc_no === "SAHSI_GELIR" || meta.category === "kira" || meta.category === "kar_dagitimi";

      if (isIncome) {
        sahsiGelir += Number(m.amount) || 0;
      } else if (m.direction === "partner_to_company") {
        verdi += Number(m.amount) || 0;
      } else {
        aldi += Number(m.amount) || 0;
      }
    });

    const net = verdi - aldi;

    totalCompanyDebtToPartners += verdi;
    totalPartnersDebtToCompany += aldi;
    totalPersonalIncome += sahsiGelir;

    return {
      partner: p,
      verdi,
      aldi,
      sahsiGelir,
      net,
      recentMovements: pMovements,
    };
  });

  // Ortaklar arası P2P hesaplama
  const p2pRecords = movements.filter((m) => {
    let meta: any = {};
    try {
      meta = m.notes ? JSON.parse(m.notes) : {};
    } catch {}
    return meta.is_p2p && m.doc_no === "P2P_GIVER";
  });

  p2pRecords.forEach((m) => {
    let meta: any = {};
    try {
      meta = m.notes ? JSON.parse(m.notes) : {};
    } catch {}
    if (partners.length >= 2) {
      if (m.partner_id === partners[0].id) {
        p2pAhmetToMehmet += Number(m.amount);
      } else if (m.partner_id === partners[1].id) {
        p2pAhmetToMehmet -= Number(m.amount);
      }
    }
  });

  const partnerAP2PNet = p2pAhmetToMehmet;
  const partnerBP2PNet = -p2pAhmetToMehmet;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Üst Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Handshake className="text-brand-navy" size={22} />
            Ortak Finans (Cari Hesaplar)
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Ahmet & Mehmet — Firmaya verilen/alınan borçlar, şahsi kira & kâr gelirleri
          </p>
        </div>
      </div>

      {/* 4 ÖZET KART */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kart 1: Firmanın Ortaklara Toplam Borcu */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Firmaya Verilen Borç
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-emerald-800 tabular-nums">
              {formatCurrency(totalCompanyDebtToPartners)}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Ortakların cebinden firmaya koyduğu toplam tutar
            </p>
          </div>
        </div>

        {/* Kart 2: Ortakların Firmaya Toplam Borcu */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Firmadan Alınan Borç
            </span>
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-rose-800 tabular-nums">
              {formatCurrency(totalPartnersDebtToCompany)}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Kasadan çekilen şahsi avans / geri ödenecekler
            </p>
          </div>
        </div>

        {/* Kart 3: Şahsi Gelir & Kâr Toplamı (Kira vb.) */}
        <div className="bg-purple-50/70 p-5 rounded-2xl border border-purple-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-950 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
              Şahsi Gelir / Kira
            </span>
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Gem size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-purple-950 tabular-nums">
              {formatCurrency(totalPersonalIncome)}
            </div>
            <p className="text-[11px] text-purple-800/90 mt-1 font-medium">
              Ortakların elde ettiği kira & şahsi kâr kazancı
            </p>
          </div>
        </div>

        {/* Kart 4: Ortaklar Arası Şahsi Borçlaşma (Ahmet ↔ Mehmet) */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-800">
              Ortaklar Arası Bakiye
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
              sahsiGelir={pm.sahsiGelir}
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
