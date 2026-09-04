"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { saveExcelProducts, savePdfDocument, extractProductsFromPdf, ParsedProductRow } from "../actions";
import { parseTurkishNumber, formatCurrency } from "@/lib/formatters";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileCheck,
} from "lucide-react";

export default function ImportWizardPage() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<"excel" | "pdf">("excel");

  // Excel State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // PDF State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfCategory, setPdfCategory] = useState("Fiyat Listesi");
  const [pdfNotes, setPdfNotes] = useState("");

  // Excel Yükleme İşleyicisi
  async function handleExcelFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
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

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    if (rawData.length < 2) {
      toast.error("Seçilen sayfada yeterli veri bulunamadı.");
      return;
    }

    // Başlık satırını bul (kod/ürün/fiyat içeren satır)
    let headerIndex = 0;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i];
      if (Array.isArray(row)) {
        const rowStr = row.map((c) => String(c).toUpperCase()).join(" ");
        if (
          rowStr.includes("KOD") ||
          rowStr.includes("ÜRÜN") ||
          rowStr.includes("FİYAT")
        ) {
          headerIndex = i;
          break;
        }
      }
    }

    const headers = (rawData[headerIndex] || []).map((h) => String(h || "").trim());
    const dataRows = rawData.slice(headerIndex + 1);

    // Kolon indekslerini akıllıca eşleştir
    let colCode = -1;
    let colName = -1;
    let colGroup = -1;
    let colSeries = -1;
    let colSize = -1;
    let colUnit = -1;
    let colQ1 = -1;
    let colQ2 = -1;
    let colQCommercial = -1;

    headers.forEach((h, idx) => {
      const upper = h.toUpperCase();
      if (upper.includes("KOD") && colCode === -1) colCode = idx;
      else if (
        (upper.includes("ÜRÜN AD") || upper.includes("MALZEME") || upper.includes("AÇIKLAMA")) &&
        colName === -1
      )
        colName = idx;
      else if (upper.includes("GRUP") && colGroup === -1) colGroup = idx;
      else if (upper.includes("SERİ") && colSeries === -1) colSeries = idx;
      else if (upper.includes("EBAT") && colSize === -1) colSize = idx;
      else if ((upper.includes("BİRİM") || upper.includes("BRM")) && colUnit === -1) colUnit = idx;
      else if (upper.includes("1.") || upper.includes("1.KALİTE") || upper.includes("1. KALİTE"))
        colQ1 = idx;
      else if (upper.includes("2.") || upper.includes("2.KALİTE") || upper.includes("2. KALİTE"))
        colQ2 = idx;
      else if (upper.includes("TİCARİ") || upper.includes("TICARI"))
        colQCommercial = idx;
    });

    // Fallback: eğer name bulunamadıysa ve code 0'daysa name 1 olsun
    if (colCode !== -1 && colName === -1 && headers.length > 1) {
      colName = colCode === 0 ? 1 : 0;
    }

    const products: ParsedProductRow[] = [];
    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length === 0) continue;

      const codeVal = colCode !== -1 ? String(row[colCode] || "").trim() : "";
      const nameVal = colName !== -1 ? String(row[colName] || "").trim() : "";

      if (!codeVal || !nameVal) continue;

      const p1Val = colQ1 !== -1 ? parseTurkishNumber(row[colQ1] as string | number) : null;
      const p2Val = colQ2 !== -1 ? parseTurkishNumber(row[colQ2] as string | number) : null;
      const pCVal =
        colQCommercial !== -1 ? parseTurkishNumber(row[colQCommercial] as string | number) : null;

      products.push({
        product_code: codeVal,
        product_name: nameVal,
        product_group: colGroup !== -1 ? String(row[colGroup] || "") : undefined,
        series_name: colSeries !== -1 ? String(row[colSeries] || "") : undefined,
        size: colSize !== -1 ? String(row[colSize] || "") : undefined,
        unit: colUnit !== -1 ? String(row[colUnit] || "M2").trim() || "M2" : "M2",
        price_quality_1: p1Val,
        price_quality_2: p2Val,
        price_commercial: pCVal,
        default_sale_price: p1Val,
      });
    }

    setParsedRows(products);
    toast.success(`${products.length} ürün başarıyla okundu.`);
  }

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
      router.push("/import");
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
    if (!pdfTitle) {
      toast.error("Lütfen belge başlığını girin.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("title", pdfTitle);
      formData.set("category", pdfCategory);
      formData.set("notes", pdfNotes);
      if (pdfFile) {
        formData.set("file", pdfFile);
      }

      await savePdfDocument(formData);
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

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", pdfFile);

      const res = await extractProductsFromPdf(formData);
      if (!res.products || res.products.length === 0) {
        toast.warning(
          "PDF metninden otomatik fiyat satırı tespit edilemedi. Belgeyi arşiv olarak kaydetmek için 'Sadece Belge Olarak Arşivle' butonunu kullanabilirsiniz."
        );
      } else {
        setParsedRows(res.products);
        setSelectedSheet("PDF_PARSED");
        setActiveType("excel");
        setStep(2);
        toast.success(`PDF içinden ${res.products.length} ürün ve fiyat bilgisi ayrıştırıldı!`);
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
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg">
                    <FileCheck size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text text-sm">{excelFile?.name}</h3>
                    <p className="text-xs text-text-muted">
                      Toplam {parsedRows.length} ürün satırı tespit edildi.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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
                    className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-5 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
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
