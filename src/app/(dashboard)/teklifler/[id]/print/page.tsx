import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/formatters";

export default async function PrintQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: quoteData } = await supabase
    .from("quotes")
    .select("*, customer:customers(*), creator:profiles(full_name), items:quote_items(*)")
    .eq("id", id)
    .single();

  if (!quoteData) return <div>Teklif bulunamadı</div>;
  const quote = quoteData as any;
  const items = quote.items || [];
  
  const { data: settingsResult } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", quote.company_id)
    .single();
    
  const settingsData = settingsResult as any;
    
  const { data: bankResult } = await supabase
    .from("company_bank_accounts")
    .select("*")
    .eq("company_id", quote.company_id);
    
  const bankData = bankResult as any;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}} />
      
      <div className="max-w-[21cm] mx-auto p-8 text-[12px] leading-relaxed">
        <div className="no-print mb-8 flex gap-4 justify-end">
          <button onClick={() => window.print()} className="bg-brand-navy text-white px-4 py-2 rounded font-bold shadow hover:opacity-90">Yazdır / PDF İndir</button>
          <a href={`/teklifler/${quote.id}`} className="bg-gray-200 text-black px-4 py-2 rounded font-bold shadow hover:bg-gray-300">Geri Dön</a>
        </div>

        <div className="flex justify-between items-start border-b-2 border-brand-navy pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-black text-brand-navy tracking-tight">ÇAMOLUK YAPI</h1>
            <p className="text-gray-500 mt-1">İnşaat ve Yapı Malzemeleri</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">FİYAT TEKLİFİ</h2>
            <div className="grid grid-cols-2 gap-x-4 text-right">
              <span className="font-semibold">Teklif No:</span>
              <span>TKF-{quote.quote_code}</span>
              <span className="font-semibold">Tarih:</span>
              <span>{new Date(quote.created_at).toLocaleDateString("tr-TR")}</span>
              <span className="font-semibold">Geçerlilik:</span>
              <span>{new Date(quote.valid_until).toLocaleDateString("tr-TR")}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-brand-navy border-b border-gray-300 mb-2 pb-1">MÜŞTERİ BİLGİLERİ</h3>
            <p className="font-bold text-[14px]">{quote.customer_snapshot?.company_name || quote.customer?.company_name}</p>
            <p>{quote.customer_snapshot?.address || quote.customer?.address}</p>
            <p>Tel: {quote.customer_snapshot?.phone || quote.customer?.phone}</p>
            <p>VD/VN: {quote.customer_snapshot?.tax_office || quote.customer?.tax_office} / {quote.customer_snapshot?.tax_number || quote.customer?.tax_number}</p>
          </div>
          <div>
            <h3 className="font-bold text-brand-navy border-b border-gray-300 mb-2 pb-1">SATIŞ TEMSİLCİSİ</h3>
            <p className="font-bold">{quote.creator?.full_name}</p>
            <p>İletişim: {settingsData?.company_phone}</p>
            <p>E-posta: {settingsData?.company_email}</p>
          </div>
        </div>

        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-brand-navy text-white">
              <th className="py-2 px-3 text-left w-8">#</th>
              <th className="py-2 px-3 text-left">Ürün / Açıklama</th>
              <th className="py-2 px-3 text-right">Miktar</th>
              <th className="py-2 px-3 text-left">Birim</th>
              <th className="py-2 px-3 text-right">B.Fiyat</th>
              <th className="py-2 px-3 text-right">İsk</th>
              <th className="py-2 px-3 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={item.id || i} className="border-b border-gray-200">
                <td className="py-2 px-3">{i + 1}</td>
                <td className="py-2 px-3 font-semibold">{item.product_name_snapshot}
                  {item.product_code_snapshot && <span className="block font-normal text-gray-500 text-[10px]">{item.product_code_snapshot}</span>}
                </td>
                <td className="py-2 px-3 text-right">{item.quantity}</td>
                <td className="py-2 px-3">{item.unit_snapshot}</td>
                <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-2 px-3 text-right">
                  {item.discount_value ? (item.discount_type === 'percent' ? `%${item.discount_value}` : formatCurrency(item.discount_value)) : '-'}
                </td>
                <td className="py-2 px-3 text-right font-bold">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex gap-8 mb-12">
          <div className="flex-1 text-[10px] text-gray-600">
            {settingsData?.default_price_note && (
              <div className="mb-4">
                <h4 className="font-bold text-black mb-1">Fiyat Notu:</h4>
                <p>{settingsData.default_price_note}</p>
              </div>
            )}
            {bankData && bankData.length > 0 && (
              <div>
                <h4 className="font-bold text-black mb-1">Banka Hesaplarımız:</h4>
                {bankData.map((bank: any) => (
                  <p key={bank.id}>{bank.bank_name} - {bank.account_name}: <br/><span className="font-mono">{bank.iban}</span></p>
                ))}
              </div>
            )}
          </div>
          
          <div className="w-[300px]">
            <table className="w-full">
              <tbody>
                <tr><td className="py-1">Ara Toplam:</td><td className="py-1 text-right">{formatCurrency(quote.subtotal)}</td></tr>
                <tr><td className="py-1 text-red-600">Satır İskontoları:</td><td className="py-1 text-right text-red-600">-{formatCurrency(quote.total_line_discount)}</td></tr>
                {quote.general_discount_amount > 0 && (
                  <tr><td className="py-1 text-red-600">Genel İskonto:</td><td className="py-1 text-right text-red-600">-{formatCurrency(quote.general_discount_amount)}</td></tr>
                )}
                <tr><td className="py-1 font-bold">Net Tutar:</td><td className="py-1 text-right font-bold">{formatCurrency(quote.net_total)}</td></tr>
                <tr><td className="py-1">KDV (%{quote.vat_rate}):</td><td className="py-1 text-right">{formatCurrency(quote.vat_amount)}</td></tr>
                <tr className="bg-gray-100 font-bold text-[14px]">
                  <td className="py-2 px-2 rounded-l">Genel Toplam:</td>
                  <td className="py-2 px-2 text-right rounded-r">{formatCurrency(quote.total_amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {(quote.notes || quote.delivery_terms || quote.payment_terms) && (
          <div className="mb-12 text-[11px]">
            <h4 className="font-bold border-b border-gray-300 mb-2 pb-1">KOŞULLAR VE NOTLAR</h4>
            {quote.delivery_terms && <p><span className="font-semibold">Teslimat:</span> {quote.delivery_terms}</p>}
            {quote.payment_terms && <p><span className="font-semibold">Ödeme:</span> {quote.payment_terms}</p>}
            {quote.notes && <p><span className="font-semibold">Notlar:</span> {quote.notes}</p>}
          </div>
        )}

        <div className="flex justify-between mt-16 pt-8 border-t-2 border-brand-navy px-8">
          <div className="text-center">
            <p className="font-bold">Müşteri Onayı</p>
            <p className="text-gray-500 text-[10px] mt-1">Ad Soyad / Kaşe / İmza</p>
          </div>
          <div className="text-center">
            <p className="font-bold">Firma Yetkilisi</p>
            <p className="mt-1">{quote.creator?.full_name}</p>
          </div>
        </div>

        <div className="fixed bottom-4 left-0 w-full text-center text-[9px] text-gray-400 no-print-hide">
          {settingsData?.company_address} • Tel: {settingsData?.company_phone} • {settingsData?.company_website}
        </div>
      </div>
    </>
  );
}
