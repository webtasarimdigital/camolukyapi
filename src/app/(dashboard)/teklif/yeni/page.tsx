import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QuoteForm } from "./QuoteForm";

export default async function NewQuotePage() {
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

  const { data: settingsData } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", profile.company_id)
    .single();
  const settings = (settingsData as any) || {};

  const { data: customersData } = await supabase
    .from("customers")
    .select("id, company_name, contact_name, phone, type, tax_office, tax_number, address, email")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .order("company_name", { ascending: true })
    .limit(500);

  const { data: productsData } = await supabase
    .from("products")
    .select("id, product_code, product_name, unit, default_sale_price, price_quality_1, price_quality_2, price_commercial, series_name, size, product_group")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("product_name", { ascending: true })
    .limit(1000);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Yeni Teklif Oluştur</h1>
          <p className="text-sm text-text-muted">Müşteri ve ürünleri seçerek yeni teklif hazırlayın</p>
        </div>
      </div>
      <QuoteForm
        creatorName={profile.full_name}
        defaultSettings={settings}
        customers={(customersData as any[]) || []}
        products={(productsData as any[]) || []}
      />
    </div>
  );
}