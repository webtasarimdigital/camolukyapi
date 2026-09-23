"use client";

import { useState, useTransition } from "react";
import { Employee } from "@/lib/data/store";
import { actionSaveEmployee, actionDeleteEmployee } from "@/lib/data/actions";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  Wallet,
  Calendar,
  Trash2,
  Edit3,
  Phone,
  Briefcase,
  UserCheck,
  Palmtree,
  User,
} from "lucide-react";

interface Props {
  initialItems: Employee[];
  userRole: string;
  userName: string;
}

export function EmployeeClient({ initialItems, userName }: Props) {
  const [items, setItems] = useState<Employee[]>(initialItems);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Employee | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.full_name.toLowerCase().includes(q) ||
      item.position.toLowerCase().includes(q) ||
      item.phone.includes(q)
    );
  });

  const totalSalary = items.reduce((sum, i) => sum + i.salary, 0);
  const totalAdvances = items.reduce((sum, i) => sum + i.total_advances, 0);

  function handleOpenNew() {
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function handleEdit(item: Employee) {
    setEditingItem(item);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu personel kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await actionDeleteEmployee(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Personel kaydı silindi.");
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await actionSaveEmployee(formData);
      if (res.success && res.employee) {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.id === res.employee!.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.employee!;
            return next;
          }
          return [res.employee!, ...prev];
        });
        toast.success(editingItem ? "Personel bilgileri güncellendi!" : "Yeni personel kaydedildi!");
        setIsModalOpen(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Users className="text-brand-navy" size={24} />
            Personel Yönetimi
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Maaşlar, çekilen avanslar, yıllık izin kullanımı ve personel özlük bilgileri
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus size={16} /> + Yeni Personel Ekle
        </button>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
            <UserCheck size={15} className="text-blue-600" /> Toplam Personel
          </span>
          <p className="text-2xl font-black text-text mt-1">{items.length} Çalışan</p>
          <p className="text-[11px] text-text-muted mt-0.5">Aktif bordrolu kadro</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
            <Wallet size={15} className="text-emerald-600" /> Aylık Toplam Maaş Yükü
          </span>
          <p className="text-2xl font-black text-emerald-950 mt-1">{formatCurrency(totalSalary)}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            Kalan Net: {formatCurrency(totalSalary - totalAdvances)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
            <Briefcase size={15} className="text-amber-600" /> Bu Ayki Toplam Avanslar
          </span>
          <p className="text-2xl font-black text-amber-950 mt-1">{formatCurrency(totalAdvances)}</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Maaşlardan mahsup edilecek</p>
        </div>
      </div>

      {/* Arama */}
      <div className="bg-white p-4 rounded-2xl border border-border flex items-center justify-between shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Personel adı, görev veya telefon ara..."
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs outline-none focus:border-brand-navy"
          />
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Personel Adı Soyadı</th>
                <th className="py-3 px-4">Görev / Pozisyon</th>
                <th className="py-3 px-4">Telefon</th>
                <th className="py-3 px-4">İşe Giriş Tarihi</th>
                <th className="py-3 px-4 text-right">Maaş (₺)</th>
                <th className="py-3 px-4 text-right">Toplam Avans</th>
                <th className="py-3 px-4 text-right">Kalan Net Maaş</th>
                <th className="py-3 px-4 text-center">İzin (Kullanılan / Kalan)</th>
                <th className="py-3 px-4">Genel Bilgi / Not</th>
                <th className="py-3 px-4 text-center w-16">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted">
                    Kayıtlı personel bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const netSalary = Math.max(0, item.salary - item.total_advances);

                  return (
                    <tr key={item.id} className="hover:bg-surface/50 transition">
                      <td className="py-3 px-4 font-bold text-text">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-navy/10 text-brand-navy font-bold flex items-center justify-center text-xs">
                            {item.full_name.charAt(0)}
                          </div>
                          <span>{item.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-surface px-2 py-0.5 rounded font-semibold text-text border border-border">
                          {item.position}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-muted">{item.phone || "-"}</td>
                      <td className="py-3 px-4 text-text-muted">{item.start_date || "-"}</td>
                      <td className="py-3 px-4 text-right font-bold text-text tabular-nums">
                        {formatCurrency(item.salary)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-700 tabular-nums">
                        {item.total_advances > 0 ? formatCurrency(item.total_advances) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700 tabular-nums">
                        {formatCurrency(netSalary)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-text">
                          {item.used_leave_days} gün
                        </span>
                        <span className="text-text-muted ml-1">
                          / {item.remaining_leave_days} gün kaldı
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-text-muted">
                        {item.notes || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 rounded text-brand-navy hover:bg-surface transition"
                            title="Düzenle / Avans Gir / İzin Güncelle"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded text-rose-400 hover:text-rose-600 transition"
                            title="Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* YENİ / DÜZENLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <Users className="text-brand-navy" size={20} />
                {editingItem ? "Personel Bilgilerini Düzenle" : "Yeni Personel Ekle"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {editingItem && <input type="hidden" name="id" value={editingItem.id} />}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    name="full_name"
                    defaultValue={editingItem?.full_name || ""}
                    placeholder="Ahmet Duvarbaşı"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Telefon</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingItem?.phone || ""}
                    placeholder="05xx xxx xx xx"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Görevi / Pozisyon *</label>
                  <input
                    type="text"
                    required
                    name="position"
                    defaultValue={editingItem?.position || ""}
                    placeholder="Satış Temsilcisi, Sevkiyat..."
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">İşe Giriş Tarihi</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={editingItem?.start_date || ""}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Maaş ve Avans Bölümü */}
              <div className="bg-surface/80 p-3 rounded-xl border border-border grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text mb-1">Aylık Net Maaş (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    name="salary"
                    defaultValue={editingItem?.salary || ""}
                    placeholder="45000"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-white outline-none focus:border-brand-navy font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-900 mb-1">Alınan Avans Tutarı (₺)</label>
                  <input
                    type="number"
                    step="any"
                    name="total_advances"
                    defaultValue={editingItem?.total_advances || 0}
                    placeholder="0"
                    className="w-full border border-amber-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-amber-600 font-bold text-sm text-amber-950"
                  />
                </div>
              </div>

              {/* İzin Takibi */}
              <div className="bg-surface/80 p-3 rounded-xl border border-border grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Kullanılan İzin (Gün)</label>
                  <input
                    type="number"
                    step="any"
                    name="used_leave_days"
                    defaultValue={editingItem?.used_leave_days || 0}
                    placeholder="0"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-white outline-none focus:border-brand-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Kalan Yıllık İzin (Gün)</label>
                  <input
                    type="number"
                    step="any"
                    name="remaining_leave_days"
                    defaultValue={editingItem?.remaining_leave_days ?? 14}
                    placeholder="14"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-white outline-none focus:border-brand-navy font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Genel Bilgi / Notlar</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingItem?.notes || ""}
                  placeholder="Ehliyet sınıfı, acil durum irtibatı veya personel notları..."
                  className="w-full border border-border rounded-lg p-2.5 bg-surface outline-none focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-text-muted hover:text-text font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-navy text-white px-5 py-2 rounded-lg font-bold hover:bg-brand-navy/90 transition shadow-xs"
                >
                  {isPending ? "Kaydediliyor..." : "Personeli Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
