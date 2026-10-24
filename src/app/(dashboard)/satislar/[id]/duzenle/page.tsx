"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EditSaleForm } from "./EditSaleForm";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saleData } = await supabase
    .from("sales")
    .select("*, customer:customers(*), items:sale_items(*)")
    .eq("id", id)
    .single();

  if (!saleData) redirect("/satislar");

  const sale = saleData as any;

  // Fetch active products
  const { data: productsData } = await supabase
    .from("products")
    .select("id, product_code, product_name, unit, default_sale_price, cost_price, stock_qty, size, price_quality_1, price_quality_2, price_commercial")
    .eq("company_id", sale.company_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("product_name", { ascending: true })
    .limit(1000);

  return (
    <EditSaleForm
      sale={sale}
      initialItems={sale.items || []}
      products={productsData || []}
    />
  );
}
