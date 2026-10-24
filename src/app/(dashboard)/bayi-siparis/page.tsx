import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  ShoppingBag,
  Plus,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";

export default async function BayiSiparislerimPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch orders created by this dealer
  const { data: ordersData } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("created_by", user.id)
    .eq("delivery_terms", "BAYI_SIPARISI")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const orders = (ordersData || []) as any[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Başlık ve Aksiyon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="text-brand-gold" />
            Siparişlerim
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Merkeze ilettiğiniz bayi siparişlerinizi ve onay/satış durumlarını buradan takip edebilirsiniz.
          </p>
        </div>

        <Link
          href="/bayi-siparis/yeni"
          className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm"
        >
          <Plus size={16} />
          <span>Yeni Sipariş Oluştur</span>
        </Link>
      </div>

      {/* İstatistik Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Toplam Sipariş</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{orders.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
            <Clock size={14} />
            Onay Bekleyenler
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {orders.filter((o) => o.status === "sent" || o.status === "draft").length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            Onaylanan & Satışa Dönen
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {orders.filter((o) => o.status === "converted_to_sale").length}
          </p>
        </div>
      </div>

      {/* Siparişler Tablosu */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package size={44} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Henüz sipariş vermediniz</p>
            <p className="text-xs text-slate-400 mt-1">
              Sağ üstteki "Yeni Sipariş Oluştur" butonuna basarak ilk siparişinizi kolayca oluşturabilirsiniz.
            </p>
            <div className="mt-4">
              <Link
                href="/bayi-siparis/yeni"
                className="inline-flex items-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                <Plus size={14} /> Sipariş Oluştur
              </Link>
            </div>
          </div>
        ) : (
          <InteractiveTable tableId="bayi-siparis-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Sipariş No</th>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Kalem Sayısı</th>
                  <th className="py-3 px-4 text-right">Ara Toplam</th>
                  <th className="py-3 px-4 text-right">Genel Toplam</th>
                  <th className="py-3 px-4 text-center">Durum</th>
                  <th className="py-3 px-4">Notlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order: any) => {
                  const isConverted = order.status === "converted_to_sale";
                  const itemsCount = order.items?.length || 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {order.quote_code}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {itemsCount} Kalem
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(order.subtotal || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(order.grand_total || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isConverted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            Onaylandı & Satışa Döndü
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock size={12} />
                            Admin Onayı Bekliyor
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {order.notes || "-"}
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
