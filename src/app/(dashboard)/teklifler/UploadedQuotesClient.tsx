"use client";

import { useState, useTransition, useMemo } from "react";
import type { UploadedQuote } from "./uploaded-quotes-actions";
import { saveUploadedQuote, deleteUploadedQuote } from "./uploaded-quotes-actions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  Calendar,
  User,
  Paperclip,
  ExternalLink,
  Wallet,
} from "lucide-react";

interface Props {
  initialQuotes: UploadedQuote[];
}

export function UploadedQuotesClient({ initialQuotes }: Props) {
  const [quotes, setQuotes] = useState<UploadedQuote[]>(initialQuotes);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>("");
  const [previewPdf, setPreviewPdf] = useState<UploadedQuote | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return quotes.filter((item) => {
      return (
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.customer_name && item.customer_name.toLowerCase().includes(q)) ||
        item.file_name.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    });
  }, [quotes, search]);

  const totalAmount = quotes.reduce((sum, q) => sum + (Number(q.amount) || 0), 0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      toast.error("Lütfen sadece PDF formatında dosya seçin.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleOpenNew() {
    setSelectedFile(null);
    setFileDataUrl("");
    setIsModalOpen(true);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" isimli PDF teklif kaydını silmek istediğinize emin misiniz?`)) return;

    startTransition(async () => {
      const res = await deleteUploadedQuote(id);
      if (res.success) {
        setQuotes((prev) => prev.filter((q) => q.id !== id));
        toast.success("PDF teklif kaydı silindi.");
      } else {
        toast.error(res.error || "Silinemedi.");
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fileDataUrl || !selectedFile) {
      toast.error("Lütfen bir PDF dosyası seçin.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("file_url", fileDataUrl);
    formData.set("file_name", selectedFile.name);
    formData.set("file_size", String(selectedFile.size));

    startTransition(async () => {
      const res = await saveUploadedQuote(formData);
      if (res.success && res.quote) {
        setQuotes((prev) => [res.quote!, ...prev]);
        toast.success("PDF teklifi başarıyla yüklendi ve arşivlendi!");
        setIsModalOpen(false);
      } else {
        toast.error(res.error || "Yükleme başarısız oldu.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
            <FileText size={15} className="text-brand-navy" /> Arşivlenmiş PDF Teklifleri
          </span>
          <p className="text-2xl font-black text-text mt-1">{quotes.length} Adet PDF</p>
          <p className="text-[11px] text-text-muted mt-0.5">Dışarıdan yüklenen tüm PDF teklif belgeleri</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
            <Wallet size={15} className="text-emerald-600" /> Toplam PDF Teklif Tutarı
          </span>
          <p className="text-2xl font-black text-emerald-950 mt-1">{formatCurrency(totalAmount)}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">PDF belgelerinde belirtilen toplam hacim</p>
        </div>
      </div>

      {/* Arama ve Yeni Yükle Butonu */}
      <div className="bg-white p-4 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Başlık, müşteri adı veya dosya adı ara..."
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs outline-none focus:border-brand-navy"
          />
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Upload size={16} /> + PDF Teklif Yükle
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Teklif Başlığı / Konu</th>
                <th className="py-3 px-4">Müşteri Adı</th>
                <th className="py-3 px-4 text-right">Tutar (₺)</th>
                <th className="py-3 px-4">Dosya Bilgisi</th>
                <th className="py-3 px-4">Not / Açıklama</th>
                <th className="py-3 px-4 text-center w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    Arşivlenmiş PDF teklifi bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-surface/50 transition">
                    <td className="py-3 px-4 font-semibold text-text whitespace-nowrap">
                      {item.quote_date || formatDate(item.created_at)}
                    </td>
                    <td className="py-3 px-4 font-bold text-text">
                      <div className="flex items-center gap-1.5">
                        <FileText size={15} className="text-brand-navy flex-shrink-0" />
                        <span>{item.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-text">
                      {item.customer_name || "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-brand-navy tabular-nums text-sm whitespace-nowrap">
                      {item.amount && item.amount > 0 ? formatCurrency(item.amount) : "-"}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      <div className="truncate max-w-[200px]">{item.file_name}</div>
                      {item.file_size && item.file_size > 0 ? (
                        <div className="text-[10px] text-text-muted/70">
                          {(item.file_size / 1024).toFixed(0)} KB
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-text-muted">
                      {item.notes || "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPreviewPdf(item)}
                          className="p-1.5 text-brand-navy hover:bg-surface rounded-lg border border-border transition"
                          title="PDF Önizle"
                        >
                          <Eye size={14} />
                        </button>
                        <a
                          href={item.file_url}
                          download={item.file_name}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-border transition"
                          title="PDF İndir"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-border transition"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF YÜKLEME MODALI (Madde 2) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <FileText className="text-brand-navy" size={20} />
                PDF Teklif Dosyası Yükle
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* PDF Dosyası Seçme */}
              <div className="border-2 border-dashed border-brand-navy/30 bg-surface/50 rounded-xl p-4 text-center space-y-2">
                <Upload size={28} className="mx-auto text-brand-navy" />
                <p className="font-bold text-text">PDF Dosyası Seçin</p>
                <input
                  type="file"
                  required
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="block mx-auto text-xs text-text-muted file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-navy file:text-white cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Teklif Başlığı / Konu *</label>
                <input
                  type="text"
                  required
                  name="title"
                  defaultValue={selectedFile ? selectedFile.name.replace(".pdf", "") : ""}
                  placeholder="Örn: Maslak Şantiye Granit Teklifi"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Müşteri Adı</label>
                  <input
                    type="text"
                    name="customer_name"
                    placeholder="Yılmaz İnşaat Ltd."
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Teklif Tarihi *</label>
                  <input
                    type="date"
                    required
                    name="quote_date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Toplam Tutar (₺)</label>
                <input
                  type="number"
                  step="any"
                  name="amount"
                  placeholder="0.00"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Not / Açıklama</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Teklif opsiyonu, döviz kuru notu veya teslim süresi..."
                  className="w-full border border-border rounded-lg p-2.5 bg-surface outline-none focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-text-muted hover:text-text font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending || !fileDataUrl}
                  className="bg-brand-navy text-white px-5 py-2 rounded-lg font-bold hover:bg-brand-navy/90 transition shadow-xs disabled:opacity-50"
                >
                  {isPending ? "Yükleniyor..." : "PDF Teklifi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF ÖNİZLEME MODALI */}
      {previewPdf && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-text flex items-center gap-2">
                  <FileText className="text-brand-navy" size={20} />
                  {previewPdf.title}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {previewPdf.customer_name ? `${previewPdf.customer_name} • ` : ""}
                  {previewPdf.file_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdf.file_url}
                  download={previewPdf.file_name}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Download size={13} /> İndir
                </a>
                <button
                  onClick={() => setPreviewPdf(null)}
                  className="text-text-muted hover:text-text font-bold text-lg p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-100 rounded-xl overflow-hidden border border-border">
              <iframe
                src={previewPdf.file_url}
                className="w-full h-full border-0"
                title={previewPdf.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
