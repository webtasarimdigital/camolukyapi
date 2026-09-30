"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { importCustomersBatch, finishCustomerImport, CustomerImportRow } from "./actions";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Building2,
  Phone,
  Tag,
} from "lucide-react";

export function CustomerImportModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CustomerImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    if (importing) return;
    setOpen(false);
    setRows([]);
    setFileName("");
    setProgress({ current: 0, total: 0, percent: 0 });
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // İlk sayfayı al
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // JSON olarak oku
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
          raw: false,
        });

        if (raw.length === 0) {
          toast.error("Excel dosyasında veri bulunamadı.");
          return;
        }

        const parsed: CustomerImportRow[] = [];

        for (const r of raw) {
          let hesapKodu = "";
          let hesapAdi = "";
          let plasiyer = "";
          let tel1 = "";
          let gsm = "";
          let borcBakiye = "";
          let alacakBakiye = "";
          let email = "";
          let adres = "";
          let vergiDairesi = "";
          let customType = "";

          for (const [rawKey, val] of Object.entries(r)) {
            const k = rawKey.trim().toLowerCase();
            const v = String(val || "").trim();
            if (!v) continue;

            // Hesap Adı / Müşteri Adı
            if (
              k.includes("hesap ad") ||
              k.includes("müşteri ad") ||
              k.includes("musteri ad") ||
              k.includes("ad soyad") ||
              k.includes("adi soyadi") ||
              k.includes("firma ad") ||
              k.includes("unvan") ||
              k.includes("ünvan") ||
              k === "müşteri" ||
              k === "musteri" ||
              k === "isim" ||
              k === "ad"
            ) {
              if (!hesapAdi) hesapAdi = v;
            }
            // Hesap Kodu / Cari Kod
            else if (
              k.includes("hesap kod") ||
              k.includes("cari kod") ||
              k === "kod" ||
              k.includes("hesap_no")
            ) {
              hesapKodu = v;
            }
            // Plasiyer / Temsilci
            else if (k.includes("plasiyer") || k.includes("temsilci")) {
              plasiyer = v;
            }
            // GSM / Cep
            else if (k.includes("gsm") || k.includes("cep") || k.includes("mobil")) {
              gsm = v;
            }
            // Telefon / Sabit Tel
            else if (k.includes("telefon") || k.includes("tel")) {
              tel1 = v;
            }
            // Borç Bakiye
            else if (k.includes("borç") || k.includes("borc")) {
              borcBakiye = v;
            }
            // Alacak Bakiye
            else if (k.includes("alacak")) {
              alacakBakiye = v;
            }
            // E-posta
            else if (k.includes("email") || k.includes("e-posta") || k.includes("eposta") || k.includes("mail")) {
              email = v;
            }
            // Adres
            else if (k.includes("adres") || k.includes("sehir") || k.includes("ilçe")) {
              adres = v;
            }
            // Vergi Dairesi
            else if (k.includes("vergi dairesi") || k === "vd") {
              vergiDairesi = v;
            }
            // Tür
            else if (k.includes("tur") || k.includes("tür")) {
              customType = v.toLowerCase();
            }
          }

          if (!hesapAdi) continue;

          // Kurumsal vs Bireysel Tespiti
          const lower = hesapAdi.toLowerCase();
          const isCorporate =
            customType.includes("kurum") ||
            customType.includes("firm") ||
            customType.includes("şirket") ||
            lower.includes("a.ş") ||
            lower.includes("a.s") ||
            lower.includes("ltd") ||
            lower.includes("şti") ||
            lower.includes("sti") ||
            lower.includes("san.") ||
            lower.includes("tic.") ||
            lower.includes("inş") ||
            lower.includes("ins") ||
            lower.includes("yapı") ||
            lower.includes("yapi") ||
            lower.includes("mimarlık") ||
            lower.includes("nalbur") ||
            lower.includes("otomotiv") ||
            lower.includes("gıda") ||
            lower.includes("turizm") ||
            lower.includes("mobilya") ||
            lower.includes("şantiye") ||
            lower.includes("eczane") ||
            lower.includes("hırdavat") ||
            lower.includes("mühendislik") ||
            lower.includes("ortaklık") ||
            lower.includes("seramik") ||
            hesapKodu.startsWith("320"); // 320 tedarikçi = kurumsal

          // Telefon birleştirme
          const phone = gsm || tel1 || null;

          // Detay notları
          const noteParts: string[] = [];
          if (hesapKodu) noteParts.push(`Hesap Kodu: ${hesapKodu}`);
          if (plasiyer) noteParts.push(`Plasiyer: ${plasiyer}`);
          if (tel1 && gsm && tel1 !== gsm) noteParts.push(`Sabit: ${tel1}`);
          if (borcBakiye && Number(borcBakiye.replace(/[^0-9.-]+/g, "")) !== 0) {
            noteParts.push(`Borç Bakiye: ${borcBakiye} TL`);
          }
          if (alacakBakiye && Number(alacakBakiye.replace(/[^0-9.-]+/g, "")) !== 0) {
            noteParts.push(`Alacak Bakiye: ${alacakBakiye} TL`);
          }

          parsed.push({
            type: isCorporate ? "kurumsal" : "bireysel",
            company_name: isCorporate ? hesapAdi : null,
            contact_name: hesapAdi,
            phone: phone,
            email: email || null,
            address: adres || null,
            tax_office: vergiDairesi || null,
            tax_number: hesapKodu || null,
            notes: noteParts.length > 0 ? noteParts.join(" | ") : null,
          });
        }

        if (parsed.length === 0) {
          toast.error(
            "Excel dosyasında müşteri veya hesap adı bulunamadı. Lütfen dosyanızda 'Hesap Adı' veya 'Müşteri Adı' sütun başlığının olduğundan emin olun."
          );
          return;
        }

        setRows(parsed);
        toast.success(
          `✅ Excel başarıyla okundu: ${parsed.length} müşteri/hesap bulundu!`
        );
      } catch (err) {
        toast.error("Excel okuma hatası: " + String(err));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (rows.length === 0 || importing) return;
    setImporting(true);

    const BATCH_SIZE = 150;
    const total = rows.length;
    let totalInserted = 0;
    let totalSkipped = 0;

    try {
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const currentCount = Math.min(i + BATCH_SIZE, total);
        const percent = Math.round((currentCount / total) * 100);

        setProgress({
          current: currentCount,
          total: total,
          percent: percent,
        });

        const res = await importCustomersBatch(chunk);
        if (!res.success) {
          toast.error("İçe aktarım durduruldu: " + (res.error || "Bilinmeyen hata"));
          break;
        }
        totalInserted += res.inserted;
        totalSkipped += res.skipped;
      }

      await finishCustomerImport();

      toast.success(
        `🎉 İçe aktarma tamamlandı! ${totalInserted} yeni müşteri eklendi${
          totalSkipped > 0 ? `, ${totalSkipped} adet mevcut kayıt atlandı.` : "."
        }`
      );

      handleClose();
      router.refresh();
    } catch (err) {
      toast.error("İçe aktarım sırasında hata: " + String(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white border border-border text-text px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface transition shadow-xs"
      >
        <FileSpreadsheet size={16} className="text-green-600" />
        Excel'den İçe Aktar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet size={20} className="text-green-700" />
                </div>
                <div>
                  <h2 className="font-bold text-text text-base">
                    Müşteri Portföyü Excel Yükleme
                  </h2>
                  <p className="text-xs text-text-muted">
                    Hesap Adı, Hesap Kodu, Plasiyer, Telefon ve GSM sütunlarını otomatik algılar
                  </p>
                </div>
              </div>
              {!importing && (
                <button
                  onClick={handleClose}
                  className="text-text-muted hover:text-text p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {rows.length === 0 ? (
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-2xl p-12 cursor-pointer hover:border-brand-navy transition bg-surface">
                  <Upload size={40} className="text-brand-navy opacity-60" />
                  <div className="text-center">
                    <p className="font-semibold text-text text-sm">
                      Müşteri Excel Dosyasını Seçin (.xlsx / .xls)
                    </p>
                    <p className="text-xs text-text-muted mt-1 max-w-md">
                      MÜŞTERİ PÖRTFÖY listenizi doğrudan seçebilirsiniz. "Hesap Kodu", "Hesap Adı",
                      "Plasiyerler", "Telefon-1", "Gsm" başlıkları otomatik eşleşir.
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  {/* Dosya Bilgisi & İstatistikler */}
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={18} className="text-green-700" />
                      <span className="text-sm font-bold text-green-900">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-green-800 bg-green-200/80 px-2.5 py-1 rounded-full">
                        <Users size={13} className="inline mr-1" />
                        {rows.length.toLocaleString("tr-TR")} Müşteri Hazır
                      </span>
                      {!importing && (
                        <button
                          onClick={() => {
                            setRows([]);
                            setFileName("");
                            if (fileRef.current) fileRef.current.value = "";
                          }}
                          className="text-xs text-red-600 hover:underline font-semibold"
                        >
                          Farklı Dosya Seç
                        </button>
                      )}
                    </div>
                  </div>

                  {/* İlerleme Çubuğu (Yükleme Esnasında) */}
                  {importing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                        <span className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin text-blue-600" />
                          Müşteriler veritabanına aktarılıyor...
                        </span>
                        <span>
                          %{progress.percent} ({progress.current.toLocaleString("tr-TR")} /{" "}
                          {progress.total.toLocaleString("tr-TR")})
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-200 rounded-full"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-blue-700">
                        Toplu aktarım sürüyor. Lütfen bu pencereyi kapatmayınız.
                      </p>
                    </div>
                  )}

                  {/* Önizleme Tablosu */}
                  <div className="border border-border rounded-xl overflow-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-surface sticky top-0 shadow-2xs">
                        <tr>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">#</th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">Tür</th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">
                            Hesap / Müşteri Adı
                          </th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">
                            Telefon / GSM
                          </th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">
                            Hesap Kodu
                          </th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">
                            Plasiyer & Notlar
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.slice(0, 100).map((r, i) => (
                          <tr key={i} className="hover:bg-surface/80">
                            <td className="px-3 py-2 text-text-muted font-mono">{i + 1}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  r.type === "kurumsal"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {r.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium text-text">{r.contact_name}</td>
                            <td className="px-3 py-2 text-text-muted font-mono">
                              {r.phone || "—"}
                            </td>
                            <td className="px-3 py-2 text-text-muted font-mono">
                              {r.tax_number || "—"}
                            </td>
                            <td className="px-3 py-2 text-text-muted max-w-[220px] truncate">
                              {r.notes || "—"}
                            </td>
                          </tr>
                        ))}
                        {rows.length > 100 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-2.5 text-center text-text-muted italic bg-surface/40"
                            >
                              … ve {(rows.length - 100).toLocaleString("tr-TR")} satır daha (hepsi
                              aktarılacak)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bilgi Kutusu */}
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-900">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-semibold">Mükerrer Kayıt Güvencesi:</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Sistemde aynı isimle zaten kayıtlı müşteriler otomatik atlanır, çift kayıt
                        oluşturulmaz.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4 flex items-center justify-between gap-3">
              <button
                onClick={handleClose}
                disabled={importing}
                className="px-4 py-2 text-sm text-text-muted hover:text-text transition disabled:opacity-50"
              >
                Kapat
              </button>
              {rows.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 bg-brand-navy text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50 shadow-xs"
                >
                  {importing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Aktarılıyor (%{progress.percent})…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {rows.length.toLocaleString("tr-TR")} Müşteriyi İçe Aktar
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
