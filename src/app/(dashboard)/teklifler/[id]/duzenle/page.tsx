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
  if (quote.status === "converted_to_sale") {
    // Satışa dönmüş teklif düzenlenemez
    redirect(`/teklifler/${id}`);
  }

  return <EditQuoteForm quote={quote} initialItems={quote.items || []} />;
}
