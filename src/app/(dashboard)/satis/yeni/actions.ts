"use server";
import { createClient } from "@/lib/supabase/server";

export async function createAndFinalizeSale(data: any) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  
  const saleCode = Math.floor(Date.now() / 1000).toString();
  const { data: sale, error } = await supabase.from("sales").insert({
    company_id: "...",
    sale_code: saleCode,
    status: "draft",
  } as never).select().single();
  
  if (error) throw new Error(error.message);
  return { saleId: (sale as any).id };
}
