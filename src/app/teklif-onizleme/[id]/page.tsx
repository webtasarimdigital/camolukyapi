import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Printer,
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
  Clock,
} from "lucide-react";
import Image from "next/image";
import { PublicPrintButton } from "./PublicPrintButton";

export default async function PublicQuotePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quoteData } = await supabase
    .from("quotes")
    .select("*, customer:customers(*), items:quote_items(*)")
    .eq("id", id)
    .single();

  if (!quoteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Teklif Bulunamadı</h2>
          <p className="text-gray-500 text-sm">Görüntülemek istediğiniz teklif kaydına ulaşılamadı veya geçerliliği sona ermiş olabilir.</p>
        </div>
      </div>
    );
  }

  const quote = quoteData as any;
  const items = quote.items || [];

  let creator: { full_name: string | null; phone: string | null } | null = null;
  if (quote.created_by) {
    const { data: creatorProfile } = (await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", quote.created_by)
      .single()) as { data: { full_name?: string | null; phone?: string | null } | null };
    if (creatorProfile) creator = creatorProfile as any;
  }

  const primaryBank = {
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

  const salesRepName = creator?.full_name || quote.creator_name || "Ahmet Duvarbaşı";
  const salesRepPhone = creator?.phone || "0555 997 29 14";

  // Her teklifin kendine ait tekil QR Kodu:
  const currentOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://camolukyapi.com";
  const quoteDirectUrl = `${currentOrigin}/teklif-onizleme/${quote.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(quoteDirectUrl)}`;

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
    <div className="min-h-screen bg-neutral-100 py-6 px-2 sm:px-4 print:p-0 print:bg-white text-neutral-900 font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 6mm 8mm; }
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
        }
      `}} />

      {/* Floating Action Button */}
      <PublicPrintButton quoteCode={quote.quote_code || quote.id.substring(0, 6)} />

      {/* A4 PROPOSAL DOCUMENT */}
      <div className="print-clean max-w-[210mm] mx-auto bg-white p-7 text-[10.5px] leading-tight text-neutral-800 shadow-md border border-neutral-200 rounded-lg space-y-3.5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[23px] font-black tracking-wider text-neutral-900 leading-none">
                ÇAMOLUK
              </span>
              <span className="bg-neutral-900 text-white text-[10px] font-bold tracking-[0.25em] text-center px-1.5 py-0.5 mt-0.5 rounded-xs">
                YAPI
              </span>
            </div>
            <div className="h-9 w-[1.5px] bg-neutral-300"></div>
            <div className="flex flex-col">
              <span className="text-[17px] font-black tracking-tight text-neutral-800 leading-none">
                NG | KÜTAHYA
              </span>
              <span className="text-[8px] font-bold tracking-widest text-neutral-500 uppercase mt-0.5">
                SERAMİK
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-neutral-900 text-white px-5 py-2 rounded-xl">
            <span className="text-[15px] font-black tracking-wider">TEKLİF</span>
          </div>
        </div>

        {/* Müşteri ve Teklif Bilgileri */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="border border-neutral-300 rounded-md overflow-hidden flex flex-col">
            <div className="bg-neutral-100 px-3 py-1.5 border-b border-neutral-300 flex items-center gap-1.5 font-bold text-neutral-800 text-[11px]">
              <User size={13} />
              <span>MÜŞTERİ BİLGİLERİ</span>
            </div>
            <div className="p-2.5 space-y-1 text-[10.5px] flex-1">
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">MÜŞTERİ ÜNVANI</span>
                <span className="col-span-2 font-bold text-neutral-900">: {customerName}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">ADRES BİLGİLERİ</span>
                <span className="col-span-2 text-neutral-700">: {customerAddress}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">İLETİŞİM BİLGİLERİ</span>
                <span className="col-span-2 text-neutral-700">: {customerPhone}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">VERGİ KİMLİK NO</span>
                <span className="col-span-2 text-neutral-700">: {customerTaxInfo}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">E-POSTA</span>
                <span className="col-span-2 text-neutral-700">: {customerEmail}</span>
              </div>
            </div>
          </div>

          <div className="border border-neutral-300 rounded-md overflow-hidden flex flex-col">
            <div className="p-2.5 space-y-1.5 text-[10.5px] flex-1">
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium flex items-center gap-1">
                  <Calendar size={12} /> TEKLİF NO
                </span>
                <span className="col-span-3 font-mono font-bold text-neutral-900">: TKF-{quote.quote_code}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium flex items-center gap-1">
                  <Calendar size={12} /> TEKLİF TARİHİ
                </span>
                <span className="col-span-3 font-semibold text-neutral-800">: {formatDate(quote.created_at || quote.quote_date)}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium flex items-center gap-1">
                  <Clock size={12} /> GEÇERLİLİK SÜRESİ
                </span>
                <span className="col-span-3 font-bold text-neutral-900">: 2 İŞ GÜNÜ ({formatDate(quote.valid_until)})</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium flex items-center gap-1">
                  <User size={12} /> SATIŞ TEMSİLCİSİ
                </span>
                <span className="col-span-3 font-bold text-neutral-900">: {salesRepName}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium flex items-center gap-1">
                  <Phone size={12} /> İLETİŞİM
                </span>
                <span className="col-span-3 font-semibold text-neutral-800">: {salesRepPhone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ürünler Tablosu */}
        <div className="border border-neutral-300 rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-neutral-800 text-white font-bold text-[9.5px]">
                <th className="py-1.5 px-2 border-r border-neutral-700 text-center w-8">SIRA NO</th>
                <th className="py-1.5 px-2.5 border-r border-neutral-700">ÜRÜN AÇIKLAMASI</th>
                <th className="py-1.5 px-2 border-r border-neutral-700 text-center w-16">MİKTAR</th>
                <th className="py-1.5 px-2 border-r border-neutral-700 text-center w-12">BİRİM</th>
                <th className="py-1.5 px-2 border-r border-neutral-700 text-right w-20">BİRİM FİYAT</th>
                <th className="py-1.5 px-2 border-r border-neutral-700 text-center w-16">İSKONTO (%)</th>
                <th className="py-1.5 px-2 border-r border-neutral-700 text-right w-20">İSKONTO TUTARI</th>
                <th className="py-1.5 px-2.5 text-right w-24">TUTAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((item: any, idx: number) => (
                <tr key={item.id || idx} className="hover:bg-neutral-50/50">
                  <td className="py-1.5 px-2 border-r border-neutral-200 text-center font-mono text-neutral-600 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-neutral-200">
                    <span className="font-bold text-neutral-900 block leading-tight">
                      {item.product_name_snapshot}
                    </span>
                    {item.product_code_snapshot && (
                      <span className="text-[8.5px] text-neutral-500 font-mono">
                        {item.product_code_snapshot}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 border-r border-neutral-200 text-center font-bold text-neutral-800 tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="py-1.5 px-2 border-r border-neutral-200 text-center uppercase text-neutral-600 font-semibold">
                    {item.unit_snapshot || "M2"}
                  </td>
                  <td className="py-1.5 px-2 border-r border-neutral-200 text-right tabular-nums text-neutral-700">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-1.5 px-2 border-r border-neutral-200 text-center tabular-nums text-neutral-700">
                    {Number(item.discount_value) > 0 ? `%${Number(item.discount_value).toFixed(2)}` : "%0,00"}
                  </td>
                  <td className="py-1.5 px-2 border-r border-neutral-200 text-right tabular-nums text-neutral-600">
                    {formatCurrency(item.discount_amount || 0)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-bold text-neutral-900 tabular-nums">
                    {formatCurrency(item.line_total || item.line_subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-[9.5px] italic text-neutral-500 pl-1">
          * Fiyatlara KDV dahil değildir.
        </div>

        {/* Banka & QR ve Toplamlar */}
        <div className="grid grid-cols-12 gap-3.5 items-start">
          <div className="col-span-7 border border-neutral-300 rounded-md p-3 flex items-center justify-between gap-3">
            <div className="space-y-1 text-[10px]">
              <span className="font-bold text-neutral-900 uppercase text-[10.5px] block border-b border-neutral-200 pb-1 mb-1">
                BANKA BİLGİLERİ
              </span>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">HESAP ADI</span>
                <span className="col-span-2 font-bold text-neutral-800">: {primaryBank.account_name}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">BANKA</span>
                <span className="col-span-2 font-semibold">: {primaryBank.bank_name}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">HESAP NO</span>
                <span className="col-span-2 font-mono">: {primaryBank.account_no}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-bold">IBAN</span>
                <span className="col-span-2 font-mono font-bold text-neutral-900">: {primaryBank.iban}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">ŞUBE KODU</span>
                <span className="col-span-2">: {primaryBank.branch}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border border-neutral-300 p-1.5 rounded-md bg-white flex-shrink-0">
              <img src={qrCodeUrl} alt="Teklif QR Kodu" className="w-18 h-18" />
              <span className="text-[7.5px] font-bold text-center text-neutral-600 mt-1 uppercase leading-tight">
                TEKLİFİ GÖRMEK İÇİN<br/>QR KODU OKUTUNUZ
              </span>
            </div>
          </div>

          <div className="col-span-5 border border-neutral-300 rounded-md overflow-hidden text-[10.5px]">
            <div className="p-2 space-y-1.5">
              <div className="flex justify-between items-center text-neutral-600">
                <span>ARA TOPLAM</span>
                <span className="font-semibold text-neutral-900 tabular-nums">{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>GENEL İSKONTO</span>
                <span className="font-semibold text-rose-700 tabular-nums">-{formatCurrency(quote.general_discount_amount || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-800 font-medium">
                <span>NET TUTAR</span>
                <span className="font-bold tabular-nums">{formatCurrency(quote.net_total || quote.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>KDV (%{quote.vat_rate || 20})</span>
                <span className="font-semibold text-neutral-900 tabular-nums">{formatCurrency(quote.vat_total)}</span>
              </div>
            </div>
            <div className="bg-neutral-900 text-white p-2.5 flex justify-between items-center font-black text-[13px]">
              <span>GENEL TOPLAM</span>
              <span className="tabular-nums">{formatCurrency(quote.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* Önemli Notlar & Teslimat Koşulları */}
        <div className="grid grid-cols-2 gap-3.5 text-[9.5px]">
          <div className="border border-neutral-300 rounded-md p-2.5 space-y-1.5">
            <span className="font-bold text-neutral-900 uppercase text-[10px] block border-b border-neutral-200 pb-1">
              ÖNEMLİ NOTLAR
            </span>
            <ul className="space-y-1 text-neutral-700 list-disc list-inside">
              <li>Teklifimiz 2 iş günü geçerlidir.</li>
              <li>Termin süresi stok ve sipariş miktarlarına göre değişiklik göstermektedir.</li>
              <li>Nakliye alıcıya aittir. Nakliye dahil değildir.</li>
              <li>Teklif onaylandığında kısmi ön ödeme ile kalan ödeme şartları görüşülecektir.</li>
              <li>Ürünlerinizi sayarak eksiksiz ve sağlam alınız. Kırık veya eksik ürünlerden firmamız sorumlu değildir.</li>
              <li>Ürün iade süresi 10 gün olup, kutuları sağlam şekilde depo teslimi alınacaktır.</li>
            </ul>
          </div>

          <div className="border border-neutral-300 rounded-md p-2.5 space-y-1.5">
            <span className="font-bold text-neutral-900 uppercase text-[10px] block border-b border-neutral-200 pb-1">
              TESLİM & ÖDEME KOŞULLARI
            </span>
            <div className="space-y-1.5 text-neutral-700">
              <div className="grid grid-cols-4">
                <span className="font-bold">TESLİMAT</span>
                <span className="col-span-3">: Stok durumuna göre en kısa sürede teslim edilecektir.</span>
              </div>
              <div className="grid grid-cols-4">
                <span className="font-bold">ÖDEME ŞEKLİ</span>
                <span className="col-span-3">: Kısmi ön ödeme, kalan ödeme şartları görüşülecektir.</span>
              </div>
              <div className="grid grid-cols-4">
                <span className="font-bold">GARANTİ</span>
                <span className="col-span-3">: Ürünler, üretici firma garantisi kapsamındadır.</span>
              </div>
              <div className="grid grid-cols-4">
                <span className="font-bold">İADE KOŞULLARI</span>
                <span className="col-span-3">: İade süresi 10 gündür. Ürünler sağlam kutuda depo teslimi alınır.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Çözüm Ortaklarımız */}
        <div className="border border-neutral-300 rounded-md p-2 text-center">
          <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block mb-1.5">
            — ÇÖZÜM ORTAKLARIMIZ —
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-neutral-700 text-[9.5px]">
            {partners.map((p, idx) => (
              <span key={idx} className={`${p.bold ? "font-black text-neutral-900" : "font-medium text-neutral-600"}`}>
                {p.name} {p.sub && <span className="text-[8px] font-normal text-neutral-500 uppercase">{p.sub}</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Temsilci & Teklif Onayı */}
        <div className="grid grid-cols-2 gap-3.5 pt-1">
          <div className="border border-neutral-300 rounded-md p-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9.5px] font-bold text-neutral-500 uppercase">SATIŞ TEMSİLCİSİ</span>
              <p className="font-bold text-[11.5px] text-neutral-900">{salesRepName}</p>
              <p className="text-[9.5px] text-neutral-600 font-medium">Satış Müdürü</p>
              <p className="text-[9px] text-neutral-500">📞 {salesRepPhone}</p>
            </div>
            <div className="text-center pr-3">
              <div className="h-10 w-24 border-b border-neutral-400 italic text-neutral-400 flex items-center justify-center text-[10px]">
                İmza
              </div>
              <span className="text-[8px] font-bold uppercase text-neutral-500 mt-0.5 block">İMZA</span>
            </div>
          </div>

          <div className="border border-neutral-300 rounded-md p-2.5 flex items-center justify-between">
            <div className="space-y-1 text-[9.5px] flex-1">
              <span className="font-bold text-neutral-500 uppercase block">TEKLİF ONAYI</span>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">Firma Yetkilisi</span>
                <span className="col-span-2">: .......................................</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">Kaşe / İmza</span>
                <span className="col-span-2">: .......................................</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">Tarih</span>
                <span className="col-span-2">: ...... / ...... / 20.....</span>
              </div>
            </div>
            <div className="w-20 h-14 border border-dashed border-neutral-400 rounded flex items-center justify-center text-neutral-400 text-[9px] font-bold uppercase">
              KAŞE
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-900 text-white px-3.5 py-1.5 rounded-md flex items-center justify-between text-[9px] font-medium">
          <div className="flex items-center gap-4">
            <span>📍 Çamlıca Mah. Libadiye Cad. No:35 Üsküdar / İstanbul</span>
            <span>📞 0216 000 00 00</span>
            <span>🌐 www.camolukyapi.com</span>
          </div>
          <span className="italic font-normal opacity-80">Güvenilir Çözümler, Kalıcı Yapılar</span>
        </div>

      </div>
    </div>
  );
}
