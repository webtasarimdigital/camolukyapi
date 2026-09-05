import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  ReceiptText,
  CreditCard,
  Phone,
  MapPin
} from "lucide-react";
import { SaleDetailActions } from "./SaleDetailActions";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: saleData } = await supabase
    .from("sales")
    .select("*, customer:customers(*), items:sale_items(*)")
    .eq("id", id)
    .single();

  if (!saleData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-border">
        <h2 className="text-lg font-bold text-text">Satış Bulunamadı</h2>
        <Link href="/satislar" className="text-xs text-brand-navy hover:underline mt-2 inline-block">
          ← Satış Listesine Dön
        </Link>
      </div>
    );
  }

  const sale = saleData as any;
  const items = sale.items || [];

  let saleCreatorName = "Yetkili";
  if (sale.created_by) {
    const { data: scp } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", sale.created_by)
      .single();
    const profileData = scp as { full_name: string | null } | null;
    if (profileData?.full_name) saleCreatorName = profileData.full_name;
  }

  // Fetch payments for this sale
  const { data: paymentsData } = await supabase
    .from("payments")
    .select("*")
    .eq("sale_id", id)
    .order("payment_date", { ascending: false });

  const payments = paymentsData || [];

  const customerName = sale.customer_snapshot?.company_name || sale.customer?.company_name || sale.customer_snapshot?.contact_name || sale.customer?.contact_name || "Perakende Müşteri";
  const customerPhone = sale.customer_snapshot?.phone || sale.customer?.phone || "-";
  const customerAddress = sale.customer_snapshot?.address || sale.customer?.address || "-";

  const statusBadges: Record<string, { label: string; cls: string }> = {
    draft: { label: "Taslak", cls: "bg-gray-100 text-gray-700 border-gray-200" },
    completed: { label: "Tamamlandı", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelled: { label: "İptal Edildi", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  const paymentBadges: Record<string, { label: string; cls: string }> = {
    paid: { label: "Tamamı Ödendi", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    partial: { label: "Kısmi Tahsilat", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    unpaid: { label: "Ödenmedi (Açık Hesap)", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  const currentStatus = statusBadges[sale.status] || { label: sale.status, cls: "bg-gray-100 text-gray-700" };
  const currentPayment = paymentBadges[sale.payment_status] || { label: sale.payment_status, cls: "bg-gray-100 text-gray-700" };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/satislar"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text mb-1"
          >
            <ArrowLeft size={14} /> Satış Listesine Dön
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-text font-mono">
              {sale.sale_code}
            </h1>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentStatus.cls}`}>
              {currentStatus.label}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${currentPayment.cls}`}>
              {currentPayment.label}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Temsilci: <strong className="text-text">{saleCreatorName || "Yetkili"}</strong> • Satış Tarihi: {new Date(sale.sale_date || sale.created_at).toLocaleDateString("tr-TR")}
          </p>
        </div>

        {/* Detail Actions Component */}
        <SaleDetailActions
          saleId={sale.id}
          saleCode={sale.sale_code}
          status={sale.status}
          remainingAmount={sale.remaining_amount || 0}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-semibold text-text-muted block mb-1">Genel Toplam (KDV Dahil)</span>
          <span className="text-2xl font-black text-text tabular-nums">{formatCurrency(sale.grand_total)}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 block mb-1">Tahsil Edilen Tutar</span>
          <span className="text-2xl font-black text-emerald-700 tabular-nums">{formatCurrency(sale.paid_amount || 0)}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-semibold text-rose-600 block mb-1">Kalan Alacak / Bakiye</span>
          <span className="text-2xl font-black text-rose-700 tabular-nums">{formatCurrency(sale.remaining_amount || 0)}</span>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs">
        <h3 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3 mb-3">
          <Building2 size={16} className="text-brand-navy" />
          Müşteri Bilgileri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-text-muted block">Müşteri / Ünvan:</span>
            <span className="font-bold text-text text-sm">{customerName}</span>
          </div>
          <div>
            <span className="text-text-muted block">Telefon:</span>
            <span className="font-medium text-text flex items-center gap-1 mt-0.5"><Phone size={12} /> {customerPhone}</span>
          </div>
          <div>
            <span className="text-text-muted block">Adres:</span>
            <span className="font-medium text-text flex items-center gap-1 mt-0.5"><MapPin size={12} /> {customerAddress}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-surface/50">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <ReceiptText size={16} className="text-brand-gold" />
            Satılan Kalemler ({items.length} Kalem)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface border-b border-border text-text-muted uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-3 text-center w-8">#</th>
                <th className="py-2.5 px-4 text-left">Ürün Açıklaması</th>
                <th className="py-2.5 px-3 text-right">Miktar</th>
                <th className="py-2.5 px-3 text-center">Birim</th>
                <th className="py-2.5 px-3 text-right">Birim Fiyat</th>
                <th className="py-2.5 px-3 text-right">İskonto</th>
                <th className="py-2.5 px-4 text-right">Tutar (KDV Hariç)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item: any, idx: number) => (
                <tr key={item.id || idx} className="hover:bg-surface/30">
                  <td className="py-2.5 px-3 text-center text-text-muted">{idx + 1}</td>
                  <td className="py-2.5 px-4">
                    <p className="font-semibold text-text">{item.product_name_snapshot}</p>
                    {item.product_code_snapshot && (
                      <span className="text-[10px] text-text-muted font-mono">{item.product_code_snapshot}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium tabular-nums">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-center text-text-muted">{item.unit_snapshot}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-text-muted">
                    {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : "-"}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-text tabular-nums">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary Footer */}
        <div className="bg-surface/30 border-t border-border p-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Ara Toplam:</span>
              <span className="font-semibold text-text tabular-nums">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount_total > 0 && (
              <div className="flex justify-between text-brand-red">
                <span>İskonto:</span>
                <span className="font-semibold tabular-nums">-{formatCurrency(sale.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-muted">
              <span>Net Tutar:</span>
              <span className="font-semibold text-text tabular-nums">{formatCurrency(sale.net_total)}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>KDV (%{sale.vat_rate}):</span>
              <span className="font-semibold text-text tabular-nums">{formatCurrency(sale.vat_total)}</span>
            </div>
            <div className="flex justify-between text-text font-black text-sm border-t border-border pt-1">
              <span>Genel Toplam:</span>
              <span className="tabular-nums text-brand-navy">{formatCurrency(sale.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments History */}
      <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-3">
        <h3 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3">
          <CreditCard size={16} className="text-emerald-600" />
          Tahsilat Geçmişi ({payments.length} İşlem)
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-text-muted py-2">Bu satış için henüz bir tahsilat kaydı girilmedi.</p>
        ) : (
          <div className="divide-y divide-border text-xs">
            {payments.map((pay: any) => (
              <div key={pay.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-text">{formatCurrency(pay.amount)}</span>
                  <span className="text-text-muted ml-2">({pay.payment_method?.toUpperCase()})</span>
                  {pay.notes && <span className="text-text-muted ml-2 italic">— {pay.notes}</span>}
                </div>
                <div className="text-text-muted">
                  {new Date(pay.payment_date || pay.created_at).toLocaleDateString("tr-TR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sale.notes && (
        <div className="bg-surface/50 border border-border rounded-2xl p-4 text-xs text-text-muted">
          <strong className="text-text block mb-1">Satış Notu:</strong>
          {sale.notes}
        </div>
      )}
    </div>
  );
}
