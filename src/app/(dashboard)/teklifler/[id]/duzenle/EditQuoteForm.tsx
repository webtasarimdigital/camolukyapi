"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { calculateLine, calculateTotals } from "@/lib/calculations";
import { updateQuote } from "../actions";
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
} from "lucide-react";

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

export interface CustomerOption {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string;
  address?: string | null;
  tax_office?: string | null;
  tax_number?: string | null;
  email?: string | null;
}

export function EditQuoteForm({
  quote,
  initialItems,
  customers = [],
}: {
  quote: any;
  initialItems: any[];
  customers?: CustomerOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Müşteri / Firma Bilgileri Modu
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
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.contact_name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
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
                    placeholder="Firma adı veya telefon..."
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
                        (c.phone && c.phone.includes(q))
                      );
                    })
                    .slice(0, 15)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleSelectCustomer(c.id);
                          setCustomerSearch("");
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md border text-left transition cursor-pointer flex items-center gap-1 ${
                          selectedCustomerId === c.id
                            ? "bg-brand-navy text-white border-brand-navy font-bold"
                            : "bg-white text-text border-border hover:border-brand-navy"
                        }`}
                      >
                        <Building2 size={11} />
                        <span>{c.company_name || c.contact_name}</span>
                        {c.phone && <span className="opacity-75 text-[10px]">({c.phone})</span>}
                      </button>
                    ))}
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
                      <div className="inline-flex items-center gap-1 justify-end">
                        <select
                          value={item.discount_type || "percent"}
                          onChange={(e) => {
                            const newType = e.target.value as "percent" | "fixed";
                            handleItemChange(idx, "discount_type", newType);
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
                            handleItemChange(idx, "discount_value", val);
                            handleItemChange(idx, "discount_type", item.discount_type || "percent");
                          }}
                          className="w-16 border border-border rounded px-2 py-1 text-xs text-right font-bold outline-none focus:border-brand-navy"
                        />
                      </div>
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
