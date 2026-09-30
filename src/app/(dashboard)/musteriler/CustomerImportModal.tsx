"use client";

import { useState, useRef, useTransition } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { importCustomersFromExcel, CustomerImportRow } from "./actions";
import { FileSpreadsheet, Upload, X, CheckCircle2, AlertCircle, Loader2, Users } from "lucide-react";

export function CustomerImportModal() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CustomerImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setOpen(false);
    setRows([]);
    setFileName("");
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

        // JSON'a dönüştür — başlık satırını otomatik algıla
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
          raw: false,
        });

        if (raw.length === 0) {
          toast.error("Excel dosyasında veri bulunamadı.");
          return;
        }

        // Sütun isimlerini normalize et (küçük harf, boşluk → _)
        const normalize = (s: string) =>
          String(s)
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[çğüışöÇĞÜİŞÖ]/g, (c) =>
              "cguis o cguis o".split(" ")[
                "çğüişöÇĞÜİŞÖ".indexOf(c)
              ] || c
            );

        // Kolon eşleşme tablosu — olası başlıklar
        const colMap: Record<string, keyof CustomerImportRow | "skip"> = {
          // contact_name
          musteri_adi: "contact_name",
          musteri_ad: "contact_name",
          ad_soyad: "contact_name",
          adi_soyadi: "contact_name",
          adi: "contact_name",
          isim: "contact_name",
          contact_name: "contact_name",
          customer_name: "contact_name",
          firma_adi: "company_name",
          firma: "company_name",
          sirket: "company_name",
          sirket_adi: "company_name",
          unvan: "company_name",
          company_name: "company_name",
          // phone
          telefon: "phone",
          tel: "phone",
          gsm: "phone",
          cep: "phone",
          phone: "phone",
          // email
          email: "email",
          eposta: "email",
          e_posta: "email",
          mail: "email",
          // address
          adres: "address",
          address: "address",
          // tax_office
          vergi_dairesi: "tax_office",
          vd: "tax_office",
          // tax_number
          vergi_no: "tax_number",
          vkn: "tax_number",
          tcno: "tax_number",
          tc_no: "tax_number",
          vergi_numarasi: "tax_number",
          // type
          tur: "type",
          tür: "type",
          musteri_turu: "type",
          type: "type",
          // notes
          not: "notes",
          notlar: "notes",
          aciklama: "notes",
          notes: "notes",
        };

        const parsed: CustomerImportRow[] = raw.map((r) => {
          const mapped: Partial<CustomerImportRow> & { [k: string]: unknown } = {};
          for (const [rawKey, val] of Object.entries(r)) {
            const nk = normalize(rawKey);
            const target = colMap[nk];
            if (target && target !== "skip") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (mapped as any)[target] = String(val || "").trim() || null;
            }
          }

          // type normalize: kurumsal / bireysel
          const rawType = String(mapped.type || "").toLowerCase();
          const type: "bireysel" | "kurumsal" =
            rawType.includes("kurum") || rawType.includes("firm") || rawType.includes("şirket")
              ? "kurumsal"
              : "bireysel";

          // contact_name yoksa company_name'i dene
          const contact_name =
            (mapped.contact_name as string) ||
            (mapped.company_name as string) ||
            "";

          return {
            type,
            company_name: (mapped.company_name as string) || null,
            contact_name,
            phone: (mapped.phone as string) || null,
            email: (mapped.email as string) || null,
            address: (mapped.address as string) || null,
            tax_office: (mapped.tax_office as string) || null,
            tax_number: (mapped.tax_number as string) || null,
            notes: (mapped.notes as string) || null,
          };
        }).filter((r) => r.contact_name);

        if (parsed.length === 0) {
          toast.error(
            "Tanınabilir sütun bulunamadı. Lütfen dosyanızda 'Müşteri Adı', 'Telefon', 'E-Posta' gibi başlıklar olduğundan emin olun."
          );
          return;
        }

        setRows(parsed);
        toast.success(`${parsed.length} müşteri satırı okundu. Gözden geçirip onaylayın.`);
      } catch (err) {
        toast.error("Excel okunamadı: " + String(err));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImport() {
    startTransition(async () => {
      try {
        const res = await importCustomersFromExcel(rows);
        toast.success(
          `✅ ${res.inserted} müşteri eklendi${res.skipped ? `, ${res.skipped} atlandı (zaten mevcut)` : ""}.`
        );
        if (res.errors.length > 0) {
          toast.error("Bazı satırlarda hata: " + res.errors.slice(0, 3).join(", "));
        }
        handleClose();
      } catch (err) {
        toast.error("İçe aktarım hatası: " + String(err));
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white border border-border text-text px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface transition"
      >
        <FileSpreadsheet size={16} className="text-green-600" />
        Excel'den İçe Aktar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-green-700" />
                </div>
                <div>
                  <h2 className="font-bold text-text text-base">Müşteri Portföy Excel Yükleme</h2>
                  <p className="text-xs text-text-muted">
                    Excel dosyanızı seçin — otomatik eşleştirir ve aktarır
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="text-text-muted hover:text-text">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Upload area */}
              {rows.length === 0 ? (
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-2xl p-10 cursor-pointer hover:border-brand-navy transition bg-surface">
                  <Upload size={36} className="text-brand-navy opacity-60" />
                  <div className="text-center">
                    <p className="font-semibold text-text">Excel dosyası seç veya buraya sürükle</p>
                    <p className="text-xs text-text-muted mt-1">
                      .xlsx / .xls — Desteklenen başlıklar: Müşteri Adı, Firma Adı, Telefon, E-Posta, Adres, Vergi No, Not
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
                <div className="space-y-3">
                  {/* File info */}
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-green-700" />
                      <span className="text-sm font-medium text-green-800">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-700 font-semibold">
                        <Users size={14} className="inline mr-1" />
                        {rows.length} müşteri hazır
                      </span>
                      <button
                        onClick={() => {
                          setRows([]);
                          setFileName("");
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="text-green-700 hover:text-red-600 ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Preview table */}
                  <div className="border border-border rounded-xl overflow-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-surface sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">#</th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">Tür</th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">Ad / Ünvan</th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">Firma</th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">Telefon</th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">E-Posta</th>
                          <th className="text-left px-3 py-2 text-text-muted font-semibold">Adres</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.slice(0, 100).map((r, i) => (
                          <tr key={i} className="hover:bg-surface">
                            <td className="px-3 py-1.5 text-text-muted">{i + 1}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.type === "kurumsal" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                                {r.type}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 font-medium text-text">{r.contact_name}</td>
                            <td className="px-3 py-1.5 text-text-muted">{r.company_name || "—"}</td>
                            <td className="px-3 py-1.5 text-text-muted">{r.phone || "—"}</td>
                            <td className="px-3 py-1.5 text-text-muted">{r.email || "—"}</td>
                            <td className="px-3 py-1.5 text-text-muted truncate max-w-[160px]">{r.address || "—"}</td>
                          </tr>
                        ))}
                        {rows.length > 100 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-2 text-center text-text-muted italic">
                              … ve {rows.length - 100} satır daha (hepsi aktarılacak)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Info note */}
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Sistemde zaten kayıtlı müşteriler (aynı isimle) atlanır, tekrar eklenmez.
                      {rows.length > 50 && " Çok sayıda müşteri için işlem biraz sürebilir."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4 flex items-center justify-between gap-3">
              <button onClick={handleClose} className="px-4 py-2 text-sm text-text-muted hover:text-text transition">
                İptal
              </button>
              {rows.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={isPending}
                  className="flex items-center gap-2 bg-brand-navy text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {isPending ? (
                    <><Loader2 size={15} className="animate-spin" /> Aktarılıyor…</>
                  ) : (
                    <><CheckCircle2 size={15} /> {rows.length} Müşteriyi Aktar</>
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
