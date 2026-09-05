import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Trash2, Tag, Handshake, TrendingUp } from "lucide-react";
import { voidPartnerMovement } from "../actions";
import { MOVEMENT_CATEGORIES } from "../types";
import { PartnerDetailActions } from "../PartnerDetailActions";

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
      <div className="space-y-4">
        <Link
          href="/ortak-cari"
          className="text-text-muted hover:text-text flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} /> Geri Dön
        </Link>
        <p className="text-sm text-text-muted">Ortak kaydı bulunamadı.</p>
      </div>
    );
  }
  const partner = partnerData as any;

  const { data: rawData } = await supabase
    .from("partner_ledger")
    .select("*, profiles!partner_ledger_created_by_fkey(full_name)")
    .eq("partner_id", partner.id)
    .order("transaction_date", { ascending: false });

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

  // calc net
  const validMovements = movements.filter((m) => !m.voided_at);
  const verdi = validMovements
    .filter((m) => m.direction === "partner_to_company")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const aldi = validMovements
    .filter((m) => m.direction === "company_to_partner")
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const net = verdi - aldi;

  return (
    <div className="space-y-6 max-w-6xl">
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
            <p className="text-xs text-text-muted">
              Firmaya verilen/alınan borçlar, borç sebepleri ve işlem geçmişi
            </p>
          </div>
        </div>

        {/* Yeni Hareket Ekle Butonu */}
        <PartnerDetailActions
          partners={allPartners}
          currentPartnerId={partner.id}
        />
      </div>

      {/* Bakiye Özeti Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5 font-semibold">
            <ArrowUpRight size={15} className="text-emerald-600" /> Ortağın Firmaya Verdiği
          </p>
          <p className="text-xl font-black text-emerald-700 tabular-nums">
            {formatCurrency(verdi)}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">Nakit borç / karşılanan masraflar</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5 font-semibold">
            <ArrowDownLeft size={15} className="text-rose-600" /> Firmanın Ortağa Verdiği
          </p>
          <p className="text-xl font-black text-rose-700 tabular-nums">
            {formatCurrency(aldi)}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">Borç geri ödemesi / şahsi avans</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
          <p className="text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">
            Net Bakiye Durumu
          </p>
          <p
            className={`text-xl font-black tabular-nums ${
              net > 0 ? "text-emerald-700" : net < 0 ? "text-rose-700" : "text-text-muted"
            }`}
          >
            {formatCurrency(Math.abs(net))}
          </p>
          <p className="text-xs font-semibold mt-0.5">
            {net > 0 ? (
              <span className="text-emerald-700">Firma {partner.name}&apos;a borçlu</span>
            ) : net < 0 ? (
              <span className="text-rose-700">{partner.name} firmaya borçlu</span>
            ) : (
              <span className="text-text-muted">Bakiye sıfır (kapalı)</span>
            )}
          </p>
        </div>
      </div>

      {/* Hareketler Tablosu */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-border bg-surface flex items-center justify-between">
          <h2 className="text-xs font-bold text-text uppercase tracking-wider">
            Cari Hareket Ekstresi ({movements.length} Kayıt)
          </h2>
          <span className="text-xs text-text-muted">Resmi muhasebeden izole şahsi hareketler</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 border-b border-border text-text-muted">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase">Tarih</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase">Yön</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase">Borç Sebebi / Kategori</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase">Açıklama</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase">Tutar</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase">İşlem</th>
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

                const catKey = meta.category;
                const catDef = MOVEMENT_CATEGORIES.find((c) => c.key === catKey);

                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-surface/60 transition ${
                      isVoided ? "opacity-50 line-through bg-gray-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                      {formatDate(m.transaction_date)}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold whitespace-nowrap">
                      {m.direction === "partner_to_company" ? (
                        <span className="text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                          <ArrowUpRight size={13} /> Ortak ➔ Firma
                        </span>
                      ) : (
                        <span className="text-rose-800 bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                          <ArrowDownLeft size={13} /> Firma ➔ Ortak
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {catDef ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-surface border border-border px-2 py-0.5 rounded-md text-text">
                          <Tag size={11} className="text-brand-gold" />
                          {catDef.label}
                        </span>
                      ) : meta.is_p2p ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-cyan-50 border border-cyan-200 text-cyan-800 px-2 py-0.5 rounded-md">
                          <Handshake size={11} /> Ortaklar Arası
                        </span>
                      ) : meta.is_profit_dist ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-md">
                          <TrendingUp size={11} /> Kâr Payı
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text font-medium">
                      <div>{m.reason}</div>
                      {meta.custom_notes && (
                        <div className="text-[11px] text-text-muted mt-0.5">{meta.custom_notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-right tabular-nums font-black whitespace-nowrap">
                      <span
                        className={
                          m.direction === "partner_to_company" ? "text-emerald-700" : "text-rose-700"
                        }
                      >
                        {m.direction === "partner_to_company" ? "+" : "-"}
                        {formatCurrency(m.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!isVoided && (
                        <form
                          action={async () => {
                            "use server";
                            await voidPartnerMovement(m.id, "Kullanıcı tarafından iptal edildi");
                          }}
                        >
                          <button
                            type="submit"
                            title="Hareketi İptal Et"
                            className="text-text-muted hover:text-rose-600 text-xs p-1.5 rounded-lg hover:bg-rose-50 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-muted text-xs">
                    Henüz bir cari hareket kaydedilmemiş.
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
