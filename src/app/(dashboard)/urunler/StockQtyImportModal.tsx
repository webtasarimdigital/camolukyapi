"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import {
  getProductsForStockImport,
  bulkIncreaseStock,
  bulkSyncStock,
  type StockProductSummary,
  type BulkIncreaseItem,
  type BulkSyncItem,
} from "./stock-import-actions";
import { formatQty, parseTurkishNumber } from "@/lib/formatters";

/**
 * Başındaki NG kısmını kırpar ve sadece rakamları alır.
 * Örn: "NG23123" -> "23123", "NG 55018167" -> "55018167", "55018167RP" -> "55018167"
 */
function extractDigitsWithoutNG(val: string | number | null | undefined): string {
  if (val == null) return "";
  let str = String(val).trim();
  // Başındaki NG, ng, Ng, NG-, NG_ vb. prefixi temizle
  str = str.replace(/^[nN][gG][\s\-_]*/i, "");
  // Sadece rakamları al
  return str.replace(/\D/g, "");
}

/**
 * Metin karşılaştırması için Türkçe karakterleri ve boşlukları normalize eder.
 */
function normalizeName(val: string | null | undefined): string {
  if (!val) return "";
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[\*\×]/g, "x")
    .replace(/[^a-z0-9]/g, "");
}

interface ParsedRow {
  index: number;
  rawCode: string;
  rawName: string;
  unit: string;
  rawQty: number;
  extractedDigits: string;
  matchedProduct: StockProductSummary | null;
  status: "matched" | "not_found";
}

export function StockQtyImportModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [catalog, setCatalog] = useState<StockProductSummary[]>([]);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);

  // Sütun seçimleri
  const [codeCol, setCodeCol] = useState<string>("");
  const [nameCol, setNameCol] = useState<string>("");
  const [unitCol, setUnitCol] = useState<string>("");
  const [qtyCol, setQtyCol] = useState<string>("");

  // Senkronizasyon Modu: "set" (Excel'deki miktarı doğrudan ata) veya "add" (mevcut stoğun üstüne ekle)
  const [syncMode, setSyncMode] = useState<"set" | "add">("set");
  const [createMissing, setCreateMissing] = useState<boolean>(true);

  // Eşleştirilmiş satırlar
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "matched" | "not_found">("all");

  // Güncelleme işlemi durumu
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modalı açtığımızda ürün kataloğunu sunucudan çekelim
  async function handleOpen() {
    setOpen(true);
    setLoadingProducts(true);
    try {
      const res = await getProductsForStockImport();
      if (!res.success || !res.products) {
        toast.error(res.error || "Ürün listesi alınamadı.");
        setOpen(false);
        return;
      }
      setCatalog(res.products);
    } catch (err: any) {
      toast.error(err?.message || "Katalog yüklenemedi.");
      setOpen(false);
    } finally {
      setLoadingProducts(false);
    }
  }

  function handleClose() {
    if (isUpdating) return;
    setOpen(false);
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setParsedRows([]);
    setCodeCol("");
    setNameCol("");
    setQtyCol("");
    setProgress({ current: 0, total: 0, percent: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Excel dosyasını oku
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: true,
        });

        if (json.length === 0) {
          toast.error("Excel dosyasında veri satırı bulunamadı.");
          return;
        }

        const detectedHeaders = Object.keys(json[0] || {});
        setHeaders(detectedHeaders);
        setRawRows(json);

        // Otomatik sütun tahmini
        let bestCode = "";
        let bestName = "";
        let bestUnit = "";
        let bestQty = "";

        for (const h of detectedHeaders) {
          const l = h.toLowerCase().trim();
          if (!bestCode && (l.includes("kod") || l.includes("code") || l.includes("barkod") || l.includes("ng"))) {
            bestCode = h;
          }
          if (!bestName && (l.includes("ad") || l.includes("tanim") || l.includes("tanım") || l.includes("malzeme") || l.includes("ürün") || l.includes("urun") || l.includes("cins") || l.includes("açıklama") || l.includes("aciklama"))) {
            bestName = h;
          }
          if (!bestUnit && (l.includes("birim") || l.includes("brm"))) {
            bestUnit = h;
          }
          if (!bestQty && (l === "stok" || l.includes("stok") || l.includes("adet") || l.includes("miktar") || l.includes("kalan") || l.includes("bakiye") || l.includes("qty") || l.includes("sayim") || l.includes("sayım"))) {
            bestQty = h;
          }
        }

        // Eğer bestCode ve bestName aynı çıktıysa ayır
        if (bestCode === bestName && detectedHeaders.length > 1) {
          bestName = detectedHeaders.find((h) => h !== bestCode) || bestName;
        }

        const selectedCode = bestCode || detectedHeaders[0] || "";
        const selectedName = bestName || detectedHeaders[1] || "";
        const selectedUnit = bestUnit || "";
        const selectedQty = bestQty || detectedHeaders[detectedHeaders.length - 1] || "";

        setCodeCol(selectedCode);
        setNameCol(selectedName);
        setUnitCol(selectedUnit);
        setQtyCol(selectedQty);

        // Eşleştirmeyi çalıştır
        runMatching(json, catalog, selectedCode, selectedName, selectedUnit, selectedQty);
        toast.success(`${json.length} satır Excel'den okundu.`);
      } catch (err: any) {
        toast.error("Excel dosyası okunurken hata oluştu: " + err?.message);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // Eşleştirme Motoru: Birebir Kod + NG Kırpma + Rakam Yakalama & İsim Kontrolü
  function runMatching(
    rows: Record<string, unknown>[],
    currentCatalog: StockProductSummary[],
    colCode: string,
    colName: string,
    colUnit: string,
    colQty: string
  ) {
    if (!rows || rows.length === 0) return;

    // Sistemdeki ürünleri indeksle
    const exactCodeMap = new Map<string, StockProductSummary>();
    const cleanCodeMap = new Map<string, StockProductSummary>();
    const digitMap = new Map<string, StockProductSummary[]>();
    const nameMap = new Map<string, StockProductSummary>();

    if (currentCatalog && currentCatalog.length > 0) {
      for (const prod of currentCatalog) {
        if (prod.product_code) {
          exactCodeMap.set(prod.product_code.toUpperCase().trim(), prod);
          const clean = prod.product_code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
          if (clean) cleanCodeMap.set(clean, prod);
        }
        const d = extractDigitsWithoutNG(prod.product_code);
        if (d) {
          const arr = digitMap.get(d) || [];
          arr.push(prod);
          digitMap.set(d, arr);
        }
        const n = normalizeName(prod.product_name);
        if (n) {
          nameMap.set(n, prod);
        }
      }
    }

    const parsed: ParsedRow[] = [];

    rows.forEach((r, idx) => {
      const rawCodeVal = String(r[colCode] || "").trim();
      const rawNameVal = String(r[colName] || "").trim();
      const rawUnitVal = colUnit ? String(r[colUnit] || "").trim() : "";
      const rawQtyVal = parseTurkishNumber(r[colQty] as string | number);

      // Ürün eşleştirme:
      let matched: StockProductSummary | null = null;
      let digits = extractDigitsWithoutNG(rawCodeVal);

      // 1. Birebir kod eşleşmesi (Örn: ÇAMLICA002)
      if (rawCodeVal && exactCodeMap.has(rawCodeVal.toUpperCase())) {
        matched = exactCodeMap.get(rawCodeVal.toUpperCase())!;
      }

      // 2. Noktasız/Tiresiz temiz kod eşleşmesi (Örn: NG.55014983RN -> NG55014983RN)
      if (!matched && rawCodeVal) {
        const clean = rawCodeVal.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (cleanCodeMap.has(clean)) {
          matched = cleanCodeMap.get(clean)!;
        }
      }

      // 3. Rakam yakalama (NG kırpma)
      if (!matched) {
        if (!digits && rawNameVal) {
          digits = extractDigitsWithoutNG(rawNameVal);
        }
        if (digits && digitMap.has(digits)) {
          const candidates = digitMap.get(digits)!;
          if (candidates.length === 1) {
            matched = candidates[0];
          } else {
            const normRowName = normalizeName(rawNameVal);
            const best = candidates.find((c) => {
              const normC = normalizeName(c.product_name);
              return normRowName.includes(normC) || normC.includes(normRowName);
            });
            matched = best || candidates[0];
          }
        }
      }

      // 4. İsim eşleşmesi
      if (!matched && rawNameVal) {
        const normRowName = normalizeName(rawNameVal);
        if (nameMap.has(normRowName)) {
          matched = nameMap.get(normRowName)!;
        } else {
          for (const [normDbName, prod] of nameMap.entries()) {
            if (normRowName.length > 5 && normDbName.includes(normRowName)) {
              matched = prod;
              break;
            }
          }
        }
      }

      const inferredUnit =
        rawUnitVal ||
        (matched ? matched.unit : null) ||
        (rawNameVal.toLowerCase().includes("m2") ||
        rawNameVal.toLowerCase().includes("klt") ||
        rawNameVal.toLowerCase().includes("metrekare")
          ? "Metrekare"
          : "Adet");

      parsed.push({
        index: idx + 1,
        rawCode: rawCodeVal,
        rawName: rawNameVal,
        unit: inferredUnit,
        rawQty: rawQtyVal > 0 ? rawQtyVal : 0,
        extractedDigits: digits,
        matchedProduct: matched,
        status: matched ? "matched" : "not_found",
      });
    });

    setParsedRows(parsed);
  }

  // Sütun seçimleri değiştiğinde eşleştirmeyi yeniden çalıştır
  function handleColumnChange(newCode: string, newName: string, newUnit: string, newQty: string) {
    setCodeCol(newCode);
    setNameCol(newName);
    setUnitCol(newUnit);
    setQtyCol(newQty);
    if (rawRows.length > 0) {
      runMatching(rawRows, catalog, newCode, newName, newUnit, newQty);
    }
  }

  // İstatistikler
  const totalRows = parsedRows.length;
  const matchedRows = parsedRows.filter((r) => r.status === "matched" && r.rawQty > 0);
  const notFoundRows = parsedRows.filter((r) => r.status === "not_found" || r.rawQty <= 0);
  const validAllRows = parsedRows.filter((r) => r.rawCode && r.rawName && r.rawQty > 0);
  const targetRows = createMissing ? validAllRows : matchedRows;
  const totalQtyTarget = targetRows.reduce((sum, r) => sum + r.rawQty, 0);

  // Filtrelenmiş liste
  const displayRows = parsedRows.filter((r) => {
    if (filterMode === "matched") return r.status === "matched";
    if (filterMode === "not_found") return r.status === "not_found";
    return true;
  });

  // Toplu Stok Senkronizasyonu (Eşitle veya Arttır)
  async function handleConfirmSync() {
    if (targetRows.length === 0) {
      toast.error("İşlenecek geçerli ürün bulunamadı. Lütfen sütun seçimlerini kontrol edin.");
      return;
    }

    const modeText =
      syncMode === "set"
        ? "doğrudan Excel'deki ondalıklı stok miktarına eşitlenecektir (Yeni Stok = Excel)"
        : "mevcut stoğun üzerine eklenecektir (+)";

    const confirmMsg = `${targetRows.length} ürünün stoğu ${modeText}.${
      createMissing && notFoundRows.length > 0
        ? `\n(${notFoundRows.length} ürün yeni olarak sisteme kaydedilecektir.)`
        : ""
    }\n\nİşlemi onaylıyor musunuz?`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdating(true);
    setProgress({ current: 0, total: targetRows.length, percent: 0 });

    const batchSize = 100;
    const items: BulkSyncItem[] = targetRows.map((r) => ({
      productId: r.matchedProduct ? r.matchedProduct.id : null,
      productCode: r.rawCode,
      productName: r.rawName,
      unit: r.unit,
      stockQty: r.rawQty,
    }));

    let processedCount = 0;
    let totalSuccess = 0;
    let totalErrors: string[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      try {
        const res = await bulkSyncStock(batch, syncMode, createMissing);
        totalSuccess += res.updatedCount;
        if (res.errors && res.errors.length > 0) {
          totalErrors.push(...res.errors);
        }
      } catch (err: any) {
        totalErrors.push(err?.message || "Batch hatası");
      }

      processedCount += batch.length;
      const pct = Math.round((processedCount / items.length) * 100);
      setProgress({
        current: Math.min(processedCount, items.length),
        total: items.length,
        percent: pct,
      });
    }

    setIsUpdating(false);

    if (totalErrors.length > 0 && totalSuccess === 0) {
      toast.error(`Stok güncellenemedi: ${totalErrors[0]}`);
    } else {
      toast.success(
        `İşlem Tamamlandı: ${totalSuccess} ürünün stoğu başarıyla kaydedildi!`
      );
      handleClose();
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-xs"
      >
        <Package size={16} />
        <span>📦 Stok Adeti Yükle (Excel)</span>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-border">
            {/* Modal Başlık */}
            <div className="px-5 py-4 bg-brand-navy text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    Excel ile Stok Adeti Yükle (Stok Arttırma)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Stok kodundaki <strong className="text-emerald-300">NG</strong> kısmını kırpıp rakamları yakalar ve mevcut stoğun üzerine ekler.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isUpdating}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Gövdesi */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {loadingProducts ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 size={36} className="animate-spin text-emerald-600 mx-auto" />
                  <p className="text-sm font-semibold text-text">Ürün kataloğu taranıyor...</p>
                  <p className="text-xs text-text-muted">Kayıtlı ürünler hafızaya alınıyor.</p>
                </div>
              ) : parsedRows.length === 0 ? (
                /* 1. ADIM: DOSYA YÜKLEME ALANI */
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
                  >
                    <div className="p-4 bg-emerald-100 text-emerald-700 rounded-full group-hover:scale-110 transition-transform">
                      <FileSpreadsheet size={36} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-text">
                        Excel (.xlsx, .xls, .csv) Stok Listenizi Buraya Yükleyin
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        Sistem ürün kodundaki başında yer alan <strong>NG</strong> ekini kırpıp rakamlardan ürünü bulacak ve stoğu arttıracaktır.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs">
                      <Upload size={14} /> Dosya Seç
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Kural Bilgilendirme Kutusu */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
                    <p className="font-bold flex items-center gap-1.5 text-slate-900">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      Nasıl Çalışır?
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      <li>
                        <strong>NG Kırpma:</strong> Örneğin Excel'de <code>NG23123</code> veya <code>NG55018167</code> yazıyorsa, <code>NG</code> kısmı atılır ve <code>23123</code> veya <code>55018167</code> rakamları ile sistemdeki ürün kodu birebir eşleştirilir.
                      </li>
                      <li>
                        <strong>Sadece Arttırma:</strong> Ürünün mevcut stoğu 10 ise, Excel'den 5 gelirse yeni stok <strong>15</strong> olur.
                      </li>
                      <li>
                        <strong>Stoklarımızda Olmayanlar:</strong> Sistemde bulunamayan ürünlerin stokları <strong>kesinlikle değişmez</strong>, sisteme eklenmez, güvenle atlanır.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* 2. ADIM: EŞLEŞTİRME VE ÖNİZLEME ALANI */
                <div className="space-y-4">
                  {/* Dosya ve Sütun Seçimi */}
                  <div className="bg-slate-50 border border-border p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={18} className="text-emerald-600" />
                      <span className="font-bold text-text truncate max-w-xs">{fileName}</span>
                      <button
                        onClick={() => {
                          setParsedRows([]);
                          setRawRows([]);
                          setFileName("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-text-muted hover:text-rose-600 underline text-[11px]"
                      >
                        Değiştir
                      </button>
                    </div>

                    {/* Sütun Eşleştiriciler */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted mr-1">Kod:</label>
                        <select
                          value={codeCol}
                          onChange={(e) => handleColumnChange(e.target.value, nameCol, unitCol, qtyCol)}
                          className="border border-border rounded px-2 py-1 text-xs bg-white font-medium"
                        >
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-text-muted mr-1">Ürün Adı:</label>
                        <select
                          value={nameCol}
                          onChange={(e) => handleColumnChange(codeCol, e.target.value, unitCol, qtyCol)}
                          className="border border-border rounded px-2 py-1 text-xs bg-white font-medium"
                        >
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-text-muted mr-1">Birim:</label>
                        <select
                          value={unitCol}
                          onChange={(e) => handleColumnChange(codeCol, nameCol, e.target.value, qtyCol)}
                          className="border border-border rounded px-2 py-1 text-xs bg-white font-medium"
                        >
                          <option value="">(Otomatik Tahmin)</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-text-muted mr-1">Stok:</label>
                        <select
                          value={qtyCol}
                          onChange={(e) => handleColumnChange(codeCol, nameCol, unitCol, e.target.value)}
                          className="border border-border rounded px-2 py-1 text-xs bg-white font-medium"
                        >
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* İŞLEM MODU SEÇİCİ BANNER */}
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-bold text-emerald-950">İşlem Modu:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="syncMode"
                          checked={syncMode === "set"}
                          onChange={() => setSyncMode("set")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-emerald-900">
                          🎯 Stokları Eşitle (Yeni Stok = Excel Miktarı)
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="syncMode"
                          checked={syncMode === "add"}
                          onChange={() => setSyncMode("add")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-700">
                          ➕ Mevcut Stoğun Üstüne Ekle
                        </span>
                      </label>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                      <input
                        type="checkbox"
                        checked={createMissing}
                        onChange={(e) => setCreateMissing(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-emerald-900">
                        Sistemde olmayan ürünleri yeni olarak ekle
                      </span>
                    </label>
                  </div>

                  {/* Özet Kartları */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <p className="text-[11px] text-text-muted">Excel Toplam Satır</p>
                      <p className="text-lg font-bold text-text">{totalRows}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <p className="text-[11px] text-emerald-800 font-semibold">Sistemde Eşleşen</p>
                      <p className="text-lg font-bold text-emerald-700">{matchedRows.length} Ürün</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <p className="text-[11px] text-amber-800 font-semibold">
                        {createMissing ? "Yeni Eklenecek" : "Atlanacak (Kayıtsız)"}
                      </p>
                      <p className="text-lg font-bold text-amber-700">{notFoundRows.length} Ürün</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                      <p className="text-[11px] text-blue-800 font-semibold">İşlenecek Toplam Stok</p>
                      <p className="text-lg font-bold text-blue-700">{formatQty(totalQtyTarget)}</p>
                    </div>
                  </div>

                  {/* Filtreleme Butonları */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Filter size={13} className="text-text-muted" />
                      <button
                        type="button"
                        onClick={() => setFilterMode("all")}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          filterMode === "all" ? "bg-brand-navy text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Tümü ({parsedRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode("matched")}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          filterMode === "matched" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        ✅ Eşleşenler ({matchedRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode("not_found")}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          filterMode === "not_found" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {createMissing ? "✨ Yeni Ürünler" : "⚠️ Değişmeyenler"} ({notFoundRows.length})
                      </button>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      İlk 50 satır önizlemesi
                    </span>
                  </div>

                  {/* Önizleme Tablosu (Masaüstü) */}
                  <div className="hidden sm:block border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 sticky top-0 border-b border-border text-text-muted font-semibold">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Stok Kodu</th>
                          <th className="px-3 py-2">Stok Adı</th>
                          <th className="px-3 py-2">Birim</th>
                          <th className="px-3 py-2 text-right">Mevcut Stok</th>
                          <th className="px-3 py-2 text-right">Excel Stoğu</th>
                          <th className="px-3 py-2 text-right font-bold text-emerald-700">İşlem Sonrası</th>
                          <th className="px-3 py-2 text-center">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {displayRows.slice(0, 50).map((row) => {
                          const isMatched = row.status === "matched";
                          const currentStock = row.matchedProduct?.stock_qty ?? 0;
                          const finalStock = syncMode === "set" ? row.rawQty : currentStock + row.rawQty;
                          return (
                            <tr key={row.index} className={isMatched ? "hover:bg-emerald-50/40" : "bg-amber-50/20 hover:bg-amber-50/40"}>
                              <td className="px-3 py-2 text-text-muted">{row.index}</td>
                              <td className="px-3 py-2 font-mono text-[11px] font-semibold">{row.rawCode || "-"}</td>
                              <td className="px-3 py-2 max-w-xs truncate">
                                <span className="font-semibold text-text">
                                  {row.matchedProduct?.product_name || row.rawName || "-"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-text-muted">{row.unit}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {isMatched ? formatQty(currentStock) : "-"}
                              </td>
                              <td className="px-3 py-2 text-right font-bold tabular-nums text-blue-700">
                                {row.rawQty > 0 ? formatQty(row.rawQty) : "0"}
                              </td>
                              <td className="px-3 py-2 text-right font-bold tabular-nums text-emerald-700">
                                {formatQty(finalStock)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {isMatched ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {syncMode === "set" ? "Eşitlenecek" : "Arttırılacak"}
                                  </span>
                                ) : createMissing ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                    Yeni Eklenecek
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    Atlanacak
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobil Kart Görünümü */}
                  <div className="block sm:hidden space-y-2 max-h-60 overflow-y-auto">
                    {displayRows.slice(0, 30).map((row) => {
                      const isMatched = row.status === "matched";
                      const currentStock = row.matchedProduct?.stock_qty ?? 0;
                      const finalStock = syncMode === "set" ? row.rawQty : currentStock + row.rawQty;
                      return (
                        <div
                          key={row.index}
                          className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                            isMatched ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-emerald-800 font-bold">
                              {row.rawCode || `#${row.index}`}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isMatched
                                  ? "bg-emerald-100 text-emerald-800"
                                  : createMissing
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isMatched ? (syncMode === "set" ? "Eşitlenecek" : "Arttırılacak") : createMissing ? "Yeni Ürün" : "Atlanacak"}
                            </span>
                          </div>
                          <p className="font-semibold text-text">
                            {row.matchedProduct?.product_name || row.rawName || "Ürün"}
                          </p>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-100">
                            <span className="text-text-muted">Excel: {formatQty(row.rawQty)} {row.unit}</span>
                            <span className="text-emerald-900 font-extrabold">Hedef: {formatQty(finalStock)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* İlerleme Çubuğu (Güncelleme Sırasında) */}
                  {isUpdating && (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={14} className="animate-spin text-emerald-600" />
                          Stoklar İşleniyor... ({progress.current} / {progress.total})
                        </span>
                        <span>%{progress.percent}</span>
                      </div>
                      <div className="w-full bg-emerald-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-200"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Alt Butonları */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUpdating}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-text-muted hover:text-text hover:bg-slate-200 rounded-lg transition"
              >
                Kapat
              </button>

              {parsedRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmSync}
                  disabled={isUpdating || targetRows.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-sm"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>İşleniyor ({progress.current}/{progress.total})...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>
                        {syncMode === "set" ? "Stokları Eşitle / Yükle" : "Stoğu Arttır"} ({targetRows.length} Ürün)
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
