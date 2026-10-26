import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Store,
  Clock,
  CheckCircle2,
  TrendingUp,
  Package,
  Search,
  Building2,
  XCircle,
  Ban,
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";
import { DealerOrderRowActions } from "./DealerOrderRowActions";

export default async function AdminBayiSiparisleriPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { q, tab } = await searchParams;
  const currentTab = tab || "pending"; // pending | converted | rejected | all

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  const companyId = (profile as any)?.company_id;
  if (!companyId) {
    redirect("/login");
  }

  const service = await createServiceClient();

  // Fetch all dealer orders for stats
  const { data: allOrdersData } = await service
    .from("quotes")
    .select("id, quote_code, status, subtotal, grand_total, created_at, customer_snapshot, delivery_terms, notes, converted_sale_id")
    .eq("company_id", companyId)
    .eq("delivery_terms", "BAYI_SIPARISI")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const allOrders = (allOrdersData || []) as any[];

  const pendingOrders = allOrders.filter(
    (o) => o.status === "sent" || o.status === "draft"
  );
  const convertedOrders = allOrders.filter(
    (o) => o.status === "converted_to_sale"
  );
  const rejectedOrders = allOrders.filter(
    (o) => o.status === "rejected" || o.status === "cancelled"
  );

  // KRİTİK DÜZELTME: Toplam Hacim YALNIZCA resmi satışa dönüştürülmüş siparişleri kapsar!
  // Reddedilen ve iptal edilen siparişler asla başarılı hacme eklenmez.
  const totalVolume = convertedOrders.reduce(
    (acc, o) => acc + (Number(o.grand_total) || 0),
    0
  );

  // Tab query
  let filteredOrders = allOrders;
  if (currentTab === "pending") {
    filteredOrders = pendingOrders;
  } else if (currentTab === "converted") {
    filteredOrders = convertedOrders;
  } else if (currentTab === "rejected") {
    filteredOrders = rejectedOrders;
  }

  if (q && q.trim()) {
    const cleanQ = q.trim().toLowerCase();
    filteredOrders = filteredOrders.filter((o) => {
      const code = (o.quote_code || "").toLowerCase();
      const dealer = (
        o.customer_snapshot?.dealer_name ||
        o.customer_snapshot?.company_name ||
        ""
      ).toLowerCase();
      return code.includes(cleanQ) || dealer.includes(cleanQ);
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Store className="text-brand-gold" />
            Bayi Siparişleri Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tali bayilerden gelen siparişleri inceleyin, fiyat ve iskontoları düzenleyerek tek tıkla resmi satışa dönüştürün veya stok yoksa reddedin.
          </p>
        </div>
      </div>

      {/* KPI Kartları (4'lü Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/bayi-siparisleri?tab=pending"
          className={`p-4 rounded-xl border transition ${
            currentTab === "pending"
              ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30"
              : "bg-white border-border hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
              <Clock size={15} />
              Onay Bekleyenler
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              İşlem Gerekiyor
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {pendingOrders.length}{" "}
            <span className="text-xs font-normal text-slate-500">Sipariş</span>
          </p>
        </Link>

        <Link
          href="/bayi-siparisleri?tab=converted"
          className={`p-4 rounded-xl border transition ${
            currentTab === "converted"
              ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/30"
              : "bg-white border-border hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 size={15} />
              Satışa Dönüştürülenler
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Tamamlandı
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {convertedOrders.length}{" "}
            <span className="text-xs font-normal text-slate-500">Sipariş</span>
          </p>
        </Link>

        <Link
          href="/bayi-siparisleri?tab=rejected"
          className={`p-4 rounded-xl border transition ${
            currentTab === "rejected"
              ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/30"
              : "bg-white border-border hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <XCircle size={15} />
              Reddedilen / İptal
            </span>
            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
              Ürün Yok / İptal
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {rejectedOrders.length}{" "}
            <span className="text-xs font-normal text-slate-500">Sipariş</span>
          </p>
        </Link>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <TrendingUp size={15} />
              Başarılı Sipariş Hacmi
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              Resmi Satışlar
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(totalVolume)}
          </p>
        </div>
      </div>

      {/* Filtre Sekmeleri & Arama */}
      <div className="bg-white p-3 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <Link
            href="/bayi-siparisleri?tab=pending"
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              currentTab === "pending"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Onay Bekleyenler ({pendingOrders.length})
          </Link>
          <Link
            href="/bayi-siparisleri?tab=converted"
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              currentTab === "converted"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Satışa Dönüştürülenler ({convertedOrders.length})
          </Link>
          <Link
            href="/bayi-siparisleri?tab=rejected"
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              currentTab === "rejected"
                ? "bg-white text-rose-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Reddedilenler ({rejectedOrders.length})
          </Link>
          <Link
            href="/bayi-siparisleri?tab=all"
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              currentTab === "all"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tüm Siparişler ({allOrders.length})
          </Link>
        </div>

        <form method="GET" action="/bayi-siparisleri" className="relative max-w-xs w-full">
          <input type="hidden" name="tab" value={currentTab} />
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="Sipariş no veya bayi ara..."
            className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </form>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package size={44} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Sipariş bulunamadı</p>
            <p className="text-xs text-slate-400 mt-1">
              Bu filtre kriterlerine uyan bayi siparişi kaydı bulunmuyor.
            </p>
          </div>
        ) : (
          <InteractiveTable tableId="admin-bayi-siparisleri-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Sipariş No</th>
                  <th className="py-3 px-4">Tali Bayi Bilgisi</th>
                  <th className="py-3 px-4">Sipariş Tarihi</th>
                  <th className="py-3 px-4 text-right">Tutar (KDV Dahil)</th>
                  <th className="py-3 px-4 text-center">Durum</th>
                  <th className="py-3 px-4 text-center">İşlem & Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order: any) => {
                  const dealerName =
                    order.customer_snapshot?.dealer_name ||
                    order.customer_snapshot?.company_name ||
                    "Tali Bayi";
                  const dealerPhone = order.customer_snapshot?.phone || "-";

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {order.quote_code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={15} className="text-brand-gold flex-shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">
                              {dealerName}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Tel: {dealerPhone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(order.grand_total || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {order.status === "converted_to_sale" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            Satışa Dönüştü
                          </span>
                        )}
                        {(order.status === "sent" || order.status === "draft") && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock size={12} />
                            Onay Bekliyor
                          </span>
                        )}
                        {order.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800" title={order.notes || "Reddedildi"}>
                            <XCircle size={12} />
                            Reddedildi
                          </span>
                        )}
                        {order.status === "cancelled" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700" title={order.notes || "İptal"}>
                            <Ban size={12} />
                            İptal Edildi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <DealerOrderRowActions
                          orderId={order.id}
                          orderCode={order.quote_code}
                          status={order.status}
                          convertedSaleId={order.converted_sale_id}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </InteractiveTable>
        )}
      </div>
    </div>
  );
}
