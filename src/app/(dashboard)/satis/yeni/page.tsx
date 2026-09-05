import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SaleForm } from "./SaleForm";

export default async function NewSalePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, full_name")
    .eq("id", userData.user.id)
    .single();
  const profile = profileData as { company_id: string; full_name: string } | null;
  if (!profile?.company_id) redirect("/login");

  // Fetch active customers
  const { data: customersData } = await supabase
    .from("customers")
    .select("id, company_name, contact_name, phone, type, tax_office, tax_number, address")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .order("company_name", { ascending: true });

  // Fetch active products
  const { data: productsData } = await supabase
    .from("products")
    .select("id, product_code, product_name, unit, default_sale_price, cost_price, stock_qty, product_group")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("product_name", { ascending: true })
    .limit(200);

  return (
    <div className="space-y-6">
      <SaleForm
        customers={customersData || []}
        products={productsData || []}
        creatorName={profile.full_name || "Yetkili"}
      />
    </div>
  );
}
