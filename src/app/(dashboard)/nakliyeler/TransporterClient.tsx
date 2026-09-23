"use client";

import { useState, useTransition, useMemo } from "react";
import { Transporter, calculateDueDate12 } from "@/lib/data/store";
import { actionSaveTransporter, actionDeleteTransporter } from "@/lib/data/actions";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  CreditCard,
  Building,
  User,
} from "lucide-react";

interface Props {
  initialItems: Transporter[];
  userRole: string;
  userName: string;
}

export function TransporterClient({ initialItems, userName }: Props) {
  const [items, setItems] = useState<Transporter[]>(initialItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transporter | null>(null);
  const [isPending, startTransition] = useTransition();

  const todayStr = new Date().toISOString().split("T")[0];

  // 12 Gün Kuralı Hesaplaması: Vadesi dolan ve yaklaşan nakliye ödemeleri
  const { dueList, pendingList, paidList } = useMemo(() => {
    const due: Transporter[] = [];
    const pending: Transporter[] = [];
    const paid: Transporter[] = [];

    items.forEach((item) => {
      if (item.status === "Ödendi") {
        paid.push(item);
      } else if (item.due_date <= todayStr) {
        due.push(item);
      } else {
        pending.push(item);
      }
    });

    return { dueList: due, pendingList: pending, paidList: paid };
  }, [items, todayStr]);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchQ =
      item.transporter_name.toLowerCase().includes(q) ||
      item.iban.toLowerCase().includes(q) ||
      (item.notes && item.notes.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchQ && matchStatus;
  });

  const totalDueAmount = dueList.reduce((sum, i) => sum + i.amount, 0);
  const totalPendingAmount = pendingList.reduce((sum, i) => sum + i.amount, 0);

  function handleOpenNew() {
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function handleEdit(item: Transporter) {
    setEditingItem(item);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu nakliye kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await actionDeleteTransporter(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Nakliye kaydı silindi.");
    });
  }

  async function handleToggleStatus(item: Transporter) {
    const newStatus = item.status === "Ödendi" ? "Ödenmedi" : "Ödendi";
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", item.id);
      formData.set("transporter_name", item.transporter_name);
      formData.set("transport_date", item.transport_date);
      formData.set("amount", String(item.amount));
      formData.set("iban", item.iban);
      formData.set("status", newStatus);
      formData.set("notes", item.notes || "");

      const res = await actionSaveTransporter(formData);
      if (res.success && res.transporter) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? res.transporter! : i))
        );
        toast.success(`Nakliyeci ödemesi "${newStatus}" olarak işaretlendi!`);
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await actionSaveTransporter(formData);
      if (res.success && res.transporter) {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.id === res.transporter!.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.transporter!;
            return next;
          }
          return [res.transporter!, ...prev];
        });
        toast.success("Nakliye kaydı başarıyla kaydedildi!");
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
            <Truck className="text-brand-navy" size={24} />
            Nakliyeler ve Taşıma Ödemeleri
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Nakliyeci IBAN bilgileri, taşıma tarihleri ve otomatik 12 gün sonra ödeme uyarı sistemi
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus size={16} /> + Yeni Nakliye Kaydı Gir
        </button>
      </div>

      {/* 12 GÜN UYARI BANNER'I */}
      {dueList.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-950 flex items-center gap-2">
                ⚠️ DİKKAT: 12 GÜN SÜRESİ DOLMUŞ NAKLİYE ÖDEMELERİ VAR!
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Taşıma tarihinden 12 gün geçmiş toplam <strong>{dueList.length} adet nakliye</strong> için ödemenin yapılması gerekiyor. (Toplam: <strong>{formatCurrency(totalDueAmount)}</strong>)
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("Ödenmedi")}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
          >
            Ödemesi Gecikenleri Filtrele
          </button>
        </div>
      )}

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
            <Clock size={15} /> 12 Günü Dolanlar (Ödeme Zamanı)
          </span>
          <p className="text-2xl font-black text-rose-950 mt-1">{dueList.length} Kayıt</p>
          <p className="text-xs text-rose-700 font-bold mt-0.5">{formatCurrency(totalDueAmount)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <Truck size={15} /> 12 Günü Devam Edenler (Bekleyen)
          </span>
          <p className="text-2xl font-black text-amber-950 mt-1">{pendingList.length} Kayıt</p>
          <p className="text-xs text-amber-700 font-bold mt-0.5">{formatCurrency(totalPendingAmount)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 size={15} /> Ödemesi Yapılanlar
          </span>
          <p className="text-2xl font-black text-emerald-950 mt-1">{paidList.length} Kayıt</p>
          <p className="text-xs text-emerald-700 font-bold mt-0.5">
            {formatCurrency(paidList.reduce((s, i) => s + i.amount, 0))}
          </p>
        </div>
      </div>

      {/* Arama ve Filtre */}
      <div className="bg-white p-4 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nakliyeci adı, IBAN veya açıklama ara..."
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs outline-none focus:border-brand-navy"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-xs bg-white font-medium outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="Ödenmedi">Ödenmedi (Bekliyor)</option>
            <option value="Ödendi">Ödendi</option>
          </select>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Nakliyeci Firma / Şoför</th>
                <th className="py-3 px-4">Taşıma Tarihi</th>
                <th className="py-3 px-4 text-right">Tutar (₺)</th>
                <th className="py-3 px-4">Banka IBAN</th>
                <th className="py-3 px-4">12 Günlük Son Ödeme Vadesi</th>
                <th className="py-3 px-4">Not / Açıklama</th>
                <th className="py-3 px-4">İşlemi Yapan</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-center w-16">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-muted">
                    Kayıtlı nakliye ödemesi bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isDue = item.status !== "Ödendi" && item.due_date <= todayStr;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface/50 transition ${
                        isDue ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-text">
                        <div className="flex items-center gap-1.5">
                          <Truck size={14} className="text-brand-navy flex-shrink-0" />
                          <span>{item.transporter_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-muted">{item.transport_date}</td>
                      <td className="py-3 px-4 text-right font-black text-brand-navy tabular-nums text-sm">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-text-muted">
                        {item.iban || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isDue ? "text-rose-600 underline font-black" : "text-text"
                            }`}
                          >
                            {item.due_date}
                          </span>
                          {isDue && (
                            <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse">
                              12 GÜN DOLDU!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-text-muted">
                        {item.notes || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-border text-[10px] font-medium text-text-muted">
                          <User size={10} /> {item.created_by_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={isPending}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                            item.status === "Ödendi"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          }`}
                        >
                          {item.status === "Ödendi" ? "✓ Ödendi" : "✕ Ödenmedi"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 rounded text-brand-navy hover:bg-surface transition"
                            title="Düzenle"
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

      {/* YENİ / DÜZENLE MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <Truck className="text-brand-navy" size={20} />
                {editingItem ? "Nakliye Kaydını Düzenle" : "Yeni Nakliye Kaydı Gir"}
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

              <div>
                <label className="block font-semibold text-text mb-1">Nakliyeci Firma / Şoför Adı *</label>
                <input
                  type="text"
                  required
                  name="transporter_name"
                  defaultValue={editingItem?.transporter_name || ""}
                  placeholder="Örn: Yıldız Nakliyat / Ali Usta"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Taşıma Tarihi *</label>
                  <input
                    type="date"
                    required
                    name="transport_date"
                    defaultValue={editingItem?.transport_date || todayStr}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-semibold"
                  />
                  <span className="text-[10px] text-text-muted mt-0.5 block">
                    * 12 gün sonra otomatik uyarı verilir
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Tutar (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    name="amount"
                    defaultValue={editingItem?.amount || ""}
                    placeholder="3500"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Banka IBAN Numarası</label>
                <input
                  type="text"
                  name="iban"
                  defaultValue={editingItem?.iban || ""}
                  placeholder="TRxx xxxx xxxx xxxx xxxx xx"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Ödeme Statüsü</label>
                <select
                  name="status"
                  defaultValue={editingItem?.status || "Ödenmedi"}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-bold"
                >
                  <option value="Ödenmedi">Ödenmedi (12 Gün Vadesi İşlesin)</option>
                  <option value="Ödendi">Ödendi (Tamamlandı)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Not / Güzergah Açıklaması</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingItem?.notes || ""}
                  placeholder="Maslak şantiye sevkiyatı nakliyesi, 2 sefer..."
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
                  {isPending ? "Kaydediliyor..." : "Nakliyeyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
