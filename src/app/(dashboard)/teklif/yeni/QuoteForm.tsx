"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { calculateLine, calculateTotals } from "@/lib/calculations";
import { saveQuote } from "./actions";
import { Loader2, FileCheck, Printer } from "lucide-react";

interface QuoteLineItem {
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
  price_quality_1?: number | null;
  price_quality_2?: number | null;
  price_commercial?: number | null;
  default_sale_price?: number | null;
}

export function QuoteForm({ creatorName, defaultSettings }: { creatorName: string, defaultSettings: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [customer, setCustomer] = useState<any>(null); // Simplified
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  
  const [generalDiscountType, setGeneralDiscountType] = useState<"percent"|"fixed"|null>(null);
  const [generalDiscountValue, setGeneralDiscountValue] = useState(0);
  const [vatRate, setVatRate] = useState(defaultSettings?.default_vat_rate || 20);
  
  const d = new Date();
  d.setDate(d.getDate() + (defaultSettings?.quote_validity_days || 7));
  const [validUntil, setValidUntil] = useState(d.toISOString().split("T")[0]);
  
  const [deliveryTerms, setDeliveryTerms] = useState(defaultSettings?.default_delivery_terms || "");
  const [paymentTerms, setPaymentTerms] = useState(defaultSettings?.default_payment_terms || "");
  const [notes, setNotes] = useState("");

  const handleAddItem = () => {
    const newItem: QuoteLineItem = {
      id: crypto.randomUUID(),
      product_id: null,
      product_code_snapshot: "",
      product_name_snapshot: "Yeni Ürün",
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
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<QuoteLineItem>) => {
    setItems((prev) => prev.map((item) => {
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

  const totals = useMemo(() => {
    return calculateTotals(items, vatRate, generalDiscountType, generalDiscountValue);
  }, [items, vatRate, generalDiscountType, generalDiscountValue]);

  const handleSave = async (print: boolean) => {
    try {
      setLoading(true);
      const res = await saveQuote({
        customerId: customer?.id || null,
        customerSnapshot: customer || { company_name: "Yeni Müşteri" },
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
      if (print) {
        router.push(`/teklifler/${res.quoteId}/print`);
      } else {
        router.push(`/teklifler/${res.quoteId}`);
      }
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-2 bg-white p-5 rounded-xl border border-border">
          <h2 className="text-sm font-semibold mb-4 text-text uppercase">Müşteri Bilgileri</h2>
          {/* Mocked Customer Selection */}
          <div className="p-4 bg-surface rounded-lg text-sm border border-border text-center cursor-pointer hover:bg-gray-100"
               onClick={() => setCustomer({ id: null, company_name: "Örnek Müşteri A.Ş.", phone: "0555 123 4567" })}>
            {customer ? (
              <div className="text-left">
                <p className="font-bold">{customer.company_name}</p>
                <p className="text-text-muted">{customer.phone}</p>
              </div>
            ) : (
              "+ Müşteri Seç / Ekle (Tıkla)"
            )}
          </div>
        </div>
        <div className="md:col-span-3 bg-white p-5 rounded-xl border border-border">
          <h2 className="text-sm font-semibold mb-4 text-text uppercase">Teklif Bilgileri</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">Teklif No</label>
              <input disabled value="Oluşturulacak..." className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Geçerlilik Tarihi</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="w-full border border-border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Satış Temsilcisi</label>
              <input disabled value={creatorName} className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Durum</label>
              <input disabled value="Taslak" className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden p-4">
        <div className="flex gap-2 mb-4">
          <button onClick={handleAddItem} className="bg-surface text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-gray-200">
            + Serbest Kalem Ekle
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="text-left px-2 py-2">Açıklama</th>
                <th className="text-right px-2 py-2 w-20">Miktar</th>
                <th className="text-left px-2 py-2 w-20">Birim</th>
                <th className="text-right px-2 py-2 w-28">Birim Fiyat</th>
                <th className="text-right px-2 py-2 w-24">İsk (%)</th>
                <th className="text-right px-2 py-2 w-28">Tutar</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-2 py-2">
                    <input value={item.product_name_snapshot} onChange={e => handleUpdateItem(item.id, { product_name_snapshot: e.target.value })} className="w-full border border-border rounded px-2 py-1 text-sm" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" value={item.quantity || ""} onChange={e => handleUpdateItem(item.id, { quantity: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1 text-sm text-right" />
                  </td>
                  <td className="px-2 py-2">
                    <input value={item.unit_snapshot} onChange={e => handleUpdateItem(item.id, { unit_snapshot: e.target.value })} className="w-full border border-border rounded px-2 py-1 text-sm" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" value={item.unit_price || ""} onChange={e => handleUpdateItem(item.id, { unit_price: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1 text-sm text-right" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" value={item.discount_value || ""} onChange={e => handleUpdateItem(item.id, { discount_type: "percent", discount_value: Number(e.target.value) })} className="w-full border border-border rounded px-2 py-1 text-sm text-right" />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(item.line_total)}</td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => handleRemoveItem(item.id)} className="text-brand-red font-bold text-lg hover:text-red-800">×</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">Kalem ekleyin</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-80 bg-white p-5 rounded-xl border border-border space-y-3 text-sm">
          <div className="flex justify-between items-center text-text-muted">
            <span>Ara Toplam:</span>
            <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-text-muted">
            <span>Satır İskontoları:</span>
            <span className="tabular-nums">-{formatCurrency(totals.line_discount_total)}</span>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <span>Genel İsk:</span>
            <select value={generalDiscountType || ""} onChange={e => setGeneralDiscountType(e.target.value as "percent"|"fixed"|null)} className="border border-border rounded px-1 py-0.5 text-xs">
              <option value="">Yok</option>
              <option value="percent">%</option>
              <option value="fixed">₺</option>
            </select>
            {generalDiscountType && (
              <input type="number" value={generalDiscountValue || ""} onChange={e => setGeneralDiscountValue(Number(e.target.value))} className="w-16 border border-border rounded px-1 py-0.5 text-xs text-right" />
            )}
            <span className="ml-auto tabular-nums">-{formatCurrency(totals.general_discount_amount)}</span>
          </div>
          <div className="flex justify-between items-center font-medium pt-2 border-t border-border">
            <span>Net Tutar:</span>
            <span className="tabular-nums">{formatCurrency(totals.net_total)}</span>
          </div>
          <div className="flex justify-between items-center text-text-muted">
            <span className="flex items-center gap-2">KDV: %
              <input type="number" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} className="w-12 border border-border rounded px-1 py-0.5 text-xs text-right" />
            </span>
            <span className="tabular-nums">{formatCurrency(totals.vat_total)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-brand-navy pt-2 border-t border-border mt-2">
            <span>Genel Toplam:</span>
            <span className="tabular-nums">{formatCurrency(totals.grand_total)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-border">
        <label className="block text-sm font-semibold mb-2">Notlar</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border border-border rounded-md p-3 text-sm min-h-[80px]" placeholder="Teklif notları..." />
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={loading || items.length === 0}
          className="bg-surface text-brand-navy px-6 py-3 rounded-lg text-sm font-semibold border border-border hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2 shadow-2xs"
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
          className="bg-brand-gold text-brand-navy px-6 py-3 rounded-lg text-sm font-bold hover:bg-brand-gold-light transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <Printer size={16} />
              <span>Kaydet ve Yazdır</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
