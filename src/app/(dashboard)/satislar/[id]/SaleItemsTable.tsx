"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ReceiptText,
  Boxes,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { sendItemsToProcurement } from "@/app/(dashboard)/tedarik/actions";
import type { ProcurementRecord } from "@/app/(dashboard)/tedarik/types";

interface SaleItemsTableProps {
  items: any[];
  saleId: string;
  saleCode: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  initialProcurementRecords: ProcurementRecord[];
  formatCurrency: (val: number) => string;
  saleTotals: {
    subtotal: number;
    discount_total: number;
    net_total: number;
    vat_rate: number;
    vat_total: number;
    grand_total: number;
  };
}

export default function SaleItemsTable({
  items,
  saleId,
  saleCode,
  customerId,
  customerName,
  customerPhone,
  initialProcurementRecords,
  formatCurrency,
  saleTotals,
}: SaleItemsTableProps) {
  const [procurementRecords, setProcurementRecords] = useState<ProcurementRecord[]>(
    initialProcurementRecords
  );
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Kalem tedarik durumunu bulma (sale_item_id veya product_name ile eşleştir)
  const getProcurementForIndex = (item: any, idx: number) => {
    return procurementRecords.find(
      (p) =>
        (item.id && p.sale_item_id === item.id) ||
        p.product_name === item.product_name_snapshot
    );
  };

  const isAllSelected = items.length > 0 && selectedIndices.length === items.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(items.map((_, idx) => idx));
    }
  };

  const handleToggleIndex = (idx: number) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSendToProcurement = async () => {
    if (selectedIndices.length === 0) return;

    const selectedItems = selectedIndices.map((idx) => items[idx]);
    const payload = selectedItems.map((it) => ({
      sale_id: saleId,
      sale_code: saleCode,
      sale_item_id: it.id || undefined,
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone || "",
      product_id: it.product_id || undefined,
      product_name: it.product_name_snapshot || "Ürün",
      product_code: it.product_code_snapshot || "",
      quantity: Number(it.quantity) || 1,
      unit: it.unit_snapshot || "Adet",
    }));

    setIsSending(true);
    try {
      const res = await sendItemsToProcurement(payload);
      if (res.success) {
        toast.success(
          `${payload.length} ürün başarıyla Tedarik Yönetimi modülüne aktarıldı!`
        );
        setSelectedIndices([]);

        // Yerel state'i güncelle
        const now = new Date().toISOString();
        const fakeNewRecords: ProcurementRecord[] = payload.map((p, i) => ({
          id: `temp-${Date.now()}-${i}`,
          company_id: "",
          _module: "tedarik",
          ...p,
          supplier_name: "",
          status: "bekliyor",
          created_at: now,
          updated_at: now,
        }));
        setProcurementRecords((prev) => [...prev, ...fakeNewRecords]);
      } else {
        toast.error(res.error || "Tedariğe gönderilemedi");
      }
    } catch (err: any) {
      toast.error(err?.message || "Bağlantı hatası");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Tablo Başlık Alanı */}
      <div className="p-4 border-b border-border bg-surface/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ReceiptText size={16} className="text-brand-gold" />
          <h3 className="text-sm font-bold text-text">
            Satılan Kalemler ({items.length} Kalem)
          </h3>
        </div>

        {/* Tedariğe Gönder Eylem Butonu */}
        <div className="flex items-center gap-2">
          {selectedIndices.length > 0 ? (
            <button
              onClick={handleSendToProcurement}
              disabled={isSending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-all disabled:opacity-50"
            >
              <Boxes size={14} />
              {isSending
                ? "Gönderiliyor..."
                : `Tedariğe Gönder (${selectedIndices.length} Ürün)`}
            </button>
          ) : (
            <span className="text-[11px] text-text-muted hidden sm:inline">
              Elinizde olmayan ürünleri seçip Tedarik modülüne aktarabilirsiniz
            </span>
          )}

          <Link
            href="/tedarik"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-muted hover:text-text hover:bg-surface border border-border transition-colors"
          >
            <Boxes size={13} />
            Tedarik Sayfası
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface border-b border-border text-text-muted uppercase text-[10px] font-bold">
            <tr>
              <th className="py-2.5 px-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded border-border text-amber-600 focus:ring-amber-500 cursor-pointer"
                  title="Tümünü Seç / Kaldır"
                />
              </th>
              <th className="py-2.5 px-3 text-center w-8">#</th>
              <th className="py-2.5 px-4 text-left">Ürün Açıklaması</th>
              <th className="py-2.5 px-3 text-right">Miktar</th>
              <th className="py-2.5 px-3 text-center">Birim</th>
              <th className="py-2.5 px-3 text-right">Birim Fiyat</th>
              <th className="py-2.5 px-3 text-right">İskonto</th>
              <th className="py-2.5 px-4 text-right">Tutar (KDV Hariç)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item: any, idx: number) => {
              const isSelected = selectedIndices.includes(idx);
              const proc = getProcurementForIndex(item, idx);

              return (
                <tr
                  key={item.id || idx}
                  className={`hover:bg-surface/30 transition-colors ${
                    isSelected ? "bg-amber-50/40" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleIndex(idx)}
                      className="rounded border-border text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </td>

                  {/* Sıra */}
                  <td className="py-2.5 px-3 text-center text-text-muted">{idx + 1}</td>

                  {/* Ürün & Tedarik Rozeti */}
                  <td className="py-2.5 px-4">
                    <p className="font-semibold text-text">
                      {item.product_name_snapshot}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      {item.product_code_snapshot && (
                        <span className="text-[10px] text-text-muted font-mono">
                          {item.product_code_snapshot}
                        </span>
                      )}

                      {/* Tedarik Durumu Rozeti */}
                      {proc && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            proc.status === "tedarik_edildi"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : proc.status === "siparis_verildi"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : proc.status === "iptal"
                              ? "bg-gray-100 text-gray-600 border-gray-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {proc.status === "tedarik_edildi" ? (
                            <CheckCircle2 size={11} />
                          ) : proc.status === "siparis_verildi" ? (
                            <Truck size={11} />
                          ) : (
                            <Clock size={11} />
                          )}
                          {proc.status === "tedarik_edildi"
                            ? "Tedarik Edildi"
                            : proc.status === "siparis_verildi"
                            ? "Sipariş Verildi"
                            : "Tedarik Bekliyor"}
                          {proc.supplier_name && (
                            <span className="text-text font-normal">
                              ({proc.supplier_name})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Miktar */}
                  <td className="py-2.5 px-3 text-right font-medium tabular-nums">
                    {item.quantity}
                  </td>

                  {/* Birim */}
                  <td className="py-2.5 px-3 text-center text-text-muted">
                    {item.unit_snapshot}
                  </td>

                  {/* Fiyat */}
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatCurrency(item.unit_price)}
                  </td>

                  {/* İskonto */}
                  <td className="py-2.5 px-3 text-right tabular-nums text-text-muted">
                    {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : "-"}
                  </td>

                  {/* Tutar */}
                  <td className="py-2.5 px-4 text-right font-bold text-text tabular-nums">
                    {formatCurrency(item.line_total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Summary Footer */}
      <div className="bg-surface/30 border-t border-border p-4 flex justify-end">
        <div className="w-64 space-y-1.5 text-xs">
          <div className="flex justify-between text-text-muted">
            <span>Ara Toplam:</span>
            <span className="font-semibold text-text tabular-nums">
              {formatCurrency(saleTotals.subtotal)}
            </span>
          </div>
          {saleTotals.discount_total > 0 && (
            <div className="flex justify-between text-brand-red">
              <span>İskonto:</span>
              <span className="font-semibold tabular-nums">
                -{formatCurrency(saleTotals.discount_total)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-text-muted">
            <span>Net Tutar:</span>
            <span className="font-semibold text-text tabular-nums">
              {formatCurrency(saleTotals.net_total)}
            </span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>KDV (%{saleTotals.vat_rate}):</span>
            <span className="font-semibold text-text tabular-nums">
              {formatCurrency(saleTotals.vat_total)}
            </span>
          </div>
          <div className="flex justify-between text-text font-black text-sm border-t border-border pt-1">
            <span>Genel Toplam:</span>
            <span className="text-brand-navy tabular-nums">
              {formatCurrency(saleTotals.grand_total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
