"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { calculateLine, calculateTotals } from "@/lib/calculations";
import {
  updateDealerOrder,
  convertDealerOrderToSale,
  createCustomerForDealer,
  type EditableOrderItem,
} from "./actions";
import { toast } from "sonner";
import {
  ArrowLeft,
  Store,
  Building2,
  Phone,
  MapPin,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Save,
  ShoppingCart,
  Loader2,
  Trash2,
  Plus,
  Search,
  UserPlus,
  Percent,
  Coins,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface CustomerOption {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string;
}

interface ProductOption {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  stock_qty: number | null;
  price_quality_1: number | null;
  default_sale_price: number | null;
}

interface Props {
  order: any;
  items: any[];
  customers: CustomerOption[];
  products: ProductOption[];
}

export function ReviewAndConvertOrderForm({
  order,
  items: initialItems,
  customers: initialCustomers,
  products,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isConverted = order.status === "converted_to_sale";

  // Customer state
  const [customerList, setCustomerList] = useState<CustomerOption[]>(initialCustomers);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    order.customer_id || ""
  );
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Line items state
  const [items, setItems] = useState<EditableOrderItem[]>(
    initialItems.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_code_snapshot: item.product_code_snapshot || "",
      product_name_snapshot: item.product_name_snapshot || "",
      unit_snapshot: item.unit_snapshot || "ADET",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      discount_type: item.discount_type || null,
      discount_value: Number(item.discount_value) || 0,
    }))
  );

  // Product addition state
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [isAddingProductOpen, setIsAddingProductOpen] = useState(false);

  // Discounts & VAT
  const [vatRate, setVatRate] = useState<number>(Number(order.vat_rate) || 20);
  const [generalDiscountType, setGeneralDiscountType] = useState<
    "percent" | "fixed" | null
  >(order.general_discount_type || null);
  const [generalDiscountValue, setGeneralDiscountValue] = useState<number>(
    Number(order.general_discount_value) || 0
  );

  // Target Total (Pazarlık usulü düz rakama yuvarlama)
  const [targetGrandTotal, setTargetGrandTotal] = useState<string>("");

  // Order notes
  const [notes, setNotes] = useState(order.notes || "");

  // Dealer Snapshot details
  const dealerSnapshot = order.customer_snapshot || {};
  const dealerName =
    dealerSnapshot.dealer_name ||
    dealerSnapshot.company_name ||
    dealerSnapshot.contact_name ||
    "Tali Bayi";
  const dealerPhone = dealerSnapshot.phone || "-";
  const shippingAddress = dealerSnapshot.address || "-";
  const dealerNotes = dealerSnapshot.dealer_notes || "";

  // Dynamic calculations
  const calculatedLines = useMemo(() => {
    return items.map((item) =>
      calculateLine({
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
      })
    );
  }, [items]);

  const totals = useMemo(() => {
    return calculateTotals(
      calculatedLines,
      vatRate,
      generalDiscountType,
      generalDiscountValue
    );
  }, [calculatedLines, vatRate, generalDiscountType, generalDiscountValue]);

  // Update item field
  function updateItem(index: number, updates: Partial<EditableOrderItem>) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  // Remove item
  function removeItem(index: number) {
    if (items.length <= 1) {
      toast.error("Siparişte en az 1 ürün kalmalıdır.");
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Add new item from product catalog
  function handleSelectProduct(prod: ProductOption) {
    const price =
      prod.price_quality_1 || prod.default_sale_price || 0;

    const newItem: EditableOrderItem = {
      product_id: prod.id,
      product_code_snapshot: prod.product_code,
      product_name_snapshot: prod.product_name,
      unit_snapshot: prod.unit || "ADET",
      quantity: 1,
      unit_price: Number(price),
      discount_type: null,
      discount_value: 0,
    };

    setItems((prev) => [...prev, newItem]);
    setIsAddingProductOpen(false);
    setSearchProductQuery("");
    toast.success(`"${prod.product_name}" siparişe eklendi.`);
  }

  // Target Total Handler (Pazarlık yuvarlama)
  function handleApplyTargetTotal() {
    const target = parseFloat(targetGrandTotal);
    if (isNaN(target) || target <= 0) {
      toast.error("Geçerli bir hedef tutar giriniz.");
      return;
    }

    const subtotal = calculatedLines.reduce(
      (sum, l) => sum + l.line_total,
      0
    );

    // target = (subtotal - discount) * (1 + vatRate/100)
    // target / (1 + vatRate/100) = subtotal - discount
    // discount = subtotal - target / (1 + vatRate/100)
    const factor = 1 + vatRate / 100;
    const requiredNet = target / factor;
    const diff = subtotal - requiredNet;

    if (diff < 0) {
      toast.error("Hedef tutar mevcut tutardan yüksek olamaz.");
      return;
    }

    const roundedDiff = Math.round(diff * 100) / 100;
    setGeneralDiscountType("fixed");
    setGeneralDiscountValue(roundedDiff);
    toast.success(
      `Hedef ${formatCurrency(target)} için ${formatCurrency(roundedDiff)} iskonto uygulandı.`
    );
  }

  // Quick create customer for dealer
  async function handleQuickCreateCustomer() {
    setIsCreatingCustomer(true);
    try {
      const res = await createCustomerForDealer({
        companyName: dealerName,
        phone: dealerPhone !== "-" ? dealerPhone : undefined,
        address: shippingAddress !== "-" ? shippingAddress : undefined,
      });

      if (res.success && res.customer) {
        setCustomerList((prev) => [res.customer, ...prev]);
        setSelectedCustomerId(res.customer.id);
        toast.success(`"${dealerName}" adına cari/müşteri hesabı açıldı ve seçildi.`);
      }
    } catch (err: any) {
      toast.error("Cari hesap açılırken hata: " + err.message);
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  // Save updates without converting
  function handleSaveDraft() {
    startTransition(async () => {
      try {
        await updateDealerOrder({
          orderId: order.id,
          customerId: selectedCustomerId || null,
          customerSnapshot: {
            ...dealerSnapshot,
            assigned_customer_id: selectedCustomerId || null,
          },
          items,
          vatRate,
          generalDiscountType,
          generalDiscountValue,
          notes,
        });
        toast.success("Sipariş fiyat ve iskonto güncellemeleri başarıyla kaydedildi.");
      } catch (err: any) {
        toast.error("Kaydetme hatası: " + err.message);
      }
    });
  }

  // Convert to Sale
  function handleConvertToSale() {
    if (
      !confirm(
        "Bu bayi siparişini onaylayıp SATIŞA DÖNÜŞTÜRMEK istediğinize emin misiniz?\n\n• Depo stoğundan otomatik düşülecektir.\n• Resmi satış kaydı oluşturulacaktır."
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await convertDealerOrderToSale({
          orderId: order.id,
          customerId: selectedCustomerId || null,
          customerSnapshot: {
            ...dealerSnapshot,
            assigned_customer_id: selectedCustomerId || null,
          },
          items,
          vatRate,
          generalDiscountType,
          generalDiscountValue,
          notes,
        });

        if (res.success && res.saleId) {
          toast.success(
            `Bayi siparişi başarıyla onaylandı ve satışa dönüştürüldü! (${res.saleCode})`
          );
          router.push(`/satislar/${res.saleId}`);
        }
      } catch (err: any) {
        toast.error("Satışa dönüştürme hatası: " + err.message);
      }
    });
  }

  // Filtered products for quick add
  const filteredProducts = useMemo(() => {
    if (!searchProductQuery.trim()) return [];
    const q = searchProductQuery.toLowerCase();
    return products
      .filter(
        (p) =>
          p.product_name.toLowerCase().includes(q) ||
          p.product_code.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchProductQuery, products]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Üst Navigasyon & Durum Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/bayi-siparisleri"
            className="p-2 bg-white rounded-xl border border-border text-slate-600 hover:text-slate-900 transition shadow-2xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-slate-900">
                {order.quote_code}
              </span>
              {isConverted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 size={13} />
                  Satışa Dönüştü
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <Clock size={13} />
                  Admin Onayı Bekliyor
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sipariş Tarihi: {formatDate(order.created_at)} • Bayi: {dealerName}
            </p>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isConverted && order.converted_sale_id ? (
            <Link
              href={`/satislar/${order.converted_sale_id}`}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <ExternalLink size={15} />
              <span>Oluşan Satışı Görüntüle</span>
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-border px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                <span>Değişiklikleri Kaydet</span>
              </button>

              <button
                type="button"
                onClick={handleConvertToSale}
                disabled={isPending}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Dönüştürülüyor...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} />
                    <span>Onayla & Satışa Dönüştür</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tali Bayi Bilgileri ve Cari Hesap Eşleştirme Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bayi Detayları */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Building2 size={15} className="text-brand-gold" />
            Tali Bayi & Teslimat Bilgileri
          </h2>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium w-24">Bayi Ünvanı:</span>
              <span className="font-bold text-slate-900 text-sm">{dealerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium w-24">Telefon:</span>
              <span className="font-semibold text-slate-800">{dealerPhone}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 font-medium w-24 flex-shrink-0">
                Teslimat Adresi:
              </span>
              <span className="text-slate-700">{shippingAddress}</span>
            </div>
            {dealerNotes && (
              <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                <span className="text-amber-600 font-semibold w-24 flex-shrink-0">
                  Bayi Notu:
                </span>
                <span className="text-amber-900 font-medium">{dealerNotes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cari / Müşteri Hesabı Eşleştirme */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-600" />
              Cari / Müşteri Hesabı Eşleştirme
            </h2>
            {!selectedCustomerId && !isConverted && (
              <button
                type="button"
                onClick={handleQuickCreateCustomer}
                disabled={isCreatingCustomer}
                className="text-xs text-brand-navy hover:text-brand-gold font-bold flex items-center gap-1 disabled:opacity-50"
              >
                {isCreatingCustomer ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <UserPlus size={12} />
                )}
                Bayi Adına Cari Aç
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Satışın ve bakiyenin işleneceği müşteri / cari hesabını belirleyiniz:
          </p>

          <select
            value={selectedCustomerId}
            disabled={isConverted}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-gold/50 disabled:bg-slate-100"
          >
            <option value="">-- Cari Seçilmedi (Perakende/Geçici Kayıt) --</option>
            {customerList.map((cust) => (
              <option key={cust.id} value={cust.id}>
                {cust.company_name || cust.contact_name} ({cust.phone})
              </option>
            ))}
          </select>

          {selectedCustomerId && (
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
              <span>Satış ve stok hareketleri seçili cariye bağlanacaktır.</span>
            </div>
          )}
        </div>
      </div>

      {/* KALEM VE FİYAT DÜZENLEME TABLOSU (Admin İnceleme & Düzenleme) */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Store size={16} className="text-brand-gold" />
              Sipariş Kalemleri, Fiyat & İskonto Düzenleme ({items.length} Kalem)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bayiye satmak istediğiniz birim fiyatı, satır iskontolarını veya miktarları buradan değiştirebilirsiniz.
            </p>
          </div>

          {!isConverted && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAddingProductOpen(!isAddingProductOpen)}
                className="inline-flex items-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Plus size={14} /> Yeni Kalem Ekle
              </button>

              {/* Hızlı Ürün Ekleme Dropdown */}
              {isAddingProductOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-xl z-30 p-3 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={searchProductQuery}
                    onChange={(e) => setSearchProductQuery(e.target.value)}
                    placeholder="Eklenecek ürün adı veya kodu..."
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50 mb-2"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto divide-y divide-border">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full text-left p-2 hover:bg-slate-50 transition rounded flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-900 block truncate">
                            {p.product_name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {p.product_code}
                          </span>
                        </div>
                        <span className="font-bold text-brand-navy flex-shrink-0">
                          {formatCurrency(p.price_quality_1 || p.default_sale_price || 0)}
                        </span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && searchProductQuery.trim() && (
                      <p className="text-center text-xs text-slate-400 py-3">
                        Ürün bulunamadı
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-border">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Ürün Kodu & Adı</th>
                <th className="py-3 px-3 text-center">Birim</th>
                <th className="py-3 px-3 text-center">Depo Stoku</th>
                <th className="py-3 px-3 text-center w-24">Miktar</th>
                <th className="py-3 px-3 text-right w-36">Birim Fiyat (₺)</th>
                <th className="py-3 px-3 text-center w-48">Kalem İskontosu</th>
                <th className="py-3 px-3 text-right w-32">Toplam Tutar</th>
                {!isConverted && <th className="py-3 px-3 text-center w-12">Sil</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, idx) => {
                const lineCalc = calculatedLines[idx] || {
                  line_subtotal: 0,
                  discount_amount: 0,
                  line_total: 0,
                };

                // Look up product stock
                const matchedProd = products.find(
                  (p) => p.id === item.product_id
                );
                const stockQty = matchedProd?.stock_qty;

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-semibold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block text-xs">
                        {item.product_name_snapshot}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.product_code_snapshot || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-slate-600">
                      {item.unit_snapshot}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {stockQty !== undefined && stockQty !== null ? (
                        <span
                          className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                            stockQty >= item.quantity
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {stockQty} {item.unit_snapshot}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Miktar */}
                    <td className="py-3 px-3 text-center">
                      {isConverted ? (
                        <span className="font-bold text-slate-900">
                          {item.quantity}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, {
                              quantity: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          className="w-20 text-center font-bold text-xs py-1.5 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                        />
                      )}
                    </td>

                    {/* Birim Fiyat (Düzenlenebilir) */}
                    <td className="py-3 px-3 text-right">
                      {isConverted ? (
                        <span className="font-bold text-slate-900">
                          {formatCurrency(item.unit_price)}
                        </span>
                      ) : (
                        <div className="relative inline-block w-32">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(idx, {
                                unit_price: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-full text-right font-bold text-xs py-1.5 pr-2 pl-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                          />
                        </div>
                      )}
                    </td>

                    {/* Kalem İskontosu */}
                    <td className="py-3 px-3 text-center">
                      {isConverted ? (
                        <span className="text-slate-600 font-medium">
                          {item.discount_value
                            ? `${item.discount_value} ${
                                item.discount_type === "percent" ? "%" : "₺"
                              }`
                            : "-"}
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <select
                            value={item.discount_type || ""}
                            onChange={(e) =>
                              updateItem(idx, {
                                discount_type: (e.target.value as any) || null,
                                discount_value: e.target.value
                                  ? item.discount_value || 0
                                  : 0,
                              })
                            }
                            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                          >
                            <option value="">Yok</option>
                            <option value="percent">%</option>
                            <option value="fixed">₺</option>
                          </select>
                          {item.discount_type && (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.discount_value || ""}
                              onChange={(e) =>
                                updateItem(idx, {
                                  discount_value:
                                    parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                              className="w-16 text-center font-bold text-xs py-1 border border-border rounded-lg bg-surface focus:outline-none"
                            />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Satır Toplamı */}
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-xs">
                      {formatCurrency(lineCalc.line_total)}
                    </td>

                    {/* Sil */}
                    {!isConverted && (
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Kalemi Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ALT ALAN: GENEL İSKONTO, KDV, PAZARLIK & FİNANS ÖZETİ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Kart: Genel İskonto & KDV Ayarları */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Genel İskonto, KDV & Pazarlık Düzenlemesi
          </h2>

          {/* Genel İskonto Seçimi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Genel İskonto Tipi
              </label>
              <select
                disabled={isConverted}
                value={generalDiscountType || ""}
                onChange={(e) =>
                  setGeneralDiscountType((e.target.value as any) || null)
                }
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-gold/50 disabled:bg-slate-100"
              >
                <option value="">İskonto Yok</option>
                <option value="percent">Yüzde (%) İskonto</option>
                <option value="fixed">Sabit Tutar (₺) İskonto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                İskonto Değeri
              </label>
              <input
                type="number"
                disabled={isConverted || !generalDiscountType}
                step="0.01"
                min="0"
                value={generalDiscountValue || ""}
                onChange={(e) =>
                  setGeneralDiscountValue(parseFloat(e.target.value) || 0)
                }
                placeholder="0"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-gold/50 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Hedef Tutar / Pazarlık Yuvarlama */}
          {!isConverted && (
            <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-amber-900">
                🤝 Hedef Nihai Tutar (Pazarlık / Düz Rakam Yuvarlama)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={targetGrandTotal}
                  onChange={(e) => setTargetGrandTotal(e.target.value)}
                  placeholder="Örn: 28000"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleApplyTargetTotal}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0"
                >
                  Uygula
                </button>
              </div>
              <p className="text-[11px] text-amber-700">
                Hedeflediğiniz genel tutarı yazıp 'Uygula' dediğinizde gereken iskonto otomatik hesaplanacaktır.
              </p>
            </div>
          )}

          {/* KDV Oranı Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              KDV Oranı
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[20, 10, 1, 0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  disabled={isConverted}
                  onClick={() => setVatRate(rate)}
                  className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    vatRate === rate
                      ? "bg-brand-navy text-white border-brand-navy shadow-xs"
                      : "bg-surface border-border text-slate-700 hover:bg-slate-100"
                  } disabled:opacity-50`}
                >
                  %{rate} {rate === 0 ? "(KDV'siz)" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Dahili Notlar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Yönetici / Sevkiyat Notu
            </label>
            <textarea
              rows={2}
              disabled={isConverted}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Yönetici sipariş notu..."
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-gold/50 disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* Sağ Kart: Canlı Finansal Özet Tablosu & Satışa Dönüştür */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Finansal Hesaplama Özeti
            </h2>

            <div className="space-y-2 text-xs border-b border-border pb-3">
              <div className="flex justify-between text-slate-600">
                <span>Brüt Kalem Toplamı:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(
                    calculatedLines.reduce((s, l) => s + l.line_subtotal, 0)
                  )}
                </span>
              </div>

              {totals.line_discount_total > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Satır İskontoları Toplamı:</span>
                  <span className="font-semibold">
                    -{formatCurrency(totals.line_discount_total)}
                  </span>
                </div>
              )}

              {totals.general_discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Genel İskonto:</span>
                  <span className="font-semibold">
                    -{formatCurrency(totals.general_discount_amount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-100">
                <span>KDV Matrahı (Net Tutar):</span>
                <span className="text-slate-900">
                  {formatCurrency(totals.net_total)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>KDV Tutarı (%{vatRate}):</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(totals.vat_total)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm pt-1">
              <span className="font-black text-slate-900 text-base">
                Genel Toplam (KDV Dahil):
              </span>
              <span className="font-black text-2xl text-emerald-700">
                {formatCurrency(totals.grand_total)}
              </span>
            </div>
          </div>

          {/* Alt Onay Aksiyonu */}
          {!isConverted ? (
            <div className="space-y-2 pt-4">
              <button
                type="button"
                onClick={handleConvertToSale}
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    İşlem Yapılıyor...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    Onayla & Satışa Dönüştür (Stoktan Düş)
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400">
                Onaylandığında sipariş kapatılır, depodaki stok miktarları düşülür ve resmi satış kaydı oluşturulur.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-emerald-800">
                Bu sipariş başarıyla onaylanmış ve satışa dönüştürülmüştür.
              </p>
              {order.converted_sale_id && (
                <Link
                  href={`/satislar/${order.converted_sale_id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 mt-2 underline"
                >
                  Satış Sayfasına Git <ArrowRight size={13} />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
