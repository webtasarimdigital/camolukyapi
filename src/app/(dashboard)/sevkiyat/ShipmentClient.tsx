"use client";

import { useState, useTransition } from "react";
import { Shipment } from "@/lib/data/types";
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
} from "lucide-react";

interface Props {
  initialShipments: Shipment[];
  userRole: string;
  userName: string;
}

export function ShipmentClient({ initialShipments }: Props) {
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [officialFilter, setOfficialFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "otobil">("list");
  const [isPending, startTransition] = useTransition();

  // Otobil settings
  const [otobilUrl, setOtobilUrl] = useState("https://web.otobil.com.tr");

  const filtered = shipments.filter((s) => {
    const q = search.toLowerCase();
    const matchQ =
      s.customer_name.toLowerCase().includes(q) ||
      s.seller.toLowerCase().includes(q) ||
      s.receipt_no.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchOfficial = officialFilter === "all" || s.is_official === officialFilter;
    return matchQ && matchStatus && matchOfficial;
  });

  const countDepoyaGitti = shipments.filter((s) => s.status === "Depoya Gitti").length;
  const countSevkiyatta = shipments.filter((s) => s.status === "Sevkiyata Çıktı").length;
  const countTeslim = shipments.filter((s) => s.status === "Teslim Edildi").length;

  async function handleStatusChange(id: string, newStatus: Shipment["status"]) {
    startTransition(async () => {
      const res = await actionUpdateShipmentStatus(id, newStatus);
      if (res.success && res.shipment) {
        setShipments((prev) =>
          prev.map((item) => (item.id === id ? res.shipment! : item))
        );
        toast.success(`Sevkiyat durumu "${newStatus}" olarak güncellendi!`);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu sevkiyat kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await actionDeleteShipment(id);
      setShipments((prev) => prev.filter((item) => item.id !== id));
      toast.success("Sevkiyat kaydı silindi.");
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await actionSaveShipment(formData);
      if (res.success && res.shipment) {
        setShipments((prev) => [res.shipment!, ...prev]);
        toast.success("Yeni sevkiyat başarıyla oluşturuldu!");
        setIsModalOpen(false);
        form.reset();
      }
    });
  }

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
            Müşteri sevk yerleri, palet, metrekare ve anlık araç hazırlık takibi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "list"
                  ? "bg-white text-brand-navy shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Sevkiyat Listesi ({shipments.length})
            </button>
            <button
              onClick={() => setActiveTab("otobil")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "otobil"
                  ? "bg-brand-navy text-white shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Navigation size={13} />
              Otobil GPS Araç Takip
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={16} /> + Yeni Sevk Kaydı Gir
          </button>
        </div>
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

          {/* Otobil Portal Frame / Entegrasyon Kutusu */}
          <div className="border border-border rounded-xl p-6 bg-slate-50 text-center space-y-3">
            <MapPin size={40} className="mx-auto text-brand-navy/60" />
            <h4 className="text-sm font-bold text-text">Otobil Canlı Harita ve Telemetri Girişi</h4>
            <p className="text-xs text-text-muted max-w-lg mx-auto">
              Otobil kullanıcı adı ve şifrenizle doğrudan giriş yapmak veya takip portalını bağlamak için aşağıdaki bağlantıyı kullanabilirsiniz.
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
              onClick={() => setStatusFilter("Depoya Gitti")}
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
              onClick={() => setStatusFilter("Sevkiyata Çıktı")}
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
              onClick={() => setStatusFilter("Teslim Edildi")}
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

          {/* Filtre ve Arama */}
          <div className="bg-white p-4 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Müşteri adı, satıcı, fiş no veya sevk yeri ara..."
                className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs outline-none focus:border-brand-navy"
              />
            </div>

            <div className="flex items-center gap-2">
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

              <select
                value={officialFilter}
                onChange={(e) => setOfficialFilter(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 text-xs bg-white font-medium outline-none"
              >
                <option value="all">Resmi / Gayriresmi</option>
                <option value="Resmi">Resmi Fiş</option>
                <option value="Gayriresmi">Gayriresmi</option>
              </select>

              {(statusFilter !== "all" || officialFilter !== "all" || search) && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setOfficialFilter("all");
                    setSearch("");
                  }}
                  className="text-xs text-rose-600 hover:underline px-2"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>

          {/* Tablo */}
          <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Fiş No</th>
                    <th className="py-3 px-4">Müşteri Adı</th>
                    <th className="py-3 px-4">Satıcı</th>
                    <th className="py-3 px-4">Sevk Yeri</th>
                    <th className="py-3 px-4 text-center">Tip</th>
                    <th className="py-3 px-4 text-center">m² / Palet</th>
                    <th className="py-3 px-4">Hazırlık / Not</th>
                    <th className="py-3 px-4">İşlemi Yapan</th>
                    <th className="py-3 px-4 text-right">Statü (Durum)</th>
                    <th className="py-3 px-4 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-text-muted">
                        Kayıtlı sevkiyat bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-surface/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-brand-navy">
                          {item.receipt_no || "-"}
                        </td>
                        <td className="py-3 px-4 font-bold text-text">
                          {item.customer_name}
                        </td>
                        <td className="py-3 px-4 text-text-muted">
                          {item.seller || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1 text-text-muted">
                            <MapPin size={12} className="text-brand-navy flex-shrink-0" />
                            {item.destination}
                          </span>
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
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-text">{item.m2} m²</span>
                          <span className="text-text-muted ml-1.5 font-medium">({item.pallet_count} Palet)</span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-text-muted">
                          {item.preparation_notes || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-border text-[10px] font-medium text-text-muted">
                            <User size={10} /> {item.created_by_name}
                          </span>
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
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-rose-400 hover:text-rose-600 p-1 rounded transition"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* YENİ SEVKİYAT MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <Truck className="text-brand-navy" size={20} />
                Yeni Sevkiyat Kaydı Gir
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Müşteri Adı *</label>
                  <input
                    type="text"
                    required
                    name="customer_name"
                    placeholder="Örn: Yılmaz İnşaat Ltd."
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Satıcı / Temsilci</label>
                  <input
                    type="text"
                    name="seller"
                    placeholder="Örn: Ahmet Duvarbaşı"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Fiş No</label>
                  <input
                    type="text"
                    name="receipt_no"
                    placeholder="SEV-2026-003"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Resmi / Gayri Resmi *</label>
                  <select
                    name="is_official"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                  >
                    <option value="Resmi">Resmi Fiş / Fatura</option>
                    <option value="Gayriresmi">Gayriresmi / Sevk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Sevk Yeri / Adres *</label>
                <input
                  type="text"
                  required
                  name="destination"
                  placeholder="Şantiye adresi, ilçe veya depo..."
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
                  placeholder="Palet hazırlandı, yapıştırıcılar ayrıldı, şoför arandı..."
                  className="w-full border border-border rounded-lg p-2.5 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Başlangıç Statüsü</label>
                <select
                  name="status"
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
                  {isPending ? "Kaydediliyor..." : "Sevkiyatı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
