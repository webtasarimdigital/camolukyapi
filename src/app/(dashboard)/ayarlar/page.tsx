'use client';

import { useState, useEffect } from 'react';
import { updateCompanyInfo, updateQuoteSettings } from './actions';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function AyarlarPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return router.push('/login');

      const { data: profileData } = await supabase.from('profiles').select('company_id, role').eq('id', authData.user.id).single();
      const profile = profileData as { company_id: string; role: string } | null;
      if (!profile?.company_id || profile.role !== 'admin') {
        toast.error('Bu sayfaya erişim yetkiniz yok');
        return router.push('/dashboard');
      }

      const { data: companyData } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
      const company = companyData as any;

      const { data: settingsData } = await supabase.from('company_settings').select('*').eq('company_id', profile.company_id).single();
      const settings = settingsData as any;
      
      setData({ company, settings });
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleCompanySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCompanySaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateCompanyInfo(formData, data.company.id);
      toast.success('Şirket bilgileri başarıyla kaydedildi!');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setCompanySaving(false);
    }
  }

  async function handleQuoteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setQuoteSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateQuoteSettings(formData, data.settings.id);
      toast.success('Teklif ayarları başarıyla kaydedildi!');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setQuoteSaving(false);
    }
  }

  if (loading) return <div className="animate-pulse bg-gray-200 rounded h-64 w-full"></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text">Ayarlar</h1>

      <div className="flex border-b border-border mb-6">
        <button onClick={() => setActiveTab('company')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'company' ? 'border-b-2 border-brand-gold text-brand-navy' : 'text-text-muted hover:text-text'}`}>Şirket Bilgileri</button>
        <button onClick={() => setActiveTab('quote')} className={`px-4 py-2 font-medium text-sm ${activeTab === 'quote' ? 'border-b-2 border-brand-gold text-brand-navy' : 'text-text-muted hover:text-text'}`}>Teklif Ayarları</button>
      </div>

      {activeTab === 'company' && (
        <form onSubmit={handleCompanySubmit} className="bg-white p-6 rounded-xl border border-border space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">Firma Adı</label>
              <input type="text" name="name" defaultValue={data.company?.name} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">Adres</label>
              <textarea name="address" defaultValue={data.company?.address} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Telefon</label>
              <input type="text" name="phone" defaultValue={data.company?.phone} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">E-posta</label>
              <input type="email" name="email" defaultValue={data.company?.email} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Vergi Dairesi</label>
              <input type="text" name="tax_office" defaultValue={data.company?.tax_office} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Vergi No</label>
              <input type="text" name="tax_number" defaultValue={data.company?.tax_number} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={companySaving}
              className="bg-brand-gold text-brand-navy px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
            >
              {companySaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Ayarları Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'quote' && (
        <form onSubmit={handleQuoteSubmit} className="bg-white p-6 rounded-xl border border-border space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Varsayılan KDV Oranı (%)</label>
              <input type="number" name="default_vat_rate" defaultValue={data.settings?.default_vat_rate} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Teklif Geçerlilik Süresi (Gün)</label>
              <input type="number" name="default_quote_validity_days" defaultValue={data.settings?.default_quote_validity_days} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">Teslimat Şartları</label>
              <textarea name="delivery_terms" defaultValue={data.settings?.delivery_terms} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm"></textarea>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">Ödeme Şartları</label>
              <textarea name="payment_terms" defaultValue={data.settings?.payment_terms} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm"></textarea>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">Genel Notlar</label>
              <textarea name="general_notes" defaultValue={data.settings?.general_notes} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm"></textarea>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={quoteSaving}
              className="bg-brand-gold text-brand-navy px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
            >
              {quoteSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Teklif Ayarlarını Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
