"use client";

import { useState, useTransition } from "react";
import type { Vehicle } from "./types";
import { saveVehicle, updateVehicleStatus, deleteVehicle } from "./actions";
import { toast } from "sonner";
import {
  Truck, Plus, MapPin, Phone, User, Edit3, Trash2,
  CheckCircle2, Clock, Warehouse, XCircle, Loader2,
  Navigation, X, Package, AlertCircle,
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

const VEHICLE_TYPES = ["Kamyon", "TIR", "Kamyonet", "Pickup", "Diğer"];
const STATUSES: Vehicle["status"][] = ["Depoda", "Yolda", "Teslim Etti", "Bakımda"];

const EMPTY_FORM = {
  plate: "", driver_name: "", driver_phone: "",
  vehicle_type: "Kamyon", status: "Depoda" as Vehicle["status"],
  current_location: "", destination: "", cargo_notes: "",
};

export function VehicleClient({ initialVehicles, userRole }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [statusModal, setStatusModal] = useState<{ vehicle: Vehicle } | null>(null);
  const [newStatus, setNewStatus] = useState<Vehicle["status"]>("Yolda");
  const [newLocation, setNewLocation] = useState("");
  const [isPending, startTransition] = useTransition();

  const isAdmin = userRole === "admin" || userRole === "muhasebe1" || userRole === "muhasebe2";

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
        await saveVehicle({ id: editingVehicle?.id, ...form });
        toast.success(editingVehicle ? "Araç güncellendi." : "Araç eklendi.");
        // Listeyi güncelle
        const updated = await import("./actions").then(m => m.getVehicles());
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
        toast.success("Durum güncellendi.");
        const updated = await import("./actions").then(m => m.getVehicles());
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

  function getMapsUrl(location: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }

  const yoldaCount = vehicles.filter(v => v.status === "Yolda").length;
  const depodaCount = vehicles.filter(v => v.status === "Depoda").length;
  const teslimCount = vehicles.filter(v => v.status === "Teslim Etti").length;
  const bakimCount = vehicles.filter(v => v.status === "Bakımda").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Otobil GPS & Araç Takip</h1>
          <p className="text-sm text-text-muted">Filonuzdaki araçların durumunu ve konumunu takip edin</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition"
          >
            <Plus size={15} /> Araç Ekle
          </button>
        )}
      </div>

      {/* KPI Kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Yolda", count: yoldaCount, color: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: Navigation },
          { label: "Depoda", count: depodaCount, color: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: Warehouse },
          { label: "Teslim Etti", count: teslimCount, color: "bg-green-50 border-green-200", text: "text-green-700", icon: CheckCircle2 },
          { label: "Bakımda", count: bakimCount, color: "bg-red-50 border-red-200", text: "text-red-700", icon: AlertCircle },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                <Icon size={16} className={s.text} />
              </div>
              <p className={`text-3xl font-bold mt-1 ${s.text}`}>{s.count}</p>
            </div>
          );
        })}
      </div>

      {/* Araç Listesi */}
      {vehicles.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <Truck size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted font-medium">Henüz araç eklenmedi.</p>
          {isAdmin && (
            <button onClick={openNew} className="mt-3 text-brand-navy font-semibold text-sm hover:underline">
              + İlk aracı ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map(v => {
            const cfg = STATUS_CONFIG[v.status];
            const Icon = cfg.icon;
            return (
              <div key={v.id} className="bg-white border border-border rounded-2xl p-4 shadow-sm space-y-3">
                {/* Üst satır: Plaka + Durum */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-brand-navy" />
                      <span className="font-bold text-text text-base tracking-wider">{v.plate}</span>
                      <span className="text-xs text-text-muted">{v.vehicle_type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openStatusModal(v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition hover:opacity-80 ${cfg.bg} ${cfg.color} border-current`}
                  >
                    <Icon size={11} />
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

                {/* Yük Notu */}
                {v.cargo_notes && (
                  <div className="flex items-start gap-1.5 text-xs text-text-muted">
                    <Package size={11} className="mt-0.5 shrink-0" />
                    <span>{v.cargo_notes}</span>
                  </div>
                )}

                {/* Alt: Son güncelleme + işlemler */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <Clock size={10} />
                    {v.last_updated_by && <span>{v.last_updated_by} · </span>}
                    {new Date(v.last_updated_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-brand-navy transition">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(v.id, v.plate)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-600 transition">
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-text">{editingVehicle ? "Araç Düzenle" : "Yeni Araç Ekle"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
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
                        onClick={() => setForm(f => ({ ...f, status: s }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${form.status === s ? `${cfg.bg} ${cfg.color} border-current` : "bg-white text-text-muted border-border hover:bg-surface"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Şu Anki Konum</label>
                  <input
                    value={form.current_location}
                    onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))}
                    placeholder="İstanbul, Pendik"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Gidilen Yer</label>
                  <input
                    value={form.destination}
                    onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                    placeholder="İzmir, Bornova"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Yük / Sevkiyat Notu</label>
                <textarea
                  value={form.cargo_notes}
                  onChange={e => setForm(f => ({ ...f, cargo_notes: e.target.value }))}
                  placeholder="Kütahya Seramik 60x120, 8 palet — SEV-2026-045"
                  rows={2}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="border-t border-border p-4 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text">İptal</button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-2 bg-brand-navy text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
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
              <button onClick={() => setStatusModal(null)} className="text-text-muted hover:text-text"><X size={18} /></button>
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
                        onClick={() => setNewStatus(s)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition ${newStatus === s ? `${cfg.bg} ${cfg.color} border-current` : "bg-white text-text-muted border-border hover:bg-surface"}`}
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
              <button onClick={() => setStatusModal(null)} className="px-4 py-2 text-sm text-text-muted hover:text-text">İptal</button>
              <button
                onClick={handleStatusUpdate}
                disabled={isPending}
                className="flex items-center gap-2 bg-brand-navy text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
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
