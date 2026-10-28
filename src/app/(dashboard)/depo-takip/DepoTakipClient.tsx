"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  PackageCheck,
  Plus,
  Search,
  Camera,
  Image as ImageIcon,
  Calendar,
  User,
  Trash2,
  Edit3,
  Eye,
  X,
  ExternalLink,
  Download,
  Columns,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Building2,
  FileText,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { uploadToStorage } from "@/lib/storage-upload";
import {
  WarehouseBrokenRecord,
  WarehouseDeliveryRecord,
  WarehouseCustomColumn,
  CustomerOption,
  DeliveryType,
  saveBrokenRecord,
  deleteBrokenRecord,
  saveDeliveryRecord,
  deleteDeliveryRecord,
  addWarehouseCustomColumn,
  deleteWarehouseCustomColumn,
  updateWarehouseCell,
} from "./actions";

interface Props {
  initialBrokenRecords: WarehouseBrokenRecord[];
  initialDeliveryRecords: WarehouseDeliveryRecord[];
  initialBrokenColumns: WarehouseCustomColumn[];
  initialDeliveryColumns: WarehouseCustomColumn[];
  customers: CustomerOption[];
  userRole: string;
  userName: string;
}

export function DepoTakipClient({
  initialBrokenRecords,
  initialDeliveryRecords,
  initialBrokenColumns,
  initialDeliveryColumns,
  customers,
  userRole,
  userName,
}: Props) {
  // 1. Sekme: "kiriklar" (varsayılan) | "teslimat"
  const [activeTab, setActiveTab] = useState<"kiriklar" | "teslimat">("kiriklar");

  // State
  const [brokenRecords, setBrokenRecords] = useState<WarehouseBrokenRecord[]>(initialBrokenRecords);
  const [deliveryRecords, setDeliveryRecords] = useState<WarehouseDeliveryRecord[]>(initialDeliveryRecords);
  const [brokenColumns, setBrokenColumns] = useState<WarehouseCustomColumn[]>(initialBrokenColumns);
  const [deliveryColumns, setDeliveryColumns] = useState<WarehouseCustomColumn[]>(initialDeliveryColumns);

  const [isPending, startTransition] = useTransition();

  // Arama & Filtreler
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | DeliveryType>("all");

  // Lightbox Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Kırıklar Modalları
  const [isBrokenModalOpen, setIsBrokenModalOpen] = useState(false);
  const [editingBroken, setEditingBroken] = useState<WarehouseBrokenRecord | null>(null);
  const [brokenCustomerSearch, setBrokenCustomerSearch] = useState("");
  const [brokenForm, setBrokenForm] = useState({
    image_url: "",
    reason: "",
    broken_date: new Date().toISOString().slice(0, 10),
    customer_id: "",
    customer_name: "",
    product_name: "",
    reported_by: userName || "Depo Sorumlusu",
    notes: "",
    custom_fields: {} as Record<string, any>,
  });
  const [uploadingBrokenImg, setUploadingBrokenImg] = useState(false);

  // Teslimat Modalları
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<WarehouseDeliveryRecord | null>(null);
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_type: "depodan_teslim_alinan" as DeliveryType,
    customer_id: "",
    customer_name: "",
    delivery_date: new Date().toISOString().slice(0, 10),
    delivered_by: userName || "Depo Sorumlusu",
    receipt_image_url: "",
    notes: "",
    custom_fields: {} as Record<string, any>,
  });
  const [uploadingDeliveryImg, setUploadingDeliveryImg] = useState(false);

  // Sütun Ekleme Modalı
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [columnForm, setColumnForm] = useState({
    name: "",
    type: "text",
  });

  // Müşteri seçimi filtreleme
  const [customerSearch, setCustomerSearch] = useState("");

  // -------------------------------------------------------------
  // Filtrelenmiş Kırıklar
  // -------------------------------------------------------------
  const filteredBrokenRecords = useMemo(() => {
    let list = brokenRecords;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const inCust = r.customer_name?.toLowerCase().includes(q);
        const inReason = r.reason.toLowerCase().includes(q);
        const inProd = r.product_name?.toLowerCase().includes(q);
        const inReported = r.reported_by?.toLowerCase().includes(q);
        const inDate = r.broken_date.includes(q);
        const inCustom = Object.values(r.custom_fields || {}).some((v) =>
          String(v).toLowerCase().includes(q)
        );
        return inCust || inReason || inProd || inReported || inDate || inCustom;
      });
    }
    return list;
  }, [brokenRecords, searchQuery]);

  // -------------------------------------------------------------
  // Filtrelenmiş Teslimatlar
  // -------------------------------------------------------------
  const filteredDeliveryRecords = useMemo(() => {
    let list = deliveryRecords;
    if (deliveryFilter !== "all") {
      list = list.filter((r) => r.delivery_type === deliveryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const inCust = r.customer_name.toLowerCase().includes(q);
        const inDelivered = r.delivered_by.toLowerCase().includes(q);
        const inDate = r.delivery_date.includes(q);
        const inNotes = r.notes?.toLowerCase().includes(q);
        const inCustom = Object.values(r.custom_fields || {}).some((v) =>
          String(v).toLowerCase().includes(q)
        );
        return inCust || inDelivered || inDate || inNotes || inCustom;
      });
    }
    return list;
  }, [deliveryRecords, deliveryFilter, searchQuery]);

  // Sayaçlar
  const alinanCount = useMemo(
    () => deliveryRecords.filter((r) => r.delivery_type === "depodan_teslim_alinan").length,
    [deliveryRecords]
  );
  const edilenCount = useMemo(
    () => deliveryRecords.filter((r) => r.delivery_type === "depoya_teslim_edilen").length,
    [deliveryRecords]
  );

  // -------------------------------------------------------------
  // Fotoğraf Yükleme İşleyicileri
  // -------------------------------------------------------------
  const handleBrokenImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBrokenImg(true);
    try {
      const res = await uploadToStorage("shipment-photos", file, "depo-kiriklar");
      if (res.success && res.url) {
        setBrokenForm((prev) => ({ ...prev, image_url: res.url! }));
      } else {
        alert("Görsel yüklenemedi: " + (res.error || "Bilinmeyen hata"));
      }
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setUploadingBrokenImg(false);
    }
  };

  const handleDeliveryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDeliveryImg(true);
    try {
      const res = await uploadToStorage("shipment-photos", file, "depo-teslimat");
      if (res.success && res.url) {
        setDeliveryForm((prev) => ({ ...prev, receipt_image_url: res.url! }));
      } else {
        alert("Görsel yüklenemedi: " + (res.error || "Bilinmeyen hata"));
      }
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setUploadingDeliveryImg(false);
    }
  };

  // -------------------------------------------------------------
  // Kırıklar Modal Aç / Kaydet / Sil
  // -------------------------------------------------------------
  const openNewBrokenModal = () => {
    setEditingBroken(null);
    setBrokenCustomerSearch("");
    setBrokenForm({
      image_url: "",
      reason: "",
      broken_date: new Date().toISOString().slice(0, 10),
      customer_id: "",
      customer_name: "",
      product_name: "",
      reported_by: userName || "Depo Sorumlusu",
      notes: "",
      custom_fields: {},
    });
    setIsBrokenModalOpen(true);
  };

  const openEditBrokenModal = (r: WarehouseBrokenRecord) => {
    setEditingBroken(r);
    setBrokenCustomerSearch(r.customer_name || "");
    setBrokenForm({
      image_url: r.image_url,
      reason: r.reason,
      broken_date: r.broken_date,
      customer_id: r.customer_id || "",
      customer_name: r.customer_name || "",
      product_name: r.product_name || "",
      reported_by: r.reported_by || userName || "Depo Sorumlusu",
      notes: r.notes || "",
      custom_fields: { ...(r.custom_fields || {}) },
    });
    setIsBrokenModalOpen(true);
  };

  const handleSaveBroken = async () => {
    if (!brokenForm.reason.trim()) {
      alert("Lütfen hasar / kırılma sebebini yazınız.");
      return;
    }
    if (!brokenForm.image_url.trim()) {
      alert("Lütfen kırık / hasar görselini yükleyiniz veya kameradan çekiniz.");
      return;
    }

    startTransition(async () => {
      const res = await saveBrokenRecord({
        id: editingBroken?.id,
        image_url: brokenForm.image_url,
        reason: brokenForm.reason,
        broken_date: brokenForm.broken_date,
        customer_id: brokenForm.customer_id || undefined,
        customer_name: brokenForm.customer_name || undefined,
        product_name: brokenForm.product_name,
        reported_by: brokenForm.reported_by,
        notes: brokenForm.notes,
        custom_fields: brokenForm.custom_fields,
      });

      if (res.success) {
        if (editingBroken) {
          setBrokenRecords((prev) =>
            prev.map((r) =>
              r.id === editingBroken.id
                ? {
                    ...r,
                    image_url: brokenForm.image_url,
                    reason: brokenForm.reason,
                    broken_date: brokenForm.broken_date,
                    customer_id: brokenForm.customer_id || undefined,
                    customer_name: brokenForm.customer_name || "",
                    product_name: brokenForm.product_name,
                    reported_by: brokenForm.reported_by,
                    notes: brokenForm.notes,
                    custom_fields: brokenForm.custom_fields,
                  }
                : r
            )
          );
        } else if (res.data) {
          const newRow: WarehouseBrokenRecord = {
            id: res.data.id,
            image_url: brokenForm.image_url,
            reason: brokenForm.reason,
            broken_date: brokenForm.broken_date,
            customer_id: brokenForm.customer_id || undefined,
            customer_name: brokenForm.customer_name || "",
            product_name: brokenForm.product_name,
            reported_by: brokenForm.reported_by,
            notes: brokenForm.notes,
            custom_fields: brokenForm.custom_fields,
            created_at: new Date().toISOString(),
          };
          setBrokenRecords((prev) => [newRow, ...prev]);
        }
        setIsBrokenModalOpen(false);
      } else {
        alert("Hata oluştu: " + res.error);
      }
    });
  };

  const handleDeleteBroken = async (id: string) => {
    if (!confirm("Bu kırık ürün kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteBrokenRecord(id);
      if (res.success) {
        setBrokenRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert("Silinemedi: " + res.error);
      }
    });
  };

  // -------------------------------------------------------------
  // Teslimat Modal Aç / Kaydet / Sil
  // -------------------------------------------------------------
  const openNewDeliveryModal = (defaultType?: DeliveryType) => {
    setEditingDelivery(null);
    setCustomerSearch("");
    setDeliveryForm({
      delivery_type: defaultType || "depodan_teslim_alinan",
      customer_id: "",
      customer_name: "",
      delivery_date: new Date().toISOString().slice(0, 10),
      delivered_by: userName || "Depo Sorumlusu",
      receipt_image_url: "",
      notes: "",
      custom_fields: {},
    });
    setIsDeliveryModalOpen(true);
  };

  const openEditDeliveryModal = (r: WarehouseDeliveryRecord) => {
    setEditingDelivery(r);
    setCustomerSearch(r.customer_name);
    setDeliveryForm({
      delivery_type: r.delivery_type,
      customer_id: r.customer_id || "",
      customer_name: r.customer_name,
      delivery_date: r.delivery_date,
      delivered_by: r.delivered_by || userName || "Depo Sorumlusu",
      receipt_image_url: r.receipt_image_url || "",
      notes: r.notes || "",
      custom_fields: { ...(r.custom_fields || {}) },
    });
    setIsDeliveryModalOpen(true);
  };

  const handleSaveDelivery = async () => {
    if (!deliveryForm.customer_name.trim()) {
      alert("Lütfen müşteri / firma adını giriniz veya seçiniz.");
      return;
    }

    startTransition(async () => {
      const res = await saveDeliveryRecord({
        id: editingDelivery?.id,
        delivery_type: deliveryForm.delivery_type,
        customer_id: deliveryForm.customer_id || undefined,
        customer_name: deliveryForm.customer_name,
        delivery_date: deliveryForm.delivery_date,
        delivered_by: deliveryForm.delivered_by,
        receipt_image_url: deliveryForm.receipt_image_url,
        notes: deliveryForm.notes,
        custom_fields: deliveryForm.custom_fields,
      });

      if (res.success) {
        if (editingDelivery) {
          setDeliveryRecords((prev) =>
            prev.map((r) =>
              r.id === editingDelivery.id
                ? {
                    ...r,
                    delivery_type: deliveryForm.delivery_type,
                    customer_id: deliveryForm.customer_id || undefined,
                    customer_name: deliveryForm.customer_name,
                    delivery_date: deliveryForm.delivery_date,
                    delivered_by: deliveryForm.delivered_by,
                    receipt_image_url: deliveryForm.receipt_image_url,
                    notes: deliveryForm.notes,
                    custom_fields: deliveryForm.custom_fields,
                  }
                : r
            )
          );
        } else if (res.data) {
          const newRow: WarehouseDeliveryRecord = {
            id: res.data.id,
            delivery_type: deliveryForm.delivery_type,
            customer_id: deliveryForm.customer_id || undefined,
            customer_name: deliveryForm.customer_name,
            delivery_date: deliveryForm.delivery_date,
            delivered_by: deliveryForm.delivered_by,
            receipt_image_url: deliveryForm.receipt_image_url,
            notes: deliveryForm.notes,
            custom_fields: deliveryForm.custom_fields,
            created_at: new Date().toISOString(),
          };
          setDeliveryRecords((prev) => [newRow, ...prev]);
        }
        setIsDeliveryModalOpen(false);
      } else {
        alert("Hata oluştu: " + res.error);
      }
    });
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm("Bu teslimat kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteDeliveryRecord(id);
      if (res.success) {
        setDeliveryRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert("Silinemedi: " + res.error);
      }
    });
  };

  // -------------------------------------------------------------
  // Dinamik Sütun Ekle / Sil
  // -------------------------------------------------------------
  const handleAddColumn = async () => {
    if (!columnForm.name.trim()) {
      alert("Lütfen sütun adını yazınız.");
      return;
    }
    const targetTable = activeTab === "kiriklar" ? "depo_kiriklar" : "depo_teslimi";

    startTransition(async () => {
      const res = await addWarehouseCustomColumn(targetTable, columnForm.name, columnForm.type);
      if (res.success && res.column) {
        if (activeTab === "kiriklar") {
          setBrokenColumns((prev) => [...prev, res.column!]);
        } else {
          setDeliveryColumns((prev) => [...prev, res.column!]);
        }
        setColumnForm({ name: "", type: "text" });
        setIsColumnModalOpen(false);
      } else {
        alert("Sütun eklenemedi: " + res.error);
      }
    });
  };

  const handleDeleteColumn = async (tableId: "depo_kiriklar" | "depo_teslimi", colKey: string) => {
    if (!confirm("Bu sütunu ve altındaki tüm verileri silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteWarehouseCustomColumn(tableId, colKey);
      if (res.success) {
        if (tableId === "depo_kiriklar") {
          setBrokenColumns((prev) => prev.filter((c) => c.column_key !== colKey));
        } else {
          setDeliveryColumns((prev) => prev.filter((c) => c.column_key !== colKey));
        }
      } else {
        alert("Sütun silinemedi: " + res.error);
      }
    });
  };

  // Hücre içi hızlı düzenleme
  const handleCellBlur = (rowId: string, colKey: string, val: string) => {
    updateWarehouseCell(rowId, colKey, val);
  };

  // Müşteri seçimi filtre listesi (Teslimat için)
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 30);
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q))
      .slice(0, 30);
  }, [customers, customerSearch]);

  // Müşteri seçimi filtre listesi (Kırıklar için)
  const filteredBrokenCustomers = useMemo(() => {
    if (!brokenCustomerSearch.trim()) return customers.slice(0, 30);
    const q = brokenCustomerSearch.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q))
      .slice(0, 30);
  }, [customers, brokenCustomerSearch]);

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* ========================================================= */}
      {/* MOBIL & DESKTOP STICKY TOP TAB BAR                         */}
      {/* ========================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 gap-2">
            {/* Başlık & Modül Bilgisi */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-6 h-6 text-indigo-600" />
                  Depo Takip
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Kırık / hasarlı ürünler ve depo teslimat (giriş/çıkış) yönetimi
                </p>
              </div>

              {/* Hızlı Aksiyon Butonu (Mobilde de görünür) */}
              <div className="sm:hidden flex items-center gap-1.5">
                {activeTab === "kiriklar" ? (
                  <button
                    onClick={openNewBrokenModal}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 active:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Kırık Ekle
                  </button>
                ) : (
                  <button
                    onClick={() => openNewDeliveryModal()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 active:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Teslimat Ekle
                  </button>
                )}
              </div>
            </div>

            {/* ANA 2 SEKME (Mobilde ve Masaüstünde En Üstte Belirgin) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto shadow-inner">
              {/* 1. SEKME: KIRIKLAR (İLK AÇILAN VARSAYILAN) */}
              <button
                type="button"
                onClick={() => setActiveTab("kiriklar")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "kiriklar"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>1. Kırıklar & Görseller</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "kiriklar" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {brokenRecords.length}
                </span>
              </button>

              {/* 2. SEKME: DEPO TESLİMİ */}
              <button
                type="button"
                onClick={() => setActiveTab("teslimat")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "teslimat"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <PackageCheck className="w-4 h-4 shrink-0" />
                <span>2. Depo Teslimi</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "teslimat" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {deliveryRecords.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* İÇERİK ALANI                                              */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        {/* Arama & Aksiyonlar Araç Çubuğu */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-sm mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Arama Kutusu */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === "kiriklar"
                    ? "Kırık sebebi, ürün adı, tarih veya bildiren ara..."
                    : "Müşteri adı, teslim eden, tarih veya not ara..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Masaüstü Aksiyon Butonları */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {/* Sütun Ekle */}
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                title="Yeni dinamik sütun ekle"
              >
                <Columns className="w-4 h-4 text-slate-500" />
                <span>+ Sütun Ekle</span>
              </button>

              {/* Ana Ekleme Butonu */}
              {activeTab === "kiriklar" ? (
                <button
                  type="button"
                  onClick={openNewBrokenModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Kırık Ürün Bildir</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openNewDeliveryModal()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Teslimat Ekle</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobilde Sütun Ekle Butonu */}
          <div className="sm:hidden flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
            <span className="text-[11px] text-slate-500">
              {activeTab === "kiriklar"
                ? `${filteredBrokenRecords.length} kırık kayıt`
                : `${filteredDeliveryRecords.length} teslimat kayıt`}
            </span>
            <button
              type="button"
              onClick={() => setIsColumnModalOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>+ Yeni Sütun Ekle</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 1. SEKME: KIRIKLAR (İLK AÇILAN SAYFA)                      */}
        {/* ========================================================= */}
        {activeTab === "kiriklar" && (
          <div>
            {/* Dinamik Sütun Rozetleri */}
            {brokenColumns.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-medium">Eklenen Sütunlar:</span>
                {brokenColumns.map((col) => (
                  <span
                    key={col.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-medium"
                  >
                    {col.column_name}
                    <button
                      onClick={() => handleDeleteColumn("depo_kiriklar", col.column_key)}
                      className="text-rose-400 hover:text-rose-700 ml-0.5"
                      title="Sütunu Sil"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {filteredBrokenRecords.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center my-6">
                <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Henüz Kırık Ürün Kaydı Yok
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Kırık veya hasarlı ürünlerin fotoğrafını çekip sebebini yazarak anında sisteme
                  kaydedebilirsiniz.
                </p>
                <button
                  onClick={openNewBrokenModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Fotoğraf Çek & Kırık Ekle</span>
                </button>
              </div>
            ) : (
              /* Kırıklar Görsel Galeri & Kart Izgarası */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBrokenRecords.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Görsel Alanı (Büyük ve Belirgin) */}
                    <div
                      className="relative w-full h-48 bg-slate-100 cursor-pointer group overflow-hidden"
                      onClick={() =>
                        setPreviewImage({
                          url: item.image_url,
                          title: item.product_name || item.reason,
                        })
                      }
                    >
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.reason}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <span className="text-xs">Görsel Yok</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-medium text-xs">
                        <Eye className="w-4 h-4" />
                        <span>Büyütmek için tıkla</span>
                      </div>
                      {/* Tarih Rozeti */}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/65 backdrop-blur-sm text-white rounded-lg text-[10px] font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-rose-300" />
                        {item.broken_date}
                      </div>
                    </div>

                    {/* Kart Gövdesi */}
                    <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {item.customer_name && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg mb-2">
                            <Building2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="truncate">{item.customer_name}</span>
                          </div>
                        )}
                        {item.product_name && (
                          <div className="text-xs font-bold text-slate-900 mb-1">
                            {item.product_name}
                          </div>
                        )}
                        <div className="text-xs sm:text-sm font-semibold text-rose-950 bg-rose-50/80 border border-rose-100 p-2.5 rounded-xl mb-3 leading-relaxed">
                          <div className="text-[10px] uppercase font-bold text-rose-600 tracking-wider mb-0.5">
                            Kırılma Sebebi
                          </div>
                          {item.reason}
                        </div>

                        {/* Ek Dinamik Sütunlar */}
                        {brokenColumns.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3 pt-2 border-t border-slate-100">
                            {brokenColumns.map((col) => (
                              <div key={col.id} className="bg-slate-50 p-2 rounded-lg">
                                <span className="text-[10px] text-slate-400 block font-medium">
                                  {col.column_name}
                                </span>
                                <input
                                  type="text"
                                  defaultValue={item.custom_fields?.[col.column_key] || ""}
                                  onBlur={(e) =>
                                    handleCellBlur(item.id, col.column_key, e.target.value)
                                  }
                                  placeholder="Değer giriniz"
                                  className="w-full text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-rose-500 rounded px-0.5"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Alt Bilgi & İşlemler */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1 truncate max-w-[160px]">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{item.reported_by || "Depo"}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditBrokenModal(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBroken(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SEKME: DEPO TESLİMİ                                     */}
        {/* ========================================================= */}
        {activeTab === "teslimat" && (
          <div>
            {/* Teslimat Türü Filtreleri (Depodan Alınan / Depoya Edilen) */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setDeliveryFilter("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  deliveryFilter === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Tümü ({deliveryRecords.length})
              </button>

              <button
                type="button"
                onClick={() => setDeliveryFilter("depodan_teslim_alinan")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  deliveryFilter === "depodan_teslim_alinan"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Depodan Teslim Alınan ({alinanCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryFilter("depoya_teslim_edilen")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  deliveryFilter === "depoya_teslim_edilen"
                    ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                    : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Depoya Teslim Edilen ({edilenCount})</span>
              </button>

              <div className="ml-auto hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openNewDeliveryModal("depodan_teslim_alinan")}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg"
                >
                  + Depodan Teslim Çıkışı
                </button>
                <button
                  type="button"
                  onClick={() => openNewDeliveryModal("depoya_teslim_edilen")}
                  className="px-2.5 py-1 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-lg"
                >
                  + Depoya Teslim Girişi
                </button>
              </div>
            </div>

            {/* Dinamik Sütun Rozetleri */}
            {deliveryColumns.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-medium">Eklenen Sütunlar:</span>
                {deliveryColumns.map((col) => (
                  <span
                    key={col.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium"
                  >
                    {col.column_name}
                    <button
                      onClick={() => handleDeleteColumn("depo_teslimi", col.column_key)}
                      className="text-indigo-400 hover:text-indigo-700 ml-0.5"
                      title="Sütunu Sil"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {filteredDeliveryRecords.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center my-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <PackageCheck className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Henüz Depo Teslimat Kaydı Yok
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Depodan müşteriye teslim alınan veya depoya teslim edilen fiş ve ürünleri anında
                  kaydedebilirsiniz.
                </p>
                <button
                  onClick={() => openNewDeliveryModal()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Teslimat Kaydı Ekle</span>
                </button>
              </div>
            ) : (
              /* Teslimatlar Tablosu / Listesi */
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                      <tr>
                        <th className="px-3 sm:px-4 py-3">Fiş / Görsel</th>
                        <th className="px-3 sm:px-4 py-3">İşlem Türü</th>
                        <th className="px-3 sm:px-4 py-3">Müşteri / Cari</th>
                        <th className="px-3 sm:px-4 py-3">Tarih</th>
                        <th className="px-3 sm:px-4 py-3">Teslim Eden</th>
                        {/* Dinamik Sütun Başlıkları */}
                        {deliveryColumns.map((col) => (
                          <th key={col.id} className="px-3 sm:px-4 py-3">
                            {col.column_name}
                          </th>
                        ))}
                        <th className="px-3 sm:px-4 py-3 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDeliveryRecords.map((item) => {
                        const isAlinan = item.delivery_type === "depodan_teslim_alinan";
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Fiş Görseli Thumbnail */}
                            <td className="px-3 sm:px-4 py-3">
                              {item.receipt_image_url ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: item.receipt_image_url!,
                                      title: `${item.customer_name} — Teslimat Fişi`,
                                    })
                                  }
                                  className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:scale-105 transition-transform group"
                                  title="Fişi Büyüt"
                                >
                                  <Image
                                    src={item.receipt_image_url}
                                    alt="Fiş"
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Eye className="w-3.5 h-3.5" />
                                  </div>
                                </button>
                              ) : (
                                <div className="w-12 h-12 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}
                            </td>

                            {/* İşlem Türü Rozeti */}
                            <td className="px-3 sm:px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  isAlinan
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-sky-50 text-sky-700 border border-sky-200"
                                }`}
                              >
                                {isAlinan ? (
                                  <>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Depodan Teslim Alınan</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-sky-600" />
                                    <span>Depoya Teslim Edilen</span>
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Müşteri / Cari Adı */}
                            <td className="px-3 sm:px-4 py-3">
                              <div className="font-bold text-slate-900">{item.customer_name}</div>
                              {item.notes && (
                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                  {item.notes}
                                </div>
                              )}
                            </td>

                            {/* Tarih */}
                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                              {item.delivery_date}
                            </td>

                            {/* Teslim Eden */}
                            <td className="px-3 sm:px-4 py-3 text-slate-700">
                              <div className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.delivered_by || "Depo"}</span>
                              </div>
                            </td>

                            {/* Dinamik Sütun Hücreleri */}
                            {deliveryColumns.map((col) => (
                              <td key={col.id} className="px-3 sm:px-4 py-3">
                                <input
                                  type="text"
                                  defaultValue={item.custom_fields?.[col.column_key] || ""}
                                  onBlur={(e) =>
                                    handleCellBlur(item.id, col.column_key, e.target.value)
                                  }
                                  placeholder="—"
                                  className="w-full text-xs text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded px-1.5 py-1 transition-all"
                                />
                              </td>
                            ))}

                            {/* İşlemler */}
                            <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => openEditDeliveryModal(item)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Düzenle"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDelivery(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: KIRIK ÜRÜN BİLDİR / DÜZENLE                       */}
      {/* ========================================================= */}
      {isBrokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {editingBroken ? "Kırık Kaydını Düzenle" : "Yeni Kırık Ürün Bildir"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hasarlı ürün fotoğrafı ve sebebi kaydedilir
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBrokenModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Gövdesi */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Fotoğraf Yükleme / Kamera Çekimi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kırık / Hasar Görseli *
                </label>
                {brokenForm.image_url ? (
                  <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                    <Image
                      src={brokenForm.image_url}
                      alt="Kırık Görseli"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setBrokenForm((prev) => ({ ...prev, image_url: "" }))}
                        className="p-1.5 bg-rose-600 text-white rounded-xl shadow-md hover:bg-rose-700"
                        title="Görseli Kaldır"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-rose-300 rounded-2xl bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-colors p-4 text-center">
                    {uploadingBrokenImg ? (
                      <div className="flex flex-col items-center gap-2 text-rose-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-semibold">Görsel yükleniyor...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white text-rose-500 rounded-2xl flex items-center justify-center shadow-sm mb-2">
                          <Camera className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          Kamerayı Aç / Fotoğraf Çek veya Seç
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">
                          Mobilde doğrudan arka kamera ile fotoğraf çekebilirsiniz
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleBrokenImageUpload}
                      disabled={uploadingBrokenImg}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* MÜŞTERİ SEÇİMİ (Listeden Seç veya Manuel Yaz) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Müşteri / Firma (İsteğe Bağlı)</label>
                  <span className="text-[11px] text-rose-600 font-medium">
                    Listeden seçin veya manuel yazın
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Müşteri adı arayın veya serbest yazınız..."
                  value={brokenForm.customer_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBrokenForm((prev) => ({ ...prev, customer_name: val, customer_id: "" }));
                    setBrokenCustomerSearch(val);
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />

                {/* Müşteri Öneri Açılır Listesi */}
                {brokenCustomerSearch && filteredBrokenCustomers.length > 0 && (
                  <div className="mt-1 max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 z-20">
                    {filteredBrokenCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setBrokenForm((prev) => ({
                            ...prev,
                            customer_id: c.id,
                            customer_name: c.name,
                          }));
                          setBrokenCustomerSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        {c.phone && <span className="text-[10px] text-slate-400">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kırılma Sebebi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kırılma / Hasar Sebebi *
                </label>
                <textarea
                  rows={3}
                  placeholder="Kırılma sebebini detaylıca yazınız (örn: İndirme esnasında palet kayması, sevkiyatta çarpma, hatalı fabrika ambalajı...)"
                  value={brokenForm.reason}
                  onChange={(e) => setBrokenForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              {/* Ürün Adı & Tarih */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ürün Adı / Kodu (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    placeholder="örn: 60x120 Parlak Granit"
                    value={brokenForm.product_name}
                    onChange={(e) =>
                      setBrokenForm((prev) => ({ ...prev, product_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tarih</label>
                  <input
                    type="date"
                    value={brokenForm.broken_date}
                    onChange={(e) =>
                      setBrokenForm((prev) => ({ ...prev, broken_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Bildiren Personel */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bildiren Personel
                </label>
                <input
                  type="text"
                  value={brokenForm.reported_by}
                  onChange={(e) =>
                    setBrokenForm((prev) => ({ ...prev, reported_by: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              {/* Dinamik Sütun Alanları */}
              {brokenColumns.map((col) => (
                <div key={col.id}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {col.column_name}
                  </label>
                  <input
                    type="text"
                    value={brokenForm.custom_fields?.[col.column_key] || ""}
                    onChange={(e) =>
                      setBrokenForm((prev) => ({
                        ...prev,
                        custom_fields: {
                          ...prev.custom_fields,
                          [col.column_key]: e.target.value,
                        },
                      }))
                    }
                    placeholder={`${col.column_name} giriniz`}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsBrokenModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isPending || uploadingBrokenImg}
                onClick={handleSaveBroken}
                className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingBroken ? "Güncelle" : "Kırık Kaydını Kaydet"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DEPO TESLİMATI EKLE / DÜZENLE                    */}
      {/* ========================================================= */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {editingDelivery ? "Teslimat Kaydını Düzenle" : "Yeni Depo Teslimatı Ekle"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Depodan teslim alınan veya depoya teslim edilen fiş/ürün kaydı
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeliveryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gövde */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* İŞLEM TÜRÜ: Depodan Teslim Alınan vs Depoya Teslim Edilen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Teslimat & Görsel Türü *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryForm((prev) => ({
                        ...prev,
                        delivery_type: "depodan_teslim_alinan",
                      }))
                    }
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                      deliveryForm.delivery_type === "depodan_teslim_alinan"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                    <span>Depodan Teslim Alınan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryForm((prev) => ({
                        ...prev,
                        delivery_type: "depoya_teslim_edilen",
                      }))
                    }
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                      deliveryForm.delivery_type === "depoya_teslim_edilen"
                        ? "bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 shrink-0" />
                    <span>Depoya Teslim Edilen</span>
                  </button>
                </div>
              </div>

              {/* MÜŞTERİ SEÇİMİ (Kendi Listemizden Seç veya Manuel Yaz) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Müşteri / Cari İsmi *</label>
                  <span className="text-[11px] text-indigo-600 font-medium">
                    Listeden seçin veya manuel yazın
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Müşteri adı arayın veya serbest yazınız..."
                  value={deliveryForm.customer_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDeliveryForm((prev) => ({ ...prev, customer_name: val, customer_id: "" }));
                    setCustomerSearch(val);
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />

                {/* Müşteri Öneri Açılır Listesi */}
                {customerSearch && filteredCustomers.length > 0 && (
                  <div className="mt-1 max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 z-20">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setDeliveryForm((prev) => ({
                            ...prev,
                            customer_id: c.id,
                            customer_name: c.name,
                          }));
                          setCustomerSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        {c.phone && <span className="text-[10px] text-slate-400">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tarih & Teslim Eden */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Teslim Tarihi
                  </label>
                  <input
                    type="date"
                    value={deliveryForm.delivery_date}
                    onChange={(e) =>
                      setDeliveryForm((prev) => ({ ...prev, delivery_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Teslim Eden / Alan
                  </label>
                  <input
                    type="text"
                    value={deliveryForm.delivered_by}
                    onChange={(e) =>
                      setDeliveryForm((prev) => ({ ...prev, delivered_by: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* GİDEN FİŞ / TESLİMAT GÖRSELİ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {deliveryForm.delivery_type === "depodan_teslim_alinan"
                    ? "Depodan Teslim Alınan Fiş / Ürün Görseli"
                    : "Depoya Teslim Edilen Fiş / Ürün Görseli"}
                </label>
                {deliveryForm.receipt_image_url ? (
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                    <Image
                      src={deliveryForm.receipt_image_url}
                      alt="Fiş Görseli"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDeliveryForm((prev) => ({ ...prev, receipt_image_url: "" }))
                        }
                        className="p-1.5 bg-rose-600 text-white rounded-xl shadow-md hover:bg-rose-700"
                        title="Görseli Kaldır"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 hover:bg-indigo-50 cursor-pointer transition-colors p-4 text-center">
                    {uploadingDeliveryImg ? (
                      <div className="flex flex-col items-center gap-2 text-indigo-600">
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="text-xs font-semibold">Görsel yükleniyor...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-white text-indigo-600 rounded-xl flex items-center justify-center shadow-sm mb-1.5">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          Fiş Fotoğrafı Çek veya Seç
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          Teslim fişi, sevk irsaliyesi veya ürün fotoğrafı
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleDeliveryImageUpload}
                      disabled={uploadingDeliveryImg}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Notlar / Açıklama
                </label>
                <textarea
                  rows={2}
                  placeholder="İrsaliye no, koli sayısı, plaka veya genel not..."
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Dinamik Sütun Alanları */}
              {deliveryColumns.map((col) => (
                <div key={col.id}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {col.column_name}
                  </label>
                  <input
                    type="text"
                    value={deliveryForm.custom_fields?.[col.column_key] || ""}
                    onChange={(e) =>
                      setDeliveryForm((prev) => ({
                        ...prev,
                        custom_fields: {
                          ...prev.custom_fields,
                          [col.column_key]: e.target.value,
                        },
                      }))
                    }
                    placeholder={`${col.column_name} giriniz`}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isPending || uploadingDeliveryImg}
                onClick={handleSaveDelivery}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingDelivery ? "Güncelle" : "Teslimatı Kaydet"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DİNAMİK SÜTUN EKLE                                */}
      {/* ========================================================= */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Columns className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {activeTab === "kiriklar"
                    ? "Kırıklar İçin Yeni Sütun"
                    : "Depo Teslimi İçin Yeni Sütun"}
                </h3>
              </div>
              <button
                onClick={() => setIsColumnModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sütun Başlığı *
                </label>
                <input
                  type="text"
                  placeholder="örn: Tarih, Plaka, Sorumlu, Tutar..."
                  value={columnForm.name}
                  onChange={(e) => setColumnForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Veri Tipi</label>
                <select
                  value={columnForm.type}
                  onChange={(e) => setColumnForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="text">Metin / Açıklama</option>
                  <option value="number">Sayı / Tutar</option>
                  <option value="date">Tarih</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAddColumn}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                {isPending ? "Ekleniyor..." : "Sütunu Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: FOTOĞRAF LIGHTBOX (TAM EKRAN ÖNİZLEME)            */}
      {/* ========================================================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Üst Bar */}
            <div className="w-full flex items-center justify-between text-white pb-3 px-2">
              <span className="text-xs sm:text-sm font-semibold truncate max-w-md">
                {previewImage.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                  title="Yeni sekmede aç"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                  title="Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Görsel */}
            <div className="relative w-full h-[70vh] sm:h-[80vh] rounded-2xl overflow-hidden border border-white/10 bg-black/50">
              <Image
                src={previewImage.url}
                alt={previewImage.title}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
