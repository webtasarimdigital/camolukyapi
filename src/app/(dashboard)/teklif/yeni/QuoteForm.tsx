"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { calculateLine, calculateTotals } from "@/lib/calculations";
import { saveQuote, quickCreateCustomer, searchCustomersLive, searchProductsLive } from "./actions";
import { toast } from "sonner";
import {
  Loader2, FileCheck, Printer, Search, X, CheckCircle2, UserPlus,
  Building2, User, Tag, Trash2, PackageCheck, AlertTriangle,
  Phone, Mail, MapPin, FileText, Briefcase
} from "lucide-react";
import { extractPlasiyer } from "@/lib/customer-helpers";

export interface CustomerOption {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string;
  type?: string;
  tax_office?: string | null;
  tax_number?: string | null;
  address?: string | null;
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
  description_snapshot: string;
  unit_snapshot: string;
  price_source: "quality_1" | "quality_2" | "commercial" | "default" | "custom";
  quantity: number;
  unit_price: number;
  discount_type: "percent" | "fixed" | null;
  discount_value: number;
  line_subtotal: number;
  discount_amount: number;
  line_total: number;
  stock_qty?: number | null;
  brand?: string | null;
  series_name?: string | null;
  size?: string | null;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
}

export function QuoteForm({
  creatorName,
  defaultSettings,
  customers: initialCustomers,
  products: initialProducts,
}: {
  creatorName: string;
  defaultSettings: any;
  customers: CustomerOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ──────────────────── CUSTOMER (CANLI VERİTABANI ARAMASI: 7,903 MÜŞTERİ) ────────────────────
  const [customerMode, setCustomerMode] = useState<"registered" | "new" | "retail">("registered");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>(initialCustomers.slice(0, 30));
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const customerBoxRef = useRef<HTMLDivElement>(null);

  // Yeni Müşteri Formu
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustTaxOffice, setNewCustTaxOffice] = useState("");
  const [newCustTaxNumber, setNewCustTaxNumber] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Perakende
  const [retailCustomerName, setRetailCustomerName] = useState("Perakende Müşteri");

  // ──────────────────── QUOTE META ────────────────────
  const d = new Date();
  d.setDate(d.getDate() + (defaultSettings?.quote_validity_days || 7));
  const [validUntil, setValidUntil] = useState(d.toISOString().split("T")[0]);
  const [deliveryTerms, setDeliveryTerms] = useState(defaultSettings?.default_delivery_terms || "");
  const [paymentTerms, setPaymentTerms] = useState(defaultSettings?.default_payment_terms || "");
  const [notes, setNotes] = useState("");

  // ──────────────────── ITEMS ────────────────────
  const [items, setItems] = useState<QuoteLineItem[]>([]);

  // ──────────────────── PRODUCT SEARCH (CANLI VERİTABANI ARAMASI: 4,371 ÜRÜN & STOK) ────────────────────
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductOption[]>(initialProducts.slice(0, 30));
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const productBoxRef = useRef<HTMLDivElement>(null);

  // Staging
  const [stagedProduct, setStagedProduct] = useState<ProductOption | null>(null);
  const [stagedQty, setStagedQty] = useState(1);
  const [stagedPrice, setStagedPrice] = useState(0);
  const [stagedDiscountType, setStagedDiscountType] = useState<"percent" | "fixed">("percent");
  const [stagedDiscountValue, setStagedDiscountValue] = useState(0);
  const [stagedSelectedQuality, setStagedSelectedQuality] = useState<"q1" | "q2" | "commercial" | "custom">("q1");

  // ──────────────────── TOTALS & DISCOUNTS ────────────────────
  const [generalDiscountType, setGeneralDiscountType] = useState<"percent" | "fixed" | null>(null);
  const [generalDiscountValue, setGeneralDiscountValue] = useState(0);
  const [vatRate, setVatRate] = useState(defaultSettings?.default_vat_rate || 20);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerBoxRef.current && !customerBoxRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (productBoxRef.current && !productBoxRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ──────────────────── DEBOUNCED CUSTOMER SEARCH ────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = customerSearchQuery.trim();
      if (!q) {
        setCustomerResults(initialCustomers.slice(0, 30));
        return;
      }
      setIsSearchingCustomers(true);
      try {
        const results = await searchCustomersLive(q);
        setCustomerResults(results);
      } catch (err) {
        console.error("Müşteri arama hatası:", err);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, initialCustomers]);

  // ──────────────────── DEBOUNCED PRODUCT SEARCH ────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = productSearchQuery.trim();
      if (!q) {
        setProductResults(initialProducts.slice(0, 30));
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
  }, [productSearchQuery, initialProducts]);

  // Müşteri Seçimi
  const handleSelectCustomer = (c: CustomerOption) => {
    setSelectedCustomer(c);
    setSelectedCustomerId(c.id);
    setIsCustomerDropdownOpen(false);
    setCustomerSearchQuery("");
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setSelectedCustomerId("");
  };

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

  // Kalemi Teklif Listesine Ekle
  const handleAddStagedItem = () => {
    if (!stagedProduct) return;
    if (stagedQty <= 0) {
      toast.error("Lütfen geçerli bir miktar giriniz.");
      return;
    }
    const calc = calculateLine({
      quantity: stagedQty,
      unit_price: stagedPrice,
      discount_type: stagedDiscountType,
      discount_value: stagedDiscountValue,
    });
    const newItem: QuoteLineItem = {
      id: crypto.randomUUID(),
      product_id: stagedProduct.id,
      product_code_snapshot: stagedProduct.product_code,
      product_name_snapshot: stagedProduct.product_name,
      description_snapshot: [
        stagedProduct.brand ? `Marka: ${stagedProduct.brand}` : "",
        stagedProduct.series_name ? `Seri: ${stagedProduct.series_name}` : "",
        stagedProduct.size ? `Ebat: ${stagedProduct.size}` : ""
      ].filter(Boolean).join(" • "),
      unit_snapshot: stagedProduct.unit || "M2",
      price_source: stagedSelectedQuality === "q1" ? "quality_1" : stagedSelectedQuality === "q2" ? "quality_2" : stagedSelectedQuality === "commercial" ? "commercial" : "custom",
      quantity: stagedQty,
      unit_price: stagedPrice,
      discount_type: stagedDiscountType,
      discount_value: stagedDiscountValue,
      ...calc,
      stock_qty: stagedProduct.stock_qty,
      brand: stagedProduct.brand,
      series_name: stagedProduct.series_name,
      size: stagedProduct.size,
      price_quality_1: stagedProduct.price_quality_1,
      price_quality_2: stagedProduct.price_quality_2,
      price_commercial: stagedProduct.price_commercial,
    };
    setItems(prev => [...prev, newItem]);
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
  const handleAddFreeItem = () => {
    const newItem: QuoteLineItem = {
      id: crypto.randomUUID(),
      product_id: null,
      product_code_snapshot: "",
      product_name_snapshot: "Serbest Kalem",
      description_snapshot: "",
      unit_snapshot: "Adet",
      price_source: "custom",
      quantity: 1,
      unit_price: 0,
      discount_type: "percent",
      discount_value: 0,
      line_subtotal: 0,
      discount_amount: 0,
      line_total: 0,
      stock_qty: null,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<QuoteLineItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        const calc = calculateLine({
          quantity: updated.quantity,
          unit_price: updated.unit_price,
          discount_type: updated.discount_type,
          discount_value: updated.discount_value,
        });
        return { ...updated, ...calc };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  // Hesaplamalar
  const calculatedLines = useMemo(() => {
    return items.map(item => calculateLine({
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
    }));
  }, [items]);

  const totals = useMemo(() => {
    return calculateTotals(calculatedLines, vatRate, generalDiscountType, generalDiscountValue);
  }, [calculatedLines, vatRate, generalDiscountType, generalDiscountValue]);

  // Hızlı Müşteri Ekleme
  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.error("Lütfen müşteri / firma adını giriniz.");
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await quickCreateCustomer({
        companyName: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        taxNumber: newCustTaxNumber.trim() || undefined,
        address: newCustAddress.trim() || undefined,
      });
      const created = res.customer as CustomerOption;
      setSelectedCustomer(created);
      setSelectedCustomerId(created.id);
      setCustomerMode("registered");
      toast.success(`Müşteri "${created.company_name}" başarıyla oluşturuldu ve teklife eklendi!`);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustTaxOffice("");
      setNewCustTaxNumber("");
      setNewCustAddress("");
      setNewCustEmail("");
    } catch (err: any) {
      toast.error("Müşteri oluşturulamadı: " + err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  // Müşteri Snapshot Bilgisi
  const buildCustomerSnapshot = () => {
    if (customerMode === "registered" && selectedCustomer) {
      return {
        company_name: selectedCustomer.company_name,
        contact_name: selectedCustomer.contact_name,
        phone: selectedCustomer.phone,
        address: selectedCustomer.address,
        tax_office: selectedCustomer.tax_office,
        tax_number: selectedCustomer.tax_number,
        email: selectedCustomer.email,
        type: selectedCustomer.type,
      };
    }
    if (customerMode === "retail") {
      return {
        company_name: retailCustomerName || "Perakende Müşteri",
        contact_name: retailCustomerName || "Perakende Müşteri",
        phone: "-",
        address: "-",
        tax_office: "-",
        tax_number: "-",
        email: "-",
        type: "Perakende",
      };
    }
    return {
      company_name: "Bilinmeyen Müşteri",
      contact_name: "-",
      phone: "-",
      address: "-",
      tax_office: "-",
      tax_number: "-",
      email: "-",
      type: "Diğer",
    };
  };

  const handleSave = async (print: boolean) => {
    if (items.length === 0) {
      toast.error("Lütfen teklife en az 1 ürün kalemi ekleyiniz.");
      return;
    }
    if (customerMode === "registered" && !selectedCustomerId) {
      toast.error("Lütfen kayıtlı müşteriler arasından bir müşteri seçiniz veya yeni müşteri oluşturunuz.");
      return;
    }
    try {
      setLoading(true);
      const res = await saveQuote({
        customerId: customerMode === "registered" ? selectedCustomerId : null,
        customerSnapshot: buildCustomerSnapshot(),
        items,
        generalDiscountType,
        generalDiscountValue,
        vatRate,
        validUntil,
        deliveryTerms,
        paymentTerms,
        warrantyTerms: "",
        returnTerms: "",
        notes,
        creatorName,
      });

      if (!res.success || !res.quoteId) {
        toast.error(res.error || "Teklif kaydedilemedi.");
        return;
      }

      toast.success("Teklif başarıyla kaydedildi!");
      if (print) {
        router.push(`/teklif-yazdir/${res.quoteId}?autoPrint=true`);
      } else {
        router.push(`/teklifler/${res.quoteId}`);
      }
    } catch (err: any) {
      toast.error("Hata: " + (err?.message || "Teklif kaydedilemedi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* ──────────────────── 1. MÜŞTERİ BÖLÜMÜ ──────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <User className="text-brand-navy" size={20} />
            <div>
              <h2 className="text-sm font-bold text-text">1. Müşteri Bilgileri</h2>
              <p className="text-xs text-text-muted">7.900+ Müşteri arasından anında arayın veya yeni müşteri açın.</p>
            </div>
          </div>
          <div className="flex gap-1.5 p-1 bg-surface border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setCustomerMode("registered")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                customerMode === "registered"
                  ? "bg-white text-brand-navy shadow-xs border border-border"
                  : "text-text-muted hover:text-text"
              }`}
            >
              🏢 Kayıtlı Müşteri (7.900+)
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("new")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                customerMode === "new"
                  ? "bg-brand-navy text-white shadow-xs"
                  : "text-brand-navy hover:bg-white"
              }`}
            >
              <UserPlus size={13} /> + Yeni Müşteri
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("retail")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                customerMode === "retail"
                  ? "bg-white text-brand-navy shadow-xs border border-border"
                  : "text-text-muted hover:text-text"
              }`}
            >
              👤 Perakende
            </button>
          </div>
        </div>

        {/* KAYITLI MÜŞTERİ MODU */}
        {customerMode === "registered" && (
          <div className="space-y-4">
            {!selectedCustomer ? (
              <div ref={customerBoxRef} className="relative">
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Müşteri Ara & Seç (Firma adı, yetkili kişi, telefon, vergi no veya adres ile anında ara):
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    placeholder="🔍 Örn: Çamoluk, Ahmet, 0532, 1234567890..."
                    className="w-full pl-10 pr-10 py-3 bg-surface border-2 border-border rounded-xl text-sm font-medium text-text outline-none focus:border-brand-navy focus:bg-white transition"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearchQuery("");
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                    >
                      <X size={16} />
                    </button>
                  )}
                  {isSearchingCustomers && (
                    <Loader2 size={16} className="animate-spin text-brand-navy absolute right-10 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-border shadow-xl max-h-80 overflow-y-auto divide-y divide-border">
                    {customerResults.length > 0 ? (
                      customerResults.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="p-3.5 hover:bg-emerald-50/60 cursor-pointer transition flex items-center justify-between gap-4 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-text text-sm group-hover:text-emerald-700">
                                {c.company_name || c.contact_name || "İsimsiz Müşteri"}
                              </span>
                              {extractPlasiyer(c.notes) && (
                                <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                  👔 {extractPlasiyer(c.notes)?.replace(/-\[.*?\]$/, "")}
                                </span>
                              )}
                              {c.type && (
                                <span className="bg-surface border border-border text-text-muted px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                                  {c.type}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-text-muted mt-1.5">
                              {c.contact_name && (
                                <span className="flex items-center gap-1">
                                  <User size={12} className="text-text-muted" /> {c.contact_name}
                                </span>
                              )}
                              {c.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={12} className="text-text-muted" /> {c.phone}
                                </span>
                              )}
                              {c.tax_number && (
                                <span className="flex items-center gap-1">
                                  <FileText size={12} className="text-text-muted" /> V.No: {c.tax_office ? `${c.tax_office} - ` : ""}{c.tax_number}
                                </span>
                              )}
                              {c.address && (
                                <span className="col-span-full flex items-center gap-1 text-[11px] truncate">
                                  <MapPin size={12} className="text-text-muted flex-shrink-0" /> {c.address}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="bg-brand-navy text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold group-hover:bg-emerald-600 transition shadow-xs flex-shrink-0"
                          >
                            Seç →
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-text-muted">
                        Aramanıza uygun müşteri bulunamadı. Yeni müşteri sekmesinden hemen ekleyebilirsiniz.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* SEÇİLEN MÜŞTERİNİN TÜM DETAYLARINI GÖSTEREN KART */
              <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-5 relative shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-emerald-700" size={20} />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      Seçili Müşteri
                    </span>
                    <span className="text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 px-2 py-0.5 rounded">
                      {selectedCustomer.type || "Kayıtlı Müşteri"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedCustomer}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 px-3 py-1 rounded-lg flex items-center gap-1 transition"
                  >
                    <X size={14} /> Müşteriyi Değiştir
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 text-xs">
                  <div>
                    <span className="block text-text-muted text-[11px] font-semibold mb-0.5">Firma / Ünvan:</span>
                    <p className="font-bold text-sm text-emerald-950">
                      {selectedCustomer.company_name || selectedCustomer.contact_name || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="block text-text-muted text-[11px] font-semibold mb-0.5">Yetkili Kişi:</span>
                    <p className="font-semibold text-text flex items-center gap-1.5">
                      <User size={13} className="text-emerald-600" />
                      {selectedCustomer.contact_name || "-"}
                    </p>
                  </div>
                  {extractPlasiyer(selectedCustomer.notes) && (
                    <div>
                      <span className="block text-text-muted text-[11px] font-semibold mb-0.5">Plasiyer / Temsilci:</span>
                      <p className="font-bold text-amber-800 flex items-center gap-1.5">
                        <Briefcase size={13} className="text-amber-600" />
                        {extractPlasiyer(selectedCustomer.notes)}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="block text-text-muted text-[11px] font-semibold mb-0.5">Telefon:</span>
                    <p className="font-semibold text-text flex items-center gap-1.5">
                      <Phone size={13} className="text-emerald-600" />
                      {selectedCustomer.phone || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="block text-text-muted text-[11px] font-semibold mb-0.5">E-posta:</span>
                    <p className="font-semibold text-text flex items-center gap-1.5">
                      <Mail size={13} className="text-emerald-600" />
                      {selectedCustomer.email || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="block text-text-muted text-[11px] font-semibold mb-0.5">Vergi Dairesi / No:</span>
                    <p className="font-semibold text-text flex items-center gap-1.5">
                      <FileText size={13} className="text-emerald-600" />
                      {selectedCustomer.tax_office || selectedCustomer.tax_number
                        ? `${selectedCustomer.tax_office || "-"} / ${selectedCustomer.tax_number || "-"}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="block text-text-muted text-[11px] font-semibold mb-0.5">Açık Adres:</span>
                    <p className="font-medium text-text flex items-start gap-1.5">
                      <MapPin size={13} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{selectedCustomer.address || "-"}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* YENİ MÜŞTERİ MODU */}
        {customerMode === "new" && (
          <form onSubmit={handleQuickCreateCustomer} className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2">
              <span className="text-xs font-bold text-brand-navy flex items-center gap-1.5">
                <UserPlus size={16} /> Yeni Müşteri Kartı Oluştur
              </span>
              <span className="text-[11px] text-text-muted">Kaydedildiğinde bu teklife otomatik atanacaktır</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Firma / Ünvan *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Yılmaz İnşaat Taah. Ltd. Şti."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Telefon</label>
                <input
                  type="text"
                  placeholder="05xx xxx xx xx"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">E-posta</label>
                <input
                  type="email"
                  placeholder="info@yilmazinsaat.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Vergi Dairesi</label>
                <input
                  type="text"
                  placeholder="Kadıköy"
                  value={newCustTaxOffice}
                  onChange={(e) => setNewCustTaxOffice(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Vergi Numarası / TCKN</label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={newCustTaxNumber}
                  onChange={(e) => setNewCustTaxNumber(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Açık Adres</label>
                <input
                  type="text"
                  placeholder="Mahalle, Sokak, İlçe / Şehir"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-navy"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCustomerMode("registered")}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white text-text-muted hover:text-text"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={savingCustomer}
                className="bg-brand-navy text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-brand-navy/90 flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                {savingCustomer ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Müşteriyi Kaydet ve Teklife Ata
              </button>
            </div>
          </form>
        )}

        {/* PERAKENDE MODU */}
        {customerMode === "retail" && (
          <div className="max-w-md bg-surface p-4 rounded-xl border border-border">
            <label className="block text-xs font-semibold text-text mb-1.5">Perakende Müşteri Adı / Ünvanı</label>
            <input
              type="text"
              value={retailCustomerName}
              onChange={(e) => setRetailCustomerName(e.target.value)}
              placeholder="Örn: Nakit Müşteri, Ahmet Bey..."
              className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-white font-medium text-text outline-none focus:border-brand-navy"
            />
          </div>
        )}
      </div>

      {/* ──────────────────── 2. ÜRÜN ARAMA & DEPO STOK DETAYI ──────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <PackageCheck className="text-emerald-600" size={20} />
              2. Ürün Ara & Depo Stok Durumunu İncele
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              4.300+ Ürün arasından kod, isim, marka, ebat veya seri ile canlı arama yapın.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddFreeItem}
            className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100 flex items-center gap-1.5 transition shadow-2xs"
          >
            <Tag size={13} /> + Serbest Kalem Ekle
          </button>
        </div>

        {/* ÜRÜN ARAMA ÇUBUĞU */}
        <div ref={productBoxRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              value={productSearchQuery}
              onChange={(e) => {
                setProductSearchQuery(e.target.value);
                setIsProductDropdownOpen(true);
              }}
              onFocus={() => setIsProductDropdownOpen(true)}
              placeholder="🔍 Ürün Adı, Kodu, Ebatı (60x120), Serisi veya Markasını Yazın (4.300+ Ürün)..."
              className="w-full pl-10 pr-10 py-3 bg-surface border-2 border-border rounded-xl text-sm font-medium text-text outline-none focus:border-brand-gold focus:bg-white transition"
            />
            {productSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setProductSearchQuery("");
                  setIsProductDropdownOpen(false);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            )}
            {isSearchingProducts && (
              <Loader2 size={16} className="animate-spin text-brand-gold absolute right-10 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* ÜRÜN SONUÇLARI DROPDOWN */}
          {isProductDropdownOpen && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-border shadow-xl max-h-96 overflow-y-auto divide-y divide-border">
              {productResults.length > 0 ? (
                productResults.map((p) => {
                  const stock = Number(p.stock_qty) || 0;
                  const hasStock = stock > 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="p-3.5 hover:bg-emerald-50/50 cursor-pointer transition flex items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded">
                            {p.product_code}
                          </span>
                          <span className="text-sm font-bold text-text truncate group-hover:text-emerald-700">
                            {p.product_name}
                          </span>
                        </div>

                        {/* Detay Bilgileri & Depo Stoku */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          {p.brand && (
                            <span className="bg-surface px-2 py-0.5 rounded font-medium text-text">
                              Marka: {p.brand}
                            </span>
                          )}
                          {p.series_name && (
                            <span className="bg-surface px-2 py-0.5 rounded font-medium text-text">
                              Seri: {p.series_name}
                            </span>
                          )}
                          {p.size && (
                            <span className="bg-surface px-2 py-0.5 rounded font-medium text-text">
                              Ebat: {p.size}
                            </span>
                          )}
                          {p.product_group && (
                            <span className="text-[11px] text-text-muted">
                              Grup: {p.product_group}
                            </span>
                          )}

                          {/* CANLI DEPO STOK ROZETİ */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              hasStock
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${hasStock ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                            {hasStock ? `${stock} ${p.unit || "M2"} Depoda Mevcut` : `Stokta Yok (0 ${p.unit || "M2"})`}
                          </span>
                        </div>
                      </div>

                      {/* FİYATLAR & BUTON */}
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
                          className="bg-brand-gold text-brand-navy px-3.5 py-1.5 rounded-lg text-xs font-bold group-hover:bg-brand-navy group-hover:text-white transition shadow-xs"
                        >
                          Seç →
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-text-muted">
                  Aramanıza uygun ürün bulunamadı. Lütfen ürün kodunu veya adını kontrol edin.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ──────────────────── SEÇİLEN ÜRÜN STAGING KUTUSU ──────────────────── */}
        {stagedProduct && (
          <div className="bg-emerald-50/50 border-2 border-emerald-300 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
                    Seçilen Ürün
                  </span>
                  <span className="font-mono text-xs font-bold text-brand-navy bg-white border border-emerald-300 px-2 py-0.5 rounded">
                    {stagedProduct.product_code}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text mt-1.5">{stagedProduct.product_name}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-text-muted mt-1">
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                    (stagedProduct.stock_qty || 0) > 0
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : "bg-rose-100 text-rose-900 border-rose-300"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${(stagedProduct.stock_qty || 0) > 0 ? "bg-emerald-600 animate-pulse" : "bg-rose-600"}`}></span>
                  <span>
                    Depo Stoku: <strong>{stagedProduct.stock_qty ?? 0} {stagedProduct.unit || "M2"}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStagedProduct(null)}
                  className="text-xs text-rose-600 hover:text-rose-800 bg-white border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
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
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-border text-text hover:bg-surface"
                  >
                    <span>Liste Fiyatı:</span>
                    <span>{formatCurrency(stagedProduct.default_sale_price)}</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Miktar, Birim Fiyat, İskonto ve Tutar Alanları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-border items-end">
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
                  className="w-full border-2 border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-text outline-none focus:border-emerald-500"
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
                  className="w-full border-2 border-border rounded-lg px-3 py-2 text-sm font-bold text-text outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">İskonto</label>
                <div className="flex gap-1">
                  <select
                    value={stagedDiscountType}
                    onChange={(e) => setStagedDiscountType(e.target.value as "percent" | "fixed")}
                    className="border border-border rounded-lg px-2 py-2 text-xs bg-surface font-semibold outline-none cursor-pointer"
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
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-text-muted mb-1">Kalem Toplamı</span>
                <p className="text-base font-black text-emerald-700 py-1.5 tabular-nums">
                  {formatCurrency(stagedLineTotal)}
                </p>
              </div>
            </div>

            {/* STOK AŞIMI UYARISI */}
            {stagedQty > (stagedProduct.stock_qty || 0) && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="text-amber-600 flex-shrink-0" size={18} />
                <span>
                  <strong>Dikkat:</strong> Girilen miktar ({stagedQty} {stagedProduct.unit || "M2"}), mevcut depo stokundan ({stagedProduct.stock_qty || 0} {stagedProduct.unit || "M2"}) fazladır.
                  Stok açığı: <strong>{stagedQty - (stagedProduct.stock_qty || 0)} {stagedProduct.unit || "M2"}</strong>. Teklif kaydedilebilir ancak teslimat için tedarik gerekecektir.
                </span>
              </div>
            )}

            {/* Buton */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddStagedItem}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition transform active:scale-95"
              >
                <CheckCircle2 size={18} />
                <span>✓ Kalemi Teklif Listesine Ekle</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────── 3. TEKLİF LİSTESİ (SEPET) ──────────────────── */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/40">
          <div className="flex items-center gap-2">
            <PackageCheck className="text-brand-navy" size={18} />
            <h2 className="text-sm font-bold text-text">
              3. Teklif Listesi ({items.length} Kalem)
            </h2>
          </div>
          {items.length > 0 && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
              Ara Toplam: {formatCurrency(totals.subtotal)}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[950px]">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-text-muted uppercase w-10">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-text-muted uppercase">Ürün Adı & Depo Stoku</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-text-muted uppercase w-28">Miktar</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-text-muted uppercase w-20">Birim</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-text-muted uppercase w-32">Birim Fiyat</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-text-muted uppercase w-32">İskonto</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-text-muted uppercase w-28">İsk Tutarı</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-text-muted uppercase w-32">Tutar</th>
                <th className="text-center px-3 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-text-muted text-sm">
                    Henüz ürün eklenmedi. Yukarıdan ürün arayın veya serbest kalem ekleyin.
                  </td>
                </tr>
              )}
              {items.map((item, idx) => {
                const calc = calculatedLines[idx];
                const stock = item.stock_qty;
                const isOutOfStock = stock !== null && stock !== undefined && stock <= 0;
                const isExceedingStock = stock !== null && stock !== undefined && stock > 0 && item.quantity > stock;
                const hasSufficientStock = stock !== null && stock !== undefined && stock >= item.quantity;

                return (
                  <tr key={item.id} className="hover:bg-surface/50 transition">
                    <td className="px-3 py-2.5 text-xs text-text-muted font-mono">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <input
                        value={item.product_name_snapshot}
                        onChange={(e) => handleUpdateItem(item.id, { product_name_snapshot: e.target.value })}
                        className="w-full border border-border rounded px-2 py-1 text-sm font-semibold text-text"
                      />
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                        {item.product_code_snapshot && (
                          <span className="font-mono text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border/60">
                            Kod: {item.product_code_snapshot}
                          </span>
                        )}
                        {item.brand && (
                          <span className="text-text-muted">
                            Marka: <strong className="text-text">{item.brand}</strong>
                          </span>
                        )}
                        {item.size && (
                          <span className="text-text-muted">
                            Ebat: <strong className="text-text">{item.size}</strong>
                          </span>
                        )}

                        {/* STOK ROZETİ */}
                        {stock !== null && stock !== undefined ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              hasSufficientStock
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                : isExceedingStock
                                ? "bg-amber-50 text-amber-900 border border-amber-300"
                                : "bg-rose-50 text-rose-800 border border-rose-300"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                hasSufficientStock ? "bg-emerald-500" : isExceedingStock ? "bg-amber-500" : "bg-rose-500"
                              }`}
                            ></span>
                            {hasSufficientStock
                              ? `${stock} ${item.unit_snapshot} Depoda Var`
                              : isExceedingStock
                              ? `Depoda ${stock} ${item.unit_snapshot} Var (${item.quantity - stock} Eksik!)`
                              : `Stokta Yok (0 ${item.unit_snapshot})`}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            Serbest Kalem
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        value={item.quantity === 0 ? "" : item.quantity}
                        placeholder="1"
                        step="any"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-20 border border-border rounded px-2 py-1 text-sm text-center font-bold outline-none focus:border-brand-gold"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        value={item.unit_snapshot}
                        onChange={(e) => handleUpdateItem(item.id, { unit_snapshot: e.target.value })}
                        className="w-16 border border-border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        value={item.unit_price === 0 ? "" : item.unit_price}
                        placeholder="0.00"
                        step="any"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleUpdateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-24 border border-border rounded px-2 py-1 text-sm text-right font-bold outline-none focus:border-brand-gold"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <select
                          value={item.discount_type || "percent"}
                          onChange={(e) => {
                            const newType = e.target.value as "percent" | "fixed";
                            handleUpdateItem(item.id, { discount_type: newType });
                          }}
                          className="border border-border rounded px-1 py-1 text-xs bg-surface font-semibold outline-none cursor-pointer"
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
                          className="w-16 border border-border rounded px-2 py-1 text-xs text-right font-bold outline-none focus:border-brand-gold"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-rose-600 font-semibold tabular-nums">
                      {calc.discount_amount > 0 ? `-${formatCurrency(calc.discount_amount)}` : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                      {formatCurrency(calc.line_total)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
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

      {/* ──────────────────── 4. TEKLİF KOŞULLARI & TOPLAMLAR ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-border space-y-3">
          <h3 className="text-sm font-bold text-text border-b border-border pb-2">Teklif Koşulları</h3>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Geçerlilik Tarihi</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Teslimat Koşulları</label>
            <input
              type="text"
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              placeholder="Stok durumuna göre teslim edilecektir."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Ödeme Koşulları</label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Peşin / Havale"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notlar</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-border rounded-lg p-3 text-sm min-h-[70px]"
              placeholder="Müşteriye iletilecek teklif notları..."
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border flex flex-col justify-between">
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-text border-b border-border pb-2">Hesap Özeti</h3>
            <div className="flex justify-between items-center text-text-muted">
              <span>Ara Toplam:</span>
              <span className="tabular-nums font-semibold text-text">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.line_discount_total > 0 && (
              <div className="flex justify-between items-center text-rose-600">
                <span>Satır İskontoları:</span>
                <span className="tabular-nums">-{formatCurrency(totals.line_discount_total)}</span>
              </div>
            )}

            {/* Genel İskonto */}
            <div className="bg-surface/80 p-3 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Tag size={13} className="text-brand-gold" />
                  Genel İskonto:
                </span>
                {totals.general_discount_amount > 0 && (
                  <span className="text-xs font-bold text-rose-600 tabular-nums">
                    -{formatCurrency(totals.general_discount_amount)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border bg-white overflow-hidden p-0.5 flex-shrink-0">
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
                    className={`px-2.5 py-1 text-xs font-bold rounded transition cursor-pointer ${
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
                    className={`px-2.5 py-1 text-xs font-bold rounded transition cursor-pointer ${
                      generalDiscountType === "fixed"
                        ? "bg-brand-navy text-white shadow-xs"
                        : "text-text-muted hover:text-text hover:bg-surface"
                    }`}
                  >
                    ₺ Tutar
                  </button>
                </div>

                {generalDiscountType ? (
                  <div className="flex-1 flex items-center gap-1.5 bg-white border-2 border-brand-navy/30 focus-within:border-brand-navy rounded-lg px-2.5 py-1 transition">
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
                    Tüm teklife iskonto uygulamak için % veya ₺ seçin
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center font-medium pt-1 border-t border-border">
              <span>Net Tutar:</span>
              <span className="tabular-nums font-semibold">{formatCurrency(totals.net_total)}</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span className="flex items-center gap-2">
                KDV: %
                <input
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="w-12 border border-border rounded px-1.5 py-0.5 text-xs text-right font-semibold"
                />
              </span>
              <span className="tabular-nums font-semibold">{formatCurrency(totals.vat_total)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-brand-navy pt-2 border-t border-border">
              <span>Genel Toplam:</span>
              <span className="tabular-nums">{formatCurrency(totals.grand_total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={loading || items.length === 0}
              className="w-full bg-surface text-brand-navy px-6 py-3 rounded-xl text-sm font-semibold border border-border hover:bg-gray-100 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <FileCheck size={16} />
                  <span>Taslak Kaydet</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading || items.length === 0}
              className="w-full bg-brand-gold text-brand-navy px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-gold-light transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Printer size={16} />
                  <span>Kaydet & PDF Olarak İndir</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
