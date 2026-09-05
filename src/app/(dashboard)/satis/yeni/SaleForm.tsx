"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSaleWithItems, SaleItemInput } from "./actions";
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
  ReceiptText
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
  cost_price: number | null;
  stock_qty: number;
  product_group: string | null;
}

interface ItemRow {
  tempId: string;
  productId: string | null;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  stockQty?: number;
  unitPrice: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  costPrice?: number;
}

export function SaleForm({
  customers,
  products,
  creatorName,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  creatorName: string;
}) {
  const router = useRouter();

  // Customer Mode: 'registered' or 'retail'
  const [customerMode, setCustomerMode] = useState<"registered" | "retail">("retail");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [retailCustomerName, setRetailCustomerName] = useState<string>("Perakende Müşteri");

  // Sale Meta
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");

  // Items State
  const [items, setItems] = useState<ItemRow[]>([
    {
      tempId: "init-1",
      productId: null,
      productCode: "",
      productName: "",
      unit: "m²",
      quantity: 1,
      unitPrice: 0,
      discountType: "percent",
      discountValue: 0,
    }
  ]);

  // Product Autocomplete Modal / Dropdown Search
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [activeItemIndexForSearch, setActiveItemIndexForSearch] = useState<number | null>(null);

  // Financial & VAT
  const [vatRate, setVatRate] = useState<number>(20);

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paymentMethod, setPaymentMethod] = useState<"nakit" | "havale_eft" | "kredi_karti" | "cek">("nakit");
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>("");

  // Anti-double-click / Cooldown
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Filtered customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customers.filter(c => 
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 10);
  }, [customers, customerSearch]);

  // Filtered products for quick picker
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products.slice(0, 15);
    const q = productSearchQuery.toLowerCase();
    return products.filter(p => 
      p.product_name.toLowerCase().includes(q) ||
      p.product_code.toLowerCase().includes(q) ||
      (p.product_group && p.product_group.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [products, productSearchQuery]);

  // Calculate line item totals
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

  // Calculated overall totals
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

  // Update line item
  const updateItem = (index: number, field: keyof ItemRow, value: any) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Add line item
  const addBlankItem = () => {
    setItems(prev => [
      ...prev,
      {
        tempId: "item-" + Date.now() + Math.random(),
        productId: null,
        productCode: "",
        productName: "",
        unit: "Adet",
        quantity: 1,
        unitPrice: 0,
        discountType: "percent",
        discountValue: 0,
      }
    ]);
  };

  // Select product from catalog
  const handleSelectProduct = (index: number, product: ProductOption) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productId: product.id,
        productCode: product.product_code,
        productName: product.product_name,
        unit: product.unit || "Adet",
        unitPrice: product.default_sale_price || 0,
        costPrice: product.cost_price || 0,
        stockQty: product.stock_qty,
      };
      return next;
    });
    setActiveItemIndexForSearch(null);
    setProductSearchQuery("");
  };

  // Delete line item
  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.info("En az 1 satır bulunmalıdır.");
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Effective Paid Amount
  const effectivePaidAmount = paymentStatus === "paid" 
    ? totals.grandTotal 
    : paymentStatus === "partial" 
      ? Math.min(totals.grandTotal, Math.max(0, customPaidAmount))
      : 0;

  const remainingAmount = Math.max(0, totals.grandTotal - effectivePaidAmount);

  // Submit Sale with Debounce / 10s cooldown
  const handleSubmit = async () => {
    if (isSubmitting || cooldownRemaining > 0) return;

    // Validation
    if (customerMode === "registered" && !selectedCustomerId) {
      toast.error("Lütfen bir müşteri seçiniz veya 'Perakende Satış' moduna geçiniz.");
      return;
    }

    if (customerMode === "retail" && !retailCustomerName.trim()) {
      toast.error("Lütfen perakende müşteri adını giriniz.");
      return;
    }

    const invalidItem = calculatedItems.find(it => !it.productName.trim() || it.quantity <= 0);
    if (invalidItem) {
      toast.error("Lütfen tüm ürünlerin adını ve miktarını geçerli giriniz.");
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
        discountType: it.discountType,
        discountValue: Number(it.discountValue),
        discountAmount: Number(it.discountAmount),
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

      toast.success("Satış başarıyla kaydedildi ve stoklar düşüldü!", {
        duration: 5000,
        icon: <CheckCircle2 className="text-green-500" />,
      });

      // 10 second cooldown timer to prevent accidental double-clicks
      let remaining = 10;
      setCooldownRemaining(remaining);
      const timer = setInterval(() => {
        remaining -= 1;
        setCooldownRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      router.push(`/satislar/${res.saleId}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Hata: " + (err.message || "Satış kaydedilirken bir hata oluştu."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* 1. Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <ShoppingCart className="text-brand-navy" size={22} />
            Hızlı & Detaylı Satış Oluştur
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Satış Temsilcisi: <strong className="text-text">{creatorName}</strong> • Tarih: {saleDate}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold bg-surface px-3 py-1.5 rounded-xl border border-border">
            <Calendar size={14} className="text-text-muted" />
            <span>Satış Tarihi:</span>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="bg-transparent font-medium text-text border-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Customer Selection Section */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <User size={18} className="text-brand-gold" />
            Müşteri Bilgileri
          </h3>

          <div className="flex bg-surface p-1 rounded-xl border border-border text-xs">
            <button
              type="button"
              onClick={() => setCustomerMode("retail")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                customerMode === "retail" 
                  ? "bg-brand-navy text-white shadow-xs" 
                  : "text-text-muted hover:text-text"
              }`}
            >
              Hızlı Perakende / Nakit
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("registered")}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                customerMode === "registered" 
                  ? "bg-brand-navy text-white shadow-xs" 
                  : "text-text-muted hover:text-text"
              }`}
            >
              Kayıtlı Müşteri Seç
            </button>
          </div>
        </div>

        {customerMode === "retail" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Perakende / Nakit Müşteri Adı
              </label>
              <input
                type="text"
                value={retailCustomerName}
                onChange={(e) => setRetailCustomerName(e.target.value)}
                placeholder="Örn: Ahmet Bey (Perakende)"
                className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand-gold focus:outline-none"
              />
            </div>
            <div className="flex items-center text-xs text-text-muted bg-surface/50 p-3 rounded-xl border border-border/60">
              <span>Perakende müşteriler için ayrı cari kart açılması gerekmez. Satış doğrudan ciroya işlenir.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <label className="block text-xs font-medium text-text-muted mb-1">
                Müşteri Ara & Seç (Firma Adı veya Telefon)
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-text-muted" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Müşteri ara..."
                  className="w-full text-sm border border-border rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-brand-gold focus:outline-none"
                />
              </div>

              {/* Suggestions dropdown */}
              {customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filteredCustomers.map(cust => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setCustomerSearch(cust.company_name || cust.contact_name || "");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-surface text-xs flex items-center justify-between border-b border-border last:border-0"
                    >
                      <div>
                        <b className="text-text">{cust.company_name || cust.contact_name}</b>
                        {cust.contact_name && cust.company_name && (
                          <span className="text-text-muted ml-2">({cust.contact_name})</span>
                        )}
                      </div>
                      <span className="text-text-muted font-mono">{cust.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomerId && (
              <div className="bg-blue-50/60 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold">Seçili Müşteri:</span>{" "}
                  {customers.find(c => c.id === selectedCustomerId)?.company_name || customers.find(c => c.id === selectedCustomerId)?.contact_name}
                  <span className="ml-3 text-blue-700 font-mono">
                    Tel: {customers.find(c => c.id === selectedCustomerId)?.phone}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomerId(""); setCustomerSearch(""); }}
                  className="text-red-600 hover:underline font-semibold"
                >
                  Değiştir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Items & Products Section */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Layers size={18} className="text-brand-navy" />
              Satış Kalemleri
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Stoktan ürün seçebilir veya serbest kalem girebilir, miktar ve fiyatları anlık düzenleyebilirsiniz.
            </p>
          </div>

          <button
            type="button"
            onClick={addBlankItem}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-surface hover:bg-neutral-200 text-text px-3.5 py-1.5 rounded-xl border border-border transition cursor-pointer"
          >
            <Plus size={14} /> Yeni Kalem Ekle
          </button>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-surface border-b border-border text-text-muted uppercase text-[10px] font-bold">
              <tr>
                <th className="p-2.5 text-center w-8">#</th>
                <th className="p-2.5 text-left min-w-[220px]">Ürün Açıklaması / Stok Seçimi</th>
                <th className="p-2.5 text-right w-20">Miktar</th>
                <th className="p-2.5 text-center w-24">Birim</th>
                <th className="p-2.5 text-right w-28">Birim Fiyat</th>
                <th className="p-2.5 text-right w-28">İskonto</th>
                <th className="p-2.5 text-right w-32">Toplam (KDV Hariç)</th>
                <th className="p-2.5 text-center w-10">Sil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {calculatedItems.map((item, idx) => (
                <tr key={item.tempId} className="hover:bg-surface/30 transition">
                  {/* # */}
                  <td className="p-2 text-center text-text-muted font-semibold">
                    {idx + 1}
                  </td>

                  {/* Product Name & Inventory Picker */}
                  <td className="p-2">
                    <div className="space-y-1">
                      <div className="relative">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => updateItem(idx, "productName", e.target.value)}
                          placeholder="Ürün adı yazın veya katalogdan seçin..."
                          className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:ring-brand-gold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setActiveItemIndexForSearch(activeItemIndexForSearch === idx ? null : idx)}
                          title="Stok Kataloğundan Seç"
                          className="absolute right-1.5 top-1.5 p-1 text-text-muted hover:text-brand-navy rounded hover:bg-neutral-100"
                        >
                          <Search size={14} />
                        </button>
                      </div>

                      {/* Product details badge */}
                      {item.productId && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="bg-emerald-50 text-emerald-700 font-mono px-1.5 py-0.5 rounded border border-emerald-200">
                            Stok: {item.stockQty ?? 0} {item.unit}
                          </span>
                          {item.productCode && (
                            <span className="text-text-muted">Kod: {item.productCode}</span>
                          )}
                        </div>
                      )}

                      {/* Autocomplete Flyout for this row */}
                      {activeItemIndexForSearch === idx && (
                        <div className="absolute z-30 left-12 mt-1 w-96 bg-white border border-border rounded-xl shadow-xl p-3 space-y-2">
                          <div className="flex items-center justify-between border-b border-border pb-1.5">
                            <span className="font-bold text-[11px] text-text">Stok Kataloğundan Ürün Seç</span>
                            <button
                              type="button"
                              onClick={() => setActiveItemIndexForSearch(null)}
                              className="text-text-muted hover:text-black font-bold text-xs"
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            type="text"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            placeholder="Ürün kodu veya adı ile filtrele..."
                            autoFocus
                            className="w-full text-xs border border-border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-brand-gold focus:outline-none"
                          />
                          <div className="max-h-48 overflow-y-auto divide-y divide-border/60">
                            {filteredProducts.length === 0 ? (
                              <p className="text-center py-3 text-text-muted text-[11px]">Eşleşen ürün bulunamadı</p>
                            ) : (
                              filteredProducts.map(prod => (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(idx, prod)}
                                  className="w-full text-left p-2 hover:bg-surface text-xs flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-bold text-text truncate max-w-[200px]">{prod.product_name}</p>
                                    <p className="text-[10px] text-text-muted font-mono">{prod.product_code} • {prod.product_group || "Genel"}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-text">{formatCurrency(prod.default_sale_price || 0)}</p>
                                    <span className={`text-[9px] px-1 rounded ${(prod.stock_qty || 0) <= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                      Stok: {prod.stock_qty} {prod.unit}
                                    </span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-20 text-right border border-border rounded-lg px-2 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-gold focus:outline-none tabular-nums"
                    />
                  </td>

                  {/* Unit */}
                  <td className="p-2 text-center">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)}
                      className="border border-border rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-1 focus:ring-brand-gold focus:outline-none"
                    >
                      <option value="m²">m²</option>
                      <option value="Adet">Adet</option>
                      <option value="Paket">Paket</option>
                      <option value="Kutu">Kutu</option>
                      <option value="mt">mt</option>
                      <option value="kg">kg</option>
                      <option value="Ton">Ton</option>
                      <option value="Torba">Torba</option>
                      <option value="Sefer">Sefer</option>
                    </select>
                  </td>

                  {/* Unit Price */}
                  <td className="p-2 text-right">
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-text-muted text-[11px]">₺</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="w-24 text-right border border-border rounded-lg pl-5 pr-2 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-brand-gold focus:outline-none tabular-nums"
                      />
                    </div>
                  </td>

                  {/* Discount */}
                  <td className="p-2 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => updateItem(idx, "discountType", item.discountType === "percent" ? "fixed" : "percent")}
                        className="text-[10px] px-1.5 py-1 bg-neutral-100 hover:bg-neutral-200 rounded font-bold text-text-muted"
                      >
                        {item.discountType === "percent" ? "%" : "₺"}
                      </button>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.discountValue}
                        onChange={(e) => updateItem(idx, "discountValue", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-16 text-right border border-border rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-brand-gold focus:outline-none tabular-nums"
                      />
                    </div>
                  </td>

                  {/* Line Total */}
                  <td className="p-2 text-right font-bold text-text tabular-nums text-xs">
                    {formatCurrency(item.lineTotal)}
                  </td>

                  {/* Delete Button */}
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      title="Kalemi Sil"
                      className="text-text-muted hover:text-brand-red p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Payment & Totals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Payment Configuration (7 cols) */}
        <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3">
            <CreditCard size={18} className="text-brand-navy" />
            Ödeme ve Tahsilat Bilgileri
          </h3>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => { setPaymentStatus("paid"); setCustomPaidAmount(totals.grandTotal); }}
              className={`p-3 rounded-xl border text-center font-bold transition ${
                paymentStatus === "paid" 
                  ? "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs" 
                  : "border-border text-text-muted hover:bg-surface"
              }`}
            >
              Tamamı Tahsil Edildi
              <span className="block text-[10px] font-normal mt-0.5">Peşin / Kredi Kartı / Havale</span>
            </button>

            <button
              type="button"
              onClick={() => { setPaymentStatus("partial"); setCustomPaidAmount(Math.round(totals.grandTotal / 2)); }}
              className={`p-3 rounded-xl border text-center font-bold transition ${
                paymentStatus === "partial" 
                  ? "bg-amber-50 border-amber-400 text-amber-800 shadow-xs" 
                  : "border-border text-text-muted hover:bg-surface"
              }`}
            >
              Kısmi Tahsilat
              <span className="block text-[10px] font-normal mt-0.5">Kalan Tutar Cari Hesaba</span>
            </button>

            <button
              type="button"
              onClick={() => { setPaymentStatus("unpaid"); setCustomPaidAmount(0); }}
              className={`p-3 rounded-xl border text-center font-bold transition ${
                paymentStatus === "unpaid" 
                  ? "bg-rose-50 border-rose-400 text-rose-800 shadow-xs" 
                  : "border-border text-text-muted hover:bg-surface"
              }`}
            >
              Açık Hesap / Vadeli
              <span className="block text-[10px] font-normal mt-0.5">Tümü Müşteri Carisine</span>
            </button>
          </div>

          {paymentStatus !== "unpaid" && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Ödeme Yöntemi
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-white font-medium focus:ring-1 focus:ring-brand-gold focus:outline-none"
                >
                  <option value="nakit">Nakit (Kasa)</option>
                  <option value="havale_eft">Banka Havalesi / EFT</option>
                  <option value="kredi_karti">Kredi Kartı (POS)</option>
                  <option value="cek">Çek</option>
                </select>
              </div>

              {paymentStatus === "partial" && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Tahsil Edilen Tutar (₺)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={totals.grandTotal}
                    step="any"
                    value={customPaidAmount}
                    onChange={(e) => setCustomPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 focus:ring-1 focus:ring-brand-gold focus:outline-none tabular-nums"
                  />
                </div>
              )}
            </div>
          )}

          {paymentStatus !== "paid" && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Kalan Borç Vade Tarihi
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-brand-gold focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Satış Notu / Açıklama
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sipariş, teslimat veya ödeme ile ilgili notlar..."
              className="w-full border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-brand-gold focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Totals Summary Card (5 cols) */}
        <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3">
            <ReceiptText size={18} className="text-brand-gold" />
            Özet ve Genel Toplam
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Ara Toplam:</span>
              <span className="font-semibold text-text tabular-nums">{formatCurrency(totals.subtotal)}</span>
            </div>

            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-brand-red">
                <span>Toplam İskonto:</span>
                <span className="font-semibold tabular-nums">-{formatCurrency(totals.discountTotal)}</span>
              </div>
            )}

            <div className="flex justify-between text-text font-medium border-t border-border pt-1">
              <span>Net Tutar:</span>
              <span className="font-bold tabular-nums">{formatCurrency(totals.netTotal)}</span>
            </div>

            <div className="flex items-center justify-between text-text-muted">
              <div className="flex items-center gap-1.5">
                <span>KDV:</span>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="bg-surface border border-border rounded px-1.5 py-0.5 text-[11px] font-bold"
                >
                  <option value="20">%20</option>
                  <option value="10">%10</option>
                  <option value="1">%1</option>
                  <option value="0">%0</option>
                </select>
              </div>
              <span className="font-semibold text-text tabular-nums">{formatCurrency(totals.vatTotal)}</span>
            </div>
          </div>

          {/* Grand Total Pill */}
          <div className="bg-brand-navy text-white p-4 rounded-xl flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold block">GENEL TOPLAM</span>
              <span className="text-xs text-neutral-300">KDV Dahil</span>
            </div>
            <span className="text-xl font-black tabular-nums tracking-wide text-brand-gold">
              {formatCurrency(totals.grandTotal)}
            </span>
          </div>

          {/* Paid vs Remaining breakdown */}
          <div className="bg-surface p-3 rounded-xl border border-border space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-emerald-700 font-semibold">
              <span>Tahsil Edilecek / Edilen:</span>
              <span className="tabular-nums">{formatCurrency(effectivePaidAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-700 font-semibold">
              <span>Açıkta Kalan / Alacak:</span>
              <span className="tabular-nums">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          {/* Save & Submit Button with 10s Cooldown protection */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || cooldownRemaining > 0 || totals.grandTotal <= 0}
            className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-navy p-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Satış İşleniyor ve Stok Düşülüyor...</span>
              </>
            ) : cooldownRemaining > 0 ? (
              <>
                <CheckCircle2 size={18} className="text-emerald-800" />
                <span>Kaydedildi! ({cooldownRemaining}s sonra yeni girilebilir)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Satışı Tamamla ve Kaydet</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
