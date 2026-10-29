"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Coins,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Truck,
  UserCheck,
  Receipt,
  Filter,
  Building2,
  TrendingUp,
  Search,
  Layers,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";
import {
  CustomColumnButton,
  CustomColumnCell,
} from "@/components/ui/CustomColumnManager";
import { CustomColumn } from "@/lib/data/custom-columns-actions";
import { MonthFilter } from "@/components/ui/MonthFilter";
import {
  saveDailyExpense,
  deleteDailyExpense,
  toggleDailyExpenseStatus,
} from "./actions";

interface GunlukGiderlerClientProps {
  initialExpenses: any[];
  customColumns: CustomColumn[];
}

type TabType = "gunluk" | "genel" | "gelir" | "hepsi";

export const DAILY_EXPENSE_CATEGORIES = [
  "Ofis & Mutfak",
  "Yemek & İkram",
  "Kargo & Kurye",
  "Hırdavat & Sarf Malzeme",
  "Tamir & Bakım",
  "Yakıt & Akaryakıt",
  "Personel Masrafı",
  "Kırtasiye",
  "Diğer Günlük Masraf",
];

export const GENERAL_EXPENSE_CATEGORIES = [
  "Mali Müşavir & Muhasebe",
  "Kira & Stopaj",
  "Elektrik, Su, Doğalgaz",
  "Telefon & İnternet",
  "Bina Aidatı & Güvenlik",
  "Sigorta & Kasko",
  "Banka Masrafı & Komisyon",
  "Danışmanlık & Hukuk",
  "Reklam & Pazarlama",
  "Diğer Sabit Gider",
];

export const INCOME_CATEGORIES = [
  "Nakit Kasa Girişi",
  "Elden Tahsilat",
  "Banka Havale / EFT Girişi",
  "Hurda & Atık Malzeme Satışı",
  "Ortak Sermaye Girişi",
  "İade & Alacak Tahsilatı",
  "Diğer Kasa Girişi",
];

export function GunlukGiderlerClient({
  initialExpenses,
  customColumns,
}: GunlukGiderlerClientProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [cols, setCols] = useState(customColumns);
  const currentYM = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYM);

  // Aktif Ana Sekme: Günlük Giderler | Genel Giderler | Günlük Gelirler | Kasa & Hepsi
  const [activeTab, setActiveTab] = useState<TabType>("gunluk");

  // Filtreler
  const [filterSource, setFilterSource] = useState<"all" | "manual" | "fuel" | "advance">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "odenen" | "bekleyen">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal Durumu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form Verisi
  const [formData, setFormData] = useState<any>({
    id: undefined,
    expense_date: new Date().toISOString().split("T")[0],
    category: "Ofis & Mutfak",
    description: "",
    amount: 0,
    status: "Ödendi",
    payment_method: "Nakit",
    source_type: "manual",
    notes: "",
  });

  // 1. Ay bazında filtreleme
  const monthFiltered = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedMonth === "all") return true;
      return (e.expense_date || "").startsWith(selectedMonth);
    });
  }, [expenses, selectedMonth]);

  // Ay içindeki gruplar
  const dailyItems = useMemo(
    () =>
      monthFiltered.filter(
        (e) =>
          !e.source_type ||
          e.source_type === "manual" ||
          e.source_type === "vehicle_fuel" ||
          e.source_type === "employee_advance"
      ),
    [monthFiltered]
  );

  const generalItems = useMemo(
    () => monthFiltered.filter((e) => e.source_type === "general"),
    [monthFiltered]
  );

  const incomeItems = useMemo(
    () => monthFiltered.filter((e) => e.source_type === "income"),
    [monthFiltered]
  );

  // Toplam Hesaplamalar (Seçili aya göre Kasa Durumu)
  const totalDailyExpense = useMemo(
    () => dailyItems.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [dailyItems]
  );
  const totalGeneralExpense = useMemo(
    () => generalItems.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [generalItems]
  );
  const totalAllExpense = totalDailyExpense + totalGeneralExpense;
  const totalIncome = useMemo(
    () => incomeItems.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [incomeItems]
  );
  const netCashBalance = totalIncome - totalAllExpense;

  // Günlük gider alt detayları
  const fuelExpense = useMemo(
    () =>
      dailyItems
        .filter((e) => e.source_type === "vehicle_fuel")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [dailyItems]
  );
  const advanceExpense = useMemo(
    () =>
      dailyItems
        .filter((e) => e.source_type === "employee_advance")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [dailyItems]
  );
  const manualDailyExpense = useMemo(
    () =>
      dailyItems
        .filter((e) => !e.source_type || e.source_type === "manual")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [dailyItems]
  );

  // Genel gider alt detayları
  const paidGeneralExpense = useMemo(
    () =>
      generalItems
        .filter((e) => e.status === "Ödendi")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [generalItems]
  );
  const unpaidGeneralExpense = useMemo(
    () =>
      generalItems
        .filter((e) => e.status !== "Ödendi")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [generalItems]
  );

  // Gelir alt detayları
  const cashIncome = useMemo(
    () =>
      incomeItems
        .filter((e) => (e.payment_method || "").toLowerCase().includes("nakit"))
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [incomeItems]
  );
  const bankIncome = useMemo(
    () =>
      incomeItems
        .filter((e) => !(e.payment_method || "").toLowerCase().includes("nakit"))
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [incomeItems]
  );

  // 2. Aktif sekmeye göre temel veri kümesi
  const currentTabBaseItems = useMemo(() => {
    switch (activeTab) {
      case "gunluk":
        return dailyItems;
      case "genel":
        return generalItems;
      case "gelir":
        return incomeItems;
      case "hepsi":
      default:
        return monthFiltered;
    }
  }, [activeTab, dailyItems, generalItems, incomeItems, monthFiltered]);

  // 3. Filtreler ve Arama Uygulanmış Nihai Liste
  const filteredList = useMemo(() => {
    return currentTabBaseItems.filter((e) => {
      // Durum Filtresi
      if (filterStatus === "odenen" && e.status !== "Ödendi") return false;
      if (filterStatus === "bekleyen" && e.status === "Ödendi") return false;

      // Günlük Gider Sekmesinde Kaynak Filtresi
      if (activeTab === "gunluk") {
        if (filterSource === "manual" && e.source_type && e.source_type !== "manual") return false;
        if (filterSource === "fuel" && e.source_type !== "vehicle_fuel") return false;
        if (filterSource === "advance" && e.source_type !== "employee_advance") return false;
      }

      // Kategori Filtresi
      if (filterCategory !== "all" && e.category !== filterCategory) return false;

      // Arama Filtresi
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const desc = (e.description || "").toLowerCase();
        const cat = (e.category || "").toLowerCase();
        const notes = (e.notes || "").toLowerCase();
        const method = (e.payment_method || "").toLowerCase();
        if (!desc.includes(query) && !cat.includes(query) && !notes.includes(query) && !method.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [currentTabBaseItems, filterStatus, activeTab, filterSource, filterCategory, searchTerm]);

  // Yeni Kayıt Açma
  function handleOpenNewModal(targetType?: "manual" | "general" | "income") {
    let typeToUse: "manual" | "general" | "income" = "manual";
    if (targetType) {
      typeToUse = targetType;
    } else if (activeTab === "genel") {
      typeToUse = "general";
    } else if (activeTab === "gelir") {
      typeToUse = "income";
    }

    let defaultCat = "Ofis & Mutfak";
    if (typeToUse === "general") defaultCat = "Mali Müşavir & Muhasebe";
    if (typeToUse === "income") defaultCat = "Nakit Kasa Girişi";

    setIsEditing(false);
    setFormData({
      id: undefined,
      expense_date: new Date().toISOString().split("T")[0],
      category: defaultCat,
      description: "",
      amount: 0,
      status: "Ödendi",
      payment_method: "Nakit",
      source_type: typeToUse,
      notes: "",
    });
    setIsModalOpen(true);
  }

  // Düzenleme Açma
  function handleEdit(item: any) {
    if (!item.is_manual && item.source_type !== "general" && item.source_type !== "income" && item.source_type !== "manual") {
      alert("Otomatik aktarılan araç ve personel kayıtları ilgili sayfadan güncellenmelidir.");
      return;
    }
    setIsEditing(true);
    setFormData({
      id: item.id,
      expense_date: item.expense_date || new Date().toISOString().split("T")[0],
      category: item.category || "Ofis & Mutfak",
      description: item.description || "",
      amount: item.amount || 0,
      status: item.status || "Ödendi",
      payment_method: item.payment_method || "Nakit",
      source_type: item.source_type || "manual",
      notes: item.notes || "",
    });
    setIsModalOpen(true);
  }

  // Form Kaydet
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      alert("Lütfen açıklama ve tutar giriniz.");
      return;
    }

    const res = await saveDailyExpense(formData);
    if (res.success && res.data) {
      setExpenses((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== res.data.id);
        return [{ ...res.data, is_manual: true }, ...withoutCurrent];
      });
      setIsModalOpen(false);
    } else {
      alert(res.error || "İşlem kaydedilemedi");
    }
  }

  // Silme
  async function handleDelete(id: string) {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    const res = await deleteDailyExpense(id);
    if (res.success) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } else {
      alert(res.error);
    }
  }

  // Durum Değiştir
  async function handleToggleStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === "Ödendi" ? "Ödenmedi" : "Ödendi";
    const res = await toggleDailyExpenseStatus(id, nextStatus as any);
    if (res.success) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e))
      );
    }
  }

  // Aktif sekmenin başlık ve buton yapılandırması
  const currentTabMeta = useMemo(() => {
    switch (activeTab) {
      case "gunluk":
        return {
          title: "Günlük Giderler",
          subtitle: "Ofis, mutfak, yemek, kargo, araç akaryakıtı ve personel avansları.",
          icon: Receipt,
          badgeColor: "bg-rose-100 text-rose-800",
          buttonLabel: "+ Günlük Gider Ekle",
          buttonColor: "bg-brand-gold hover:bg-brand-gold-light text-brand-navy",
        };
      case "genel":
        return {
          title: "Genel Şirket Giderleri",
          subtitle: "Mali müşavir, kira, elektrik, su, doğalgaz, internet, sigorta ve sabit giderler.",
          icon: Building2,
          badgeColor: "bg-purple-100 text-purple-800",
          buttonLabel: "+ Genel Gider Ekle",
          buttonColor: "bg-purple-600 hover:bg-purple-700 text-white",
        };
      case "gelir":
        return {
          title: "Günlük Gelirler (Kasa Girişleri)",
          subtitle: "Nakit kasa girişleri, elden tahsilatlar, hurda satışları ve ek nakit akışları.",
          icon: TrendingUp,
          badgeColor: "bg-emerald-100 text-emerald-800",
          buttonLabel: "+ Gelir Ekle",
          buttonColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
        };
      case "hepsi":
      default:
        return {
          title: "Tüm Kasa & Finansal Hareketler",
          subtitle: "Giriş ve çıkışların tek havuzda net nakit akışı ve anlık kasa dengesi.",
          icon: Coins,
          badgeColor: "bg-amber-100 text-amber-800",
          buttonLabel: "+ Yeni Kayıt Ekle",
          buttonColor: "bg-brand-gold hover:bg-brand-gold-light text-brand-navy",
        };
    }
  }, [activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ÜST BİLGİ & SEKMELER VE BUTONLAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-brand-gold/15 text-brand-gold">
              <currentTabMeta.icon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentTabMeta.title}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentTabMeta.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Sağ Üst Aksiyonlar: Ay Filtresi, Özel Sütunlar, Dinamik Buton */}
        <div className="flex flex-wrap items-center gap-2">
          <MonthFilter selectedMonth={selectedMonth} onChange={setSelectedMonth} />

          <CustomColumnButton
            tableId="daily_expenses"
            revalidateUrl="/finans/gunluk-giderler"
            existingColumns={cols}
            onColumnAdded={(col) => setCols((prev) => [...prev, col])}
            onColumnDeleted={(key) => setCols((prev) => prev.filter((c) => c.column_key !== key))}
          />

          <button
            type="button"
            onClick={() => handleOpenNewModal()}
            className={`inline-flex items-center gap-1.5 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm ${currentTabMeta.buttonColor}`}
          >
            <Plus size={16} />
            <span>{currentTabMeta.buttonLabel}</span>
          </button>
        </div>
      </div>

      {/* NET KASA / AYLIK AKIŞ ÖZET ŞERİDİ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1.5 bg-slate-900 rounded-2xl text-white shadow-sm">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ArrowUpRight size={18} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Toplam Gelirler
              </span>
              <span className="text-lg font-black text-emerald-400">
                +{formatCurrency(totalIncome)}
              </span>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-mono">
            {incomeItems.length} Kalem
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <ArrowDownRight size={18} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Toplam Giderler (Günlük + Genel)
              </span>
              <span className="text-lg font-black text-rose-400">
                -{formatCurrency(totalAllExpense)}
              </span>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 font-mono">
            {dailyItems.length + generalItems.length} Kalem
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${netCashBalance >= 0 ? "bg-cyan-500/20 text-cyan-400" : "bg-amber-500/20 text-amber-400"}`}>
              <Wallet size={18} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Net Kasa / Fark
              </span>
              <span className={`text-lg font-black ${netCashBalance >= 0 ? "text-cyan-400" : "text-amber-400"}`}>
                {netCashBalance >= 0 ? "+" : ""}{formatCurrency(netCashBalance)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {selectedMonth === "all" ? "Tüm Zamanlar" : selectedMonth}
          </span>
        </div>
      </div>

      {/* DİNAMİK LİSTE DEĞİŞTİRME SEKMELERİ (KULLANICI TIKLAYINCA LİSTE VE BUTON DEĞİŞİR) */}
      <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab("gunluk");
            setFilterCategory("all");
          }}
          className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "gunluk"
              ? "bg-white text-rose-700 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Receipt size={16} />
          <span>Günlük Giderler</span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono ${
            activeTab === "gunluk" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-600"
          }`}>
            {dailyItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("genel");
            setFilterCategory("all");
          }}
          className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "genel"
              ? "bg-white text-purple-700 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Building2 size={16} />
          <span>Genel Şirket Giderleri</span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono ${
            activeTab === "genel" ? "bg-purple-100 text-purple-800" : "bg-slate-200 text-slate-600"
          }`}>
            {generalItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("gelir");
            setFilterCategory("all");
          }}
          className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "gelir"
              ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <TrendingUp size={16} />
          <span>Günlük Gelirler (Kasa)</span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono ${
            activeTab === "gelir" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
          }`}>
            {incomeItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("hepsi");
            setFilterCategory("all");
          }}
          className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
            activeTab === "hepsi"
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Layers size={16} />
          <span>Tüm Hareketler & Kasa</span>
          <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono ${
            activeTab === "hepsi" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
          }`}>
            {monthFiltered.length}
          </span>
        </button>
      </div>

      {/* KPI KARTLARI (SEÇİLİ SEKMENİN ÖZETLERİNE GÖRE DİNAMİK DEĞİŞİR) */}
      {activeTab === "gunluk" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in fade-in duration-150">
          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Receipt size={14} className="text-rose-600" />
              Günlük Gider Toplamı
            </span>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {formatCurrency(totalDailyExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {dailyItems.length} Toplam Harcama Kalemi
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
              <Truck size={14} />
              Araç Akaryakıt (Otomatik)
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(fuelExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {dailyItems.filter((e) => e.source_type === "vehicle_fuel").length} Fiş / Dolum
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
              <UserCheck size={14} />
              Personel Avansları (Otomatik)
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(advanceExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {dailyItems.filter((e) => e.source_type === "employee_advance").length} Avans Ödemesi
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <Coins size={14} />
              Ofis & Küçük Harcamalar
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(manualDailyExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {dailyItems.filter((e) => !e.source_type || e.source_type === "manual").length} Manuel Masraf
            </span>
          </div>
        </div>
      )}

      {activeTab === "genel" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in fade-in duration-150">
          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-purple-600 font-medium flex items-center gap-1.5">
              <Building2 size={14} />
              Toplam Genel Şirket Gideri
            </span>
            <p className="text-2xl font-black text-purple-700 mt-1">
              {formatCurrency(totalGeneralExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {generalItems.length} Sabit Kalem
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Ödenen Sabit Giderler
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(paidGeneralExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {generalItems.filter((e) => e.status === "Ödendi").length} Ödendi Olarak İşaretli
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
              <XCircle size={14} />
              Bekleyen / Vadeli Giderler
            </span>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {formatCurrency(unpaidGeneralExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {generalItems.filter((e) => e.status !== "Ödendi").length} Bekleyen Ödeme
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <Sparkles size={14} />
              Kira & Muhasebe & Faturalar
            </span>
            <p className="text-sm font-bold text-slate-700 mt-2">
              Sabit & Kurumsal İşletme Yükü
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Mali müşavir, aidat, enerji, kira vb.
            </span>
          </div>
        </div>
      )}

      {activeTab === "gelir" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in fade-in duration-150">
          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
              <TrendingUp size={14} />
              Toplam Kasa Girişi
            </span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {formatCurrency(totalIncome)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {incomeItems.length} Tahsilat & Kasa Girişi
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <Coins size={14} />
              Nakit Girişler
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(cashIncome)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Elden Nakit Tahsilatlar
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <Wallet size={14} />
              Banka / Havale Girişleri
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(bankIncome)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              EFT & Banka Kasa Girişleri
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Giriş Kalem Sayısı
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {incomeItems.length} Kayıt
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Seçili aydaki toplam tahsilatlar
            </span>
          </div>
        </div>
      )}

      {activeTab === "hepsi" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-in fade-in duration-150">
          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Wallet size={14} />
              Net Kasa Farkı
            </span>
            <p className={`text-2xl font-black mt-1 ${netCashBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {netCashBalance >= 0 ? "+" : ""}{formatCurrency(netCashBalance)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Gelir - Gider Farkı
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
              <TrendingUp size={14} />
              Toplam Gelir
            </span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              +{formatCurrency(totalIncome)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {incomeItems.length} Giriş Kaydı
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
              <Receipt size={14} />
              Günlük Giderler
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(totalDailyExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {dailyItems.length} Günlük Harcama
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
            <span className="text-xs text-purple-600 font-medium flex items-center gap-1.5">
              <Building2 size={14} />
              Genel Şirket Giderleri
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(totalGeneralExpense)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {generalItems.length} Sabit Gider
            </span>
          </div>
        </div>
      )}

      {/* FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border shadow-xs">
        {/* Sol Filtreler (Sekmeye Göre Dinamik) */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "gunluk" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Filter size={13} /> Kaynak:
              </span>
              <button
                type="button"
                onClick={() => setFilterSource("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filterSource === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Tümü ({dailyItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSource("fuel")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filterSource === "fuel" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                ⛽ Akaryakıt ({dailyItems.filter((e) => e.source_type === "vehicle_fuel").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSource("advance")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filterSource === "advance" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                👤 Avans ({dailyItems.filter((e) => e.source_type === "employee_advance").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSource("manual")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  filterSource === "manual" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                ☕ Ofis & Manuel ({dailyItems.filter((e) => !e.source_type || e.source_type === "manual").length})
              </button>
            </div>
          )}

          {activeTab === "genel" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Filter size={13} /> Kategori:
              </span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs border border-border rounded-xl px-2.5 py-1.5 bg-white font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Tüm Kategoriler ({generalItems.length})</option>
                {GENERAL_EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "gelir" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Filter size={13} /> Gelir Türü:
              </span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs border border-border rounded-xl px-2.5 py-1.5 bg-white font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Tüm Gelirler ({incomeItems.length})</option>
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "hepsi" && (
            <div className="text-xs font-semibold text-slate-500">
              Toplam {filteredList.length} finansal hareket listeleniyor
            </div>
          )}
        </div>

        {/* Sağ: Arama ve Durum Filtreleri */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Arama Kutusu */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ara (açıklama, not, kişi)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-xl w-48 sm:w-56 focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
            />
          </div>

          {/* Durum Filtresi */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterStatus === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tümü
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("odenen")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterStatus === "odenen" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Ödenenler
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("bekleyen")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterStatus === "bekleyen" ? "bg-rose-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Ödenmeyenler
            </button>
          </div>
        </div>
      </div>

      {/* DİNAMİK VERİ TABLOSU */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <currentTabMeta.icon size={44} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-base">Kayıt bulunamadı</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Seçili filtre veya arama kriterine uygun kayıt yok. Sağ üstteki &quot;{currentTabMeta.buttonLabel}&quot; butonuna basarak yeni kayıt ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          <InteractiveTable tableId={`daily-tracker-${activeTab}-table`}>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Tür & Kaynak</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Açıklama</th>
                  <th className="py-3 px-4 text-right">Tutar</th>
                  <th className="py-3 px-4 text-center">Ödeme / Tahsilat</th>
                  <th className="py-3 px-4 text-center">Durum</th>
                  <th className="py-3 px-4">Notlar</th>
                  {/* Özel Sütunlar */}
                  {cols.map((col) => (
                    <th key={col.column_key} className="py-3 px-4">
                      {col.column_name}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredList.map((e: any) => {
                  const isIncome = e.source_type === "income";
                  const isGeneral = e.source_type === "general";
                  const isFuel = e.source_type === "vehicle_fuel";
                  const isAdvance = e.source_type === "employee_advance";
                  const isPaid = e.status === "Ödendi";

                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition">
                      {/* Tarih */}
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono whitespace-nowrap">
                        {formatDate(e.expense_date)}
                      </td>

                      {/* Tür & Kaynak Rozeti */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isIncome ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <TrendingUp size={11} />
                            Kasa Geliri
                          </span>
                        ) : isGeneral ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                            <Building2 size={11} />
                            Genel Gider
                          </span>
                        ) : isFuel ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                            <Truck size={11} />
                            Araç Yakıtı
                          </span>
                        ) : isAdvance ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                            <UserCheck size={11} />
                            Personel Avansı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                            <Receipt size={11} />
                            Günlük Masraf
                          </span>
                        )}
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {e.category}
                      </td>

                      {/* Açıklama */}
                      <td className="py-3 px-4 font-medium text-slate-800 max-w-xs sm:max-w-md">
                        {e.description}
                      </td>

                      {/* Tutar */}
                      <td className="py-3 px-4 text-right font-black tabular-nums whitespace-nowrap">
                        <span className={isIncome ? "text-emerald-600 text-sm" : "text-rose-600 text-sm"}>
                          {isIncome ? "+" : "-"}{formatCurrency(e.amount)}
                        </span>
                      </td>

                      {/* Ödeme / Tahsilat Yöntemi */}
                      <td className="py-3 px-4 text-center text-slate-500 font-medium whitespace-nowrap">
                        {e.payment_method || "Nakit"}
                      </td>

                      {/* Durum (Tıklanabilir Toggle) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(e.id, e.status)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition shadow-2xs ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                        >
                          {isPaid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{isPaid ? "Ödendi" : "Ödenmedi"}</span>
                        </button>
                      </td>

                      {/* Notlar */}
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={e.notes || ""}>
                        {e.notes || "—"}
                      </td>

                      {/* Özel Sütunlar */}
                      {cols.map((col) => (
                        <td key={col.column_key} className="py-3 px-4 whitespace-nowrap">
                          <CustomColumnCell
                            tableName="daily_expenses"
                            rowId={e.id}
                            column={col}
                            initialValue={e.custom_fields?.[col.column_key]}
                            revalidateUrl="/finans/gunluk-giderler"
                          />
                        </td>
                      ))}

                      {/* İşlemler (Düzenle & Sil) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {e.is_manual ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEdit(e)}
                                className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition"
                                title="Kaydı Düzenle"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(e.id)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                                title="Kaydı Sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <span
                              className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded-md"
                              title="Bu işlem araç veya personel sayfasından otomatik aktarılmıştır"
                            >
                              Otomatik
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </InteractiveTable>
        )}
      </div>

      {/* YENİ KAYIT / DÜZENLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 border border-border animate-in fade-in zoom-in duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {formData.source_type === "income" ? (
                  <TrendingUp size={20} className="text-emerald-600" />
                ) : formData.source_type === "general" ? (
                  <Building2 size={20} className="text-purple-600" />
                ) : (
                  <Receipt size={20} className="text-rose-600" />
                )}
                {isEditing ? "Kaydı Düzenle" : "Yeni İşlem Ekle"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              {/* İşlem Türü Seçimi (Sekmeli Butonlar) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  İşlem Türü *
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        source_type: "manual",
                        category: DAILY_EXPENSE_CATEGORIES[0],
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.source_type === "manual"
                        ? "bg-white text-rose-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Receipt size={14} />
                    <span>Günlük Gider</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        source_type: "general",
                        category: GENERAL_EXPENSE_CATEGORIES[0],
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.source_type === "general"
                        ? "bg-white text-purple-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building2 size={14} />
                    <span>Genel Gider</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        source_type: "income",
                        category: INCOME_CATEGORIES[0],
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      formData.source_type === "income"
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <TrendingUp size={14} />
                    <span>Günlük Gelir</span>
                  </button>
                </div>
              </div>

              {/* Tarih ve Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarih *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                  >
                    {formData.source_type === "general"
                      ? GENERAL_EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))
                      : formData.source_type === "income"
                      ? INCOME_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))
                      : DAILY_EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Açıklama / Kimin Adına *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.source_type === "general"
                      ? "Örn: Metin Demir Muhasebe Ücreti, Ofis Kirası, Elektrik Faturası..."
                      : formData.source_type === "income"
                      ? "Örn: Ahmet Bey Elden Kasa Ödemesi, Hurda Demir Satışı..."
                      : "Örn: Ofis mutfak çay-şeker alışverişi, kargo bedeli..."
                  }
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                />
              </div>

              {/* Tutar ve Ödeme / Tahsilat Yöntemi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tutar (₺) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="1500"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 font-black ${
                      formData.source_type === "income" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ödeme / Tahsilat Yöntemi
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                  >
                    <option value="Nakit">Nakit</option>
                    <option value="Kredi Kartı">Kredi Kartı</option>
                    <option value="Havale/EFT">Havale / EFT</option>
                    <option value="Çek">Çek</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>

              {/* Durum */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Durum
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white font-medium"
                >
                  <option value="Ödendi">
                    {formData.source_type === "income" ? "Tahsil Edildi (Kasa Girişi Yapıldı)" : "Ödendi (Masraf Yapıldı)"}
                  </option>
                  <option value="Ödenmedi">
                    {formData.source_type === "income" ? "Bekleyen Tahsilat" : "Ödenmedi (Bekleyen Masraf)"}
                  </option>
                </select>
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notlar / Fiş veya Banka Bilgisi
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Banka şubesi, fiş/fatura numarası, notlar..."
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                />
              </div>

              {/* Alt Butonlar */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-xs font-black rounded-xl transition shadow-sm ${
                    formData.source_type === "income"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : formData.source_type === "general"
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-brand-gold hover:bg-brand-gold-light text-brand-navy"
                  }`}
                >
                  {isEditing ? "Değişiklikleri Kaydet" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
