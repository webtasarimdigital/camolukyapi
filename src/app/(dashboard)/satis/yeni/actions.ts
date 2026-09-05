"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SaleItemInput {
  productId?: string | null;
  productCode?: string | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountType?: "percent" | "fixed" | null;
  discountValue?: number;
  discountAmount?: number;
  lineTotal: number;
  costPrice?: number;
}

export interface CreateSaleInput {
  customerId?: string | null;
  retailCustomerName?: string;
  saleDate?: string;
  items: SaleItemInput[];
  vatRate: number;
  subtotal: number;
  discountTotal: number;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  paidAmount: number;
  paymentMethod?: "nakit" | "havale_eft" | "kredi_karti" | "cek" | "diger";
  notes?: string;
  dueDate?: string | null;
}

export async function createSaleWithItems(input: CreateSaleInput) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    throw new Error("Oturum açmanız gerekiyor.");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, full_name")
    .eq("id", userData.user.id)
    .single();

  const profile = profileData as { company_id: string; full_name: string } | null;
  if (!profile?.company_id) {
    throw new Error("Kullanıcı şirket bilgisi bulunamadı.");
  }

  if (!input.items || input.items.length === 0) {
    throw new Error("En az 1 adet ürün veya kalem eklemelisiniz.");
  }

  // Customer snapshot
  let customerSnapshot: any = null;
  if (input.customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", input.customerId)
      .single();
    if (customer) {
      customerSnapshot = customer;
    }
  } else if (input.retailCustomerName) {
    customerSnapshot = {
      company_name: input.retailCustomerName,
      contact_name: input.retailCustomerName,
      type: "bireysel",
      phone: "-",
    };
  } else {
    customerSnapshot = {
      company_name: "Perakende Satış",
      contact_name: "Perakende Müşteri",
      type: "bireysel",
      phone: "-",
    };
  }

  // Generate sale code
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePrefix = `${yyyy}${mm}${dd}`;

  const { count } = await supabase
    .from("sales")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id);

  const seq = String((count || 0) + 1).padStart(4, "0");
  const saleCode = `SAT-${datePrefix}-${seq}`;

  const remainingAmount = Math.max(0, input.grandTotal - (input.paidAmount || 0));

  // 1. Insert into sales
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      company_id: profile.company_id,
      sale_code: saleCode,
      customer_id: input.customerId || null,
      customer_snapshot: customerSnapshot,
      sale_date: input.saleDate || new Date().toISOString().split("T")[0],
      sales_rep_id: userData.user.id,
      status: "draft",
      currency: "TRY",
      vat_rate: input.vatRate || 20,
      subtotal: input.subtotal,
      discount_total: input.discountTotal,
      net_total: input.netTotal,
      vat_total: input.vatTotal,
      grand_total: input.grandTotal,
      payment_status: input.paymentStatus,
      paid_amount: input.paidAmount || 0,
      remaining_amount: remainingAmount,
      due_date: input.dueDate || null,
      notes: input.notes || null,
      created_by: userData.user.id,
    } as any)
    .select()
    .single();

  if (saleError || !sale) {
    throw new Error("Satış kaydı oluşturulamadı: " + (saleError?.message || "Bilinmeyen hata"));
  }

  const saleId = (sale as any).id;

  // 2. Insert into sale_items
  const itemsToInsert = input.items.map((item, idx) => ({
    sale_id: saleId,
    sort_order: idx + 1,
    product_id: item.productId || null,
    product_code_snapshot: item.productCode || null,
    product_name_snapshot: item.productName,
    unit_snapshot: item.unit || "ADET",
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount_type: item.discountType || null,
    discount_value: item.discountValue || 0,
    discount_amount: item.discountAmount || 0,
    line_total: item.lineTotal,
    unit_cost_snapshot: item.costPrice || null,
    line_cost_total: item.costPrice ? item.costPrice * item.quantity : null,
  }));

  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(itemsToInsert as any);

  if (itemsError) {
    // Rollback sale
    await supabase.from("sales").delete().eq("id", saleId);
    throw new Error("Satış kalemleri kaydedilemedi: " + itemsError.message);
  }

  // 3. Finalize sale (atomic stock deduction & status transition)
  const { error: finalizeError } = await supabase.rpc("finalize_sale" as never, {
    p_sale_id: saleId,
    p_user_id: userData.user.id,
  } as never);

  if (finalizeError) {
    // If finalize failed, keep sale as draft so user can review or retry
    console.error("Satış tamamlama hatası:", finalizeError);
  }

  // 4. Log payment record if paid > 0
  if (input.paidAmount > 0) {
    await supabase.from("payments").insert({
      company_id: profile.company_id,
      sale_id: saleId,
      customer_id: input.customerId || null,
      amount: input.paidAmount,
      payment_date: input.saleDate || new Date().toISOString().split("T")[0],
      payment_method: input.paymentMethod || "nakit",
      reference_no: saleCode,
      notes: `Satış peşinatı / tahsilatı: ${saleCode}`,
      created_by: userData.user.id,
    } as any);
  }

  revalidatePath("/satislar");
  revalidatePath("/dashboard");
  revalidatePath("/stok");
  revalidatePath("/urunler");
  revalidatePath("/finans");
  revalidatePath("/raporlar");

  return { success: true, saleId };
}
