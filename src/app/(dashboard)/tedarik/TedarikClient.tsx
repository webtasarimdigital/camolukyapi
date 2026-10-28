"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Boxes,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Search,
  ExternalLink,
  Trash2,
  Save,
  Check,
  Phone,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ProcurementRecord,
  ProcurementStatus,
  ConsolidatedPendingProduct,
} from "./types";
import {
  updateProcurementSupplier,
  updateProcurementStatus,
  deleteProcurementRecord,
} from "./actions";

interface TedarikClientProps {
  initialRecords: ProcurementRecord[];
  userRole: string;
}

const STATUS_CONFIG: Record<
  ProcurementStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  bekliyor: {
    label: "Tedarik Bekliyor",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: Clock,
  },
  siparis_verildi: {
    label: "Sipariş Verildi",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: Truck,
  },
  tedarik_edildi: {
    label: "Tedarik Edildi",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  iptal: {
    label: "İptal",
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
    icon: AlertCircle,
  },
};

export default function TedarikClient({
  initialRecords,
  userRole,
}: TedarikClientProps) {
  const [records, setRecords] = useState<ProcurementRecord[]>(initialRecords);
  const [activeTab, setActiveTab] = useState<"items" | "consolidated">("items");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [tempSupplierVal, setTempSupplierVal] = useState<string>("");
  const [savingSupplierId, setSavingSupplierId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  // KPI Hesaplamaları
  const kpis = useMemo(() => {
    let pending = 0;
    let ordered = 0;
    let fulfilled = 0;

    records.forEach((r) => {
      if (r.status === "bekliyor") pending++;
      else if (r.status === "siparis_verildi") ordered++;
      else if (r.status === "tedarik_edildi") fulfilled++;
    });

    return {
      pending,
      ordered,
      fulfilled,
      total: records.length,
    };
  }, [records]);

  // Sekme 1: Filtrelenmiş Detaylı Liste
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.product_name.toLowerCase().includes(q) ||
        (r.product_code && r.product_code.toLowerCase().includes(q)) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.sale_code.toLowerCase().includes(q) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(q))
      );
    });
  }, [records, statusFilter, searchTerm]);

  // Sekme 2: Konsolide Bekleyen Ürünler (Yalnızca 'bekliyor' veya 'siparis_verildi' olanlar)
  const consolidatedProducts = useMemo(() => {
    const map = new Map<string, ConsolidatedPendingProduct>();

    records.forEach((r) => {
      if (r.status !== "bekliyor" && r.status !== "siparis_verildi") return;

      const normName = r.product_name.trim();
      const existing = map.get(normName);

      if (existing) {
        existing.total_pending_quantity += r.quantity;
        existing.orders.push({
          procurement_id: r.id,
          sale_id: r.sale_id,
          sale_code: r.sale_code,
          customer_name: r.customer_name,
          quantity: r.quantity,
          unit: r.unit,
          supplier_name: r.supplier_name,
          status: r.status,
          created_at: r.created_at,
        });
      } else {
        map.set(normName, {
          product_name: normName,
          product_code: r.product_code,
          unit: r.unit || "Adet",
          total_pending_quantity: r.quantity,
          orders: [
            {
              procurement_id: r.id,
              sale_id: r.sale_id,
              sale_code: r.sale_code,
              customer_name: r.customer_name,
              quantity: r.quantity,
              unit: r.unit,
              supplier_name: r.supplier_name,
              status: r.status,
              created_at: r.created_at,
            },
          ],
        });
      }
    });

    let list = Array.from(map.values());
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.product_name.toLowerCase().includes(q) ||
          (p.product_code && p.product_code.toLowerCase().includes(q)) ||
          p.orders.some(
            (o) =>
              o.customer_name.toLowerCase().includes(q) ||
              o.sale_code.toLowerCase().includes(q) ||
              o.supplier_name.toLowerCase().includes(q)
          )
      );
    }

    return list.sort((a, b) => b.total_pending_quantity - a.total_pending_quantity);
  }, [records, searchTerm]);

  // Tedarikçi Firma Güncelle
  const handleSaveSupplier = async (id: string, newSupplierName: string) => {
    setSavingSupplierId(id);
    try {
      const res = await updateProcurementSupplier(id, newSupplierName);
      if (res.success) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, supplier_name: newSupplierName.trim() } : r
          )
        );
        toast.success("Tedarikçi firma güncellendi");
        setEditingSupplierId(null);
      } else {
        toast.error(res.error || "Tedarikçi güncellenemedi");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSavingSupplierId(null);
    }
  };

  // Statü Güncelle
  const handleStatusChange = async (id: string, newStatus: ProcurementStatus) => {
    // İyimser güncelleme
    const oldRecords = [...records];
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );

    try {
      const res = await updateProcurementStatus(id, newStatus);
      if (res.success) {
        toast.success(`Statü güncellendi: ${STATUS_CONFIG[newStatus].label}`);
      } else {
        setRecords(oldRecords);
        toast.error(res.error || "Statü güncellenemedi");
      }
    } catch {
      setRecords(oldRecords);
      toast.error("Bağlantı hatası");
    }
  };

  // Kayıt Sil
  const handleDelete = async (id: string) => {
    if (!confirm("Bu tedarik kaydını silmek istediğinizden emin misiniz?")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await deleteProcurementRecord(id);
      if (res.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        toast.success("Tedarik kaydı silindi");
      } else {
        toast.error(res.error || "Kayıt silinemedi");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleProductExpand = (productName: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productName]: !prev[productName],
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Üst Başlık & Eylem Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Boxes size={22} />
            </span>
            <h1 className="text-2xl font-black text-text tracking-tight">
              Tedarik Yönetimi
            </h1>
          </div>
          <p className="text-xs text-text-muted">
            Satışlardan aktarılan tedarik kalemleri, tedarikçi firma atamaları ve ürün bazlı toplu ihtiyaç takibi.
          </p>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-700 block mb-0.5">
              Tedarik Bekleyen
            </span>
            <span className="text-2xl font-black text-amber-600 tabular-nums">
              {kpis.pending}
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-blue-700 block mb-0.5">
              Sipariş Verilen
            </span>
            <span className="text-2xl font-black text-blue-600 tabular-nums">
              {kpis.ordered}
            </span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Truck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-700 block mb-0.5">
              Tedarik Edilen
            </span>
            <span className="text-2xl font-black text-emerald-600 tabular-nums">
              {kpis.fulfilled}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-text-muted block mb-0.5">
              Toplam Kalem
            </span>
            <span className="text-2xl font-black text-text tabular-nums">
              {kpis.total}
            </span>
          </div>
          <div className="p-3 bg-surface rounded-xl text-text-muted">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "items"
              ? "border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-xl"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Boxes size={16} />
          Tedarik Kalemleri ({filteredRecords.length})
        </button>

        <button
          onClick={() => setActiveTab("consolidated")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "consolidated"
              ? "border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-xl"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          <Package size={16} />
          Tedarikte Bekleyenler (Ürün Bazlı Toplam)
          {consolidatedProducts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
              {consolidatedProducts.length} Ürün
            </span>
          )}
        </button>
      </div>

      {/* Arama ve Filtreleme */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder={
              activeTab === "items"
                ? "Ürün adı, müşteri, sipariş no veya tedarikçi ara..."
                : "Bekleyen ürünler içinde ara..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {activeTab === "items" && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium py-2 px-3 rounded-xl border border-border bg-white text-text focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">Tüm Statüler ({records.length})</option>
              <option value="bekliyor">🟡 Tedarik Bekliyor ({kpis.pending})</option>
              <option value="siparis_verildi">🔵 Sipariş Verildi ({kpis.ordered})</option>
              <option value="tedarik_edildi">🟢 Tedarik Edildi ({kpis.fulfilled})</option>
              <option value="iptal">⚪ İptal Edilenler</option>
            </select>
          </div>
        )}
      </div>

      {/* ===================== SEKME 1: DETAYLI TEDARİK KALEMLERİ ===================== */}
      {activeTab === "items" && (
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <Boxes size={40} className="mx-auto text-text-muted/40 mb-3" />
              <p className="text-sm font-bold text-text">Kayıt Bulunamadı</p>
              <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                Satış detay sayfalarından tedarik edilecek ürünleri seçip
                &quot;Tedariğe Gönder&quot; butonuna basarak buraya ürün aktarabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface border-b border-border text-text-muted uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4 text-left">Kaynak Sipariş</th>
                    <th className="py-3 px-4 text-left">Müşteri</th>
                    <th className="py-3 px-4 text-left">Ürün Açıklaması</th>
                    <th className="py-3 px-3 text-center">Miktar / Birim</th>
                    <th className="py-3 px-4 text-left min-w-[200px]">
                      Tedarikçi Firma (Elle Giriniz)
                    </th>
                    <th className="py-3 px-4 text-left min-w-[160px]">Statü</th>
                    <th className="py-3 px-3 text-center w-12">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.map((r) => {
                    const statusObj = STATUS_CONFIG[r.status] || STATUS_CONFIG.bekliyor;
                    const StatusIcon = statusObj.icon;
                    const isEditing = editingSupplierId === r.id;

                    return (
                      <tr key={r.id} className="hover:bg-surface/30 transition-colors">
                        {/* Sipariş No */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Link
                            href={`/satislar/${r.sale_id}`}
                            className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 hover:text-amber-800 hover:underline"
                            title="Satış detayına git"
                          >
                            {r.sale_code}
                            <ExternalLink size={11} />
                          </Link>
                          <span className="block text-[10px] text-text-muted mt-0.5">
                            {new Date(r.created_at).toLocaleDateString("tr-TR")}
                          </span>
                        </td>

                        {/* Müşteri */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-text">{r.customer_name}</p>
                          {r.customer_phone && (
                            <span className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                              <Phone size={10} /> {r.customer_phone}
                            </span>
                          )}
                        </td>

                        {/* Ürün */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-text">{r.product_name}</p>
                          {r.product_code && (
                            <span className="text-[10px] font-mono text-text-muted">
                              {r.product_code}
                            </span>
                          )}
                        </td>

                        {/* Miktar */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-surface font-black text-text text-sm tabular-nums">
                            {r.quantity}{" "}
                            <span className="text-[10px] font-normal text-text-muted">
                              {r.unit}
                            </span>
                          </span>
                        </td>

                        {/* Tedarikçi Firma (Elle Düzenleme) */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={tempSupplierVal}
                                onChange={(e) => setTempSupplierVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveSupplier(r.id, tempSupplierVal);
                                  } else if (e.key === "Escape") {
                                    setEditingSupplierId(null);
                                  }
                                }}
                                placeholder="Örn: A Firması, Kütahya B2B..."
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-500 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                              />
                              <button
                                onClick={() => handleSaveSupplier(r.id, tempSupplierVal)}
                                disabled={savingSupplierId === r.id}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                title="Kaydet"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingSupplierId(r.id);
                                setTempSupplierVal(r.supplier_name || "");
                              }}
                              className="group w-full text-left py-1.5 px-2.5 rounded-lg border border-dashed border-border hover:border-amber-500 hover:bg-amber-50/30 transition-all flex items-center justify-between"
                              title="Tedarikçi firma düzenlemek için tıklayın"
                            >
                              {r.supplier_name ? (
                                <span className="font-semibold text-text flex items-center gap-1.5">
                                  <Building2 size={13} className="text-amber-600" />
                                  {r.supplier_name}
                                </span>
                              ) : (
                                <span className="text-text-muted/60 italic text-[11px] flex items-center gap-1">
                                  + Tedarikçi Giriniz
                                </span>
                              )}
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-amber-600">
                                Düzenle
                              </span>
                            </button>
                          )}
                        </td>

                        {/* Statü Değiştirici */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={r.status}
                            onChange={(e) =>
                              handleStatusChange(r.id, e.target.value as ProcurementStatus)
                            }
                            className={`w-full text-xs font-semibold py-1.5 px-2.5 rounded-xl border ${statusObj.bg} ${statusObj.text} ${statusObj.border} cursor-pointer focus:outline-hidden`}
                          >
                            <option value="bekliyor">🟡 Tedarik Bekliyor</option>
                            <option value="siparis_verildi">🔵 Sipariş Verildi</option>
                            <option value="tedarik_edildi">🟢 Tedarik Edildi</option>
                            <option value="iptal">⚪ İptal</option>
                          </select>
                        </td>

                        {/* Silme */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            className="p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            title="Tedarik kaydını sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== SEKME 2: KONSOLİDE BEKLEYENLER (ÜRÜN BAZLI TOPLAM) ===================== */}
      {activeTab === "consolidated" && (
        <div className="space-y-4">
          {/* Bilgi Kutusu */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-800 rounded-xl mt-0.5">
              <Package size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Toplu İhtiyaç Konsolidasyonu
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Tedarikçinizi aramadan önce toplam ihtiyaç duyulan miktarı tek kalemde
                görebilirsiniz. Bir ürün için sipariş geldiğinde veya tamamlandığında
                statüsünü <strong>&quot;Tedarik Edildi&quot;</strong> yaptığınız an bu
                listeden otomatik olarak düşer.
              </p>
            </div>
          </div>

          {consolidatedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-xs">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-sm font-bold text-text">Harika! Tedarikte Bekleyen Ürün Yok</p>
              <p className="text-xs text-text-muted mt-1">
                Tüm siparişlerin tedarikleri tamamlanmış veya henüz tedariğe aktarılan ürün bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {consolidatedProducts.map((p) => {
                const isExpanded = expandedProducts[p.product_name] !== false; // varsayılan açık

                return (
                  <div
                    key={p.product_name}
                    className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden transition-all hover:border-amber-300"
                  >
                    {/* Başlık Çubuğu */}
                    <div
                      onClick={() => toggleProductExpand(p.product_name)}
                      className="p-4 bg-surface/50 border-b border-border flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                          <Package size={20} />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-text">
                              {p.product_name}
                            </h3>
                            {p.product_code && (
                              <span className="text-[10px] font-mono text-text-muted bg-white px-2 py-0.5 rounded-md border border-border">
                                {p.product_code}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {p.orders.length} Farklı Siparişten İhtiyaç Var
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Toplam İhtiyaç Rozeti */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-amber-700 block">
                            Toplam İhtiyaç
                          </span>
                          <span className="text-xl font-black text-amber-600 tabular-nums">
                            {p.total_pending_quantity}{" "}
                            <span className="text-xs font-semibold text-text-muted">
                              {p.unit}
                            </span>
                          </span>
                        </div>

                        <button className="p-1.5 rounded-lg text-text-muted hover:text-text">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Sipariş Kırılımı Tablosu */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-surface/30 text-text-muted text-[10px] uppercase font-bold border-b border-border">
                            <tr>
                              <th className="py-2.5 px-4 text-left">Sipariş No</th>
                              <th className="py-2.5 px-4 text-left">Müşteri</th>
                              <th className="py-2.5 px-3 text-center">İstenen Miktar</th>
                              <th className="py-2.5 px-4 text-left">Tedarikçi Firma</th>
                              <th className="py-2.5 px-4 text-left">Mevcut Durum</th>
                              <th className="py-2.5 px-4 text-right">Hızlı Tamamla</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {p.orders.map((order) => {
                              const statusObj =
                                STATUS_CONFIG[order.status] || STATUS_CONFIG.bekliyor;

                              return (
                                <tr
                                  key={order.procurement_id}
                                  className="hover:bg-surface/20"
                                >
                                  {/* Sipariş */}
                                  <td className="py-2.5 px-4 whitespace-nowrap">
                                    <Link
                                      href={`/satislar/${order.sale_id}`}
                                      className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 hover:underline"
                                    >
                                      {order.sale_code}
                                      <ExternalLink size={10} />
                                    </Link>
                                  </td>

                                  {/* Müşteri */}
                                  <td className="py-2.5 px-4 font-semibold text-text">
                                    {order.customer_name}
                                  </td>

                                  {/* Miktar */}
                                  <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                                    {order.quantity} {order.unit}
                                  </td>

                                  {/* Tedarikçi */}
                                  <td className="py-2.5 px-4">
                                    {order.supplier_name ? (
                                      <span className="font-medium text-text flex items-center gap-1">
                                        <Building2 size={12} className="text-amber-600" />
                                        {order.supplier_name}
                                      </span>
                                    ) : (
                                      <span className="text-text-muted/60 italic text-[11px]">
                                        Tedarikçi Belirtilmemiş
                                      </span>
                                    )}
                                  </td>

                                  {/* Statü */}
                                  <td className="py-2.5 px-4">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusObj.bg} ${statusObj.text} ${statusObj.border}`}
                                    >
                                      {statusObj.label}
                                    </span>
                                  </td>

                                  {/* Hızlı Tedarik Edildi Butonu */}
                                  <td className="py-2.5 px-4 text-right">
                                    <button
                                      onClick={() =>
                                        handleStatusChange(
                                          order.procurement_id,
                                          "tedarik_edildi"
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                      title="Bu kalemi tedarik edildi olarak işaretle ve toplamdan düş"
                                    >
                                      <CheckCircle2 size={12} />
                                      Tedarik Edildi
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
