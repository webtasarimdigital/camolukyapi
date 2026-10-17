"use client";

import { useState } from "react";
import { Plus, Download } from "lucide-react";
import * as XLSX from "xlsx";
import AddMovementModal from "./AddMovementModal";

export function PartnerDetailActions({
  partners,
  currentPartnerId,
  movements,
  partnerName,
}: {
  partners: Array<{ id: string; name: string }>;
  currentPartnerId: string;
  movements?: any[];
  partnerName?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  function handleExportExcel() {
    if (!movements || movements.length === 0) {
      alert("İndirilecek hareket bulunamadı.");
      return;
    }
    const rows = movements.map((m, idx) => {
      let meta: any = {};
      try {
        meta = m.notes ? JSON.parse(m.notes) : {};
      } catch {}

      const isIncome = meta.is_personal_income || m.doc_no === "SAHSI_GELIR" || meta.category === "kira" || meta.category === "kar_dagitimi";
      let directionLabel = "Firmadan Aldığı (Şahsi Çekim)";
      if (isIncome) directionLabel = "Şahsi Gelir / Kâr Payı";
      else if (m.direction === "partner_to_company") directionLabel = "Firmaya Verdiği (Borç/Sermaye)";

      return {
        "Sıra": idx + 1,
        "Ortak Adı": partnerName || "",
        "İşlem Tarihi": m.transaction_date,
        "Hareket Yönü": directionLabel,
        "Tutar (₺)": Number(m.amount) || 0,
        "Açıklama": meta.description || m.description || m.notes || "-",
        "Evrak No": m.doc_no || "-",
        "Ödeme Şekli": m.payment_method || "-",
        "Durum": m.voided_at ? "İptal Edildi" : "Aktif",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ortak_Ekstresi");
    XLSX.writeFile(wb, `${(partnerName || "Ortak").replace(/\s+/g, "_")}_Ekstresi.xlsx`);
  }

  return (
    <div className="flex items-center gap-2">
      {movements && movements.length > 0 && (
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 bg-surface hover:bg-neutral-100 text-text border border-border px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          title="Ekstreyi Excel olarak indir"
        >
          <Download size={14} /> Excel İndir
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
      >
        <Plus size={15} /> Yeni Hareket Ekle
      </button>

      {showModal && (
        <AddMovementModal
          partners={partners}
          defaultPartnerId={currentPartnerId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
