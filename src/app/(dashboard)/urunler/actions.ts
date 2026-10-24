'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseCurrencyInput } from '@/lib/formatters';

async function getRoleAndCompany() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', userData.user.id)
    .single();

  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) throw new Error('Company not found');

  return { supabase, user: userData.user, companyId: profile.company_id, role: profile.role || 'staff' };
}

export async function createProduct(formData: FormData) {
  const { supabase, companyId, role } = await getRoleAndCompany();
  if (['tali_bayi', 'bayi', 'depo', 'sofor'].includes(role)) {
    throw new Error('Yetkiniz bulunmuyor! Yalnızca görüntüleme yetkiniz bulunmaktadır.');
  }

  const product_code = formData.get('product_code') as string;
  const product_name = formData.get('product_name') as string;
  
  if (!product_code || !product_name) throw new Error('Kodu ve adı zorunludur.');

  const newProduct = {
    company_id: companyId,
    product_code,
    product_name,
    product_group: formData.get('product_group') as string,
    series_name: formData.get('series_name') as string,
    size: formData.get('size') as string,
    brand: formData.get('brand') as string,
    supplier: formData.get('supplier') as string,
    unit: formData.get('unit') as string,
    allows_decimal_qty: formData.get('allows_decimal_qty') === 'on',
    stock_qty: Number(formData.get('stock_qty') || 0),
    min_stock_qty: Number(formData.get('min_stock_qty') || 0),
    price_quality_1: parseCurrencyInput(formData.get('price_quality_1') as string || '0'),
    price_quality_2: parseCurrencyInput(formData.get('price_quality_2') as string || '0'),
    price_commercial: parseCurrencyInput(formData.get('price_commercial') as string || '0'),
    default_sale_price: parseCurrencyInput(formData.get('default_sale_price') as string || '0'),
    cost_price: parseCurrencyInput(formData.get('cost_price') as string || '0'),
    notes: formData.get('notes') as string,
  };

  const { error } = await supabase.from('products').insert([newProduct] as never);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/urunler');
  return { success: true };
}

export async function updateProduct(id: string, formData: FormData) {
  const { supabase, companyId, user, role } = await getRoleAndCompany();
  if (['tali_bayi', 'bayi', 'depo', 'sofor'].includes(role)) {
    throw new Error('Yetkiniz bulunmuyor! Yalnızca görüntüleme yetkiniz bulunmaktadır.');
  }

  // Get current product to log stock difference if needed
  const { data: currentProduct } = await supabase
    .from('products')
    .select('stock_qty')
    .eq('id', id)
    .single();

  const rawStock = formData.get('stock_qty');
  let newStockQty = (currentProduct as any)?.stock_qty ?? 0;
  if (rawStock !== null && rawStock !== '') {
    const parsed = typeof rawStock === 'string' ? parseFloat(rawStock.replace(',', '.')) : Number(rawStock);
    if (!isNaN(parsed)) {
      newStockQty = parsed;
    }
  }

  const updatedProduct = {
    product_name: formData.get('product_name') as string,
    product_group: formData.get('product_group') as string,
    series_name: formData.get('series_name') as string,
    size: formData.get('size') as string,
    brand: formData.get('brand') as string,
    supplier: formData.get('supplier') as string,
    unit: formData.get('unit') as string,
    allows_decimal_qty: formData.get('allows_decimal_qty') === 'on',
    stock_qty: newStockQty,
    min_stock_qty: Number(formData.get('min_stock_qty') || 0),
    price_quality_1: parseCurrencyInput(formData.get('price_quality_1') as string || '0'),
    price_quality_2: parseCurrencyInput(formData.get('price_quality_2') as string || '0'),
    price_commercial: parseCurrencyInput(formData.get('price_commercial') as string || '0'),
    default_sale_price: parseCurrencyInput(formData.get('default_sale_price') as string || '0'),
    cost_price: parseCurrencyInput(formData.get('cost_price') as string || '0'),
    notes: formData.get('notes') as string,
  };

  const { error } = await supabase.from('products').update(updatedProduct as never).eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  // Record stock movement if stock was changed
  const oldStock = (currentProduct as any)?.stock_qty ?? 0;
  if (oldStock !== newStockQty) {
    const diff = newStockQty - oldStock;
    try {
      await supabase.rpc('add_stock_movement', {
        p_company_id: companyId,
        p_product_id: id,
        p_movement_type: 'manual_correction',
        p_quantity: diff,
        p_reason: 'Ürün kartı düzenleme ekranından manuel stok düzeltmesi',
        p_reference_id: null,
        p_reference_type: 'manual',
        p_user_id: user.id,
      } as never);
    } catch (moveErr) {
      console.warn('add_stock_movement rpc warning in updateProduct:', moveErr);
    }
  }

  revalidatePath('/urunler');
  revalidatePath(`/urunler/${id}`);
  revalidatePath('/stok');
  revalidatePath('/stok/hareketler');
  revalidatePath('/raporlar/kritik-stok');
  return { success: true };
}

export async function deactivateProduct(id: string) {
  const { supabase, role } = await getRoleAndCompany();
  if (!['admin', 'muhasebe1'].includes(role)) {
    throw new Error('Yetkiniz bulunmuyor! Yalnızca yöneticiler ürün silebilir.');
  }
  const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/urunler');
  return { success: true };
}

export async function deleteAllStock(mode: "all_products" | "zero_stock" = "all_products"): Promise<{
  success: boolean;
  message?: string;
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
      .select("company_id, role")
      .eq("id", user.id)
      .single();

    if ((profile as any)?.role !== "admin") {
      return { success: false, error: "Yetkiniz bulunmuyor! Yalnızca sistem yöneticisi tüm stoğu silebilir." };
    }

    const companyId = (profile as any)?.company_id;
    if (!companyId) {
      return { success: false, error: "Şirket profili bulunamadı." };
    }

    // Service client used to ensure full administrative execution without RLS issues
    const serviceClient = await createServiceClient();

    if (mode === "zero_stock") {
      // 1. Tüm aktif ürünlerin stok miktarını 0 yap
      const { error: updateErr } = await serviceClient
        .from("products")
        .update({ stock_qty: 0, updated_at: new Date().toISOString() } as never)
        .eq("company_id", companyId)
        .is("deleted_at", null);

      if (updateErr) {
        console.error("Stok sıfırlama hatası:", updateErr);
        return { success: false, error: `Stok sıfırlanamadı: ${updateErr.message}` };
      }
    } else {
      // 2. Tüm ürünleri ve stoğu tamamen sil
      // Önce doğrudan kalıcı silme dene (hard delete)
      const { error: hardDeleteErr } = await serviceClient
        .from("products")
        .delete()
        .eq("company_id", companyId);

      if (hardDeleteErr) {
        console.warn("Hard delete hatası, soft-delete deneniyor:", hardDeleteErr);
        const { error: softErr } = await serviceClient
          .from("products")
          .update({
            deleted_at: new Date().toISOString(),
            is_active: false,
            stock_qty: 0,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("company_id", companyId);

        if (softErr) {
          return { success: false, error: `Silme işlemi başarısız: ${softErr.message}` };
        }
      }
    }

    revalidatePath("/urunler");
    revalidatePath("/stok");
    revalidatePath("/stok/hareketler");
    revalidatePath("/raporlar/kritik-stok");
    revalidatePath("/dashboard");

    return {
      success: true,
      message:
        mode === "zero_stock"
          ? "Tüm stok adetleri başarıyla sıfırlandı."
          : "Tüm ürün ve stok kayıtları başarıyla silindi.",
    };
  } catch (err: any) {
    console.error("deleteAllStock exception:", err);
    return {
      success: false,
      error: err?.message || "İşlem sırasında beklenmeyen bir hata oluştu.",
    };
  }
}
