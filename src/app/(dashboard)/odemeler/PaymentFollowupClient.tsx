"use client";

import { useState, useTransition, useMemo } from "react";
import { PaymentFollowup } from "@/lib/data/types";
import {
  actionSavePaymentFollowup,
  actionDeletePaymentFollowup,
} from "@/lib/data/actions";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import {
  CalendarClock,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  User,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

interface Props {
  initialItems: PaymentFollowup[];
  userRole: string;
  userName: string;
}

export function PaymentFollowupClient({ initialItems, userName }: Props) {
  const [items, setItems] = useState<PaymentFollowup[]>(initialItems);
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState<"all" | "alacak" | "borc">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentFollowup | null>(null);
  const [isPending, startTransition] = useTransition();

  const todayStr = new Date().toISOString().split("T")[0];

  // Calculate overdue, today, and upcoming
  const { overdueList, todayList, upcomingList } = useMemo(() => {
    const overdue: PaymentFollowup[] = [];
    const dueToday: PaymentFollowup[] = [];
    const upcoming: PaymentFollowup[] = [];

    items.forEach((item) => {
      const remaining = Math.max(0, item.total_amount - (item.paid_amount || 0));
      if (item.status === "Ödendi" || remaining <= 0) return;

      if (item.due_date < todayStr) {
        overdue.push(item);
      } else if (item.due_date === todayStr) {
        dueToday.push(item);
      } else {
        upcoming.push(item);
      }
    });

    return { overdueList: overdue, todayList: dueToday, upcomingList: upcoming };
  }, [items, todayStr]);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchQ =
      item.contact_name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.personnel.toLowerCase().includes(q);
    const matchType = typeTab === "all" || item.type === typeTab;
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchQ && matchType && matchStatus;
  });

  const totalAlacakKalan = items
    .filter((i) => i.type === "alacak")
    .reduce((sum, i) => sum + Math.max(0, i.total_amount - (i.paid_amount || 0)), 0);

  const totalBorcKalan = items
    .filter((i) => i.type === "borc")
    .reduce((sum, i) => sum + Math.max(0, i.total_amount - (i.paid_amount || 0)), 0);

  function handleOpenNew() {
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function handleEdit(item: PaymentFollowup) {
    setEditingItem(item);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu ödeme takip kaydını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      await actionDeletePaymentFollowup(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Kayıt silindi.");
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await actionSavePaymentFollowup(formData);
      if (res.success && res.payment) {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.id === res.payment!.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.payment!;
            return next;
          }
          return [res.payment!, ...prev];
        });
        toast.success(editingItem ? "Ödeme kaydı güncellendi!" : "Yeni ödeme takibi eklendi!");
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
            <CalendarClock className="text-brand-navy" size={24} />
            Toplanacak & Yapılacak Ödeme Takibi
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Müşteri tahsilat vadeleri, tedarikçi ödemeleri, kısmi ödemeler ve tarih ertelemeleri
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
              Tümü ({items.length})
            </button>
            <button
              onClick={() => setTypeTab("alacak")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                typeTab === "alacak" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <ArrowDownLeft size={13} /> Toplanacaklar (Alacak)
            </button>
            <button
              onClick={() => setTypeTab("borc")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                typeTab === "borc" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              <ArrowUpRight size={13} /> Yapılacaklar (Borç)
            </button>
          </div>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus size={16} /> + Yeni Ödeme / Vade Gir
          </button>
        </div>
      </div>

      {/* VADE VE GÜNÜ GELEN UYARI KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kırmızı: Vadesi Geçmiş */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-rose-600" />
              🔴 Vadesi Geçmiş Ödemeler
            </span>
            <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {overdueList.length} Kayıt
            </span>
          </div>
          <p className="text-xl font-black text-rose-900 mt-1">
            {formatCurrency(overdueList.reduce((s, i) => s + Math.max(0, i.total_amount - i.paid_amount), 0))}
          </p>
          <p className="text-[11px] text-rose-700">
            {overdueList.length > 0
              ? `${overdueList[0].contact_name} dahil ${overdueList.length} ödemenin vadesi geçmiş!`
              : "Vadesi geçmiş bekleyen ödeme bulunmuyor."}
          </p>
        </div>

        {/* Sarı: Bugün Son Gün */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Clock size={15} className="text-amber-600" />
              🟡 Bugün Ödenecek / Toplanacak
            </span>
            <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {todayList.length} Kayıt
            </span>
          </div>
          <p className="text-xl font-black text-amber-900 mt-1">
            {formatCurrency(todayList.reduce((s, i) => s + Math.max(0, i.total_amount - i.paid_amount), 0))}
          </p>
          <p className="text-[11px] text-amber-700">
            {todayList.length > 0 ? "Bugün işlem yapılması gereken vadeler var!" : "Bugün için bekleyen vade yok."}
          </p>
        </div>

        {/* Yeşil / Özet Bakiye */}
        <div className="bg-white border border-border rounded-2xl p-4 space-y-1 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-text-muted font-semibold">
            <span>Toplam Toplanacak (Alacak):</span>
            <span className="text-emerald-700 font-bold">{formatCurrency(totalAlacakKalan)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-text-muted font-semibold">
            <span>Toplam Yapılacak (Borç):</span>
            <span className="text-rose-700 font-bold">{formatCurrency(totalBorcKalan)}</span>
          </div>
          <div className="border-t border-border pt-1.5 flex justify-between items-center text-xs font-bold">
            <span>Net Bekleyen Nakit Akışı:</span>
            <span className={totalAlacakKalan >= totalBorcKalan ? "text-emerald-700 text-sm font-black" : "text-rose-700 text-sm font-black"}>
              {formatCurrency(totalAlacakKalan - totalBorcKalan)}
            </span>
          </div>
        </div>
      </div>

      {/* Arama ve Filtreler */}
      <div className="bg-white p-4 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri / tedarikçi adı, personel veya açıklama ara..."
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
            <option value="Bekliyor">Bekliyor</option>
            <option value="Kısmi Ödendi">Kısmi Ödendi</option>
            <option value="Ödendi">Ödendi</option>
            <option value="Ertelendi">Ertelendi</option>
          </select>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Tip</th>
                <th className="py-3 px-4">Görüşme Tarihi</th>
                <th className="py-3 px-4">Müşteri / Tedarikçi</th>
                <th className="py-3 px-4">Açıklama</th>
                <th className="py-3 px-4">Personel</th>
                <th className="py-3 px-4">Ödeme Şekli</th>
                <th className="py-3 px-4">Vade (Ödeyeceği Tarih)</th>
                <th className="py-3 px-4 text-right">Toplam / Ödenen</th>
                <th className="py-3 px-4 text-right">Kalan Tutar</th>
                <th className="py-3 px-4 text-center">Durum / Not</th>
                <th className="py-3 px-4 text-center w-20">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-text-muted">
                    Kayıtlı ödeme takibi bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const remaining = Math.max(0, item.total_amount - (item.paid_amount || 0));
                  const isOverdue = remaining > 0 && item.due_date < todayStr;
                  const isToday = remaining > 0 && item.due_date === todayStr;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface/50 transition ${
                        isOverdue ? "bg-rose-50/20" : isToday ? "bg-amber-50/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            item.type === "alacak"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {item.type === "alacak" ? "Toplanacak" : "Yapılacak"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-muted">{item.contact_date}</td>
                      <td className="py-3 px-4 font-bold text-text">{item.contact_name}</td>
                      <td className="py-3 px-4 max-w-xs truncate text-text-muted">{item.description || "-"}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text">{item.personnel || "-"}</div>
                        {item.created_by_name && (
                          <div className="text-[10px] text-brand-navy font-medium flex items-center gap-0.5 mt-0.5">
                            <User size={10} /> {item.created_by_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium bg-surface px-2 py-0.5 rounded border border-border">
                          {item.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isOverdue
                                ? "text-rose-600 underline"
                                : isToday
                                ? "text-amber-600 font-black"
                                : "text-text"
                            }`}
                          >
                            {item.due_date}
                          </span>
                          {isOverdue && (
                            <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                              GÜNÜ GEÇTİ
                            </span>
                          )}
                          {isToday && (
                            <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                              BUGÜN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-bold text-text tabular-nums">{formatCurrency(item.total_amount)}</p>
                        {item.paid_amount > 0 && (
                          <p className="text-[10px] text-emerald-600 tabular-nums">
                            Ödenen: {formatCurrency(item.paid_amount)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black tabular-nums">
                        <span className={remaining > 0 ? "text-rose-700" : "text-emerald-700"}>
                          {formatCurrency(remaining)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            item.status === "Ödendi"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "Kısmi Ödendi"
                              ? "bg-amber-100 text-amber-800"
                              : item.status === "Ertelendi"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.notes && <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-[120px]">{item.notes}</p>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 rounded text-brand-navy hover:bg-surface transition"
                            title="Düzenle / Kısmi Ödeme Yap / Tarih Ertele"
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

      {/* YENİ / DÜZENLEME MODALI (Kullanıcının İstediği Kısmi Ödeme & Tarih Erteleme Özellikli) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <CalendarClock className="text-brand-navy" size={20} />
                {editingItem ? "Ödemeyi Düzenle / Kısmi Ödeme / Tarih Ertele" : "Yeni Ödeme Takibi Ekle"}
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
                  <label className="block font-semibold text-text mb-1">Takip Türü *</label>
                  <select
                    name="type"
                    defaultValue={editingItem?.type || "alacak"}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-bold"
                  >
                    <option value="alacak">Toplanacak (Müşteri Alacağı)</option>
                    <option value="borc">Yapılacak (Tedarikçi Borcu)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Görüşme Tarihi</label>
                  <input
                    type="date"
                    name="contact_date"
                    defaultValue={editingItem?.contact_date || todayStr}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Müşteri / Tedarikçi Adı *</label>
                <input
                  type="text"
                  required
                  name="contact_name"
                  defaultValue={editingItem?.contact_name || ""}
                  placeholder="Örn: Yılmaz İnşaat veya KYK Kimya..."
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">İlgilenen Personel</label>
                  <input
                    type="text"
                    name="personnel"
                    defaultValue={editingItem?.personnel || userName}
                    placeholder="Ahmet Bey"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Ödeme Şekli</label>
                  <select
                    name="payment_method"
                    defaultValue={editingItem?.payment_method || "Nakit"}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-semibold"
                  >
                    <option value="Nakit">Nakit</option>
                    <option value="Havale/EFT">Banka Havale/EFT</option>
                    <option value="Kredi Kartı">Kredi Kartı / POS</option>
                    <option value="Çek">Çek</option>
                    <option value="Senet">Senet</option>
                  </select>
                </div>
              </div>

              {/* Tutar, Ödenen Tutar ve Vade Tarihi (Editlenebilir Kısmi Ödeme Mantığı) */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-3">
                <p className="text-[11px] font-bold text-amber-900">
                  💡 Kısmi Ödeme & Tarih Erteleme (Örn: 30 bin vardı, 20 ödedi, kalan 10'u 30'una ertele)
                </p>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-text mb-1">Toplam Tutar (₺) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      name="total_amount"
                      defaultValue={editingItem?.total_amount || ""}
                      placeholder="30000"
                      className="w-full border-2 border-border rounded-lg px-3 py-2 bg-white outline-none focus:border-brand-navy font-black text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">Ödenen Tutar (₺)</label>
                    <input
                      type="number"
                      step="any"
                      name="paid_amount"
                      defaultValue={editingItem?.paid_amount || 0}
                      placeholder="20000"
                      className="w-full border-2 border-emerald-300 rounded-lg px-3 py-2 bg-white outline-none focus:border-emerald-600 font-black text-sm text-emerald-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-rose-800 mb-1">Vade (Son Ödeme)</label>
                    <input
                      type="date"
                      required
                      name="due_date"
                      defaultValue={editingItem?.due_date || todayStr}
                      className="w-full border-2 border-border rounded-lg px-2.5 py-2 bg-white outline-none focus:border-brand-navy font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Durum / Statü</label>
                  <select
                    name="status"
                    defaultValue={editingItem?.status || "Bekliyor"}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-bold"
                  >
                    <option value="Bekliyor">Bekliyor</option>
                    <option value="Kısmi Ödendi">Kısmi Ödendi</option>
                    <option value="Ödendi">Ödendi (Tamamlandı)</option>
                    <option value="Ertelendi">Ertelendi (Yeni Tarih Verildi)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-text mb-1">Açıklama / Fatura</label>
                  <input
                    type="text"
                    name="description"
                    defaultValue={editingItem?.description || ""}
                    placeholder="Fatura no veya detay..."
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Görüşme Notu / Durum Detayı</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingItem?.notes || ""}
                  placeholder="Müşteriyle konuşuldu, kalan tutar haftaya havale edilecek..."
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
                  {isPending ? "Kaydediliyor..." : "Kaydet ve Takibe Al"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
