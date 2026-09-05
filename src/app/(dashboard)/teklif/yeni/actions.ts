'use server'

import { createClient } from "@/lib/supabase/server";
import { calculateLine, calculateTotals } from "@/lib/calculations";

export async function saveQuote(data: any) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userData.user.id)
    .single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("No company found");

  // Server-side recalculation
  const lines = data.items.map((item: any) => calculateLine({
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_type: item.discount_type,
    discount_value: item.discount_value
  }));

  const totals = calculateTotals(lines, data.vatRate, data.generalDiscountType, data.generalDiscountValue);

  // Generate Code (Simulation for missing RPC, fallback to timestamp for now if RPC fails)
  let quoteCode = Math.floor(Date.now() / 1000).toString();
  
  // Try RPC if it exists
  const { data: generatedCode } = await supabase.rpc("generate_unique_quote_code" as never);
  if (generatedCode) quoteCode = generatedCode as string;

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      company_id: profile.company_id,
      customer_id: data.customerId,
      customer_snapshot: data.customerSnapshot,
      quote_code: quoteCode,
      status: "draft",
      subtotal: totals.subtotal,
      line_discount_total: totals.line_discount_total,
      general_discount_type: data.generalDiscountType,
      general_discount_value: data.generalDiscountValue,
      general_discount_amount: totals.general_discount_amount,
      net_total: totals.net_total,
      vat_rate: data.vatRate,
      vat_total: totals.vat_total,
      grand_total: totals.grand_total,
      valid_until: data.validUntil,
      delivery_terms: data.deliveryTerms,
      payment_terms: data.paymentTerms,
      notes: data.notes,
      created_by: userData.user.id,
    } as never)
    .select()
    .single();

  if (quoteError) throw new Error(quoteError.message);
  
  const quoteData = quote as { id: string } | null;
  if (!quoteData) throw new Error("Failed to create quote");

  const quoteItems = data.items.map((item: any, i: number) => ({
    quote_id: quoteData.id,
    product_id: item.product_id,
    product_code_snapshot: item.product_code_snapshot,
    product_name_snapshot: item.product_name_snapshot,
    description_snapshot: item.description_snapshot,
    unit_snapshot: item.unit_snapshot,
    price_source: item.price_source,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_type: item.discount_type,
    discount_value: item.discount_value,
    line_subtotal: lines[i].line_subtotal,
    discount_amount: lines[i].discount_amount,
    line_total: lines[i].line_total,
  }));

  const { error: itemsError } = await supabase.from("quote_items").insert(quoteItems as never);
  if (itemsError) throw new Error(itemsError.message);

  return { quoteId: quoteData.id, quoteCode };
}

export async function quickCreateCustomer(data: {
  companyName: string;
  contactName?: string;
  phone?: string;
  type?: "kurumsal" | "bireysel";
  taxOffice?: string;
  taxNumber?: string;
  address?: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Oturum açmanız gerekiyor.");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userData.user.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Kullanıcı şirket bilgisi bulunamadı.");

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      company_id: profile.company_id,
      company_name: data.companyName.trim(),
      contact_name: data.contactName?.trim() || data.companyName.trim(),
      phone: data.phone?.trim() || "-",
      type: data.type || "kurumsal",
      tax_office: data.taxOffice?.trim() || null,
      tax_number: data.taxNumber?.trim() || null,
      address: data.address?.trim() || null,
      created_by: userData.user.id,
      is_active: true,
    } as never)
    .select()
    .single();

  if (error || !customer) {
    throw new Error("Müşteri kaydedilemedi: " + (error?.message || "Bilinmeyen hata"));
  }

  return { success: true, customer: customer as any };
}
