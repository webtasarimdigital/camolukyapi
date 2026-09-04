'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateCompanyInfo(formData: FormData, companyId: string) {
  const supabase = await createClient();
  const updates = {
    name: formData.get('name'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    tax_office: formData.get('tax_office'),
    tax_number: formData.get('tax_number'),
  };

  const { error } = await supabase.from('companies').update(updates as never).eq('id', companyId);
  if (error) throw new Error(error.message);
  revalidatePath('/ayarlar');
}

export async function updateQuoteSettings(formData: FormData, settingsId: string) {
  const supabase = await createClient();
  const updates = {
    default_vat_rate: Number(formData.get('default_vat_rate') || 20),
    default_quote_validity_days: Number(formData.get('default_quote_validity_days') || 15),
    delivery_terms: formData.get('delivery_terms'),
    payment_terms: formData.get('payment_terms'),
    general_notes: formData.get('general_notes'),
  };

  const { error } = await supabase.from('company_settings').update(updates as never).eq('id', settingsId);
  if (error) throw new Error(error.message);
  revalidatePath('/ayarlar');
}
