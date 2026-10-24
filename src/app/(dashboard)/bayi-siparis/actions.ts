"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateLine, calculateTotals } from "@/lib/calculations";
import { revalidatePath } from "next/cache";

export interface DealerOrderItemInput {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface SubmitDealerOrderInput {
  items: DealerOrderItemInput[];
  shippingAddress?: string;
  contactPhone?: string;
  notes?: string;
}

export async function searchProductsForDealer(query: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userData.user.id)
    .single();

  const companyId = (profile as any)?.company_id;
  if (!companyId) return [];

  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const { data: products } = await supabase
    .from("products")
    .select("id, product_code, product_name, unit, stock_qty, product_group, series_name, size, price_quality_1, price_quality_2, price_commercial, default_sale_price")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .or(`product_code.ilike.%${cleanQ}%,product_name.ilike.%${cleanQ}%,series_name.ilike.%${cleanQ}%,size.ilike.%${cleanQ}%`)
    .order("product_name", { ascending: true })
    .limit(50);

  return products || [];
}

export async function submitDealerOrder(input: SubmitDealerOrderInput) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    throw new Error("Oturum açmanız gerekiyor.");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, full_name, phone, role")
    .eq("id", userData.user.id)
    .single();

  const profile = profileData as { company_id: string; full_name: string; phone: string | null; role: string } | null;
  if (!profile?.company_id) {
    throw new Error("Şirket bilgisi bulunamadı.");
  }

  if (!input.items || input.items.length === 0) {
    throw new Error("Lütfen siparişe en az 1 ürün ekleyin.");
  }

  // Calculate lines and totals (Standard 20% VAT estimate, 0 discount on initial dealer draft)
  const lines = input.items.map((item) =>
    calculateLine({
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_type: null,
      discount_value: 0,
    })
  );

  const vatRate = 20;
  const totals = calculateTotals(lines, vatRate, null, 0);

  // Generate order code (BAYI-2026-XXXX)
  const year = new Date().getFullYear();
  let orderCode = "";
  try {
    const { count } = await supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("delivery_terms", "BAYI_SIPARISI");
    const seq = String((count || 0) + 1).padStart(4, "0");
    orderCode = `BAYI-${year}-${seq}`;
  } catch {
    orderCode = `BAYI-${year}-${Math.floor(Date.now() / 1000).toString().slice(-4)}`;
  }

  const dealerName = profile.full_name || "Tali Bayi";
  const dealerPhone = input.contactPhone || profile.phone || "-";
  const notesFormatted = [
    input.notes ? `Sipariş Notu: ${input.notes}` : null,
    input.shippingAddress ? `Teslimat Adresi: ${input.shippingAddress}` : null,
    `Tali Bayi: ${dealerName} (${dealerPhone})`,
  ]
    .filter(Boolean)
    .join(" | ");

  const customerSnapshot = {
    is_dealer_order: true,
    dealer_id: userData.user.id,
    dealer_name: dealerName,
    company_name: dealerName,
    contact_name: dealerName,
    phone: dealerPhone,
    address: input.shippingAddress || null,
    dealer_notes: input.notes || null,
  };

  // 1. Insert into quotes
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      company_id: profile.company_id,
      quote_code: orderCode,
      status: "sent", // Merkeze gönderildi / onay bekliyor
      delivery_terms: "BAYI_SIPARISI",
      payment_terms: "Bayi Cari / Onayda Belirlenecek",
      subtotal: totals.subtotal,
      line_discount_total: 0,
      general_discount_type: null,
      general_discount_value: 0,
      general_discount_amount: 0,
      net_total: totals.net_total,
      vat_rate: vatRate,
      vat_total: totals.vat_total,
      grand_total: totals.grand_total,
      customer_snapshot: customerSnapshot,
      notes: notesFormatted,
      created_by: userData.user.id,
    } as any)
    .select()
    .single();

  if (quoteError || !quote) {
    throw new Error("Sipariş kaydedilemedi: " + (quoteError?.message || "Bilinmeyen hata"));
  }

  const quoteId = (quote as any).id;

  // 2. Insert into quote_items
  const itemsToInsert = input.items.map((item, idx) => ({
    quote_id: quoteId,
    sort_order: idx + 1,
    product_id: item.productId,
    product_code_snapshot: item.productCode,
    product_name_snapshot: item.productName,
    description_snapshot: "",
    unit_snapshot: item.unit || "ADET",
    price_source: "quality_1",
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount_type: null,
    discount_value: 0,
    discount_amount: 0,
    line_subtotal: lines[idx].line_subtotal,
    line_total: lines[idx].line_total,
  }));

  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(itemsToInsert as any);

  if (itemsError) {
    await supabase.from("quotes").delete().eq("id", quoteId);
    throw new Error("Sipariş ürünleri kaydedilemedi: " + itemsError.message);
  }

  revalidatePath("/bayi-siparis");
  revalidatePath("/bayi-siparisleri");
  revalidatePath("/dashboard");

  return {
    success: true,
    orderId: quoteId,
    orderCode,
  };
}
