import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Trash2 } from "lucide-react";
import { voidPartnerMovement } from "../actions";

export default async function OrtakDetayPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
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

  const { data: partnerData, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .eq("company_id", profile.company_id)
    .single();

  if (error || !partnerData) {
    return (
      <div className="space-y-4">
        <Link href="/ortak-cari" className="text-text-muted hover:text-text flex items-center gap-2">
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

  const movements = (rawData || []) as any[];

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
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/ortak-cari"
            className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-text border border-border transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text">
              {partner.name} — Cari Hareketleri
            </h1>
            <p className="text-xs text-text-muted">
              Şahsi borç/alacak ekstresi ve işlem geçmişi
            </p>
          </div>
        </div>
      </div>

      {/* Bakiye Özeti Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-border">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
            <ArrowUpRight size={15} className="text-emerald-600" /> Ortağın Firmaya Verdiği
          </p>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">
            {formatCurrency(verdi)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border">
          <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5">
            <ArrowDownLeft size={15} className="text-rose-600" /> Firmanın Ortağa Verdiği
          </p>
          <p className="text-lg font-bold text-rose-600 tabular-nums">
            {formatCurrency(aldi)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border">
          <p className="text-xs text-text-muted mb-1">Net Durum</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              net > 0 ? "text-rose-600" : net < 0 ? "text-emerald-600" : "text-text-muted"
            }`}
          >
            {formatCurrency(Math.abs(net))}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {net > 0
              ? `Firma ${partner.name}'a borçlu`
              : net < 0
              ? `${partner.name} firmaya borçlu`
              : "Bakiye sıfır"}
          </p>
        </div>
      </div>

      {/* Hareketler Tablosu */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface">
          <h2 className="text-xs font-semibold text-text uppercase tracking-wide">
            Cari Hareket Ekstresi ({movements.length} Kayıt)
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tarih</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Yön</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Açıklama / Sebep</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tutar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Belge No</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movements.map((m) => {
              const isVoided = !!m.voided_at;
              return (
                <tr key={m.id} className={`hover:bg-surface/60 transition ${isVoided ? "opacity-50 line-through" : ""}`}>
                  <td className="px-4 py-3 text-xs text-text-muted">{formatDate(m.transaction_date)}</td>
                  <td className="px-4 py-3 text-xs font-medium">
                    {m.direction === "partner_to_company" ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Ortak ➔ Firma
                      </span>
                    ) : (
                      <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        Firma ➔ Ortak
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text">{m.reason}</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums font-bold">
                    {formatCurrency(m.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{m.doc_no || "-"}</td>
                  <td className="px-4 py-3 text-right">
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
                          className="text-rose-600 hover:text-rose-800 text-xs p-1"
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
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-xs">
                  Henüz bir cari hareket kaydedilmemiş.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
