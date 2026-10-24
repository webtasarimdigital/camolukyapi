'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function adjustStock(
  productId: string,
  companyId: string,
  movementType: string,
  quantity: number,
  reason: string
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single();
  const role = (profile as any)?.role;
  if (['tali_bayi', 'bayi', 'depo', 'sofor'].includes(role)) {
    throw new Error('Yetkiniz bulunmuyor! Yalnızca görüntüleme yetkiniz bulunmaktadır.');
  }

  // Get current stock
  const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', productId).single();
  const currentStock = (prod as any)?.stock_qty ?? 0;

  let delta = quantity;
  if (movementType === 'manual_correction') {
    // quantity is the new target stock (e.g. 1600), delta is target - current (1600 - 1700 = -100)
    delta = quantity - currentStock;
  } else if (movementType === 'adjustment_out') {
    delta = -Math.abs(quantity);
  } else if (movementType === 'adjustment_in') {
    delta = Math.abs(quantity);
  }

  const { error } = await supabase.rpc('add_stock_movement', {
    p_company_id: companyId,
    p_product_id: productId,
    p_movement_type: movementType,
    p_quantity: delta,
    p_reference_id: null,
    p_reference_type: 'manual',
    p_reason: reason || 'Manuel stok düzeltmesi',
    p_user_id: userData.user.id,
  } as never);

  if (error) {
    // Direct update fallback if RPC error
    const newStock = movementType === 'manual_correction' ? quantity : currentStock + delta;
    const { error: updErr } = await supabase.from('products').update({ stock_qty: newStock } as never).eq('id', productId);
    if (updErr) throw new Error(updErr.message);
  }

  revalidatePath('/urunler');
  revalidatePath(`/urunler/${productId}`);
  revalidatePath('/stok');
  revalidatePath('/stok/hareketler');
  revalidatePath('/raporlar/kritik-stok');
}
