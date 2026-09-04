import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { redirect } from "next/navigation";
import { QuickQuoteSearch } from "./QuickQuoteSearch";
import {
  FileText,
  TrendingUp,
  ShoppingCart,
  Clock,
  Printer,
  Edit3,
  CheckCircle2,
  Plus,
} from "lucide-react";

export default async function TekliflerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
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

  // Tüm teklif istatistiklerini al (filtre uygulanmadan önceki gerçek oranlar için)
  const { data: allQuotesData } = await supabase
    .from("quotes")
    .select("id, status, grand_total, total_amount")
    .eq("company_id", profile.company_id)
    .is("deleted_at", null);

  const allQuotes = (allQuotesData ?? []) as any[];
  const totalQuotesCount = allQuotes.length;
  const convertedCount = allQuotes.filter((q) => q.status === "converted_to_sale").length;
  const pendingCount = allQuotes.filter((q) => ["draft", "sent"].includes(q.status)).length;
  const conversionRate =
    totalQuotesCount > 0 ? Math.round((convertedCount / totalQuotesCount) * 100) : 0;

  const totalQuotedAmount = allQuotes.reduce(
    (acc, q) => acc + (Number(q.grand_total || q.total_amount) || 0),
    0
  );
  const convertedAmount = allQuotes
    .filter((q) => q.status === "converted_to_sale")
    .reduce((acc, q) => acc + (Number(q.grand_total || q.total_amount) || 0), 0);

  // Tablo sorgusu
  let query = supabase
    .from("quotes")
    .select("*, customer:customers(company_name, contact_name), creator:profiles(full_name)")
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) {
    const cleanQ = q.trim().replace(/^TKF-/i, "");
    query = query.or(
      `quote_code.ilike.%${cleanQ}%,customer_snapshot->>company_name.ilike.%${cleanQ}%,customer_snapshot->>contact_name.ilike.%${cleanQ}%`
    );
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: quotesData } = await query;
  const quotes = quotesData as any[] | null;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    expired: "bg-orange-100 text-orange-700",
    converted_to_sale: "bg-purple-100 text-purple-700",
    cancelled: "bg-gray-200 text-gray-600",
  };

  const statusLabels: Record<string, string> = {
    draft: "Taslak",
    sent: "Müşteriye Verildi",
    accepted: "Kabul Edildi",
    rejected: "Reddedildi",
    expired: "Süresi Doldu",
    converted_to_sale: "Satışa Döndü",
    cancelled: "İptal",
  };

  return (
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">Teklifler & Satış Dönüşümü</h1>
          <p className="text-sm text-text-muted">
            Verilen teklifleri takip edin, düzenleyin veya tek tıkla satışa dönüştürün.
          </p>
        </div>
        <Link
          href="/teklif/yeni"
          className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
        >
          <Plus size={16} /> + Yeni Teklif Oluştur
        </Link>
      </div>

      {/* DÖNÜŞÜM GRAFİĞİ & KPI KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Kart 1: Dönüşüm Başarısı & İlerleme Çubuğu */}
        <div className="bg-white p-5 rounded-2xl border border-border md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <ShoppingCart size={18} />
              </div>
              <div>
                <p className="text-xs text-text-muted">Tekliften Satışa Dönüşüm</p>
                <h3 className="text-lg font-bold text-text">
                  {convertedCount} / {totalQuotesCount} Teklif Satışa Döndü
                </h3>
              </div>
            </div>
            <span className="text-2xl font-black text-purple-600">%{conversionRate}</span>
          </div>

          {/* Görsel Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-surface h-3 rounded-full overflow-hidden flex border border-border">
              <div
                style={{ width: `${conversionRate}%` }}
                className="bg-purple-600 h-full transition-all duration-500"
                title={`Satışa Dönen: %${conversionRate}`}
              />
              <div
                style={{
                  width: `${
                    totalQuotesCount > 0
                      ? Math.round((pendingCount / totalQuotesCount) * 100)
                      : 0
                  }%`,
                }}
                className="bg-amber-400 h-full transition-all duration-500"
                title="Bekleyen Teklifler"
              />
            </div>
            <div className="flex justify-between text-[11px] text-text-muted pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" /> Satışa Döndü ({convertedCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Beklemede ({pendingCount})
              </span>
              <span>Toplam: {totalQuotesCount} Teklif</span>
            </div>
          </div>
        </div>

        {/* Kart 2: Satışa Dönüşen Ciro */}
        <div className="bg-white p-5 rounded-2xl border border-border flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted">Kazanılan Satış Cirosu</p>
              <h4 className="text-base font-bold text-emerald-600 tabular-nums">
                {formatCurrency(convertedAmount)}
              </h4>
            </div>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Onaylanıp satışa çevrilen tekliflerin toplamı
          </p>
        </div>

        {/* Kart 3: Toplam Teklif Hacmi */}
        <div className="bg-white p-5 rounded-2xl border border-border flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs text-text-muted">Toplam Teklif Hacmi</p>
              <h4 className="text-base font-bold text-text tabular-nums">
                {formatCurrency(totalQuotedAmount)}
              </h4>
            </div>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Sistemde kayıtlı tüm tekliflerin brüt tutarı
          </p>
        </div>
      </div>

      {/* ARAMA VE FİLTRE BAR */}
      <div className="bg-white p-4 rounded-2xl border border-border flex flex-wrap gap-3 items-center justify-between">
        <QuickQuoteSearch initialQuery={q} />

        <div className="flex items-center gap-2">
          <Link
            href="/teklifler"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              !status
                ? "bg-brand-navy text-white"
                : "bg-surface text-text-muted hover:text-text border border-border"
            }`}
          >
            Tümü ({totalQuotesCount})
          </Link>
          <Link
            href="/teklifler?status=sent"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              status === "sent"
                ? "bg-brand-navy text-white"
                : "bg-surface text-text-muted hover:text-text border border-border"
            }`}
          >
            Müşteride
          </Link>
          <Link
            href="/teklifler?status=converted_to_sale"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              status === "converted_to_sale"
                ? "bg-purple-600 text-white"
                : "bg-surface text-purple-700 hover:bg-purple-50 border border-purple-200"
            }`}
          >
            Satışa Dönen ({convertedCount})
          </Link>
        </div>
      </div>

      {/* TEKLİF LİSTESİ TABLOSU */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Teklif No
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Tarih
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Müşteri Adı
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Temsilci
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Toplam Tutar
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Durum
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Hızlı İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quotes && quotes.length > 0 ? (
              quotes.map((quote) => {
                const isConverted = quote.status === "converted_to_sale";
                const customerName =
                  quote.customer_snapshot?.company_name ||
                  quote.customer_snapshot?.contact_name ||
                  quote.customer?.company_name ||
                  quote.customer?.contact_name ||
                  "Müşterisiz";

                return (
                  <tr key={quote.id} className="hover:bg-surface/80 transition">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-text">
                      <Link
                        href={`/teklifler/${quote.id}`}
                        className="text-brand-navy hover:text-brand-gold underline decoration-dotted"
                      >
                        TKF-{quote.quote_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-text-muted text-xs whitespace-nowrap">
                      {formatDate(quote.created_at)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-text">
                      <div className="truncate max-w-xs">{customerName}</div>
                    </td>
                    <td className="px-4 py-3.5 text-text-muted text-xs">
                      {quote.creator?.full_name || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-bold text-text">
                      {formatCurrency(quote.grand_total || quote.total_amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          statusColors[quote.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[quote.status] || quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isConverted && (
                          <Link
                            href={`/teklifler/${quote.id}/duzenle`}
                            title="Düzenle (Ürün Ekle/Çıkar)"
                            className="p-1.5 text-text-muted hover:text-text hover:bg-surface rounded-lg border border-border transition"
                          >
                            <Edit3 size={14} />
                          </Link>
                        )}
                        <Link
                          href={`/teklifler/${quote.id}/print`}
                          target="_blank"
                          title="A4 Yazdır / PDF İndir"
                          className="p-1.5 text-brand-navy hover:text-brand-gold hover:bg-surface rounded-lg border border-border transition"
                        >
                          <Printer size={14} />
                        </Link>
                        <Link
                          href={`/teklifler/${quote.id}`}
                          className="bg-surface hover:bg-gray-200 text-text px-3 py-1.5 rounded-lg text-xs font-semibold border border-border transition"
                        >
                          Görüntüle
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-muted text-sm">
                  {q ? (
                    <div>
                      &quot;{q}&quot; aramanıza uygun teklif bulunamadı.
                      <div className="mt-2">
                        <Link href="/teklifler" className="text-brand-gold text-xs font-semibold underline">
                          Tüm Teklifleri Göster
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div>
                      Henüz kayıtlı bir teklif bulunmuyor.
                      <div className="mt-3">
                        <Link
                          href="/teklif/yeni"
                          className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-xs font-bold"
                        >
                          + İlk Teklifi Oluştur
                        </Link>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
