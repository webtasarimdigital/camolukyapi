import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import Link from "next/link";
import { PrintActions } from "./PrintActions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { 
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
  FileCheck,
  Clock,
  ArrowLeft
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
    .select("*, customer:customers(*), items:quote_items(*)")
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

  let creator: { full_name: string | null; phone: string | null } | null = null;
  if (quote.created_by) {
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", quote.created_by)
      .single();
    if (creatorProfile) creator = creatorProfile as any;
  }

  const { data: companyResult } = await supabase
    .from("companies")
    .select("*")
    .eq("id", quote.company_id)
    .single();
  const company = companyResult as any;

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

  const salesRepName = creator?.full_name || quote.creator_name || "Ahmet Duvarbaşı";
  const salesRepPhone = creator?.phone || company?.phone || "0555 997 29 14";

  const headersList = await headers();
  let host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  let proto = headersList.get("x-forwarded-proto") || "https";

  if (!host || host.includes("localhost") || host.includes("127.0.0.1")) {
    host = "camolukyapi.vercel.app";
    proto = "https";
  }
  const currentOrigin = `${proto}://${host}`;
  const quoteDirectUrl = `${currentOrigin}/teklif-onizleme/${quote.id}`;
  const qrIbanUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(quoteDirectUrl)}`;

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
    <div className="min-h-screen bg-neutral-100 py-4 sm:py-6 px-2 sm:px-4 print:bg-white print:p-0 text-neutral-900 font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print, header, aside, nav { display: none !important; }
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

      <PrintActions quoteId={quote.id} quoteCode={quote.quote_code || quote.id.substring(0, 6)} />

      {/* A4 PROPOSAL DOCUMENT - Temiz, bağımsız A4 şablonu */}
      <div className="print-clean w-full max-w-[210mm] mx-auto bg-white p-4 sm:p-6 md:p-7 text-[10.5px] leading-tight text-neutral-800 shadow-md border border-neutral-200 rounded-xl space-y-3">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-neutral-800">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex flex-col">
              <span className="text-[20px] sm:text-[23px] font-black tracking-wider text-neutral-900 leading-none">
                ÇAMOLUK
              </span>
              <span className="mt-1 inline-block bg-neutral-900 text-white text-[8px] sm:text-[9px] font-extrabold px-2 py-0.5 rounded text-center tracking-[0.25em]">
                YAPI
              </span>
            </div>

            <div className="h-8 sm:h-9 w-[1.5px] bg-neutral-300" />

            <div className="flex flex-col">
              <span className="text-[15px] sm:text-[17px] font-light tracking-[0.2em] text-neutral-800 leading-none">
                <strong className="font-black mr-1">NG</strong>KÜTAHYA
              </span>
              <span className="text-[7px] sm:text-[7.5px] tracking-[0.35em] text-neutral-500 font-semibold mt-1">
                SERAMİK
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-neutral-900 text-white px-4 sm:px-5 py-2 rounded-lg">
            <FileCheck size={16} className="text-brand-gold" />
            <span className="text-sm sm:text-base font-black tracking-widest uppercase">TEKLİF</span>
          </div>
        </div>

        {/* Müşteri ve Teklif Bilgileri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Müşteri Bilgileri */}
          <div className="border border-neutral-300 rounded-lg overflow-hidden flex flex-col justify-between">
            <div className="bg-neutral-100 px-3 py-1.5 border-b border-neutral-300 flex items-center gap-1.5 font-bold text-neutral-800 text-[10px] tracking-wide">
              <Building2 size={13} className="text-neutral-700" />
              <span>MÜŞTERİ BİLGİLERİ</span>
            </div>
            <div className="p-2.5 space-y-1 text-[9.5px]">
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">MÜŞTERİ ÜNVANI</span>
                <span className="col-span-2 font-bold text-neutral-900 truncate">: {customerName}</span>
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
                <span className="col-span-2 text-neutral-700 truncate">: {customerEmail}</span>
              </div>
            </div>
          </div>

          {/* Teklif Detayları */}
          <div className="border border-neutral-300 rounded-lg overflow-hidden flex flex-col justify-between">
            <div className="bg-neutral-100 px-3 py-1.5 border-b border-neutral-300 flex items-center gap-1.5 font-bold text-neutral-800 text-[10px] tracking-wide">
              <Calendar size={13} className="text-neutral-700" />
              <span>TEKLİF DETAYLARI</span>
            </div>
            <div className="p-2.5 space-y-1 text-[9.5px]">
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">TEKLİF NO</span>
                <span className="col-span-3 font-mono font-bold text-neutral-900">: TKF-{quote.quote_code}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">TEKLİF TARİHİ</span>
                <span className="col-span-3 font-semibold text-neutral-800">: {formatDate(quote.created_at || quote.quote_date)}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">GEÇERLİLİK</span>
                <span className="col-span-3 font-bold text-neutral-900">: 2 İŞ GÜNÜ ({formatDate(quote.valid_until)})</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">SATIŞ TEMSİLCİSİ</span>
                <span className="col-span-3 font-bold text-neutral-900">: {salesRepName}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">İLETİŞİM</span>
                <span className="col-span-3 font-semibold text-neutral-800">: {salesRepPhone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ÜRÜNLER ALANI */}
        {/* 1) Masaüstü ve Print Tablosu */}
        <div className="border border-neutral-300 rounded-lg overflow-hidden hidden sm:block print:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[9.5px]">
              <thead>
                <tr className="bg-neutral-800 text-white font-bold text-[9px] tracking-wider uppercase">
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-center w-8">#</th>
                  <th className="py-1.5 px-2.5 border-r border-neutral-700">ÜRÜN AÇIKLAMASI</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-center w-14">MİKTAR</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-center w-12">BİRİM</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-right w-18">BİRİM FİYAT</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-center w-14">İSKONTO</th>
                  <th className="py-1.5 px-2 border-r border-neutral-700 text-right w-18">İSK. TUTARI</th>
                  <th className="py-1.5 px-2.5 text-right w-22">TUTAR</th>
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
        </div>

        {/* 2) Telefona Özel Responsive Kart Listesi */}
        <div className="block sm:hidden print:hidden space-y-2">
          {items.map((item: any, idx: number) => (
            <div key={item.id || idx} className="p-3 border border-neutral-200 rounded-lg bg-neutral-50/50 text-[11px] space-y-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-neutral-900 leading-snug">
                  {idx + 1}. {item.product_name_snapshot}
                </span>
                <span className="font-bold text-neutral-900 tabular-nums text-xs whitespace-nowrap">
                  {formatCurrency(item.line_total || item.line_subtotal)}
                </span>
              </div>
              {item.product_code_snapshot && (
                <span className="text-[10px] text-neutral-500 font-mono block">
                  Kod: {item.product_code_snapshot}
                </span>
              )}
              <div className="flex items-center justify-between text-neutral-600 text-[10.5px] pt-1 border-t border-neutral-200">
                <span>{item.quantity} {item.unit_snapshot || "M2"} × {formatCurrency(item.unit_price)}</span>
                {Number(item.discount_value) > 0 && (
                  <span className="text-rose-700 font-medium">İsk: %{Number(item.discount_value).toFixed(0)}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[9px] italic text-neutral-500 pl-1">
          * Fiyatlara KDV dahil değildir.
        </div>

        {/* Banka & QR ve Toplamlar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* Banka & QR */}
          <div className="col-span-1 md:col-span-7 border border-neutral-300 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1 text-[9.5px] w-full">
              <span className="font-bold text-neutral-900 uppercase text-[10px] block border-b border-neutral-200 pb-1 mb-1">
                BANKA BİLGİLERİ
              </span>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">HESAP ADI</span>
                <span className="col-span-2 font-bold text-neutral-800 truncate">: {primaryBank.account_name}</span>
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
                <span className="col-span-2 font-mono font-bold text-neutral-900 break-all">: {primaryBank.iban}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500">ŞUBE KODU</span>
                <span className="col-span-2">: {primaryBank.branch}</span>
              </div>
            </div>

            <a 
              href={quoteDirectUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex flex-col items-center justify-center border border-neutral-300 p-1.5 rounded-lg bg-white flex-shrink-0 hover:border-brand-navy hover:shadow-xs transition cursor-pointer"
              title="Teklifi Görüntüle"
            >
              <img src={qrIbanUrl} alt="Teklif QR Kodu" className="w-16 h-16 sm:w-18 sm:h-18" />
              <span className="text-[7.5px] font-bold text-center text-neutral-600 mt-1 uppercase leading-tight">
                TEKLİFİ GÖRMEK İÇİN<br/>TIKLAYIN / OKUTUN
              </span>
            </a>
          </div>

          {/* Toplamlar */}
          <div className="col-span-1 md:col-span-5 border border-neutral-300 rounded-lg overflow-hidden text-[10px]">
            <div className="p-2.5 space-y-1.5">
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
                <span className="font-semibold text-neutral-900 tabular-nums">{formatCurrency(quote.vat_total ?? quote.vat_amount ?? 0)}</span>
              </div>
            </div>
            <div className="bg-neutral-900 text-white p-2.5 flex justify-between items-center font-black text-xs sm:text-[13px]">
              <span>GENEL TOPLAM</span>
              <span className="tabular-nums">{formatCurrency(quote.grand_total ?? quote.total_amount ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Önemli Notlar & Teslimat Koşulları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[9px]">
          <div className="border border-neutral-300 rounded-lg p-2.5 space-y-1">
            <span className="font-bold text-neutral-900 uppercase text-[9.5px] block border-b border-neutral-200 pb-1">
              ÖNEMLİ NOTLAR
            </span>
            <ul className="space-y-0.5 text-neutral-700 list-disc list-inside">
              <li>Teklifimiz 2 iş günü geçerlidir.</li>
              <li>Termin süresi stok ve sipariş miktarlarına göre değişiklik göstermektedir.</li>
              <li>Nakliye alıcıya aittir. Nakliye dahil değildir.</li>
              <li>Teklif onaylandığında kısmi ön ödeme ile kalan ödeme şartları görüşülecektir.</li>
              <li>Ürünlerinizi sayarak eksiksiz ve sağlam alınız. Kırık veya eksik ürünlerden firmamız sorumlu değildir.</li>
              <li>Ürün iade süresi 10 gün olup, kutuları sağlam şekilde depo teslimi alınacaktır.</li>
            </ul>
          </div>

          <div className="border border-neutral-300 rounded-lg p-2.5 space-y-1">
            <span className="font-bold text-neutral-900 uppercase text-[9.5px] block border-b border-neutral-200 pb-1">
              TESLİM & ÖDEME KOŞULLARI
            </span>
            <div className="space-y-1 text-neutral-700">
              <div className="grid grid-cols-4">
                <span className="font-bold">TESLİMAT</span>
                <span className="col-span-3">: Stok durumuna göre en kısa sürede teslim edilir.</span>
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
                <span className="col-span-3">: İade süresi 10 gündür. Sağlam kutuda depo teslimi alınır.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Çözüm Ortaklarımız */}
        <div className="border border-neutral-300 rounded-lg p-2 text-center">
          <span className="text-[8.5px] font-black text-neutral-400 uppercase tracking-widest block mb-1">
            — ÇÖZÜM ORTAKLARIMIZ —
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-neutral-700 text-[9px]">
            {partners.map((p, idx) => (
              <span key={idx} className={`${p.bold ? "font-black text-neutral-900" : "font-medium text-neutral-600"}`}>
                {p.name} {p.sub && <span className="text-[7.5px] font-normal text-neutral-500 uppercase">{p.sub}</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Temsilci & Teklif Onayı */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="border border-neutral-300 rounded-lg p-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-neutral-500 uppercase">SATIŞ TEMSİLCİSİ</span>
              <p className="font-bold text-[11px] text-neutral-900">{salesRepName}</p>
              <p className="text-[9px] text-neutral-600 font-medium">Satış Müdürü</p>
              <p className="text-[8.5px] text-neutral-500">📞 {salesRepPhone}</p>
            </div>
            <div className="text-center pr-2">
              <div className="h-9 w-20 border-b border-neutral-400 italic text-neutral-400 flex items-center justify-center text-[9px]">
                İmza
              </div>
              <span className="text-[7.5px] font-bold uppercase text-neutral-500 mt-0.5 block">İMZA</span>
            </div>
          </div>

          <div className="border border-neutral-300 rounded-lg p-2.5 flex items-center justify-between">
            <div className="space-y-1 text-[9px] flex-1">
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
            <div className="w-16 h-12 border border-dashed border-neutral-400 rounded flex items-center justify-center text-neutral-400 text-[8.5px] font-bold uppercase">
              KAŞE
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-900 text-white px-3 py-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-1 text-[8.5px] font-medium text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-0.5">
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
