import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/formatters";
import {
  TrendingUp,
  ShoppingCart,
  FileText,
  Wallet,
  AlertCircle,
  Clock,
  Package,
} from "lucide-react";
import { DashboardCharts } from "./DashboardCharts";

interface DashboardKPI {
  today_revenue: number;
  month_revenue: number;
  year_revenue: number;
  today_sales_count: number;
  pending_quotes: number;
  today_collection: number;
  pending_receivable: number;
  critical_stock: number;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profil + şirket
  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, full_name, role")
    .eq("id", user!.id)
    .single();

  const profile = profileData as {
    company_id: string | null;
    full_name: string | null;
    role: string;
  } | null;

  if (!profile?.company_id) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-text-muted">
            Şirket ataması yapılmamış. Admin ile iletişime geçin.
          </p>
        </div>
      </div>
    );
  }

  // Dashboard KPI'ları — tek RPC çağrısı
  const { data: kpiData } = await supabase.rpc("get_dashboard_summary" as never, {
    p_company_id: profile.company_id,
  } as never);
  const kpi = kpiData as DashboardKPI | null;

  // Completed sales with items for charts
  const { data: salesData } = await supabase
    .from("sales")
    .select("id, grand_total, net_total, sale_date, created_at, status, items:sale_items(product_name_snapshot, unit_snapshot, quantity, line_total, line_cost_total)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const allSales = (salesData ?? []) as any[];

  // Partners with ledger for finance balance
  const { data: partnersData } = await supabase
    .from("partners")
    .select("id, name, phone, ledger:partner_ledger(direction, amount)")
    .eq("company_id", profile.company_id)
    .eq("is_active", true);

  const partners = (partnersData ?? []) as any[];

  // Financial transactions for profit/loss calculation
  const { data: financialsData } = await supabase
    .from("financial_transactions")
    .select("transaction_type, amount, category")
    .eq("company_id", profile.company_id)
    .limit(200);

  const financials = (financialsData ?? []) as any[];

  // Son satışlar (widget)
  const { data: recentSalesData } = await supabase
    .from("sales")
    .select(
      "id, sale_code, grand_total, sale_date, payment_status, customer_snapshot"
    )
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentSales = (recentSalesData ?? []) as Array<{
    id: string;
    sale_code: string;
    grand_total: number;
    sale_date: string;
    payment_status: string;
    customer_snapshot: { company_name?: string; contact_name?: string } | null;
  }>;

  // Son teklifler (widget)
  const { data: recentQuotesData } = await supabase
    .from("quotes")
    .select(
      "id, quote_code, grand_total, quote_date, status, customer_snapshot"
    )
    .eq("company_id", profile.company_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentQuotes = (recentQuotesData ?? []) as Array<{
    id: string;
    quote_code: string;
    grand_total: number;
    quote_date: string;
    status: string;
    customer_snapshot: { company_name?: string; contact_name?: string } | null;
  }>;

  const kpiCards = [
    {
      label: "Bugünkü Ciro",
      value: formatCurrency(kpi?.today_revenue ?? 0),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Aylık Ciro",
      value: formatCurrency(kpi?.month_revenue ?? 0),
      icon: TrendingUp,
      color: "text-brand-navy",
      bg: "bg-blue-50",
    },
    {
      label: "Bugünkü Satış",
      value: `${kpi?.today_sales_count ?? 0} adet`,
      icon: ShoppingCart,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Bekleyen Teklif",
      value: `${kpi?.pending_quotes ?? 0} adet`,
      icon: FileText,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Bugünkü Tahsilat",
      value: formatCurrency(kpi?.today_collection ?? 0),
      icon: Wallet,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Bekleyen Alacak",
      value: formatCurrency(kpi?.pending_receivable ?? 0),
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Kritik Stok",
      value: `${kpi?.critical_stock ?? 0} ürün`,
      icon: AlertCircle,
      color: "text-brand-red",
      bg: "bg-red-50",
    },
    {
      label: "Yıllık Ciro",
      value: formatCurrency(kpi?.year_revenue ?? 0),
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const statusLabels: Record<string, { label: string; cls: string }> = {
    draft: { label: "Taslak", cls: "bg-gray-100 text-gray-600" },
    sent: { label: "Gönderildi", cls: "bg-blue-100 text-blue-700" },
    accepted: { label: "Onaylandı", cls: "bg-green-100 text-green-700" },
    rejected: { label: "Reddedildi", cls: "bg-red-100 text-red-700" },
    converted_to_sale: {
      label: "Satışa Döndü",
      cls: "bg-purple-100 text-purple-700",
    },
    completed: { label: "Tamamlandı", cls: "bg-green-100 text-green-700" },
    cancelled: { label: "İptal", cls: "bg-gray-100 text-gray-500" },
    paid: { label: "Ödendi", cls: "bg-green-100 text-green-700" },
    partial: { label: "Kısmi", cls: "bg-yellow-100 text-yellow-700" },
    unpaid: { label: "Ödenmedi", cls: "bg-red-100 text-red-700" },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">Operasyon Paneli</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Hoş geldiniz, <strong className="text-text">{profile.full_name || "Yönetici"}</strong> • Çamoluk Yapı
          </p>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-border p-5 flex items-start gap-4 shadow-xs"
            >
              <div className={`${card.bg} p-2.5 rounded-lg flex-shrink-0`}>
                <Icon size={20} className={card.color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-muted mb-1">{card.label}</p>
                <p className="text-lg font-bold text-text truncate">
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphical Dashboard & Analytics Charts */}
      <DashboardCharts
        sales={allSales}
        partners={partners}
        financials={financials}
      />

      {/* Son Satışlar + Son Teklifler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son Satışlar */}
        <div className="bg-white rounded-2xl border border-border shadow-xs">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-text text-sm">Son Satışlar</h2>
            <a
              href="/satislar"
              className="text-xs text-brand-gold hover:underline font-semibold"
            >
              Tümü →
            </a>
          </div>
          <div className="divide-y divide-border">
            {recentSales.length > 0 ? (
              recentSales.map((sale) => {
                const status =
                  statusLabels[sale.payment_status] ?? {
                    label: sale.payment_status,
                    cls: "bg-gray-100 text-gray-600",
                  };
                return (
                  <a
                    key={sale.id}
                    href={`/satislar/${sale.id}`}
                    className="flex items-center px-5 py-3 hover:bg-surface transition gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">
                        {sale.customer_snapshot?.company_name ||
                          sale.customer_snapshot?.contact_name ||
                          "Perakende Müşteri"}
                      </p>
                      <p className="text-xs text-text-muted font-mono">{sale.sale_code}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-text tabular-nums">
                        {formatCurrency(sale.grand_total)}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${status.cls}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center text-xs text-text-muted">
                Henüz satış kaydı yok.
              </div>
            )}
          </div>
        </div>

        {/* Son Teklifler */}
        <div className="bg-white rounded-2xl border border-border shadow-xs">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-text text-sm">Son Teklifler</h2>
            <a
              href="/teklifler"
              className="text-xs text-brand-gold hover:underline font-semibold"
            >
              Tümü →
            </a>
          </div>
          <div className="divide-y divide-border">
            {recentQuotes.length > 0 ? (
              recentQuotes.map((quote) => {
                const status =
                  statusLabels[quote.status] ?? {
                    label: quote.status,
                    cls: "bg-gray-100 text-gray-600",
                  };
                return (
                  <a
                    key={quote.id}
                    href={`/teklifler/${quote.id}`}
                    className="flex items-center px-5 py-3 hover:bg-surface transition gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">
                        {quote.customer_snapshot?.company_name ||
                          quote.customer_snapshot?.contact_name ||
                          "Müşterisiz"}
                      </p>
                      <p className="text-xs text-text-muted font-mono">
                        TKF-{quote.quote_code}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-text tabular-nums">
                        {formatCurrency(quote.grand_total)}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${status.cls}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center text-xs text-text-muted">
                Henüz teklif yok.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
