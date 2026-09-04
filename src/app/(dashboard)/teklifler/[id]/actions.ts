'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateQuoteStatus(quoteId: string, status: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("quotes")
    .update({ status } as never)
    .eq("id", quoteId);

  if (error) throw new Error(error.message);
  revalidatePath(`/teklifler/${quoteId}`);
  revalidatePath(`/teklifler`);
}

export async function convertQuoteToSale(quoteId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc("convert_quote_to_sale" as never, {
    p_quote_id: quoteId,
    p_user_id: userData.user.id
  } as never);

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteQuote(quoteId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("quotes")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", quoteId);

  if (error) throw new Error(error.message);
  revalidatePath(`/teklifler`);
}
