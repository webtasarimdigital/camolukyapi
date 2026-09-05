import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { redirect } from "next/navigation";
import { ConvertQuoteButton } from "./ConvertQuoteButton";
import { ArrowLeft, Printer, Edit3 } from "lucide-react";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quoteData } = await supabase
    .from("quotes")
    .select("*, customer:customers(*), items:quote_items(*)")
    .eq("id", id)
    .single();

  if (!quoteData) return <div className="p-8 text-center text-red-500">Teklif bulunamadı</div>;
  const quote = quoteData as any;
  const items = quote.items || [];
  const isConverted = quote.status === "converted_to_sale";

  let creatorName = "Yetkili";
  if (quote.created_by) {
    const { data: cp } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", quote.created_by)
      .single();
    const profileData = cp as { full_name: string | null } | null;
    if (profileData?.full_name) creatorName = profileData.full_name;
  }

  const statusLabels: Record<string, { label: string; cls: string }> = {
    draft: { label: "Taslak", cls: "bg-gray-100 text-gray-700" },
    sent: { label: "Müşteriye Verildi", cls: "bg-blue-100 text-blue-700" },
    accepted: { label: "Kabul Edildi", cls: "bg-green-100 text-green-700" },
    rejected: { label: "Reddedildi", cls: "bg-red-100 text-red-700" },
    expired: { label: "Süresi Doldu", cls: "bg-orange-100 text-orange-700" },
    converted_to_sale: { label: "Satışa Döndü", cls: "bg-purple-100 text-purple-700" },
    cancelled: { label: "İptal", cls: "bg-gray-200 text-gray-600" },
  };

  const statusInfo = statusLabels[quote.status] || {
    label: quote.status,
    cls: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Butonlar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/teklifler"
            className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-text border border-border transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text flex items-center gap-3">
              TKF-{quote.quote_code}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.cls}`}>
                {statusInfo.label}
              </span>
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Oluşturulma: {formatDate(quote.created_at)} • Temsilci: {creatorName || "Yetkili"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isConverted && (
            <Link
              href={`/teklifler/${quote.id}/duzenle`}
              className="flex items-center gap-1.5 bg-white text-text px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface transition border border-border"
            >
              <Edit3 size={15} /> Teklifi Düzenle (Ürün Çıkar/Ekle)
            </Link>
          )}

          <Link
            href={`/teklifler/${quote.id}/print`}
            target="_blank"
            className="flex items-center gap-1.5 bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition shadow-sm"
          >
            <Printer size={15} /> Yazdır / A4 Çıktı
          </Link>

          <ConvertQuoteButton quoteId={quote.id} isConverted={isConverted} />
        </div>
      </div>

      {/* Müşteri ve Teklif Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-border">
          <h2 className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">
            Müşteri Bilgileri
          </h2>
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-text text-base">
              {quote.customer_snapshot?.company_name ||
                quote.customer_snapshot?.contact_name ||
                quote.customer?.company_name ||
                quote.customer?.contact_name ||
                "İsimsiz Müşteri"}
            </p>
            {quote.customer_snapshot?.phone && (
              <p className="text-text-muted">Telefon: {quote.customer_snapshot.phone}</p>
            )}
            {quote.customer_snapshot?.email && (
              <p className="text-text-muted">E-posta: {quote.customer_snapshot.email}</p>
            )}
            {quote.customer_snapshot?.address && (
              <p className="text-text-muted">Adres: {quote.customer_snapshot.address}</p>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border">
          <h2 className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">
            Şartlar & Geçerlilik
          </h2>
          <div className="space-y-1.5 text-sm">
            <p>
              <span className="text-text-muted">Geçerlilik Tarihi:</span>{" "}
              <span className="font-medium text-text">{formatDate(quote.valid_until)}</span>
            </p>
            {quote.delivery_terms && (
              <p>
                <span className="text-text-muted">Teslimat:</span> {quote.delivery_terms}
              </p>
            )}
            {quote.payment_terms && (
              <p>
                <span className="text-text-muted">Ödeme Şekli:</span> {quote.payment_terms}
              </p>
            )}
            {quote.notes && (
              <p>
                <span className="text-text-muted">Not:</span> {quote.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Kalemler Tablosu */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface flex justify-between items-center">
          <h3 className="text-xs font-semibold text-text uppercase tracking-wide">
            Teklif Kalemleri ({items.length} Ürün/Hizmet)
          </h3>
          {!isConverted && (
            <Link
              href={`/teklifler/${quote.id}/duzenle`}
              className="text-xs text-brand-gold hover:underline font-medium"
            >
              + Ürün Ekle veya Çıkart
            </Link>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase">
                Ürün / Açıklama
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase">
                Miktar
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase">
                Birim
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase">
                Birim Fiyat
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase">
                İskonto
              </th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted uppercase">
                Satır Tutarı
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item: any, i: number) => (
              <tr key={item.id || i} className="hover:bg-surface transition">
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{item.product_name_snapshot}</div>
                  {item.product_code_snapshot && (
                    <div className="text-xs text-text-muted font-mono">{item.product_code_snapshot}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{item.quantity}</td>
                <td className="px-4 py-3 text-text-muted">{item.unit_snapshot || "M2"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                  {formatCurrency(item.discount_amount)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-text">
                  {formatCurrency(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toplamlar Özeti */}
      <div className="flex justify-end">
        <div className="w-80 bg-white p-5 rounded-xl border border-border space-y-2.5 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Ara Toplam:</span>
            <span className="tabular-nums font-medium">{formatCurrency(quote.subtotal)}</span>
          </div>
          {(quote.line_discount_total > 0 || quote.total_line_discount > 0) && (
            <div className="flex justify-between text-emerald-600">
              <span>Satır İskontoları:</span>
              <span className="tabular-nums font-medium">
                -{formatCurrency(quote.line_discount_total || quote.total_line_discount)}
              </span>
            </div>
          )}
          {quote.general_discount_amount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Genel İskonto:</span>
              <span className="tabular-nums font-medium">
                -{formatCurrency(quote.general_discount_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-2 border-t border-border">
            <span>Net Tutar:</span>
            <span className="tabular-nums text-text">{formatCurrency(quote.net_total)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>KDV (%{quote.vat_rate || 20}):</span>
            <span className="tabular-nums font-medium">
              {formatCurrency(quote.vat_total || quote.vat_amount)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-lg text-brand-navy pt-2 border-t border-border mt-2">
            <span>Genel Toplam:</span>
            <span className="tabular-nums text-brand-navy">
              {formatCurrency(quote.grand_total || quote.total_amount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
