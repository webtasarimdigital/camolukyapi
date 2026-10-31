import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EditQuoteForm } from "./EditQuoteForm";

export default async function EditQuotePage({
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
    .select("*, customer:customers(*), items:quote_items(*, product:products(stock_qty, brand, series_name, size, price_quality_1, price_quality_2, price_commercial))")
    .eq("id", id)
    .single();

  if (!quoteData) redirect("/teklifler");

  const quote = quoteData as any;
  if (quote.status === "converted_to_sale" || quote.deleted_at) {
    // Satışa dönmüş veya silinmiş teklif düzenlenemez
    redirect(`/teklifler/${id}`);
  }

  // Şirkete ait müşterileri çek
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const companyId = (profile as any)?.company_id || quote.company_id;

  const { data: customersData } = await supabase
    .from("customers")
    .select("id, company_name, contact_name, phone, address, tax_office, tax_number, email, notes")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("company_name", { ascending: true });

  const customers = (customersData || []) as any[];

  // İlk açılışta hızlı ürün seçimi için ilk 200 ürün (canlı arama ile tüm 4,371+ ürün aranabilir)
  const { data: productsData } = await supabase
    .from("products")
    .select("id, product_code, product_name, unit, stock_qty, min_stock_qty, default_sale_price, cost_price, price_quality_1, price_quality_2, price_commercial, series_name, size, product_group, brand")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("product_name", { ascending: true })
    .limit(200);

  const products = (productsData || []) as any[];

  return (
    <EditQuoteForm
      quote={quote}
      initialItems={quote.items || []}
      customers={customers}
      products={products}
    />
  );
}
