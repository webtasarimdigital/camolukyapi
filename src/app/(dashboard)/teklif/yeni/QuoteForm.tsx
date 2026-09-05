"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { calculateLine, calculateTotals } from "@/lib/calculations";
import { saveQuote, quickCreateCustomer } from "./actions";
import { toast } from "sonner";
import {
  Loader2, FileCheck, Printer, Search, X, CheckCircle2, UserPlus,
  Building2, User, Tag, Trash2, PackageCheck
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
  email?: string | null;
}

interface ProductOption {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  default_sale_price: number | null;
  product_group?: string | null;
  series_name?: string | null;
  size?: string | null;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
}

interface QuoteLineItem {
  id: string;
  product_id: string | null;
  product_code_snapshot: string;
  product_name_snapshot: string;
  description_snapshot: string;
  unit_snapshot: string;
  price_source: "quality_1" | "quality_2" | "commercial" | "custom";
  quantity: number;
  unit_price: number;
  discount_type: "percent" | "fixed" | null;
  discount_value: number;
  line_subtotal: number;
  discount_amount: number;
  line_total: number;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
}

export function QuoteForm({
  creatorName,
  defaultSettings,
  customers: initialCustomers,
  products,
}: {
  creatorName: string;
  defaultSettings: any;
  customers: CustomerOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ──────────────────── CUSTOMER ────────────────────
  const [customerList, setCustomerList] = useState<CustomerOption[]>(initialCustomers);
  const [customerMode, setCustomerMode] = useState<"registered" | "new" | "retail">("registered");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [retailCustomerName, setRetailCustomerName] = useState("Perakende Müşteri");
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustTaxNumber, setNewCustTaxNumber] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // ──────────────────── QUOTE META ────────────────────
  const d = new Date();
  d.setDate(d.getDate() + (defaultSettings?.quote_validity_days || 7));
  const [validUntil, setValidUntil] = useState(d.toISOString().split("T")[0]);
  const [deliveryTerms, setDeliveryTerms] = useState(defaultSettings?.default_delivery_terms || "");
  const [paymentTerms, setPaymentTerms] = useState(defaultSettings?.default_payment_terms || "");
  const [notes, setNotes] = useState("");

  // ──────────────────── ITEMS ────────────────────
  const [items, setItems] = useState<QuoteLineItem[]>([]);

  // ──────────────────── PRODUCT SEARCH ────────────────────
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [stagedProduct, setStagedProduct] = useState<ProductOption | null>(null);
  const [stagedQty, setStagedQty] = useState(1);
  const [stagedPrice, setStagedPrice] = useState(0);
  const [stagedDiscountType, setStagedDiscountType] = useState<"percent" | "fixed">("percent");
  const [stagedDiscountValue, setStagedDiscountValue] = useState(0);
  const [stagedSelectedQuality, setStagedSelectedQuality] = useState<"q1" | "q2" | "commercial" | "custom">("q1");
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // ──────────────────── TOTALS ────────────────────
  const [generalDiscountType, setGeneralDiscountType] = useState<"percent" | "fixed" | null>(null);
  const [generalDiscountValue, setGeneralDiscountValue] = useState(0);
  const [vatRate, setVatRate] = useState(defaultSettings?.default_vat_rate || 20);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customerList.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return customerList.filter(c =>
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 10);
  }, [customerList, customerSearch]);

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

  const selectedCustomerObj = customerList.find(c => c.id === selectedCustomerId);

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

  const handleAddStagedItem = () => {
    if (!stagedProduct) return;
    if (stagedQty <= 0) { toast.error("Lütfen geçerli bir miktar giriniz."); return; }
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
      description_snapshot: stagedProduct.size ? `Ebat: ${stagedProduct.size}` : "",
      unit_snapshot: stagedProduct.unit || "M2",
      price_source: stagedSelectedQuality === "q1" ? "quality_1" : stagedSelectedQuality === "q2" ? "quality_2" : stagedSelectedQuality === "commercial" ? "commercial" : "custom",
      quantity: stagedQty,
      unit_price: stagedPrice,
      discount_type: stagedDiscountType,
      discount_value: stagedDiscountValue,
      ...calc,
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
      discount_type: null,
      discount_value: 0,
      line_subtotal: 0,
      discount_amount: 0,
      line_total: 0,
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

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) { toast.error("Lütfen müşteri / firma adını giriniz."); return; }
    setSavingCustomer(true);
    try {
      const res = await quickCreateCustomer({ companyName: newCustName.trim(), phone: newCustPhone.trim() || undefined, taxNumber: newCustTaxNumber.trim() || undefined, address: newCustAddress.trim() || undefined });
      const created = res.customer as CustomerOption;
      setCustomerList(prev => [created, ...prev]);
      setSelectedCustomerId(created.id);
      setCustomerMode("registered");
      toast.success(`Müşteri "${created.company_name}" kaydedildi ve seçildi!`);
      setNewCustName(""); setNewCustPhone(""); setNewCustTaxNumber(""); setNewCustAddress("");
    } catch (err: any) {
      toast.error("Müşteri oluşturulamadı: " + err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const buildCustomerSnapshot = () => {
    if (customerMode === "registered" && selectedCustomerObj) {
      return {
        company_name: selectedCustomerObj.company_name,
        contact_name: selectedCustomerObj.contact_name,
        phone: selectedCustomerObj.phone,
        address: selectedCustomerObj.address,
        tax_office: selectedCustomerObj.tax_office,
        tax_number: selectedCustomerObj.tax_number,
        email: selectedCustomerObj.email,
      };
    }
    if (customerMode === "retail") {
      return { company_name: retailCustomerName, contact_name: retailCustomerName, phone: "-" };
    }
    return { company_name: "Bilinmeyen Müşteri", contact_name: "-", phone: "-" };
  };

  const handleSave = async (print: boolean) => {
    if (items.length === 0) { toast.error("Lütfen en az 1 kalem ekleyiniz."); return; }
    if (customerMode === "registered" && !selectedCustomerId) {
      toast.error("Lütfen bir müşteri seçiniz."); return;
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
      });
      toast.success("Teklif başarıyla kaydedildi!");
      if (print) {
        router.push(`/teklifler/${res.quoteId}/print?autoPrint=true`);
      } else {
        router.push(`/teklifler/${res.quoteId}`);
      }
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* CUSTOMER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <User className="text-brand-navy" size={18} />
            1. Müşteri Seçimi
          </h2>
          <div className="flex gap-1.5 p-1 bg-surface border border-border rounded-xl">
            <button type="button" onClick={() => setCustomerMode("registered")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${ customerMode === "registered" ? "bg-white text-brand-navy shadow-xs border border-border" : "text-text-muted hover:text-text" }`}>🏢 Kayıtlı Müşteri</button>
            <button type="button" onClick={() => setCustomerMode("new")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${ customerMode === "new" ? "bg-brand-navy text-white shadow-xs" : "text-brand-navy hover:bg-white" }`}><UserPlus size={13} />+ Yeni Müşteri</button>
            <button type="button" onClick={() => setCustomerMode("retail")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${ customerMode === "retail" ? "bg-white text-brand-navy shadow-xs border border-border" : "text-text-muted hover:text-text" }`}>👤 Perakende</button>
          </div>
        </div>

        {customerMode === "registered" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Müşteri Ara & Seç ({customerList.length} Müşteri)</label>
                <input type="text" placeholder="Müşteri veya firma adı ile filtrele..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-surface/50 mb-2 focus:bg-white transition outline-none focus:border-brand-navy" />
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-white font-medium text-text outline-none focus:border-brand-navy">
                  <option value="">-- Müşteri Seçiniz --</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name || c.contact_name} {c.phone ? `(${c.phone})` : ""}</option>
                  ))}
                </select>
              </div>
              {selectedCustomerObj ? (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-sm">{selectedCustomerObj.company_name || selectedCustomerObj.contact_name}</span>
                    <span className="bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded font-semibold uppercase text-[10px]">{selectedCustomerObj.type || "Kayıtlı"}</span>
                  </div>
                  <p className="text-emerald-700">📞 {selectedCustomerObj.phone || "Telefon yok"}</p>
                  {selectedCustomerObj.address && <p className="text-emerald-700">📍 {selectedCustomerObj.address}</p>}
                  {selectedCustomerObj.tax_number && <p className="text-emerald-700">🏛 Vergi: {selectedCustomerObj.tax_office || ""} - {selectedCustomerObj.tax_number}</p>}
                </div>
              ) : (
                <div className="bg-surface border border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center text-text-muted text-xs">
                  <Building2 size={24} className="mb-1 opacity-50" />
                  <span>Sol taraftan bir müşteri seçin</span>
                </div>
              )}
            </div>
          </div>
        )}

        {customerMode === "new" && (
          <form onSubmit={handleQuickCreateCustomer} className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-brand-navy flex items-center gap-1.5"><UserPlus size={16} /> Yeni Müşteri Bilgileri</span>
              <span className="text-[11px] text-text-muted">Kaydedildiğinde teklif müşterisine otomatik atanır</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Firma / Müşteri Adı *</label>
                <input type="text" required placeholder="Yılmaz İnşaat Ltd." value={newCustName} onChange={(e) => setNewCustName(e.target.value)} className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Telefon</label>
                <input type="text" placeholder="05xx xxx xx xx" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Vergi No</label>
                <input type="text" placeholder="1234567890" value={newCustTaxNumber} onChange={(e) => setNewCustTaxNumber(e.target.value)} className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text mb-1">Adres</label>
                <input type="text" placeholder="Şehir / İlçe..." value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} className="w-full bg-white border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setCustomerMode("registered")} className="px-3 py-1.5 text-xs rounded-lg border border-border bg-white text-text-muted hover:text-text">İptal</button>
              <button type="submit" disabled={savingCustomer} className="bg-brand-navy text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-brand-navy/90 flex items-center gap-1.5 disabled:opacity-50">
                {savingCustomer ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Müşteriyi Kaydet ve Teklife Ata
              </button>
            </div>
          </form>
        )}

        {customerMode === "retail" && (
          <div className="max-w-md">
            <label className="block text-xs font-medium text-text-muted mb-1.5">Perakende Müşteri Adı / Açıklama</label>
            <input type="text" value={retailCustomerName} onChange={(e) => setRetailCustomerName(e.target.value)} placeholder="Örn: Nakit Müşteri, Ahmet Bey..." className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-white font-medium text-text outline-none focus:border-brand-navy" />
          </div>
        )}
      </div>

      {/* PRODUCT SEARCH SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <PackageCheck className="text-emerald-600" size={18} />
              2. Ürün Ara & Teklif Listesine Ekle
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Ürün adını veya kodunu yazın, seçin ve kalemi ekleyin.</p>
          </div>
          <button type="button" onClick={handleAddFreeItem} className="bg-surface border border-border text-text-muted px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-100 flex items-center gap-1.5">
            <Tag size={13} /> + Serbest Kalem Ekle
          </button>
        </div>

        {/* Product Search Input */}
        <div ref={searchBoxRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              value={productSearchQuery}
              onChange={(e) => { setProductSearchQuery(e.target.value); setIsSearchOpen(true); }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="🔍 Ürün Adı, Kodu, Ebatı veya Serisini Yazın..."
              className="w-full pl-10 pr-10 py-3 bg-surface border-2 border-border rounded-xl text-sm font-medium text-text outline-none focus:border-brand-gold focus:bg-white transition"
            />
            {productSearchQuery && (
              <button type="button" onClick={() => { setProductSearchQuery(""); setIsSearchOpen(false); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"><X size={16} /></button>
            )}
          </div>

          {isSearchOpen && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-border shadow-xl max-h-80 overflow-y-auto divide-y divide-border">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 hover:bg-surface/80 cursor-pointer transition flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded">{p.product_code}</span>
                        <span className="text-sm font-semibold text-text truncate">{p.product_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                        {p.size && <span>Ebat: <strong className="text-text">{p.size}</strong></span>}
                        {p.series_name && <span>Seri: <strong className="text-text">{p.series_name}</strong></span>}
                        <span>Birim: {p.unit || "M2"}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3 flex-shrink-0">
                      <div>
                        {p.price_quality_1 ? <p className="text-xs font-bold text-emerald-700 tabular-nums">1. Kalite: {formatCurrency(p.price_quality_1)}</p> : null}
                        {p.price_quality_2 ? <p className="text-[11px] text-text-muted tabular-nums">2. Kalite: {formatCurrency(p.price_quality_2)}</p> : null}
                      </div>
                      <button type="button" className="bg-brand-gold text-brand-navy px-3 py-1.5 rounded-lg text-xs font-bold group-hover:bg-brand-navy group-hover:text-white transition shadow-xs">Seç →</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-text-muted">Aramanıza uygun ürün bulunamadı.</div>
              )}
            </div>
          )}
        </div>

        {/* Staging Box */}
        {stagedProduct && (
          <div className="bg-emerald-50/40 border-2 border-emerald-300 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Seçilen Ürün</span>
                <h3 className="text-base font-bold text-text mt-1">[{stagedProduct.product_code}] {stagedProduct.product_name}</h3>
                <p className="text-xs text-text-muted">Ebat: {stagedProduct.size || "-"} • Seri: {stagedProduct.series_name || "-"} • Birim: <strong>{stagedProduct.unit || "M2"}</strong></p>
              </div>
              <button type="button" onClick={() => setStagedProduct(null)} className="text-xs text-rose-600 hover:underline flex items-center gap-1"><X size={14} /> Vazgeç</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">Katalog Fiyatını Uygula:</label>
              <div className="flex flex-wrap gap-2">
                {stagedProduct.price_quality_1 && (
                  <button type="button" onClick={() => handleSetQualityPrice("q1")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${ stagedSelectedQuality === "q1" ? "bg-emerald-600 text-white shadow-xs" : "bg-white border border-border text-emerald-700 hover:bg-emerald-50" }`}>
                    1. Kalite: {formatCurrency(stagedProduct.price_quality_1)}
                  </button>
                )}
                {stagedProduct.price_quality_2 && (
                  <button type="button" onClick={() => handleSetQualityPrice("q2")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${ stagedSelectedQuality === "q2" ? "bg-emerald-600 text-white shadow-xs" : "bg-white border border-border text-text-muted hover:bg-surface" }`}>
                    2. Kalite: {formatCurrency(stagedProduct.price_quality_2)}
                  </button>
                )}
                {stagedProduct.price_commercial && (
                  <button type="button" onClick={() => handleSetQualityPrice("commercial")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${ stagedSelectedQuality === "commercial" ? "bg-emerald-600 text-white shadow-xs" : "bg-white border border-border text-text-muted hover:bg-surface" }`}>
                    Ticari: {formatCurrency(stagedProduct.price_commercial)}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-border items-end">
              <div>
                <label className="block text-xs font-bold text-text mb-1">Miktar ({stagedProduct.unit || "M2"}) *</label>
                <input type="number" min="0.01" step="any" value={stagedQty} onChange={(e) => setStagedQty(parseFloat(e.target.value) || 0)} className="w-full border-2 border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-text outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-1">Birim Satış Fiyatı (₺) *</label>
                <input type="number" step="any" value={stagedPrice} onChange={(e) => { setStagedPrice(parseFloat(e.target.value) || 0); setStagedSelectedQuality("custom"); }} className="w-full border-2 border-border rounded-lg px-3 py-2 text-sm font-bold text-text outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-1">İskonto</label>
                <div className="flex gap-1">
                  <select value={stagedDiscountType} onChange={(e) => setStagedDiscountType(e.target.value as "percent" | "fixed")} className="border border-border rounded-lg px-2 py-2 text-xs bg-surface font-semibold outline-none">
                    <option value="percent">%</option>
                    <option value="fixed">₺</option>
                  </select>
                  <input type="number" min="0" step="any" value={stagedDiscountValue} onChange={(e) => setStagedDiscountValue(parseFloat(e.target.value) || 0)} placeholder="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <span className="block text-[11px] text-text-muted mb-1">Kalem Toplamı</span>
                <p className="text-base font-black text-emerald-700 py-1.5 tabular-nums">{formatCurrency(stagedLineTotal)}</p>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button type="button" onClick={handleAddStagedItem} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition transform active:scale-95">
                <CheckCircle2 size={18} />
                <span>✓ Kalemi Teklif Listesine Ekle</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ITEMS TABLE */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface/40">
          <h2 className="text-sm font-bold text-text">3. Teklif Listesi ({items.length} Kalem)</h2>
          {items.length > 0 && <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">Ara Toplam: {formatCurrency(totals.subtotal)}</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="text-left px-3 py-3 text-xs font-semibold text-text-muted uppercase w-10">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-text-muted uppercase">Ürün Adı / Açıklama</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-text-muted uppercase w-28">Miktar</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-text-muted uppercase w-20">Birim</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-text-muted uppercase w-32">Birim Fiyat</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-text-muted uppercase w-24">İsk (%)</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-text-muted uppercase w-28">İsk Tutarı</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-text-muted uppercase w-32">Tutar</th>
                <th className="text-center px-3 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted text-sm">Henüz kalem eklenmedi. Yukarıdan ürün arayın veya serbest kalem ekleyin.</td></tr>
              )}
              {items.map((item, idx) => {
                const calc = calculatedLines[idx];
                const discountPct = item.discount_type === "percent" ? item.discount_value : (calc.line_subtotal > 0 && calc.discount_amount > 0 ? (calc.discount_amount / calc.line_subtotal) * 100 : 0);
                return (
                  <tr key={item.id} className="hover:bg-surface/50 transition">
                    <td className="px-3 py-2 text-xs text-text-muted font-mono">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <input value={item.product_name_snapshot} onChange={(e) => handleUpdateItem(item.id, { product_name_snapshot: e.target.value })} className="w-full border border-border rounded px-2 py-1 text-sm font-medium" />
                      {item.product_code_snapshot && <span className="text-[10px] text-text-muted">Kod: {item.product_code_snapshot}</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" value={item.quantity || ""} step="any" onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) })} className="w-20 border border-border rounded px-2 py-1 text-sm text-center font-bold outline-none" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={item.unit_snapshot} onChange={(e) => handleUpdateItem(item.id, { unit_snapshot: e.target.value })} className="w-16 border border-border rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" value={item.unit_price || ""} step="any" onChange={(e) => handleUpdateItem(item.id, { unit_price: Number(e.target.value) })} className="w-24 border border-border rounded px-2 py-1 text-sm text-right font-bold outline-none" />
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-text-muted tabular-nums">{discountPct > 0 ? `%${Number(discountPct).toFixed(2)}` : "-"}</td>
                    <td className="px-3 py-2 text-right text-xs text-rose-600 tabular-nums">{calc.discount_amount > 0 ? `-${formatCurrency(calc.discount_amount)}` : "-"}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{formatCurrency(calc.line_total)}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOTALS & SETTINGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-border space-y-3">
          <h3 className="text-sm font-bold text-text border-b border-border pb-2">Teklif Koşulları</h3>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Geçerlilik Tarihi</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Teslimat Koşulları</label>
            <input type="text" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} placeholder="Stok durumuna göre teslim edilecektir." className="w-full border border-border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Ödeme Koşulları</label>
            <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Peşin / Havale" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notlar</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-border rounded-lg p-3 text-sm min-h-[60px]" placeholder="Teklif notları..." />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border flex flex-col justify-between">
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
            <div className="flex items-center gap-2 text-text-muted">
              <span className="flex-shrink-0">Genel İsk:</span>
              <select value={generalDiscountType || ""} onChange={(e) => setGeneralDiscountType(e.target.value as "percent" | "fixed" | null || null)} className="border border-border rounded px-1 py-0.5 text-xs">
                <option value="">Yok</option>
                <option value="percent">%</option>
                <option value="fixed">₺</option>
              </select>
              {generalDiscountType && (
                <input type="number" value={generalDiscountValue || ""} onChange={(e) => setGeneralDiscountValue(Number(e.target.value))} className="w-16 border border-border rounded px-1 py-0.5 text-xs text-right" />
              )}
              {totals.general_discount_amount > 0 && <span className="ml-auto tabular-nums text-rose-600">-{formatCurrency(totals.general_discount_amount)}</span>}
            </div>
            <div className="flex justify-between items-center font-medium pt-1 border-t border-border">
              <span>Net Tutar:</span>
              <span className="tabular-nums">{formatCurrency(totals.net_total)}</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span className="flex items-center gap-2">KDV: %
                <input type="number" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="w-12 border border-border rounded px-1 py-0.5 text-xs text-right" />
              </span>
              <span className="tabular-nums">{formatCurrency(totals.vat_total)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-brand-navy pt-2 border-t border-border">
              <span>Genel Toplam:</span>
              <span className="tabular-nums">{formatCurrency(totals.grand_total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button type="button" onClick={() => handleSave(false)} disabled={loading || items.length === 0} className="w-full bg-surface text-brand-navy px-6 py-3 rounded-xl text-sm font-semibold border border-border hover:bg-gray-100 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs">
              {loading ? <><Loader2 size={16} className="animate-spin" /><span>Kaydediliyor...</span></> : <><FileCheck size={16} /><span>Taslak Kaydet</span></>}
            </button>
            <button type="button" onClick={() => handleSave(true)} disabled={loading || items.length === 0} className="w-full bg-brand-gold text-brand-navy px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-gold-light transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
              {loading ? <><Loader2 size={16} className="animate-spin" /><span>Kaydediliyor...</span></> : <><Printer size={16} /><span>Kaydet & PDF Olarak İndir</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
