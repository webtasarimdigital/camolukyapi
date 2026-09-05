"use client";

import { useState } from "react";
import { EditMovementModal } from "./EditMovementModal";
import { deletePartnerMovement } from "./actions";
import { toast } from "sonner";
import { Edit, Trash2, Loader2 } from "lucide-react";

export function MovementRowActions({
  movement,
  partnerName,
}: {
  movement: any;
  partnerName: string;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Bu hareketi (${movement.reason}) silmek istediğinize emin misiniz? Bakiye otomatik güncellenecektir.`)) {
      return;
    }

    setDeleting(true);
    try {
      await deletePartnerMovement(movement.id);
      toast.success("Cari hareket silindi ve bakiyeler güncellendi.");
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="p-1.5 text-text-muted hover:text-brand-navy hover:bg-brand-navy/10 rounded-lg transition"
          title="Hareketi Düzenle"
        >
          <Edit size={14} />
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
          title="Hareketi Sil"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      {showEdit && (
        <EditMovementModal
          movement={movement}
          partnerName={partnerName}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
