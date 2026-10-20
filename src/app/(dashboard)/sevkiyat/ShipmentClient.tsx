"use client";

import { useState, useTransition, useMemo } from "react";
import { uploadMultipleToStorage } from "@/lib/storage-upload";
import { Shipment } from "@/lib/data/types";
import type { Vehicle } from "../otobil-gps/types";
import {
  actionSaveShipment,
  actionUpdateShipmentStatus,
  actionDeleteShipment,
} from "@/lib/data/actions";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Navigation,
  Trash2,
  ExternalLink,
  MapPin,
  Box,
  FileText,
  User,
  Calendar,
  Filter,
  X,
  Edit3,
  Camera,
  Image as ImageIcon,
  Eye,
  CalendarDays,
  CheckCircle,
} from "lucide-react";

interface Props {
  initialShipments: Shipment[];
  initialVehicles?: Vehicle[];
  userRole: string;
  userName: string;
}

type ShipmentTab = "all" | "today" | "upcoming" | "delivered" | "otobil";

export function ShipmentClient({ initialShipments, initialVehicles = [] }: Props) {
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [vehicles] = useState<Vehicle[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [officialFilter, setOfficialFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ShipmentTab>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [viewingPhotos, setViewingPhotos] = useState<{ title: string; photos: any[] } | null>(null);
  const [modalPhotos, setModalPhotos] = useState<string[]>([]);
  const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string>("");
  const [driverNameInput, setDriverNameInput] = useState<string>("");
  const [modalDestination, setModalDestination] = useState<string>("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Otobil URL
  const [otobilUrl, setOtobilUrl] = useState("https://web.otobil.com.tr");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filter logic
  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      // Sekme Filtresi (Madde 21)
      const sDate = s.shipment_date || (s.created_at ? s.created_at.split("T")[0] : "");
      if (activeTab === "today") {
        if (sDate !== todayStr && s.status === "Teslim Edildi") return false;
        if (sDate !== todayStr && sDate) return false;
      } else if (activeTab === "upcoming") {
        if (!sDate || sDate <= todayStr || s.status === "Teslim Edildi") return false;
      } else if (activeTab === "delivered") {
        if (s.status !== "Teslim Edildi") return false;
      }

      // Metin Arama
      const q = search.toLowerCase();
      const matchQ =
        !q ||
        s.customer_name.toLowerCase().includes(q) ||
        s.seller.toLowerCase().includes(q) ||
        s.receipt_no.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q) ||
        (s.vehicle_plate && s.vehicle_plate.toLowerCase().includes(q)) ||
        (s.driver_name && s.driver_name.toLowerCase().includes(q));

      // Statü & Tip Filtresi (Madde 16)
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      const matchOfficial = officialFilter === "all" || s.is_official === officialFilter;
      const matchVehicle = vehicleFilter === "all" || s.vehicle_plate === vehicleFilter;

      // Tarih Aralığı Filtresi
      let matchDate = true;
      if (startDateFilter && sDate && sDate < startDateFilter) matchDate = false;
      if (endDateFilter && sDate && sDate > endDateFilter) matchDate = false;

      return matchQ && matchStatus && matchOfficial && matchVehicle && matchDate;
    });
  }, [
    shipments,
    activeTab,
    todayStr,
    search,
    statusFilter,
    officialFilter,
    vehicleFilter,
    startDateFilter,
    endDateFilter,
  ]);

  // Tab sayıları
  const countToday = useMemo(() => {
    return shipments.filter((s) => {
      const sDate = s.shipment_date || (s.created_at ? s.created_at.split("T")[0] : "");
      return sDate === todayStr || (s.status !== "Teslim Edildi" && !s.shipment_date);
    }).length;
  }, [shipments, todayStr]);

  const countUpcoming = useMemo(() => {
    return shipments.filter((s) => {
      const sDate = s.shipment_date || (s.created_at ? s.created_at.split("T")[0] : "");
      return sDate > todayStr && s.status !== "Teslim Edildi";
    }).length;
  }, [shipments, todayStr]);

  const countDelivered = useMemo(() => {
    return shipments.filter((s) => s.status === "Teslim Edildi").length;
  }, [shipments]);

  const countDepoyaGitti = shipments.filter((s) => s.status === "Depoya Gitti").length;
  const countSevkiyatta = shipments.filter((s) => s.status === "Sevkiyata Çıktı").length;
  const countTeslim = shipments.filter((s) => s.status === "Teslim Edildi").length;

  function handleOpenNew() {
    setEditingShipment(null);
    setModalPhotos([]);
    setSelectedVehiclePlate("");
    setDriverNameInput("");
    setModalDestination("");
    setIsModalOpen(true);
  }

  function handleOpenEdit(item: Shipment) {
    setEditingShipment(item);
    setModalPhotos(Array.isArray(item.photos) ? item.photos : []);
    setSelectedVehiclePlate(item.vehicle_plate || "");
    setDriverNameInput(item.driver_name || "");
    setModalDestination(item.destination || "");
    setIsModalOpen(true);
  }

  function handleVehicleChange(plate: string) {
    setSelectedVehiclePlate(plate);
    const found = vehicles.find((v) => v.plate === plate);
    if (found && found.driver_name) {
      setDriverNameInput(found.driver_name);
    }
  }

  async function handleAddPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} bir fotoğraf dosyası değil.`);
        return false;
      }
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name} dosyası 20MB sınırını aşıyor.`);
        return false;
      }
      return true;
    });

    if (imageFiles.length === 0) return;

    setPhotoUploading(true);
    const month = new Date().toISOString().slice(0, 7);
    const { urls, errors } = await uploadMultipleToStorage("shipment-photos", imageFiles, month, 20);

    if (errors.length > 0) {
      toast.error(`${errors.length} dosya yüklenemedi: ${errors[0]}`);
    }
    if (urls.length > 0) {
      setModalPhotos((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} fotoğraf başarıyla yüklendi!`);
    }
    setPhotoUploading(false);
    // input'u sıfırla
    e.target.value = "";
  }

  function handleRemovePhoto(index: number) {
    setModalPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleStatusChange(id: string, newStatus: Shipment["status"]) {
    setShipments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    startTransition(async () => {
      try {
        const res = await actionUpdateShipmentStatus(id, newStatus);
        if (res.success && res.shipment) {
          setShipments((prev) =>
            prev.map((item) => (item.id === id ? res.shipment! : item))
          );
          toast.success(`Sevkiyat durumu "${newStatus}" olarak güncellendi!`);
        } else {
          toast.error(res.error || "Sevkiyat durumu güncellenemedi.");
        }
      } catch (err: any) {
        toast.error("İşlem sırasında bağlantı hatası oluştu.");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu sevkiyat kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      try {
        const res = await actionDeleteShipment(id);
        if (res.success) {
          setShipments((prev) => prev.filter((item) => item.id !== id));
          toast.success("Sevkiyat kaydı silindi.");
        } else {
          toast.error(res.error || "Sevkiyat silinemedi.");
        }
      } catch {
        toast.error("Sevkiyat silinirken hata oluştu.");
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("photos", JSON.stringify(modalPhotos));
    if (selectedVehiclePlate) formData.set("vehicle_plate", selectedVehiclePlate);
    if (driverNameInput) formData.set("driver_name", driverNameInput);

    startTransition(async () => {
      try {
        const res = await actionSaveShipment(formData);
        if (res.success && res.shipment) {
          setShipments((prev) => {
            const idx = prev.findIndex((s) => s.id === res.shipment!.id);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = res.shipment!;
              return updated;
            }
            return [res.shipment!, ...prev];
          });
          toast.success(editingShipment ? "Sevkiyat bilgileri güncellendi!" : "Yeni sevkiyat başarıyla oluşturuldu!");
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Sevkiyat kaydedilemedi.");
        }
      } catch {
        toast.error("Sevkiyat kaydedilirken hata oluştu.");
      }
    });
  }

  const hasActiveFilters =
    statusFilter !== "all" ||
    officialFilter !== "all" ||
    vehicleFilter !== "all" ||
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
            Sevkiyat ve Teslimat Yönetimi
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Günlük sevkiyat planı, araç atama, teslimat fotoğrafları ve canlı rota takibi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={16} /> + Yeni Sevk Kaydı Gir
          </button>
        </div>
      </div>

      {/* SEKME GEZİNTİSİ (Madde 21) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "all"
              ? "bg-brand-navy text-white shadow-xs"
              : "bg-surface hover:bg-surface/80 text-text border border-border"
          }`}
        >
          Tüm Sevkiyatlar ({shipments.length})
        </button>

        <button
          onClick={() => setActiveTab("today")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "today"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
          }`}
        >
          <CalendarDays size={14} />
          Bugün Gidecekler ({countToday})
        </button>

        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "upcoming"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200"
          }`}
        >
          <Clock size={14} />
          İleri Tarihli Planlar ({countUpcoming})
        </button>

        <button
          onClick={() => setActiveTab("delivered")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "delivered"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200"
          }`}
        >
          <CheckCircle size={14} />
          Teslim Edilenler ({countDelivered})
        </button>

        <button
          onClick={() => setActiveTab("otobil")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ml-auto ${
            activeTab === "otobil"
              ? "bg-brand-navy text-white shadow-xs"
              : "bg-surface hover:bg-surface/80 text-text border border-border"
          }`}
        >
          <Navigation size={14} />
          Otobil GPS Filo Takip
        </button>
      </div>

      {activeTab === "otobil" ? (
        /* OTOBİL GPS TAKİP BÖLÜMÜ */
        <div className="bg-white rounded-2xl border border-border p-6 space-y-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Navigation size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">Otobil Araç GPS Filo Takibi</h3>
                <p className="text-xs text-text-muted">
                  Sevkiyata çıkan araçların anlık GPS konumlarını ve rota geçmişini görüntüleyin
                </p>
              </div>
            </div>

            <a
              href={otobilUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ExternalLink size={14} /> Otobil Portalı'nı Yeni Sekmede Aç
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface p-4 rounded-xl border border-border">
              <p className="text-xs font-semibold text-text-muted">Sevkiyattaki Aktif Araçlar</p>
              <p className="text-2xl font-black text-brand-navy mt-1">{countSevkiyatta} Araç</p>
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> GPS sinyali aktif
              </p>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border">
              <p className="text-xs font-semibold text-text-muted">Depoda Yüklenenler</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{countDepoyaGitti} Sevkiyat</p>
              <p className="text-[11px] text-text-muted mt-1">Yükleme ve kontrol aşamasında</p>
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border">
              <p className="text-xs font-semibold text-text-muted">Bugün Tamamlanan Teslimatlar</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{countTeslim} Sevkiyat</p>
              <p className="text-[11px] text-text-muted mt-1">İmza ve fiş ile kapatıldı</p>
            </div>
          </div>

          <div className="border border-border rounded-xl p-6 bg-slate-50 text-center space-y-3">
            <MapPin size={40} className="mx-auto text-brand-navy/60" />
            <h4 className="text-sm font-bold text-text">Otobil Canlı Harita ve Telemetri Girişi</h4>
            <p className="text-xs text-text-muted max-w-lg mx-auto">
              Petrol Ofisi Otobil sistemine tek tıkla bağlanın veya URL adresini özelleştirin.
            </p>
            <div className="max-w-md mx-auto flex gap-2">
              <input
                type="url"
                value={otobilUrl}
                onChange={(e) => setOtobilUrl(e.target.value)}
                placeholder="https://web.otobil.com.tr"
                className="flex-1 border border-border rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:border-brand-navy"
              />
              <button
                onClick={() => toast.success("Otobil bağlantı adresi güncellendi.")}
                className="bg-brand-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* SEVKİYAT LİSTESİ */
        <>
          {/* KPI Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setStatusFilter(statusFilter === "Depoya Gitti" ? "all" : "Depoya Gitti")}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                statusFilter === "Depoya Gitti"
                  ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400"
                  : "bg-white border-border hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">📦 Depoya Gitti</span>
                <Clock size={16} className="text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-950 mt-2">{countDepoyaGitti}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Depoda hazırlık aşamasında</p>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === "Sevkiyata Çıktı" ? "all" : "Sevkiyata Çıktı")}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                statusFilter === "Sevkiyata Çıktı"
                  ? "bg-blue-50 border-blue-300 ring-2 ring-blue-400"
                  : "bg-white border-border hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800">🚚 Sevkiyata Çıktı</span>
                <Truck size={16} className="text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-950 mt-2">{countSevkiyatta}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">Araç yolda, sevk ediliyor</p>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === "Teslim Edildi" ? "all" : "Teslim Edildi")}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                statusFilter === "Teslim Edildi"
                  ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400"
                  : "bg-white border-border hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">✓ Teslim Edildi</span>
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-950 mt-2">{countTeslim}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Müşteriye sağlam teslim edildi</p>
            </div>
          </div>

          {/* ZENGİN FİLTRE VE ARAMA PANELİ (Madde 16) */}
          <div className="bg-white p-4 rounded-2xl border border-border shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Müşteri adı, satıcı, fiş no, sevk yeri, plaka veya şoför ara..."
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs outline-none focus:border-brand-navy"
                />
              </div>

              {/* Durum Filtresi */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 text-xs bg-white font-medium outline-none"
              >
                <option value="all">Tüm Statüler</option>
                <option value="Depoya Gitti">Depoya Gitti</option>
                <option value="Sevkiyata Çıktı">Sevkiyata Çıktı</option>
                <option value="Teslim Edildi">Teslim Edildi</option>
              </select>

              {/* Resmi / Gayriresmi Filtresi */}
              <select
                value={officialFilter}
                onChange={(e) => setOfficialFilter(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 text-xs bg-white font-medium outline-none"
              >
                <option value="all">Resmi / Gayriresmi</option>
                <option value="Resmi">Resmi Fiş</option>
                <option value="Gayriresmi">Gayriresmi</option>
              </select>

              {/* Araç Filtresi */}
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 text-xs bg-white font-medium outline-none"
              >
                <option value="all">Tüm Araçlar</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.plate}>
                    {v.plate} ({v.driver_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Tarih Aralığı Filtresi */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
              <div className="flex items-center gap-2 text-text-muted">
                <Calendar size={14} className="text-brand-navy" />
                <span className="font-semibold text-text">Sevk Tarihi Aralığı:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="border border-border rounded-lg px-2.5 py-1 text-xs bg-surface outline-none focus:bg-white"
                />
                <span>-</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="border border-border rounded-lg px-2.5 py-1 text-xs bg-surface outline-none focus:bg-white"
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setOfficialFilter("all");
                    setVehicleFilter("all");
                    setStartDateFilter("");
                    setEndDateFilter("");
                    setSearch("");
                  }}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                >
                  <X size={13} /> Filtreleri Temizle
                </button>
              )}
            </div>
          </div>

          {/* Tablo */}
          <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
            {/* MASAÜSTÜ TABLO */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Tarih</th>
                    <th className="py-3 px-4">Fiş No</th>
                    <th className="py-3 px-4">Müşteri Adı</th>
                    <th className="py-3 px-4">Satıcı</th>
                    <th className="py-3 px-4">Sevk Yeri</th>
                    <th className="py-3 px-4">Araç & Şoför</th>
                    <th className="py-3 px-4 text-center">Tip</th>
                    <th className="py-3 px-4 text-center">m² / Palet</th>
                    <th className="py-3 px-4 text-center">Fotoğraf</th>
                    <th className="py-3 px-4 text-right">Statü</th>
                    <th className="py-3 px-4 text-center w-16">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-text-muted">
                        Kayıtlı sevkiyat bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const photoCount = Array.isArray(item.photos) ? item.photos.length : 0;

                      return (
                        <tr key={item.id} className="hover:bg-surface/50 transition">
                          <td className="py-3 px-4 font-semibold text-text whitespace-nowrap">
                            <div>{item.shipment_date || (item.created_at ? item.created_at.split("T")[0] : "-")}</div>
                            {item.shipment_time && (
                              <div className="text-[10px] text-text-muted">{item.shipment_time}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-brand-navy">
                            {item.receipt_no || "-"}
                          </td>
                          <td className="py-3 px-4 font-bold text-text">
                            {item.customer_name}
                          </td>
                          <td className="py-3 px-4 text-text-muted">
                            {item.seller || "-"}
                          </td>
                          <td className="py-3 px-4 max-w-[200px]">
                            {item.destination ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.destination)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-1.5 text-text-muted hover:text-brand-navy hover:underline transition truncate"
                                title={`${item.destination} (Google Haritalar'da Aç)`}
                              >
                                <MapPin size={13} className="text-brand-navy shrink-0 group-hover:scale-125 transition-transform" />
                                <span className="truncate group-hover:text-brand-navy font-medium">{item.destination}</span>
                                <ExternalLink size={10} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-brand-navy" />
                              </a>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {item.vehicle_plate ? (
                              <div>
                                <span className="font-mono font-bold text-brand-navy bg-brand-navy/5 px-1.5 py-0.5 rounded text-[11px] border border-brand-navy/15">
                                  {item.vehicle_plate}
                                </span>
                                {item.driver_name && (
                                  <div className="text-[10px] text-text-muted mt-0.5">{item.driver_name}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-text-muted text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                                item.is_official === "Resmi"
                                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                                    : "bg-purple-100 text-purple-800 border border-purple-200"
                              }`}
                            >
                              {item.is_official}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="font-bold text-text">{item.m2} m²</span>
                            <span className="text-text-muted ml-1 font-medium">({item.pallet_count} Palet)</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {photoCount > 0 ? (
                              <button
                                onClick={() =>
                                  setViewingPhotos({
                                    title: `${item.customer_name} - ${item.receipt_no || "Sevkiyat"} Fotoğrafları`,
                                    photos: item.photos || [],
                                  })
                                }
                                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded text-[11px] font-bold transition border border-blue-200"
                                title="Fotoğrafları Görüntüle"
                              >
                                <Camera size={12} /> {photoCount} Foto
                              </button>
                            ) : (
                              <span className="text-text-muted/60 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <select
                              value={item.status}
                              disabled={isPending}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value as Shipment["status"])
                              }
                              className={`px-2.5 py-1 rounded-lg font-bold text-xs border outline-none cursor-pointer transition ${
                                item.status === "Depoya Gitti"
                                  ? "bg-amber-100 text-amber-900 border-amber-300"
                                  : item.status === "Sevkiyata Çıktı"
                                  ? "bg-blue-100 text-blue-900 border-blue-300"
                                  : "bg-emerald-100 text-emerald-900 border-emerald-300"
                              }`}
                            >
                              <option value="Depoya Gitti">Depoya Gitti</option>
                              <option value="Sevkiyata Çıktı">Sevkiyata Çıktı</option>
                              <option value="Teslim Edildi">Teslim Edildi</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1 rounded text-brand-navy hover:bg-surface transition"
                                title="Sevkiyatı Düzenle / Fotoğraf Ekle"
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

            {/* MOBİL GÖRÜNÜM (Kartlar) */}
            <div className="block md:hidden divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-text-muted text-xs">
                  Kayıtlı sevkiyat bulunamadı.
                </div>
              ) : (
                filtered.map((item) => {
                  const photoCount = Array.isArray(item.photos) ? item.photos.length : 0;
                  return (
                    <div key={item.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-brand-navy">
                          #{item.receipt_no || "Fişsiz"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            item.is_official === "Resmi"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}>
                            {item.is_official}
                          </span>
                          <span className="text-[11px] text-text-muted font-medium">
                            {item.shipment_date || (item.created_at ? item.created_at.split("T")[0] : "-")}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-text">{item.customer_name}</h4>
                        {item.destination ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.destination)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-text-muted hover:text-brand-navy hover:underline flex items-center gap-1 mt-0.5 group"
                            title={`${item.destination} (Google Haritalar'da Aç)`}
                          >
                            <MapPin size={12} className="text-brand-navy shrink-0 group-hover:scale-125 transition-transform" />
                            <span className="truncate group-hover:text-brand-navy font-medium">{item.destination}</span>
                            <ExternalLink size={10} className="shrink-0 opacity-60 group-hover:opacity-100 text-brand-navy" />
                          </a>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          {item.vehicle_plate && (
                            <span className="font-mono font-bold text-[10px] bg-brand-navy/10 text-brand-navy px-1.5 py-0.5 rounded">
                              {item.vehicle_plate}
                            </span>
                          )}
                          <span className="font-bold text-text">{item.m2} m²</span>
                          <span className="text-text-muted">({item.pallet_count} Palet)</span>
                        </div>

                        {photoCount > 0 && (
                          <button
                            onClick={() =>
                              setViewingPhotos({
                                title: `${item.customer_name} - ${item.receipt_no || "Sevkiyat"} Fotoğrafları`,
                                photos: item.photos || [],
                              })
                            }
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-[11px] font-bold border border-blue-200"
                          >
                            <Camera size={12} /> {photoCount} Foto
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <select
                          value={item.status}
                          disabled={isPending}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value as Shipment["status"])
                          }
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs border outline-none ${
                            item.status === "Depoya Gitti"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : item.status === "Sevkiyata Çıktı"
                              ? "bg-blue-100 text-blue-900 border-blue-300"
                              : "bg-emerald-100 text-emerald-900 border-emerald-300"
                          }`}
                        >
                          <option value="Depoya Gitti">Depoya Gitti</option>
                          <option value="Sevkiyata Çıktı">Sevkiyata Çıktı</option>
                          <option value="Teslim Edildi">Teslim Edildi</option>
                        </select>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-surface hover:bg-neutral-200 text-brand-navy transition"
                            title="Düzenle"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg bg-surface hover:bg-rose-100 text-rose-600 transition"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* YENİ / DÜZENLEME SEVKİYAT MODALI (Madde 14) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <Truck className="text-brand-navy" size={20} />
                {editingShipment ? "Sevkiyat Kaydını Düzenle" : "Yeni Sevkiyat Kaydı Gir"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {editingShipment && <input type="hidden" name="id" value={editingShipment.id} />}

              {/* Tarih ve Saat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Sevk Tarihi *</label>
                  <input
                    type="date"
                    required
                    name="shipment_date"
                    defaultValue={editingShipment?.shipment_date || todayStr}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Sevk Saati</label>
                  <input
                    type="time"
                    name="shipment_time"
                    defaultValue={editingShipment?.shipment_time || ""}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                  />
                </div>
              </div>

              {/* Müşteri ve Satıcı */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Müşteri Adı *</label>
                  <input
                    type="text"
                    required
                    name="customer_name"
                    defaultValue={editingShipment?.customer_name || ""}
                    placeholder="Örn: Yılmaz İnşaat Ltd."
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Satıcı / Temsilci</label>
                  <input
                    type="text"
                    name="seller"
                    defaultValue={editingShipment?.seller || ""}
                    placeholder="Örn: Ahmet Duvarbaşı"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                  />
                </div>
              </div>

              {/* Fiş No ve Tip */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Fiş No</label>
                  <input
                    type="text"
                    name="receipt_no"
                    defaultValue={editingShipment?.receipt_no || ""}
                    placeholder="SEV-2026-003"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Resmi / Gayri Resmi *</label>
                  <select
                    name="is_official"
                    defaultValue={editingShipment?.is_official || "Resmi"}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                  >
                    <option value="Resmi">Resmi Fiş / Fatura</option>
                    <option value="Gayriresmi">Gayriresmi / Sevk</option>
                  </select>
                </div>
              </div>

              {/* Araç ve Şoför Seçimi (Madde 14) */}
              <div className="bg-surface/70 p-3 rounded-xl border border-border space-y-2">
                <div className="text-[11px] font-bold text-text-muted uppercase">Araç & Şoför Atama</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text mb-1">Araç Seçimi</label>
                    <select
                      value={selectedVehiclePlate}
                      onChange={(e) => handleVehicleChange(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 bg-white outline-none focus:border-brand-navy font-semibold text-xs"
                    >
                      <option value="">-- Araç Seçin veya Boş Bırakın --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.plate}>
                          {v.plate} - {v.vehicle_type} ({v.driver_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-text mb-1">Plaka (Manuel / Düzenle)</label>
                    <input
                      type="text"
                      name="vehicle_plate"
                      value={selectedVehiclePlate}
                      onChange={(e) => setSelectedVehiclePlate(e.target.value.toUpperCase())}
                      placeholder="34 CLK 28"
                      className="w-full border border-border rounded-lg px-3 py-2 bg-white outline-none focus:border-brand-navy font-mono uppercase text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Şoför Adı</label>
                  <input
                    type="text"
                    name="driver_name"
                    value={driverNameInput}
                    onChange={(e) => setDriverNameInput(e.target.value)}
                    placeholder="Mehmet Kaya"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-white outline-none focus:border-brand-navy text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-text">Sevk Yeri / Adres *</label>
                  {modalDestination.trim() && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(modalDestination.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-brand-navy hover:underline inline-flex items-center gap-1 bg-brand-navy/5 px-2 py-0.5 rounded border border-brand-navy/15 transition hover:bg-brand-navy/10"
                      title="Google Haritalar'da Konumu Gör"
                    >
                      <MapPin size={11} className="text-brand-navy" />
                      <span>Haritada Gör</span>
                      <ExternalLink size={9} />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  required
                  name="destination"
                  value={modalDestination}
                  onChange={(e) => setModalDestination(e.target.value)}
                  placeholder="Şantiye adresi, ilçe veya depo (örn: Çekmeköy Alibey Mahallesi)..."
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Metrekare (m²)</label>
                  <input
                    type="number"
                    step="any"
                    name="m2"
                    defaultValue={editingShipment?.m2 || ""}
                    placeholder="0.00"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Palet Sayısı</label>
                  <input
                    type="number"
                    step="any"
                    name="pallet_count"
                    defaultValue={editingShipment?.pallet_count || ""}
                    placeholder="0"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Hazırlık Durumu / Not</label>
                <textarea
                  name="preparation_notes"
                  rows={2}
                  defaultValue={editingShipment?.preparation_notes || ""}
                  placeholder="Palet hazırlandı, yapıştırıcılar ayrıldı, şoför arandı..."
                  className="w-full border border-border rounded-lg p-2.5 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                />
              </div>

              {/* FOTOĞRAFLAR (Madde 14) */}
              <div className="space-y-2 bg-surface/70 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="font-bold text-text flex items-center gap-1.5">
                    <Camera size={14} className="text-brand-navy" />
                    Sevkiyat / İrsaliye Fotoğrafları ({modalPhotos.length})
                    {photoUploading && (
                      <span className="text-xs text-brand-navy font-normal flex items-center gap-1">
                        <Eye size={12} className="animate-pulse" /> Yükleniyor...
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <label className="bg-brand-navy text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-brand-navy/90 transition flex items-center gap-1">
                      <ImageIcon size={12} /> Galeriden
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAddPhotoFile}
                        className="hidden"
                        disabled={photoUploading}
                      />
                    </label>
                    <label className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-emerald-700 transition flex items-center gap-1">
                      <Camera size={12} /> Kamera
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleAddPhotoFile}
                        className="hidden"
                        disabled={photoUploading}
                      />
                    </label>
                  </div>
                </div>
                {modalPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {modalPhotos.map((photo, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-black/5">
                        <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-xs"
                          title="Fotoğrafı Kaldır"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {modalPhotos.length === 0 && !photoUploading && (
                  <p className="text-xs text-text-muted text-center py-3">Teslimat kanıtı veya irsaliye fotoğrafı ekleyin.</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Statü</label>
                <select
                  name="status"
                  defaultValue={editingShipment?.status || "Depoya Gitti"}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-bold text-amber-900"
                >
                  <option value="Depoya Gitti">Depoya Gitti</option>
                  <option value="Sevkiyata Çıktı">Sevkiyata Çıktı</option>
                  <option value="Teslim Edildi">Teslim Edildi</option>
                </select>
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
                  {isPending ? "Kaydediliyor..." : editingShipment ? "Güncellemeleri Kaydet" : "Sevkiyatı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOTOĞRAF GALERİSİ MODALI */}
      {viewingPhotos && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <ImageIcon className="text-brand-navy" size={20} />
                {viewingPhotos.title}
              </h3>
              <button
                onClick={() => setViewingPhotos(null)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {viewingPhotos.photos.map((url, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-border bg-slate-100 flex flex-col">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group aspect-video">
                    <img src={url} alt={`Fotoğraf ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                      <ExternalLink size={14} /> Tam Boyut Gör
                    </div>
                  </a>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setViewingPhotos(null)}
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
