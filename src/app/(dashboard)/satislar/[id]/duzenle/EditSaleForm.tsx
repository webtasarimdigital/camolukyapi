"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { calculateLine } from "@/lib/calculations";
import { updateSale, UpdateSaleItemInput } from "../actions";
import { toast } from "sonner";
import {
  ArrowLeft,
  ReceiptText,
  PlusCircle,
  Trash2,
  Search,
  X,
  Tag,
  Loader2,
  CheckCircle2,
  Building2,
  Calendar,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface EditableSaleItem {
  id: string;
  productId: string | null;
  productCode: string | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountType: "percent" | "fixed" | null;
  discountValue: number;
}

interface ProductOption {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  default_sale_price: number | null;
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
  stock_qty?: number;
  size?: string | null;
}

export function EditSaleForm({
  sale,
  initialItems,
  products,
}: {
  sale: any;
  initialItems: any[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Items State
  const [items, setItems] = useState<EditableSaleItem[]>(() => {
    return (initialItems || []).map((item) => ({
      id: item.id || crypto.randomUUID(),
      productId: item.product_id || null,
      productCode: item.product_code_snapshot || null,
      productName: item.product_name_snapshot || "",
      unit: item.unit_snapshot || "ADET",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unit_price) || 0,
      discountType: item.discount_type || "percent",
      discountValue: Number(item.discount_value) || 0,
    }));
  });

  // Financial State
  const [vatRate, setVatRate] = useState<number>(Number(sale.vat_rate) || 20);
  const [generalDiscountType, setGeneralDiscountType] = useState<"percent" | "fixed" | null>(null);
  const [generalDiscountValue, setGeneralDiscountValue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(Number(sale.paid_amount) || 0);
  const [notes, setNotes] = useState<string>(sale.notes || "");
  const [dueDate, setDueDate] = useState<string>(sale.due_date || "");
  const [saleDate, setSaleDate] = useState<string>(
    sale.sale_date || (sale.created_at ? new Date(sale.created_at).toISOString().split("T")[0] : "")
  );

  // Target Total quick assist modal/input
  const [targetGrandTotal, setTargetGrandTotal] = useState<string>("");
  const [showTargetInput, setShowTargetInput] = useState(false);

  // Product Search Staging
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 10);
    return products
      .filter(
        (p) =>
          p.product_name.toLowerCase().includes(q) ||
          p.product_code.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [products, searchQuery]);

  // Calculations
  const calculatedLines = useMemo(() => {
    return items.map((item) =>
      calculateLine({
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_type: item.discountType,
        discount_value: item.discountValue,
      })
    );
  }, [items]);

  const subtotal = useMemo(() => {
    return calculatedLines.reduce((acc, l) => acc + (l.line_total || 0), 0);
  }, [calculatedLines]);

  const lineDiscountTotal = useMemo(() => {
    return calculatedLines.reduce((acc, l) => acc + (l.discount_amount || 0), 0);
  }, [calculatedLines]);

  let generalDiscountAmount = 0;
  if (generalDiscountType === "percent" && generalDiscountValue > 0) {
    generalDiscountAmount = Math.round(((subtotal * generalDiscountValue) / 100) * 100) / 100;
  } else if (generalDiscountType === "fixed" && generalDiscountValue > 0) {
    generalDiscountAmount = Math.round(Math.min(generalDiscountValue, subtotal) * 100) / 100;
  }

  const netTotal = Math.max(0, Math.round((subtotal - generalDiscountAmount) * 100) / 100);
  const vatTotal = Math.round(((netTotal * (Number(vatRate) || 0)) / 100) * 100) / 100;
  const grandTotal = Math.round((netTotal + vatTotal) * 100) / 100;
  const remainingAmount = Math.max(0, Math.round((grandTotal - Number(paidAmount || 0)) * 100) / 100);

  // Apply Target Grand Total (e.g. customer negotiated 28,000 TL)
  const applyTargetGrandTotal = () => {
    const target = parseFloat(targetGrandTotal);
    if (isNaN(target) || target <= 0) {
      toast.error("Lütfen geçerli bir hedef tutar giriniz.");
      return;
    }
    const safeVat = Number(vatRate) || 0;
    // target = targetNet * (1 + safeVat/100) => targetNet = target / (1 + safeVat/100)
    const targetNet = target / (1 + safeVat / 100);
    const requiredDiscount = Math.round((subtotal - targetNet) * 100) / 100;

    if (requiredDiscount <= 0) {
      // If target is larger than current subtotal, clear general discount
      setGeneralDiscountType(null);
      setGeneralDiscountValue(0);
      toast.info("Hedef tutar mevcut toplamdan yüksek veya eşit olduğu için genel iskonto sıfırlandı.");
    } else {
      setGeneralDiscountType("fixed");
      setGeneralDiscountValue(requiredDiscount);
      toast.success(
        `Hedef ${formatCurrency(target)} genel tutar için ${formatCurrency(requiredDiscount)} iskonto uygulandı!`
      );
    }
    setShowTargetInput(false);
  };

  // Item Updates
  const handleUpdateItem = (id: string, updates: Partial<EditableSaleItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("Satışta en az 1 kalem ürün bulunmalıdır.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddFreeItem = () => {
    const newItem: EditableSaleItem = {
      id: crypto.randomUUID(),
      productId: null,
      productCode: null,
      productName: "Serbest Kalem",
      unit: "Adet",
      quantity: 1,
      unitPrice: 0,
      discountType: "percent",
      discountValue: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleSelectProduct = (product: ProductOption) => {
    const initialPrice = product.price_quality_1 ?? product.default_sale_price ?? 0;
    const newItem: EditableSaleItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      productCode: product.product_code,
      productName: product.product_name,
      unit: product.unit || "M2",
      quantity: 1,
      unitPrice: initialPrice,
      discountType: "percent",
      discountValue: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setIsSearchOpen(false);
    setSearchQuery("");
    toast.success(`"${product.product_name}" satışa eklendi!`);
  };

  // Save Sale Changes
  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Satışta en az 1 kalem ürün bulunmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const itemsPayload: UpdateSaleItemInput[] = items.map((item, idx) => {
        const calc = calculatedLines[idx];
        return {
          id: item.id.includes("-") && item.id.length > 30 ? item.id : undefined,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
          discountAmount: calc?.discount_amount || 0,
          lineTotal: calc?.line_total || 0,
        };
      });

      const paymentStatus: "paid" | "partial" | "unpaid" =
        remainingAmount <= 0.01 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

      await updateSale({
        saleId: sale.id,
        items: itemsPayload,
        vatRate,
        subtotal,
        discountTotal: lineDiscountTotal + generalDiscountAmount,
        netTotal,
        vatTotal,
        grandTotal,
        paidAmount,
        remainingAmount,
        paymentStatus,
        notes,
        dueDate: dueDate || null,
        saleDate: saleDate || null,
      });

      toast.success("Satış başarıyla güncellendi!", {
        icon: <CheckCircle2 className="text-emerald-500" size={16} />,
      });
      router.push(`/satislar/${sale.id}`);
      router.refresh();
    } catch (err: any) {
      toast.error("Hata: " + (err.message || "Satış güncellenemedi."));
    } finally {
      setLoading(false);
    }
  };

  const customerName =
    sale.customer_snapshot?.company_name ||
    sale.customer?.company_name ||
    sale.customer_snapshot?.contact_name ||
    sale.customer?.contact_name ||
    "Perakende Müşteri";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <Link
            href={`/satislar/${sale.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text mb-1"
          >
            <ArrowLeft size={14} /> Satış Detayına Dön
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-text font-mono">
              {sale.sale_code} - Satışı Düzenle
            </h1>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
              Düzenleme Modu
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 flex items-center gap-2">
            <Building2 size={13} className="text-brand-navy" />
            Müşteri: <strong className="text-text">{customerName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/satislar/${sale.id}`}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-white text-text-muted hover:text-text"
          >
            Vazgeç
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="bg-brand-navy hover:bg-brand-navy/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Değişiklikleri Kaydet & Güncelle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface/40">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <ReceiptText size={16} className="text-brand-navy" />
                Satıştaki Kalemler ({items.length} Kalem)
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Ara Toplam: {formatCurrency(subtotal)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted uppercase w-8">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted uppercase">Ürün Adı</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-text-muted uppercase w-24">Miktar</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted uppercase w-16">Birim</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-text-muted uppercase w-28">Birim Fiyat</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-text-muted uppercase w-32">İskonto</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-text-muted uppercase w-28">Tutar</th>
                    <th className="text-center px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => {
                    const calc = calculatedLines[idx];
                    return (
                      <tr key={item.id} className="hover:bg-surface/50 transition">
                        <td className="px-3 py-2 text-xs text-text-muted font-mono">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleUpdateItem(item.id, { productName: e.target.value })}
                            className="w-full border border-border rounded px-2 py-1 text-xs font-bold text-text outline-none focus:border-brand-navy"
                          />
                          {item.productCode && (
                            <span className="text-[10px] text-text-muted font-mono">
                              Kod: {item.productCode}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity === 0 ? "" : item.quantity}
                            placeholder="1"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })
                            }
                            className="w-16 border border-border rounded px-1.5 py-1 text-center text-xs font-bold outline-none focus:border-brand-navy"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(item.id, { unit: e.target.value })}
                            className="w-14 border border-border rounded px-1.5 py-1 text-xs text-center outline-none focus:border-brand-navy"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={item.unitPrice === 0 ? "" : item.unitPrice}
                            placeholder="0.00"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                            }
                            className="w-24 border border-border rounded px-2 py-1 text-right text-xs font-bold outline-none focus:border-brand-navy"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <select
                              value={item.discountType || "percent"}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  discountType: e.target.value as "percent" | "fixed",
                                })
                              }
                              className="border border-border rounded px-1 py-1 text-[11px] bg-surface font-semibold outline-none cursor-pointer"
                            >
                              <option value="percent">%</option>
                              <option value="fixed">₺</option>
                            </select>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.discountValue === 0 ? "" : item.discountValue}
                              placeholder="0"
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  discountValue: parseFloat(e.target.value) || 0,
                                  discountType: item.discountType || "percent",
                                })
                              }
                              className="w-14 border border-border rounded px-1.5 py-1 text-xs text-right font-bold outline-none focus:border-brand-navy"
                            />
                          </div>
                          {calc?.discount_amount > 0 && (
                            <span className="block text-[10px] text-rose-600 tabular-nums">
                              -{formatCurrency(calc.discount_amount)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-xs tabular-nums text-text">
                          {formatCurrency(calc?.line_total || 0)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="Kalemi Sil"
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

            {/* Bottom Actions for Table */}
            <div className="p-3 border-t border-border bg-surface/30 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAddFreeItem}
                className="text-xs font-semibold text-brand-navy hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={15} />
                <span>+ Serbest Kalem Ekle</span>
              </button>

              {/* Add Product from Catalog Search */}
              <div ref={searchBoxRef} className="relative flex-1 max-w-xs">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Katalogdan Ürün Ekle..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-border rounded-lg outline-none focus:border-brand-navy"
                  />
                  <Search size={13} className="absolute left-2 top-2 text-text-muted" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 text-text-muted hover:text-text"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {isSearchOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-border">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="p-2.5 hover:bg-surface text-xs cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-text">{p.product_name}</p>
                            <span className="text-[10px] text-text-muted font-mono">{p.product_code}</span>
                          </div>
                          <span className="font-bold text-emerald-700">
                            {formatCurrency(p.price_quality_1 ?? p.default_sale_price ?? 0)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-text-muted">Ürün bulunamadı</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes & Dates */}
          <div className="bg-white p-5 rounded-2xl border border-border space-y-3">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider">Satış Detayları & Notlar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Satış Tarihi</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Vade Tarihi (Opsiyonel)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-navy"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Satış Notu</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn: Müşteri ile anlaşılan özel fiyat, teslimat açıklaması..."
                className="w-full border border-border rounded-lg p-2.5 text-xs outline-none focus:border-brand-navy"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Calculations & Totals (1 col) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
            <h3 className="font-bold text-text text-sm border-b border-border pb-2.5 flex items-center justify-between">
              <span>Hesap Özeti</span>
              <span className="text-[11px] font-normal text-text-muted">Otomatik Hesaplama</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-text-muted">
                <span>Ara Toplam:</span>
                <span className="font-bold text-text tabular-nums">{formatCurrency(subtotal)}</span>
              </div>

              {lineDiscountTotal > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Satır İskontoları:</span>
                  <span className="tabular-nums">-{formatCurrency(lineDiscountTotal)}</span>
                </div>
              )}

              {/* Genel İskonto Alanı */}
              <div className="bg-surface/80 p-3 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text flex items-center gap-1.5">
                    <Tag size={13} className="text-brand-gold" />
                    Genel İskonto:
                  </span>
                  {generalDiscountAmount > 0 && (
                    <span className="text-xs font-bold text-rose-600 tabular-nums">
                      -{formatCurrency(generalDiscountAmount)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
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
                      className={`px-2 py-0.5 text-xs font-bold rounded transition cursor-pointer ${
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
                      className={`px-2 py-0.5 text-xs font-bold rounded transition cursor-pointer ${
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
                        placeholder={generalDiscountType === "percent" ? "Örn: 5" : "Örn: 2000"}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setGeneralDiscountValue(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-bold text-right outline-none text-text"
                      />
                      <span className="text-xs font-bold text-text-muted">
                        {generalDiscountType === "percent" ? "%" : "₺"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-muted italic">İskonto tipi seçin</span>
                  )}
                </div>

                {/* Hedef Tutar Sihirbazı (Örn: 30 binden 28 bine bağlama) */}
                <div className="pt-1 border-t border-border/60">
                  {showTargetInput ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="number"
                        placeholder="Örn: 28000"
                        value={targetGrandTotal}
                        onChange={(e) => setTargetGrandTotal(e.target.value)}
                        className="w-full bg-white border border-emerald-400 rounded px-2 py-1 text-xs font-bold outline-none"
                      />
                      <button
                        type="button"
                        onClick={applyTargetGrandTotal}
                        className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs font-bold hover:bg-emerald-700 whitespace-nowrap cursor-pointer"
                      >
                        Uygula
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTargetInput(false)}
                        className="text-text-muted hover:text-text p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTargetInput(true)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Pazarlık / Hedef Genel Tutar Belirle</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between font-semibold pt-1 border-t border-border">
                <span>Net Tutar:</span>
                <span className="tabular-nums text-text">{formatCurrency(netTotal)}</span>
              </div>

              <div className="flex items-center justify-between text-text-muted">
                <span className="flex items-center gap-1.5">
                  KDV Oranı:
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    className="w-12 border border-border rounded px-1.5 py-0.5 text-xs text-right font-bold text-text outline-none"
                  />
                  %
                </span>
                <span className="font-semibold text-text tabular-nums">{formatCurrency(vatTotal)}</span>
              </div>

              <div className="flex justify-between font-black text-base text-brand-navy pt-2 border-t-2 border-border">
                <span>Genel Toplam:</span>
                <span className="tabular-nums text-emerald-700 text-lg">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Tahsilat / Ödeme Düzenleme */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <span className="text-xs font-bold text-amber-900 block">Tahsilat / Ödeme Durumu</span>
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                  Tahsil Edilen (Ödenen) Tutar (₺)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={paidAmount === 0 ? "" : paidAmount}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold text-text outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-between text-xs pt-1 border-t border-amber-200/60">
                <span className="text-amber-900 font-medium">Kalan Açık Bakiye:</span>
                <strong className={remainingAmount <= 0.01 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                  {remainingAmount <= 0.01 ? "0,00 ₺ (Ödendi)" : formatCurrency(remainingAmount)}
                </strong>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white px-5 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Değişiklikleri Kaydet & Bitir</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
