import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { redirect } from "next/navigation";

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: quoteData } = await supabase
    .from("quotes")
    .select("*, customer:customers(*), creator:profiles(full_name), items:quote_items(*)")
    .eq("id", params.id)
    .single();

  if (!quoteData) return <div className="p-8 text-center text-red-500">Teklif bulunamadı</div>;
  const quote = quoteData as any;
  const items = quote.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-3">
            TKF-{quote.quote_code}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {quote.status}
            </span>
          </h1>
          <p className="text-sm text-text-muted">{new Date(quote.created_at).toLocaleDateString("tr-TR")}</p>
        </div>
        <div className="flex gap-2">
          {["draft", "sent"].includes(quote.status) && (
            <Link href={`/teklifler/${quote.id}/duzenle`} className="bg-surface text-text px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition border border-border">
              Düzenle
            </Link>
          )}
          <Link href={`/teklifler/${quote.id}/print`} target="_blank" className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition">
            Yazdır / PDF
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-border">
          <h2 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wide">Müşteri Bilgileri</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Firma/Kişi:</span> {quote.customer_snapshot?.company_name || quote.customer?.company_name}</p>
            <p><span className="font-medium">İletişim:</span> {quote.customer_snapshot?.phone || quote.customer?.phone}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-border">
          <h2 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wide">Teklif Detayları</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Geçerlilik:</span> {new Date(quote.valid_until).toLocaleDateString("tr-TR")}</p>
            <p><span className="font-medium">Temsilci:</span> {quote.creator?.full_name}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Ürün/Açıklama</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Miktar</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">Birim</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">B. Fiyat</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">İskonto</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item: any, i: number) => (
              <tr key={item.id || i} className="hover:bg-surface transition">
                <td className="px-4 py-3">
                  <div className="font-medium">{item.product_name_snapshot}</div>
                  {item.product_code_snapshot && <div className="text-xs text-text-muted">{item.product_code_snapshot}</div>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                <td className="px-4 py-3">{item.unit_snapshot}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.discount_amount)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-64 bg-white p-5 rounded-xl border border-border space-y-2 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Ara Toplam:</span>
            <span className="tabular-nums">{formatCurrency(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Satır İskontoları:</span>
            <span className="tabular-nums">-{formatCurrency(quote.total_line_discount)}</span>
          </div>
          <div className="flex justify-between text-text-muted border-b border-border pb-2">
            <span>Genel İskonto:</span>
            <span className="tabular-nums">-{formatCurrency(quote.general_discount_amount)}</span>
          </div>
          <div className="flex justify-between font-medium pt-2">
            <span>Net Tutar:</span>
            <span className="tabular-nums">{formatCurrency(quote.net_total)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>KDV (%{quote.vat_rate}):</span>
            <span className="tabular-nums">{formatCurrency(quote.vat_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-brand-navy pt-2 border-t border-border mt-2">
            <span>Toplam:</span>
            <span className="tabular-nums">{formatCurrency(quote.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
