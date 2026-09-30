"use client";

import { useState, useTransition } from "react";
import { Rent } from "@/lib/data/types";
import { actionSaveRent, actionDeleteRent } from "@/lib/data/actions";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  User,
} from "lucide-react";

interface Props {
  initialItems: Rent[];
  userRole: string;
  userName: string;
}

export function RentClient({ initialItems, userName }: Props) {
  const [items, setItems] = useState<Rent[]>(initialItems);
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState<"all" | "toplanan" | "verilen">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Rent | null>(null);
  const [isPending, startTransition] = useTransition();

  const toplananList = items.filter((i) => i.type === "toplanan");
  const verilenList = items.filter((i) => i.type === "verilen");

  const totalToplanan = toplananList.reduce((s, i) => s + i.amount, 0);
  const totalVerilen = verilenList.reduce((s, i) => s + i.amount, 0);
  const netKiraFarki = totalToplanan - totalVerilen;

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchQ =
      item.title.toLowerCase().includes(q) ||
      item.counterpart_name.toLowerCase().includes(q);
    const matchType = typeTab === "all" || item.type === typeTab;
    return matchQ && matchType;
  });

  function handleOpenNew() {
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function handleEdit(item: Rent) {
    setEditingItem(item);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kira kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await actionDeleteRent(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Kira kaydı silindi.");
    });
  }

  async function handleToggleStatus(item: Rent) {
    const newStatus = item.status === "Ödendi" ? "Bekliyor" : "Ödendi";
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", item.id);
      formData.set("type", item.type);
      formData.set("title", item.title);
      formData.set("counterpart_name", item.counterpart_name);
      formData.set("amount", String(item.amount));
      formData.set("payment_day", String(item.payment_day));
      formData.set("payment_method", item.payment_method);
      formData.set("status", newStatus);
      formData.set("notes", item.notes || "");

      const res = await actionSaveRent(formData);
      if (res.success && res.rent) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? res.rent! : i))
        );
        toast.success(`Kira durumu "${newStatus}" olarak güncellendi!`);
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await actionSaveRent(formData);
      if (res.success && res.rent) {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.id === res.rent!.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.rent!;
            return next;
          }
          return [res.rent!, ...prev];
        });
        toast.success(editingItem ? "Kira kaydı güncellendi!" : "Yeni kira kaydı eklendi!");
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
            <Building2 className="text-brand-navy" size={24} />
            Kira Yönetimi
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Toplanan kira gelirleri (kiraya verilenler) ve verilen kira giderleri (dükkan, depo vb.) ayrı ayrı takibi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface p-1 rounded-xl border border-border">
            <button
              onClick={() => setTypeTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeTab === "all" ? "bg-white text-brand-navy shadow-xs" : "text-text-muted hover:text-text"
              }`}
            >
              Tüm Kiralar ({items.length})
            </button>
            <button
              onClick={() => setTypeTab("toplanan")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                typeTab === "toplanan" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <ArrowDownLeft size={13} /> Toplanan Kiralar ({toplananList.length})
            </button>
            <button
              onClick={() => setTypeTab("verilen")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                typeTab === "verilen" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              <ArrowUpRight size={13} /> Verilen Kiralar ({verilenList.length})
            </button>
          </div>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={16} /> + Yeni Kira Tanımla
          </button>
        </div>
      </div>

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <ArrowDownLeft size={15} /> Toplanan Kira Gelirleri (Aylık)
          </span>
          <p className="text-2xl font-black text-emerald-950 mt-1">{formatCurrency(totalToplanan)}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {toplananList.length} Adet Kiradaki Mülk
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
            <ArrowUpRight size={15} /> Verilen Kira Giderleri (Aylık)
          </span>
          <p className="text-2xl font-black text-rose-950 mt-1">{formatCurrency(totalVerilen)}</p>
          <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
            {verilenList.length} Adet Dükkan / Depo Kirası
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs">
          <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
            <Wallet size={15} className="text-brand-navy" /> Net Kira Dengesi
          </span>
          <p
            className={`text-2xl font-black mt-1 ${
              netKiraFarki >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {formatCurrency(netKiraFarki)}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {netKiraFarki >= 0 ? "Kira gelir fazlası" : "Kira gider fazlası"}
          </p>
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
            placeholder="Mülk adı, kiracı veya mülk sahibi ara..."
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
                <th className="py-3 px-4">Kira Türü</th>
                <th className="py-3 px-4">Mülk / Dükkan / Depo Tanımı</th>
                <th className="py-3 px-4">Kiracı / Mülk Sahibi</th>
                <th className="py-3 px-4 text-center">Ödeme Günü</th>
                <th className="py-3 px-4 text-right">Aylık Kira Bedeli</th>
                <th className="py-3 px-4">Ödeme Yöntemi</th>
                <th className="py-3 px-4">Notlar</th>
                <th className="py-3 px-4">İşlemi Yapan</th>
                <th className="py-3 px-4 text-center">Bu Ayki Durum</th>
                <th className="py-3 px-4 text-center w-16">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-muted">
                    Kayıtlı kira tanımı bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-surface/50 transition">
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          item.type === "toplanan"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {item.type === "toplanan" ? "Toplanan (Gelir)" : "Verilen (Gider)"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-text">{item.title}</td>
                    <td className="py-3 px-4 text-text-muted font-medium">
                      {item.counterpart_name}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold bg-surface px-2 py-0.5 rounded border border-border">
                        Her ayın {item.payment_day}'i
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black tabular-nums text-sm">
                      <span className={item.type === "toplanan" ? "text-emerald-700" : "text-rose-700"}>
                        {formatCurrency(item.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-muted">{item.payment_method}</td>
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
                        className={`px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs cursor-pointer ${
                          item.status === "Ödendi"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                      >
                        {item.status === "Ödendi" ? "✓ Ödendi" : "🟡 Bekliyor"}
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
                ))
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
                <Building2 className="text-brand-navy" size={20} />
                {editingItem ? "Kira Kaydını Düzenle" : "Yeni Kira Tanımla"}
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
                  <label className="block font-semibold text-text mb-1">Kira Türü *</label>
                  <select
                    name="type"
                    defaultValue={editingItem?.type || "toplanan"}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-bold"
                  >
                    <option value="toplanan">Toplanan (Kira Geliri)</option>
                    <option value="verilen">Verilen (Kira Gideri)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Ödeme Günü (Ayın Kaçı) *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    name="payment_day"
                    defaultValue={editingItem?.payment_day || 1}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Mülk / Dükkan / Depo Adı *</label>
                <input
                  type="text"
                  required
                  name="title"
                  defaultValue={editingItem?.title || ""}
                  placeholder="Örn: Libadiye Cad. Zemin Mağaza veya Çamlıca Depo"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Kiracı veya Mülk Sahibi *</label>
                <input
                  type="text"
                  required
                  name="counterpart_name"
                  defaultValue={editingItem?.counterpart_name || ""}
                  placeholder="Kişi / Firma Adı"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Aylık Kira Bedeli (₺) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    name="amount"
                    defaultValue={editingItem?.amount || ""}
                    placeholder="35000"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Ödeme Yöntemi</label>
                  <select
                    name="payment_method"
                    defaultValue={editingItem?.payment_method || "Banka"}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-semibold"
                  >
                    <option value="Banka">Banka Havale/EFT</option>
                    <option value="Nakit">Elden Nakit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Bu Ayki Durum</label>
                <select
                  name="status"
                  defaultValue={editingItem?.status || "Bekliyor"}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-bold"
                >
                  <option value="Bekliyor">Bekliyor</option>
                  <option value="Ödendi">Ödendi</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Notlar / Açıklama</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingItem?.notes || ""}
                  placeholder="Kira artış ayı, depozito detayları..."
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
                  {isPending ? "Kaydediliyor..." : "Kira Kaydını Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
