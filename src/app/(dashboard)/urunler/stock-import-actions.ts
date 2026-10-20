"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface StockProductSummary {
  id: string;
  product_code: string;
  product_name: string;
  stock_qty: number;
  unit: string;
}

export interface BulkIncreaseItem {
  productId: string;
  addQty: number;
  rawCode?: string;
  rawName?: string;
}

export interface BulkIncreaseResult {
  success: boolean;
  updatedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Excel eşleştirmesi için aktif ürünlerin özet listesini getirir.
 */
export async function getProductsForStockImport(): Promise<{
  success: boolean;
  products?: StockProductSummary[];
  companyId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Oturum bulunamadı. Lütfen giriş yapın." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    const companyId = (profile as any)?.company_id;
    if (!companyId) {
      return { success: false, error: "Şirket profili bulunamadı." };
    }

    // Maksimum 5000 aktif ürünü çek (mevcut katalog ~936)
    const { data: products, error } = await supabase
      .from("products")
      .select("id, product_code, product_name, stock_qty, unit")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .limit(5000);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      products: (products as StockProductSummary[]) || [],
      companyId,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Bilinmeyen sunucu hatası." };
  }
}

/**
 * Seçilen ürünlerin stoklarını 'add_stock_movement' RPC'si ile artırır.
 * Mevcut stoğu bozmaz, sadece üstüne ekler.
 */
export async function bulkIncreaseStock(
  items: BulkIncreaseItem[]
): Promise<BulkIncreaseResult> {
  const result: BulkIncreaseResult = {
    success: true,
    updatedCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (!items || items.length === 0) {
    return { ...result, success: false, errors: ["Güncellenecek ürün listesi boş."] };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ...result,
        success: false,
        errors: ["Oturum bulunamadı. Lütfen giriş yapın."],
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    const role = (profile as any)?.role;
    if (role === "tali_bayi" || role === "bayi" || role === "depo" || role === "sofor") {
      return {
        ...result,
        success: false,
        errors: ["Yetkiniz bulunmuyor! Stok içe aktarma yetkiniz yoktur (Yalnızca Görüntüleme)."],
      };
    }

    const companyId = (profile as any)?.company_id;
    if (!companyId) {
      return {
        ...result,
        success: false,
        errors: ["Şirket profili bulunamadı."],
      };
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    // Her bir ürün için add_stock_movement RPC çağrısı
    for (const item of items) {
      if (!item.productId || typeof item.addQty !== "number" || item.addQty <= 0) {
        result.failedCount++;
        continue;
      }

      try {
        const { error: rpcError } = await supabase.rpc("add_stock_movement", {
          p_company_id: companyId,
          p_movement_type: "adjustment_in",
          p_product_id: item.productId,
          p_quantity: item.addQty,
          p_reason: `Excel Stok Adet Yükleme (${timestamp}): +${item.addQty}`,
          p_reference_id: null,
          p_reference_type: "excel_stock_upload",
          p_user_id: user.id,
        } as never);

        if (rpcError) {
          result.failedCount++;
          result.errors.push(
            `${item.rawCode || item.rawName || item.productId}: ${rpcError.message}`
          );
        } else {
          result.updatedCount++;
        }
      } catch (e: any) {
        result.failedCount++;
        result.errors.push(
          `${item.rawCode || item.rawName || item.productId}: ${e?.message || "Hata"}`
        );
      }
    }

    revalidatePath("/urunler");
    revalidatePath("/stok");
    revalidatePath("/stok/hareketler");
    revalidatePath("/dashboard");

    return result;
  } catch (err: any) {
    return {
      success: false,
      updatedCount: result.updatedCount,
      failedCount: result.failedCount,
      errors: [err?.message || "Toplu stok güncelleme sırasında hata oluştu."],
    };
  }
}
