"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
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
  UploadCloud,
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
  quickAddPhotoToDelivery,
  quickAddPhotoToBroken,
} from "./actions";

function sortImagesNewestFirst(images: string[] = []): string[] {
  if (!images || images.length <= 1) return images || [];
  return [...images].sort((a, b) => {
    const matchA = a.match(/[/_](\d{10,14})_/);
    const matchB = b.match(/[/_](\d{10,14})_/);
    if (matchA && matchB) {
      return Number(matchB[1]) - Number(matchA[1]);
    }
    return 0;
  });
}

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
  // 1. Sekme: "teslimat" (varsayılan) | "kiriklar"
  const [activeTab, setActiveTab] = useState<"teslimat" | "kiriklar">("teslimat");

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
    images: [] as string[],
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
    activeSection: "depoya_teslim_edilen" as DeliveryType,
    customer_id: "",
    customer_name: "",
    // Depoya Teslim Edilen (Giriş)
    received_date: new Date().toISOString().slice(0, 10),
    received_by: userName || "Depo Sorumlusu",
    received_image_url: "",
    received_images: [] as string[],
    // Depodan Teslim Alınan (Çıkış)
    delivered_date: new Date().toISOString().slice(0, 10),
    delivered_by: userName || "Depo Sorumlusu",
    delivered_image_url: "",
    delivered_images: [] as string[],
    notes: "",
    custom_fields: {} as Record<string, any>,
  });
  const [uploadingDeliveryImg, setUploadingDeliveryImg] = useState(false);

  // Hızlı Fotoğraf Ekleme Modalı (Mobilde tek tıkla fotoğraf çekip kaydetme)
  const [quickPhotoRecord, setQuickPhotoRecord] = useState<{
    id: string;
    customer_name: string;
    type: "received" | "delivered";
  } | null>(null);
  const [uploadingQuickPhoto, setUploadingQuickPhoto] = useState(false);

  // Hızlı Kırık Fotoğrafı Ekleme
  const [quickBrokenPhotoId, setQuickBrokenPhotoId] = useState<string | null>(null);
  const [uploadingQuickBrokenPhoto, setUploadingQuickBrokenPhoto] = useState(false);

  // Sütun Ekleme Modalı
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [columnForm, setColumnForm] = useState({
    name: "",
    type: "text",
  });

  // Müşteri seçimi filtreleme
  const [customerSearch, setCustomerSearch] = useState("");

  // Yardımcı Fonksiyonlar: Tip Eşleme (Kayıtların birbirine sızmasını önler)
  const isDepoyaRecord = (r: WarehouseDeliveryRecord) => {
    if (r.delivery_type === "depoya_teslim_edilen") return true;
    if (r.received_images && r.received_images.length > 0) return true;
    if (r.received_image_url) return true;
    if (r.received_date && r.delivery_type !== "depodan_teslim_alinan") return true;
    return false;
  };

  const isDepodanRecord = (r: WarehouseDeliveryRecord) => {
    if (r.delivery_type === "depodan_teslim_alinan") return true;
    if (r.delivered_images && r.delivered_images.length > 0) return true;
    if (r.delivered_image_url) return true;
    if (r.delivered_date && r.delivery_type !== "depoya_teslim_edilen") return true;
    return false;
  };

  // -------------------------------------------------------------
  // Filtrelenmiş Kırıklar (EN YENİDEN ESKİYE)
  // -------------------------------------------------------------
  const filteredBrokenRecords = useMemo(() => {
    let list = [...brokenRecords];
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

    // Sıralama EN YENİDEN ESKİYE (Newest First)
    list.sort((a, b) => {
      const timeA = new Date(a.created_at || a.broken_date || 0).getTime();
      const timeB = new Date(b.created_at || b.broken_date || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [brokenRecords, searchQuery]);

  // -------------------------------------------------------------
  // Filtrelenmiş Teslimatlar (EN YENİDEN ESKİYE)
  // -------------------------------------------------------------
  const filteredDeliveryRecords = useMemo(() => {
    let list = [...deliveryRecords];
    if (deliveryFilter === "depoya_teslim_edilen") {
      list = list.filter(isDepoyaRecord);
    } else if (deliveryFilter === "depodan_teslim_alinan") {
      list = list.filter(isDepodanRecord);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const inCust = r.customer_name?.toLowerCase().includes(q);
        const inDeliveredBy = r.delivered_by?.toLowerCase().includes(q);
        const inReceivedBy = r.received_by?.toLowerCase().includes(q);
        const inDeliveredDate = r.delivered_date?.includes(q);
        const inReceivedDate = r.received_date?.includes(q);
        const inLegacyDate = r.delivery_date?.includes(q);
        const inNotes = r.notes?.toLowerCase().includes(q);
        const inCustom = Object.values(r.custom_fields || {}).some((v) =>
          String(v).toLowerCase().includes(q)
        );
        return (
          inCust ||
          inDeliveredBy ||
          inReceivedBy ||
          inDeliveredDate ||
          inReceivedDate ||
          inLegacyDate ||
          inNotes ||
          inCustom
        );
      });
    }

    // Sıralama EN YENİDEN ESKİYE (Newest First)
    list.sort((a, b) => {
      const timeA = new Date(a.created_at || a.received_date || a.delivered_date || 0).getTime();
      const timeB = new Date(b.created_at || b.received_date || b.delivered_date || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [deliveryRecords, deliveryFilter, searchQuery]);

  // Sayaçlar (Depoya Teslim Edilen önce, Depodan Teslim Alınan sonra)
  const edilenCount = useMemo(
    () => deliveryRecords.filter(isDepoyaRecord).length,
    [deliveryRecords]
  );
  const alinanCount = useMemo(
    () => deliveryRecords.filter(isDepodanRecord).length,
    [deliveryRecords]
  );

  // -------------------------------------------------------------
  // Çoklu Fotoğraf Yükleme İşleyicileri
  // -------------------------------------------------------------
  const handleBrokenImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingBrokenImg(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadToStorage("shipment-photos", files[i], "depo-kiriklar");
        if (res.success && res.url) {
          newUrls.push(res.url);
        }
      }
      if (newUrls.length > 0) {
        setBrokenForm((prev) => {
          const combined = sortImagesNewestFirst([...newUrls, ...(prev.images || [])]);
          return {
            ...prev,
            images: combined,
            image_url: combined[0] || "",
          };
        });
        toast.success(`${newUrls.length} fotoğraf eklendi!`);
      }
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setUploadingBrokenImg(false);
      e.target.value = "";
    }
  };

  const handleDeliveryImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "received" | "delivered"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingDeliveryImg(true);
    try {
      const folder = target === "received" ? "depo-teslim-edilen" : "depo-teslim-alinan";
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadToStorage("shipment-photos", files[i], folder);
        if (res.success && res.url) {
          newUrls.push(res.url);
        }
      }
      if (newUrls.length > 0) {
        if (target === "received") {
          setDeliveryForm((prev) => {
            const combined = sortImagesNewestFirst([...newUrls, ...(prev.received_images || [])]);
            return {
              ...prev,
              received_images: combined,
              received_image_url: combined[0] || "",
            };
          });
        } else {
          setDeliveryForm((prev) => {
            const combined = sortImagesNewestFirst([...newUrls, ...(prev.delivered_images || [])]);
            return {
              ...prev,
              delivered_images: combined,
              delivered_image_url: combined[0] || "",
            };
          });
        }
        toast.success(`${newUrls.length} fotoğraf eklendi!`);
      }
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setUploadingDeliveryImg(false);
      e.target.value = "";
    }
  };

  // Kart üzerinden tek tıkla Hızlı Fotoğraf Yükleme
  const handleQuickPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!quickPhotoRecord) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingQuickPhoto(true);
    try {
      const folder =
        quickPhotoRecord.type === "received" ? "depo-teslim-edilen" : "depo-teslim-alinan";
      let addedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const res = await uploadToStorage("shipment-photos", files[i], folder);
        if (res.success && res.url) {
          await quickAddPhotoToDelivery(
            quickPhotoRecord.id,
            quickPhotoRecord.type,
            res.url,
            userName
          );
          // Anında yerel state güncelle
          setDeliveryRecords((prev) =>
            prev.map((rec) => {
              if (rec.id !== quickPhotoRecord.id) return rec;
              const isRec = quickPhotoRecord.type === "received";
              const curList = isRec
                ? rec.received_images || (rec.received_image_url ? [rec.received_image_url] : [])
                : rec.delivered_images || (rec.delivered_image_url ? [rec.delivered_image_url] : []);
              const nextList = sortImagesNewestFirst([res.url!, ...curList]);
              return {
                ...rec,
                ...(isRec
                  ? { received_images: nextList, received_image_url: nextList[0] || "" }
                  : { delivered_images: nextList, delivered_image_url: nextList[0] || "" }),
              };
            })
          );
          addedCount++;
        }
      }
      if (addedCount > 0) {
        toast.success(`${addedCount} yeni fotoğraf başarıyla kaydedildi!`);
      }
      setQuickPhotoRecord(null);
    } catch (err: any) {
      toast.error("Fotoğraf kaydedilemedi: " + err.message);
    } finally {
      setUploadingQuickPhoto(false);
      e.target.value = "";
    }
  };

  // Kırıklar için kart üzerinden tek tıkla Hızlı Fotoğraf Ekleme
  const handleQuickBrokenPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!quickBrokenPhotoId) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingQuickBrokenPhoto(true);
    try {
      let addedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const res = await uploadToStorage("shipment-photos", files[i], "depo-kiriklar");
        if (res.success && res.url) {
          await quickAddPhotoToBroken(quickBrokenPhotoId, res.url);
          setBrokenRecords((prev) =>
            prev.map((rec) => {
              if (rec.id !== quickBrokenPhotoId) return rec;
              const curList = rec.images || (rec.image_url ? [rec.image_url] : []);
              const nextList = sortImagesNewestFirst([res.url!, ...curList]);
              return {
                ...rec,
                images: nextList,
                image_url: nextList[0] || "",
              };
            })
          );
          addedCount++;
        }
      }
      if (addedCount > 0) {
        toast.success(`${addedCount} yeni kırık fotoğrafı kaydedildi!`);
      }
      setQuickBrokenPhotoId(null);
    } catch (err: any) {
      toast.error("Fotoğraf kaydedilemedi: " + err.message);
    } finally {
      setUploadingQuickBrokenPhoto(false);
      e.target.value = "";
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
      images: [],
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
    const imgList = r.images && r.images.length > 0 ? r.images : r.image_url ? [r.image_url] : [];
    setBrokenForm({
      image_url: r.image_url || imgList[0] || "",
      images: imgList,
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

  const handleSaveBroken = async (saveAndNew: boolean = false) => {
    const primaryImg = brokenForm.images[0] || brokenForm.image_url;
    if (!primaryImg) {
      toast.error("Lütfen en az bir kırık / hasar fotoğrafı yükleyiniz.");
      return;
    }
    if (!brokenForm.reason.trim()) {
      toast.error("Lütfen kırılma sebebini yazınız.");
      return;
    }

    startTransition(async () => {
      const res = await saveBrokenRecord({
        id: editingBroken?.id,
        image_url: primaryImg,
        images: brokenForm.images.length > 0 ? brokenForm.images : [primaryImg],
        reason: brokenForm.reason,
        broken_date: brokenForm.broken_date,
        customer_id: brokenForm.customer_id || undefined,
        customer_name: brokenForm.customer_name || undefined,
        product_name: brokenForm.product_name || undefined,
        reported_by: brokenForm.reported_by || undefined,
        notes: brokenForm.notes || undefined,
        custom_fields: brokenForm.custom_fields,
      });

      if (res.success) {
        toast.success(editingBroken ? "Kırık kaydı güncellendi!" : "Yeni kırık kaydı eklendi!");
        if (editingBroken) {
          setBrokenRecords((prev) =>
            prev.map((r) =>
              r.id === editingBroken.id
                ? {
                    ...r,
                    image_url: primaryImg,
                    images: brokenForm.images,
                    reason: brokenForm.reason,
                    broken_date: brokenForm.broken_date,
                    customer_id: brokenForm.customer_id || undefined,
                    customer_name: brokenForm.customer_name || undefined,
                    product_name: brokenForm.product_name || undefined,
                    reported_by: brokenForm.reported_by || undefined,
                    notes: brokenForm.notes || undefined,
                    custom_fields: brokenForm.custom_fields,
                  }
                : r
            )
          );
        } else if (res.data) {
          const newRow: WarehouseBrokenRecord = {
            id: res.data.id,
            image_url: primaryImg,
            images: brokenForm.images,
            reason: brokenForm.reason,
            broken_date: brokenForm.broken_date,
            customer_id: brokenForm.customer_id || undefined,
            customer_name: brokenForm.customer_name || undefined,
            product_name: brokenForm.product_name || undefined,
            reported_by: brokenForm.reported_by || undefined,
            notes: brokenForm.notes || undefined,
            custom_fields: brokenForm.custom_fields,
            created_at: new Date().toISOString(),
          };
          setBrokenRecords((prev) => [newRow, ...prev]);
        }
        if (saveAndNew) {
          openNewBrokenModal();
        } else {
          setIsBrokenModalOpen(false);
        }
      } else {
        toast.error("Hata oluştu: " + res.error);
      }
    });
  };

  const handleDeleteBroken = async (id: string) => {
    if (!confirm("Bu kırık ürün kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteBrokenRecord(id);
      if (res.success) {
        setBrokenRecords((prev) => prev.filter((r) => r.id !== id));
        toast.success("Kırık kaydı silindi.");
      } else {
        toast.error("Silinemedi: " + res.error);
      }
    });
  };

  // -------------------------------------------------------------
  // Teslimat Modal Aç / Kaydet / Sil
  // -------------------------------------------------------------
  const openNewDeliveryModal = (defaultType?: DeliveryType) => {
    setEditingDelivery(null);
    setCustomerSearch("");
    const today = new Date().toISOString().slice(0, 10);
    const chosenType = defaultType || "depoya_teslim_edilen";
    const isEdilen = chosenType === "depoya_teslim_edilen";

    setDeliveryForm({
      activeSection: chosenType,
      customer_id: "",
      customer_name: "",
      received_date: isEdilen ? today : "",
      received_by: isEdilen ? (userName || "Depo Sorumlusu") : "",
      received_image_url: "",
      received_images: [],
      delivered_date: !isEdilen ? today : "",
      delivered_by: !isEdilen ? (userName || "Depo Sorumlusu") : "",
      delivered_image_url: "",
      delivered_images: [],
      notes: "",
      custom_fields: {},
    });
    setIsDeliveryModalOpen(true);
  };

  const openEditDeliveryModal = (r: WarehouseDeliveryRecord) => {
    setEditingDelivery(r);
    setCustomerSearch(r.customer_name);
    const today = new Date().toISOString().slice(0, 10);
    const recImgs = sortImagesNewestFirst(
      r.received_images && r.received_images.length > 0
        ? r.received_images
        : r.received_image_url
        ? [r.received_image_url]
        : []
    );
    const delImgs = sortImagesNewestFirst(
      r.delivered_images && r.delivered_images.length > 0
        ? r.delivered_images
        : r.delivered_image_url
        ? [r.delivered_image_url]
        : []
    );

    const isEdilen = r.delivery_type
      ? r.delivery_type === "depoya_teslim_edilen"
      : recImgs.length > 0 || !delImgs.length;

    setDeliveryForm({
      activeSection: isEdilen ? "depoya_teslim_edilen" : "depodan_teslim_alinan",
      customer_id: r.customer_id || "",
      customer_name: r.customer_name,
      received_date: r.received_date || (isEdilen ? today : ""),
      received_by: r.received_by || (isEdilen ? (userName || "Depo Sorumlusu") : ""),
      received_image_url: recImgs[0] || "",
      received_images: recImgs,
      delivered_date: r.delivered_date || (!isEdilen ? today : ""),
      delivered_by: r.delivered_by || (!isEdilen ? (userName || "Depo Sorumlusu") : ""),
      delivered_image_url: delImgs[0] || "",
      delivered_images: delImgs,
      notes: r.notes || "",
      custom_fields: { ...(r.custom_fields || {}) },
    });
    setIsDeliveryModalOpen(true);
  };

  const handleSaveDelivery = async (saveAndNew: boolean = false) => {
    if (!deliveryForm.customer_name.trim()) {
      toast.error("Lütfen müşteri / firma adını giriniz veya seçiniz.");
      return;
    }

    startTransition(async () => {
      const isEdilen = deliveryForm.activeSection === "depoya_teslim_edilen";
      const recImgs = sortImagesNewestFirst(deliveryForm.received_images);
      const delImgs = sortImagesNewestFirst(deliveryForm.delivered_images);
      const recPrimary = recImgs[0] || deliveryForm.received_image_url || "";
      const delPrimary = delImgs[0] || deliveryForm.delivered_image_url || "";

      const res = await saveDeliveryRecord({
        id: editingDelivery?.id,
        delivery_type: deliveryForm.activeSection,
        customer_id: deliveryForm.customer_id || undefined,
        customer_name: deliveryForm.customer_name.trim(),
        received_date: deliveryForm.received_date,
        received_by: deliveryForm.received_by,
        received_image_url: recPrimary,
        received_images: recImgs,
        delivered_date: deliveryForm.delivered_date,
        delivered_by: deliveryForm.delivered_by,
        delivered_image_url: delPrimary,
        delivered_images: delImgs,
        notes: deliveryForm.notes,
        custom_fields: deliveryForm.custom_fields,
      });

      if (res.success) {
        toast.success(editingDelivery ? "Teslimat kaydı güncellendi!" : "Yeni teslimat eklendi!");
        if (editingDelivery) {
          setDeliveryRecords((prev) =>
            prev.map((r) =>
              r.id === editingDelivery.id
                ? {
                    ...r,
                    delivery_type: deliveryForm.activeSection,
                    customer_id: deliveryForm.customer_id || undefined,
                    customer_name: deliveryForm.customer_name,
                    received_date: deliveryForm.received_date,
                    received_by: deliveryForm.received_by,
                    received_image_url: recPrimary,
                    received_images: recImgs,
                    delivered_date: deliveryForm.delivered_date,
                    delivered_by: deliveryForm.delivered_by,
                    delivered_image_url: delPrimary,
                    delivered_images: delImgs,
                    delivery_date:
                      (isEdilen ? deliveryForm.received_date : deliveryForm.delivered_date) ||
                      r.delivery_date,
                    receipt_image_url: isEdilen ? recPrimary : delPrimary,
                    notes: deliveryForm.notes,
                    custom_fields: deliveryForm.custom_fields,
                  }
                : r
            )
          );
        } else if (res.data) {
          const newRow: WarehouseDeliveryRecord = {
            id: res.data.id,
            delivery_type: deliveryForm.activeSection,
            customer_id: deliveryForm.customer_id || undefined,
            customer_name: deliveryForm.customer_name,
            received_date: deliveryForm.received_date,
            received_by: deliveryForm.received_by,
            received_image_url: recPrimary,
            received_images: recImgs,
            delivered_date: deliveryForm.delivered_date,
            delivered_by: deliveryForm.delivered_by,
            delivered_image_url: delPrimary,
            delivered_images: delImgs,
            delivery_date: isEdilen ? deliveryForm.received_date : deliveryForm.delivered_date,
            receipt_image_url: isEdilen ? recPrimary : delPrimary,
            notes: deliveryForm.notes,
            custom_fields: deliveryForm.custom_fields,
            created_at: new Date().toISOString(),
          };
          setDeliveryRecords((prev) => [newRow, ...prev]);
        }

        if (saveAndNew) {
          openNewDeliveryModal(deliveryForm.activeSection);
        } else {
          setIsDeliveryModalOpen(false);
        }
      } else {
        toast.error("Hata: " + res.error);
      }
    });
  };

  const handleDeleteDelivery = async (id: string) => {
    if (!confirm("Bu teslimat kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteDeliveryRecord(id);
      if (res.success) {
        setDeliveryRecords((prev) => prev.filter((r) => r.id !== id));
        toast.success("Teslimat kaydı silindi.");
      } else {
        toast.error("Silinemedi: " + res.error);
      }
    });
  };

  // -------------------------------------------------------------
  // Dinamik Sütun Ekle / Sil / Hücre Güncelle
  // -------------------------------------------------------------
  const handleAddColumn = async () => {
    if (!columnForm.name.trim()) {
      toast.error("Lütfen sütun adını yazınız.");
      return;
    }
    const tableId = activeTab === "kiriklar" ? "depo_kiriklar" : "depo_teslimi";
    startTransition(async () => {
      const res = await addWarehouseCustomColumn(tableId, columnForm.name, columnForm.type);
      if (res.success && res.column) {
        if (activeTab === "kiriklar") {
          setBrokenColumns((prev) => [...prev, res.column!]);
        } else {
          setDeliveryColumns((prev) => [...prev, res.column!]);
        }
        setIsColumnModalOpen(false);
        setColumnForm({ name: "", type: "text" });
        toast.success("Yeni sütun eklendi!");
      } else {
        toast.error("Sütun eklenemedi: " + res.error);
      }
    });
  };

  const handleDeleteColumn = async (columnKey: string) => {
    if (!confirm("Bu sütunu silmek istediğinize emin misiniz?")) return;
    const tableId = activeTab === "kiriklar" ? "depo_kiriklar" : "depo_teslimi";
    startTransition(async () => {
      const res = await deleteWarehouseCustomColumn(tableId, columnKey);
      if (res.success) {
        if (activeTab === "kiriklar") {
          setBrokenColumns((prev) => prev.filter((c) => c.column_key !== columnKey));
        } else {
          setDeliveryColumns((prev) => prev.filter((c) => c.column_key !== columnKey));
        }
        toast.success("Sütun silindi.");
      } else {
        toast.error("Silinemedi: " + res.error);
      }
    });
  };

  const handleCellBlur = (rowId: string, columnKey: string, value: string) => {
    startTransition(async () => {
      await updateWarehouseCell(rowId, columnKey, value);
    });
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
    <div className="min-h-screen bg-slate-50/70 pb-24 w-full max-w-full overflow-x-hidden">
      {/* ========================================================= */}
      {/* MOBIL & DESKTOP STICKY TOP TAB BAR                         */}
      {/* ========================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 sm:py-3 gap-2">
            {/* Başlık */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  Depo Takip
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
                  Depo teslimatları (giriş/çıkış) ve kırık / hasarlı ürün yönetimi
                </p>
              </div>

              {/* Hızlı Aksiyon Butonu (Mobilde de en üstte) */}
              <div className="sm:hidden flex items-center gap-1.5">
                {activeTab === "teslimat" ? (
                  <button
                    onClick={() => openNewDeliveryModal("depoya_teslim_edilen")}
                    className="flex items-center gap-1 px-3 py-2 bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    + Teslimat
                  </button>
                ) : (
                  <button
                    onClick={openNewBrokenModal}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-600 active:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    + Kırık Ekle
                  </button>
                )}
              </div>
            </div>

            {/* ANA 2 SEKME (1. DEPO TESLİMİ, 2. KIRIKLAR) */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto shadow-inner gap-1">
              {/* 1. SEKME: DEPO TESLİMİ (İLK / VARSAYILAN) */}
              <button
                type="button"
                onClick={() => setActiveTab("teslimat")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  activeTab === "teslimat"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <PackageCheck className="w-4 h-4 shrink-0" />
                <span>1. Depo Teslimi</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "teslimat" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {deliveryRecords.length}
                </span>
              </button>

              {/* 2. SEKME: KIRIKLAR & GÖRSELLER */}
              <button
                type="button"
                onClick={() => setActiveTab("kiriklar")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  activeTab === "kiriklar"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>2. Kırıklar</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === "kiriklar" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {brokenRecords.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* İÇERİK ALANI                                              */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-3 sm:mt-5">
        {/* Arama & Aksiyonlar Araç Çubuğu */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Arama Kutusu */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === "teslimat"
                    ? "Müşteri adı, teslim eden, tarih veya not ara..."
                    : "Kırık sebebi, müşteri, ürün veya bildiren ara..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Masaüstü Aksiyon Butonları */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
              >
                <Columns className="w-4 h-4 text-slate-500" />
                <span>+ Sütun Ekle</span>
              </button>

              {activeTab === "teslimat" ? (
                <>
                  <button
                    type="button"
                    onClick={() => openNewDeliveryModal("depoya_teslim_edilen")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>+ Depoya Teslim Girişi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openNewDeliveryModal("depodan_teslim_alinan")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+ Depodan Teslim Çıkışı</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openNewBrokenModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Yeni Kırık Ürün Bildir</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 1. SEKME: DEPO TESLİMİ                                     */}
        {/* ========================================================= */}
        {activeTab === "teslimat" && (
          <div className="space-y-3">
            {/* Teslimat Türü Filtreleri (Mobilde yatay kaydırılabilir) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setDeliveryFilter("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                  deliveryFilter === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Tümü ({deliveryRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter("depoya_teslim_edilen")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                  deliveryFilter === "depoya_teslim_edilen"
                    ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                    : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Depoya Teslim Edilen ({edilenCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter("depodan_teslim_alinan")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                  deliveryFilter === "depodan_teslim_alinan"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Depodan Teslim Alınan ({alinanCount})</span>
              </button>
            </div>

            {/* Boş Durum */}
            {filteredDeliveryRecords.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <PackageCheck className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">
                  Kayıtlı Depo Teslimatı Bulunamadı
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Depoya gelen ürünlerin fişini veya depodan müşteriye çıkan ürünlerin teslimatını
                  kaydedebilirsiniz.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => openNewDeliveryModal("depoya_teslim_edilen")}
                    className="px-4 py-2.5 bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    + Depoya Teslim Girişi
                  </button>
                  <button
                    onClick={() => openNewDeliveryModal("depodan_teslim_alinan")}
                    className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    + Depodan Teslim Çıkışı
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* --------------------------------------------------------- */}
                {/* MOBİL KART GÖRÜNÜMÜ (md:hidden - Ekranı Aşmaz, Tam Sığar) */}
                {/* --------------------------------------------------------- */}
                <div className="block md:hidden space-y-3">
                  {filteredDeliveryRecords.map((item) => {
                    const receivedImgs = sortImagesNewestFirst(
                      item.received_images && item.received_images.length > 0
                        ? item.received_images
                        : item.received_image_url
                        ? [item.received_image_url]
                        : []
                    );
                    const deliveredImgs = sortImagesNewestFirst(
                      item.delivered_images && item.delivered_images.length > 0
                        ? item.delivered_images
                        : item.delivered_image_url
                        ? [item.delivered_image_url]
                        : []
                    );

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs space-y-3"
                      >
                        {/* Başlık: Müşteri Adı & İşlem Butonları */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                              Müşteri / Cari
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {item.customer_name || "İsimsiz Müşteri"}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditDeliveryModal(item)}
                              className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                              title="Düzenle"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDelivery(item.id)}
                              className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* 1. Depoya Teslim (Giriş) Bölümü */}
                        <div className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-950 flex items-center gap-1">
                              <ArrowDownLeft className="w-3.5 h-3.5 text-sky-600" />
                              1. Depoya Teslim (Giriş)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setQuickPhotoRecord({
                                  id: item.id,
                                  customer_name: item.customer_name,
                                  type: "received",
                                })
                              }
                              className="text-[10px] font-bold text-sky-700 bg-white border border-sky-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs hover:bg-sky-50 active:scale-95 transition"
                            >
                              <Camera className="w-3 h-3 text-sky-600" />
                              + Foto Ekle
                            </button>
                          </div>

                          {/* Tarih & Kişi */}
                          {item.received_date || item.received_by ? (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                              {item.received_date && (
                                <span className="flex items-center gap-1 font-semibold text-slate-800">
                                  <Calendar className="w-3 h-3 text-sky-600" />
                                  {item.received_date}
                                </span>
                              )}
                              {item.received_by && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {item.received_by}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">
                              Giriş henüz yapılmadı
                            </div>
                          )}

                          {/* Fotoğraflar Galerisi */}
                          {receivedImgs.length > 0 ? (
                            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5">
                              {receivedImgs.map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: img,
                                      title: `${item.customer_name} — Depoya Teslim Görseli #${idx + 1}`,
                                    })
                                  }
                                  className="relative w-14 h-14 rounded-lg overflow-hidden border border-sky-200 bg-white shrink-0 active:scale-95 transition"
                                >
                                  <Image src={img} alt="Fiş" fill className="object-cover" />
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  setQuickPhotoRecord({
                                    id: item.id,
                                    customer_name: item.customer_name,
                                    type: "received",
                                  })
                                }
                                className="w-14 h-14 rounded-lg border-2 border-dashed border-sky-300 bg-white/70 flex flex-col items-center justify-center text-sky-600 shrink-0 hover:bg-sky-50 active:scale-95 transition"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-[9px] font-bold">Foto</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setQuickPhotoRecord({
                                  id: item.id,
                                  customer_name: item.customer_name,
                                  type: "received",
                                })
                              }
                              className="w-full py-1.5 bg-white border border-dashed border-sky-300 rounded-lg text-[11px] font-bold text-sky-700 flex items-center justify-center gap-1 hover:bg-sky-50 transition"
                            >
                              <Camera className="w-3.5 h-3.5 text-sky-600" />
                              Giriş Fişi / Fotoğrafı Çek
                            </button>
                          )}
                        </div>

                        {/* 2. Depodan Teslim (Çıkış) Bölümü */}
                        <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                              2. Depodan Teslim (Çıkış)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setQuickPhotoRecord({
                                  id: item.id,
                                  customer_name: item.customer_name,
                                  type: "delivered",
                                })
                              }
                              className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs hover:bg-emerald-50 active:scale-95 transition"
                            >
                              <Camera className="w-3 h-3 text-emerald-600" />
                              + Foto Ekle
                            </button>
                          </div>

                          {/* Tarih & Kişi */}
                          {item.delivered_date || item.delivered_by ? (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                              {item.delivered_date && (
                                <span className="flex items-center gap-1 font-semibold text-slate-800">
                                  <Calendar className="w-3 h-3 text-emerald-600" />
                                  {item.delivered_date}
                                </span>
                              )}
                              {item.delivered_by && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {item.delivered_by}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">
                              Çıkış henüz yapılmadı
                            </div>
                          )}

                          {/* Fotoğraflar Galerisi */}
                          {deliveredImgs.length > 0 ? (
                            <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5">
                              {deliveredImgs.map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: img,
                                      title: `${item.customer_name} — Depodan Teslim Görseli #${idx + 1}`,
                                    })
                                  }
                                  className="relative w-14 h-14 rounded-lg overflow-hidden border border-emerald-200 bg-white shrink-0 active:scale-95 transition"
                                >
                                  <Image src={img} alt="Fiş" fill className="object-cover" />
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  setQuickPhotoRecord({
                                    id: item.id,
                                    customer_name: item.customer_name,
                                    type: "delivered",
                                  })
                                }
                                className="w-14 h-14 rounded-lg border-2 border-dashed border-emerald-300 bg-white/70 flex flex-col items-center justify-center text-emerald-600 shrink-0 hover:bg-emerald-50 active:scale-95 transition"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-[9px] font-bold">Foto</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setQuickPhotoRecord({
                                  id: item.id,
                                  customer_name: item.customer_name,
                                  type: "delivered",
                                })
                              }
                              className="w-full py-1.5 bg-white border border-dashed border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1 hover:bg-emerald-50 transition"
                            >
                              <Camera className="w-3.5 h-3.5 text-emerald-600" />
                              Çıkış Fişi / Fotoğrafı Çek
                            </button>
                          )}
                        </div>

                        {/* Notlar */}
                        {item.notes && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-700">Not:</span> {item.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* --------------------------------------------------------- */}
                {/* MASAÜSTÜ TABLO GÖRÜNÜMÜ (hidden md:block - Detaylı Tablo) */}
                {/* --------------------------------------------------------- */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-3 min-w-[240px]">
                            <div className="flex items-center gap-1.5 text-sky-700 font-bold">
                              <ArrowDownLeft className="w-4 h-4 text-sky-600" />
                              <span>1. Depoya Teslim Görseli (Giriş)</span>
                            </div>
                          </th>
                          <th className="px-4 py-3 min-w-[240px]">
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                              <span>2. Depodan Teslim Görseli (Çıkış)</span>
                            </div>
                          </th>
                          <th className="px-4 py-3">Müşteri / Cari</th>
                          <th className="px-4 py-3">Notlar</th>
                          {deliveryColumns.map((col) => (
                            <th key={col.id} className="px-4 py-3">
                              {col.column_name}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDeliveryRecords.map((item) => {
                          const receivedImgs = sortImagesNewestFirst(
                            item.received_images && item.received_images.length > 0
                              ? item.received_images
                              : item.received_image_url
                              ? [item.received_image_url]
                              : []
                          );
                          const deliveredImgs = sortImagesNewestFirst(
                            item.delivered_images && item.delivered_images.length > 0
                              ? item.delivered_images
                              : item.delivered_image_url
                              ? [item.delivered_image_url]
                              : []
                          );

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. SÜTUN: DEPOYA TESLİM EDİLEN */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  {receivedImgs.length > 0 ? (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {receivedImgs.slice(0, 2).map((img, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() =>
                                            setPreviewImage({
                                              url: img,
                                              title: `${item.customer_name} — Depoya Teslim Görseli #${idx + 1}`,
                                            })
                                          }
                                          className="relative w-11 h-11 rounded-xl overflow-hidden border border-sky-200 bg-sky-50 hover:scale-105 transition-transform group shrink-0 shadow-2xs"
                                        >
                                          <Image src={img} alt="Fiş" fill className="object-cover" />
                                          <div className="absolute inset-0 bg-sky-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <Eye className="w-3.5 h-3.5" />
                                          </div>
                                        </button>
                                      ))}
                                      {receivedImgs.length > 2 && (
                                        <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-md">
                                          +{receivedImgs.length - 2}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setQuickPhotoRecord({
                                            id: item.id,
                                            customer_name: item.customer_name,
                                            type: "received",
                                          })
                                        }
                                        className="w-7 h-7 rounded-lg border border-dashed border-sky-300 bg-white hover:bg-sky-50 flex items-center justify-center text-sky-600 transition"
                                        title="Yeni Fotoğraf Ekle"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setQuickPhotoRecord({
                                          id: item.id,
                                          customer_name: item.customer_name,
                                          type: "received",
                                        })
                                      }
                                      className="w-10 h-10 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-100 flex items-center justify-center text-sky-600 transition shrink-0"
                                      title="Fotoğraf Ekle"
                                    >
                                      <Camera className="w-4 h-4" />
                                    </button>
                                  )}
                                  <div className="min-w-0">
                                    {item.received_date || item.received_by ? (
                                      <>
                                        {item.received_date && (
                                          <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs whitespace-nowrap">
                                            <Calendar className="w-3 h-3 text-sky-600 shrink-0" />
                                            <span>{item.received_date}</span>
                                          </div>
                                        )}
                                        {item.received_by && (
                                          <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5 whitespace-nowrap">
                                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate max-w-[120px] font-medium">
                                              {item.received_by}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">
                                        — Giriş Yok
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. SÜTUN: DEPODAN TESLİM ALINAN */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  {deliveredImgs.length > 0 ? (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {deliveredImgs.slice(0, 2).map((img, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() =>
                                            setPreviewImage({
                                              url: img,
                                              title: `${item.customer_name} — Depodan Teslim Görseli #${idx + 1}`,
                                            })
                                          }
                                          className="relative w-11 h-11 rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50 hover:scale-105 transition-transform group shrink-0 shadow-2xs"
                                        >
                                          <Image src={img} alt="Fiş" fill className="object-cover" />
                                          <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <Eye className="w-3.5 h-3.5" />
                                          </div>
                                        </button>
                                      ))}
                                      {deliveredImgs.length > 2 && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                          +{deliveredImgs.length - 2}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setQuickPhotoRecord({
                                            id: item.id,
                                            customer_name: item.customer_name,
                                            type: "delivered",
                                          })
                                        }
                                        className="w-7 h-7 rounded-lg border border-dashed border-emerald-300 bg-white hover:bg-emerald-50 flex items-center justify-center text-emerald-600 transition"
                                        title="Yeni Fotoğraf Ekle"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setQuickPhotoRecord({
                                          id: item.id,
                                          customer_name: item.customer_name,
                                          type: "delivered",
                                        })
                                      }
                                      className="w-10 h-10 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition shrink-0"
                                      title="Fotoğraf Ekle"
                                    >
                                      <Camera className="w-4 h-4" />
                                    </button>
                                  )}
                                  <div className="min-w-0">
                                    {item.delivered_date || item.delivered_by ? (
                                      <>
                                        {item.delivered_date && (
                                          <div className="flex items-center gap-1 text-slate-700 font-semibold text-xs whitespace-nowrap">
                                            <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span>{item.delivered_date}</span>
                                          </div>
                                        )}
                                        {item.delivered_by && (
                                          <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5 whitespace-nowrap">
                                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate max-w-[120px] font-medium">
                                              {item.delivered_by}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">
                                        — Çıkış Yok
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* MÜŞTERİ */}
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {item.customer_name}
                              </td>

                              {/* NOTLAR */}
                              <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                                {item.notes || "—"}
                              </td>

                              {/* DİNAMİK SÜTUNLAR */}
                              {deliveryColumns.map((col) => (
                                <td key={col.id} className="px-4 py-3">
                                  <input
                                    type="text"
                                    defaultValue={item.custom_fields?.[col.column_key] || ""}
                                    onBlur={(e) =>
                                      handleCellBlur(item.id, col.column_key, e.target.value)
                                    }
                                    placeholder="Değer gir"
                                    className="w-full text-xs bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5"
                                  />
                                </td>
                              ))}

                              {/* İŞLEMLER */}
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditDeliveryModal(item)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Düzenle"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDelivery(item.id)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SEKME: KIRIKLAR & GÖRSELLER                            */}
        {/* ========================================================= */}
        {activeTab === "kiriklar" && (
          <div>
            {filteredBrokenRecords.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">
                  Kayıtlı Kırık Ürün Bulunamadı
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Depoda kırılan veya hasar gören ürünlerin görselini ve sebebini hemen
                  kaydedebilirsiniz.
                </p>
                <button
                  onClick={openNewBrokenModal}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  + Yeni Kırık Ürün Bildir
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredBrokenRecords.map((item) => {
                  const imgList = sortImagesNewestFirst(
                    item.images && item.images.length > 0
                      ? item.images
                      : item.image_url
                      ? [item.image_url]
                      : []
                  );

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs flex flex-col hover:shadow-md transition-shadow"
                    >
                      {/* Üst Görsel / Galeri */}
                      <div className="relative w-full h-48 bg-slate-100 group">
                        {imgList.length > 0 ? (
                          <Image
                            src={imgList[0]}
                            alt={item.reason}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-slate-400">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                        <div
                          onClick={() =>
                            imgList[0] &&
                            setPreviewImage({
                              url: imgList[0],
                              title: `${item.customer_name || "Kırık Ürün"} — ${item.reason}`,
                            })
                          }
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 cursor-pointer text-xs font-semibold"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Büyüt</span>
                        </div>

                        {/* Tarih & Fotoğraf Sayısı */}
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="px-2 py-1 bg-black/65 backdrop-blur-sm text-white rounded-lg text-[10px] font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-rose-300" />
                            {item.broken_date}
                          </span>
                          {imgList.length > 1 && (
                            <span className="px-1.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold">
                              {imgList.length} Foto
                            </span>
                          )}
                        </div>

                        {/* Hızlı Foto Ekle Butonu */}
                        <div className="absolute top-2 right-2">
                          <button
                            type="button"
                            onClick={() => setQuickBrokenPhotoId(item.id)}
                            className="px-2 py-1 bg-white/90 backdrop-blur-sm text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm hover:bg-white transition"
                          >
                            <Camera className="w-3 h-3 text-rose-600" />
                            + Foto Ekle
                          </button>
                        </div>
                      </div>

                      {/* Küçük Önizleme Şeridi (Birden Fazla Fotoğraf Varsa) */}
                      {imgList.length > 1 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 overflow-x-auto">
                          {imgList.map((img, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: img,
                                  title: `${item.customer_name || "Kırık Ürün"} #${i + 1}`,
                                })
                              }
                              className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                            >
                              <Image src={img} alt="Foto" fill className="object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Kart Gövdesi */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
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
                        </div>

                        {/* Alt Bilgi & İşlemler */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                          <div className="flex items-center gap-1 truncate max-w-[150px]">
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
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* HIZLI FOTOĞRAF EKLEME MODALI (Mobilde Tek Tıkla Çekme)    */}
      {/* ========================================================= */}
      {quickPhotoRecord && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-200 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Hızlı Fotoğraf Ekle
                </span>
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {quickPhotoRecord.customer_name}
                </h3>
                <span
                  className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                    quickPhotoRecord.type === "received"
                      ? "bg-sky-100 text-sky-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {quickPhotoRecord.type === "received"
                    ? "1. Depoya Teslim (Giriş)"
                    : "2. Depodan Teslim (Çıkış)"}
                </span>
              </div>
              <button
                onClick={() => setQuickPhotoRecord(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50/40 hover:bg-indigo-50/70 cursor-pointer transition-colors p-4 text-center">
                {uploadingQuickPhoto ? (
                  <div className="flex flex-col items-center gap-2 text-indigo-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-semibold">Fotoğraflar yükleniyor ve kaydediliyor...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-md mb-2">
                      <Camera className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      Kamerayı Aç / Fotoğraf Çek
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Fotoğrafı çektiğiniz an otomatik sisteme kaydedilir
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  disabled={uploadingQuickPhoto}
                  onChange={handleQuickPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickPhotoRecord(null)}
                className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kırık Hızlı Foto Ekleme */}
      {quickBrokenPhotoId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl border border-slate-200 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Kırık Ürüne Fotoğraf Ekle
                </span>
                <h3 className="text-base font-bold text-rose-900">
                  Hasar Görseli Çek / Seç
                </h3>
              </div>
              <button
                onClick={() => setQuickBrokenPhotoId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-rose-300 rounded-2xl bg-rose-50/40 hover:bg-rose-50/70 cursor-pointer transition-colors p-4 text-center">
                {uploadingQuickBrokenPhoto ? (
                  <div className="flex flex-col items-center gap-2 text-rose-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-semibold">Fotoğraf yükleniyor...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-white text-rose-600 rounded-2xl flex items-center justify-center shadow-md mb-2">
                      <Camera className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      Kırık Fotoğrafı Çek / Seç
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Fotoğraf anında kırık kaydına eklenir
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  disabled={uploadingQuickBrokenPhoto}
                  onChange={handleQuickBrokenPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickBrokenPhotoId(null)}
                className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: KIRIK ÜRÜN BİLDİR / DÜZENLE                       */}
      {/* ========================================================= */}
      {isBrokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
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
                    Hasarlı ürün fotoğrafları ve sebebi kaydedilir
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

            {/* Gövde */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* ÇOKLU FOTOĞRAF YÜKLEME ALANI */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Kırık / Hasar Fotoğrafları ({brokenForm.images.length} Fotoğraf) *
                  </label>
                  <span className="text-[11px] text-rose-600 font-semibold">
                    Birden fazla fotoğraf ekleyebilirsiniz
                  </span>
                </div>

                {brokenForm.images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                    {brokenForm.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-rose-200 bg-white group shadow-xs"
                      >
                        <Image src={img} alt="Kırık" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setBrokenForm((prev) => {
                              const next = prev.images.filter((_, i) => i !== idx);
                              return { ...prev, images: next, image_url: next[0] || "" };
                            })
                          }
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 transition"
                          title="Kaldır"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-rose-300 rounded-2xl bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-colors text-center">
                  {uploadingBrokenImg ? (
                    <div className="flex items-center gap-2 text-rose-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs font-semibold">Fotoğraflar yükleniyor...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-white text-rose-600 rounded-lg flex items-center justify-center shadow-xs">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-slate-800">
                          + Fotoğraf Çek / Galeriden Ekle
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Tek seferde bir veya birkaç fotoğraf seçebilirsiniz
                        </div>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    disabled={uploadingBrokenImg}
                    onChange={handleBrokenImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* MÜŞTERİ SEÇİMİ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Müşteri / Firma (İsteğe Bağlı)</label>
                  <span className="text-[11px] text-rose-600 font-medium">
                    Listeden seçin veya serbest yazın
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Müşteri adı arayın veya yazınız..."
                  value={brokenForm.customer_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBrokenForm((prev) => ({ ...prev, customer_name: val, customer_id: "" }));
                    setBrokenCustomerSearch(val);
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white font-medium"
                />

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
                  rows={2}
                  placeholder="Kırılma sebebini yazınız (örn: İndirme esnasında palet kayması, sevkiyatta çarpma...)"
                  value={brokenForm.reason}
                  onChange={(e) => setBrokenForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white font-medium"
                />
              </div>

              {/* Ürün & Tarih */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ürün Adı / Kodu (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 60x120 Seramik"
                    value={brokenForm.product_name}
                    onChange={(e) =>
                      setBrokenForm((prev) => ({ ...prev, product_name: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tarih</label>
                  <input
                    type="date"
                    value={brokenForm.broken_date}
                    onChange={(e) =>
                      setBrokenForm((prev) => ({ ...prev, broken_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Bildiren Personel */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bildiren Personel
                </label>
                <input
                  type="text"
                  value={brokenForm.reported_by}
                  onChange={(e) =>
                    setBrokenForm((prev) => ({ ...prev, reported_by: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white font-medium"
                />
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ek Notlar</label>
                <textarea
                  rows={2}
                  placeholder="Varsa ek açıklama yazınız..."
                  value={brokenForm.notes}
                  onChange={(e) => setBrokenForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Butonlar */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsBrokenModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                İptal
              </button>
              {!editingBroken && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSaveBroken(true)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  Kaydet ve Yeni Ekle
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleSaveBroken(false)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Kaydet
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
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
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
              {/* MÜŞTERİ SEÇİMİ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Müşteri / Cari İsmi *</label>
                  <span className="text-[11px] text-indigo-600 font-semibold">
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
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                />

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

              {/* İŞLEM BÖLÜMÜ SEÇİMİ (1. Depoya Teslim Edilen vs 2. Depodan Teslim Alınan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  İşlem & Görsel Alanı Seçiniz
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryForm((prev) => ({
                        ...prev,
                        activeSection: "depoya_teslim_edilen",
                      }))
                    }
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      deliveryForm.activeSection === "depoya_teslim_edilen"
                        ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 shrink-0" />
                    <span>1. Depoya Teslim</span>
                    {deliveryForm.received_images.length > 0 && (
                      <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold">
                        {deliveryForm.received_images.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryForm((prev) => ({
                        ...prev,
                        activeSection: "depodan_teslim_alinan",
                      }))
                    }
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      deliveryForm.activeSection === "depodan_teslim_alinan"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                    <span>2. Depodan Teslim</span>
                    {deliveryForm.delivered_images.length > 0 && (
                      <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold">
                        {deliveryForm.delivered_images.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* SEÇİLEN ALANIN FORMU */}
              {deliveryForm.activeSection === "depoya_teslim_edilen" ? (
                /* 1. DEPOYA TESLİM EDİLEN ALANI (GİRİŞ) */
                <div className="p-3.5 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                      <ArrowDownLeft className="w-4 h-4 text-sky-600" />
                      1. Depoya Teslim Bilgileri (Giriş)
                    </span>
                    <span className="text-[11px] text-sky-600 font-semibold">
                      Depoya ürün girişinde doldurulur
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Depoya Teslim Tarihi
                      </label>
                      <input
                        type="date"
                        value={deliveryForm.received_date}
                        onChange={(e) =>
                          setDeliveryForm((prev) => ({ ...prev, received_date: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Teslim Alan / Eden Personel
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.received_by}
                        onChange={(e) =>
                          setDeliveryForm((prev) => ({ ...prev, received_by: e.target.value }))
                        }
                        placeholder="Örn: Sırrı Usta"
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Çoklu Fotoğraflar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Giriş Fiş / Ürün Fotoğrafları ({deliveryForm.received_images.length} Fotoğraf)
                      </label>
                      <span className="text-[10px] text-sky-600 font-bold">
                        Birden fazla eklenebilir
                      </span>
                    </div>

                    {deliveryForm.received_images.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                        {deliveryForm.received_images.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-sky-200 bg-white group shadow-xs"
                          >
                            <Image src={img} alt="Fiş" fill className="object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setDeliveryForm((prev) => {
                                  const next = prev.received_images.filter((_, i) => i !== idx);
                                  return {
                                    ...prev,
                                    received_images: next,
                                    received_image_url: next[0] || "",
                                  };
                                })
                              }
                              className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 transition"
                              title="Kaldır"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-sky-300 rounded-2xl bg-white hover:bg-sky-50 cursor-pointer transition-colors text-center">
                      {uploadingDeliveryImg ? (
                        <div className="flex items-center gap-2 text-sky-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-xs font-semibold">Fotoğraflar yükleniyor...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-800">
                              + Fotoğraf Çek / Galeriden Ekle
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Kameradan çekin veya galeriden tek/çoklu seçin
                            </div>
                          </div>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        disabled={uploadingDeliveryImg}
                        onChange={(e) => handleDeliveryImageUpload(e, "received")}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* 2. DEPODAN TESLİM ALINAN ALANI (ÇIKIŞ) */
                <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      2. Depodan Teslim Bilgileri (Çıkış)
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Depodan müşteriye çıkışta doldurulur
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Depodan Teslim Tarihi
                      </label>
                      <input
                        type="date"
                        value={deliveryForm.delivered_date}
                        onChange={(e) =>
                          setDeliveryForm((prev) => ({ ...prev, delivered_date: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Teslim Eden / Alan Personel
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.delivered_by}
                        onChange={(e) =>
                          setDeliveryForm((prev) => ({ ...prev, delivered_by: e.target.value }))
                        }
                        placeholder="Örn: Ali Sevkiyat"
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Çoklu Fotoğraflar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Çıkış Fiş / Sevk Fotoğrafları ({deliveryForm.delivered_images.length} Fotoğraf)
                      </label>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        Birden fazla eklenebilir
                      </span>
                    </div>

                    {deliveryForm.delivered_images.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                        {deliveryForm.delivered_images.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-emerald-200 bg-white group shadow-xs"
                          >
                            <Image src={img} alt="Fiş" fill className="object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setDeliveryForm((prev) => {
                                  const next = prev.delivered_images.filter((_, i) => i !== idx);
                                  return {
                                    ...prev,
                                    delivered_images: next,
                                    delivered_image_url: next[0] || "",
                                  };
                                })
                              }
                              className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 transition"
                              title="Kaldır"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-emerald-300 rounded-2xl bg-white hover:bg-emerald-50 cursor-pointer transition-colors text-center">
                      {uploadingDeliveryImg ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-xs font-semibold">Fotoğraflar yükleniyor...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-800">
                              + Fotoğraf Çek / Galeriden Ekle
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Kameradan çekin veya galeriden tek/çoklu seçin
                            </div>
                          </div>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        disabled={uploadingDeliveryImg}
                        onChange={(e) => handleDeliveryImageUpload(e, "delivered")}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Notlar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notlar</label>
                <textarea
                  rows={2}
                  placeholder="İrsaliye no, araç plakası veya ek açıklama..."
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            {/* Butonlar */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                İptal
              </button>
              {!editingDelivery && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSaveDelivery(true)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  Kaydet ve Yeni Ekle
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleSaveDelivery(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SÜTUN EKLEME MODALI                                        */}
      {/* ========================================================= */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yeni Sütun Ekle</h3>
              <button
                onClick={() => setIsColumnModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sütun Adı *</label>
                <input
                  type="text"
                  placeholder="Örn: Plaka, Şoför Telefonu, Palet Sayısı..."
                  value={columnForm.name}
                  onChange={(e) => setColumnForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Veri Türü</label>
                <select
                  value={columnForm.type}
                  onChange={(e) => setColumnForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                >
                  <option value="text">Metin (Yazı)</option>
                  <option value="number">Sayı</option>
                  <option value="date">Tarih</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAddColumn}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Sütunu Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIGHTBOX GÖRSEL ÖNİZLEME MODALI                            */}
      {/* ========================================================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
          >
            <div className="w-full flex items-center justify-between text-white pb-3 px-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-semibold truncate max-w-md">
                  {previewImage.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                  title="Yeni Sekmede Aç"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                  title="Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden border border-white/10 bg-black/40">
              <Image
                src={previewImage.url}
                alt={previewImage.title}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
