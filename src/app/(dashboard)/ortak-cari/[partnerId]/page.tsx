import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gem, 
  Tag, 
  Handshake, 
  Building2,
  TrendingUp,
  Wallet,
  Landmark,
  Scale
} from "lucide-react";
import { MOVEMENT_CATEGORIES } from "../types";
import { PartnerDetailActions } from "../PartnerDetailActions";
import { MovementRowActions } from "../MovementRowActions";

export default async function OrtakDetayPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
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

  const { data: partnerData, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .eq("company_id", profile.company_id)
    .single();

  if (error || !partnerData) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto p-6 bg-white rounded-2xl border border-border">
        <Link
          href="/ortak-cari"
          className="text-text-muted hover:text-text flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Ortak Cari Listesine Dön
        </Link>
        <p className="text-sm text-text-muted">Ortak kaydı bulunamadı.</p>
      </div>
    );
  }
  const partner = partnerData as any;

  // Fix: Query partner_ledger without foreign key to profiles
  const { data: rawData, error: ledgerError } = await supabase
    .from("partner_ledger")
    .select("*")
    .eq("partner_id", partner.id)
    .order("transaction_date", { ascending: false });

  if (ledgerError) {
    console.error("Ledger query error:", ledgerError);
  }

  const allRecords = (rawData || []) as any[];

  // Ortakları çek (modal için)
  const { data: allPartnersData } = await supabase
    .from("partners")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true });
  const allPartners = (allPartnersData || []) as Array<{ id: string; name: string }>;

  // Yalnızca finansal hareketler (notlar hariç)
  const movements = allRecords.filter((m) => m.doc_no !== "NOTE");

  // Hareketleri 3 ana başlığa göre ayrıştır:
  // 1. Şahsi Gelir & Kâr Payı (Kira vb.)
  // 2. Firmaya Verdiği (Borç / Sermaye)
  // 3. Firmadan Aldığı (Şahsi Çekim / Avans)
  const validMovements = movements.filter((m) => !m.voided_at);

  let verdi = 0;
  let aldi = 0;
  let sahsiGelir = 0;

  validMovements.forEach((m) => {
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Üst Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/ortak-cari"
            className="p-2.5 rounded-xl hover:bg-white text-text-muted hover:text-text border border-border transition shadow-2xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-text">
              {partner.name} — Şahsi Cari Ekstresi
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Firmaya verilen/alınan borçlar, şahsi kira & kâr gelirleri ve işlem geçmişi
            </p>
          </div>
        </div>

        {/* Yeni Hareket Ekle Butonu */}
        <PartnerDetailActions
          partners={allPartners}
          currentPartnerId={partner.id}
        />
      </div>

      {/* 4 Ana Başlık Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Firmaya Verdiği */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs text-emerald-800 mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <ArrowUpRight size={16} className="text-emerald-600" /> Firmaya Verdiği
            </p>
            <p className="text-2xl font-black text-emerald-700 tabular-nums">
              {formatCurrency(verdi)}
            </p>
          </div>
          <p className="text-[11px] text-text-muted mt-2 border-t border-border/60 pt-1.5">
            Cebinden firmaya borç / masraf karşılama
          </p>
        </div>

        {/* 2. Firmadan Aldığı */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs text-rose-800 mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <ArrowDownLeft size={16} className="text-rose-600" /> Firmadan Aldığı
            </p>
            <p className="text-2xl font-black text-rose-700 tabular-nums">
              {formatCurrency(aldi)}
            </p>
          </div>
          <p className="text-[11px] text-text-muted mt-2 border-t border-border/60 pt-1.5">
            Kasadan çekilen şahsi avans / borç
          </p>
        </div>

        {/* 3. Şahsi Gelir & Kâr (Kira vb.) */}
        <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs text-purple-900 mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Gem size={16} className="text-purple-600" /> Şahsi Gelir / Kira
            </p>
            <p className="text-2xl font-black text-purple-900 tabular-nums">
              {formatCurrency(sahsiGelir)}
            </p>
          </div>
          <p className="text-[11px] text-purple-800/80 mt-2 border-t border-purple-200/80 pt-1.5 font-medium">
            Kira & kâr kazancı (Şirkete borç değildir)
          </p>
        </div>

        {/* 4. Firma ile Net Bakiye */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs text-text-muted mb-1 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Scale size={16} className="text-brand-navy" /> Net Firma Bakiyesi
            </p>
            <p
              className={`text-2xl font-black tabular-nums ${
                net > 0 ? "text-emerald-700" : net < 0 ? "text-rose-700" : "text-text"
              }`}
            >
              {formatCurrency(Math.abs(net))}
            </p>
          </div>
          <p className="text-xs font-bold mt-2 border-t border-border/60 pt-1.5">
            {net > 0 ? (
              <span className="text-emerald-700">Firma {partner.name}&apos;a Borçlu (Alacaklı)</span>
            ) : net < 0 ? (
              <span className="text-rose-700">{partner.name} Firmaya Borçlu</span>
            ) : (
              <span className="text-text-muted">Hesap Tam Dengede (0 ₺)</span>
            )}
          </p>
        </div>
      </div>

      {/* Hareketler Tablosu (Tüm Kayıtlar) */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-text uppercase tracking-wider">
              Cari Hareket Ekstresi ({movements.length} Kayıt)
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Kira gelirleri, borç verme ve alma işlemlerinin tümü
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface/80 border-b border-border text-text-muted uppercase text-[10px] font-bold">
              <tr>
                <th className="text-left px-4 py-3 w-28">Tarih</th>
                <th className="text-left px-4 py-3 w-36">İşlem Başlığı</th>
                <th className="text-left px-4 py-3 w-40">Kategori</th>
                <th className="text-left px-4 py-3">Açıklama / Sebep</th>
                <th className="text-right px-4 py-3 w-36">Tutar</th>
                <th className="text-right px-4 py-3 w-24">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => {
                const isVoided = !!m.voided_at;
                let meta: any = {};
                try {
                  meta = m.notes ? JSON.parse(m.notes) : {};
                } catch {
                  meta = {};
                }

                const isIncome = meta.is_personal_income || m.doc_no === "SAHSI_GELIR" || meta.category === "kira" || meta.category === "kar_dagitimi";
                const catKey = meta.category;
                const catDef = MOVEMENT_CATEGORIES.find((c) => c.key === catKey);

                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-surface/60 transition ${
                      isVoided ? "opacity-40 line-through bg-gray-50" : ""
                    }`}
                  >
                    {/* Tarih */}
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap font-medium">
                      {formatDate(m.transaction_date)}
                    </td>

                    {/* İşlem Başlığı (3 Başlık) */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isIncome ? (
                        <span className="text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 w-fit text-[11px]">
                          <Gem size={13} className="text-purple-600" /> Şahsi Gelir / Kira
                        </span>
                      ) : m.direction === "partner_to_company" ? (
                        <span className="text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 w-fit text-[11px]">
                          <ArrowUpRight size={13} className="text-emerald-600" /> Firmaya Verdiği
                        </span>
                      ) : (
                        <span className="text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 w-fit text-[11px]">
                          <ArrowDownLeft size={13} className="text-rose-600" /> Firmadan Aldığı
                        </span>
                      )}
                    </td>

                    {/* Kategori Rozeti */}
                    <td className="px-4 py-3">
                      {catDef ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-surface border border-border px-2 py-0.5 rounded-md text-text">
                          <Tag size={11} className="text-brand-gold" />
                          {catDef.label}
                        </span>
                      ) : meta.is_p2p ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-cyan-50 border border-cyan-200 text-cyan-800 px-2 py-0.5 rounded-md">
                          <Handshake size={11} /> Ortaklar Arası
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>

                    {/* Açıklama & Notlar */}
                    <td className="px-4 py-3 text-text font-medium">
                      <div className="font-semibold text-text">{m.reason}</div>
                      {meta.custom_notes && (
                        <div className="text-[11px] text-text-muted mt-0.5 italic">{meta.custom_notes}</div>
                      )}
                    </td>

                    {/* Tutar */}
                    <td className="px-4 py-3 text-right tabular-nums font-black whitespace-nowrap text-sm">
                      {isIncome ? (
                        <span className="text-purple-800">
                          +{formatCurrency(m.amount)}
                        </span>
                      ) : m.direction === "partner_to_company" ? (
                        <span className="text-emerald-700">
                          +{formatCurrency(m.amount)}
                        </span>
                      ) : (
                        <span className="text-rose-700">
                          -{formatCurrency(m.amount)}
                        </span>
                      )}
                    </td>

                    {/* İşlem Butonları (Düzenle & Sil) */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!isVoided ? (
                        <MovementRowActions movement={m} partnerName={partner.name} />
                      ) : (
                        <span className="text-[10px] text-text-muted bg-gray-100 px-2 py-0.5 rounded-full font-semibold">İptal Edildi</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-muted text-xs">
                    Henüz bir cari hareket kaydedilmemiş.
                    <div className="mt-2">
                      <PartnerDetailActions
                        partners={allPartners}
                        currentPartnerId={partner.id}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
