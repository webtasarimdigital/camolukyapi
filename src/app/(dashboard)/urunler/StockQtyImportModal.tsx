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
  type StockProductSummary,
  type BulkIncreaseItem,
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
  const [qtyCol, setQtyCol] = useState<string>("");

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
          raw: false,
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
        let bestQty = "";

        for (const h of detectedHeaders) {
          const l = h.toLowerCase().trim();
          if (!bestCode && (l.includes("kod") || l.includes("code") || l.includes("barkod") || l.includes("ng"))) {
            bestCode = h;
          }
          if (!bestName && (l.includes("ad") || l.includes("tanim") || l.includes("tanım") || l.includes("malzeme") || l.includes("ürün") || l.includes("urun") || l.includes("cins") || l.includes("açıklama") || l.includes("aciklama"))) {
            bestName = h;
          }
          if (!bestQty && (l.includes("adet") || l.includes("stok") || l.includes("miktar") || l.includes("kalan") || l.includes("bakiye") || l.includes("qty") || l.includes("sayim") || l.includes("sayım"))) {
            bestQty = h;
          }
        }

        // Eğer bestCode ve bestName aynı çıktıysa ayır
        if (bestCode === bestName && detectedHeaders.length > 1) {
          bestName = detectedHeaders.find((h) => h !== bestCode) || bestName;
        }

        const selectedCode = bestCode || detectedHeaders[0] || "";
        const selectedName = bestName || detectedHeaders[1] || "";
        const selectedQty = bestQty || detectedHeaders[detectedHeaders.length - 1] || "";

        setCodeCol(selectedCode);
        setNameCol(selectedName);
        setQtyCol(selectedQty);

        // Eşleştirmeyi çalıştır
        runMatching(json, catalog, selectedCode, selectedName, selectedQty);
        toast.success(`${json.length} satır Excel'den okundu.`);
      } catch (err: any) {
        toast.error("Excel dosyası okunurken hata oluştu: " + err?.message);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // Eşleştirme Motoru: NG Kırpma + Rakam Yakalama & İsim Kontrolü
  function runMatching(
    rows: Record<string, unknown>[],
    currentCatalog: StockProductSummary[],
    colCode: string,
    colName: string,
    colQty: string
  ) {
    if (!currentCatalog || currentCatalog.length === 0) return;

    // Sistemdeki ürünleri rakam haritasına ve isim haritasına indeksle
    const digitMap = new Map<string, StockProductSummary[]>();
    const nameMap = new Map<string, StockProductSummary>();

    for (const prod of currentCatalog) {
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

    const parsed: ParsedRow[] = [];

    rows.forEach((r, idx) => {
      const rawCodeVal = String(r[colCode] || "").trim();
      const rawNameVal = String(r[colName] || "").trim();
      const rawQtyVal = parseTurkishNumber(r[colQty] as string | number);

      // 1. ÖNCELİK: Kullanıcının talebi -> Stok kodundan NG kısmını kırp ve sadece rakamları al
      let matched: StockProductSummary | null = null;
      let digits = extractDigitsWithoutNG(rawCodeVal);

      // Eğer kod sütununda rakam yoksa ürün adı sütunundan da rakam aramayı dene
      if (!digits && rawNameVal) {
        digits = extractDigitsWithoutNG(rawNameVal);
      }

      if (digits && digitMap.has(digits)) {
        const candidates = digitMap.get(digits)!;
        if (candidates.length === 1) {
          matched = candidates[0];
        } else {
          // Birden fazla aday varsa isim benzerliğine bak
          const normRowName = normalizeName(rawNameVal);
          const best = candidates.find((c) => {
            const normC = normalizeName(c.product_name);
            return normRowName.includes(normC) || normC.includes(normRowName);
          });
          matched = best || candidates[0];
        }
      }

      // 2. YEDEK: İsimden tam veya normalize eşleştirme
      if (!matched && rawNameVal) {
        const normRowName = normalizeName(rawNameVal);
        if (nameMap.has(normRowName)) {
          matched = nameMap.get(normRowName)!;
        } else {
          // Kısmi içerik kontrolü
          for (const [normDbName, prod] of nameMap.entries()) {
            if (normRowName.length > 5 && normDbName.includes(normRowName)) {
              matched = prod;
              break;
            }
          }
        }
      }

      parsed.push({
        index: idx + 1,
        rawCode: rawCodeVal,
        rawName: rawNameVal,
        rawQty: rawQtyVal > 0 ? rawQtyVal : 0,
        extractedDigits: digits,
        matchedProduct: matched,
        status: matched ? "matched" : "not_found",
      });
    });

    setParsedRows(parsed);
  }

  // Sütun seçimleri değiştiğinde eşleştirmeyi yeniden çalıştır
  function handleColumnChange(newCode: string, newName: string, newQty: string) {
    setCodeCol(newCode);
    setNameCol(newName);
    setQtyCol(newQty);
    if (rawRows.length > 0) {
      runMatching(rawRows, catalog, newCode, newName, newQty);
    }
  }

  // İstatistikler
  const totalRows = parsedRows.length;
  const matchedRows = parsedRows.filter((r) => r.status === "matched" && r.rawQty > 0);
  const notFoundRows = parsedRows.filter((r) => r.status === "not_found" || r.rawQty <= 0);
  const totalQtyToAdd = matchedRows.reduce((sum, r) => sum + r.rawQty, 0);

  // Filtrelenmiş liste
  const displayRows = parsedRows.filter((r) => {
    if (filterMode === "matched") return r.status === "matched";
    if (filterMode === "not_found") return r.status === "not_found";
    return true;
  });

  // Toplu Stok Arttırma İşlemini Başlat
  async function handleConfirmIncrease() {
    if (matchedRows.length === 0) {
      toast.error("Stoğu arttırılacak eşleşen ürün bulunamadı.");
      return;
    }

    const confirmMsg = `${matchedRows.length} ürünün mevcut stoğuna toplam ${formatQty(
      totalQtyToAdd
    )} adet eklenecek. Sistemde bulunamayan ${
      notFoundRows.length
    } ürünün stoğu DEĞİŞMEYECEKTİR.\n\nİşlemi onaylıyor musunuz?`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdating(true);
    setProgress({ current: 0, total: matchedRows.length, percent: 0 });

    const batchSize = 50;
    const items: BulkIncreaseItem[] = matchedRows.map((r) => ({
      productId: r.matchedProduct!.id,
      addQty: r.rawQty,
      rawCode: r.rawCode || r.extractedDigits,
      rawName: r.rawName || r.matchedProduct!.product_name,
    }));

    let processedCount = 0;
    let totalSuccess = 0;
    let totalErrors: string[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      try {
        const res = await bulkIncreaseStock(batch);
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
        `İşlem Tamamlandı: ${totalSuccess} ürünün stoğu başarıyla arttırıldı! ${
          notFoundRows.length > 0 ? `(${notFoundRows.length} ürün bulunamadı, değişmedi.)` : ""
        }`
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
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-text-muted mr-1">Kod:</label>
                        <select
                          value={codeCol}
                          onChange={(e) => handleColumnChange(e.target.value, nameCol, qtyCol)}
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
                          onChange={(e) => handleColumnChange(codeCol, e.target.value, qtyCol)}
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
                        <label className="text-[11px] font-semibold text-text-muted mr-1">Adet:</label>
                        <select
                          value={qtyCol}
                          onChange={(e) => handleColumnChange(codeCol, nameCol, e.target.value)}
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

                  {/* Özet Kartları */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <p className="text-[11px] text-text-muted">Excel Toplam Satır</p>
                      <p className="text-lg font-bold text-text">{totalRows}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <p className="text-[11px] text-emerald-800 font-semibold">Eşleşen (Arttırılacak)</p>
                      <p className="text-lg font-bold text-emerald-700">{matchedRows.length} Ürün</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <p className="text-[11px] text-amber-800 font-semibold">Bulunamayan (Değişmeyecek)</p>
                      <p className="text-lg font-bold text-amber-700">{notFoundRows.length} Ürün</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                      <p className="text-[11px] text-blue-800 font-semibold">Eklenecek Toplam Stok</p>
                      <p className="text-lg font-bold text-blue-700">+{formatQty(totalQtyToAdd)}</p>
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
                        ⚠️ Değişmeyenler ({notFoundRows.length})
                      </button>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      İlk 50 satır gösteriliyor
                    </span>
                  </div>

                  {/* Önizleme Tablosu (Masaüstü) */}
                  <div className="hidden sm:block border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 sticky top-0 border-b border-border text-text-muted font-semibold">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Excel Kodu</th>
                          <th className="px-3 py-2">Rakam</th>
                          <th className="px-3 py-2">Eşleşen Sistem Ürünü</th>
                          <th className="px-3 py-2 text-right">Mevcut</th>
                          <th className="px-3 py-2 text-right">Eklenecek</th>
                          <th className="px-3 py-2 text-right font-bold text-emerald-700">Yeni Stok</th>
                          <th className="px-3 py-2 text-center">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {displayRows.slice(0, 50).map((row) => {
                          const isMatched = row.status === "matched";
                          const currentStock = row.matchedProduct?.stock_qty ?? 0;
                          const newStock = currentStock + row.rawQty;
                          return (
                            <tr key={row.index} className={isMatched ? "hover:bg-emerald-50/40" : "bg-amber-50/20"}>
                              <td className="px-3 py-2 text-text-muted">{row.index}</td>
                              <td className="px-3 py-2 font-mono text-[11px] font-semibold">{row.rawCode || "-"}</td>
                              <td className="px-3 py-2 font-mono text-emerald-700 font-bold">{row.extractedDigits || "-"}</td>
                              <td className="px-3 py-2 max-w-xs truncate">
                                {row.matchedProduct ? (
                                  <div>
                                    <span className="font-semibold text-text">{row.matchedProduct.product_name}</span>
                                    <span className="text-[10px] text-text-muted block font-mono">
                                      {row.matchedProduct.product_code}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-text-muted italic">{row.rawName || "Sistemde bulunamadı"}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {isMatched ? formatQty(currentStock) : "-"}
                              </td>
                              <td className="px-3 py-2 text-right font-bold tabular-nums text-emerald-600">
                                {row.rawQty > 0 ? `+${formatQty(row.rawQty)}` : "0"}
                              </td>
                              <td className="px-3 py-2 text-right font-bold tabular-nums text-emerald-700">
                                {isMatched ? formatQty(newStock) : "-"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {isMatched ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Arttırılacak
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    Değişmeyecek
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
                      const newStock = currentStock + row.rawQty;
                      return (
                        <div
                          key={row.index}
                          className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                            isMatched ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-emerald-800 font-bold">
                              Rakam: {row.extractedDigits || row.rawCode || `#${row.index}`}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isMatched ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isMatched ? "Arttırılacak" : "Değişmeyecek"}
                            </span>
                          </div>
                          <p className="font-semibold text-text">
                            {row.matchedProduct?.product_name || row.rawName || "Eşleşmeyen Ürün"}
                          </p>
                          {isMatched && (
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-100">
                              <span className="text-text-muted">Mevcut: {formatQty(currentStock)}</span>
                              <span className="text-emerald-700 font-bold">+{formatQty(row.rawQty)} Eklenecek</span>
                              <span className="text-emerald-900 font-extrabold">Yeni: {formatQty(newStock)}</span>
                            </div>
                          )}
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
                          Stoklar Güncelleniyor... ({progress.current} / {progress.total})
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
                  onClick={handleConfirmIncrease}
                  disabled={isUpdating || matchedRows.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-sm"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Stoğu Arttır ({matchedRows.length} Ürün)</span>
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
