"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  Trash2,
  Search,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  restoreQuote,
  permanentDeleteQuote,
  restoreAllQuotes,
  emptyTrashQuotes,
} from "./[id]/actions";

interface DeletedQuote {
  id: string;
  quote_code: string;
  created_at: string;
  deleted_at: string;
  grand_total: number | null;
  total_amount: number | null;
  status: string;
  customer_snapshot?: any;
  customer?: { company_name?: string; contact_name?: string } | null;
  created_by?: string | null;
}

interface Props {
  deletedQuotes: DeletedQuote[];
  profileMap?: Record<string, string>;
  canManage?: boolean;
}

// Türkçe göreceli zaman hesaplayıcı (iPhone Son Silinenler stili)
function formatRelativeTime(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  const timeStr = date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return `Bugün ${timeStr}`;
  }
  if (diffDays === 1 || (diffHours < 48 && date.getDate() === now.getDate() - 1)) {
    return `Dün ${timeStr}`;
  }
  if (diffDays < 7) {
    return `${diffDays} gün önce ${timeStr}`;
  }
  return `${formatDate(dateString)} ${timeStr}`;
}

export function TrashQuotesClient({
  deletedQuotes,
  profileMap = {},
  canManage = true,
}: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Aktif çalışan tekil işlem id'si (spinner göstermek için)
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // Modal durumları
  const [confirmPermanentId, setConfirmPermanentId] = useState<DeletedQuote | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);

  // Arama filtreleme
  const filteredQuotes = useMemo(() => {
    if (!searchTerm.trim()) return deletedQuotes;
    const q = searchTerm.toLowerCase().trim();
    return deletedQuotes.filter((item) => {
      const codeMatch = item.quote_code?.toLowerCase().includes(q);
      const customerCompany =
        item.customer_snapshot?.company_name || item.customer?.company_name || "";
      const customerContact =
        item.customer_snapshot?.contact_name || item.customer?.contact_name || "";
      return (
        codeMatch ||
        customerCompany.toLowerCase().includes(q) ||
        customerContact.toLowerCase().includes(q)
      );
    });
  }, [deletedQuotes, searchTerm]);

  // Tekil Kurtarma
  function handleRestore(id: string, code: string) {
    setActiveActionId(id);
    startTransition(async () => {
      try {
        await restoreQuote(id);
        toast.success(`TKF-${code} teklifi başarıyla aktif listeye geri kurtarıldı!`);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Teklif kurtarılamadı.";
        toast.error(msg);
      } finally {
        setActiveActionId(null);
      }
    });
  }

  // Tekil Kalıcı Silme
  function handlePermanentDelete(quote: DeletedQuote) {
    setActiveActionId(quote.id);
    startTransition(async () => {
      try {
        await permanentDeleteQuote(quote.id);
        toast.success(`TKF-${quote.quote_code} kalıcı olarak sistemden silindi.`);
        setConfirmPermanentId(null);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Kalıcı silme başarısız.";
        toast.error(msg);
      } finally {
        setActiveActionId(null);
      }
    });
  }

  // Tümünü Kurtar
  function handleRestoreAll() {
    startTransition(async () => {
      try {
        await restoreAllQuotes();
        toast.success("Son silinenlerdeki tüm teklifler başarıyla geri kurtarıldı!");
        setConfirmRestoreAll(false);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Teklifler kurtarılamadı.";
        toast.error(msg);
      }
    });
  }

  // Çöp Kutusunu Boşalt
  function handleEmptyTrash() {
    startTransition(async () => {
      try {
        const res = await emptyTrashQuotes();
        toast.success(`Çöp kutusu boşaltıldı. Toplam ${res?.count ?? 0} teklif kalıcı olarak silindi.`);
        setConfirmEmptyTrash(false);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Çöp kutusu boşaltılamadı.";
        toast.error(msg);
      }
    });
  }

  const statusLabels: Record<string, string> = {
    draft: "Taslak",
    sent: "Müşteriye Verildi",
    accepted: "Kabul Edildi",
    rejected: "Reddedildi",
    expired: "Süresi Doldu",
    converted_to_sale: "Satışa Döndü",
    cancelled: "İptal",
  };

  return (
    <div className="space-y-6">
      {/* Bilgi ve Üst Aksiyon Paneli */}
      <div className="bg-gradient-to-r from-rose-50 via-amber-50/40 to-white border border-rose-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-xs">
              <Trash2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-text">
                  Son Silinen Teklifler
                </h2>
                <span className="bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-rose-200">
                  {deletedQuotes.length} Teklif
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Silinen teklifler iPhone çöp kutusu gibi burada saklanır. İstediğiniz teklifi tek tıkla{" "}
                <strong className="text-emerald-700 font-semibold">Geri Kurtarabilir</strong> veya{" "}
                <strong className="text-rose-600 font-semibold">Kalıcı Olarak Silebilirsiniz</strong>.
              </p>
            </div>
          </div>

          {canManage && deletedQuotes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setConfirmRestoreAll(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition"
              >
                <RotateCcw size={14} /> Tümünü Kurtar
              </button>
              <button
                type="button"
                onClick={() => setConfirmEmptyTrash(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-rose-200 transition"
              >
                <Trash2 size={14} /> Çöp Kutusunu Boşalt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Arama Barı */}
      {deletedQuotes.length > 0 && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-border flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Silinen teklif no (TKF-...) veya müşteri ara..."
              className="w-full pl-9 pr-4 py-2 bg-surface text-text text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-gold focus:bg-white transition"
            />
          </div>
          <div className="text-xs text-text-muted">
            {filteredQuotes.length} / {deletedQuotes.length} sonuç listeleniyor
          </div>
        </div>
      )}

      {/* Liste / Tablo */}
      {deletedQuotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text">Son Silinenler Kutusu Tertemiz</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto mt-1">
              Şu anda silinmiş veya çöp kutusunda bekleyen bir teklif bulunmuyor.
              Teklifler tablosundan sildiğiniz teklifler burada toplanır.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/teklifler"
              className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy-light text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
            >
              <FileText size={15} /> Aktif Tekliflere Dön
            </Link>
          </div>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-8 text-center text-text-muted text-sm">
          &quot;{searchTerm}&quot; aramanıza uygun silinmiş teklif bulunamadı.
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="text-brand-gold text-xs font-bold underline"
            >
              Aramayı Temizle
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Teklif No
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Müşteri Adı
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Silinme Zamanı
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Durum
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Toplam Tutar
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                    İşlemler (Kurtar / Kalıcı Sil)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuotes.map((quote) => {
                  const customerName =
                    quote.customer_snapshot?.company_name ||
                    quote.customer_snapshot?.contact_name ||
                    quote.customer?.company_name ||
                    quote.customer?.contact_name ||
                    "Müşterisiz";

                  const isCurrentActive = activeActionId === quote.id && isPending;

                  return (
                    <tr
                      key={quote.id}
                      className="hover:bg-rose-50/30 transition group"
                    >
                      {/* Teklif No */}
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-text">
                        <Link
                          href={`/teklifler/${quote.id}`}
                          className="text-brand-navy hover:text-brand-gold underline decoration-dotted flex items-center gap-1.5"
                        >
                          TKF-{quote.quote_code}
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition" />
                        </Link>
                      </td>

                      {/* Müşteri */}
                      <td className="px-4 py-3.5 font-medium text-text">
                        <div className="truncate max-w-xs">{customerName}</div>
                      </td>

                      {/* Silinme Zamanı */}
                      <td className="px-4 py-3.5 text-xs text-text-muted whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-rose-500" />
                          <span
                            className="font-medium text-text"
                            title={new Date(quote.deleted_at).toLocaleString("tr-TR")}
                          >
                            {formatRelativeTime(quote.deleted_at)}
                          </span>
                        </div>
                      </td>

                      {/* Durum */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {statusLabels[quote.status] || quote.status}
                        </span>
                      </td>

                      {/* Toplam Tutar */}
                      <td className="px-4 py-3.5 text-right tabular-nums font-bold text-text whitespace-nowrap">
                        {formatCurrency(quote.grand_total || quote.total_amount)}
                      </td>

                      {/* İşlemler */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* TEKLİFİ KURTAR BUTONU */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRestore(quote.id, quote.quote_code)}
                              disabled={isPending}
                              title="Teklifi Geri Kurtar (Aktif Tekliflere Ekle)"
                              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-300 transition shadow-xs group/btn"
                            >
                              {isCurrentActive ? (
                                <Loader2 size={13} className="animate-spin text-emerald-700" />
                              ) : (
                                <RotateCcw size={13} className="group-hover/btn:-rotate-45 transition duration-300" />
                              )}
                              Kurtar
                            </button>
                          )}

                          {/* İNCELE */}
                          <Link
                            href={`/teklifler/${quote.id}`}
                            className="bg-surface hover:bg-gray-200 text-text px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border transition"
                          >
                            İncele
                          </Link>

                          {/* KALICI SİL */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setConfirmPermanentId(quote)}
                              disabled={isPending}
                              title="Kalıcı Olarak Sil"
                              className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-border hover:border-rose-300 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Tekil Kalıcı Silme Onayı */}
      {confirmPermanentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-border">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-text">Kalıcı Olarak Silinsin mi?</h3>
                <p className="text-xs text-rose-600 font-semibold">Bu işlem geri alınamaz!</p>
              </div>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              <strong className="text-text">TKF-{confirmPermanentId.quote_code}</strong> numaralı teklif ve tüm kalemleri veritabanından tamamen silinecektir. Bir daha geri kurtarılamaz.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPermanentId(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface rounded-xl transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDelete(confirmPermanentId)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                Evet, Kalıcı Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Tümünü Kurtar Onayı */}
      {confirmRestoreAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-border">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <RotateCcw size={22} />
              </div>
              <h3 className="font-bold text-base text-text">Tümünü Kurtar</h3>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Son silinenlerde bulunan <strong className="text-text">{deletedQuotes.length} adet</strong> teklifin tamamı aktif teklifler listesine geri yüklenecektir.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreAll(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface rounded-xl transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleRestoreAll}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                Evet, Tümünü Kurtar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Çöp Kutusunu Boşalt Onayı */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-border">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-text">Çöp Kutusu Boşaltılsın mı?</h3>
                <p className="text-xs text-rose-600 font-semibold">Tüm silinenler kalıcı olarak yok olacak!</p>
              </div>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Son silinenlerdeki <strong className="text-rose-600">{deletedQuotes.length} adet teklif</strong> veritabanından kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEmptyTrash(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface rounded-xl transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleEmptyTrash}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                Evet, Çöp Kutusunu Boşalt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
