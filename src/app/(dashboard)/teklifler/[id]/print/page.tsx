import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PrintActions } from "./PrintActions";
import { 
  Printer, 
  ArrowLeft, 
  Building2, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Truck, 
  CreditCard, 
  RotateCcw,
  Landmark,
  FileCheck
} from "lucide-react";

export default async function PrintQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quoteData } = await supabase
    .from("quotes")
    .select("*, customer:customers(*), creator:profiles(full_name, phone), items:quote_items(*)")
    .eq("id", id)
    .single();

  if (!quoteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Teklif Bulunamadı</h2>
          <p className="text-gray-500 mb-6 text-sm">Görüntülemek istediğiniz teklif kaydına ulaşılamadı.</p>
          <Link href="/teklifler" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-navy text-white text-sm font-semibold rounded-xl hover:opacity-90">
            <ArrowLeft size={16} /> Teklif Listesine Dön
          </Link>
        </div>
      </div>
    );
  }

  const quote = quoteData as any;
  const items = quote.items || [];

  const { data: companyResult } = await supabase
    .from("companies")
    .select("*")
    .eq("id", quote.company_id)
    .single();
  const company = companyResult as any;

  const { data: settingsResult } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", quote.company_id)
    .single();
  const settings = settingsResult as any;

  const { data: bankAccounts } = await supabase
    .from("company_bank_accounts")
    .select("*")
    .eq("company_id", quote.company_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const primaryBank = bankAccounts && bankAccounts.length > 0 ? bankAccounts[0] : {
    bank_name: "HALKBANK",
    account_name: "ÇAMOLUK MOB. NAL. TİC. LTD. ŞTİ.",
    account_no: "10101022",
    iban: "TR93 0001 2001 3680 0010 1010 22",
    branch: "1368 - LİBADİYE ŞUBESİ"
  };

  const customerName = quote.customer_snapshot?.company_name || quote.customer?.company_name || quote.customer?.contact_name || "Bireysel Müşteri";
  const customerAddress = quote.customer_snapshot?.address || quote.customer?.address || "-";
  const customerPhone = quote.customer_snapshot?.phone || quote.customer?.phone || "-";
  const customerTaxInfo = (quote.customer_snapshot?.tax_office || quote.customer?.tax_office) 
    ? `${quote.customer_snapshot?.tax_office || quote.customer?.tax_office} / ${quote.customer_snapshot?.tax_number || quote.customer?.tax_number || "-"}`
    : (quote.customer_snapshot?.tax_number || quote.customer?.tax_number || "-");
  const customerEmail = quote.customer_snapshot?.email || quote.customer?.email || "-";

  const salesRepName = quote.creator?.full_name || "Ahmet Duvarbaşı";
  const salesRepPhone = quote.creator?.phone || company?.phone || "0555 997 29 14";

  const qrIbanUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(primaryBank.iban || "")}`;

  const partners = [
    { name: "NG KÜTAHYA", sub: "SERAMİK", bold: true },
    { name: "VitrA", sub: "", bold: true },
    { name: "ARTEMA", sub: "", bold: true },
    { name: "KYK", sub: "YAPI KİMYASALLARI", bold: true },
    { name: "Artemis", sub: "FUGA", bold: false },
    { name: "GROHE", sub: "", bold: true },
    { name: "YTONG", sub: "", bold: true },
    { name: "DURAVIT", sub: "", bold: true },
    { name: "GEBERIT", sub: "", bold: true },
    { name: "SAFI", sub: "ÇİMENTO", bold: true },
    { name: "Filli Boya", sub: "", bold: false },
    { name: "newarc", sub: "choose your own style", bold: false },
    { name: "ISVEA", sub: "1962 ITALIA", bold: true },
    { name: "VIVADUS", sub: "Banyo & Yaşam", bold: true }
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          @page { 
            size: A4 portrait; 
            margin: 6mm 8mm; 
          }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
            background-color: #ffffff !important;
            font-size: 10px !important;
          }
          .print-clean {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}} />

      <div className="min-h-screen bg-neutral-100 py-6 px-4 print:bg-white print:p-0">
        <PrintActions quoteId={quote.id} quoteCode={quote.quote_code || quote.id.substring(0, 6)} />

        <div className="print-clean max-w-[210mm] mx-auto bg-white p-7 text-[10.5px] leading-tight text-neutral-800 shadow-md border border-neutral-200 rounded-lg">
          
          <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
            <div className="flex items-center gap-5">
              <div className="flex flex-col">
                <span className="text-[23px] font-black tracking-wider text-neutral-900 leading-none">
                  ÇAMOLUK
                </span>
                <span className="mt-1 inline-block bg-neutral-900 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded text-center tracking-[0.25em]">
                  YAPI
                </span>
              </div>

              <div className="h-9 w-[1.5px] bg-neutral-300" />

              <div className="flex flex-col">
                <span className="text-[17px] font-light tracking-[0.2em] text-neutral-800 leading-none">
                  <strong className="font-black mr-1">NG</strong>KÜTAHYA
                </span>
                <span className="text-[7.5px] tracking-[0.35em] text-neutral-500 font-semibold mt-1">
                  SERAMİK
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-neutral-900 text-white px-5 py-2 rounded-lg">
              <FileCheck size={18} className="text-brand-gold" />
              <span className="text-base font-black tracking-widest uppercase">TEKLİF</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="border border-neutral-300 rounded-lg overflow-hidden flex flex-col justify-between">
              <div className="bg-neutral-100 px-3 py-1.5 border-b border-neutral-300 flex items-center gap-1.5 font-bold text-neutral-800 text-[10px] tracking-wide">
                <Building2 size={13} className="text-neutral-700" />
                <span>MÜŞTERİ BİLGİLERİ</span>
              </div>
              <div className="p-2.5 space-y-1 text-[9.5px]">
                <div className="flex items-start">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">MÜŞTERİ ÜNVANI:</span>
                  <span className="font-bold text-neutral-900 uppercase">{customerName}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">ADRES BİLGİLERİ:</span>
                  <span className="text-neutral-700">{customerAddress}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">İLETİŞİM BİLGİLERİ:</span>
                  <span className="text-neutral-700">{customerPhone}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">VERGİ KİMLİK NO:</span>
                  <span className="text-neutral-700">{customerTaxInfo}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">E-POSTA:</span>
                  <span className="text-neutral-700">{customerEmail}</span>
                </div>
              </div>
            </div>

            <div className="border border-neutral-300 rounded-lg overflow-hidden flex flex-col justify-between">
              <div className="bg-neutral-100 px-3 py-1.5 border-b border-neutral-300 flex items-center gap-1.5 font-bold text-neutral-800 text-[10px] tracking-wide">
                <Calendar size={13} className="text-neutral-700" />
                <span>TEKLİF DETAYLARI</span>
              </div>
              <div className="p-2.5 space-y-1 text-[9.5px]">
                <div className="flex items-center">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">TEKLİF NO:</span>
                  <span className="font-bold font-mono text-neutral-900">{quote.quote_code || `2026/${quote.id.substring(0, 6)}`}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">TEKLİF TARİHİ:</span>
                  <span className="text-neutral-800 font-medium">{new Date(quote.created_at).toLocaleDateString("tr-TR")}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">GEÇERLİLİK SÜRESİ:</span>
                  <span className="text-neutral-800 font-medium">{quote.valid_days ? `${quote.valid_days} İŞ GÜNÜ` : "3 İŞ GÜNÜ"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">SATIŞ TEMSİLCİSİ:</span>
                  <span className="font-bold text-neutral-900 uppercase">{salesRepName}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-neutral-500 font-semibold flex-shrink-0">İLETİŞİM:</span>
                  <span className="text-neutral-800 font-medium">{salesRepPhone}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-[9.5px] border-collapse">
              <thead>
                <tr className="bg-neutral-900 text-white text-center font-bold text-[8.5px] uppercase tracking-wider">
                  <th className="py-1.5 px-2 border-r border-neutral-700 w-9">SIRA NO</th>
                  <th className="py-1.5 px-2.5 border-r border-neutral-700 text-left">ÜRÜN AÇIKLAMASI</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-right w-14">MİKTAR</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 w-12">BİRİM</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-right w-20">BİRİM FİYAT</th>
                  <th className="py-1.5 px-1.5 border-r border-neutral-700 text-right w-16">İSKONTO (%)</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-right w-20">İSKONTO TUTARI</th>
                  <th className="py-1.5 px-2.5 text-right w-22">TUTAR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-neutral-400">Kalem eklenmemiş</td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => {
                    const discountPercent = item.discount_type === 'percent' 
                      ? item.discount_value 
                      : (item.line_subtotal > 0 && item.discount_amount > 0 ? (item.discount_amount / item.line_subtotal) * 100 : 0);
                    
                    return (
                      <tr key={item.id || idx} className="hover:bg-neutral-50/50">
                        <td className="py-1.5 px-2 text-center text-neutral-500 border-r border-neutral-200 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-neutral-200 font-semibold text-neutral-900">
                          {item.product_name_snapshot}
                          {item.product_code_snapshot && (
                            <span className="block text-[8px] text-neutral-500 font-normal">
                              Kod: {item.product_code_snapshot}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-neutral-200 font-medium tabular-nums">
                          {Number(item.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-2 text-center border-r border-neutral-200 text-neutral-600 uppercase text-[8.5px]">
                          {item.unit_snapshot || "ADET"}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-neutral-200 tabular-nums text-neutral-800">
                          ₺{Number(item.unit_price).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-1.5 text-right border-r border-neutral-200 tabular-nums text-neutral-700">
                          {discountPercent > 0 ? `%${Number(discountPercent).toFixed(2).replace(/\.00$/, "")}` : "%0,00"}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-neutral-200 tabular-nums text-neutral-700">
                          ₺{Number(item.discount_amount || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-neutral-900 tabular-nums">
                          ₺{Number(item.line_total).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[8.5px] italic text-neutral-500 mt-1 pl-1">
            * Fiyatlara KDV dahil değildir.
          </div>

          <div className="grid grid-cols-12 gap-3 mt-2 items-start">
            <div className="col-span-7 flex gap-2 border border-neutral-300 rounded-lg p-2.5 bg-neutral-50/50">
              <div className="flex-1 text-[9px] space-y-1">
                <div className="flex items-center gap-1 font-bold text-neutral-900 pb-1 border-b border-neutral-200">
                  <Landmark size={13} className="text-neutral-700" />
                  <span className="uppercase text-[9.5px]">BANKA BİLGİLERİ</span>
                </div>
                <div className="pt-0.5 space-y-0.5">
                  <p><span className="text-neutral-500 font-semibold">HESAP ADI:</span> <b className="text-neutral-900">{primaryBank.account_name}</b></p>
                  <p><span className="text-neutral-500 font-semibold">BANKA:</span> <b className="text-neutral-900">{primaryBank.bank_name}</b></p>
                  {primaryBank.account_no && (
                    <p><span className="text-neutral-500 font-semibold">HESAP NO:</span> <span className="font-mono text-neutral-800">{primaryBank.account_no}</span></p>
                  )}
                  <p><span className="text-neutral-500 font-semibold">IBAN:</span> <span className="font-mono font-bold text-neutral-900 tracking-wider text-[9.5px]">{primaryBank.iban}</span></p>
                  {primaryBank.branch && (
                    <p><span className="text-neutral-500 font-semibold">ŞUBE KODU:</span> <span className="text-neutral-800">{primaryBank.branch}</span></p>
                  )}
                </div>
              </div>

              <div className="w-24 flex flex-col items-center justify-center p-1 bg-white border border-neutral-300 rounded-md text-center flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrIbanUrl} 
                  alt="IBAN QR" 
                  className="w-18 h-18 object-contain"
                  loading="eager"
                />
                <span className="text-[6.5px] font-bold text-neutral-700 leading-tight mt-1 uppercase tracking-tight">
                  IBAN İÇİN QR KODU OKUTUNUZ
                </span>
              </div>
            </div>

            <div className="col-span-5 text-[9.5px] space-y-1">
              <div className="border border-neutral-300 rounded-lg p-2 space-y-1 bg-white">
                <div className="flex justify-between items-center text-neutral-600">
                  <span className="font-semibold uppercase text-[9px]">ARA TOPLAM:</span>
                  <span className="font-bold text-neutral-800 tabular-nums">
                    ₺{Number(quote.subtotal || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {quote.general_discount_amount > 0 && (
                  <div className="flex justify-between items-center text-red-600 font-medium">
                    <span className="uppercase text-[9px]">GENEL İSKONTO:</span>
                    <span className="tabular-nums">
                      -₺{Number(quote.general_discount_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-neutral-700">
                  <span className="font-semibold uppercase text-[9px]">NET TUTAR:</span>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    ₺{Number(quote.net_total || quote.subtotal).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-600">
                  <span className="font-semibold uppercase text-[9px]">KDV (%{quote.vat_rate || 20}):</span>
                  <span className="font-bold text-neutral-800 tabular-nums">
                    ₺{Number(quote.vat_amount || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-neutral-900 text-white rounded-lg px-3 py-2 flex justify-between items-center shadow-xs">
                <span className="font-black tracking-wider text-[11px] uppercase">GENEL TOPLAM</span>
                <span className="text-base font-black tabular-nums tracking-wide">
                  ₺{Number(quote.total_amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="border border-neutral-300 rounded-lg p-2.5 text-[8.5px] leading-relaxed bg-neutral-50/30">
              <div className="flex items-center gap-1 font-bold text-neutral-900 pb-1 border-b border-neutral-200 mb-1.5 text-[9.5px]">
                <FileCheck size={12} className="text-neutral-700" />
                <span className="uppercase">ÖNEMLİ NOTLAR</span>
              </div>
              <ul className="space-y-1 text-neutral-700">
                <li className="flex items-start gap-1">
                  <CheckCircle2 size={10} className="text-neutral-800 flex-shrink-0 mt-0.5" />
                  <span>Teklifimiz {quote.valid_days || 2} iş günü geçerlidir.</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 size={10} className="text-neutral-800 flex-shrink-0 mt-0.5" />
                  <span>Teslimat süresi sipariş miktarlarına göre değişiklik göstermektedir.</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 size={10} className="text-neutral-800 flex-shrink-0 mt-0.5" />
                  <span>Nakliye alıcıya aittir (veya anlaşmaya göre belirlenecektir).</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 size={10} className="text-neutral-800 flex-shrink-0 mt-0.5" />
                  <span>Teklif onayı kaşe ve imzalı olarak tarafımıza iletilmelidir.</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 size={10} className="text-neutral-800 flex-shrink-0 mt-0.5" />
                  <span>Ürünlerinizi teslim alırken kontrol ediniz, hasarlı teslimatlarda tutanak tutulmalıdır.</span>
                </li>
                <li className="flex items-start gap-1">
                  <CheckCircle2 size={10} className="text-neutral-800 flex-shrink-0 mt-0.5" />
                  <span>Ürün iade süresi 10 gün olup, kutuları sağlam şekilde depo teslimi alınacaktır.</span>
                </li>
              </ul>
            </div>

            <div className="border border-neutral-300 rounded-lg p-2.5 text-[8.5px] leading-relaxed bg-neutral-50/30">
              <div className="flex items-center gap-1 font-bold text-neutral-900 pb-1 border-b border-neutral-200 mb-1.5 text-[9.5px]">
                <Truck size={12} className="text-neutral-700" />
                <span className="uppercase">TESLİM & ÖDEME KOŞULLARI</span>
              </div>
              <div className="space-y-1.5 text-neutral-700">
                <div className="flex items-start">
                  <span className="w-24 text-neutral-500 font-semibold flex-shrink-0 flex items-center gap-1">
                    <Truck size={9} /> TESLİMAT:
                  </span>
                  <span className="text-neutral-800">{quote.delivery_terms || settings?.delivery_terms || "Stok durumuna göre en kısa sürede teslim edilecektir."}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-24 text-neutral-500 font-semibold flex-shrink-0 flex items-center gap-1">
                    <CreditCard size={9} /> ÖDEME ŞEKLİ:
                  </span>
                  <span className="text-neutral-800">{quote.payment_terms || settings?.payment_terms || "Sipariş anında havale / nakit ödeme"}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-24 text-neutral-500 font-semibold flex-shrink-0 flex items-center gap-1">
                    <RotateCcw size={9} /> İADE KOŞULLARI:
                  </span>
                  <span className="text-neutral-800">{settings?.return_terms || "İade süresi 10 gündür. Ürünler kutuları sağlam şekilde depo teslimi alınacaktır."}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-neutral-300">
            <div className="text-center mb-1.5">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.25em] text-neutral-500 bg-white px-3 relative -top-3">
                ÇÖZÜM ORTAKLARIMIZ
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-neutral-600 px-1">
              {partners.map((p, i) => (
                <div key={i} className="flex flex-col items-center justify-center text-center">
                  <span className={`text-[9.5px] leading-tight text-neutral-800 ${p.bold ? "font-black tracking-tight" : "font-medium"}`}>
                    {p.name}
                  </span>
                  {p.sub && (
                    <span className="text-[6px] tracking-widest text-neutral-400 uppercase font-semibold">
                      {p.sub}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 pt-2 border-t border-neutral-300 page-break-inside-avoid">
            <div className="border border-neutral-300 rounded-lg p-2.5 flex justify-between items-center bg-white">
              <div className="space-y-0.5 text-[9px]">
                <div className="flex items-center gap-1 font-bold text-neutral-900 mb-1 text-[9.5px]">
                  <User size={12} className="text-neutral-700" />
                  <span>SATIŞ TEMSİLCİSİ</span>
                </div>
                <p className="font-bold text-neutral-900 text-[10px]">{salesRepName}</p>
                <p className="text-neutral-500 text-[8.5px]">Satış Müdürü</p>
                <p className="text-neutral-700 flex items-center gap-1 text-[8.5px]"><Phone size={8} /> {salesRepPhone}</p>
                <p className="text-neutral-700 flex items-center gap-1 text-[8.5px]"><Mail size={8} /> {company?.email || "ahmet.duvarbasi@camolukyapi.com"}</p>
              </div>

              <div className="flex flex-col items-center justify-center pr-2">
                <svg className="w-24 h-10 text-neutral-800" viewBox="0 0 160 60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10 40 Q 35 5, 55 35 T 95 20 Q 120 45, 145 15" />
                  <path d="M40 25 L 130 35" strokeWidth="1.5" />
                </svg>
                <span className="text-[7.5px] font-bold text-neutral-400 tracking-wider">İMZA</span>
              </div>
            </div>

            <div className="border border-neutral-300 rounded-lg p-2.5 flex justify-between items-center bg-white">
              <div className="space-y-1 text-[8.5px]">
                <div className="flex items-center gap-1 font-bold text-neutral-900 mb-1 text-[9.5px]">
                  <FileCheck size={12} className="text-neutral-700" />
                  <span>TEKLİF ONAYI</span>
                </div>
                <div className="space-y-0.5">
                  <p><span className="text-neutral-500 font-medium">Firma Yetkilisi:</span> ___________________</p>
                  <p><span className="text-neutral-500 font-medium">Adı Soyadı:</span> ___________________</p>
                  <p><span className="text-neutral-500 font-medium">Kaşe / İmza:</span> ___________________</p>
                  <p><span className="text-neutral-500 font-medium">Tarih:</span> _____ / _____ / 202___</p>
                </div>
              </div>

              <div className="w-20 h-16 border-2 border-dashed border-neutral-300 rounded-md flex items-center justify-center text-neutral-400 font-bold text-[8.5px] uppercase tracking-wider">
                KAŞE
              </div>
            </div>
          </div>

          <div className="mt-3 bg-neutral-900 text-neutral-300 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between text-[8px]">
            <div className="flex items-center gap-3">
              <span>📍 {company?.address || "Çamlıca Mah. Libadiye Cad. No:35 Üsküdar / İstanbul"}</span>
              <span>📞 {company?.phone || "0555 997 29 14"}</span>
              <span>🌐 {company?.website || "www.camolukyapi.com"}</span>
            </div>
            <div className="font-serif italic text-[8.5px] text-brand-gold">
              {company?.slogan || "Güvenilir Çözümler, Kalıcı Yapılar"}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
