"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { addPartnerNote, togglePartnerNote, deletePartnerNote } from "./actions";
import { toast } from "sonner";
import {
  StickyNote,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Banknote,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  Clock,
} from "lucide-react";

export interface NoteItem {
  id: string;
  partner_id?: string | null;
  partner_name?: string;
  title: string;
  content: string;
  amount?: number | null;
  due_date?: string | null;
  priority: "normal" | "urgent" | "financial";
  is_completed: boolean;
  created_at: string;
}

export function PartnerNotesSection({
  partners,
  notes,
}: {
  partners: Array<{ id: string; name: string }>;
  notes: NoteItem[];
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | string>("all");
  const [showModal, setShowModal] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Modal State
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent" | "financial">("normal");
  const [submitting, setSubmitting] = useState(false);

  // Filtreleme
  const filteredNotes = notes.filter((n) => {
    if (filter === "pending") return !n.is_completed;
    if (filter === "completed") return n.is_completed;
    if (filter !== "all") {
      return n.partner_id === filter || n.partner_name === filter;
    }
    return true;
  });

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Lütfen bir not başlığı girin.");
      return;
    }

    setSubmitting(true);
    try {
      const partnerObj = partners.find((p) => p.id === selectedPartnerId);
      const formData = new FormData();
      formData.set("partner_id", selectedPartnerId);
      formData.set("partner_name", partnerObj?.name || "Ortaklar");
      formData.set("title", title.trim());
      formData.set("content", content.trim());
      formData.set("amount", amount);
      formData.set("due_date", dueDate);
      formData.set("priority", priority);

      await addPartnerNote(formData);
      toast.success("Özel ortak notu eklendi!");
      setShowModal(false);
      setTitle("");
      setContent("");
      setAmount("");
      setDueDate("");
      setPriority("normal");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Not eklenemedi";
      toast.error("Hata: " + msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(note: NoteItem) {
    setLoadingId(note.id);
    try {
      await togglePartnerNote(note.id, note.is_completed);
      toast.success(
        note.is_completed ? "Not tekrar beklemeye alındı." : "Not tamamlandı olarak işaretlendi!"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "İşlem başarısız";
      toast.error("Hata: " + msg);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(noteId: string) {
    if (!confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    setLoadingId(noteId);
    try {
      await deletePartnerNote(noteId);
      toast.success("Not silindi.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Silme başarısız";
      toast.error("Hata: " + msg);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
      {/* Üst Başlık & Aksiyon */}
      <div className="p-5 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl">
            <StickyNote size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">
              Ortaklar Arası Özel Not Defteri
            </h2>
            <p className="text-xs text-text-muted">
              Projeden ve resmi muhasebeden tamamen bağımsız, şahsi hatırlatmalar ve sözleşmeler.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus size={15} /> Yeni Not Ekle
        </button>
      </div>

      {/* Filtre Barı */}
      <div className="p-3 border-b border-border bg-white flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            filter === "all"
              ? "bg-brand-navy text-white"
              : "bg-surface hover:bg-gray-200 text-text-muted hover:text-text"
          }`}
        >
          Tüm Notlar ({notes.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            filter === "pending"
              ? "bg-amber-600 text-white"
              : "bg-surface hover:bg-gray-200 text-text-muted hover:text-text"
          }`}
        >
          Bekleyenler ({notes.filter((n) => !n.is_completed).length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("completed")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition ${
            filter === "completed"
              ? "bg-emerald-600 text-white"
              : "bg-surface hover:bg-gray-200 text-text-muted hover:text-text"
          }`}
        >
          Tamamlananlar ({notes.filter((n) => n.is_completed).length})
        </button>

        {partners.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setFilter(p.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filter === p.id
                ? "bg-brand-gold text-brand-navy"
                : "bg-surface hover:bg-gray-200 text-text-muted hover:text-text"
            }`}
          >
            {p.name}&apos;in Notları
          </button>
        ))}
      </div>

      {/* Not Kartları Izgarası */}
      <div className="p-5">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl bg-surface/30">
            <StickyNote size={36} className="mx-auto text-text-muted/40 mb-2" />
            <p className="text-sm font-semibold text-text mb-1">
              Henüz bir özel not bulunmuyor.
            </p>
            <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
              Ahmet veya Mehmet kendi aralarında borç ödeme sözleri, mazot anlaşmaları veya kâr
              paylaşımı hatırlatmalarını buraya ekleyebilir.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 bg-brand-navy text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-brand-navy-2 transition"
            >
              <Plus size={14} /> İlk Notu Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const isLoading = loadingId === note.id;
              return (
                <div
                  key={note.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    note.is_completed
                      ? "bg-gray-50/80 border-gray-200 opacity-75"
                      : note.priority === "urgent"
                      ? "bg-rose-50/40 border-rose-200 shadow-xs"
                      : note.priority === "financial"
                      ? "bg-emerald-50/40 border-emerald-200 shadow-xs"
                      : "bg-white border-border hover:border-brand-gold/60 shadow-xs"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Rozetler */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold bg-surface px-2 py-0.5 rounded-md border border-border text-text">
                          {note.partner_name || "Ortak Not"}
                        </span>
                        {note.priority === "urgent" && (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle size={11} /> Acil
                          </span>
                        )}
                        {note.priority === "financial" && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Banknote size={11} /> Ödeme
                          </span>
                        )}
                      </div>

                      {note.amount && (
                        <span className="text-xs font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(note.amount)}
                        </span>
                      )}
                    </div>

                    {/* Başlık ve İçerik */}
                    <div>
                      <h3
                        className={`text-sm font-bold text-text ${
                          note.is_completed ? "line-through text-text-muted" : ""
                        }`}
                      >
                        {note.title}
                      </h3>
                      {note.content && (
                        <p
                          className={`text-xs text-text-muted mt-1 leading-relaxed ${
                            note.is_completed ? "line-through text-gray-400" : ""
                          }`}
                        >
                          {note.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Alt Bar: Vade & Butonlar */}
                  <div className="pt-3 mt-3 border-t border-border/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                      {note.due_date ? (
                        <>
                          <Calendar size={13} className="text-amber-600" />
                          <span>Vade: {formatDate(note.due_date)}</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} />
                          <span>{formatDate(note.created_at)}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleToggle(note)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          note.is_completed
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-surface hover:bg-gray-200 text-text border border-border"
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : note.is_completed ? (
                          <>
                            <CheckCircle2 size={13} className="text-emerald-700" /> Tamamlandı
                          </>
                        ) : (
                          <>
                            <Circle size={13} className="text-text-muted" /> Yapıldı
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleDelete(note.id)}
                        className="text-text-muted hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                        title="Notu Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Yeni Not Ekleme Modalı */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-border">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <StickyNote size={18} className="text-amber-600" />
                Yeni Özel Ortak Notu
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">
                  İlgili Ortak / Not Sahibi
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text outline-none focus:border-brand-gold"
                >
                  <option value="">Ortak (Her İkisi)</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Not Başlığı *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Mehmet haftaya mazot parasını kasaya koyacak"
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-brand-gold font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Detay / Anlaşma</label>
                <textarea
                  rows={2}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ek açıklama, hesaplama veya hatırlatma..."
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-brand-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1 flex items-center gap-1">
                    <Banknote size={12} className="text-emerald-600" /> Tutar (İsteğe Bağlı)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Örn: 50000"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text font-bold outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1 flex items-center gap-1">
                    <Calendar size={12} className="text-amber-600" /> Vade / Tarih
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Öncelik / Tür</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority("normal")}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      priority === "normal"
                        ? "bg-brand-navy text-white border-brand-navy"
                        : "bg-surface border-border text-text"
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("financial")}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      priority === "financial"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-surface border-border text-emerald-800"
                    }`}
                  >
                    Ödeme / Borç
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("urgent")}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      priority === "urgent"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-surface border-border text-rose-800"
                    }`}
                  >
                    Acil
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-border hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-navy hover:bg-brand-navy-2 text-white flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-brand-gold" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Notu Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
