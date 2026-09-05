import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";

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
    .select("*, customer:customers(*), creator:profiles(full_name), items:sale_items(*)")
    .eq("id", id)
    .single();

  if (!saleData) return <div>Satış bulunamadı</div>;
  const sale = saleData as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-3">
            STS-{sale.sale_code}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {sale.status}
            </span>
          </h1>
          <p className="text-sm text-text-muted">{new Date(sale.created_at).toLocaleDateString("tr-TR")}</p>
        </div>
      </div>
      <div className="bg-white p-5 rounded-xl border border-border">
        Müşteri: {sale.customer_snapshot?.company_name || sale.customer?.company_name}
      </div>
    </div>
  );
}
