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

export interface BulkSyncItem {
  productId?: string | null;
  productCode: string;
  productName: string;
  unit?: string;
  stockQty: number;
}

/**
 * Excel'deki stokları senkronize eder:
 * - mode === 'set': Stoğu doğrudan Excel'deki ondalıklı değere eşitler (Yeni Stok = Excel)
 * - mode === 'add': Mevcut stoğun üstüne ekler
 * - createMissing === true: Sistemde bulunmayan ürünleri yeni ürün olarak veritabanına kaydeder
 */
export async function bulkSyncStock(
  items: BulkSyncItem[],
  mode: "set" | "add" = "set",
  createMissing: boolean = true
): Promise<BulkIncreaseResult> {
  const result: BulkIncreaseResult = {
    success: true,
    updatedCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (!items || items.length === 0) {
    return { ...result, success: false, errors: ["İşlenecek ürün listesi boş."] };
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
        errors: ["Yetkiniz bulunmuyor! Stok içe aktarma yetkiniz yoktur."],
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

    const validItems = items.filter(
      (it) => it.productCode && it.productCode.trim() && it.productName && it.productName.trim()
    );

    if (validItems.length === 0) {
      return { ...result, success: false, errors: ["Geçerli ürün kodu ve adı içeren satır bulunamadı."] };
    }

    const now = new Date().toISOString();

    if (mode === "set") {
      // 100'lük gruplar halinde doğrudan upsert
      const CHUNK_SIZE = 100;
      for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
        const chunk = validItems.slice(i, i + CHUNK_SIZE);
        const rows = chunk.map((it) => ({
          company_id: companyId,
          product_code: it.productCode.trim(),
          product_name: it.productName.trim(),
          unit: it.unit?.trim() || "Adet",
          stock_qty: typeof it.stockQty === "number" ? it.stockQty : 0,
          min_stock_qty: 0,
          allows_decimal_qty: true,
          is_active: true,
          deleted_at: null,
          updated_at: now,
        }));

        const { error: upsertErr } = await supabase
          .from("products")
          .upsert(rows as never[], { onConflict: "company_id,product_code" });

        if (upsertErr) {
          result.failedCount += chunk.length;
          result.errors.push(`Grup ${i / CHUNK_SIZE + 1} hatası: ${upsertErr.message}`);
        } else {
          result.updatedCount += chunk.length;
        }
      }
    } else {
      // mode === 'add'
      for (const item of validItems) {
        if (item.productId) {
          // Mevcut ürün üstüne ekle
          try {
            const { error: rpcError } = await supabase.rpc("add_stock_movement", {
              p_company_id: companyId,
              p_movement_type: "adjustment_in",
              p_product_id: item.productId,
              p_quantity: item.stockQty,
              p_reason: `Excel Stok Arttırma: +${item.stockQty}`,
              p_reference_id: null,
              p_reference_type: "excel_stock_upload",
              p_user_id: user.id,
            } as never);

            if (rpcError) {
              result.failedCount++;
              result.errors.push(`${item.productCode}: ${rpcError.message}`);
            } else {
              result.updatedCount++;
            }
          } catch (e: any) {
            result.failedCount++;
            result.errors.push(`${item.productCode}: ${e?.message || "Hata"}`);
          }
        } else if (createMissing) {
          // Yeni ürün olarak oluştur
          try {
            const { error: insErr } = await supabase.from("products").insert({
              company_id: companyId,
              product_code: item.productCode.trim(),
              product_name: item.productName.trim(),
              unit: item.unit?.trim() || "Adet",
              stock_qty: item.stockQty,
              allows_decimal_qty: true,
              is_active: true,
            } as never);

            if (insErr) {
              result.failedCount++;
              result.errors.push(`${item.productCode}: ${insErr.message}`);
            } else {
              result.updatedCount++;
            }
          } catch (e: any) {
            result.failedCount++;
            result.errors.push(`${item.productCode}: ${e?.message || "Hata"}`);
          }
        } else {
          result.failedCount++;
        }
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
      errors: [err?.message || "Toplu stok senkronizasyonu sırasında hata oluştu."],
    };
  }
}
