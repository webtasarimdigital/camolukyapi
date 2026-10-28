"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
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
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return [];

    const service = await createServiceClient();

    const { data: profile } = await service
      .from("profiles")
      .select("company_id")
      .eq("id", userData.user.id)
      .single();

    const companyId = (profile as any)?.company_id || "a0000000-0000-0000-0000-000000000001";

    const cleanQ = query.trim();
    if (!cleanQ) {
      const { data: products } = await service
        .from("products")
        .select("id, product_code, product_name, unit, stock_qty, product_group, series_name, size, price_quality_1, price_quality_2, price_commercial, default_sale_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("product_name", { ascending: true })
        .limit(30);
      return products || [];
    }

    const { data: products } = await service
      .from("products")
      .select("id, product_code, product_name, unit, stock_qty, product_group, series_name, size, price_quality_1, price_quality_2, price_commercial, default_sale_price")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .or(`product_code.ilike.%${cleanQ}%,product_name.ilike.%${cleanQ}%,series_name.ilike.%${cleanQ}%,size.ilike.%${cleanQ}%`)
      .order("product_name", { ascending: true })
      .limit(50);

    return products || [];
  } catch (err) {
    console.error("searchProductsForDealer error:", err);
    return [];
  }
}

export async function submitDealerOrder(input: SubmitDealerOrderInput): Promise<{
  success: boolean;
  orderId?: string;
  orderCode?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Oturum açmanız gerekiyor. Lütfen tekrar giriş yapın." };
    }

    const service = await createServiceClient();

    const { data: profileData } = await service
      .from("profiles")
      .select("company_id, full_name, phone, role")
      .eq("id", userData.user.id)
      .single();

    const profile = profileData as { company_id: string; full_name: string; phone: string | null; role: string } | null;
    const companyId = profile?.company_id || "a0000000-0000-0000-0000-000000000001";

    if (!input.items || input.items.length === 0) {
      return { success: false, error: "Lütfen siparişinize en az 1 ürün ekleyin." };
    }

    // Calculate lines and totals (0 VAT and 0 discount on dealer draft; Admin will set discount and VAT upon review)
    const lines = input.items.map((item) =>
      calculateLine({
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_type: null,
        discount_value: 0,
      })
    );

    const vatRate = 0;
    const totals = calculateTotals(lines, vatRate, null, 0);

    // Generate order code (MUST be <= 10 characters due to character(10) column constraint in DB!)
    // Format: BY26-0001 (9 chars)
    const yearShort = String(new Date().getFullYear()).slice(-2); // e.g. "26"
    const prefix = `BY${yearShort}-`;
    let orderCode = "";
    try {
      const { data: topOrders } = await service
        .from("quotes")
        .select("quote_code")
        .eq("company_id", companyId)
        .ilike("quote_code", `${prefix}%`)
        .order("quote_code", { ascending: false })
        .limit(20);

      let maxSeq = 0;
      if (topOrders && (topOrders as any[]).length > 0) {
        for (const o of (topOrders as any[])) {
          const trimmed = (o.quote_code || "").trim();
          if (trimmed.startsWith(prefix)) {
            const num = parseInt(trimmed.slice(prefix.length), 10);
            if (!isNaN(num) && num > maxSeq) maxSeq = num;
          }
        }
      }

      let candidateSeq = maxSeq + 1;
      orderCode = `${prefix}${String(candidateSeq).padStart(4, "0")}`;

      // Collision check
      let attempts = 0;
      while (attempts < 50) {
        const { data: existing } = await service
          .from("quotes")
          .select("id")
          .eq("company_id", companyId)
          .eq("quote_code", orderCode)
          .maybeSingle();

        if (!existing) break;
        candidateSeq++;
        orderCode = `${prefix}${String(candidateSeq).padStart(4, "0")}`;
        attempts++;
      }
    } catch {
      orderCode = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Safety: Ensure strictly <= 10 chars
    if (orderCode.length > 10) {
      orderCode = orderCode.slice(0, 10);
    }

    const dealerName = profile?.full_name || "Tali Bayi";
    const dealerPhone = input.contactPhone || profile?.phone || "-";
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

    // 1. Insert into quotes using service client
    const { data: quote, error: quoteError } = await service
      .from("quotes")
      .insert({
        company_id: companyId,
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
      return {
        success: false,
        error: "Sipariş veritabanına kaydedilemedi: " + (quoteError?.message || "Bilinmeyen hata"),
      };
    }

    const quoteId = (quote as any).id;

    // 2. Insert into quote_items
    const itemsToInsert = input.items.map((item, idx) => ({
      quote_id: quoteId,
      sort_order: idx + 1,
      product_id: item.productId,
      product_code_snapshot: item.productCode || "",
      product_name_snapshot: item.productName || "Ürün",
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

    const { error: itemsError } = await service
      .from("quote_items")
      .insert(itemsToInsert as any);

    if (itemsError) {
      await service.from("quotes").delete().eq("id", quoteId);
      return {
        success: false,
        error: "Sipariş ürünleri kaydedilemedi: " + itemsError.message,
      };
    }

    revalidatePath("/bayi-siparis");
    revalidatePath("/bayi-siparisleri");
    revalidatePath("/dashboard");

    return {
      success: true,
      orderId: quoteId,
      orderCode,
    };
  } catch (err: any) {
    console.error("submitDealerOrder exception:", err);
    return {
      success: false,
      error: "Sunucu hatası: " + (err?.message || "Beklenmeyen bir hata oluştu"),
    };
  }
}
