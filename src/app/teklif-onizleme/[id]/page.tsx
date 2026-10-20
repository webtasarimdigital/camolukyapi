import { createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
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
  FileCheck,
} from "lucide-react";
import { PublicPrintButton } from "./PublicPrintButton";

export default async function PublicQuotePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServiceClient();

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
    branch: "1368 - LİBADİYE ŞUBESİ",
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

  // Sayısal teklif numarası (harf ve prefix olmadan, sadece rakamlar)
  const displayQuoteNo = (quote.quote_code || "").replace(/^[^\d]+/g, "") || String(quote.quote_code || "20260001");

  // Çözüm Ortakları Logoları (Önce NG Kütahya, sonra VitrA, Artema...)
  const partnerLogos = [
    { name: "NG Kütahya Seramik", src: "/teklif-logo/ng-kutahya.jpeg" },
    { name: "VitrA", src: "/teklif-logo/vitra.jpeg" },
    { name: "Artema", src: "/teklif-logo/artema.jpeg" },
    { name: "KYK Yapı Kimyasalları", src: "/teklif-logo/kyk.jpeg" },
    { name: "Weber", src: "/teklif-logo/weber.jpeg" },
    { name: "Grohe", src: "/teklif-logo/grohe.jpeg" },
    { name: "Geberit", src: "/teklif-logo/geberit.jpeg" },
    { name: "Duravit", src: "/teklif-logo/duravit.jpeg" },
    { name: "Isvea", src: "/teklif-logo/isvea.jpeg" },
    { name: "Ideal Standard", src: "/teklif-logo/ideal.jpeg" },
    { name: "Artemis", src: "/teklif-logo/artemis.jpeg" },
    { name: "Newarc", src: "/teklif-logo/nevarc.jpeg" },
    { name: "Lavissa", src: "/teklif-logo/lavissa.jpeg" },
    { name: "Safi Çimento", src: "/teklif-logo/safi.jpeg" },
    { name: "Filli Boya", src: "/teklif-logo/filli-boya.jpeg" },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 py-4 sm:py-6 px-2 sm:px-4 print:p-0 print:bg-white text-neutral-900 font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print, header, aside, nav { display: none !important; }
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
          .page-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* Floating Action Button */}
      <PublicPrintButton quoteCode={displayQuoteNo} />

      {/* A4 PROPOSAL DOCUMENT - Her ekrana tam oturan responsive container */}
      <div className="print-clean w-full max-w-[210mm] mx-auto bg-white p-3.5 sm:p-5 md:p-6 text-[10px] leading-tight text-neutral-800 shadow-md border border-neutral-200 rounded-xl space-y-2.5">
        
        {/* Header (Logo & Teklif Rozeti) */}
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b-2 border-neutral-800">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src="/camoluk-logo.png"
              alt="ÇAMOLUK YAPI"
              className="h-10 sm:h-12 w-auto max-w-[200px] object-contain"
            />
            <div className="h-9 w-[1.5px] bg-neutral-300" />
            <img
              src="/kutahya-seramik-logo-.png"
              alt="Kütahya Seramik"
              className="h-9 sm:h-11 w-auto max-w-[190px] object-contain"
            />
          </div>

          <div className="flex items-center gap-2 bg-neutral-900 text-white px-3.5 sm:px-4 py-1.5 rounded-lg">
            <FileCheck size={15} className="text-brand-gold" />
            <span className="text-xs sm:text-sm font-black tracking-widest uppercase">TEKLİF</span>
          </div>
        </div>

        {/* Müşteri ve Teklif Bilgileri - Yan Yana */}
        <div className="grid grid-cols-2 gap-2.5 text-[9px]">
          {/* Müşteri Kartı */}
          <div className="border border-neutral-300 rounded-lg overflow-hidden flex flex-col justify-between">
            <div className="bg-neutral-100 px-2.5 py-1 border-b border-neutral-300 flex items-center gap-1.5 font-bold text-neutral-800 text-[9.5px]">
              <User size={12} />
              <span>MÜŞTERİ BİLGİLERİ</span>
            </div>
            <div className="p-2 space-y-0.5 text-[9px] flex-1">
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">MÜŞTERİ</span>
                <span className="col-span-2 font-bold text-neutral-900 truncate">: {customerName}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">ADRES</span>
                <span className="col-span-2 text-neutral-700 truncate">: {customerAddress}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">İLETİŞİM</span>
                <span className="col-span-2 text-neutral-700">: {customerPhone}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">VERGİ NO</span>
                <span className="col-span-2 text-neutral-700">: {customerTaxInfo}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-neutral-500 font-medium">E-POSTA</span>
                <span className="col-span-2 text-neutral-700 truncate">: {customerEmail}</span>
              </div>
            </div>
          </div>

          {/* Teklif Kartı */}
          <div className="border border-neutral-300 rounded-lg overflow-hidden flex flex-col justify-between">
            <div className="bg-neutral-100 px-2.5 py-1 border-b border-neutral-300 flex items-center gap-1.5 font-bold text-neutral-800 text-[9.5px]">
              <Calendar size={12} />
              <span>TEKLİF DETAYLARI</span>
            </div>
            <div className="p-2 space-y-0.5 text-[9px] flex-1">
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">TEKLİF NO</span>
                <span className="col-span-3 font-mono font-bold text-neutral-900">: {displayQuoteNo}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">TARİH</span>
                <span className="col-span-3 font-semibold text-neutral-800">: {formatDate(quote.created_at || quote.quote_date)}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">GEÇERLİLİK</span>
                <span className="col-span-3 font-bold text-neutral-900">: 2 İŞ GÜNÜ ({formatDate(quote.valid_until)})</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">TEMSİLCİ</span>
                <span className="col-span-3 font-bold text-neutral-900">: {salesRepName}</span>
              </div>
              <div className="grid grid-cols-5 items-center">
                <span className="col-span-2 text-neutral-500 font-medium">İLETİŞİM</span>
                <span className="col-span-3 font-semibold text-neutral-800">: {salesRepPhone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ÜRÜNLER LİSTESİ */}
        {/* 1) Masaüstü ve Print Tablosu */}
        <div className="border border-neutral-300 rounded-lg overflow-hidden hidden sm:block print:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[9.5px]">
              <thead>
                <tr className="bg-neutral-800 text-white font-bold text-[9px] uppercase tracking-wider">
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

        {/* 2) Telefona Özel Responsive Kart Listesi (Telefona %100 sığar) */}
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

        {/* TOPLAMLAR, BANKA BİLGİLERİ VE YATAY GENEL TOPLAM BARI */}
        <div className="w-full border border-neutral-300 rounded-lg overflow-hidden text-[9.5px] bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-300">
            {/* Sol Sütun: Banka Hesap Bilgileri & QR */}
            <div className="bg-neutral-50/70 p-2.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5 text-[8.5px] leading-tight flex-1">
                <span className="font-bold text-neutral-900 uppercase text-[9px] block border-b border-neutral-200 pb-0.5 mb-1 tracking-wide">
                  BANKA HESAP BİLGİLERİ
                </span>
                <div>
                  <span className="text-neutral-500 font-medium">HESAP ADI: </span>
                  <strong className="text-neutral-800">{primaryBank.account_name}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 font-medium">BANKA: </span>
                  <strong className="text-neutral-800">{primaryBank.bank_name} - {primaryBank.branch}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 font-medium">HESAP NO: </span>
                  <span className="font-mono text-neutral-800">{primaryBank.account_no}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-bold">IBAN: </span>
                  <strong className="font-mono text-neutral-950 font-bold break-all">{primaryBank.iban}</strong>
                </div>
              </div>

              <div 
                className="flex flex-col items-center justify-center border border-neutral-300 p-1.5 rounded-lg bg-white shrink-0 shadow-xs"
                title="Halkbank Hesap QR Kodu"
              >
                <img src="/qr.jpeg" alt="Halkbank QR Kodu" className="w-20 h-20 sm:w-22 sm:h-22 object-contain rounded" />
                <span className="text-[7.5px] font-bold text-center text-neutral-700 mt-1 uppercase leading-tight">
                  BANKA QR İLE<br/>HIZLI ÖDEME
                </span>
              </div>
            </div>

            {/* Sağ Sütun: Ara Toplam, İskonto, Net Tutar, KDV */}
            <div className="p-2.5 space-y-1 bg-white flex flex-col justify-center">
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
          </div>

          {/* TÜM GENİŞLİĞİ KAPLAYAN YATAY GENEL TOPLAM BARI */}
          <div className="bg-neutral-900 text-white px-4 py-2 flex justify-between items-center font-black text-xs sm:text-sm border-t border-neutral-800">
            <span className="tracking-widest uppercase">GENEL TOPLAM</span>
            <span className="tabular-nums text-sm sm:text-base font-black text-brand-gold">{formatCurrency(quote.grand_total ?? quote.total_amount ?? 0)}</span>
          </div>
        </div>

        {/* Önemli Notlar & Teslimat Koşulları (AYNI SATIRDA YAN YANA) */}
        <div className="grid grid-cols-2 gap-2.5 text-[8.5px] leading-tight">
          <div className="border border-neutral-300 rounded-lg p-2 space-y-0.5">
            <span className="font-bold text-neutral-900 uppercase text-[9px] block border-b border-neutral-200 pb-0.5">
              ÖNEMLİ NOTLAR
            </span>
            <ul className="space-y-0.5 text-neutral-700 list-disc list-inside">
              <li>Teklifimiz 2 iş günü geçerlidir.</li>
              <li>Termin süresi stok ve sipariş miktarlarına göre değişir.</li>
              <li>Nakliye alıcıya aittir, dahil değildir.</li>
              <li>Teklif onayında kısmi ön ödeme alınır.</li>
              <li>Ürünlerinizi sayarak eksiksiz ve sağlam alınız.</li>
              <li>İade süresi 10 gün olup sağlam kutuda depo teslimi alınır.</li>
            </ul>
          </div>

          <div className="border border-neutral-300 rounded-lg p-2 space-y-0.5">
            <span className="font-bold text-neutral-900 uppercase text-[9px] block border-b border-neutral-200 pb-0.5">
              TESLİM & ÖDEME KOŞULLARI
            </span>
            <div className="space-y-0.5 text-neutral-700">
              <div>
                <strong className="text-neutral-800">TESLİMAT: </strong>
                <span>Stok durumuna göre en kısa sürede teslim edilir.</span>
              </div>
              <div>
                <strong className="text-neutral-800">ÖDEME ŞEKLİ: </strong>
                <span>Kısmi ön ödeme, kalan bakiye teslimat öncesi kapatılır.</span>
              </div>
              <div>
                <strong className="text-neutral-800">GARANTİ: </strong>
                <span>Ürünler, üretici firma garantisi kapsamındadır.</span>
              </div>
              <div>
                <strong className="text-neutral-800">İADE KOŞULLARI: </strong>
                <span>İade süresi 10 gündür. Sağlam kutuda depo teslimi alınır.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Çözüm Ortaklarımız - 2 Satır Halinde ve Daha Büyük */}
        <div className="border border-neutral-300 rounded-lg p-2.5 text-center bg-white">
          <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block mb-2">
            — ÇÖZÜM ORTAKLARIMIZ —
          </span>
          <div className="space-y-2">
            {/* 1. Satır: 8 Logo */}
            <div className="grid grid-cols-8 gap-2 items-center justify-items-center">
              {partnerLogos.slice(0, 8).map((p, idx) => (
                <div key={idx} className="flex items-center justify-center h-7 sm:h-8 w-full px-1">
                  <img
                    src={p.src}
                    alt={p.name}
                    title={p.name}
                    className="max-h-6 sm:max-h-7 w-auto max-w-full object-contain filter contrast-125"
                  />
                </div>
              ))}
            </div>
            {/* 2. Satır: 7 Logo */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {partnerLogos.slice(8).map((p, idx) => (
                <div key={idx} className="flex items-center justify-center h-7 sm:h-8 px-1">
                  <img
                    src={p.src}
                    alt={p.name}
                    title={p.name}
                    className="max-h-6 sm:max-h-7 w-auto max-w-[85px] object-contain filter contrast-125"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Teklif Onayı - Satıra Tam Sığdırılmış */}
        <div className="w-full border border-neutral-300 rounded-lg p-2.5 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-1 mb-2">
            <span className="font-bold text-neutral-800 text-[9.5px] uppercase tracking-wide">
              MÜŞTERİ TEKLİF ONAYI
            </span>
            <span className="text-[8px] text-neutral-500 italic">
              Teklifi onaylamak için lütfen kaşeleyip imzalayarak tarafımıza iletiniz.
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="grid grid-cols-3 gap-6 text-[9px] flex-1">
              <div>
                <span className="text-neutral-500 font-semibold block mb-0.5">Firma Yetkilisi:</span>
                <div className="border-b border-dotted border-neutral-400 pt-3"></div>
              </div>
              <div>
                <span className="text-neutral-500 font-semibold block mb-0.5">Kaşe / İmza:</span>
                <div className="border-b border-dotted border-neutral-400 pt-3"></div>
              </div>
              <div>
                <span className="text-neutral-500 font-semibold block mb-0.5">Tarih:</span>
                <div className="text-neutral-700 font-medium pt-1">...... / ...... / 20.....</div>
              </div>
            </div>
            <div className="w-20 h-14 border-2 border-dashed border-neutral-300 rounded-lg flex items-center justify-center text-neutral-400 text-[8.5px] font-bold uppercase shrink-0 bg-neutral-50/50">
              KAŞE
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-900 text-white px-3 py-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-1 text-[8.5px] font-medium text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-0.5">
            <span>📍 Bahçelievler Mah. Bosna Bulvarı No:102/3-4 Üsküdar / İstanbul</span>
            <span>📞 0535 742 28 61</span>
            <span>🌐 www.camolukyapi.com</span>
          </div>
          <span className="italic font-normal opacity-80">Güvenilir Çözümler, Kalıcı Yapılar</span>
        </div>

      </div>
    </div>
  );
}
