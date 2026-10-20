"use client";

import { useState, useTransition, useMemo } from "react";
import type { Vehicle, ExpiryAlertInfo } from "./types";
import { getExpiryAlert } from "./types";
import { saveVehicle, updateVehicleStatus, deleteVehicle, getVehicles } from "./actions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Truck, Plus, MapPin, Phone, User, Edit3, Trash2,
  CheckCircle2, Clock, Warehouse, Loader2,
  Navigation, X, Package, AlertCircle, Fuel,
  Calendar, ShieldCheck, Wrench, Download, AlertTriangle,
  Bell, FileText, Search,
} from "lucide-react";

interface Props {
  initialVehicles: Vehicle[];
  userName: string;
  userRole: string;
}

const STATUS_CONFIG: Record<Vehicle["status"], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  "Depoda":      { label: "Depoda",      color: "text-blue-700",   bg: "bg-blue-100",   icon: Warehouse },
  "Yolda":       { label: "Yolda",       color: "text-amber-700",  bg: "bg-amber-100",  icon: Navigation },
  "Teslim Etti": { label: "Teslim Etti", color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  "Bakımda":     { label: "Bakımda",     color: "text-red-700",    bg: "bg-red-100",    icon: AlertCircle },
};

const VEHICLE_TYPES = ["Kamyon", "TIR", "Kamyonet", "Pickup", "Hafif Ticari", "Binek", "Diğer"];
const STATUSES: Vehicle["status"][] = ["Depoda", "Yolda", "Teslim Etti", "Bakımda"];

const EMPTY_FORM = {
  plate: "",
  driver_name: "",
  driver_phone: "",
  vehicle_type: "Kamyon",
  status: "Depoda" as Vehicle["status"],
  current_location: "",
  destination: "",
  cargo_notes: "",
  inspection_date: "",
  insurance_date: "",
  license_date: "",
  maintenance_date: "",
  maintenance_cost: 0,
  fuel_cost: 0,
  notes: "",
};

export function VehicleClient({ initialVehicles, userRole }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [statusModal, setStatusModal] = useState<{ vehicle: Vehicle } | null>(null);
  const [newStatus, setNewStatus] = useState<Vehicle["status"]>("Yolda");
  const [newLocation, setNewLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAdmin = userRole === "admin" || userRole === "muhasebe1";

  // ── 1 AY KALA VE 1 HAFTA KALA HATIRLATICI HESABI ──
  const allAlerts = useMemo(() => {
    const list: {
      vehicle: Vehicle;
      itemType: "Muayene" | "Sigorta" | "Ruhsat / Kasko";
      alert: ExpiryAlertInfo;
      date: string;
    }[] = [];

    for (const v of vehicles) {
      if (v.inspection_date) {
        const alert = getExpiryAlert(v.inspection_date);
        if (alert.status === "expired" || alert.status === "critical" || alert.status === "warning") {
          list.push({ vehicle: v, itemType: "Muayene", alert, date: v.inspection_date });
        }
      }
      if (v.insurance_date) {
        const alert = getExpiryAlert(v.insurance_date);
        if (alert.status === "expired" || alert.status === "critical" || alert.status === "warning") {
          list.push({ vehicle: v, itemType: "Sigorta", alert, date: v.insurance_date });
        }
      }
      if (v.license_date) {
        const alert = getExpiryAlert(v.license_date);
        if (alert.status === "expired" || alert.status === "critical" || alert.status === "warning") {
          list.push({ vehicle: v, itemType: "Ruhsat / Kasko", alert, date: v.license_date });
        }
      }
    }

    return list.sort((a, b) => a.alert.daysLeft - b.alert.daysLeft);
  }, [vehicles]);

  const urgentAlerts = allAlerts.filter(a => a.alert.status === "expired" || a.alert.status === "critical");
  const warningAlerts = allAlerts.filter(a => a.alert.status === "warning");

  // Filtrelenmiş araçlar
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (filterAlertOnly) {
        const hasAlert = allAlerts.some(a => a.vehicle.id === v.id);
        if (!hasAlert) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.plate.toLowerCase().includes(q) ||
        v.driver_name.toLowerCase().includes(q) ||
        (v.driver_phone && v.driver_phone.includes(q)) ||
        (v.current_location && v.current_location.toLowerCase().includes(q)) ||
        (v.destination && v.destination.toLowerCase().includes(q)) ||
        (v.cargo_notes && v.cargo_notes.toLowerCase().includes(q))
      );
    });
  }, [vehicles, searchQuery, filterAlertOnly, allAlerts]);

  function openNew() {
    setEditingVehicle(null);
    setForm({ ...EMPTY_FORM });
    setIsModalOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditingVehicle(v);
    setForm({
      plate: v.plate,
      driver_name: v.driver_name,
      driver_phone: v.driver_phone || "",
      vehicle_type: v.vehicle_type,
      status: v.status,
      current_location: v.current_location || "",
      destination: v.destination || "",
      cargo_notes: v.cargo_notes || "",
      inspection_date: v.inspection_date || "",
      insurance_date: v.insurance_date || "",
      license_date: v.license_date || "",
      maintenance_date: v.maintenance_date || "",
      maintenance_cost: v.maintenance_cost || 0,
      fuel_cost: v.fuel_cost || 0,
      notes: v.notes || "",
    });
    setIsModalOpen(true);
  }

  function openStatusModal(v: Vehicle) {
    setStatusModal({ vehicle: v });
    setNewStatus(v.status);
    setNewLocation(v.current_location || "");
  }

  function handleSave() {
    if (!form.plate.trim() || !form.driver_name.trim()) {
      toast.error("Plaka ve Şoför Adı zorunludur.");
      return;
    }
    startTransition(async () => {
      try {
        await saveVehicle({
          id: editingVehicle?.id,
          ...form,
          maintenance_cost: Number(form.maintenance_cost) || 0,
          fuel_cost: Number(form.fuel_cost) || 0,
        });
        toast.success(editingVehicle ? "Araç bilgileri güncellendi." : "Yeni araç eklendi.");
        const updated = await getVehicles();
        setVehicles(updated);
        setIsModalOpen(false);
      } catch (err) {
        toast.error("Hata: " + String(err));
      }
    });
  }

  function handleStatusUpdate() {
    if (!statusModal) return;
    startTransition(async () => {
      try {
        await updateVehicleStatus(statusModal.vehicle.id, newStatus, newLocation);
        toast.success("Araç durumu güncellendi.");
        const updated = await getVehicles();
        setVehicles(updated);
        setStatusModal(null);
      } catch (err) {
        toast.error("Hata: " + String(err));
      }
    });
  }

  function handleDelete(id: string, plate: string) {
    if (!confirm(`"${plate}" plakalı aracı silmek istediğinizden emin misiniz?`)) return;
    startTransition(async () => {
      try {
        await deleteVehicle(id);
        toast.success("Araç silindi.");
        setVehicles(prev => prev.filter(v => v.id !== id));
      } catch (err) {
        toast.error("Hata: " + String(err));
      }
    });
  }

  function exportVehiclesToExcel() {
    if (vehicles.length === 0) {
      toast.error("İndirilecek araç bulunamadı.");
      return;
    }
    const rows = vehicles.map((v, idx) => {
      const muayene = getExpiryAlert(v.inspection_date);
      const sigorta = getExpiryAlert(v.insurance_date);
      const ruhsat = getExpiryAlert(v.license_date);
      const totalCost = (Number(v.maintenance_cost) || 0) + (Number(v.fuel_cost) || 0);

      return {
        "Sıra": idx + 1,
        "Plaka": v.plate,
        "Araç Tipi": v.vehicle_type,
        "Şoför Adı": v.driver_name,
        "Şoför Telefon": v.driver_phone || "-",
        "Durum": v.status,
        "Şu Anki Konum": v.current_location || "-",
        "Gidilen Yer": v.destination || "-",
        "TÜVTÜRK Muayene Tarihi": v.inspection_date ? formatDate(v.inspection_date) : "-",
        "Muayene Hatırlatma Durumu": muayene.status !== "none" ? muayene.label : "-",
        "Trafik Sigortası Bitiş Tarihi": v.insurance_date ? formatDate(v.insurance_date) : "-",
        "Sigorta Hatırlatma Durumu": sigorta.status !== "none" ? sigorta.label : "-",
        "Ruhsat / Kasko Tarihi": v.license_date ? formatDate(v.license_date) : "-",
        "Ruhsat Hatırlatma Durumu": ruhsat.status !== "none" ? ruhsat.label : "-",
        "Son Bakım Tarihi": v.maintenance_date ? formatDate(v.maintenance_date) : "-",
        "Bakım Masrafı (₺)": v.maintenance_cost || 0,
        "Yakıt Masrafı (₺)": v.fuel_cost || 0,
        "Toplam Araç Masrafı (₺)": totalCost,
        "Yük / Sevkiyat Notu": v.cargo_notes || "-",
        "Araç / Bakım Ek Notları": v.notes || "-",
        "Son Güncelleyen": v.last_updated_by || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arac_Filosu");
    const todayStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Camoluk_Arac_Filosu_${todayStr}.xlsx`);
    toast.success("Araç filosu Excel dosyası başarıyla indirildi.");
  }

  function getMapsUrl(location: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }

  const yoldaCount = vehicles.filter(v => v.status === "Yolda").length;
  const depodaCount = vehicles.filter(v => v.status === "Depoda").length;
  const teslimCount = vehicles.filter(v => v.status === "Teslim Etti").length;
  const bakimCount = vehicles.filter(v => v.status === "Bakımda").length;

  const totalMaintenanceCost = vehicles.reduce((sum, v) => sum + (Number(v.maintenance_cost) || 0), 0);
  const totalFuelCost = vehicles.reduce((sum, v) => sum + (Number(v.fuel_cost) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Butonlar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Araç Takip & Filo Yönetimi</h1>
          <p className="text-sm text-text-muted">
            Muayene, sigorta ve ruhsat hatırlatıcıları (1 ay / 1 hafta kala), periyodik bakım ve yakıt masrafları
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportVehiclesToExcel}
            className="flex items-center gap-2 bg-white border border-border text-text px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-surface transition shadow-xs cursor-pointer"
            title="Araç filosu ve muayene/sigorta/masraf dökümünü Excel olarak indir"
          >
            <Download size={15} className="text-emerald-600" />
            <span>Excel İndir</span>
          </button>
          {isAdmin && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-brand-gold text-brand-navy px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-gold-light transition shadow-xs cursor-pointer"
            >
              <Plus size={16} /> Araç Ekle
            </button>
          )}
        </div>
      </div>

      {/* ── 1 AY KALA VE 1 HAFTA KALA OTOMATİK HATIRLATICI BİLDİRİM PANELİ ── */}
      {allAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-linear-to-r from-red-50/90 via-amber-50/70 to-orange-50/80 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-600 text-white animate-pulse">
                <Bell size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-950 flex items-center gap-2">
                  <span>🚨 Yaklaşan Muayene & Sigorta Hatırlatmaları</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
                    {allAlerts.length} İşlem
                  </span>
                </h3>
                <p className="text-xs text-red-800/80 mt-0.5">
                  Süre bitimine 1 ay (30 gün) ve 1 hafta (7 gün) kala otomatik alarm sistemi devrededir.
                </p>
              </div>
            </div>

            <button
              onClick={() => setFilterAlertOnly(prev => !prev)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                filterAlertOnly
                  ? "bg-red-700 text-white border-red-700 shadow-xs"
                  : "bg-white/80 text-red-900 border-red-300 hover:bg-white"
              }`}
            >
              {filterAlertOnly ? "✓ Sadece Uyarılı Araçlar Gösteriliyor" : "Sadece Uyarılı Araçları Filtrele"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {allAlerts.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-xl border bg-white shadow-xs ${
                  item.alert.status === "expired" || item.alert.status === "critical"
                    ? "border-red-300 ring-1 ring-red-200"
                    : "border-amber-200"
                }`}
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-xs text-text">{item.vehicle.plate}</span>
                    <span className="text-[11px] font-bold text-neutral-600 truncate">({item.vehicle.driver_name})</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <span className="font-semibold text-text">{item.itemType}:</span>
                    <span>{formatDate(item.date)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${item.alert.badgeClass}`}>
                    {item.alert.label}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => openEdit(item.vehicle)}
                      className="text-[10px] font-bold text-brand-navy hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Edit3 size={10} /> Tarihi Güncelle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Kartlar: Durumlar + Masraf Toplamları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Yolda", count: yoldaCount, color: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: Navigation },
          { label: "Depoda", count: depodaCount, color: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: Warehouse },
          { label: "Teslim Etti", count: teslimCount, color: "bg-green-50 border-green-200", text: "text-green-700", icon: CheckCircle2 },
          { label: "Bakımda", count: bakimCount, color: "bg-red-50 border-red-200", text: "text-red-700", icon: AlertCircle },
          {
            label: "Toplam Bakım",
            countText: formatCurrency(totalMaintenanceCost),
            color: "bg-violet-50 border-violet-200",
            text: "text-violet-700",
            icon: Wrench,
          },
          {
            label: "Toplam Yakıt",
            countText: formatCurrency(totalFuelCost),
            color: "bg-emerald-50 border-emerald-200",
            text: "text-emerald-700",
            icon: Fuel,
          },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`border rounded-xl p-3 sm:p-4 ${s.color}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                <Icon size={16} className={s.text} />
              </div>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${s.text}`}>
                {s.countText !== undefined ? s.countText : s.count}
              </p>
            </div>
          );
        })}
      </div>

      {/* Arama & Filtreleme Çubuğu */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Plaka, şoför, telefon, konum veya yük notu ile ara..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm bg-white focus:outline-hidden focus:border-brand-navy"
          />
        </div>
        {filterAlertOnly && (
          <button
            onClick={() => setFilterAlertOnly(false)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-xl text-xs font-semibold transition"
          >
            <X size={14} /> Filtreyi Kaldır
          </button>
        )}
      </div>

      {/* Araç Listesi */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <Truck size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted font-medium">
            {filterAlertOnly
              ? "Yaklaşan uyarısı olan araç bulunamadı."
              : searchQuery
              ? "Arama kriterlerine uygun araç bulunamadı."
              : "Henüz araç eklenmedi."}
          </p>
          {isAdmin && !filterAlertOnly && (
            <button onClick={openNew} className="mt-3 text-brand-navy font-semibold text-sm hover:underline">
              + İlk aracı ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVehicles.map(v => {
            const cfg = STATUS_CONFIG[v.status];
            const Icon = cfg.icon;

            const inspectionAlert = getExpiryAlert(v.inspection_date);
            const insuranceAlert = getExpiryAlert(v.insurance_date);
            const licenseAlert = getExpiryAlert(v.license_date);

            const hasUrgent = inspectionAlert.isUrgent || insuranceAlert.isUrgent || licenseAlert.isUrgent;

            return (
              <div
                key={v.id}
                className={`bg-white border rounded-2xl p-4.5 shadow-xs space-y-3.5 transition hover:shadow-md ${
                  hasUrgent ? "border-red-300 ring-2 ring-red-100" : "border-border"
                }`}
              >
                {/* Üst satır: Plaka + Durum */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck size={17} className="text-brand-navy" />
                      <span className="font-mono font-bold text-text text-base tracking-wider">{v.plate}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-text-muted font-medium">
                        {v.vehicle_type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openStatusModal(v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition hover:opacity-80 ${cfg.bg} ${cfg.color} border-current cursor-pointer`}
                  >
                    <Icon size={12} />
                    {cfg.label}
                  </button>
                </div>

                {/* Şoför */}
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <User size={13} className="shrink-0" />
                  <span className="font-medium text-text">{v.driver_name}</span>
                  {v.driver_phone && (
                    <a href={`tel:${v.driver_phone}`} className="ml-auto flex items-center gap-1 text-xs text-brand-navy hover:underline">
                      <Phone size={11} /> {v.driver_phone}
                    </a>
                  )}
                </div>

                {/* Konum */}
                {(v.current_location || v.destination) && (
                  <div className="bg-surface rounded-xl px-3 py-2 space-y-1">
                    {v.current_location && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted flex items-center gap-1">
                          <MapPin size={11} /> Şu an:
                        </span>
                        <a
                          href={getMapsUrl(v.current_location)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand-navy hover:underline"
                        >
                          {v.current_location} ↗
                        </a>
                      </div>
                    )}
                    {v.destination && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted flex items-center gap-1">
                          <Navigation size={11} /> Gidiyor:
                        </span>
                        <a
                          href={getMapsUrl(v.destination)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-green-700 hover:underline"
                        >
                          {v.destination} ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* ── MUAYENE & SİGORTA HATIRLATICI BLOĞU (1 Ay / 1 Hafta Kala) ── */}
                <div className="rounded-xl border border-border/80 bg-neutral-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 border-b border-border/60 pb-1.5">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-brand-navy" />
                      Tarih ve Hatırlatmalar
                    </span>
                    <span className="text-[10px] text-text-muted font-normal">1 Ay & 1 Hafta Kala Uyarı</span>
                  </div>

                  {/* Muayene */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 flex items-center gap-1.5 font-medium">
                      <ShieldCheck size={13} className="text-neutral-400" />
                      TÜVTÜRK Muayene:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text">
                        {v.inspection_date ? formatDate(v.inspection_date) : "Girilmedi"}
                      </span>
                      {v.inspection_date ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${inspectionAlert.badgeClass}`}>
                          {inspectionAlert.label}
                        </span>
                      ) : isAdmin ? (
                        <button
                          onClick={() => openEdit(v)}
                          className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer"
                        >
                          + Tarih Ekle
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Sigorta */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 flex items-center gap-1.5 font-medium">
                      <ShieldCheck size={13} className="text-amber-500" />
                      Trafik Sigortası:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text">
                        {v.insurance_date ? formatDate(v.insurance_date) : "Girilmedi"}
                      </span>
                      {v.insurance_date ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${insuranceAlert.badgeClass}`}>
                          {insuranceAlert.label}
                        </span>
                      ) : isAdmin ? (
                        <button
                          onClick={() => openEdit(v)}
                          className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer"
                        >
                          + Tarih Ekle
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Ruhsat / Kasko Sigorta */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 flex items-center gap-1.5 font-medium">
                      <FileText size={13} className="text-blue-500" />
                      Ruhsat / Kasko:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text">
                        {v.license_date ? formatDate(v.license_date) : "—"}
                      </span>
                      {v.license_date && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${licenseAlert.badgeClass}`}>
                          {licenseAlert.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── BAKIM VE MASRAF ÖZETİ ── */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                  <div className="rounded-xl bg-surface p-2.5 border border-border/70 space-y-0.5">
                    <span className="text-[10px] text-text-muted flex items-center gap-1 font-medium">
                      <Wrench size={11} className="text-violet-600" />
                      Periyodik Bakım
                    </span>
                    <p className="font-bold text-text text-xs">
                      {v.maintenance_cost && v.maintenance_cost > 0 ? formatCurrency(v.maintenance_cost) : "Masraf: ₺0,00"}
                    </p>
                    <span className="text-[10px] text-text-muted block">
                      {v.maintenance_date ? `Tarih: ${formatDate(v.maintenance_date)}` : "Tarih girilmedi"}
                    </span>
                  </div>

                  <div className="rounded-xl bg-surface p-2.5 border border-border/70 space-y-0.5">
                    <span className="text-[10px] text-text-muted flex items-center gap-1 font-medium">
                      <Fuel size={11} className="text-emerald-600" />
                      Yakıt & Masraf Toplamı
                    </span>
                    <p className="font-bold text-text text-xs">
                      {v.fuel_cost && v.fuel_cost > 0 ? formatCurrency(v.fuel_cost) : "Yakıt: ₺0,00"}
                    </p>
                    <span className="text-[10px] font-semibold text-brand-navy block">
                      Toplam: {formatCurrency((Number(v.maintenance_cost) || 0) + (Number(v.fuel_cost) || 0))}
                    </span>
                  </div>
                </div>

                {/* Yük Notu & Ek Notlar */}
                {v.cargo_notes && (
                  <div className="flex items-start gap-1.5 text-xs text-text-muted">
                    <Package size={12} className="mt-0.5 shrink-0 text-neutral-400" />
                    <span>{v.cargo_notes}</span>
                  </div>
                )}
                {v.notes && (
                  <div className="text-xs text-neutral-500 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                    <span className="font-semibold text-neutral-700">Not: </span>
                    {v.notes}
                  </div>
                )}

                {/* Alt: Son güncelleme + işlemler */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    <Clock size={10} />
                    {v.last_updated_by && <span>{v.last_updated_by} · </span>}
                    {new Date(v.last_updated_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-brand-navy transition cursor-pointer">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(v.id, v.plate)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-600 transition cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ARAÇ EKLE/DÜZENLE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-bold text-text text-base">
                  {editingVehicle ? `${editingVehicle.plate} — Araç Düzenle` : "Yeni Araç Ekle"}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Muayene, sigorta hatırlatmaları ve araç masraflarını kaydedin
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Bölüm 1: Temel Bilgiler */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b pb-1">
                  Temel Bilgiler
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Plaka *</label>
                    <input
                      value={form.plate}
                      onChange={e => setForm(f => ({ ...f, plate: e.target.value }))}
                      placeholder="34 ABC 123"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Araç Tipi</label>
                    <select
                      value={form.vehicle_type}
                      onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    >
                      {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Şoför Adı *</label>
                    <input
                      value={form.driver_name}
                      onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))}
                      placeholder="Ahmet Yılmaz"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Şoför Telefonu</label>
                    <input
                      value={form.driver_phone}
                      onChange={e => setForm(f => ({ ...f, driver_phone: e.target.value }))}
                      placeholder="0532 000 00 00"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Durum</label>
                  <div className="flex gap-2 flex-wrap">
                    {STATUSES.map(s => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, status: s }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                            form.status === s ? `${cfg.bg} ${cfg.color} border-current` : "bg-white text-text-muted border-border hover:bg-surface"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bölüm 2: Konum & Rota */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b pb-1">
                  Konum & Rota Bilgisi
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Şu Anki Konum</label>
                    <input
                      value={form.current_location}
                      onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))}
                      placeholder="İstanbul, Pendik Depo"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Gidilen Yer</label>
                    <input
                      value={form.destination}
                      onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                      placeholder="İzmir, Bornova Şantiye"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Yük / Sevkiyat Notu</label>
                  <input
                    value={form.cargo_notes}
                    onChange={e => setForm(f => ({ ...f, cargo_notes: e.target.value }))}
                    placeholder="Kütahya Seramik 60x120, 8 palet — SEV-2026-045"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Bölüm 3: 📅 MUAYENE, SİGORTA VE HATIRLATMA TARİHLERİ */}
              <div className="space-y-3 pt-2">
                <div className="border-b pb-1 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
                    <Calendar size={13} />
                    Muayene, Sigorta ve Hatırlatma Tarihleri
                  </h3>
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                    🔔 1 Ay ve 1 Hafta Kala Otomatik Uyarı
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">
                      TÜVTÜRK Muayene Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      value={form.inspection_date}
                      onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">
                      Trafik Sigortası Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      value={form.insurance_date}
                      onChange={e => setForm(f => ({ ...f, insurance_date: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">
                    Kasko / Ruhsat Yenileme Tarihi (Opsiyonel)
                  </label>
                  <input
                    type="date"
                    value={form.license_date}
                    onChange={e => setForm(f => ({ ...f, license_date: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              {/* Bölüm 4: 💰 BAKIM VE MASRAF TAKİBİ */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b pb-1 flex items-center gap-1.5">
                  <Wrench size={13} />
                  Bakım ve Masraf Bilgileri
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">
                      Son Bakım Tarihi
                    </label>
                    <input
                      type="date"
                      value={form.maintenance_date}
                      onChange={e => setForm(f => ({ ...f, maintenance_date: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">
                      Bakım Masrafı (₺)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={form.maintenance_cost || ""}
                      onChange={e => setForm(f => ({ ...f, maintenance_cost: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">
                      Yakıt Masrafı (₺)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={form.fuel_cost || ""}
                      onChange={e => setForm(f => ({ ...f, fuel_cost: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">
                    Araç / Bakım Ek Notları
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Yağ ve filtre değişimi yapıldı, balatalar kontrol edildi..."
                    rows={2}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-2 bg-brand-navy text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {editingVehicle ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DURUM GÜNCELLE MODAL (Hızlı) ── */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-bold text-text">{statusModal.vehicle.plate}</h2>
                <p className="text-xs text-text-muted">{statusModal.vehicle.driver_name}</p>
              </div>
              <button onClick={() => setStatusModal(null)} className="text-text-muted hover:text-text cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-2">Yeni Durum</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewStatus(s)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                          newStatus === s ? `${cfg.bg} ${cfg.color} border-current` : "bg-white text-text-muted border-border hover:bg-surface"
                        }`}
                      >
                        <Icon size={14} /> {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Güncel Konum (opsiyonel)</label>
                <input
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="İstanbul, Kadıköy"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="border-t border-border p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatusModal(null)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={isPending}
                className="flex items-center gap-2 bg-brand-navy text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
