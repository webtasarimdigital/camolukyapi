"use client";

import { useState, useTransition, useMemo } from "react";
import { PaymentFollowup } from "@/lib/data/types";
import {
  actionSavePaymentFollowup,
  actionDeletePaymentFollowup,
} from "@/lib/data/actions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  CalendarClock,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  X,
  CalendarDays,
  Coins,
  Download,
} from "lucide-react";

interface Props {
  initialItems: PaymentFollowup[];
  userRole: string;
  userName: string;
}

type DateTabType = "all" | "today" | "tomorrow" | "this_week" | "upcoming" | "overdue" | "custom";

export function PaymentFollowupClient({ initialItems, userName }: Props) {
  const [items, setItems] = useState<PaymentFollowup[]>(initialItems);
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState<"all" | "alacak" | "borc">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Sevkiyattaki gibi Tarih Filtreleri
  const [dateTab, setDateTab] = useState<DateTabType>("all");
  const [specificDate, setSpecificDate] = useState<string>("");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentFollowup | null>(null);
  const [isPending, startTransition] = useTransition();

  // Tarih referansları
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const weekEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  // Vadesi Geçmiş, Bugün, İleri Tarihli Sayıları ve Listeleri
  const { overdueList, todayList, tomorrowList, upcomingList } = useMemo(() => {
    const overdue: PaymentFollowup[] = [];
    const dueToday: PaymentFollowup[] = [];
    const dueTomorrow: PaymentFollowup[] = [];
    const upcoming: PaymentFollowup[] = [];

    items.forEach((item) => {
      const remaining = Math.max(0, item.total_amount - (item.paid_amount || 0));
      if (item.status === "Ödendi" || remaining <= 0) return;

      if (item.due_date < todayStr) {
        overdue.push(item);
      } else if (item.due_date === todayStr) {
        dueToday.push(item);
      } else if (item.due_date === tomorrowStr) {
        dueTomorrow.push(item);
      } else {
        upcoming.push(item);
      }
    });

    return { 
      overdueList: overdue, 
      todayList: dueToday, 
      tomorrowList: dueTomorrow, 
      upcomingList: upcoming 
    };
  }, [items, todayStr, tomorrowStr]);

  // Ana Filtreleme Mantığı (Tarih Sekmeleri + Arama + Tip + Statü + Tarih Aralığı)
  const filtered = useMemo(() => {
    return items.filter((item) => {
      // 1. Tip Filtresi (Tümü / Alacak / Borç)
      if (typeTab !== "all" && item.type !== typeTab) return false;

      // 2. Statü Filtresi
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      // 3. Metin Arama
      const q = search.toLowerCase().trim();
      if (q) {
        const matchQ =
          (item.contact_name || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q) ||
          (item.personnel || "").toLowerCase().includes(q) ||
          (item.notes || "").toLowerCase().includes(q);
        if (!matchQ) return false;
      }

      // 4. Tarih Sekmesi Filtresi (Sevkiyattaki gibi)
      if (dateTab === "today") {
        if (item.due_date !== todayStr) return false;
      } else if (dateTab === "tomorrow") {
        if (item.due_date !== tomorrowStr) return false;
      } else if (dateTab === "this_week") {
        if (item.due_date < todayStr || item.due_date > weekEndStr) return false;
      } else if (dateTab === "upcoming") {
        if (item.due_date <= todayStr) return false;
      } else if (dateTab === "overdue") {
        if (item.due_date >= todayStr || item.status === "Ödendi") return false;
      } else if (dateTab === "custom" && specificDate) {
        if (item.due_date !== specificDate) return false;
      }

      // 5. Tarih Aralığı (Varsa)
      if (startDateFilter && item.due_date < startDateFilter) return false;
      if (endDateFilter && item.due_date > endDateFilter) return false;

      return true;
    });
  }, [
    items,
    typeTab,
    statusFilter,
    search,
    dateTab,
    specificDate,
    startDateFilter,
    endDateFilter,
    todayStr,
    tomorrowStr,
    weekEndStr,
  ]);

  // Filtrelenen Sonuçların Anlık Alacak / Borç Özeti (GÜN BAZLI ALACAK)
  const filteredSummary = useMemo(() => {
    let alacakToplami = 0;
    let borcToplami = 0;
    let alacakSayisi = 0;
    let borcSayisi = 0;

    filtered.forEach((i) => {
      const remaining = Math.max(0, i.total_amount - (i.paid_amount || 0));
      if (i.status === "Ödendi" || remaining <= 0) return;

      if (i.type === "alacak") {
        alacakToplami += remaining;
        alacakSayisi++;
      } else {
        borcToplami += remaining;
        borcSayisi++;
      }
    });

    return {
      alacakToplami,
      borcToplami,
      netTahsilat: alacakToplami - borcToplami,
      alacakSayisi,
      borcSayisi,
      toplamKayit: filtered.length,
    };
  }, [filtered]);

  // Genel Toplamlar
  const totalAlacakKalan = useMemo(() => {
    return items
      .filter((i) => i.type === "alacak" && i.status !== "Ödendi")
      .reduce((sum, i) => sum + Math.max(0, i.total_amount - (i.paid_amount || 0)), 0);
  }, [items]);

  const totalBorcKalan = useMemo(() => {
    return items
      .filter((i) => i.type === "borc" && i.status !== "Ödendi")
      .reduce((sum, i) => sum + Math.max(0, i.total_amount - (i.paid_amount || 0)), 0);
  }, [items]);

  // Seçili Tarih Başlığı Açıklaması
  const currentPeriodLabel = useMemo(() => {
    if (dateTab === "today") return `Bugün (${formatDate(todayStr)})`;
    if (dateTab === "tomorrow") return `Yarın (${formatDate(tomorrowStr)})`;
    if (dateTab === "this_week") return `Bu Hafta (Gelecek 7 Gün)`;
    if (dateTab === "upcoming") return `İleri Tarihli Tüm Vadeler`;
    if (dateTab === "overdue") return `Vadesi Geçmiş Ödemeler`;
    if (dateTab === "custom" && specificDate) return `Seçilen Gün: ${formatDate(specificDate)}`;
    if (startDateFilter || endDateFilter) return `Özel Tarih Aralığı`;
    return `Tüm Vadeler`;
  }, [dateTab, specificDate, startDateFilter, endDateFilter, todayStr, tomorrowStr]);

  function handleOpenNew() {
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function handleEdit(item: PaymentFollowup) {
    setEditingItem(item);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu ödeme takip kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await actionDeletePaymentFollowup(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Kayıt silindi.");
    });
  }

  async function handleQuickStatusChange(item: PaymentFollowup, newStatus: PaymentFollowup["status"]) {
    const newPaidAmount = newStatus === "Ödendi" ? item.total_amount : item.paid_amount;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", item.id);
      formData.set("type", item.type);
      formData.set("contact_date", item.contact_date || "");
      formData.set("contact_name", item.contact_name);
      formData.set("description", item.description || "");
      formData.set("personnel", item.personnel || "");
      formData.set("payment_method", item.payment_method);
      formData.set("due_date", item.due_date);
      formData.set("total_amount", String(item.total_amount));
      formData.set("paid_amount", String(newPaidAmount));
      formData.set("status", newStatus);
      formData.set("notes", item.notes || "");

      const res = await actionSavePaymentFollowup(formData);
      if (res.success && res.payment) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? res.payment! : i)));
        toast.success(`Durum "${newStatus}" olarak güncellendi!`);
      } else {
        toast.error(res.error || "Durum güncellenemedi.");
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await actionSavePaymentFollowup(formData);
      if (res.success && res.payment) {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.id === res.payment!.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.payment!;
            return next;
          }
          return [res.payment!, ...prev];
        });
        toast.success(editingItem ? "Ödeme kaydı güncellendi!" : "Yeni ödeme takibi eklendi!");
        setIsModalOpen(false);
      }
    });
  }

  function handleExportExcel() {
    if (filtered.length === 0) {
      toast.error("İndirilecek ödeme kaydı bulunamadı.");
      return;
    }
    const rows = filtered.map((item, idx) => {
      const remaining = Math.max(0, item.total_amount - item.paid_amount);
      return {
        "Sıra": idx + 1,
        "İşlem Türü": item.type === "alacak" ? "Alacak (Müşteri Tahsilatı)" : "Borç (Tedarikçi Ödemesi)",
        "Kişi / Firma Ünvanı": item.contact_name,
        "Görüşme Tarihi": item.contact_date,
        "Vade Tarihi": item.due_date,
        "Toplam Tutar (₺)": item.total_amount,
        "Ödenen Tutar (₺)": item.paid_amount,
        "Kalan Bakiye (₺)": remaining,
        "Ödeme Şekli": item.payment_method,
        "Durum": item.status,
        "İlgili Personel": item.personnel || "-",
        "Açıklama": item.description || "-",
        "Notlar": item.notes || "-",
        "İşlemi Yapan": item.created_by_name || "-",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Odeme_Vadeleri");
    XLSX.writeFile(wb, `Odeme_Vadeleri_${todayStr}.xlsx`);
    toast.success("Ödeme vadeleri listesi Excel olarak indirildi.");
  }

  return (
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <CalendarClock className="text-brand-navy" size={24} />
            Toplanacak & Yapılacak Ödeme Takibi
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Müşteri tahsilat vadeleri, tedarikçi ödemeleri, gün bazlı alacak takibi ve filtreleme
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tip Seçici: Tümü / Alacak / Borç */}
          <div className="flex bg-surface p-1 rounded-xl border border-border">
            <button
              onClick={() => setTypeTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeTab === "all" ? "bg-white text-brand-navy shadow-xs" : "text-text-muted hover:text-text"
              }`}
            >
              Tümü ({items.length})
            </button>
            <button
              onClick={() => setTypeTab("alacak")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                typeTab === "alacak" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <ArrowDownLeft size={13} /> Alacaklar
            </button>
            <button
              onClick={() => setTypeTab("borc")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                typeTab === "borc" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              <ArrowUpRight size={13} /> Borçlar
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-surface hover:bg-neutral-100 text-text border border-border px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            title="Tüm vade listesini Excel olarak indir"
          >
            <Download size={15} /> Excel İndir
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={16} /> + Yeni Vade Gir
          </button>
        </div>
      </div>

      {/* VADE VE GÜNÜ GELEN UYARI KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kırmızı: Vadesi Geçmiş */}
        <div 
          onClick={() => setDateTab("overdue")}
          className={`border rounded-2xl p-4 space-y-1 shadow-xs cursor-pointer transition ${
            dateTab === "overdue" ? "bg-rose-100/90 border-rose-400 ring-2 ring-rose-500" : "bg-rose-50/70 border-rose-200 hover:bg-rose-100/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-rose-600" />
              🔴 Vadesi Geçmiş Ödemeler
            </span>
            <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {overdueList.length} Kayıt
            </span>
          </div>
          <p className="text-xl font-black text-rose-900 mt-1">
            {formatCurrency(overdueList.reduce((s, i) => s + Math.max(0, i.total_amount - i.paid_amount), 0))}
          </p>
          <p className="text-[11px] text-rose-700">
            {overdueList.length > 0
              ? `${overdueList[0].contact_name} dahil ${overdueList.length} ödemenin vadesi geçmiş!`
              : "Vadesi geçmiş bekleyen ödeme bulunmuyor."}
          </p>
        </div>

        {/* Sarı: Bugün Son Gün */}
        <div 
          onClick={() => setDateTab("today")}
          className={`border rounded-2xl p-4 space-y-1 shadow-xs cursor-pointer transition ${
            dateTab === "today" ? "bg-amber-100/90 border-amber-400 ring-2 ring-amber-500" : "bg-amber-50/70 border-amber-200 hover:bg-amber-100/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Clock size={15} className="text-amber-600" />
              🟡 Bugün Olacak Ödemeler
            </span>
            <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {todayList.length} Kayıt
            </span>
          </div>
          <p className="text-xl font-black text-amber-900 mt-1">
            {formatCurrency(todayList.reduce((s, i) => s + Math.max(0, i.total_amount - i.paid_amount), 0))}
          </p>
          <p className="text-[11px] text-amber-700">
            {todayList.length > 0 ? "Bugün işlem yapılması gereken vadeler var (Tıkla filtrele)." : "Bugün için bekleyen vade yok."}
          </p>
        </div>

        {/* Yeşil / Özet Bakiye */}
        <div className="bg-white border border-border rounded-2xl p-4 space-y-1 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-text-muted font-semibold">
            <span>Genel Toplanacak (Alacak):</span>
            <span className="text-emerald-700 font-bold">{formatCurrency(totalAlacakKalan)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-text-muted font-semibold">
            <span>Genel Yapılacak (Borç):</span>
            <span className="text-rose-700 font-bold">{formatCurrency(totalBorcKalan)}</span>
          </div>
          <div className="border-t border-border pt-1.5 flex justify-between items-center text-xs font-bold">
            <span>Genel Net Nakit Akışı:</span>
            <span className={totalAlacakKalan >= totalBorcKalan ? "text-emerald-700 text-sm font-black" : "text-rose-700 text-sm font-black"}>
              {formatCurrency(totalAlacakKalan - totalBorcKalan)}
            </span>
          </div>
        </div>
      </div>

      {/* SEVKİYAT GİBİ TARİH FİLTRELERİ & GÜN BAZLI ALACAK ÇİZELGESİ */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-3 shadow-xs">
        {/* Üst Sekmeler */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-text-muted flex items-center gap-1 mr-1">
              <CalendarDays size={15} className="text-brand-navy" /> Tarih Filtresi:
            </span>

            {/* Tümü */}
            <button
              onClick={() => {
                setDateTab("all");
                setSpecificDate("");
                setStartDateFilter("");
                setEndDateFilter("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dateTab === "all" && !specificDate && !startDateFilter
                  ? "bg-brand-navy text-white shadow-xs"
                  : "bg-surface hover:bg-slate-200 text-text"
              }`}
            >
              Tüm Vadeler
            </button>

            {/* Bugün */}
            <button
              onClick={() => {
                setDateTab("today");
                setSpecificDate("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                dateTab === "today"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <span>🟡 Bugün Olacaklar</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${dateTab === "today" ? "bg-white text-amber-900" : "bg-amber-200 text-amber-900"}`}>
                {todayList.length}
              </span>
            </button>

            {/* Yarın */}
            <button
              onClick={() => {
                setDateTab("tomorrow");
                setSpecificDate("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                dateTab === "tomorrow"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <span>🟢 Yarın</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${dateTab === "tomorrow" ? "bg-white text-emerald-900" : "bg-emerald-200 text-emerald-900"}`}>
                {tomorrowList.length}
              </span>
            </button>

            {/* Bu Hafta */}
            <button
              onClick={() => {
                setDateTab("this_week");
                setSpecificDate("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                dateTab === "this_week"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              📆 Bu Hafta (7 Gün)
            </button>

            {/* İleri Tarihli */}
            <button
              onClick={() => {
                setDateTab("upcoming");
                setSpecificDate("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                dateTab === "upcoming"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
              }`}
            >
              <span>⏩ İleri Tarihli</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${dateTab === "upcoming" ? "bg-white text-purple-900" : "bg-purple-200 text-purple-900"}`}>
                {upcomingList.length}
              </span>
            </button>

            {/* Vadesi Geçmiş */}
            <button
              onClick={() => {
                setDateTab("overdue");
                setSpecificDate("");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                dateTab === "overdue"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <span>🔴 Vadesi Geçmiş</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${dateTab === "overdue" ? "bg-white text-rose-900" : "bg-rose-200 text-rose-900"}`}>
                {overdueList.length}
              </span>
            </button>
          </div>

          {/* Gün Bazlı Belirli Tarih Seçici */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-text-muted flex items-center gap-1">
              <Calendar size={14} className="text-emerald-600" />
              <span>Gün Seç:</span>
            </label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => {
                const val = e.target.value;
                setSpecificDate(val);
                if (val) {
                  setDateTab("custom");
                } else {
                  setDateTab("all");
                }
              }}
              className="border border-border rounded-xl px-2.5 py-1.5 text-xs bg-white font-medium outline-none focus:border-brand-navy"
            />
            {specificDate && (
              <button
                onClick={() => {
                  setSpecificDate("");
                  setDateTab("all");
                }}
                className="text-text-muted hover:text-rose-600 p-1 rounded-lg hover:bg-surface"
                title="Tarih seçimini temizle"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* 🌟 KULLANICININ İSTEDİĞİ GÜN BAZLI ALACAK CANLI ÖZET KARTI 🌟 */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/40 to-surface border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black tracking-wide uppercase">
                GÜN BAZLI ALACAK ÖZETİ
              </span>
              <span className="text-xs font-bold text-emerald-950">
                {currentPeriodLabel}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Bu seçili dönemde toplanması beklenen müşteri alacakları ve yapılacak ödemelerin net dökümü:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Toplanacak Alacak */}
            <div className="bg-white/90 border border-emerald-300 px-3.5 py-2 rounded-xl text-right shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 block uppercase">
                TOPLANACAK ALACAK
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-800 tabular-nums">
                {formatCurrency(filteredSummary.alacakToplami)}
              </span>
              <span className="text-[10px] text-emerald-600 block">
                ({filteredSummary.alacakSayisi} Adet Alacak)
              </span>
            </div>

            {/* Yapılacak Borç */}
            <div className="bg-white/90 border border-rose-300 px-3.5 py-2 rounded-xl text-right shadow-xs">
              <span className="text-[10px] font-bold text-rose-700 block uppercase">
                YAPILACAK BORÇ
              </span>
              <span className="text-base sm:text-lg font-black text-rose-800 tabular-nums">
                {formatCurrency(filteredSummary.borcToplami)}
              </span>
              <span className="text-[10px] text-rose-600 block">
                ({filteredSummary.borcSayisi} Adet Borç)
              </span>
            </div>

            {/* Net Tahsilat Beklentisi */}
            <div className="bg-brand-navy text-white px-3.5 py-2 rounded-xl text-right shadow-xs">
              <span className="text-[10px] font-bold text-slate-300 block uppercase">
                NET TAHSİLAT
              </span>
              <span className="text-base sm:text-lg font-black text-brand-gold tabular-nums">
                {formatCurrency(filteredSummary.netTahsilat)}
              </span>
              <span className="text-[10px] text-slate-300 block">
                Toplam {filteredSummary.toplamKayit} Kayıt
              </span>
            </div>
          </div>
        </div>

        {/* Arama ve Statü Filtreleri */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Müşteri / tedarikçi adı, personel veya açıklama ara..."
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs outline-none focus:border-brand-navy"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-border rounded-xl px-3 py-2 text-xs bg-white font-medium outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="Bekliyor">Bekliyor</option>
              <option value="Kısmi Ödendi">Kısmi Ödendi</option>
              <option value="Ödendi">Ödendi</option>
              <option value="Ertelendi">Ertelendi</option>
            </select>

            {(search || statusFilter !== "all" || dateTab !== "all" || specificDate) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setDateTab("all");
                  setSpecificDate("");
                  setStartDateFilter("");
                  setEndDateFilter("");
                }}
                className="text-xs text-text-muted hover:text-rose-600 px-2 py-1 underline font-medium"
              >
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* MASAÜSTÜ TABLO */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Tip</th>
                <th className="py-3 px-4">Görüşme Tarihi</th>
                <th className="py-3 px-4">Müşteri / Tedarikçi</th>
                <th className="py-3 px-4">Açıklama</th>
                <th className="py-3 px-4">Personel</th>
                <th className="py-3 px-4">Ödeme Şekli</th>
                <th className="py-3 px-4">Vade (Ödeyeceği Tarih)</th>
                <th className="py-3 px-4 text-right">Toplam / Ödenen</th>
                <th className="py-3 px-4 text-right">Kalan Tutar</th>
                <th className="py-3 px-4 text-center">Durum / Not</th>
                <th className="py-3 px-4 text-center w-20">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-text-muted">
                    Seçili filtrelere uygun ödeme takibi kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const remaining = Math.max(0, item.total_amount - (item.paid_amount || 0));
                  const isOverdue = item.due_date < todayStr && item.status !== "Ödendi" && remaining > 0;
                  const isToday = item.due_date === todayStr && item.status !== "Ödendi" && remaining > 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface/50 transition ${
                        isOverdue
                          ? "bg-rose-50/40"
                          : isToday
                          ? "bg-amber-50/40"
                          : item.status === "Ödendi"
                          ? "opacity-60 bg-gray-50/30"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.type === "alacak"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.type === "alacak" ? (
                            <>
                              <ArrowDownLeft size={12} /> Alacak
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={12} /> Borç
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-text-muted">{item.contact_date || "-"}</td>

                      <td className="py-3 px-4 font-bold text-text">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-text-muted" />
                          <span>{item.contact_name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-text-muted max-w-xs truncate" title={item.description || ""}>
                        {item.description || "-"}
                      </td>

                      <td className="py-3 px-4 text-text-muted">{item.personnel || "-"}</td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-surface border border-border text-[11px]">
                          {item.payment_method}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-text-muted" />
                          <span className={isOverdue ? "text-rose-600 font-black" : isToday ? "text-amber-700 font-black" : "font-semibold"}>
                            {item.due_date}
                          </span>
                          {isOverdue && (
                            <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                              GECİKTİ
                            </span>
                          )}
                          {isToday && (
                            <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                              BUGÜN
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div>
                          <span className="font-bold text-text block">{formatCurrency(item.total_amount)}</span>
                          {item.paid_amount > 0 && (
                            <span className="text-[10px] text-emerald-600 block">
                              Ödenen: {formatCurrency(item.paid_amount)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-black text-sm tabular-nums ${
                            remaining === 0
                              ? "text-emerald-600"
                              : item.type === "alacak"
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }`}
                        >
                          {formatCurrency(remaining)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <select
                            value={item.status}
                            disabled={isPending}
                            onChange={(e) => handleQuickStatusChange(item, e.target.value as any)}
                            className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border outline-none ${
                              item.status === "Ödendi"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : item.status === "Kısmi Ödendi"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : item.status === "Ertelendi"
                                ? "bg-purple-100 text-purple-800 border-purple-300"
                                : "bg-gray-100 text-gray-800 border-gray-300"
                            }`}
                          >
                            <option value="Bekliyor">Bekliyor</option>
                            <option value="Kısmi Ödendi">Kısmi Ödendi</option>
                            <option value="Ödendi">Ödendi</option>
                            <option value="Ertelendi">Ertelendi</option>
                          </select>

                          {item.status !== "Ödendi" && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(item, "Ödendi")}
                              disabled={isPending}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                            >
                              ✓ Ödendi Yap
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 rounded-lg hover:bg-surface text-brand-navy transition"
                            title="Düzenle / Kısmi Ödeme / Tarih Ertele"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 transition"
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

        {/* MOBİL KART GÖRÜNÜMÜ */}
        <div className="block md:hidden divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs">
              Seçili filtrelere uygun ödeme takibi kaydı bulunamadı.
            </div>
          ) : (
            filtered.map((item) => {
              const remaining = Math.max(0, item.total_amount - (item.paid_amount || 0));
              const isOverdue = item.due_date < todayStr && item.status !== "Ödendi" && remaining > 0;
              const isToday = item.due_date === todayStr && item.status !== "Ödendi" && remaining > 0;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 space-y-2.5 text-xs transition ${
                    isOverdue
                      ? "bg-rose-50/50"
                      : isToday
                      ? "bg-amber-50/50"
                      : item.status === "Ödendi"
                      ? "opacity-60 bg-gray-50/40"
                      : "hover:bg-surface/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.type === "alacak"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.type === "alacak" ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                        {item.type === "alacak" ? "Alacak (Toplanacak)" : "Borç (Yapılacak)"}
                      </span>
                      <p className="font-bold text-text text-sm flex items-center gap-1 mt-1">
                        <User size={14} className="text-text-muted" />
                        <span>{item.contact_name}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-text-muted block">Kalan Tutar</span>
                      <span
                        className={`font-black text-sm tabular-nums ${
                          remaining === 0
                            ? "text-emerald-600"
                            : item.type === "alacak"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-text-muted text-[11px] bg-white/70 p-2 rounded-lg border border-border/60">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/50 text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <span>Vade:</span>
                      <strong className={isOverdue ? "text-rose-600 font-black" : isToday ? "text-amber-700 font-black" : "text-text"}>
                        {item.due_date}
                      </strong>
                      {isOverdue && (
                        <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                          GECİKTİ
                        </span>
                      )}
                      {isToday && (
                        <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                          BUGÜN
                        </span>
                      )}
                    </div>
                    <span>Toplam: <strong className="text-text">{formatCurrency(item.total_amount)}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <select
                        value={item.status}
                        disabled={isPending}
                        onChange={(e) => handleQuickStatusChange(item, e.target.value as any)}
                        className={`px-2 py-1 rounded-lg font-bold text-xs border outline-none ${
                          item.status === "Ödendi"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : item.status === "Kısmi Ödendi"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : item.status === "Ertelendi"
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : "bg-gray-100 text-gray-800 border-gray-300"
                        }`}
                      >
                        <option value="Bekliyor">Bekliyor</option>
                        <option value="Kısmi Ödendi">Kısmi Ödendi</option>
                        <option value="Ödendi">Ödendi</option>
                        <option value="Ertelendi">Ertelendi</option>
                      </select>

                      {item.status !== "Ödendi" && (
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(item, "Ödendi")}
                          disabled={isPending}
                          className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition"
                        >
                          ✓ Ödendi Yap
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 rounded-lg bg-surface hover:bg-neutral-200 text-brand-navy transition"
                        title="Düzenle"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg bg-surface hover:bg-rose-100 text-rose-600 transition"
                        title="Sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* YENİ / DÜZENLEME MODALI (Kısmi Ödeme & Tarih Erteleme Özellikli) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <CalendarClock className="text-brand-navy" size={20} />
                {editingItem ? "Ödemeyi Düzenle / Kısmi Ödeme / Tarih Ertele" : "Yeni Ödeme Takibi Ekle"}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Kayıt Tipi</label>
                  <select
                    name="type"
                    defaultValue={editingItem?.type || "alacak"}
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface font-semibold outline-none"
                  >
                    <option value="alacak">Toplanacak (Müşteri Alacağı)</option>
                    <option value="borc">Yapılacak (Tedarikçi Borcu)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-text-muted font-semibold mb-1">Görüşme Tarihi</label>
                  <input
                    type="date"
                    name="contact_date"
                    defaultValue={editingItem?.contact_date || todayStr}
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-muted font-semibold mb-1">
                  Müşteri / Firma / Tedarikçi Adı *
                </label>
                <input
                  type="text"
                  name="contact_name"
                  required
                  defaultValue={editingItem?.contact_name || ""}
                  placeholder="Örn: Yılmaz İnşaat Ltd. / Mehmet Bey"
                  className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted font-semibold mb-1">İlgilenen Personel</label>
                  <input
                    type="text"
                    name="personnel"
                    defaultValue={editingItem?.personnel || userName || ""}
                    placeholder="Personel adı"
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none"
                  />
                </div>

                <div>
                  <label className="block text-text-muted font-semibold mb-1">Ödeme Şekli</label>
                  <select
                    name="payment_method"
                    defaultValue={editingItem?.payment_method || "Havale / EFT"}
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none font-medium"
                  >
                    <option value="Havale / EFT">Havale / EFT</option>
                    <option value="Nakit">Nakit</option>
                    <option value="Kredi Kartı">Kredi Kartı</option>
                    <option value="Çek">Çek</option>
                    <option value="Senet">Senet</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
                  <label className="block text-amber-900 font-bold mb-1">
                    Vade Tarihi (Ödeyeceği Gün) *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    required
                    defaultValue={editingItem?.due_date || todayStr}
                    className="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 bg-white font-bold text-amber-950 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-text-muted font-semibold mb-1">Durum</label>
                  <select
                    name="status"
                    defaultValue={editingItem?.status || "Bekliyor"}
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface font-semibold outline-none"
                  >
                    <option value="Bekliyor">Bekliyor</option>
                    <option value="Kısmi Ödendi">Kısmi Ödendi</option>
                    <option value="Ödendi">Ödendi (Tamamı)</option>
                    <option value="Ertelendi">Ertelendi (Yeni Tarih)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-surface p-3 rounded-xl border border-border">
                <div>
                  <label className="block text-text-muted font-semibold mb-1">Toplam Tutar (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    name="total_amount"
                    required
                    defaultValue={editingItem?.total_amount || ""}
                    placeholder="0.00"
                    className="w-full border border-border rounded-lg px-2.5 py-1.5 bg-white font-bold text-text outline-none"
                  />
                </div>

                <div>
                  <label className="block text-emerald-800 font-semibold mb-1">
                    Şimdiye Kadar Ödenen (₺)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="paid_amount"
                    defaultValue={editingItem?.paid_amount ?? 0}
                    placeholder="0.00"
                    className="w-full border border-border rounded-lg px-2.5 py-1.5 bg-white font-bold text-emerald-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-muted font-semibold mb-1">Açıklama / Fatura / Proje</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingItem?.description || ""}
                  placeholder="Örn: 120x280 Seramik sevkiyat bakiyesi / Fatura No"
                  className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none"
                />
              </div>

              <div>
                <label className="block text-text-muted font-semibold mb-1">
                  Görüşme Notları (Erteleme Sebebi vs.)
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingItem?.notes || ""}
                  placeholder="Müşteriyle yapılan görüşme detayları..."
                  className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-text-muted hover:text-text font-semibold hover:bg-surface transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-navy hover:bg-brand-navy-2 text-white font-bold px-5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} className="text-brand-gold" />
                  <span>{editingItem ? "Güncellemeyi Kaydet" : "Vadeyi Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
