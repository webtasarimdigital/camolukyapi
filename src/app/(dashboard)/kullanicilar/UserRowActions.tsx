"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { actionDeleteUser } from "./actions";
import { toast } from "sonner";

export function UserRowActions({
  userId,
  userEmail,
  isSelf,
  isProtected,
}: {
  userId: string;
  userEmail: string;
  isSelf: boolean;
  isProtected: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (isSelf || isProtected) {
    return (
      <span className="text-[10px] text-text-muted font-medium italic">
        Sistem Hesabı
      </span>
    );
  }

  function handleDelete() {
    if (!confirm(`"${userEmail}" kullanıcısını sistemden silmek istediğinize emin misiniz?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await actionDeleteUser(userId);
        if (res.success) {
          toast.success("Kullanıcı başarıyla silindi.");
        } else {
          toast.error(res.error || "Kullanıcı silinemedi.");
        }
      } catch (err: any) {
        toast.error("Bağlantı hatası: " + err?.message);
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Kullanıcıyı Sil"
      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
    >
      {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}
