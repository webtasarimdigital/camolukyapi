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
    .select("*, customer:customers(*), items:quote_items(*)")
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
    .select("id, company_name, contact_name, phone, address, tax_office, tax_number, email")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("company_name", { ascending: true });

  const customers = (customersData || []) as any[];

  return (
    <EditQuoteForm
      quote={quote}
      initialItems={quote.items || []}
      customers={customers}
    />
  );
}
