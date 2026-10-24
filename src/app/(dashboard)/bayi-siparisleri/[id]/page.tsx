import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ReviewAndConvertOrderForm } from "./ReviewAndConvertOrderForm";

export default async function BayiSiparisDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const companyId = (profile as any)?.company_id;
  if (!companyId) {
    redirect("/login");
  }

  // 1. Fetch Order and items
  const { data: orderData, error: orderErr } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (orderErr || !orderData) {
    notFound();
  }

  const order = orderData as any;
  const items = order.items || [];

  // 2. Fetch Customers for association
  const { data: customersData } = await supabase
    .from("customers")
    .select("id, company_name, contact_name, phone")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("company_name", { ascending: true })
    .limit(100);

  // 3. Fetch Products for adding extra items and live stock display
  const { data: productsData } = await supabase
    .from("products")
    .select("id, product_code, product_name, unit, stock_qty, price_quality_1, default_sale_price")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("product_name", { ascending: true })
    .limit(200);

  return (
    <ReviewAndConvertOrderForm
      order={order}
      items={items}
      customers={customersData || []}
      products={productsData || []}
    />
  );
}
