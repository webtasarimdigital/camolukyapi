"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { saveExcelProducts, savePdfDocument, extractProductsFromPdf } from "../actions";
import type { ParsedProductRow } from "../types";
import { parseTurkishNumber, formatCurrency, formatQty } from "@/lib/formatters";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileCheck,
  AlertTriangle,
  Settings2,
} from "lucide-react";

export default function ImportWizardPage() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<"excel" | "pdf">("excel");

  // Excel State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [rawDataRows, setRawDataRows] = useState<unknown[][]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{
    colCode: number;
    colName: number;
    colGroup: number;
    colSeries: number;
    colSize: number;
    colUnit: number;
    colStockQty: number;
    colQ1: number;
    colQ2: number;
    colQCommercial: number;
  }>({
    colCode: -1,
    colName: -1,
    colGroup: -1,
    colSeries: -1,
    colSize: -1,
    colUnit: -1,
    colStockQty: -1,
    colQ1: -1,
    colQ2: -1,
    colQCommercial: -1,
  });
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // PDF State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfCategory, setPdfCategory] = useState("Fiyat Listesi");
  const [pdfNotes, setPdfNotes] = useState("");

  function normalizeUnit(val: unknown): string {
    if (!val) return "M2";
    const s = String(val).trim();
    const lower = s.toLowerCase();
    if (lower === "metrekare" || lower === "m2" || lower === "m²") return "M2";
    if (lower === "adet" || lower === "adt") return "Adet";
    return s;
  }

  function extractProducts(
    dataRows: unknown[][],
    map: typeof mapping
  ): ParsedProductRow[] {
    const products: ParsedProductRow[] = [];
    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length === 0) continue;

      const codeVal = map.colCode !== -1 ? String(row[map.colCode] || "").trim() : "";
      const nameVal = map.colName !== -1 ? String(row[map.colName] || "").trim() : "";

      if (!codeVal || !nameVal) continue;

      const p1Val = map.colQ1 !== -1 ? parseTurkishNumber(row[map.colQ1] as string | number) : null;
      const p2Val = map.colQ2 !== -1 ? parseTurkishNumber(row[map.colQ2] as string | number) : null;
      const pCVal =
        map.colQCommercial !== -1 ? parseTurkishNumber(row[map.colQCommercial] as string | number) : null;
      const stockVal =
        map.colStockQty !== -1 ? parseTurkishNumber(row[map.colStockQty] as string | number) : null;

      products.push({
        product_code: codeVal,
        product_name: nameVal,
        product_group: map.colGroup !== -1 ? String(row[map.colGroup] || "").trim() : undefined,
        series_name: map.colSeries !== -1 ? String(row[map.colSeries] || "").trim() : undefined,
        size: map.colSize !== -1 ? String(row[map.colSize] || "").trim() : undefined,
        unit: map.colUnit !== -1 ? normalizeUnit(row[map.colUnit]) : "M2",
        price_quality_1: p1Val,
        price_quality_2: p2Val,
        price_commercial: pCVal,
        default_sale_price: p1Val,
        stock_qty: stockVal,
      });
    }
    return products;
  }

  // Excel Yükleme İşleyicisi
  async function handleExcelFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      setWorkbookRef(workbook);
      const sheetNames = workbook.SheetNames;
      setSheets(sheetNames);
      const defaultSheet = sheetNames[0] || "";
      setSelectedSheet(defaultSheet);

      // İlk sayfayı parse et
      parseSheet(workbook, defaultSheet);
      setStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Dosya okunamadı";
      toast.error("Excel okuma hatası: " + msg);
    } finally {
      setLoading(false);
    }
  }

  function parseSheet(workbook: XLSX.WorkBook, sheetName: string) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as unknown[][];
    if (rawData.length < 2) {
      toast.error("Seçilen sayfada yeterli veri bulunamadı.");
      return;
    }

    function norm(s: unknown) {
      return String(s || "")
        .toLowerCase()
        .replace(/i̇/g, "i")
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .trim();
    }

    // Akıllı skor bazlı başlık satırı tespiti
    let bestHeaderIndex = 0;
    let maxScore = -1;
    for (let i = 0; i < Math.min(rawData.length, 15); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      let score = 0;
      row.forEach((cell) => {
        const n = norm(cell);
        if (!n) return;
        if (n.includes("kod") || n === "stok kodu" || n === "malzeme kodu") score += 3;
        if (n.includes("urun") || n.includes("malzeme") || n.includes("aciklama") || n.includes("tanim") || n === "stok adi") score += 3;
        if (n === "stok" || n.includes("stok miktar") || n.includes("kalan") || n.includes("mevcut") || n.includes("bakiye") || n.includes("adet") || n.includes("qty") || n.includes("miktar")) score += 3;
        if (n.includes("birim") || n.includes("brm")) score += 2;
        if (n.includes("fiyat") || n.includes("liste") || n.includes("kalite") || n.includes("standart") || n.includes("ticari")) score += 2;
        if (n.includes("ebat") || n.includes("grup") || n.includes("seri")) score += 2;
      });
      if (score > maxScore) {
        maxScore = score;
        bestHeaderIndex = i;
      }
    }

    const headerIndex = maxScore >= 2 ? bestHeaderIndex : 0;
    const rawHeaders = (rawData[headerIndex] || []) as unknown[];
    const headers = rawHeaders.map((h, idx) => {
      const val = String(h || "").trim();
      const colLetter = String.fromCharCode(65 + (idx % 26));
      return val ? `${colLetter}: ${val}` : `Sütun ${colLetter}`;
    });
    const dataRows = rawData.slice(headerIndex + 1);

    // Kolon indekslerini akıllıca eşleştir
    let colCode = -1;
    let colName = -1;
    let colGroup = -1;
    let colSeries = -1;
    let colSize = -1;
    let colUnit = -1;
    let colStockQty = -1;
    let colQ1 = -1;
    let colQ2 = -1;
    let colQCommercial = -1;

    rawHeaders.forEach((h, idx) => {
      const n = norm(h);
      if ((n.includes("kod") || n === "stok kodu" || n === "malzeme kodu") && colCode === -1) {
        colCode = idx;
      } else if (
        (n.includes("urun ad") || n.includes("malzeme") || n.includes("aciklama") || n === "stok adi" || n.includes("tanim")) &&
        colName === -1
      ) {
        colName = idx;
      } else if ((n.includes("grup") || n === "stok grubu") && colGroup === -1) {
        colGroup = idx;
      } else if (n.includes("seri") && colSeries === -1) {
        colSeries = idx;
      } else if (n.includes("ebat") && colSize === -1) {
        colSize = idx;
      } else if ((n.includes("birim") || n.includes("brm")) && colUnit === -1) {
        colUnit = idx;
      } else if (
        (n === "stok" ||
          n.includes("stok miktar") ||
          n.includes("kalan") ||
          n.includes("mevcut") ||
          n.includes("miktar") ||
          n.includes("qty") ||
          n.includes("adet") ||
          n.includes("bakiye")) &&
        colStockQty === -1 &&
        idx !== colCode &&
        idx !== colName
      ) {
        colStockQty = idx;
      } else if (
        (n === "standart" || n.includes("standart fiyat") || n.includes("1.liste") || n.includes("1.kalite") || n.includes("1. kalite")) &&
        colQ1 === -1
      ) {
        colQ1 = idx;
      } else if ((n.includes("2.liste") || n.includes("2.kalite") || n.includes("2. kalite")) && colQ2 === -1) {
        colQ2 = idx;
      } else if (n.includes("ticari") && colQCommercial === -1) {
        colQCommercial = idx;
      }
    });

    // Fallback: eğer name bulunamadıysa ve code 0'daysa name 1 olsun
    if (colCode !== -1 && colName === -1 && headers.length > 1) {
      colName = colCode === 0 ? 1 : 0;
    }

    const initialMap = {
      colCode,
      colName,
      colGroup,
      colSeries,
      colSize,
      colUnit,
      colStockQty,
      colQ1,
      colQ2,
      colQCommercial,
    };

    setDetectedHeaders(headers);
    setRawDataRows(dataRows);
    setMapping(initialMap);

    const products = extractProducts(dataRows, initialMap);
    setParsedRows(products);
    toast.success(`${products.length} ürün ve stok bilgisi hazırlandı.`);
  }

  function handleMappingChange(field: keyof typeof mapping, value: number) {
    const updated = { ...mapping, [field]: value };
    setMapping(updated);
    if (rawDataRows.length > 0) {
      const prods = extractProducts(rawDataRows, updated);
      setParsedRows(prods);
    }
  }

  function handleSheetSelect(newSheet: string) {
    setSelectedSheet(newSheet);
    if (workbookRef) {
      parseSheet(workbookRef, newSheet);
    }
  }

  const stockStats = useMemo(() => {
    let nonZeroCount = 0;
    let decimalCount = 0;
    let sampleValue: number | null = null;
    let sampleUnit = "";

    for (const r of parsedRows) {
      if (r.stock_qty != null && r.stock_qty > 0) {
        nonZeroCount++;
        if (r.stock_qty % 1 !== 0) {
          decimalCount++;
          if (sampleValue === null) {
            sampleValue = r.stock_qty;
            sampleUnit = r.unit || "";
          }
        } else if (sampleValue === null) {
          sampleValue = r.stock_qty;
          sampleUnit = r.unit || "";
        }
      }
    }

    return { nonZeroCount, decimalCount, sampleValue, sampleUnit };
  }, [parsedRows]);

  // Excel Aktarımını Başlat
  async function handleStartExcelImport() {
    if (parsedRows.length === 0) {
      toast.error("İçe aktarılacak geçerli ürün satırı bulunamadı.");
      return;
    }

    setLoading(true);
    try {
      const res = await saveExcelProducts({
        fileName: excelFile?.name || "fiyat_listesi.xlsx",
        sheetName: selectedSheet,
        products: parsedRows,
      });

      toast.success(
        `İçe aktarma tamamlandı! ${res.inserted} yeni ürün eklendi, ${res.updated} ürün güncellendi.`
      );
      router.push("/urunler");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Aktarım hatası";
      toast.error("Hata: " + msg);
    } finally {
      setLoading(false);
    }
  }

  // PDF Belgesi Kaydet
  async function handlePdfSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pdfTitle.trim()) {
      toast.error("Lütfen belge başlığını girin.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("title", pdfTitle.trim());
      formData.set("category", pdfCategory);
      formData.set("notes", pdfNotes);
      if (pdfFile) {
        formData.set("fileName", pdfFile.name);
      }

      const res = await savePdfDocument(formData);
      if (!res.success) {
        toast.error("PDF kaydetme hatası: " + (res.error || "Bilinmeyen hata"));
        return;
      }

      toast.success("PDF belgesi başarıyla arşivlendi!");
      router.push("/import");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF kaydetme hatası";
      toast.error("Hata: " + msg);
    } finally {
      setLoading(false);
    }
  }

  // PDF İçerisinden Fiyat ve Ürünleri Otomatik Ayıkla
  async function handleExtractFromPdf() {
    if (!pdfFile) {
      toast.error("Lütfen önce bir PDF dosyası seçin.");
      return;
    }

    if (pdfFile.size > 4.5 * 1024 * 1024) {
      toast.error(
        `PDF dosyanız ${(pdfFile.size / (1024 * 1024)).toFixed(1)} MB boyutundadır. Sunucu limiti nedeniyle 4.5 MB üzerindeki dosyalar doğrudan ayıklanamaz. Lütfen bu belgeyi 'Sadece Belge Olarak Arşivle' butonuyla kaydedin veya ürünleri Excel listesi ile içe aktarın.`
      );
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", pdfFile);

      const res = await extractProductsFromPdf(formData);
      if (!res.success) {
        toast.error("PDF okunamadı: " + (res.error || "Ayrıştırma hatası"));
        return;
      }

      if (!res.products || res.products.length === 0) {
        toast.warning(
          "PDF metninden otomatik ürün/fiyat satırı tespit edilemedi. Belge taranmış resim/fotoğraf olabilir. Belgeyi arşivlemek için 'Sadece Belge Olarak Arşivle' butonunu kullanabilirsiniz."
        );
      } else {
        setParsedRows(res.products);
        setSelectedSheet("PDF_PARSED");
        setActiveType("excel");
        setStep(2);
        const matchInfo = res.matchedWithExisting
          ? ` (${res.matchedWithExisting} adet mevcut ürünümüz ile eşleşti)`
          : "";
        toast.success(`PDF içinden ${res.products.length} ürün ve fiyat ayrıştırıldı!${matchInfo}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF ayrıştırma hatası";
      toast.error("Hata: " + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Üst Bar */}
      <div className="flex items-center gap-4">
        <Link
          href="/import"
          className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-text border border-border transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text">Yeni Belge & Liste Yükle</h1>
          <p className="text-sm text-text-muted">
            Tedarikçi Excel fiyat listesini aktarın veya PDF ürün kataloglarını arşivleyin.
          </p>
        </div>
      </div>

      {/* Format Seçim Sekmeleri */}
      <div className="flex gap-4 p-1 bg-surface border border-border rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveType("excel")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeType === "excel"
              ? "bg-white text-brand-navy shadow-sm border border-border"
              : "text-text-muted hover:text-text"
          }`}
        >
          <FileSpreadsheet size={18} className="text-emerald-600" />
          Excel Fiyat Listesi (.xlsx, .xls)
        </button>

        <button
          type="button"
          onClick={() => setActiveType("pdf")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeType === "pdf"
              ? "bg-white text-brand-navy shadow-sm border border-border"
              : "text-text-muted hover:text-text"
          }`}
        >
          <FileText size={18} className="text-rose-600" />
          PDF Fiyat Listesi & Katalog (.pdf)
        </button>
      </div>

      {/* EXCEL MODU */}
      {activeType === "excel" && (
        <div className="space-y-6">
          {step === 1 ? (
            <div className="bg-white border-2 border-dashed border-border hover:border-brand-gold rounded-2xl p-10 text-center transition">
              <UploadCloud size={44} className="mx-auto text-emerald-600 mb-4" />
              <h3 className="font-semibold text-text text-base mb-1">
                Excel Fiyat Listesini Sürükleyin veya Seçin
              </h3>
              <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
                .xlsx veya .xls formatındaki NG Seramik veya diğer marka fiyat listelerinizi
                yükleyebilirsiniz. Baştaki sıfırlar ve Türk Lirası fiyatlar otomatik ayrıştırılır.
              </p>

              <label className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-6 py-3 rounded-xl text-sm font-bold cursor-pointer transition shadow-sm">
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Dosya Okunuyor...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={16} /> Excel Dosyası Seç
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg">
                    <FileCheck size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text text-sm">{excelFile?.name}</h3>
                    <p className="text-xs text-text-muted">
                      Toplam <strong className="text-text">{parsedRows.length}</strong> ürün satırı tespit edildi.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {sheets.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Sayfa:</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetSelect(e.target.value)}
                        className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-brand-gold"
                      >
                        {sheets.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setParsedRows([]);
                    }}
                    className="text-xs text-text-muted hover:text-text px-3 py-2 border border-border rounded-lg"
                  >
                    Farklı Dosya Seç
                  </button>

                  <button
                    type="button"
                    disabled={loading || parsedRows.length === 0}
                    onClick={handleStartExcelImport}
                    className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-5 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Aktarılıyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} /> Sisteme Aktar ({parsedRows.length} Ürün)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sütun Eşleştirme Kontrol Paneli */}
              <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 size={18} className="text-brand-navy" />
                    <h4 className="text-sm font-bold text-text">Sütun Eşleştirmeleri</h4>
                  </div>
                  <span className="text-xs text-text-muted">
                    Otomatik eşleşen sütunları kontrol edebilir veya değiştirebilirsiniz
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      📌 Stok Kodu Sütunu <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mapping.colCode}
                      onChange={(e) => handleMappingChange("colCode", Number(e.target.value))}
                      className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-brand-gold"
                    >
                      <option value={-1}>-- Seçiniz --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      🏷️ Ürün Adı Sütunu <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mapping.colName}
                      onChange={(e) => handleMappingChange("colName", Number(e.target.value))}
                      className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-brand-gold"
                    >
                      <option value={-1}>-- Seçiniz --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      📏 Birim Sütunu
                    </label>
                    <select
                      value={mapping.colUnit}
                      onChange={(e) => handleMappingChange("colUnit", Number(e.target.value))}
                      className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-brand-gold"
                    >
                      <option value={-1}>-- Varsayılan (M2) --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      📦 Stok Miktarı Sütunu
                    </label>
                    <select
                      value={mapping.colStockQty}
                      onChange={(e) => handleMappingChange("colStockQty", Number(e.target.value))}
                      className="w-full bg-emerald-50 border-2 border-emerald-400 text-emerald-950 font-bold rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-emerald-600"
                    >
                      <option value={-1}>-- Stok Aktarma (0 yap) --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      💰 1. Kalite / Fiyat (Opsiyonel)
                    </label>
                    <select
                      value={mapping.colQ1}
                      onChange={(e) => handleMappingChange("colQ1", Number(e.target.value))}
                      className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-gold"
                    >
                      <option value={-1}>-- Yok --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      💰 2. Kalite Fiyat (Opsiyonel)
                    </label>
                    <select
                      value={mapping.colQ2}
                      onChange={(e) => handleMappingChange("colQ2", Number(e.target.value))}
                      className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-gold"
                    >
                      <option value={-1}>-- Yok --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      💰 Ticari Fiyat (Opsiyonel)
                    </label>
                    <select
                      value={mapping.colQCommercial}
                      onChange={(e) => handleMappingChange("colQCommercial", Number(e.target.value))}
                      className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-gold"
                    >
                      <option value={-1}>-- Yok --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      📐 Ebat (Opsiyonel)
                    </label>
                    <select
                      value={mapping.colSize}
                      onChange={(e) => handleMappingChange("colSize", Number(e.target.value))}
                      className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-gold"
                    >
                      <option value={-1}>-- Yok --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stok Durum Özeti Bildirimi */}
                {mapping.colStockQty === -1 ? (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-3 text-amber-900 text-xs">
                    <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold">⚠️ Stok Miktarı Sütunu Seçilmedi!</span>
                      <p className="mt-0.5">
                        Ürünler sisteme <strong>0 stok</strong> ile aktarılacaktır. Eğer dosyanızda stok miktarları varsa, yukarıdaki <strong>&quot;Stok Miktarı Sütunu&quot;</strong> açılır kutusundan <strong>STOK</strong> sütununu seçin.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-emerald-950 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                      <span>
                        <strong>Stok Sütunu Bağlandı:</strong> &quot;{detectedHeaders[mapping.colStockQty]}&quot; ({stockStats.nonZeroCount} üründe mevcut stok tespit edildi, {stockStats.decimalCount} üründe hassas ondalık mevcut)
                      </span>
                    </div>
                    {stockStats.sampleValue != null && (
                      <span className="bg-emerald-200/80 text-emerald-950 font-mono font-bold px-2.5 py-1 rounded">
                        Örnek Okunan Miktar: {formatQty(stockStats.sampleValue)} {stockStats.sampleUnit}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Önizleme Tablosu */}
              <div>
                <h4 className="text-xs font-semibold text-text uppercase tracking-wide mb-3">
                  İlk 15 Satır Önizleme
                </h4>
                <div className="border border-border rounded-lg overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-surface border-b border-border text-text-muted">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Ürün Kodu</th>
                        <th className="text-left px-3 py-2 font-medium">Ürün Adı</th>
                        <th className="text-left px-3 py-2 font-medium">Ebat</th>
                        <th className="text-left px-3 py-2 font-medium">Birim</th>
                        <th className="text-right px-3 py-2 font-medium text-emerald-800">Stok Miktarı</th>
                        <th className="text-right px-3 py-2 font-medium">1. Kalite</th>
                        <th className="text-right px-3 py-2 font-medium">2. Kalite</th>
                        <th className="text-right px-3 py-2 font-medium">Ticari</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedRows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface">
                          <td className="px-3 py-2 font-mono font-medium text-text">
                            {row.product_code}
                          </td>
                          <td className="px-3 py-2 text-text font-medium truncate max-w-xs">
                            {row.product_name}
                          </td>
                          <td className="px-3 py-2 text-text-muted">{row.size || "-"}</td>
                          <td className="px-3 py-2 text-text-muted">{row.unit || "M2"}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">
                            {row.stock_qty != null ? `${formatQty(row.stock_qty)} ${row.unit || ""}` : "-"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-text font-medium">
                            {formatCurrency(row.price_quality_1)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                            {formatCurrency(row.price_quality_2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                            {formatCurrency(row.price_commercial)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF MODU */}
      {activeType === "pdf" && (
        <form
          onSubmit={handlePdfSubmit}
          className="bg-white rounded-xl border border-border p-6 space-y-5"
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="bg-rose-50 text-rose-600 p-2.5 rounded-lg">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-text text-sm">
                PDF Fiyat Listesi veya Ürün Kataloğu Arşivle
              </h3>
              <p className="text-xs text-text-muted">
                Tedarikçilerden gelen resmi PDF fiyat listeleri ve broşürleri sisteme yükleyin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
                Belge Başlığı *
              </label>
              <input
                type="text"
                required
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="Örn: NG Seramik 2026 Mart Brüt Fiyat Listesi"
                className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
                Belge Kategorisi
              </label>
              <select
                value={pdfCategory}
                onChange={(e) => setPdfCategory(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold transition"
              >
                <option value="Fiyat Listesi">Fiyat Listesi</option>
                <option value="Ürün Kataloğu">Ürün Kataloğu</option>
                <option value="Tedarikçi Broşürü">Tedarikçi Broşürü</option>
                <option value="Teknik Şartname">Teknik Şartname</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-text mb-1.5">
                PDF Dosyası (.pdf) *
              </label>
              <div className="border border-border rounded-lg p-4 bg-surface">
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-navy file:text-white hover:file:bg-brand-navy-2 cursor-pointer"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-text mb-1.5">
                Açıklama / Notlar
              </label>
              <textarea
                rows={3}
                value={pdfNotes}
                onChange={(e) => setPdfNotes(e.target.value)}
                placeholder="Geçerlilik tarihi, iskonto şartları veya ek notlar..."
                className="w-full bg-surface border border-border rounded-lg px-3.5 py-2 text-sm outline-none focus:border-brand-gold transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-surface hover:bg-gray-200 text-text font-semibold px-4 py-2.5 rounded-lg text-sm transition border border-border disabled:opacity-50"
            >
              Sadece Belge Olarak Arşivle
            </button>

            <button
              type="button"
              disabled={loading || !pdfFile}
              onClick={handleExtractFromPdf}
              className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> PDF Ayrıştırılıyor...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> PDF Fiyat & Ürünleri Ayrıştırıp Sisteme Aktar
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
