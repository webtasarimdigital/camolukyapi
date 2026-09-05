"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import AddMovementModal from "./AddMovementModal";

export function PartnerDetailActions({
  partners,
  currentPartnerId,
}: {
  partners: Array<{ id: string; name: string }>;
  currentPartnerId: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
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
    </>
  );
}
