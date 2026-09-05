"use client";

import { useState } from "react";
import Link from "next/link";
import { EditCustomerModal } from "./EditCustomerModal";
import { deleteCustomer } from "./actions";
import { toast } from "sonner";
import { Eye, Edit, Trash2, Loader2 } from "lucide-react";

export function CustomerRowActions({ customer }: { customer: any }) {
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const customerName = customer.type === "kurumsal" ? customer.company_name : customer.contact_name;
    if (!confirm(`"${customerName}" adlı müşteriyi silmek istediğinize emin misiniz?`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await deleteCustomer(customer.id);
      if (res.softDeleted) {
        toast.info(res.message);
      } else {
        toast.success(res.message);
      }
    } catch (err: any) {
      toast.error("Silme hatası: " + err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/musteriler/${customer.id}`}
          className="p-1.5 text-brand-navy hover:bg-brand-navy/10 rounded-lg transition"
          title="Müşteri Detayı"
        >
          <Eye size={16} />
        </Link>

        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition"
          title="Düzenle"
        >
          <Edit size={16} />
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition disabled:opacity-50"
          title="Sil"
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>

      {showEdit && (
        <EditCustomerModal customer={customer} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}
