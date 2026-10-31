"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { calculateLine, calculateTotals } from "@/lib/calculations";
import { updateQuote } from "../actions";
import { searchProductsLive } from "@/app/(dashboard)/teklif/yeni/actions";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Save,
  Loader2,
  Building2,
  Search,
  PenLine,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  X,
  Package,
  Briefcase,
} from "lucide-react";
import { extractPlasiyer } from "@/lib/customer-helpers";

export interface CustomerOption {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string;
  address?: string | null;
  tax_office?: string | null;
  tax_number?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface ProductOption {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  stock_qty?: number | null;
  min_stock_qty?: number | null;
  default_sale_price: number | null;
  cost_price?: number | null;
  product_group?: string | null;
  series_name?: string | null;
  size?: string | null;
  brand?: string | null;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
}

export interface QuoteLineItem {
  id: string;
  product_id: string | null;
  product_code_snapshot: string;
  product_name_snapshot: string;
  description_snapshot?: string;
  unit_snapshot: string;
  price_source?: "quality_1" | "quality_2" | "commercial" | "default" | "custom" | string;
  quantity: number;
  unit_price: number;
  discount_type: "percent" | "fixed" | null;
  discount_value: number;
  stock_qty?: number | null;
  brand?: string | null;
  series_name?: string | null;
  size?: string | null;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
}

export function EditQuoteForm({
  quote,
  initialItems,
  customers = [],
  products = [],
}: {
  quote: any;
  initialItems: any[];
  customers?: CustomerOption[];
  products?: ProductOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ──────────────────── MÜŞTERİ / FİRMA BİLGİLERİ ────────────────────
  const initialHasRegistered = Boolean(
    quote.customer_id && customers.some((c) => c.id === quote.customer_id)
  );
  const [customerMode, setCustomerMode] = useState<"registered" | "manual">(
    initialHasRegistered ? "registered" : "manual"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    quote.customer_id || ""
  );
  const [customerSearch, setCustomerSearch] = useState<string>("");

  // Elle Girilen Firma / Müşteri Bilgileri
  const [manualCompanyName, setManualCompanyName] = useState<string>(
    quote.customer_snapshot?.company_name ||
      quote.customer_snapshot?.contact_name ||
      quote.customer?.company_name ||
      quote.customer?.contact_name ||
      ""
  );
  const [manualContactName, setManualContactName] = useState<string>(
    quote.customer_snapshot?.contact_name ||
      quote.customer?.contact_name ||
      ""
  );
  const [manualPhone, setManualPhone] = useState<string>(
    quote.customer_snapshot?.phone || quote.customer?.phone || ""
  );
  const [manualAddress, setManualAddress] = useState<string>(
    quote.customer_snapshot?.address || quote.customer?.address || ""
  );
  const [manualTaxOffice, setManualTaxOffice] = useState<string>(
    quote.customer_snapshot?.tax_office || quote.customer?.tax_office || ""
  );
  const [manualTaxNumber, setManualTaxNumber] = useState<string>(
    quote.customer_snapshot?.tax_number || quote.customer?.tax_number || ""
  );

  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  function handleSelectCustomer(custId: string) {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setManualCompanyName(found.company_name || found.contact_name || "");
      setManualContactName(found.contact_name || "");
      setManualPhone(found.phone || "");
      setManualAddress(found.address || "");
      setManualTaxOffice(found.tax_office || "");
      setManualTaxNumber(found.tax_number || "");
    }
  }

  // ──────────────────── KALEMLER (TEKLİF LİSTESİ) ────────────────────
  const [items, setItems] = useState<QuoteLineItem[]>(() =>
    initialItems.map((it) => {
      const discountVal = Number(it.discount_value) || 0;
      const discountType = (it.discount_type === "fixed" ? "fixed" : "percent") as "percent" | "fixed";
      return {
        id: it.id || crypto.randomUUID(),
        product_id: it.product_id || null,
        product_code_snapshot: it.product_code_snapshot || "",
        product_name_snapshot: it.product_name_snapshot || "",
        description_snapshot: it.description_snapshot || "",
        unit_snapshot: it.unit_snapshot || "M2",
        price_source: it.price_source || "custom",
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        discount_type: discountVal > 0 ? (it.discount_type || "percent") : discountType,
        discount_value: discountVal,
        stock_qty: it.product?.stock_qty ?? it.stock_qty ?? null,
        brand: it.product?.brand ?? it.brand ?? null,
        series_name: it.product?.series_name ?? it.series_name ?? null,
        size: it.product?.size ?? it.size ?? null,
        price_quality_1: it.product?.price_quality_1 ?? null,
        price_quality_2: it.product?.price_quality_2 ?? null,
        price_commercial: it.product?.price_commercial ?? null,
      };
    })
  );

  // ──────────────────── CANLI ÜRÜN ARAMASI & STAGING (4,371+ ÜRÜN) ────────────────────
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductOption[]>(products.slice(0, 30));
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const productBoxRef = useRef<HTMLDivElement>(null);

  // Seçilen / Staging Ürün
  const [stagedProduct, setStagedProduct] = useState<ProductOption | null>(null);
  const [stagedQty, setStagedQty] = useState(1);
  const [stagedPrice, setStagedPrice] = useState(0);
  const [stagedDiscountType, setStagedDiscountType] = useState<"percent" | "fixed">("percent");
  const [stagedDiscountValue, setStagedDiscountValue] = useState(0);
  const [stagedSelectedQuality, setStagedSelectedQuality] = useState<"q1" | "q2" | "commercial" | "custom">("q1");

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productBoxRef.current && !productBoxRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Product Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = productSearchQuery.trim();
      if (!q) {
        setProductResults(products.slice(0, 30));
        return;
      }
      setIsSearchingProducts(true);
      try {
        const results = await searchProductsLive(q);
        setProductResults(results);
      } catch (err) {
        console.error("Ürün arama hatası:", err);
      } finally {
        setIsSearchingProducts(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [productSearchQuery, products]);

  // Ürün Seçimi
  const handleSelectProduct = (product: ProductOption) => {
    setStagedProduct(product);
    const initialPrice = product.price_quality_1 ?? product.default_sale_price ?? 0;
    setStagedPrice(initialPrice);
    setStagedSelectedQuality(product.price_quality_1 ? "q1" : "custom");
    setStagedQty(1);
    setStagedDiscountType("percent");
    setStagedDiscountValue(0);
    setIsProductDropdownOpen(false);
  };

  const handleSetQualityPrice = (quality: "q1" | "q2" | "commercial") => {
    if (!stagedProduct) return;
    setStagedSelectedQuality(quality);
    if (quality === "q1" && stagedProduct.price_quality_1) setStagedPrice(stagedProduct.price_quality_1);
    else if (quality === "q2" && stagedProduct.price_quality_2) setStagedPrice(stagedProduct.price_quality_2);
    else if (quality === "commercial" && stagedProduct.price_commercial) setStagedPrice(stagedProduct.price_commercial);
  };

  const stagedSubtotal = (Number(stagedQty) || 0) * (Number(stagedPrice) || 0);
  const stagedDiscountAmount = stagedDiscountType === "percent"
    ? stagedSubtotal * ((Number(stagedDiscountValue) || 0) / 100)
    : Number(stagedDiscountValue) || 0;
  const stagedLineTotal = Math.max(0, stagedSubtotal - Math.min(stagedSubtotal, stagedDiscountAmount));

  // Seçilen Kalemi Teklif Listesine Ekle
  const handleAddStagedItem = () => {
    if (!stagedProduct) return;
    if (stagedQty <= 0) {
      toast.error("Lütfen geçerli bir miktar giriniz.");
      return;
    }
    const newItem: QuoteLineItem = {
      id: crypto.randomUUID(),
      product_id: stagedProduct.id,
      product_code_snapshot: stagedProduct.product_code || "",
      product_name_snapshot: stagedProduct.product_name,
      description_snapshot: [
        stagedProduct.brand ? `Marka: ${stagedProduct.brand}` : "",
        stagedProduct.series_name ? `Seri: ${stagedProduct.series_name}` : "",
        stagedProduct.size ? `Ebat: ${stagedProduct.size}` : "",
      ].filter(Boolean).join(" • "),
      unit_snapshot: stagedProduct.unit || "M2",
      price_source:
        stagedSelectedQuality === "q1"
          ? "quality_1"
          : stagedSelectedQuality === "q2"
          ? "quality_2"
          : stagedSelectedQuality === "commercial"
          ? "commercial"
          : "custom",
      quantity: stagedQty,
      unit_price: stagedPrice,
      discount_type: stagedDiscountValue > 0 ? stagedDiscountType : "percent",
      discount_value: stagedDiscountValue,
      stock_qty: stagedProduct.stock_qty,
      brand: stagedProduct.brand,
      series_name: stagedProduct.series_name,
      size: stagedProduct.size,
      price_quality_1: stagedProduct.price_quality_1,
      price_quality_2: stagedProduct.price_quality_2,
      price_commercial: stagedProduct.price_commercial,
    };
    setItems((prev) => [...prev, newItem]);
    toast.success(`"${stagedProduct.product_name}" teklif listesine eklendi!`, {
      icon: <CheckCircle2 className="text-emerald-500" size={16} />,
    });
    setStagedProduct(null);
    setProductSearchQuery("");
    setStagedQty(1);
    setStagedPrice(0);
    setStagedDiscountValue(0);
  };

  // Serbest Kalem Ekleme
  const handleAddCustomItem = () => {
    const newItem: QuoteLineItem = {
      id: crypto.randomUUID(),
      product_id: null,
      product_code_snapshot: "",
      product_name_snapshot: "Yeni Serbest Kalem / Hizmet",
      description_snapshot: "",
      unit_snapshot: "Adet",
      price_source: "custom",
      quantity: 1,
      unit_price: 0,
      discount_type: "percent",
      discount_value: 0,
      stock_qty: null,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Kalem Güncelleme (Functional updater ile state kaybı kesin olarak önlenir)
  function handleUpdateItem(id: string, updates: Partial<QuoteLineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  // Kalem Çıkartma (Silme)
  function handleRemoveItem(index: number) {
    if (items.length <= 1) {
      toast.error("Teklifte en az 1 ürün bulunmalıdır.");
      return;
    }
    const next = [...items];
    const removed = next.splice(index, 1)[0];
    setItems(next);
    toast.info(`"${removed.product_name_snapshot}" tekliften çıkarıldı.`);
  }

  // ──────────────────── GENEL TOPLAMLAR & İSKONTO ────────────────────
  const [generalDiscountType, setGeneralDiscountType] = useState<"percent" | "fixed" | null>(
    quote.general_discount_type || null
  );
  const [generalDiscountValue, setGeneralDiscountValue] = useState<number>(
    Number(quote.general_discount_value) || 0
  );
  const [vatRate, setVatRate] = useState<number>(Number(quote.vat_rate) || 20);
  const [validUntil, setValidUntil] = useState<string>(
    quote.valid_until ? new Date(quote.valid_until).toISOString().split("T")[0] : ""
  );
  const [deliveryTerms, setDeliveryTerms] = useState<string>(quote.delivery_terms || "");
  const [paymentTerms, setPaymentTerms] = useState<string>(quote.payment_terms || "");
  const [notes, setNotes] = useState<string>(quote.notes || "");

  // Canlı Hesaplama
  const { lines, totals } = useMemo(() => {
    const calculatedLines = items.map((item) =>
      calculateLine({
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_type: (item.discount_value || 0) > 0 ? (item.discount_type || "percent") : null,
        discount_value: item.discount_value,
      })
    );
    const calculatedTotals = calculateTotals(
      calculatedLines,
      vatRate,
      generalDiscountType,
      generalDiscountValue
    );
    return { lines: calculatedLines, totals: calculatedTotals };
  }, [items, vatRate, generalDiscountType, generalDiscountValue]);

  // ──────────────────── KAYDETME ────────────────────
  async function handleSave() {
    if (items.length === 0) {
      toast.error("Lütfen en az bir kalem ekleyin.");
      return;
    }

    let finalCustomerId: string | null = null;
    let finalCustomerSnapshot: any = null;

    if (customerMode === "registered") {
      if (!selectedCustomerId || !selectedCustomerObj) {
        toast.error("Lütfen listeden bir müşteri seçiniz veya 'Elle Firma İsmi Gir' seçeneğini kullanınız.");
        return;
      }
      finalCustomerId = selectedCustomerObj.id;
      finalCustomerSnapshot = {
        company_name: selectedCustomerObj.company_name || selectedCustomerObj.contact_name,
        contact_name: selectedCustomerObj.contact_name || selectedCustomerObj.company_name,
        phone: selectedCustomerObj.phone || "-",
        address: selectedCustomerObj.address || "-",
        tax_office: selectedCustomerObj.tax_office || null,
        tax_number: selectedCustomerObj.tax_number || null,
        email: selectedCustomerObj.email || null,
      };
    } else {
      if (!manualCompanyName.trim()) {
        toast.error("Lütfen firma veya müşteri adını giriniz.");
        return;
      }
      finalCustomerId = null;
      finalCustomerSnapshot = {
        company_name: manualCompanyName.trim(),
        contact_name: manualContactName.trim() || manualCompanyName.trim(),
        phone: manualPhone.trim() || "-",
        address: manualAddress.trim() || "-",
        tax_office: manualTaxOffice.trim() || null,
        tax_number: manualTaxNumber.trim() || null,
        email: null,
      };
    }

    setLoading(true);
    try {
      const res = await updateQuote(quote.id, {
        customerId: finalCustomerId,
        customerSnapshot: finalCustomerSnapshot,
        items: items.map((it) => ({
          product_id: it.product_id,
          product_code_snapshot: it.product_code_snapshot,
          product_name_snapshot: it.product_name_snapshot,
          description_snapshot: it.description_snapshot,
          unit_snapshot: it.unit_snapshot,
          price_source: it.price_source,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_type: (it.discount_value || 0) > 0 ? (it.discount_type || "percent") : null,
          discount_value: it.discount_value || 0,
        })),
        generalDiscountType,
        generalDiscountValue,
        vatRate,
        validUntil,
        deliveryTerms,
        paymentTerms,
        notes,
      });

      if (!res.success) {
        toast.error(res.error || "Güncelleme başarısız");
        setLoading(false);
        return;
      }

      toast.success("Teklif başarıyla güncellendi!");
      router.push(`/teklifler/${quote.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Güncelleme başarısız";
      toast.error("Hata: " + msg);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Başlık Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/teklifler/${quote.id}`}
            className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-text border border-border transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text">
              Teklifi Düzenle (TKF-{quote.quote_code})
            </h1>
            <p className="text-xs text-text-muted">
              Firma / Müşteri:{" "}
              <strong className="text-brand-navy font-semibold">
                {customerMode === "registered" && selectedCustomerObj
                  ? selectedCustomerObj.company_name || selectedCustomerObj.contact_name
                  : manualCompanyName || "Belirtilmedi"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddCustomItem}
            className="flex items-center gap-1.5 bg-surface hover:bg-gray-200 text-text px-3.5 py-2 rounded-lg text-xs font-semibold border border-border transition"
          >
            <Plus size={15} /> + Kalem Ekle
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-5 py-2 rounded-lg text-sm font-bold transition shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Kaydediliyor...
              </>
            ) : (
              <>
                <Save size={16} /> Güncelle ve Kaydet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Müşteri / Firma Seçimi & Değiştirme */}
      <div className="bg-white rounded-xl border border-border p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-navy/10 text-brand-navy flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Müşteri & Firma Bilgileri</h2>
              <p className="text-xs text-text-muted">
                Firma ismini listeden seçebilir veya müşteri yoksa doğrudan elle yazabilirsiniz.
              </p>
            </div>
          </div>

          {/* Mod Değiştirme Butonları */}
          <div className="flex items-center bg-surface p-1 rounded-lg border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCustomerMode("registered")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                customerMode === "registered"
                  ? "bg-white text-brand-navy shadow-xs font-bold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Building2 size={13} />
              <span>Listeden Seç ({customers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("manual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                customerMode === "manual"
                  ? "bg-white text-brand-navy shadow-xs font-bold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <PenLine size={13} />
              <span>Elle Firma İsmi Gir</span>
            </button>
          </div>
        </div>

        {/* Seçenek 1: Kayıtlı Müşterilerden Seç */}
        {customerMode === "registered" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Müşteri / Firma Listesi *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-white text-xs font-medium outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                >
                  <option value="">-- Müşteri Seçiniz --</option>
                  {customers.map((c) => {
                    const plas = extractPlasiyer(c.notes);
                    const plasTag = plas ? ` [${plas.replace(/-\[.*?\]$/, "")}]` : "";
                    return (
                      <option key={c.id} value={c.id}>
                        {c.company_name || c.contact_name}{plasTag} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Müşteri Ara / Filtrele
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Firma adı, telefon veya plasiyer..."
                    className="w-full border border-border rounded-lg pl-8 pr-3 py-2 bg-surface text-xs outline-none focus:bg-white focus:border-brand-navy"
                  />
                  <Search size={14} className="absolute left-2.5 top-2.5 text-text-muted" />
                </div>
              </div>
            </div>

            {/* Arama yapılmışsa hızlı seçim hapları */}
            {customerSearch.trim() && (
              <div className="space-y-1">
                <span className="text-[11px] text-text-muted font-medium">Eşleşen Müşteriler:</span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-surface rounded-lg border border-border">
                  {customers
                    .filter((c) => {
                      const q = customerSearch.toLowerCase();
                      return (
                        (c.company_name && c.company_name.toLowerCase().includes(q)) ||
                        (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
                        (c.phone && c.phone.includes(q)) ||
                        (c.notes && c.notes.toLowerCase().includes(q))
                      );
                    })
                    .slice(0, 15)
                    .map((c) => {
                      const plas = extractPlasiyer(c.notes);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            handleSelectCustomer(c.id);
                            setCustomerSearch("");
                          }}
                          className={`text-xs px-2.5 py-1 rounded-md border text-left transition cursor-pointer flex items-center gap-1.5 ${
                            selectedCustomerId === c.id
                              ? "bg-brand-navy text-white border-brand-navy font-bold"
                              : "bg-white text-text border-border hover:border-brand-navy"
                          }`}
                        >
                          <Building2 size={11} />
                          <span>{c.company_name || c.contact_name}</span>
                          {plas && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                              👔 {plas.replace(/-\[.*?\]$/, "")}
                            </span>
                          )}
                          {c.phone && <span className="opacity-75 text-[10px]">({c.phone})</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Seçili Müşteri Bilgi Kartı */}
            {selectedCustomerObj ? (
              <div className="p-3 bg-brand-navy/5 border border-brand-navy/15 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-brand-navy text-sm flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{selectedCustomerObj.company_name || selectedCustomerObj.contact_name}</span>
                  </div>
                  <div className="text-text-muted flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                    {extractPlasiyer(selectedCustomerObj.notes) && (
                      <span className="text-amber-900 font-bold bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                        👔 Plasiyer: {extractPlasiyer(selectedCustomerObj.notes)}
                      </span>
                    )}
                    {selectedCustomerObj.contact_name && (
                      <span>Yetkili: <strong className="text-text">{selectedCustomerObj.contact_name}</strong></span>
                    )}
                    {selectedCustomerObj.phone && (
                      <span>Tel: <strong className="text-text">{selectedCustomerObj.phone}</strong></span>
                    )}
                    {selectedCustomerObj.address && (
                      <span>Adres: <strong className="text-text">{selectedCustomerObj.address}</strong></span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerMode("manual")}
                  className="text-[11px] font-semibold text-brand-navy hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <PenLine size={12} /> Bilgileri Elle Düzenle
                </button>
              </div>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                ℹ️ Listede müşteri bulunamadıysa veya yeni bir firma ise yukarıdaki <strong>&quot;Elle Firma İsmi Gir&quot;</strong> butonuna tıklayarak doğrudan yazabilirsiniz.
              </p>
            )}
          </div>
        ) : (
          /* Seçenek 2: Elle Giriş */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-text mb-1">
                  Firma / Müşteri Adı *
                </label>
                <input
                  type="text"
                  required
                  value={manualCompanyName}
                  onChange={(e) => setManualCompanyName(e.target.value)}
                  placeholder="Örn: ABC İnşaat Ltd. Şti. veya Ahmet Yılmaz"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-white text-xs font-semibold outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Yetkili Kişi
                </label>
                <input
                  type="text"
                  value={manualContactName}
                  onChange={(e) => setManualContactName(e.target.value)}
                  placeholder="Örn: Mehmet Bey"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-white text-xs outline-none focus:border-brand-navy"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Telefon</label>
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="0532 000 00 00"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-white text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Vergi Dairesi / No</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={manualTaxOffice}
                    onChange={(e) => setManualTaxOffice(e.target.value)}
                    placeholder="Vergi Dairesi"
                    className="w-full border border-border rounded-lg px-2.5 py-2 bg-white text-xs outline-none focus:border-brand-navy"
                  />
                  <input
                    type="text"
                    value={manualTaxNumber}
                    onChange={(e) => setManualTaxNumber(e.target.value)}
                    placeholder="Vergi / TC No"
                    className="w-full border border-border rounded-lg px-2.5 py-2 bg-white text-xs outline-none focus:border-brand-navy"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Adres / Şantiye</label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Şantiye adresi veya ilçe..."
                  className="w-full border border-border rounded-lg px-3 py-2 bg-white text-xs outline-none focus:border-brand-navy"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────── 2. YENİ ÜRÜN ARA & SEÇ (4,371+ ÜRÜN) ──────────────────── */}
      <div className="bg-white rounded-xl border border-border p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">2. Teklife Yeni Ürün Ekle (Katalogdan Canlı Ara)</h2>
              <p className="text-xs text-text-muted">
                4,371+ ürün içerisinden canlı arayın, depodaki anlık stok ve kalite fiyatlarıyla teklife dahil edin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddCustomItem}
            className="text-xs font-semibold text-brand-navy hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} /> + Serbest Kalem Ekle
          </button>
        </div>

        {/* Canlı Arama Input Kutusu */}
        <div className="relative" ref={productBoxRef}>
          <div className="relative">
            <input
              type="text"
              value={productSearchQuery}
              onFocus={() => setIsProductDropdownOpen(true)}
              onChange={(e) => {
                setProductSearchQuery(e.target.value);
                setIsProductDropdownOpen(true);
              }}
              placeholder="🔍 Ürün kodu, ürün adı, seri, ebat veya marka ile canlı ara (Örn: Aragonit, Kütahya, 60x120)..."
              className="w-full border-2 border-emerald-500/30 focus:border-emerald-600 rounded-xl pl-10 pr-10 py-3 text-sm font-semibold outline-none transition bg-white shadow-xs"
            />
            <Search className="absolute left-3.5 top-3.5 text-emerald-700" size={18} />
            {isSearchingProducts && (
              <Loader2 className="absolute right-3.5 top-3.5 animate-spin text-emerald-700" size={18} />
            )}
            {productSearchQuery && !isSearchingProducts && (
              <button
                type="button"
                onClick={() => {
                  setProductSearchQuery("");
                  setProductResults(products.slice(0, 30));
                }}
                className="absolute right-3 top-3 text-text-muted hover:text-text p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Arama Sonuçları Dropdown */}
          {isProductDropdownOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-xl max-h-80 overflow-y-auto divide-y divide-border">
              {productResults.length > 0 ? (
                productResults.map((p) => {
                  const stock = p.stock_qty ?? 0;
                  const hasStock = stock > 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="p-3 hover:bg-emerald-50/60 cursor-pointer transition flex items-center justify-between gap-3 text-xs group"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-brand-navy bg-surface px-1.5 py-0.5 rounded border border-border">
                            {p.product_code || "KODSUZ"}
                          </span>
                          <span className="font-bold text-text text-sm group-hover:text-emerald-800">
                            {p.product_name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted text-[11px]">
                          {p.brand && <span>Marka: <strong className="text-text">{p.brand}</strong></span>}
                          {p.series_name && <span>• Seri: <strong className="text-text">{p.series_name}</strong></span>}
                          {p.size && <span>• Ebat: <strong className="text-text">{p.size}</strong></span>}
                          {p.product_group && <span>• Grup: <strong className="text-text">{p.product_group}</strong></span>}

                          {/* CANLI DEPO STOK ROZETİ */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              hasStock
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${hasStock ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                            {hasStock ? `${stock} ${p.unit || "M2"} Depoda Mevcut` : `Stokta Yok (0 ${p.unit || "M2"})`}
                          </span>
                        </div>
                      </div>

                      {/* FİYATLAR & SEÇ BUTONU */}
                      <div className="text-right flex items-center gap-3 flex-shrink-0">
                        <div>
                          {p.price_quality_1 ? (
                            <p className="text-xs font-bold text-emerald-700 tabular-nums">
                              1. Kalite: {formatCurrency(p.price_quality_1)}
                            </p>
                          ) : p.default_sale_price ? (
                            <p className="text-xs font-bold text-text tabular-nums">
                              Liste: {formatCurrency(p.default_sale_price)}
                            </p>
                          ) : null}
                          {p.price_commercial ? (
                            <p className="text-[11px] text-text-muted tabular-nums">
                              Ticari: {formatCurrency(p.price_commercial)}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="bg-brand-gold text-brand-navy px-3.5 py-1.5 rounded-lg text-xs font-bold group-hover:bg-brand-navy group-hover:text-white transition shadow-xs cursor-pointer"
                        >
                          Seç →
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-text-muted">
                  Aramanıza uygun ürün bulunamadı. Lütfen ürün kodunu veya adını kontrol edin.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ──────────────────── SEÇİLEN ÜRÜN STAGING KUTUSU ──────────────────── */}
        {stagedProduct && (
          <div className="bg-emerald-50/50 border-2 border-emerald-300 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                    Seçilen Ürün
                  </span>
                  <span className="font-mono text-xs font-bold text-brand-navy bg-white border border-emerald-300 px-2 py-0.5 rounded">
                    {stagedProduct.product_code || "KODSUZ"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text mt-1">{stagedProduct.product_name}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-text-muted mt-0.5">
                  {stagedProduct.brand && <span>Marka: <strong className="text-text">{stagedProduct.brand}</strong></span>}
                  {stagedProduct.series_name && <span>• Seri: <strong className="text-text">{stagedProduct.series_name}</strong></span>}
                  {stagedProduct.size && <span>• Ebat: <strong className="text-text">{stagedProduct.size}</strong></span>}
                  {stagedProduct.product_group && <span>• Grup: <strong className="text-text">{stagedProduct.product_group}</strong></span>}
                  <span>• Birim: <strong className="text-emerald-700">{stagedProduct.unit || "M2"}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* DEPO STOK ROZETİ */}
                <div
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                    (stagedProduct.stock_qty || 0) > 0
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : "bg-rose-100 text-rose-900 border-rose-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${(stagedProduct.stock_qty || 0) > 0 ? "bg-emerald-600 animate-pulse" : "bg-rose-600"}`}></span>
                  <span>
                    Depo Stoku: <strong>{stagedProduct.stock_qty ?? 0} {stagedProduct.unit || "M2"}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStagedProduct(null)}
                  className="text-xs text-rose-600 hover:text-rose-800 bg-white border border-rose-200 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <X size={14} /> Vazgeç
                </button>
              </div>
            </div>

            {/* Fiyat Seçenekleri */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">Fiyat Seçimi:</label>
              <div className="flex flex-wrap gap-2">
                {stagedProduct.price_quality_1 ? (
                  <button
                    type="button"
                    onClick={() => handleSetQualityPrice("q1")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      stagedSelectedQuality === "q1"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white border border-border text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    <span>1. Kalite:</span>
                    <span>{formatCurrency(stagedProduct.price_quality_1)}</span>
                  </button>
                ) : null}

                {stagedProduct.price_quality_2 ? (
                  <button
                    type="button"
                    onClick={() => handleSetQualityPrice("q2")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      stagedSelectedQuality === "q2"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white border border-border text-text-muted hover:bg-surface"
                    }`}
                  >
                    <span>2. Kalite:</span>
                    <span>{formatCurrency(stagedProduct.price_quality_2)}</span>
                  </button>
                ) : null}

                {stagedProduct.price_commercial ? (
                  <button
                    type="button"
                    onClick={() => handleSetQualityPrice("commercial")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      stagedSelectedQuality === "commercial"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white border border-border text-text-muted hover:bg-surface"
                    }`}
                  >
                    <span>Ticari:</span>
                    <span>{formatCurrency(stagedProduct.price_commercial)}</span>
                  </button>
                ) : null}

                {stagedProduct.default_sale_price ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStagedSelectedQuality("custom");
                      setStagedPrice(stagedProduct.default_sale_price || 0);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-border text-text hover:bg-surface cursor-pointer"
                  >
                    <span>Liste Fiyatı:</span>
                    <span>{formatCurrency(stagedProduct.default_sale_price)}</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Miktar, Birim Fiyat, İskonto ve Tutar Alanları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-border items-end">
              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  Miktar ({stagedProduct.unit || "M2"}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={stagedQty === 0 ? "" : stagedQty}
                  placeholder="1"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setStagedQty(parseFloat(e.target.value) || 0)}
                  className="w-full border-2 border-emerald-200 rounded-lg px-3 py-1.5 text-sm font-bold text-text outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  Birim Fiyat (₺) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={stagedPrice === 0 ? "" : stagedPrice}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setStagedPrice(parseFloat(e.target.value) || 0);
                    setStagedSelectedQuality("custom");
                  }}
                  className="w-full border-2 border-border rounded-lg px-3 py-1.5 text-sm font-bold text-text outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">Ürün İskontosu</label>
                <div className="flex gap-1">
                  <select
                    value={stagedDiscountType}
                    onChange={(e) => setStagedDiscountType(e.target.value as "percent" | "fixed")}
                    className="border border-border rounded-lg px-2 py-1.5 text-xs bg-surface font-semibold outline-none cursor-pointer"
                  >
                    <option value="percent">%</option>
                    <option value="fixed">₺</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={stagedDiscountValue === 0 ? "" : stagedDiscountValue}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setStagedDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-right outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-text-muted mb-1">Kalem Toplamı</span>
                <p className="text-base font-black text-emerald-700 py-1 tabular-nums">
                  {formatCurrency(stagedLineTotal)}
                  {stagedDiscountAmount > 0 && (
                    <span className="block text-[11px] font-medium text-rose-600">
                      (-{formatCurrency(stagedDiscountAmount)} iskonto)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* STOK AŞIMI UYARISI */}
            {stagedQty > (stagedProduct.stock_qty || 0) && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-center gap-2 text-xs text-amber-900">
                <AlertTriangle className="text-amber-600 flex-shrink-0" size={16} />
                <span>
                  <strong>Dikkat:</strong> Girilen miktar ({stagedQty} {stagedProduct.unit || "M2"}), mevcut depo stokundan ({stagedProduct.stock_qty || 0} {stagedProduct.unit || "M2"}) fazladır.
                  Stok açığı: <strong>{stagedQty - (stagedProduct.stock_qty || 0)} {stagedProduct.unit || "M2"}</strong>. Teklif güncellenebilir ancak teslimat için tedarik gerekecektir.
                </span>
              </div>
            )}

            {/* Buton */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddStagedItem}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>✓ Kalemi Teklif Listesine Ekle</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────── 3. TEKLİF KALEMLERİ TABLOSU ──────────────────── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border bg-surface flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="text-brand-navy" size={17} />
            <h2 className="text-xs font-bold text-text uppercase tracking-wide">
              3. Teklif Kalemleri ({items.length} Kalem)
            </h2>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            Ara Toplam: <strong className="text-text">{formatCurrency(totals.subtotal)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface border-b border-border text-text-muted">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold w-8">#</th>
                <th className="text-left px-3 py-2.5 font-semibold min-w-[220px]">Ürün / Açıklama</th>
                <th className="text-left px-3 py-2.5 font-semibold w-24">Kod</th>
                <th className="text-right px-3 py-2.5 font-semibold w-20">Miktar</th>
                <th className="text-left px-3 py-2.5 font-semibold w-20">Birim</th>
                <th className="text-right px-3 py-2.5 font-semibold w-28">B. Fiyat (₺)</th>
                <th className="text-right px-3 py-2.5 font-semibold w-32">İskonto (% / ₺)</th>
                <th className="text-right px-3 py-2.5 font-semibold w-24">İsk. Tutarı</th>
                <th className="text-right px-3 py-2.5 font-semibold w-28">Satır Tutarı</th>
                <th className="text-center px-3 py-2.5 font-semibold w-14">Sil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, idx) => {
                const lineCalc = lines[idx];
                const stock = item.stock_qty;
                const hasStockInfo = stock !== null && stock !== undefined;
                return (
                  <tr key={item.id} className="hover:bg-surface/60 transition">
                    <td className="px-3 py-2 text-text-muted font-mono">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.product_name_snapshot}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { product_name_snapshot: e.target.value })
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-text font-semibold text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                        {item.brand && (
                          <span className="text-text-muted">
                            Marka: <strong className="text-text">{item.brand}</strong>
                          </span>
                        )}
                        {item.series_name && (
                          <span className="text-text-muted">
                            Seri: <strong className="text-text">{item.series_name}</strong>
                          </span>
                        )}
                        {item.size && (
                          <span className="text-text-muted">
                            Ebat: <strong className="text-text">{item.size}</strong>
                          </span>
                        )}
                        {hasStockInfo && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              stock >= item.quantity
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                : stock > 0
                                ? "bg-amber-50 text-amber-900 border border-amber-300"
                                : "bg-rose-50 text-rose-800 border border-rose-300"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                stock >= item.quantity
                                  ? "bg-emerald-500"
                                  : stock > 0
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            ></span>
                            {stock >= item.quantity
                              ? `${stock} ${item.unit_snapshot} Stokta`
                              : stock > 0
                              ? `Depoda ${stock} var (${item.quantity - stock} eksik)`
                              : "Stokta Yok"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-text-muted">
                      <input
                        type="text"
                        value={item.product_code_snapshot}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { product_code_snapshot: e.target.value })
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={item.quantity === 0 ? "" : item.quantity}
                        placeholder="1"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-right tabular-nums font-bold"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.unit_snapshot}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { unit_snapshot: e.target.value })
                        }
                        className="w-full bg-surface border border-border rounded px-1.5 py-1 text-xs font-medium cursor-pointer"
                      >
                        <option value="M2">M2</option>
                        <option value="ADT">ADT</option>
                        <option value="PK">PK</option>
                        <option value="MT">MT</option>
                        <option value="KG">KG</option>
                        <option value="SET">SET</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price === 0 ? "" : item.unit_price}
                        placeholder="0.00"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-right tabular-nums font-semibold"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <select
                          value={item.discount_type || "percent"}
                          onChange={(e) => {
                            const newType = e.target.value as "percent" | "fixed";
                            handleUpdateItem(item.id, { discount_type: newType });
                          }}
                          className="border border-border rounded px-1.5 py-1 text-xs bg-surface font-semibold outline-none cursor-pointer"
                        >
                          <option value="percent">%</option>
                          <option value="fixed">₺</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.discount_value === 0 ? "" : item.discount_value}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateItem(item.id, {
                              discount_value: val,
                              discount_type: item.discount_type || "percent",
                            });
                          }}
                          className="w-16 border border-border rounded px-2 py-1 text-xs text-right font-bold outline-none focus:border-brand-navy"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {lineCalc && lineCalc.discount_amount > 0 ? (
                        <span className="font-semibold text-rose-600 tabular-nums">
                          -{formatCurrency(lineCalc.discount_amount)}
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-text tabular-nums">
                      {formatCurrency(lineCalc?.line_total || 0)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        title="Bu ürünü tekliften çıkar"
                        className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ──────────────────── 4. ŞARTLAR VE TOPLAMLAR ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-border space-y-4 shadow-xs">
          <h3 className="text-xs font-semibold text-text uppercase tracking-wide">
            Notlar & Şartlar
          </h3>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Geçerlilik Tarihi
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Teslimat Şartları
            </label>
            <input
              type="text"
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              placeholder="Örn: Şantiye teslim veya depodan teslim..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Ödeme Şartları
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Örn: Peşin havale veya 30 gün çek..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Teklif Notları
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Teklifle ilgili müşteri özel notları..."
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Toplam Kartı */}
        <div className="bg-white p-5 rounded-xl border border-border space-y-3 text-sm">
          <h3 className="text-xs font-semibold text-text uppercase tracking-wide mb-2">
            Hesaplanan Toplamlar
          </h3>
          <div className="flex justify-between text-text-muted text-xs">
            <span>Ara Toplam:</span>
            <span className="tabular-nums font-semibold text-text">
              {formatCurrency(totals.subtotal)}
            </span>
          </div>

          {totals.line_discount_total > 0 && (
            <div className="flex justify-between text-emerald-600 text-xs">
              <span>Satır İskontoları:</span>
              <span className="tabular-nums font-medium">
                -{formatCurrency(totals.line_discount_total)}
              </span>
            </div>
          )}

          <div className="bg-surface/70 p-2.5 rounded-lg border border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-text">Genel İskonto:</span>
              {totals.general_discount_amount > 0 && (
                <span className="font-bold text-rose-600 tabular-nums">
                  -{formatCurrency(totals.general_discount_amount)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded border border-border bg-white overflow-hidden p-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (generalDiscountType === "percent") {
                      setGeneralDiscountType(null);
                      setGeneralDiscountValue(0);
                    } else {
                      setGeneralDiscountType("percent");
                    }
                  }}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded transition cursor-pointer ${
                    generalDiscountType === "percent"
                      ? "bg-brand-navy text-white shadow-xs"
                      : "text-text-muted hover:text-text hover:bg-surface"
                  }`}
                >
                  % Yüzde
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (generalDiscountType === "fixed") {
                      setGeneralDiscountType(null);
                      setGeneralDiscountValue(0);
                    } else {
                      setGeneralDiscountType("fixed");
                    }
                  }}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded transition cursor-pointer ${
                    generalDiscountType === "fixed"
                      ? "bg-brand-navy text-white shadow-xs"
                      : "text-text-muted hover:text-text hover:bg-surface"
                  }`}
                >
                  ₺ Tutar
                </button>
              </div>

              {generalDiscountType ? (
                <div className="flex-1 flex items-center gap-1 bg-white border border-brand-navy/30 focus-within:border-brand-navy rounded px-2 py-0.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={generalDiscountValue === 0 ? "" : generalDiscountValue}
                    placeholder={generalDiscountType === "percent" ? "Örn: 10" : "Örn: 1000"}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setGeneralDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-bold text-right outline-none text-text"
                  />
                  <span className="text-xs font-bold text-text-muted">
                    {generalDiscountType === "percent" ? "%" : "₺"}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-text-muted italic">
                  İskonto için % veya ₺ seçin
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between font-medium text-xs pt-2 border-t border-border">
            <span>Net Tutar:</span>
            <span className="tabular-nums text-text">{formatCurrency(totals.net_total)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">KDV Oranı:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                className="w-14 bg-surface border border-border rounded px-2 py-0.5 text-right text-xs tabular-nums"
              />
              <span className="text-text-muted">%</span>
            </div>
          </div>

          <div className="flex justify-between font-bold text-base text-brand-navy pt-2 border-t border-border">
            <span>Genel Toplam:</span>
            <span className="tabular-nums">{formatCurrency(totals.grand_total)}</span>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-navy py-2.5 rounded-lg text-sm font-bold transition shadow-sm mt-3"
          >
            {loading ? "Kaydediliyor..." : "Teklifi Güncelle"}
          </button>
        </div>
      </div>
    </div>
  );
}
