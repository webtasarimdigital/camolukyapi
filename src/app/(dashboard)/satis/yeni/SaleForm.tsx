"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSaleWithItems, quickCreateCustomer, SaleItemInput } from "./actions";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Search, 
  ShoppingCart, 
  CreditCard, 
  Calendar, 
  User, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Layers,
  Percent,
  ReceiptText,
  UserPlus,
  Tag,
  ArrowRight,
  PackageCheck,
  X
} from "lucide-react";

interface CustomerOption {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string;
  type: string;
  tax_office?: string | null;
  tax_number?: string | null;
  address?: string | null;
}

interface ProductOption {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  default_sale_price: number | null;
  cost_price?: number | null;
  stock_qty: number;
  product_group?: string | null;
  series_name?: string | null;
  size?: string | null;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
}

interface ItemRow {
  tempId: string;
  productId: string | null;
  productCode: string;
  productName: string;
  unit: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  costPrice?: number;
}

export function SaleForm({
  customers: initialCustomers,
  products,
  creatorName,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  creatorName: string;
}) {
  const router = useRouter();

  // Customers state (allows dynamically adding new ones)
  const [customerList, setCustomerList] = useState<CustomerOption[]>(initialCustomers);
  const [customerMode, setCustomerMode] = useState<"registered" | "new" | "retail">("registered");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [retailCustomerName, setRetailCustomerName] = useState<string>("Perakende Müşteri");

  // New Customer Form State
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustTaxOffice, setNewCustTaxOffice] = useState("");
  const [newCustTaxNumber, setNewCustTaxNumber] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Sale Meta
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");

  // Items added to the sale (the Cart)
  const [items, setItems] = useState<ItemRow[]>([]);

  // Product Search & Staging Box State
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [stagedProduct, setStagedProduct] = useState<ProductOption | null>(null);
  const [stagedQty, setStagedQty] = useState<number>(1);
  const [stagedPrice, setStagedPrice] = useState<number>(0);
  const [stagedDiscountType, setStagedDiscountType] = useState<"percent" | "fixed">("percent");
  const [stagedDiscountValue, setStagedDiscountValue] = useState<number>(0);
  const [stagedSelectedQuality, setStagedSelectedQuality] = useState<"q1" | "q2" | "commercial" | "custom">("q1");

  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Financial & VAT
  const [vatRate, setVatRate] = useState<number>(20);

  // Payment State
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paymentMethod, setPaymentMethod] = useState<"nakit" | "havale_eft" | "kredi_karti" | "cek">("nakit");
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>("");

  // Anti-double-click / Cooldown
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customerList.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customerList.filter(c => 
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 10);
  }, [customerList, customerSearch]);

  // Filtered products for quick picker across all 936 items
  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products.filter(p => 
      p.product_name.toLowerCase().includes(q) ||
      p.product_code.toLowerCase().includes(q) ||
      (p.series_name && p.series_name.toLowerCase().includes(q)) ||
      (p.size && p.size.toLowerCase().includes(q)) ||
      (p.product_group && p.product_group.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [products, productSearchQuery]);

  // When user picks a product from search
  const handleSelectProduct = (product: ProductOption) => {
    setStagedProduct(product);
    const initialPrice = product.price_quality_1 ?? product.default_sale_price ?? 0;
    setStagedPrice(initialPrice);
    setStagedSelectedQuality(product.price_quality_1 ? "q1" : "custom");
    setStagedQty(1);
    setStagedDiscountType("percent");
    setStagedDiscountValue(0);
    setIsSearchOpen(false);
  };

  // Quick Quality Price Setter
  const handleSetQualityPrice = (quality: "q1" | "q2" | "commercial") => {
    if (!stagedProduct) return;
    setStagedSelectedQuality(quality);
    if (quality === "q1" && stagedProduct.price_quality_1) {
      setStagedPrice(stagedProduct.price_quality_1);
    } else if (quality === "q2" && stagedProduct.price_quality_2) {
      setStagedPrice(stagedProduct.price_quality_2);
    } else if (quality === "commercial" && stagedProduct.price_commercial) {
      setStagedPrice(stagedProduct.price_commercial);
    }
  };

  // Add Staged Item to the Cart
  const handleAddStagedItem = () => {
    if (!stagedProduct) return;
    if (stagedQty <= 0) {
      toast.error("Lütfen geçerli bir miktar giriniz.");
      return;
    }

    const newItem: ItemRow = {
      tempId: "item-" + Date.now() + Math.random(),
      productId: stagedProduct.id,
      productCode: stagedProduct.product_code,
      productName: stagedProduct.product_name,
      unit: stagedProduct.unit || "M2",
      size: stagedProduct.size || undefined,
      quantity: stagedQty,
      unitPrice: stagedPrice,
      discountType: stagedDiscountType,
      discountValue: stagedDiscountValue,
      costPrice: stagedProduct.cost_price || undefined,
    };

    setItems(prev => [...prev, newItem]);
    toast.success(`"${stagedProduct.product_name}" satışa eklendi!`, {
      description: "Şimdi 2. ürünü arayabilir veya satışı tamamlayabilirsiniz.",
      icon: <CheckCircle2 className="text-emerald-500" size={16} />
    });

    // Reset staging
    setStagedProduct(null);
    setProductSearchQuery("");
    setStagedQty(1);
    setStagedPrice(0);
    setStagedDiscountValue(0);
  };

  // Add Free-text Item to the Cart
  const handleAddFreeItem = () => {
    const newItem: ItemRow = {
      tempId: "free-" + Date.now() + Math.random(),
      productId: null,
      productCode: "",
      productName: "Serbest Kalem",
      unit: "Adet",
      quantity: 1,
      unitPrice: 0,
      discountType: "percent",
      discountValue: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  // Remove Item from Cart
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    toast.info("Ürün sepetten kaldırıldı.");
  };

  // Update Item inline in cart
  const handleUpdateItem = (index: number, field: keyof ItemRow, value: any) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Handle Quick Customer Creation
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
        taxOffice: newCustTaxOffice.trim() || undefined,
        taxNumber: newCustTaxNumber.trim() || undefined,
        address: newCustAddress.trim() || undefined,
      });

      const created = res.customer as CustomerOption;
      setCustomerList(prev => [created, ...prev]);
      setSelectedCustomerId(created.id);
      setCustomerMode("registered");
      toast.success(`Müşteri "${created.company_name}" kaydedildi ve seçildi!`);
      // Reset form
      setNewCustName("");
      setNewCustPhone("");
      setNewCustTaxOffice("");
      setNewCustTaxNumber("");
      setNewCustAddress("");
    } catch (err: any) {
      toast.error("Müşteri oluşturulamadı: " + err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  // Calculated items with totals
  const calculatedItems = useMemo(() => {
    return items.map(item => {
      const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      let discountAmount = 0;
      if (item.discountType === "percent") {
        discountAmount = lineSubtotal * ((Number(item.discountValue) || 0) / 100);
      } else {
        discountAmount = Number(item.discountValue) || 0;
      }
      discountAmount = Math.min(lineSubtotal, Math.max(0, discountAmount));
      const lineTotal = Math.max(0, lineSubtotal - discountAmount);

      return {
        ...item,
        lineSubtotal,
        discountAmount,
        lineTotal,
      };
    });
  }, [items]);

  // Overall totals
  const totals = useMemo(() => {
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const discountTotal = calculatedItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const netTotal = Math.max(0, subtotal - discountTotal);
    const vatTotal = netTotal * (vatRate / 100);
    const grandTotal = netTotal + vatTotal;

    return {
      subtotal,
      discountTotal,
      netTotal,
      vatTotal,
      grandTotal,
    };
  }, [calculatedItems, vatRate]);

  // Effective Paid Amount
  const effectivePaidAmount = paymentStatus === "paid" 
    ? totals.grandTotal 
    : paymentStatus === "partial" 
      ? Math.min(totals.grandTotal, Math.max(0, customPaidAmount))
      : 0;

  const remainingAmount = Math.max(0, totals.grandTotal - effectivePaidAmount);

  // Staged Item Live Calculation
  const stagedSubtotal = (Number(stagedQty) || 0) * (Number(stagedPrice) || 0);
  const stagedDiscountAmount = stagedDiscountType === "percent"
    ? stagedSubtotal * ((Number(stagedDiscountValue) || 0) / 100)
    : Number(stagedDiscountValue) || 0;
  const stagedLineTotal = Math.max(0, stagedSubtotal - Math.min(stagedSubtotal, stagedDiscountAmount));

  // Submit Sale with Debounce / 10s cooldown
  const handleSubmitSale = async () => {
    if (isSubmitting || cooldownRemaining > 0) return;

    // Validation
    if (customerMode === "registered" && !selectedCustomerId) {
      toast.error("Lütfen bir müşteri seçiniz veya 'Perakende Müşteri' moduna geçiniz.");
      return;
    }

    if (customerMode === "retail" && !retailCustomerName.trim()) {
      toast.error("Lütfen perakende müşteri adını giriniz.");
      return;
    }

    if (items.length === 0) {
      toast.error("Lütfen satışa en az 1 adet ürün ekleyiniz.");
      return;
    }

    setIsSubmitting(true);

    try {
      const salePayloadItems: SaleItemInput[] = calculatedItems.map(it => ({
        productId: it.productId,
        productCode: it.productCode || null,
        productName: it.productName,
        unit: it.unit,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discountType: (it.discountType === "percent" || it.discountType === "fixed") ? it.discountType : null,
        discountValue: Number(it.discountValue || 0),
        discountAmount: Number(it.discountAmount || 0),
        lineTotal: Number(it.lineTotal),
        costPrice: it.costPrice,
      }));

      const res = await createSaleWithItems({
        customerId: customerMode === "registered" ? selectedCustomerId : null,
        retailCustomerName: customerMode === "retail" ? retailCustomerName : undefined,
        saleDate,
        items: salePayloadItems,
        vatRate,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        netTotal: totals.netTotal,
        vatTotal: totals.vatTotal,
        grandTotal: totals.grandTotal,
        paymentStatus,
        paidAmount: effectivePaidAmount,
        paymentMethod: paymentStatus !== "unpaid" ? paymentMethod : undefined,
        notes: notes.trim() || undefined,
        dueDate: paymentStatus !== "paid" && dueDate ? dueDate : undefined,
      });

      toast.success("Satış başarıyla kaydedildi! Gelir ve ciro dashboard'a işlendi.", {
        duration: 5000,
        icon: <CheckCircle2 className="text-emerald-500" />,
      });

      // 10 second cooldown timer
      let remaining = 10;
      setCooldownRemaining(remaining);
      const timer = setInterval(() => {
        remaining -= 1;
        setCooldownRemaining(remaining);
        if (remaining <= 0) clearInterval(timer);
      }, 1000);

      router.push(`/satislar/${res.saleId}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Hata: " + (err.message || "Satış kaydedilirken bir hata oluştu."));
      setIsSubmitting(false);
    }
  };

  const selectedCustomerObj = customerList.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      
      {/* 1. Üst Başlık */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2.5">
            <ShoppingCart className="text-brand-navy" size={24} />
            Hızlı Satış & Sipariş Oluştur
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Satış Temsilcisi: <strong className="text-text">{creatorName}</strong> • Katalog: <strong>{products.length}</strong> Aktif Ürün
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold bg-surface px-3.5 py-2 rounded-xl border border-border">
            <Calendar size={15} className="text-text-muted" />
            <span>Satış Tarihi:</span>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-text outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. Müşteri Bölümü */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <User className="text-brand-navy" size={18} />
            1. Müşteri Seçimi / Ekleme
          </h2>

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
              🏢 Kayıtlı Müşteri
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
              <UserPlus size={13} />
              + Yeni Müşteri Ekle
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
              👤 Perakende / Hızlı Müşteri
            </button>
          </div>
        </div>

        {/* MOD 1: Kayıtlı Müşteri Seçimi */}
        {customerMode === "registered" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  Müşteri Ara & Seç ({customerList.length} Müşteri)
                </label>
                <input
                  type="text"
                  placeholder="Müşteri veya firma adı ile filtrele..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-surface/50 mb-2 focus:bg-white transition outline-none focus:border-brand-navy"
                />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-white font-medium text-text outline-none focus:border-brand-navy"
                >
                  <option value="">-- Müşteri Seçiniz --</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.contact_name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomerObj ? (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-sm">
                      {selectedCustomerObj.company_name || selectedCustomerObj.contact_name}
                    </span>
                    <span className="bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded font-semibold uppercase text-[10px]">
                      {selectedCustomerObj.type || "Kayıtlı"}
                    </span>
                  </div>
                  <p className="text-emerald-700">📞 {selectedCustomerObj.phone || "Telefon yok"}</p>
                  {selectedCustomerObj.address && (
                    <p className="text-emerald-700">📍 {selectedCustomerObj.address}</p>
                  )}
                  {selectedCustomerObj.tax_number && (
                    <p className="text-emerald-700">🏛 Vergi: {selectedCustomerObj.tax_office || ""} - {selectedCustomerObj.tax_number}</p>
                  )}
                </div>
              ) : (
                <div className="bg-surface border border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center text-text-muted text-xs">
                  <Building2 size={24} className="mb-1 opacity-50" />
                  <span>Sol taraftan bir müşteri seçin veya yukarıdan <strong>"+ Yeni Müşteri Ekle"</strong> butonuna basın.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOD 2: Hızlı Yeni Müşteri Ekle */}
        {customerMode === "new" && (
          <form onSubmit={handleQuickCreateCustomer} className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-brand-navy flex items-center gap-1.5">
                <UserPlus size={16} /> Yeni Müşteri Bilgileri
              </span>
              <span className="text-[11px] text-text-muted">Kaydedildiği anda satışa otomatik atanır</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Firma / Müşteri Adı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Yılmaz İnşaat Ltd."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Telefon</label>
                <input
                  type="text"
                  placeholder="05xx xxx xx xx"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Vergi Dairesi & No</label>
                <input
                  type="text"
                  placeholder="Üsküdar VD - 1234567890"
                  value={newCustTaxNumber}
                  onChange={(e) => setNewCustTaxNumber(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Adres</label>
                <input
                  type="text"
                  placeholder="Şehir / İlçe / Adres..."
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
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
                className="bg-brand-navy text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-navy/90 flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingCustomer ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Müşteriyi Kaydet ve Satışa Ata
              </button>
            </div>
          </form>
        )}

        {/* MOD 3: Perakende Müşteri */}
        {customerMode === "retail" && (
          <div className="max-w-md">
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Perakende Müşteri Adı / Açıklama
            </label>
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

      {/* 3. Ürün Arama & Kalem Ekleme Bölümü (Kullanıcının İstediği Akıllı Arama & Tamamlama Paneli) */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <PackageCheck className="text-emerald-600" size={18} />
              2. Ürün Ara & Siparişe Ekle
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Ürün adını veya kodunu biraz yazın, gelen listeden seçin ve miktarı girip <strong>"Kalemi Satışa Ekle"</strong> butonuna basın.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddFreeItem}
            className="bg-surface border border-border text-text-muted px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-100 flex items-center gap-1.5 flex-shrink-0"
          >
            <Tag size={13} /> + Serbest Kalem Ekle
          </button>
        </div>

        {/* Arama Inputu ve Otomatik Tamamlama */}
        <div ref={searchBoxRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              value={productSearchQuery}
              onChange={(e) => {
                setProductSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="🔍 Ürün Adı, Kodu, Ebatı veya Serisini Yazın... (Örn: Amazonit, 55018, 120*280, Ambra, Art Lava...)"
              className="w-full pl-10 pr-10 py-3 bg-surface border-2 border-border rounded-xl text-sm font-medium text-text outline-none focus:border-brand-gold focus:bg-white transition"
            />
            {productSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setProductSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Açılır Ürün Listesi */}
          {isSearchOpen && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-border shadow-xl max-h-80 overflow-y-auto divide-y divide-border">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-3 hover:bg-surface/80 cursor-pointer transition flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded">
                          {p.product_code}
                        </span>
                        <span className="text-sm font-semibold text-text truncate">
                          {p.product_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                        {p.size && <span>Ebat: <strong className="text-text">{p.size}</strong></span>}
                        {p.series_name && <span>Seri: <strong className="text-text">{p.series_name}</strong></span>}
                        {p.product_group && <span>Grup: {p.product_group}</span>}
                        <span>Birim: {p.unit || "M2"}</span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3 flex-shrink-0">
                      <div>
                        {p.price_quality_1 ? (
                          <p className="text-xs font-bold text-emerald-700 tabular-nums">
                            1. Kalite: {formatCurrency(p.price_quality_1)}
                          </p>
                        ) : null}
                        {p.price_quality_2 ? (
                          <p className="text-[11px] text-text-muted tabular-nums">
                            2. Kalite: {formatCurrency(p.price_quality_2)}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="bg-brand-gold text-brand-navy px-3 py-1.5 rounded-lg text-xs font-bold group-hover:bg-brand-navy group-hover:text-white transition shadow-xs"
                      >
                        Seç →
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-text-muted">
                  Aramanıza uygun ürün bulunamadı.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Seçilen Ürün Düzenleme & Kalem Tamamlama Kutusu */}
        {stagedProduct && (
          <div className="bg-emerald-50/40 border-2 border-emerald-300 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Seçilen Ürün Bilgileri
                </span>
                <h3 className="text-base font-bold text-text mt-1">
                  [{stagedProduct.product_code}] {stagedProduct.product_name}
                </h3>
                <p className="text-xs text-text-muted">
                  Ebat: {stagedProduct.size || "-"} • Seri: {stagedProduct.series_name || "-"} • Birim: <strong>{stagedProduct.unit || "M2"}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStagedProduct(null)}
                className="text-xs text-rose-600 hover:underline flex items-center gap-1"
              >
                <X size={14} /> Vazgeç / Farklı Ürün Seç
              </button>
            </div>

            {/* Fiyat Seçimi (1. Kalite, 2. Kalite, Ticari Fiyat butonları) */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">
                Katalog Fiyatını Uygula veya Özel Fiyat Yaz:
              </label>
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
                    <span>1. Kalite Brüt:</span>
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
                    <span>2. Kalite Brüt:</span>
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
                    <span>Ticari Kalite:</span>
                    <span>{formatCurrency(stagedProduct.price_commercial)}</span>
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
                  value={stagedQty}
                  onChange={(e) => setStagedQty(parseFloat(e.target.value) || 0)}
                  className="w-full border-2 border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-text outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  Birim Satış Fiyatı (₺) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={stagedPrice}
                  onChange={(e) => {
                    setStagedPrice(parseFloat(e.target.value) || 0);
                    setStagedSelectedQuality("custom");
                  }}
                  className="w-full border-2 border-border rounded-lg px-3 py-2 text-sm font-bold text-text outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1">
                  İskonto (İsteğe Bağlı)
                </label>
                <div className="flex gap-1">
                  <select
                    value={stagedDiscountType}
                    onChange={(e) => setStagedDiscountType(e.target.value as "percent" | "fixed")}
                    className="border border-border rounded-lg px-2 py-2 text-xs bg-surface font-semibold outline-none"
                  >
                    <option value="percent">%</option>
                    <option value="fixed">₺</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={stagedDiscountValue}
                    onChange={(e) => setStagedDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder="0"
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

            {/* Kalemi Satışa Ekle (Tamamla) Butonu */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddStagedItem}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition transform active:scale-95"
              >
                <CheckCircle2 size={18} />
                <span>✓ Kalemi Satışa Ekle (Listeye Al)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Satıştaki Ürünler (Sepet Tablosu) */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/40">
          <div>
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <ReceiptText className="text-brand-navy" size={18} />
              3. Satış Sepeti ({calculatedItems.length} Kalem Ürün)
            </h2>
          </div>
          {calculatedItems.length > 0 && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              Ara Toplam: {formatCurrency(totals.netTotal)}
            </span>
          )}
        </div>

        {calculatedItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border text-text-muted text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4 text-left w-12">#</th>
                  <th className="py-3 px-4 text-left">Ürün Kodu & Adı</th>
                  <th className="py-3 px-4 text-center w-28">Miktar</th>
                  <th className="py-3 px-4 text-right w-36">Birim Fiyat</th>
                  <th className="py-3 px-4 text-center w-28">İskonto</th>
                  <th className="py-3 px-4 text-right w-36">Toplam</th>
                  <th className="py-3 px-4 text-center w-14">Sil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calculatedItems.map((item, idx) => (
                  <tr key={item.tempId} className="hover:bg-surface/50 transition">
                    <td className="py-3 px-4 text-xs font-mono text-text-muted">{idx + 1}</td>
                    <td className="py-3 px-4">
                      {!item.productId ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleUpdateItem(idx, "productName", e.target.value)}
                            placeholder="Ürün veya Hizmet Adı Yazın..."
                            className="w-full border border-amber-300 rounded-lg px-2.5 py-1 text-sm font-bold text-text bg-amber-50/50 outline-none focus:border-brand-navy"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                              Elle Giriş
                            </span>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleUpdateItem(idx, "unit", e.target.value)}
                              placeholder="Birim"
                              className="w-16 border border-border rounded px-1.5 py-0.5 text-xs text-text-muted"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-bold text-text text-sm">{item.productName}</p>
                          <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                            {item.productCode && (
                              <span className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-[11px]">
                                {item.productCode}
                              </span>
                            )}
                            {item.size && <span>Ebat: {item.size}</span>}
                            <span>Birim: {item.unit}</span>
                          </div>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-16 border border-border rounded-lg px-2 py-1 text-center text-sm font-bold outline-none focus:border-brand-navy"
                        />
                        <span className="text-xs text-text-muted font-medium">{item.unit}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-24 border border-border rounded-lg px-2 py-1 text-right text-sm font-bold outline-none focus:border-brand-navy"
                        />
                        <span className="text-xs text-text-muted">₺</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.discountValue > 0 ? (
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded">
                          {item.discountType === "percent" ? `%${item.discountValue}` : formatCurrency(item.discountValue)}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-text tabular-nums text-sm">
                      {formatCurrency(item.lineTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                        title="Kalemi Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-text-muted space-y-2">
            <ShoppingCart size={36} className="mx-auto text-text-muted/40" />
            <p className="text-sm font-semibold text-text">Henüz satış sepetine ürün eklenmedi</p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Yukarıdaki <strong>"Ürün Ara & Siparişe Ekle"</strong> alanından ürün seçip <strong>"Kalemi Satışa Ekle"</strong> butonuna basın.
            </p>
          </div>
        )}
      </div>

      {/* 5. Ödeme & Satış Özeti & Tamamlama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Ödeme Detayları */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3">
            <CreditCard className="text-brand-navy" size={18} />
            4. Ödeme & Tahsilat Bilgileri
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPaymentStatus("paid")}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentStatus === "paid"
                  ? "bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20"
                  : "bg-white border-border text-text-muted hover:border-emerald-300"
              }`}
            >
              <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Peşin Tahsil Edildi
              </span>
              <span className="text-[11px] text-text-muted mt-1">Ciro ve kasaya anında gelir olarak işlenir</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentStatus("partial")}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentStatus === "partial"
                  ? "bg-amber-50/80 border-amber-500 text-amber-950 ring-2 ring-amber-500/20"
                  : "bg-white border-border text-text-muted hover:border-amber-300"
              }`}
            >
              <span className="text-xs font-bold text-amber-800">
                🟡 Kısmi Ödeme (Peşinat)
              </span>
              <span className="text-[11px] text-text-muted mt-1">Alınan tutar kasaya, kalanı cari borca yazılır</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentStatus("unpaid")}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentStatus === "unpaid"
                  ? "bg-rose-50/80 border-rose-500 text-rose-950 ring-2 ring-rose-500/20"
                  : "bg-white border-border text-text-muted hover:border-rose-300"
              }`}
            >
              <span className="text-xs font-bold text-rose-800">
                🔴 Açık Hesap / Veresiye
              </span>
              <span className="text-[11px] text-text-muted mt-1">Tahsilatsız satış, müşteriye borç kaydedilir</span>
            </button>
          </div>

          {/* Ödeme yöntemi ve Peşinat Miktarı */}
          {paymentStatus !== "unpaid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Tahsilat Yöntemi</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-white font-medium outline-none focus:border-brand-navy"
                >
                  <option value="nakit">Nakit Kasa</option>
                  <option value="havale_eft">Banka Havale / EFT</option>
                  <option value="kredi_karti">Kredi Kartı / POS</option>
                  <option value="cek">Çek / Senet</option>
                </select>
              </div>

              {paymentStatus === "partial" && (
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Alınan Peşinat Tutarı (₺)</label>
                  <input
                    type="number"
                    step="any"
                    value={customPaidAmount}
                    onChange={(e) => setCustomPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full border-2 border-amber-300 rounded-xl px-3.5 py-2 text-sm font-bold text-text outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-text-muted mt-0.5 block">
                    Kalan Cari Borç: <strong>{formatCurrency(remainingAmount)}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {paymentStatus !== "paid" && (
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Vade Tarihi (Opsiyonel)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full sm:w-1/2 border border-border rounded-xl px-3.5 py-2 text-sm bg-white outline-none focus:border-brand-navy"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Sipariş & Satış Notu</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Siparişle ilgili özel açıklamalar, sevk detayları..."
              className="w-full border border-border rounded-xl p-3 text-sm bg-white outline-none focus:border-brand-navy"
            />
          </div>
        </div>

        {/* Fiyat Özeti & Satışı Tamamla Butonu */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-text border-b border-border pb-3">
              Hesap Özeti
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>Ara Toplam:</span>
                <span className="font-semibold text-text tabular-nums">{formatCurrency(totals.subtotal)}</span>
              </div>

              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Toplam İskonto:</span>
                  <span className="tabular-nums">-{formatCurrency(totals.discountTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-text-muted items-center">
                <span>KDV (%{vatRate}):</span>
                <span className="font-semibold text-text tabular-nums">{formatCurrency(totals.vatTotal)}</span>
              </div>

              <div className="border-t border-border pt-3 flex justify-between items-baseline">
                <span className="font-bold text-text text-base">Genel Toplam:</span>
                <span className="font-black text-xl text-brand-navy tabular-nums">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>

              {paymentStatus !== "paid" && (
                <div className="bg-surface p-3 rounded-xl space-y-1 text-xs mt-2 border border-border">
                  <div className="flex justify-between">
                    <span>Tahsil Edilen:</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(effectivePaidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kalan Borç:</span>
                    <span className="font-bold text-rose-700">{formatCurrency(remainingAmount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tamamlama Butonu */}
          <button
            type="button"
            onClick={handleSubmitSale}
            disabled={isSubmitting || cooldownRemaining > 0 || calculatedItems.length === 0}
            className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-navy py-4 rounded-xl font-black text-base shadow-md transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Satış Kaydediliyor...</span>
              </>
            ) : cooldownRemaining > 0 ? (
              <>
                <CheckCircle2 size={20} className="text-emerald-700" />
                <span>Satış Tamamlandı ({cooldownRemaining}s)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span>Satışı Tamamla ve Kaydet</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
