"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { Transporter, calculateDueDate12 } from "@/lib/data/types";
import {
  actionSaveTransporter,
  actionSaveTransportersBatch,
  actionDeleteTransporter,
} from "@/lib/data/actions";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  CreditCard,
  Building,
  User,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Calendar,
  X,
  Copy,
  Check,
  Eye,
  Paperclip,
} from "lucide-react";

interface Props {
  initialItems: Transporter[];
  userRole: string;
  userName: string;
}

type VadeFilterType = "all" | "due" | "pending" | "paid";

export function TransporterClient({ initialItems, userName }: Props) {
  const [items, setItems] = useState<Transporter[]>(initialItems);
  const [search, setSearch] = useState("");
  const [vadeFilter, setVadeFilter] = useState<VadeFilterType>("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transporter | null>(null);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [modalDocs, setModalDocs] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const [viewingDocs, setViewingDocs] = useState<{ title: string; docs: Array<{ name: string; url: string; type: string }> } | null>(null);

  // Excel İçe Aktarım State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<any[]>([]);
  const [isExcelProcessing, setIsExcelProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // 12 Gün Kuralı Hesaplaması: Vadesi dolan ve yaklaşan nakliye ödemeleri
  const { dueList, pendingList, paidList } = useMemo(() => {
    const due: Transporter[] = [];
    const pending: Transporter[] = [];
    const paid: Transporter[] = [];

    items.forEach((item) => {
      if (item.status === "Ödendi") {
        paid.push(item);
      } else if (item.due_date <= todayStr) {
        due.push(item);
      } else {
        pending.push(item);
      }
    });

    return { dueList: due, pendingList: pending, paidList: paid };
  }, [items, todayStr]);

  // Filtrelenmiş Liste (Madde 1)
  const filtered = useMemo(() => {
    return items.filter((item) => {
      // Vade Durumu Filtresi
      if (vadeFilter === "due" && (item.status === "Ödendi" || item.due_date > todayStr)) return false;
      if (vadeFilter === "pending" && (item.status === "Ödendi" || item.due_date <= todayStr)) return false;
      if (vadeFilter === "paid" && item.status !== "Ödendi") return false;

      // Tarih Aralığı Filtresi (Taşıma Tarihine göre)
      if (startDateFilter && item.transport_date < startDateFilter) return false;
      if (endDateFilter && item.transport_date > endDateFilter) return false;

      // Arama Filtresi
      const q = search.toLowerCase();
      const matchQ =
        !q ||
        item.transporter_name.toLowerCase().includes(q) ||
        item.iban.toLowerCase().includes(q) ||
        (item.invoice_no && item.invoice_no.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      return matchQ;
    });
  }, [items, vadeFilter, startDateFilter, endDateFilter, search, todayStr]);

  const totalDueAmount = dueList.reduce((sum, i) => sum + i.amount, 0);
  const totalPendingAmount = pendingList.reduce((sum, i) => sum + i.amount, 0);
  const totalPaidAmount = paidList.reduce((sum, i) => sum + i.amount, 0);

  function handleOpenNew() {
    setEditingItem(null);
    setModalDocs([]);
    setIsModalOpen(true);
  }

  function handleEdit(item: Transporter) {
    setEditingItem(item);
    const docs = Array.isArray(item.documents) ? item.documents : [];
    if (item.document_url && !docs.some((d: any) => d.url === item.document_url)) {
      docs.unshift({ name: "Fatura/Dekont Eki", url: item.document_url, type: "pdf" });
    }
    setModalDocs(docs);
    setIsModalOpen(true);
  }

  function handleCopyIban(iban: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    toast.success("IBAN kopyalandı!");
    setTimeout(() => setCopiedIban(null), 2000);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setModalDocs((prev) => [
            ...prev,
            {
              name: file.name,
              url: reader.result as string,
              type: file.type.includes("pdf") ? "pdf" : "image",
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function handleRemoveDoc(idx: number) {
    setModalDocs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu nakliye kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await actionDeleteTransporter(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Nakliye kaydı silindi.");
    });
  }

  async function handleToggleStatus(item: Transporter) {
    const newStatus = item.status === "Ödendi" ? "Ödenmedi" : "Ödendi";
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", item.id);
      formData.set("transporter_name", item.transporter_name);
      formData.set("transport_date", item.transport_date);
      formData.set("amount", String(item.amount));
      formData.set("iban", item.iban);
      formData.set("status", newStatus);
      formData.set("notes", item.notes || "");
      formData.set("invoice_no", item.invoice_no || "");
      formData.set("documents", JSON.stringify(item.documents || []));

      const res = await actionSaveTransporter(formData);
      if (res.success && res.transporter) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? res.transporter! : i))
        );
        toast.success(`Nakliyeci ödemesi "${newStatus}" olarak işaretlendi!`);
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("documents", JSON.stringify(modalDocs));
    if (modalDocs.length > 0 && !formData.get("document_url")) {
      formData.set("document_url", modalDocs[0].url);
    }

    startTransition(async () => {
      const res = await actionSaveTransporter(formData);
      if (res.success && res.transporter) {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.id === res.transporter!.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.transporter!;
            return next;
          }
          return [res.transporter!, ...prev];
        });
        toast.success(editingItem ? "Nakliye kaydı güncellendi!" : "Yeni nakliye kaydı kaydedildi!");
        setIsModalOpen(false);
      } else {
        toast.error(res.error || "Nakliye kaydı kaydedilemedi.");
      }
    });
  }

  // EXCEL IMPORT HANDLERS (Madde 18)
  function handleExcelFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          toast.error("Excel dosyasında veri bulunamadı.");
          return;
        }

        // Normalize columns
        const parsed = rawJson.map((row) => {
          // Detect fields by common Turkish & English names
          const name =
            row["Firma"] ||
            row["Firma Adı"] ||
            row["Nakliyeci"] ||
            row["Nakliyeci Adı"] ||
            row["Şoför"] ||
            row["İsim"] ||
            row["transporter_name"] ||
            "";

          let dateVal = row["Tarih"] || row["Taşıma Tarihi"] || row["Sevk Tarihi"] || row["transport_date"] || todayStr;
          if (dateVal instanceof Date) {
            dateVal = dateVal.toISOString().split("T")[0];
          } else if (typeof dateVal === "string" && dateVal.includes(".")) {
            const parts = dateVal.trim().split(".");
            if (parts.length === 3) {
              dateVal = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            }
          }

          let amountVal = row["Tutar"] || row["Fiyat"] || row["Ücret"] || row["amount"] || 0;
          if (typeof amountVal === "string") {
            amountVal = parseFloat(amountVal.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
          }

          const ibanVal = row["IBAN"] || row["Banka IBAN"] || row["iban"] || "";
          const invoiceVal = row["Fatura No"] || row["İrsaliye No"] || row["invoice_no"] || "";
          const notesVal = row["Not"] || row["Açıklama"] || row["Güzergah"] || row["notes"] || "";
          const statusVal = String(row["Durum"] || row["Statü"] || "").toLowerCase().includes("öden") ? "Ödendi" : "Ödenmedi";

          return {
            transporter_name: String(name).trim(),
            transport_date: String(dateVal).trim(),
            amount: Number(amountVal) || 0,
            iban: String(ibanVal).trim(),
            invoice_no: String(invoiceVal).trim(),
            notes: String(notesVal).trim(),
            status: statusVal,
          };
        }).filter((r) => r.transporter_name.length > 0);

        if (parsed.length === 0) {
          toast.error("Excel tablosunda geçerli nakliyeci satırı bulunamadı.");
          return;
        }

        setExcelPreviewData(parsed);
        toast.success(`${parsed.length} adet nakliye kaydı algılandı.`);
      } catch (err: any) {
        console.error("Excel parse error:", err);
        toast.error("Excel dosyası okunurken hata oluştu.");
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleImportExcelConfirm() {
    if (excelPreviewData.length === 0) return;
    setIsExcelProcessing(true);

    try {
      const res = await actionSaveTransportersBatch(excelPreviewData);
      if (res.success && res.transporters) {
        setItems((prev) => [...res.transporters!, ...prev]);
        toast.success(`🎉 ${res.count} adet nakliye kaydı başarıyla içeri aktarıldı! (12 günlük vadeler otomatik hesaplandı)`);
        setIsExcelModalOpen(false);
        setExcelPreviewData([]);
      } else {
        toast.error(res.error || "İçe aktarım başarısız oldu.");
      }
    } catch {
      toast.error("İçe aktarım sırasında beklenmedik hata.");
    } finally {
      setIsExcelProcessing(false);
    }
  }

  const hasActiveFilters =
    vadeFilter !== "all" ||
    startDateFilter !== "" ||
    endDateFilter !== "" ||
    search !== "";

  return (
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Truck className="text-brand-navy" size={24} />
            Nakliyeler ve Taşıma Ödemeleri
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Nakliyeci IBAN bilgileri, taşıma tarihleri, PDF/fatura ekleri ve otomatik 12 gün sonra ödeme takip sistemi
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setExcelPreviewData([]);
              setIsExcelModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={15} /> Toplu Excel İçe Aktar
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={16} /> + Yeni Nakliye Kaydı Gir
          </button>
        </div>
      </div>

      {/* 12 GÜN UYARI BANNER'I */}
      {dueList.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-950 flex items-center gap-2">
                ⚠️ DİKKAT: 12 GÜN SÜRESİ DOLMUŞ NAKLİYE ÖDEMELERİ VAR!
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Taşıma tarihinden 12 gün geçmiş toplam <strong>{dueList.length} adet nakliye</strong> için ödemenin yapılması gerekiyor. (Toplam: <strong>{formatCurrency(totalDueAmount)}</strong>)
              </p>
            </div>
          </div>
          <button
            onClick={() => setVadeFilter("due")}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
          >
            Ödemesi Gecikenleri Filtrele
          </button>
        </div>
      )}

      {/* KPI KARTLARI (Tıklanabilir Vade Filtreleri) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setVadeFilter(vadeFilter === "due" ? "all" : "due")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            vadeFilter === "due"
              ? "bg-rose-100/60 border-rose-400 ring-2 ring-rose-500 shadow-sm"
              : "bg-white border-rose-200 hover:border-rose-300 shadow-xs"
          }`}
        >
          <span className="text-xs font-bold text-rose-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock size={15} /> 12 Günü Dolanlar (Acil Ödeme)
            </span>
            {vadeFilter === "due" && <Check size={14} className="text-rose-700 font-bold" />}
          </span>
          <p className="text-2xl font-black text-rose-950 mt-1">{dueList.length} Kayıt</p>
          <p className="text-xs text-rose-700 font-bold mt-0.5">{formatCurrency(totalDueAmount)}</p>
        </div>

        <div
          onClick={() => setVadeFilter(vadeFilter === "pending" ? "all" : "pending")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            vadeFilter === "pending"
              ? "bg-amber-100/60 border-amber-400 ring-2 ring-amber-500 shadow-sm"
              : "bg-white border-amber-200 hover:border-amber-300 shadow-xs"
          }`}
        >
          <span className="text-xs font-bold text-amber-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Truck size={15} /> 12 Günü Devam Edenler (Bekleyen)
            </span>
            {vadeFilter === "pending" && <Check size={14} className="text-amber-700 font-bold" />}
          </span>
          <p className="text-2xl font-black text-amber-950 mt-1">{pendingList.length} Kayıt</p>
          <p className="text-xs text-amber-700 font-bold mt-0.5">{formatCurrency(totalPendingAmount)}</p>
        </div>

        <div
          onClick={() => setVadeFilter(vadeFilter === "paid" ? "all" : "paid")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            vadeFilter === "paid"
              ? "bg-emerald-100/60 border-emerald-400 ring-2 ring-emerald-500 shadow-sm"
              : "bg-white border-emerald-200 hover:border-emerald-300 shadow-xs"
          }`}
        >
          <span className="text-xs font-bold text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} /> Ödemesi Yapılanlar
            </span>
            {vadeFilter === "paid" && <Check size={14} className="text-emerald-700 font-bold" />}
          </span>
          <p className="text-2xl font-black text-emerald-950 mt-1">{paidList.length} Kayıt</p>
          <p className="text-xs text-emerald-700 font-bold mt-0.5">{formatCurrency(totalPaidAmount)}</p>
        </div>
      </div>

      {/* ZENGİN FİLTRELEME & ARAMA PANELİ (Madde 1) */}
      <div className="bg-white p-4 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nakliyeci adı, IBAN, fatura no veya açıklama ara..."
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs outline-none focus:border-brand-navy"
          />
        </div>

        {/* Tarih Aralığı Filtresi */}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Calendar size={14} className="text-brand-navy" />
          <span className="font-semibold text-text">Taşıma Tarihi:</span>
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-surface outline-none focus:bg-white"
          />
          <span>-</span>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="border border-border rounded-lg px-2.5 py-1.5 text-xs bg-surface outline-none focus:bg-white"
          />
        </div>

        {/* Durum Filtresi */}
        <select
          value={vadeFilter}
          onChange={(e) => setVadeFilter(e.target.value as VadeFilterType)}
          className="border border-border rounded-xl px-3 py-2 text-xs bg-white font-semibold outline-none"
        >
          <option value="all">Tüm Nakliyeler</option>
          <option value="due">⚠️ 12 Günü Dolanlar (Acil)</option>
          <option value="pending">⏳ Bekleyenler (12 Gün Devam)</option>
          <option value="paid">✓ Ödenenler</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setVadeFilter("all");
              setStartDateFilter("");
              setEndDateFilter("");
              setSearch("");
            }}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1.5 rounded hover:bg-rose-50 transition"
          >
            <X size={13} /> Temizle
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Nakliyeci Firma / Şoför</th>
                <th className="py-3 px-4">Taşıma Tarihi</th>
                <th className="py-3 px-4 text-right">Tutar (₺)</th>
                <th className="py-3 px-4">Banka IBAN</th>
                <th className="py-3 px-4">Fatura No</th>
                <th className="py-3 px-4">12 Günlük Son Ödeme Vadesi</th>
                <th className="py-3 px-4 text-center">Belge / Fatura</th>
                <th className="py-3 px-4">Not / Güzergah</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-center w-16">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted">
                    Kayıtlı nakliye ödemesi bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isDue = item.status !== "Ödendi" && item.due_date <= todayStr;
                  const docs = Array.isArray(item.documents) ? item.documents : [];
                  const hasDoc = Boolean(item.document_url) || docs.length > 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface/50 transition ${
                        isDue ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-text">
                        <div className="flex items-center gap-1.5">
                          <Truck size={14} className="text-brand-navy flex-shrink-0" />
                          <span>{item.transporter_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-muted whitespace-nowrap">{item.transport_date}</td>
                      <td className="py-3 px-4 text-right font-black text-brand-navy tabular-nums text-sm whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-4">
                        {item.iban ? (
                          <button
                            type="button"
                            onClick={(e) => handleCopyIban(item.iban, e)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted hover:text-brand-navy bg-surface px-1.5 py-0.5 rounded border border-border cursor-pointer transition"
                            title="IBAN Kopyala"
                          >
                            <CreditCard size={11} className="text-brand-navy" />
                            <span className="truncate max-w-[130px]">{item.iban}</span>
                            {copiedIban === item.iban ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted">
                        {item.invoice_no || "-"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isDue ? "text-rose-600 underline font-black" : "text-text"
                            }`}
                          >
                            {item.due_date}
                          </span>
                          {isDue && (
                            <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse">
                              12 GÜN DOLDU!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasDoc ? (
                          <button
                            onClick={() => {
                              const list = [...docs];
                              if (item.document_url && !list.some((d: any) => d.url === item.document_url)) {
                                list.unshift({ name: "Fatura Belgesi", url: item.document_url, type: "pdf" });
                              }
                              setViewingDocs({
                                title: `${item.transporter_name} - Nakliye Belgeleri`,
                                docs: list,
                              });
                            }}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold transition"
                            title="PDF / Belgeyi İncele"
                          >
                            <FileText size={11} /> {docs.length > 0 ? `${docs.length} Belge` : "PDF Gör"}
                          </button>
                        ) : (
                          <span className="text-text-muted/60 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-text-muted">
                        {item.notes || "-"}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={isPending}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                            item.status === "Ödendi"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                        >
                          {item.status === "Ödendi" ? "✓ Ödendi" : "✕ Ödenmedi"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 rounded text-brand-navy hover:bg-surface transition"
                            title="Düzenle / Belge Ekle"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded text-rose-400 hover:text-rose-600 transition"
                            title="Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* YENİ / DÜZENLE MODALI (PDF / Dekont Ekli) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <Truck className="text-brand-navy" size={20} />
                {editingItem ? "Nakliye Kaydını Düzenle" : "Yeni Nakliye Kaydı Gir"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {editingItem && <input type="hidden" name="id" value={editingItem.id} />}

              <div>
                <label className="block font-semibold text-text mb-1">Nakliyeci Firma / Şoför Adı *</label>
                <input
                  type="text"
                  required
                  name="transporter_name"
                  defaultValue={editingItem?.transporter_name || ""}
                  placeholder="Örn: Yıldız Nakliyat / Ali Usta"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Taşıma Tarihi *</label>
                  <input
                    type="date"
                    required
                    name="transport_date"
                    defaultValue={editingItem?.transport_date || todayStr}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-semibold"
                  />
                  <span className="text-[10px] text-text-muted mt-0.5 block">
                    * 12 gün sonra otomatik vade dolumu
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Tutar (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    name="amount"
                    defaultValue={editingItem?.amount || ""}
                    placeholder="3500"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Banka IBAN Numarası</label>
                  <input
                    type="text"
                    name="iban"
                    defaultValue={editingItem?.iban || ""}
                    placeholder="TRxx xxxx xxxx xxxx xxxx xx"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Fatura / İrsaliye No</label>
                  <input
                    type="text"
                    name="invoice_no"
                    defaultValue={editingItem?.invoice_no || ""}
                    placeholder="NAK-2026-004"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-mono"
                  />
                </div>
              </div>

              {/* PDF & DEKONT BELGE EKİ (Madde 19) */}
              <div className="space-y-2 bg-surface/70 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-text flex items-center gap-1.5">
                    <Paperclip size={14} className="text-brand-navy" />
                    PDF Fatura / Dekont Ekleri ({modalDocs.length})
                  </label>
                  <label className="bg-brand-navy text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-brand-navy/90 transition flex items-center gap-1">
                    <Upload size={12} /> Belge / PDF Seç
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {modalDocs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {modalDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-border text-xs"
                      >
                        <span className="flex items-center gap-1.5 truncate max-w-[280px]">
                          <FileText size={13} className="text-brand-navy flex-shrink-0" />
                          <span className="truncate font-medium">{doc.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="text-rose-500 hover:text-rose-700 p-0.5"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Ödeme Statüsü</label>
                <select
                  name="status"
                  defaultValue={editingItem?.status || "Ödenmedi"}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-bold"
                >
                  <option value="Ödenmedi">Ödenmedi (12 Gün Vadesi İşlesin)</option>
                  <option value="Ödendi">Ödendi (Tamamlandı)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Not / Güzergah Açıklaması</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingItem?.notes || ""}
                  placeholder="Maslak şantiye sevkiyatı nakliyesi, 2 sefer..."
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
                  disabled={isPending}
                  className="bg-brand-navy text-white px-5 py-2 rounded-lg font-bold hover:bg-brand-navy/90 transition shadow-xs"
                >
                  {isPending ? "Kaydediliyor..." : "Nakliyeyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOPLU EXCEL İÇE AKTARMA MODALI (Madde 18) */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={22} />
                Excel ile Toplu Nakliye Listesi Yükleme
              </h3>
              <button
                onClick={() => setIsExcelModalOpen(false)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Excel dosyanızdaki sütunlar (Firma Adı, Taşıma Tarihi, Tutar, IBAN, Açıklama, Fatura No) otomatik algılanır.
              İçe aktarılan her kayıt için <strong>12 günlük son ödeme vadesi otomatik olarak oluşturulacaktır</strong>.
            </p>

            {/* Dosya Seçim Alanı */}
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl p-6 text-center space-y-2">
              <Upload size={32} className="mx-auto text-emerald-600" />
              <p className="text-xs font-bold text-text">Excel (.xlsx, .xls, .csv) Dosyası Seçin</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelFileSelect}
                className="block mx-auto text-xs text-text-muted file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
              />
            </div>

            {/* Önizleme Tablosu */}
            {excelPreviewData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-text">
                  <span>Önizleme ({excelPreviewData.length} Kayıt Algılandı)</span>
                  <span className="text-emerald-700 font-black">
                    Toplam: {formatCurrency(excelPreviewData.reduce((s, r) => s + (Number(r.amount) || 0), 0))}
                  </span>
                </div>

                <div className="border border-border rounded-xl max-h-48 overflow-y-auto overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-surface sticky top-0 font-semibold text-text-muted border-b border-border">
                      <tr>
                        <th className="p-2">Nakliyeci</th>
                        <th className="p-2">Tarih</th>
                        <th className="p-2 text-right">Tutar</th>
                        <th className="p-2">IBAN</th>
                        <th className="p-2">Not</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {excelPreviewData.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface/50">
                          <td className="p-2 font-bold">{row.transporter_name}</td>
                          <td className="p-2 text-text-muted">{row.transport_date}</td>
                          <td className="p-2 text-right font-black text-brand-navy">{formatCurrency(row.amount)}</td>
                          <td className="p-2 font-mono text-[10px] text-text-muted">{row.iban || "-"}</td>
                          <td className="p-2 text-text-muted truncate max-w-[150px]">{row.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {excelPreviewData.length > 15 && (
                    <div className="p-2 bg-surface/50 text-center text-text-muted text-[10px]">
                      ve {excelPreviewData.length - 15} kayıt daha...
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-text-muted hover:text-text font-semibold text-xs"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={excelPreviewData.length === 0 || isExcelProcessing}
                onClick={handleImportExcelConfirm}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-bold text-xs transition shadow-xs flex items-center gap-1.5"
              >
                {isExcelProcessing ? "Kaydediliyor..." : `✓ ${excelPreviewData.length} Kaydı İçe Aktar`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BELGE / PDF GÖRÜNTÜLEYİCİ MODALI (Madde 19) */}
      {viewingDocs && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <FileText className="text-brand-navy" size={20} />
                {viewingDocs.title}
              </h3>
              <button
                onClick={() => setViewingDocs(null)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {viewingDocs.docs.map((doc, idx) => (
                <div key={idx} className="border border-border rounded-xl p-3 bg-surface/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-text flex items-center gap-1.5">
                      <Paperclip size={14} className="text-brand-navy" />
                      {doc.name || `Belge ${idx + 1}`}
                    </span>
                    <a
                      href={doc.url}
                      download={doc.name || `nakliye-belge-${idx + 1}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-brand-navy text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-brand-navy/90 transition shadow-2xs"
                    >
                      <Download size={12} /> İndir / Aç
                    </a>
                  </div>

                  {doc.url.startsWith("data:image/") ? (
                    <img src={doc.url} alt={doc.name} className="max-h-96 rounded-lg mx-auto object-contain" />
                  ) : doc.url.startsWith("data:application/pdf") ? (
                    <iframe src={doc.url} className="w-full h-96 rounded-lg border border-border" />
                  ) : (
                    <div className="p-4 text-center bg-white rounded-lg border border-border text-xs text-text-muted">
                      Belge önizlemesi için yukarıdaki "İndir / Aç" butonuna tıklayabilirsiniz.
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setViewingDocs(null)}
                className="bg-brand-navy text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
