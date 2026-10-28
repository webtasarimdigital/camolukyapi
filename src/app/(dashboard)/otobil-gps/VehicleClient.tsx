"use client";

import { useState, useTransition, useMemo } from "react";
import type { Vehicle, VehicleExpense, VehicleDocuments, ExpiryAlertInfo } from "./types";
import { getExpiryAlert } from "./types";
import {
  saveVehicle,
  deleteVehicle,
  getVehicles,
  addVehicleExpense,
  deleteVehicleExpense,
  updateVehicleDocuments,
  uploadVehicleFile,
} from "./actions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  MapPin,
  Phone,
  User,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  Navigation,
  X,
  Package,
  AlertCircle,
  Fuel,
  Calendar,
  ShieldCheck,
  Wrench,
  Download,
  AlertTriangle,
  Bell,
  FileText,
  Search,
  Upload,
  Camera,
  FileCheck,
  Image as ImageIcon,
  ExternalLink,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  Gauge,
  Zap,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { InteractiveTable } from "@/components/ui/InteractiveTable";

interface Props {
  initialVehicles: Vehicle[];
  userName: string;
  userRole: string;
}

const VEHICLE_TYPES = [
  "Kamyon",
  "TIR",
  "Kamyonet",
  "Pickup",
  "Hafif Ticari",
  "Binek",
  "Diğer",
];

const EMPTY_FORM = {
  plate: "",
  driver_name: "",
  driver_phone: "",
  vehicle_type: "Kamyon",
  current_location: "",
  destination: "",
  cargo_notes: "",
  inspection_date: "",
  insurance_date: "",
  license_date: "",
  maintenance_date: "",
  notes: "",
};

export function VehicleClient({ initialVehicles, userRole }: Props) {
  const isAdmin = !userRole || ["admin", "yonetici", "muhasebe1", "owner"].includes(userRole);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Detail Modal State
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [expenseTab, setExpenseTab] = useState<"all" | "fuel" | "repair">("all");

  // New Expense Form inside Detail Modal
  const [expenseType, setExpenseType] = useState<"fuel" | "repair">("fuel");
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseKm, setExpenseKm] = useState<string>("");
  const [expenseLiters, setExpenseLiters] = useState<string>("");
  const [expenseNotes, setExpenseNotes] = useState<string>("");
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Document Uploads inside Detail Modal
  const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Ana Ekran Genel Masraf & Ay Ay Filtresi State
  const [fleetSelectedMonth, setFleetSelectedMonth] = useState<string>("all");
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState<boolean>(false);

  // ── TÜM FİLO MASRAFLARI & AY AY DAĞILIMI (İLK EKRAN İÇİN) ──
  const allFleetExpenses = useMemo(() => {
    const list: (VehicleExpense & { vehiclePlate: string; vehicleId: string })[] = [];
    for (const v of vehicles) {
      if (Array.isArray(v.expenses)) {
        for (const e of v.expenses) {
          list.push({ ...e, vehiclePlate: v.plate, vehicleId: v.id });
        }
      }
    }
    return list;
  }, [vehicles]);

  const fleetMonthsSummary = useMemo(() => {
    const monthsMap = new Map<
      string,
      {
        monthKey: string;
        label: string;
        fuelTotal: number;
        repairTotal: number;
        grandTotal: number;
        count: number;
        vehicleCount: number;
        vehiclePlates: Set<string>;
      }
    >();

    const monthNames = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    for (const exp of allFleetExpenses) {
      if (exp.date) {
        const ym = exp.date.substring(0, 7); // YYYY-MM
        if (!monthsMap.has(ym)) {
          const [year, month] = ym.split("-");
          const idx = parseInt(month, 10) - 1;
          const label = `${monthNames[idx] || month} ${year}`;
          monthsMap.set(ym, {
            monthKey: ym,
            label,
            fuelTotal: 0,
            repairTotal: 0,
            grandTotal: 0,
            count: 0,
            vehicleCount: 0,
            vehiclePlates: new Set(),
          });
        }
        const m = monthsMap.get(ym)!;
        const amt = Number(exp.amount) || 0;
        if (exp.type === "fuel") {
          m.fuelTotal += amt;
        } else if (exp.type === "repair") {
          m.repairTotal += amt;
        }
        m.grandTotal += amt;
        m.count += 1;
        m.vehiclePlates.add(exp.vehiclePlate);
      }
    }

    // Her ay için araç sayısını güncelle
    for (const m of monthsMap.values()) {
      m.vehicleCount = m.vehiclePlates.size;
    }

    // Mevcut ayı ekle
    const currentYm = new Date().toISOString().substring(0, 7);
    if (!monthsMap.has(currentYm)) {
      const [year, month] = currentYm.split("-");
      const idx = parseInt(month, 10) - 1;
      const label = `${monthNames[idx] || month} ${year}`;
      monthsMap.set(currentYm, {
        monthKey: currentYm,
        label,
        fuelTotal: 0,
        repairTotal: 0,
        grandTotal: 0,
        count: 0,
        vehicleCount: 0,
        vehiclePlates: new Set(),
      });
    }

    return Array.from(monthsMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allFleetExpenses]);

  // İlk ekranda seçili aya göre toplamlar
  const fleetTotals = useMemo(() => {
    let fuelTotal = 0;
    let repairTotal = 0;
    let count = 0;
    const activeVehicles = new Set<string>();

    for (const v of vehicles) {
      const expenses = v.expenses || [];
      for (const e of expenses) {
        if (fleetSelectedMonth === "all" || (e.date && e.date.startsWith(fleetSelectedMonth))) {
          const amt = Number(e.amount) || 0;
          if (e.type === "fuel") fuelTotal += amt;
          else if (e.type === "repair") repairTotal += amt;
          count += 1;
          activeVehicles.add(v.id);
        }
      }
    }

    // Fallback: Masraf kaydı yoksa v.fuel_cost ve v.maintenance_cost
    if (fleetSelectedMonth === "all" && fuelTotal === 0 && repairTotal === 0) {
      for (const v of vehicles) {
        const fc = Number(v.fuel_cost) || 0;
        const mc = Number(v.maintenance_cost) || 0;
        fuelTotal += fc;
        repairTotal += mc;
        if (fc > 0 || mc > 0) activeVehicles.add(v.id);
      }
    }

    return {
      fuelTotal,
      repairTotal,
      grandTotal: fuelTotal + repairTotal,
      count,
      activeVehicleCount: activeVehicles.size,
    };
  }, [vehicles, fleetSelectedMonth]);

  const selectedFleetMonthLabel = useMemo(() => {
    if (fleetSelectedMonth === "all") return "Tüm Zamanlar";
    const found = fleetMonthsSummary.find((m) => m.monthKey === fleetSelectedMonth);
    return found ? found.label : fleetSelectedMonth;
  }, [fleetSelectedMonth, fleetMonthsSummary]);

  // ── SÜRE BİTİMİ HATIRLATICILARI ──
  const allAlerts = useMemo(() => {
    const list: {
      vehicle: Vehicle;
      itemType: "Muayene" | "Sigorta" | "Kasko";
      alert: ExpiryAlertInfo;
      date: string;
    }[] = [];

    for (const v of vehicles) {
      if (v.inspection_date) {
        const alert = getExpiryAlert(v.inspection_date);
        if (["expired", "critical", "warning"].includes(alert.status)) {
          list.push({ vehicle: v, itemType: "Muayene", alert, date: v.inspection_date });
        }
      }
      if (v.insurance_date) {
        const alert = getExpiryAlert(v.insurance_date);
        if (["expired", "critical", "warning"].includes(alert.status)) {
          list.push({ vehicle: v, itemType: "Sigorta", alert, date: v.insurance_date });
        }
      }
      if (v.license_date) {
        const alert = getExpiryAlert(v.license_date);
        if (["expired", "critical", "warning"].includes(alert.status)) {
          list.push({ vehicle: v, itemType: "Kasko", alert, date: v.license_date });
        }
      }
    }

    return list.sort((a, b) => a.alert.daysLeft - b.alert.daysLeft);
  }, [vehicles]);

  const urgentAlerts = allAlerts.filter(
    (a) => a.alert.status === "expired" || a.alert.status === "critical"
  );
  const warningAlerts = allAlerts.filter((a) => a.alert.status === "warning");

  // ── FİLTRELENMİŞ ARAÇ LİSTESİ ──
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filterAlertOnly) {
        const hasAlert = allAlerts.some((a) => a.vehicle.id === v.id);
        if (!hasAlert) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = v.plate.toLowerCase().includes(q);
        const matchesDriver = v.driver_name.toLowerCase().includes(q);
        const matchesLoc = (v.current_location || "").toLowerCase().includes(q);
        if (!matchesPlate && !matchesDriver && !matchesLoc) return false;
      }
      return true;
    });
  }, [vehicles, searchQuery, filterAlertOnly, allAlerts]);

  // ── SEÇİLİ ARACIN AYLARI VE MASRAF ÖZETLERİ ──
  const detailExpenses = detailVehicle?.expenses || [];

  // En son kaydedilmiş güncel KM
  const latestRecordedKm = useMemo(() => {
    if (!detailVehicle || !Array.isArray(detailVehicle.expenses)) return null;
    const kms = detailVehicle.expenses
      .map((e) => (typeof e.km === "number" && e.km > 0 ? e.km : null))
      .filter((k): k is number => k !== null);
    return kms.length > 0 ? Math.max(...kms) : null;
  }, [detailVehicle]);

  // Form içindeki anlık canlı yakıt ve KM farkı hesabı
  const liveKmDiff = useMemo(() => {
    const current = parseFloat(expenseKm);
    if (isNaN(current) || current <= 0 || latestRecordedKm === null) return null;
    const diff = current - latestRecordedKm;
    return diff > 0 ? diff : null;
  }, [expenseKm, latestRecordedKm]);

  const liveCostPerKm = useMemo(() => {
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0 || !liveKmDiff) return null;
    return amt / liveKmDiff;
  }, [expenseAmount, liveKmDiff]);

  const liveCostPer100Km = useMemo(() => {
    return liveCostPerKm ? liveCostPerKm * 100 : null;
  }, [liveCostPerKm]);

  const liveLitersPer100Km = useMemo(() => {
    const l = parseFloat(expenseLiters);
    if (isNaN(l) || l <= 0 || !liveKmDiff) return null;
    return (l / liveKmDiff) * 100;
  }, [expenseLiters, liveKmDiff]);

  // Tüm masrafları kronolojik olarak inceleyip her yakıt kaydı için önceki KM'yi,
  // KM farkını ve birim yakıt maliyetini hesaplayan zenginleştirilmiş liste:
  const enrichedExpenses = useMemo(() => {
    if (!detailVehicle || !Array.isArray(detailVehicle.expenses)) return [];

    // Sadece KM bilgisi olan yakıt kayıtlarını kronolojik (tarih ve km artan) sırala
    const sortedFuelWithKm = [...detailVehicle.expenses]
      .filter((e) => e.type === "fuel" && typeof e.km === "number" && e.km > 0)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.km || 0) - (b.km || 0);
      });

    const statsMap = new Map<
      string,
      {
        prevKm: number | null;
        kmDiff: number | null;
        costPerKm: number | null;
        costPer100Km: number | null;
        litersPer100Km: number | null;
        isFirst: boolean;
      }
    >();

    sortedFuelWithKm.forEach((curr, idx) => {
      if (idx === 0) {
        statsMap.set(curr.id, {
          prevKm: null,
          kmDiff: null,
          costPerKm: null,
          costPer100Km: null,
          litersPer100Km: null,
          isFirst: true,
        });
      } else {
        const prev = sortedFuelWithKm[idx - 1];
        const diff = (curr.km || 0) - (prev.km || 0);
        if (diff > 0) {
          const costPerKm = curr.amount / diff;
          const costPer100Km = costPerKm * 100;
          const litersPer100Km = curr.liters && curr.liters > 0 ? (curr.liters / diff) * 100 : null;
          statsMap.set(curr.id, {
            prevKm: prev.km || null,
            kmDiff: diff,
            costPerKm,
            costPer100Km,
            litersPer100Km,
            isFirst: false,
          });
        } else {
          statsMap.set(curr.id, {
            prevKm: prev.km || null,
            kmDiff: diff,
            costPerKm: null,
            costPer100Km: null,
            litersPer100Km: null,
            isFirst: false,
          });
        }
      }
    });

    return detailVehicle.expenses.map((exp) => {
      const s = statsMap.get(exp.id);
      return {
        ...exp,
        prevKm: s?.prevKm ?? null,
        kmDiff: s?.kmDiff ?? null,
        costPerKm: s?.costPerKm ?? null,
        costPer100Km: s?.costPer100Km ?? null,
        litersPer100Km: s?.litersPer100Km ?? null,
        isFirstFuel: s?.isFirst ?? false,
      };
    });
  }, [detailVehicle]);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    for (const exp of detailExpenses) {
      if (exp.date) {
        const ym = exp.date.substring(0, 7); // YYYY-MM
        monthsSet.add(ym);
      }
    }
    return Array.from(monthsSet).sort().reverse();
  }, [detailExpenses]);

  const filteredExpenses = useMemo(() => {
    return enrichedExpenses.filter((e) => {
      if (selectedMonth !== "all" && !e.date.startsWith(selectedMonth)) {
        return false;
      }
      if (expenseTab !== "all" && e.type !== expenseTab) {
        return false;
      }
      return true;
    });
  }, [enrichedExpenses, selectedMonth, expenseTab]);

  const monthFuelTotal = useMemo(() => {
    return detailExpenses
      .filter((e) => (selectedMonth === "all" || e.date.startsWith(selectedMonth)) && e.type === "fuel")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [detailExpenses, selectedMonth]);

  const monthRepairTotal = useMemo(() => {
    return detailExpenses
      .filter((e) => (selectedMonth === "all" || e.date.startsWith(selectedMonth)) && e.type === "repair")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [detailExpenses, selectedMonth]);

  // Seçili dönem için KM ve yakıt verimlilik istatistikleri
  const periodFuelStats = useMemo(() => {
    const periodFuels = filteredExpenses.filter((e) => e.type === "fuel");
    const fuelAmount = periodFuels.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const fuelLiters = periodFuels.reduce((sum, e) => sum + (Number(e.liters) || 0), 0);

    // Katedilen toplam mesafe: Bu dönemdeki yakıt alımları arasındaki farkların toplamı
    const totalKmDiff = periodFuels.reduce((sum, e) => sum + (e.kmDiff && e.kmDiff > 0 ? e.kmDiff : 0), 0);

    const validKms = periodFuels
      .map((e) => e.km)
      .filter((k): k is number => typeof k === "number" && k > 0);
    const minKm = validKms.length > 0 ? Math.min(...validKms) : null;
    const maxKm = validKms.length > 0 ? Math.max(...validKms) : null;

    const distanceDriven = totalKmDiff > 0 ? totalKmDiff : (minKm && maxKm && maxKm > minKm ? maxKm - minKm : 0);

    const avgCostPerKm = distanceDriven > 0 ? fuelAmount / distanceDriven : null;
    const avgCostPer100Km = avgCostPerKm ? avgCostPerKm * 100 : null;
    const avgLitersPer100Km = distanceDriven > 0 && fuelLiters > 0 ? (fuelLiters / distanceDriven) * 100 : null;

    return {
      count: periodFuels.length,
      fuelAmount,
      fuelLiters,
      distanceDriven,
      avgCostPerKm,
      avgCostPer100Km,
      avgLitersPer100Km,
      minKm,
      maxKm,
    };
  }, [filteredExpenses]);

  // ── ARAÇ FORM KAYIT ──
  function handleOpenAdd() {
    setEditingVehicle(null);
    setForm({ ...EMPTY_FORM });
    setIsModalOpen(true);
  }

  function handleOpenEdit(v: Vehicle) {
    setEditingVehicle(v);
    setForm({
      plate: v.plate,
      driver_name: v.driver_name,
      driver_phone: v.driver_phone || "",
      vehicle_type: v.vehicle_type || "Kamyon",
      current_location: v.current_location || "",
      destination: v.destination || "",
      cargo_notes: v.cargo_notes || "",
      inspection_date: v.inspection_date || "",
      insurance_date: v.insurance_date || "",
      license_date: v.license_date || "",
      maintenance_date: v.maintenance_date || "",
      notes: v.notes || "",
    });
    setIsModalOpen(true);
  }

  function handleSaveVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plate.trim() || !form.driver_name.trim()) {
      toast.error("Lütfen plaka ve şoför adını doldurunuz.");
      return;
    }

    startTransition(async () => {
      try {
        await saveVehicle({
          id: editingVehicle?.id,
          plate: form.plate,
          driver_name: form.driver_name,
          driver_phone: form.driver_phone,
          vehicle_type: form.vehicle_type,
          current_location: form.current_location,
          destination: form.destination,
          cargo_notes: form.cargo_notes,
          inspection_date: form.inspection_date || undefined,
          insurance_date: form.insurance_date || undefined,
          license_date: form.license_date || undefined,
          maintenance_date: form.maintenance_date || undefined,
          notes: form.notes,
        });

        const refreshed = await getVehicles();
        setVehicles(refreshed);
        setIsModalOpen(false);
        toast.success(
          editingVehicle
            ? `${form.plate} başarıyla güncellendi!`
            : `${form.plate} filoya eklendi!`
        );
      } catch (err: any) {
        toast.error("Hata: " + err.message);
      }
    });
  }

  function handleDeleteVehicle(id: string, plate: string) {
    if (!confirm(`${plate} plakalı aracı filodan silmek istediğinize emin misiniz?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteVehicle(id);
        const refreshed = await getVehicles();
        setVehicles(refreshed);
        if (detailVehicle?.id === id) setDetailVehicle(null);
        toast.success(`${plate} filodan silindi.`);
      } catch (err: any) {
        toast.error("Silme hatası: " + err.message);
      }
    });
  }

  // ── YENİ MASRAF EKLEME (Fiş Fotoğrafı ve KM ile) ──
  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!detailVehicle) return;

    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Lütfen geçerli bir masraf tutarı giriniz.");
      return;
    }

    setIsSavingExpense(true);
    try {
      let receiptUrl: string | null = null;

      // Fotoğraf / dosya varsa storage'a yükle
      if (expenseFile) {
        const formData = new FormData();
        formData.append("file", expenseFile);
        const uploadRes = await uploadVehicleFile(formData);
        receiptUrl = uploadRes.url;
      }

      const kmNum = expenseKm ? parseFloat(expenseKm) : null;
      const litersNum = expenseLiters ? parseFloat(expenseLiters) : null;

      const res = await addVehicleExpense(detailVehicle.id, {
        type: expenseType,
        date: expenseDate,
        amount: amountNum,
        km: kmNum,
        liters: litersNum,
        receipt_url: receiptUrl,
        notes: expenseNotes.trim() || null,
      });

      if (res.success) {
        toast.success(
          expenseType === "fuel"
            ? "Yakıt fişi ve masrafı başarıyla kaydedildi!"
            : "Tamir/bakım masrafı başarıyla kaydedildi!"
        );

        // Formu temizle
        setExpenseAmount("");
        setExpenseKm("");
        setExpenseLiters("");
        setExpenseNotes("");
        setExpenseFile(null);

        // Listeyi yenile
        const refreshed = await getVehicles();
        setVehicles(refreshed);
        const updatedDetail = refreshed.find((v) => v.id === detailVehicle.id);
        if (updatedDetail) setDetailVehicle(updatedDetail);
      }
    } catch (err: any) {
      toast.error("Masraf eklenirken hata: " + err.message);
    } finally {
      setIsSavingExpense(false);
    }
  }

  // ── MASRAF SİLME ──
  async function handleDeleteExpense(expenseId: string) {
    if (!detailVehicle) return;
    if (!confirm("Bu masraf kaydını silmek istediğinize emin misiniz?")) return;

    try {
      await deleteVehicleExpense(detailVehicle.id, expenseId);
      toast.success("Masraf kaydı silindi.");
      const refreshed = await getVehicles();
      setVehicles(refreshed);
      const updatedDetail = refreshed.find((v) => v.id === detailVehicle.id);
      if (updatedDetail) setDetailVehicle(updatedDetail);
    } catch (err: any) {
      toast.error("Silinemedi: " + err.message);
    }
  }

  // ── RUHSAT, SİGORTA VE POLİÇE DOSYASI YÜKLEME ──
  async function handleUploadDoc(
    docType: "license" | "insurance" | "policy",
    file: File
  ) {
    if (!detailVehicle) return;
    setIsUploadingDoc(docType);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadVehicleFile(formData);

      const docUpdates: VehicleDocuments = {};
      if (docType === "license") docUpdates.license_photo_url = res.url;
      if (docType === "insurance") docUpdates.insurance_photo_url = res.url;
      if (docType === "policy") docUpdates.policy_pdf_url = res.url;

      await updateVehicleDocuments(detailVehicle.id, docUpdates);
      toast.success("Belge başarıyla yüklendi!");

      const refreshed = await getVehicles();
      setVehicles(refreshed);
      const updatedDetail = refreshed.find((v) => v.id === detailVehicle.id);
      if (updatedDetail) setDetailVehicle(updatedDetail);
    } catch (err: any) {
      toast.error("Belge yükleme hatası: " + err.message);
    } finally {
      setIsUploadingDoc(null);
    }
  }

  // ── EXCEL ÇIKTISI ──
  function exportToExcel() {
    const data = vehicles.map((v) => {
      const expenses = v.expenses || [];
      const totalFuel = expenses
        .filter((e) => e.type === "fuel")
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalRepair = expenses
        .filter((e) => e.type === "repair")
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      return {
        "Plaka": v.plate,
        "Araç Tipi": v.vehicle_type,
        "Şoför Adı": v.driver_name,
        "Şoför Telefonu": v.driver_phone || "-",
        "Güncel Konum": v.current_location || "-",
        "Muayene Bitiş Tarihi": v.inspection_date || "-",
        "Trafik Sigortası Bitiş": v.insurance_date || "-",
        "Kasko Bitiş": v.license_date || "-",
        "Toplam Yakıt Masrafı (TL)": totalFuel,
        "Toplam Tamir/Bakım (TL)": totalRepair,
        "Toplam Masraf (TL)": totalFuel + totalRepair,
        "Kayıtlı Masraf Adedi": expenses.length,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Araç Filosu ve Masraflar");
    XLSX.writeFile(wb, `Camoluk_Arac_Filosu_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Araç ve masraf listesi Excel olarak indirildi.");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── ÜST BAŞLIK VE AKSİYONLAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="text-brand-gold" />
            Araç & Filo Takip
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Şirket araçlarının detaylı yakıt, tamir/bakım masrafları, kilometre takibi ve resmi evrak (ruhsat/poliçe) yönetimi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-border px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Excele İndir</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
            >
              <Plus size={16} />
              <span>Yeni Araç Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* ── İLK EKRAN: DÖNEM / AY SEÇİCİ & TOPLAM MASRAF VE YAKIT KPI KARTLARI ── */}
      <div className="space-y-4">
        {/* Ay Seçim Çubuğu */}
        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-navy/5 border border-brand-navy/15 flex items-center justify-center text-brand-navy flex-shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Masraf Dönemi / Ay Seçimi
              </span>
              <p className="text-[11px] text-slate-500">
                Seçtiğiniz aya göre aşağıdaki tüm yakıt, tamir ve genel masraflar anında güncellenir.
              </p>
            </div>
          </div>

          {/* Ay Hapları / Butonları */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFleetSelectedMonth("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                fleetSelectedMonth === "all"
                  ? "bg-brand-navy text-white shadow-xs"
                  : "bg-surface border border-border text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>🔘 Tüm Zamanlar</span>
            </button>

            {fleetMonthsSummary.map((m) => {
              const isSelected = fleetSelectedMonth === m.monthKey;
              return (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => setFleetSelectedMonth(m.monthKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-brand-gold text-brand-navy shadow-xs ring-2 ring-brand-gold/40"
                      : "bg-surface border border-border text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Calendar size={13} className={isSelected ? "text-brand-navy" : "text-slate-400"} />
                  <span>{m.label}</span>
                  {m.grandTotal > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isSelected
                          ? "bg-brand-navy/15 text-brand-navy"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {formatCurrency(m.grandTotal)}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 border border-border bg-white hover:bg-slate-50 flex items-center gap-1 ml-1 cursor-pointer"
              title="Tüm ayların masraf tablosunu göster/gizle"
            >
              <BarChart3 size={14} className="text-brand-navy" />
              <span>{showMonthlyBreakdown ? "Tabloyu Gizle" : "Ay Ay Tablo"}</span>
            </button>
          </div>
        </div>

        {/* 4 BÜYÜK VE BELİRGİN KPI KARTI (İLK EKRAN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. TOPLAM YAKIT MASRAFI */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 p-5 rounded-2xl border-2 border-amber-300 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                <Fuel size={17} className="text-amber-600" />
                Toplam Yakıt Masrafı
              </span>
              <span className="text-[10px] font-bold bg-amber-200/90 text-amber-900 px-2.5 py-0.5 rounded-full">
                {selectedFleetMonthLabel}
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-amber-950 tracking-tight tabular-nums">
              {formatCurrency(fleetTotals.fuelTotal)}
            </p>
            <div className="flex items-center justify-between text-xs text-amber-800 mt-2 pt-2 border-t border-amber-200/80">
              <span>Filodaki Yakıt Gideri</span>
              {fleetTotals.grandTotal > 0 && (
                <span className="font-bold">
                  %{Math.round((fleetTotals.fuelTotal / fleetTotals.grandTotal) * 100)} Pay
                </span>
              )}
            </div>
          </div>

          {/* 2. TOPLAM TAMİR & BAKIM */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 p-5 rounded-2xl border-2 border-blue-300 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                <Wrench size={17} className="text-blue-600" />
                Toplam Tamir & Bakım
              </span>
              <span className="text-[10px] font-bold bg-blue-200/90 text-blue-900 px-2.5 py-0.5 rounded-full">
                {selectedFleetMonthLabel}
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-blue-950 tracking-tight tabular-nums">
              {formatCurrency(fleetTotals.repairTotal)}
            </p>
            <div className="flex items-center justify-between text-xs text-blue-800 mt-2 pt-2 border-t border-blue-200/80">
              <span>Periyodik & Onarım</span>
              {fleetTotals.grandTotal > 0 && (
                <span className="font-bold">
                  %{Math.round((fleetTotals.repairTotal / fleetTotals.grandTotal) * 100)} Pay
                </span>
              )}
            </div>
          </div>

          {/* 3. GENEL TOPLAM MASRAF (YAKIT + TAMİR) */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/70 p-5 rounded-2xl border-2 border-emerald-400 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                <Receipt size={17} className="text-emerald-700" />
                Genel Toplam Masraf
              </span>
              <span className="text-[10px] font-black bg-emerald-200 text-emerald-950 px-2.5 py-0.5 rounded-full">
                {selectedFleetMonthLabel}
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-emerald-950 tracking-tight tabular-nums">
              {formatCurrency(fleetTotals.grandTotal)}
            </p>
            <div className="flex items-center justify-between text-xs text-emerald-800 mt-2 pt-2 border-t border-emerald-300/80">
              <span>Yakıt + Bakım Toplamı</span>
              <span className="font-semibold">{fleetTotals.count} İşlem Kaydı</span>
            </div>
          </div>

          {/* 4. FİLO MASRAF DURUMU */}
          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Truck size={17} className="text-brand-navy" />
                Filo Masraf Durumu
              </span>
              <span className="text-xs font-bold text-slate-500">
                {vehicles.length} Araç
              </span>
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {fleetTotals.activeVehicleCount} <span className="text-sm font-semibold text-slate-500">/ {vehicles.length} Araç</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedFleetMonthLabel} masraf kaydı olan
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-border">
              <span>Kayıtlı Fiş/Fatura:</span>
              <span className="font-bold text-slate-900">{fleetTotals.count} Adet</span>
            </div>
          </div>
        </div>

        {/* AY AY MASRAF DAĞILIMI TABLOSU */}
        {showMonthlyBreakdown && (
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs animate-in fade-in space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-brand-navy" size={18} />
                <h3 className="text-sm font-bold text-slate-900">
                  Ay Ay Filo Masraf Dökümü Tablosu
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Tüm ayların yakıt ve tamir masrafları dökümü
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Dönem / Ay</th>
                    <th className="py-2.5 px-3 text-right">⛽ Yakıt Masrafı</th>
                    <th className="py-2.5 px-3 text-right">🔧 Tamir / Bakım</th>
                    <th className="py-2.5 px-3 text-right">💰 Toplam Masraf</th>
                    <th className="py-2.5 px-3 text-center">Masraf Yapan Araç</th>
                    <th className="py-2.5 px-3 text-center">Fiş Adedi</th>
                    <th className="py-2.5 px-3 text-center">Filtrele</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fleetMonthsSummary.map((m) => {
                    const isSelected = fleetSelectedMonth === m.monthKey;
                    return (
                      <tr
                        key={m.monthKey}
                        className={`transition ${
                          isSelected ? "bg-brand-gold/15 font-bold" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900">{m.label}</span>
                          {isSelected && (
                            <span className="ml-2 text-[10px] bg-brand-navy text-white px-1.5 py-0.2 rounded font-semibold">
                              Seçili
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-700 tabular-nums">
                          {formatCurrency(m.fuelTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-700 tabular-nums">
                          {formatCurrency(m.repairTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 tabular-nums">
                          {formatCurrency(m.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">
                          {m.vehicleCount} Araç
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {m.count}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setFleetSelectedMonth(isSelected ? "all" : m.monthKey)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              isSelected
                                ? "bg-brand-navy text-white"
                                : "bg-slate-100 hover:bg-brand-gold hover:text-brand-navy text-slate-700"
                            }`}
                          >
                            {isSelected ? "Filtreyi Kaldır" : "Bu Ayı Filtrele"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── SÜRE HATIRLATICI UYARI BANTLARI (1 Hafta ve 1 Ay Kalanlar) ── */}
      {urgentAlerts.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-800 font-black text-sm mb-2">
            <AlertTriangle size={18} className="text-rose-600 animate-bounce" />
            <span>ACİL: Süresi Dolan veya 1 Hafta Kalan Belgeler ({urgentAlerts.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {urgentAlerts.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setDetailVehicle(item.vehicle)}
                className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between gap-2 shadow-2xs hover:bg-rose-50/50 cursor-pointer transition"
              >
                <div>
                  <span className="font-bold text-slate-900 font-mono block">
                    {item.vehicle.plate}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {item.itemType}: {formatDate(item.date)}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] ${item.alert.badgeClass}`}>
                  {item.alert.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {warningAlerts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
            <Bell size={15} className="text-amber-600" />
            <span>Yaklaşan Muayene & Sigortalar (1 Ay Kalanlar - {warningAlerts.length})</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {warningAlerts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDetailVehicle(item.vehicle)}
                className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-slate-700 hover:bg-amber-100/50 flex items-center gap-2 transition"
              >
                <span className="font-bold font-mono text-slate-900">{item.vehicle.plate}</span>
                <span className="text-[11px] text-slate-500">({item.itemType})</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  {item.alert.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ARAMA & FİLTRELER ── */}
      <div className="bg-white p-3 rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Plaka, şoför veya konum ile ara..."
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex items-center gap-2">
          {allAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterAlertOnly(!filterAlertOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterAlertOnly
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-surface border border-border text-slate-700 hover:bg-slate-100"
              }`}
            >
              <AlertCircle size={14} />
              <span>Süresi Yaklaşanlar ({allAlerts.length})</span>
            </button>
          )}

          <span className="text-xs font-bold text-slate-500 ml-2">
            Toplam: {filteredVehicles.length} Araç
          </span>
        </div>
      </div>

      {/* ── ARAÇLAR LİSTESİ TABLOSU ── */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        {filteredVehicles.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Truck size={44} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Araç bulunamadı</p>
            <p className="text-xs text-slate-400 mt-1">
              Filtre kriterlerinize uyan araç kaydı bulunmuyor.
            </p>
          </div>
        ) : (
          <InteractiveTable tableId="vehicles-table">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Plaka & Tip</th>
                  <th className="py-3 px-4">Şoför & İletişim</th>
                  <th className="py-3 px-4">Konum</th>
                  <th className="py-3 px-4">Muayene / Sigorta</th>
                  <th className="py-3 px-4 text-right">
                    {fleetSelectedMonth === "all" ? "Toplam Yakıt" : `Yakıt (${selectedFleetMonthLabel})`}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {fleetSelectedMonth === "all" ? "Toplam Tamir" : `Tamir (${selectedFleetMonthLabel})`}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {fleetSelectedMonth === "all" ? "Toplam Masraf" : `Toplam (${selectedFleetMonthLabel})`}
                  </th>
                  <th className="py-3 px-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredVehicles.map((v) => {
                  const expenses = v.expenses || [];
                  const fuelTotal = expenses
                    .filter(
                      (e) =>
                        e.type === "fuel" &&
                        (fleetSelectedMonth === "all" || (e.date && e.date.startsWith(fleetSelectedMonth)))
                    )
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  const repairTotal = expenses
                    .filter(
                      (e) =>
                        e.type === "repair" &&
                        (fleetSelectedMonth === "all" || (e.date && e.date.startsWith(fleetSelectedMonth)))
                    )
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                  const displayFuel =
                    fleetSelectedMonth === "all" && fuelTotal === 0 && Number(v.fuel_cost || 0) > 0
                      ? Number(v.fuel_cost)
                      : fuelTotal;
                  const displayRepair =
                    fleetSelectedMonth === "all" && repairTotal === 0 && Number(v.maintenance_cost || 0) > 0
                      ? Number(v.maintenance_cost)
                      : repairTotal;
                  const displayTotal = displayFuel + displayRepair;

                  const inspAlert = v.inspection_date ? getExpiryAlert(v.inspection_date) : null;
                  const insAlert = v.insurance_date ? getExpiryAlert(v.insurance_date) : null;

                  const vKms = expenses
                    .map((e) => (typeof e.km === "number" && e.km > 0 ? e.km : null))
                    .filter((k): k is number => k !== null);
                  const latestKmForVehicle = vKms.length > 0 ? Math.max(...vKms) : null;

                  const vFuelSorted = expenses
                    .filter((e) => e.type === "fuel" && typeof e.km === "number" && e.km > 0)
                    .sort((a, b) => (a.km || 0) - (b.km || 0));

                  let vDistance = 0;
                  let vFuelAmt = 0;
                  if (vFuelSorted.length >= 2) {
                    const minK = vFuelSorted[0].km!;
                    const maxK = vFuelSorted[vFuelSorted.length - 1].km!;
                    vDistance = maxK - minK;
                    vFuelAmt = vFuelSorted.slice(1).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  }
                  const vAvgCostPerKm = vDistance > 0 && vFuelAmt > 0 ? vFuelAmt / vDistance : null;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      {/* Plaka & Tip */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black font-mono text-slate-900 text-sm bg-slate-100 border border-slate-300 px-2 py-0.5 rounded shadow-2xs">
                            {v.plate}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {v.vehicle_type}
                          </span>
                        </div>
                        {latestKmForVehicle !== null && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1 font-semibold">
                            <Gauge size={11} className="text-slate-400" />
                            <span>{latestKmForVehicle.toLocaleString("tr-TR")} KM</span>
                          </div>
                        )}
                      </td>

                      {/* Şoför & Telefon */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block text-xs">
                          {v.driver_name}
                        </span>
                        {v.driver_phone && (
                          <span className="text-[11px] text-slate-500">
                            {v.driver_phone}
                          </span>
                        )}
                      </td>

                      {/* Konum */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin size={13} className="text-brand-gold flex-shrink-0" />
                          <span>{v.current_location || "Belirtilmedi"}</span>
                        </div>
                      </td>

                      {/* Muayene / Sigorta Uyarısı */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {inspAlert && inspAlert.status !== "none" && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-semibold w-14">
                                Muayene:
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] ${inspAlert.badgeClass}`}>
                                {inspAlert.label}
                              </span>
                            </div>
                          )}
                          {insAlert && insAlert.status !== "none" && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-semibold w-14">
                                Sigorta:
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] ${insAlert.badgeClass}`}>
                                {insAlert.label}
                              </span>
                            </div>
                          )}
                          {(!inspAlert || inspAlert.status === "none") && (!insAlert || insAlert.status === "none") && (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Yakıt */}
                      <td className="py-3 px-4 text-right font-bold text-amber-700 tabular-nums">
                        <div>{formatCurrency(displayFuel)}</div>
                        {vAvgCostPerKm !== null && (
                          <div className="text-[10px] text-emerald-700 font-semibold font-mono">
                            ~₺{vAvgCostPerKm.toFixed(2)}/km
                          </div>
                        )}
                      </td>

                      {/* Tamir */}
                      <td className="py-3 px-4 text-right font-bold text-blue-700 tabular-nums">
                        {formatCurrency(displayRepair)}
                      </td>

                      {/* Toplam Masraf */}
                      <td className="py-3 px-4 text-right font-black text-slate-900 tabular-nums bg-slate-50/50">
                        {formatCurrency(displayTotal)}
                      </td>

                      {/* Aksiyonlar */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailVehicle(v)}
                            className="bg-brand-navy hover:bg-brand-navy-2 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            title="Araç Detayı, Masraflar ve Belgeler"
                          >
                            <Fuel size={13} className="text-brand-gold" />
                            <span>Masraf & Detay</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(v)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 transition rounded hover:bg-slate-100"
                                title="Düzenle"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVehicle(v.id, v.plate)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded hover:bg-rose-50"
                                title="Sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
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

      {/* ── ARAÇ DETAY & MASRAFLAR & BELGELER MODALI (Büyük Drawer/Modal) ── */}
      {detailVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-border">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-brand-gold text-brand-navy font-black font-mono text-base px-3 py-1 rounded-lg shadow-sm">
                  {detailVehicle.plate}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    {detailVehicle.driver_name} • {detailVehicle.vehicle_type}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Konum: {detailVehicle.current_location || "Belirtilmedi"} • Tel: {detailVehicle.driver_phone || "-"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailVehicle(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* 1. BELGELER VE EVRAKLAR (Ruhsat, Sigorta, Poliçe PDF) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-border space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck size={16} className="text-brand-gold" />
                  Araç Resmi Evrakları & Belgeleri (Ruhsat, Sigorta, Poliçe PDF)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Ruhsat Fotoğrafı */}
                  <div className="bg-white p-3 rounded-xl border border-border space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      📄 Araç Ruhsatı
                    </span>
                    {detailVehicle.documents?.license_photo_url ? (
                      <div className="space-y-1.5">
                        <a
                          href={detailVehicle.documents.license_photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block group relative rounded-lg overflow-hidden border border-border h-24 bg-slate-100 flex items-center justify-center"
                        >
                          <img
                            src={detailVehicle.documents.license_photo_url}
                            alt="Ruhsat Fotoğrafı"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <span className="absolute inset-0 bg-black/40 text-white text-[11px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <ExternalLink size={14} className="mr-1" /> Büyüt / Gör
                          </span>
                        </a>
                        <label className="text-[11px] text-brand-navy hover:underline font-semibold cursor-pointer block text-center">
                          Fotoğrafı Değiştir
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleUploadDoc("license", e.target.files[0]);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-brand-gold p-4 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50 hover:bg-white h-24">
                        <Camera size={20} className="text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-600">
                          {isUploadingDoc === "license" ? "Yükleniyor..." : "Ruhsat Fotoğrafı Ekle"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadDoc("license", e.target.files[0]);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Sigorta Fotoğrafı */}
                  <div className="bg-white p-3 rounded-xl border border-border space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      🛡️ Trafik Sigortası Fotoğrafı
                    </span>
                    {detailVehicle.documents?.insurance_photo_url ? (
                      <div className="space-y-1.5">
                        <a
                          href={detailVehicle.documents.insurance_photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block group relative rounded-lg overflow-hidden border border-border h-24 bg-slate-100 flex items-center justify-center"
                        >
                          <img
                            src={detailVehicle.documents.insurance_photo_url}
                            alt="Sigorta Fotoğrafı"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <span className="absolute inset-0 bg-black/40 text-white text-[11px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <ExternalLink size={14} className="mr-1" /> Büyüt / Gör
                          </span>
                        </a>
                        <label className="text-[11px] text-brand-navy hover:underline font-semibold cursor-pointer block text-center">
                          Fotoğrafı Değiştir
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleUploadDoc("insurance", e.target.files[0]);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-brand-gold p-4 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50 hover:bg-white h-24">
                        <Camera size={20} className="text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-600">
                          {isUploadingDoc === "insurance" ? "Yükleniyor..." : "Sigorta Fotoğrafı Ekle"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadDoc("insurance", e.target.files[0]);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Poliçe PDF'i */}
                  <div className="bg-white p-3 rounded-xl border border-border space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      📑 Sigorta Poliçesi (PDF)
                    </span>
                    {detailVehicle.documents?.policy_pdf_url ? (
                      <div className="space-y-1.5 h-24 flex flex-col justify-center items-center bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <FileText size={24} className="text-rose-600 mb-1" />
                        <a
                          href={detailVehicle.documents.policy_pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-brand-navy hover:underline flex items-center gap-1"
                        >
                          Poliçe PDF'ini Aç <ExternalLink size={12} />
                        </a>
                        <label className="text-[10px] text-slate-400 hover:underline cursor-pointer">
                          Yenisini Yükle
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleUploadDoc("policy", e.target.files[0]);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-brand-gold p-4 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50 hover:bg-white h-24">
                        <Upload size={20} className="text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-600">
                          {isUploadingDoc === "policy" ? "Yükleniyor..." : "Poliçe PDF'i Yükle"}
                        </span>
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadDoc("policy", e.target.files[0]);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. YENİ MASRAF EKLEME FORMU (Fotoğraf, KM, Tutar ve Tarih) */}
              <form onSubmit={handleAddExpense} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <Plus size={15} className="text-amber-600" />
                  Yeni Masraf Ekle (Yakıt Fişi / Tamir Faturası)
                </h3>

                <div className={`grid grid-cols-1 sm:grid-cols-2 ${expenseType === "fuel" ? "md:grid-cols-5" : "md:grid-cols-4"} gap-3`}>
                  {/* Masraf Tipi */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Masraf Türü
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setExpenseType("fuel")}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          expenseType === "fuel"
                            ? "bg-brand-navy text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        ⛽ Yakıt
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseType("repair")}
                        className={`py-1.5 text-xs font-bold rounded-lg transition ${
                          expenseType === "repair"
                            ? "bg-brand-navy text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        🔧 Tamir / Bakım
                      </button>
                    </div>
                  </div>

                  {/* Tarih */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      İşlem Tarihi
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                    />
                  </div>

                  {/* Tutar */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Masraf Tutarı (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="Örn: 4000"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                    />
                  </div>

                  {/* O Anki KM */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Aracın O Anki KM'si
                      </label>
                      {latestRecordedKm !== null && (
                        <span className="text-[10px] font-bold text-brand-navy bg-brand-navy/10 px-1.5 py-0.5 rounded" title="Son kayıtlı kilometre">
                          Son: {latestRecordedKm.toLocaleString("tr-TR")}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      placeholder={latestRecordedKm ? `Örn: ${latestRecordedKm + 2000}` : "Örn: 145200"}
                      value={expenseKm}
                      onChange={(e) => setExpenseKm(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                    />
                  </div>

                  {/* Yakıt Litresi (Opsiyonel) */}
                  {expenseType === "fuel" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Alınan Litre <span className="text-slate-400 font-normal">(Opsiyonel)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Örn: 80"
                        value={expenseLiters}
                        onChange={(e) => setExpenseLiters(e.target.value)}
                        className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                      />
                    </div>
                  )}
                </div>

                {/* CANLI YAKIT VE KM FARKI HESAPLAMA BANNER'I */}
                {expenseType === "fuel" && liveKmDiff !== null && liveCostPerKm !== null && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                        <Zap size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <span>{latestRecordedKm?.toLocaleString("tr-TR")} KM</span>
                          <ArrowRight size={13} className="text-emerald-700 shrink-0" />
                          <span className="underline decoration-emerald-500 font-black">{parseFloat(expenseKm).toLocaleString("tr-TR")} KM</span>
                          <span className="bg-emerald-200 text-emerald-950 font-black px-2 py-0.5 rounded-full text-[11px] ml-1">
                            +{liveKmDiff.toLocaleString("tr-TR")} KM Yol Yapıldı
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-800 mt-0.5">
                          Araba bu yakıtla <strong>{liveKmDiff.toLocaleString("tr-TR")} KM</strong> yol yaptı.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/90 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">KM Başına Yakıt:</span>
                        <span className="text-sm font-black text-emerald-900 font-mono">
                          ₺{liveCostPerKm.toFixed(2)} <span className="text-[10px] text-emerald-700 font-normal">/ KM</span>
                        </span>
                      </div>
                      <div className="text-right border-l border-emerald-200 pl-3">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">100 KM Tüketimi:</span>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          ₺{liveCostPer100Km?.toFixed(0)}
                          {liveLitersPer100Km && (
                            <span className="text-emerald-700 font-bold ml-1 text-xs">
                              ({liveLitersPer100Km.toFixed(1)} lt)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {expenseType === "fuel" && expenseKm && latestRecordedKm !== null && parseFloat(expenseKm) <= latestRecordedKm && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center gap-2 text-xs text-amber-900">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>
                      Girilen KM ({expenseKm}), son kayıtlı kilometreden ({latestRecordedKm.toLocaleString("tr-TR")} KM) düşük veya eşit. Kilometre artışı girildiğinde aradaki fark ve tüketim otomatik hesaplanır.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Fiş Fotoğrafı Yükle */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fiş / Fatura Fotoğrafı (Opsiyonel)
                    </label>
                    <label className="w-full bg-white border border-dashed border-slate-300 hover:border-brand-gold rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 transition">
                      <Camera size={14} className="text-slate-400" />
                      <span className="truncate">
                        {expenseFile ? expenseFile.name : "Fotoğraf Seç / Çek"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setExpenseFile(e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>

                  {/* Not / Açıklama */}
                  <div className="sm:col-span-2 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Açıklama / İstasyon Adı
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: Shell Dudullu Mazot, Balata ve yağ değişimi..."
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingExpense}
                      className="bg-brand-navy hover:bg-brand-navy-2 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                    >
                      {isSavingExpense ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> Masrafı Kaydet
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* 3. AY AY MASRAF ÖZETLERİ VE LİSTESİ */}
              <div className="space-y-4">
                {/* Ay Filtre Sekmeleri ve KPI Kartları */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Dönem Seçimi:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-surface border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="all">Tüm Dönemler (Toplam)</option>
                      {availableMonths.map((ym) => {
                        const [year, month] = ym.split("-");
                        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
                        const label = dateObj.toLocaleDateString("tr-TR", {
                          month: "long",
                          year: "numeric",
                        });
                        return (
                          <option key={ym} value={ym}>
                            {label}
                          </option>
                        );
                      })}
                    </select>

                    {/* Masraf Türü Filtresi */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs ml-2">
                      <button
                        type="button"
                        onClick={() => setExpenseTab("all")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                          expenseTab === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                        }`}
                      >
                        Tümü
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseTab("fuel")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                          expenseTab === "fuel" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                        }`}
                      >
                        ⛽ Yakıt
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpenseTab("repair")}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                          expenseTab === "repair" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                        }`}
                      >
                        🔧 Tamir
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. DÖNEM YAKIT & KM TÜKETİM ANALİZ KARTLARI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* 1. Dönem Yakıt Masrafı */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Fuel size={14} className="text-blue-700" />
                      Dönem Yakıtı
                    </span>
                    <p className="text-lg font-black text-blue-950 mt-1 tabular-nums">
                      {formatCurrency(monthFuelTotal)}
                    </p>
                    <div className="text-[10px] text-blue-800 mt-1 flex items-center justify-between border-t border-blue-200/80 pt-1">
                      <span>{periodFuelStats.count} Dolum Kaydı</span>
                      {periodFuelStats.fuelLiters > 0 && (
                        <span className="font-bold">{periodFuelStats.fuelLiters.toFixed(1)} Litre</span>
                      )}
                    </div>
                  </div>

                  {/* 2. Katedilen Mesafe (KM) */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Gauge size={14} className="text-emerald-700" />
                      Katedilen Yol (KM)
                    </span>
                    <p className="text-lg font-black text-emerald-950 mt-1 tabular-nums">
                      {periodFuelStats.distanceDriven > 0
                        ? `+${periodFuelStats.distanceDriven.toLocaleString("tr-TR")} KM`
                        : (periodFuelStats.maxKm ? `${periodFuelStats.maxKm.toLocaleString("tr-TR")} KM` : "Veri Yok")}
                    </p>
                    <div className="text-[10px] text-emerald-800 mt-1 flex items-center justify-between border-t border-emerald-200/80 pt-1 truncate">
                      {periodFuelStats.minKm && periodFuelStats.maxKm && periodFuelStats.minKm !== periodFuelStats.maxKm ? (
                        <span className="truncate">{periodFuelStats.minKm.toLocaleString("tr-TR")} ➔ {periodFuelStats.maxKm.toLocaleString("tr-TR")} KM</span>
                      ) : (
                        <span>Yakıtlar arası mesafe</span>
                      )}
                    </div>
                  </div>

                  {/* 3. Ortalama KM Başına Yakıt Tüketimi */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-700" />
                      KM Başına Yakıt
                    </span>
                    <p className="text-lg font-black text-amber-950 mt-1 tabular-nums font-mono">
                      {periodFuelStats.avgCostPerKm !== null
                        ? `₺${periodFuelStats.avgCostPerKm.toFixed(2)} / km`
                        : "Hesaplama için 2 KM gerek"}
                    </p>
                    <div className="text-[10px] text-amber-900 mt-1 flex items-center justify-between border-t border-amber-200/80 pt-1">
                      {periodFuelStats.avgCostPer100Km !== null ? (
                        <span>100 km: <strong>₺{periodFuelStats.avgCostPer100Km.toFixed(0)}</strong></span>
                      ) : (
                        <span>100 km ortalaması</span>
                      )}
                      {periodFuelStats.avgLitersPer100Km !== null && (
                        <span className="font-bold">{periodFuelStats.avgLitersPer100Km.toFixed(1)} lt/100km</span>
                      )}
                    </div>
                  </div>

                  {/* 4. Dönem Toplam Masrafı (Yakıt + Bakım) */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3.5 rounded-xl border border-slate-300 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Receipt size={14} className="text-slate-700" />
                      Dönem Toplamı
                    </span>
                    <p className="text-lg font-black text-slate-900 mt-1 tabular-nums">
                      {formatCurrency(monthFuelTotal + monthRepairTotal)}
                    </p>
                    <div className="text-[10px] text-slate-600 mt-1 flex items-center justify-between border-t border-slate-200 pt-1">
                      <span>Tamir: {formatCurrency(monthRepairTotal)}</span>
                      <span className="font-semibold">{selectedMonth === "all" ? "Tüm Zamanlar" : selectedMonth}</span>
                    </div>
                  </div>
                </div>

                {/* Masraf Geçmişi Tablosu */}
                <div className="border border-border rounded-xl overflow-hidden bg-white">
                  {filteredExpenses.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Bu dönem veya kriterde henüz masraf kaydı bulunmuyor.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3">Tarih</th>
                          <th className="py-2.5 px-3">Tür</th>
                          <th className="py-2.5 px-3 text-right">Tutar</th>
                          <th className="py-2.5 px-3 text-center">Araç KM</th>
                          <th className="py-2.5 px-3 text-center">KM Farkı & Yakıt Tüketimi</th>
                          <th className="py-2.5 px-3">Fiş / Fatura Fotoğrafı</th>
                          <th className="py-2.5 px-3">Açıklama</th>
                          <th className="py-2.5 px-3 text-center">Sil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {formatDate(exp.date)}
                            </td>
                            <td className="py-2.5 px-3">
                              {exp.type === "fuel" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  ⛽ Yakıt
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  🔧 Tamir & Bakım
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              {formatCurrency(exp.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                              {exp.km ? (
                                <div>
                                  <span className="font-mono">{exp.km.toLocaleString("tr-TR")} KM</span>
                                  {exp.liters && exp.liters > 0 && (
                                    <span className="text-[10px] text-slate-500 block font-normal">{exp.liters} Lt</span>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {exp.type === "fuel" ? (
                                exp.kmDiff !== null && exp.costPerKm !== null ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                                      +{exp.kmDiff.toLocaleString("tr-TR")} KM
                                    </span>
                                    <span className="text-[11px] font-black text-slate-900 mt-0.5 font-mono">
                                      ₺{exp.costPerKm.toFixed(2)} / km
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-medium">
                                      100 km: ₺{exp.costPer100Km?.toFixed(0)}
                                      {exp.litersPer100Km ? ` • ${exp.litersPer100Km.toFixed(1)} lt` : ""}
                                    </span>
                                  </div>
                                ) : exp.isFirstFuel ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    🏁 Başlangıç Kaydı
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">-</span>
                                )
                              ) : (
                                <span className="text-slate-400 text-[10px] italic">Tamir / Bakım</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {exp.receipt_url ? (
                                <a
                                  href={exp.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-brand-navy hover:bg-brand-navy hover:text-white font-bold text-[11px] transition"
                                >
                                  <ImageIcon size={12} />
                                  <span>Fişi Gör</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Fiş Yok</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                              {exp.notes || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                title="Masrafı Sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {detailVehicle.plate} için kayıtlı {detailExpenses.length} adet masraf ve evrak kaydı.
              </span>
              <button
                type="button"
                onClick={() => setDetailVehicle(null)}
                className="bg-brand-navy hover:bg-brand-navy-2 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── YENİ ARAÇ EKLE / DÜZENLE MODALI ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-border animate-in fade-in duration-200">
            <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Truck size={16} className="text-brand-gold" />
                {editingVehicle ? "Aracı Düzenle" : "Yeni Araç Tanımla"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Plaka *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="34 ABC 123"
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold/50 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Araç Tipi
                  </label>
                  <select
                    value={form.vehicle_type}
                    onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Şoför Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ad Soyad"
                    value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Şoför Telefonu
                  </label>
                  <input
                    type="text"
                    placeholder="0532 XXX XX XX"
                    value={form.driver_phone}
                    onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Güncel Konum
                </label>
                <input
                  type="text"
                  placeholder="Örn: İstanbul, Ataşehir Depo"
                  value={form.current_location}
                  onChange={(e) => setForm({ ...form, current_location: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                />
              </div>

              {/* Hatırlatıcı Tarihleri */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Muayene Bitiş
                  </label>
                  <input
                    type="date"
                    value={form.inspection_date}
                    onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Sigorta Bitiş
                  </label>
                  <input
                    type="date"
                    value={form.insurance_date}
                    onChange={(e) => setForm({ ...form, insurance_date: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kasko Bitiş
                  </label>
                  <input
                    type="date"
                    value={form.license_date}
                    onChange={(e) => setForm({ ...form, license_date: e.target.value })}
                    className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Araç Notları
                </label>
                <textarea
                  rows={2}
                  placeholder="Araç veya ekipman hakkında özel notlar..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-navy hover:bg-brand-navy-2 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
