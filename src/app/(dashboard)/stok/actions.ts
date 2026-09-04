'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function adjustStock(productId: string, companyId: string, movementType: string, quantity: number, reason: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { error } = await supabase.rpc('add_stock_movement', {
    p_company_id: companyId,
    p_product_id: productId,
    p_movement_type: movementType,
    p_quantity: quantity,
    p_reference_id: null,
    p_notes: reason,
    p_created_by: userData.user.id
  } as never);

  if (error) throw new Error(error.message);
  revalidatePath('/stok');
}
