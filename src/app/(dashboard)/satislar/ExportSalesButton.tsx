"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export function ExportSalesButton({ sales }: { sales: any[] }) {
  function handleExportExcel() {
    if (!sales || sales.length === 0) {
      toast.error("İndirilecek satış bulunamadı.");
      return;
    }

    const rows = sales.map((sale, idx) => {
      const customerName =
        sale.customer_snapshot?.company_name ||
        sale.customer?.company_name ||
        sale.customer_snapshot?.contact_name ||
        sale.customer?.contact_name ||
        "Perakende Müşteri";
      const totalAmount = sale.grand_total ?? sale.total_amount ?? 0;
      const paidAmount = sale.paid_amount ?? 0;
      const remaining = sale.remaining_amount ?? Math.max(0, totalAmount - paidAmount);

      return {
        "Sıra": idx + 1,
        "Satış No": sale.sale_code || "-",
        "Tarih": sale.sale_date ? sale.sale_date.substring(0, 10) : sale.created_at ? sale.created_at.substring(0, 10) : "-",
        "Müşteri": customerName,
        "Genel Toplam (₺)": Number(totalAmount) || 0,
        "Tahsil Edilen (₺)": Number(paidAmount) || 0,
        "Kalan Alacak (₺)": Number(remaining) || 0,
        "Statü": sale.status || "Tamamlandı",
        "Ödeme Durumu": sale.payment_status || (remaining === 0 ? "Ödendi" : paidAmount > 0 ? "Kısmi" : "Bekliyor"),
        "Açıklama / Notlar": sale.notes || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Satislar");
    const todayStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Satislar_${todayStr}.xlsx`);
    toast.success("Satış listesi Excel olarak indirildi.");
  }

  return (
    <button
      type="button"
      onClick={handleExportExcel}
      className="bg-surface hover:bg-neutral-100 text-text border border-border px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
      title="Tüm satış listesini Excel olarak indir"
    >
      <Download size={15} /> Excel İndir
    </button>
  );
}
