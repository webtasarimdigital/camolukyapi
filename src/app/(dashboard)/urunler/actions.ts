'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { parseCurrencyInput } from '@/lib/formatters';

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userData.user.id)
    .single();

  const companyId = (profileData as any)?.company_id;
  if (!companyId) throw new Error('Company not found');

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

  redirect('/urunler');
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient();
  
  const updatedProduct = {
    product_name: formData.get('product_name') as string,
    product_group: formData.get('product_group') as string,
    series_name: formData.get('series_name') as string,
    size: formData.get('size') as string,
    brand: formData.get('brand') as string,
    supplier: formData.get('supplier') as string,
    unit: formData.get('unit') as string,
    allows_decimal_qty: formData.get('allows_decimal_qty') === 'on',
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

  redirect('/urunler');
}

export async function deactivateProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) throw new Error(error.message);
  redirect('/urunler');
}
