"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { calculateLine, calculateTotals } from "@/lib/calculations";
import { updateQuote } from "../actions";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Plus, Save, Loader2 } from "lucide-react";

interface ItemState {
  id: string;
  product_id: string | null;
  product_code_snapshot: string;
  product_name_snapshot: string;
  unit_snapshot: string;
  quantity: number;
  unit_price: number;
  discount_type: "percent" | "fixed" | null;
  discount_value: number;
}

export function EditQuoteForm({
  quote,
  initialItems,
}: {
  quote: any;
  initialItems: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemState[]>(
    initialItems.map((it) => ({
      id: it.id || crypto.randomUUID(),
      product_id: it.product_id,
      product_code_snapshot: it.product_code_snapshot || "",
      product_name_snapshot: it.product_name_snapshot || "",
      unit_snapshot: it.unit_snapshot || "M2",
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      discount_type: it.discount_type || null,
      discount_value: Number(it.discount_value) || 0,
    }))
  );

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
  const [notes, setNotes] = useState<string>(quote.notes || "");

  // Canlı Hesaplama
  const { lines, totals } = useMemo(() => {
    const calculatedLines = items.map((item) =>
      calculateLine({
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_type: item.discount_type,
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

  // Yeni Serbest Kalem Ekleme
  function handleAddCustomItem() {
    const newItem: ItemState = {
      id: crypto.randomUUID(),
      product_id: null,
      product_code_snapshot: "",
      product_name_snapshot: "Yeni Ürün / Hizmet",
      unit_snapshot: "M2",
      quantity: 1,
      unit_price: 0,
      discount_type: null,
      discount_value: 0,
    };
    setItems([...items, newItem]);
  }

  function handleItemChange<K extends keyof ItemState>(
    index: number,
    field: K,
    val: ItemState[K]
  ) {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    setItems(next);
  }

  async function handleSave() {
    if (items.length === 0) {
      toast.error("Lütfen en az bir kalem ekleyin.");
      return;
    }

    setLoading(true);
    try {
      await updateQuote(quote.id, {
        items: items.map((it) => ({
          product_id: it.product_id,
          product_code_snapshot: it.product_code_snapshot,
          product_name_snapshot: it.product_name_snapshot,
          unit_snapshot: it.unit_snapshot,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_type: it.discount_type,
          discount_value: it.discount_value,
        })),
        generalDiscountType,
        generalDiscountValue,
        vatRate,
        validUntil,
        notes,
      });

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
              Müşteri:{" "}
              {quote.customer_snapshot?.company_name ||
                quote.customer_snapshot?.contact_name ||
                "Müşteri"}
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

      {/* Kalemler Tablosu (Düzenlenebilir) */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-surface flex justify-between items-center">
          <h2 className="text-xs font-semibold text-text uppercase tracking-wide">
            Kalem Listesi ({items.length} Kalem) — İstenmeyen ürünü silmek için sağdaki çöp kutusuna tıklayın
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface border-b border-border text-text-muted">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold">#</th>
                <th className="text-left px-3 py-2.5 font-semibold min-w-[200px]">Ürün / Açıklama</th>
                <th className="text-left px-3 py-2.5 font-semibold w-24">Kod</th>
                <th className="text-right px-3 py-2.5 font-semibold w-24">Miktar</th>
                <th className="text-left px-3 py-2.5 font-semibold w-20">Birim</th>
                <th className="text-right px-3 py-2.5 font-semibold w-28">B. Fiyat (₺)</th>
                <th className="text-right px-3 py-2.5 font-semibold w-24">İskonto (%)</th>
                <th className="text-right px-3 py-2.5 font-semibold w-28">Satır Tutarı</th>
                <th className="text-center px-3 py-2.5 font-semibold w-16">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, idx) => {
                const lineCalc = lines[idx];
                return (
                  <tr key={item.id} className="hover:bg-surface/60">
                    <td className="px-3 py-2 text-text-muted">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.product_name_snapshot}
                        onChange={(e) =>
                          handleItemChange(idx, "product_name_snapshot", e.target.value)
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-text font-medium"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-text-muted">
                      <input
                        type="text"
                        value={item.product_code_snapshot}
                        onChange={(e) =>
                          handleItemChange(idx, "product_code_snapshot", e.target.value)
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-right tabular-nums font-semibold"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.unit_snapshot}
                        onChange={(e) =>
                          handleItemChange(idx, "unit_snapshot", e.target.value)
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-xs"
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
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange(idx, "unit_price", parseFloat(e.target.value) || 0)
                        }
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-right tabular-nums font-medium"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount_value || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleItemChange(idx, "discount_value", val);
                          handleItemChange(idx, "discount_type", val > 0 ? "percent" : null);
                        }}
                        placeholder="%"
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-right tabular-nums text-text-muted"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-text tabular-nums">
                      {formatCurrency(lineCalc?.line_total || 0)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        title="Bu ürünü tekliften çıkar"
                        className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition"
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

      {/* Şartlar ve Toplamlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-border space-y-4">
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
              Teklif Notları
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
            <span className="text-text-muted">Genel İskonto:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={generalDiscountValue}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  setGeneralDiscountValue(v);
                  setGeneralDiscountType(v > 0 ? "percent" : null);
                }}
                className="w-16 bg-surface border border-border rounded px-2 py-0.5 text-right text-xs tabular-nums"
                placeholder="%"
              />
              <span className="text-text-muted">%</span>
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
