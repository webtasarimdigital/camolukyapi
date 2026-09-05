"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditCustomerModal } from "./EditCustomerModal";
import { deleteCustomer, toggleCustomerActive } from "./actions";
import { toast } from "sonner";
import { Edit, Trash2, Loader2, Power } from "lucide-react";

export function CustomerDetailActions({ customer }: { customer: any }) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleDelete() {
    const name = customer.type === "kurumsal" ? customer.company_name : customer.contact_name;
    if (!confirm(`"${name}" müşterisini silmek istediğinize emin misiniz?`)) return;

    setDeleting(true);
    try {
      const res = await deleteCustomer(customer.id);
      if (res.softDeleted) {
        toast.info(res.message);
      } else {
        toast.success(res.message);
      }
      router.push("/musteriler");
    } catch (err: any) {
      toast.error("Hata: " + err.message);
      setDeleting(false);
    }
  }

  async function handleToggleActive() {
    setToggling(true);
    try {
      await toggleCustomerActive(customer.id, !customer.is_active);
      toast.success(customer.is_active ? "Müşteri pasife alındı." : "Müşteri aktife alındı.");
      router.refresh();
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 bg-brand-gold text-brand-navy px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition shadow-xs"
        >
          <Edit size={14} /> Düzenle
        </button>

        <button
          type="button"
          disabled={toggling}
          onClick={handleToggleActive}
          className="flex items-center gap-1.5 bg-surface border border-border text-text px-3 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100 transition shadow-2xs disabled:opacity-50"
        >
          {toggling ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Power size={14} className={customer.is_active ? "text-amber-600" : "text-emerald-600"} />
          )}
          <span>{customer.is_active ? "Pasife Al" : "Aktife Al"}</span>
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold hover:bg-rose-100 transition shadow-2xs disabled:opacity-50"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          <span>Sil</span>
        </button>
      </div>

      {showEdit && (
        <EditCustomerModal customer={customer} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}
