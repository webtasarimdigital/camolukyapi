"use client";

import { useState, useTransition, useMemo } from "react";
import type { CompanyPortal } from "./types";
import { savePortal, deletePortal } from "./actions";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Building2,
  KeyRound,
  ShieldCheck,
  Fuel,
  FileText,
  Landmark,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";

interface Props {
  initialPortals: CompanyPortal[];
  userRole: string;
  userName: string;
}

const CATEGORIES = [
  "Tümü",
  "B2B Tedarikçi",
  "E-Dönüşüm / Fatura",
  "Filo / GPS",
  "Banka",
  "Resmi Kurum",
  "Diğer",
] as const;

export function PortalClient({ initialPortals, userRole, userName }: Props) {
  const isReadOnly = ["tali_bayi", "bayi", "depo", "sofor"].includes(userRole);
  const canDelete = ["admin", "muhasebe1", "muhasebe2"].includes(userRole);

  const [portals, setPortals] = useState<CompanyPortal[]>(initialPortals);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // State for show/hide passwords
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<CompanyPortal | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return portals.filter((p) => {
      const matchCat = selectedCategory === "Tümü" || p.category === selectedCategory;
      const q = search.toLowerCase();
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q));

      return matchCat && matchQ;
    });
  }, [portals, selectedCategory, search]);

  function handleCopy(text: string, fieldId: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success(`${label} kopyalandı!`);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function toggleRevealPassword(id: string) {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleOpenNew() {
    if (isReadOnly) {
      toast.error("Yetkiniz bulunmuyor! Yalnızca görüntüleme yetkiniz bulunmaktadır.");
      return;
    }
    setEditingPortal(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(portal: CompanyPortal) {
    if (isReadOnly) {
      toast.error("Yetkiniz bulunmuyor! Yalnızca görüntüleme yetkiniz bulunmaktadır.");
      return;
    }
    setEditingPortal(portal);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!canDelete) {
      toast.error("Yetkiniz bulunmuyor! Yalnızca yöneticiler portal silebilir.");
      return;
    }
    if (!confirm("Bu şirket portalını silmek istediğinize emin misiniz?")) return;

    startTransition(async () => {
      const res = await deletePortal(id);
      if (res.success) {
        setPortals((prev) => prev.filter((p) => p.id !== id));
        toast.success("Portal silindi.");
      } else {
        toast.error(res.error || "Portal silinemedi.");
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = (formData.get("title") as string) || "";
    const category = (formData.get("category") as CompanyPortal["category"]) || "Diğer";
    let url = (formData.get("url") as string) || "";
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const username = (formData.get("username") as string) || "";
    const password = (formData.get("password") as string) || "";
    const notes = (formData.get("notes") as string) || "";

    startTransition(async () => {
      const res = await savePortal({
        id: editingPortal?.id,
        title,
        category,
        url,
        username,
        password,
        notes,
      });

      if (res.success && res.portal) {
        setPortals((prev) => {
          const idx = prev.findIndex((p) => p.id === res.portal!.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.portal!;
            return next;
          }
          return [...prev, res.portal!];
        });
        toast.success(editingPortal ? "Portal güncellendi!" : "Yeni portal kaydedildi!");
        setIsModalOpen(false);
      } else {
        toast.error(res.error || "İşlem başarısız.");
      }
    });
  }

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case "Filo / GPS":
        return <Fuel size={16} className="text-amber-600" />;
      case "B2B Tedarikçi":
        return <Building2 size={16} className="text-blue-600" />;
      case "E-Dönüşüm / Fatura":
        return <FileText size={16} className="text-purple-600" />;
      case "Banka":
        return <Landmark size={16} className="text-emerald-600" />;
      case "Resmi Kurum":
        return <ShieldCheck size={16} className="text-rose-600" />;
      default:
        return <Globe size={16} className="text-brand-navy" />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Globe className="text-brand-navy" size={24} />
            Şirket Portalları ve B2B Girişleri
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Tedarikçi sistemleri, e-fatura/e-irsaliye portalları, Otobil ve banka giriş bilgileri merkezi rehberi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Görünüm Seçici */}
          <div className="flex bg-surface p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid" ? "bg-white text-brand-navy shadow-xs" : "text-text-muted hover:text-text"
              }`}
              title="Kart Görünümü"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "list" ? "bg-white text-brand-navy shadow-xs" : "text-text-muted hover:text-text"
              }`}
              title="Liste Görünümü"
            >
              <List size={15} />
            </button>
          </div>

          {!isReadOnly && (
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-light text-brand-navy px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus size={16} /> + Yeni Portal Ekle
            </button>
          )}
        </div>
      </div>

      {/* Kategori Hapları & Arama */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-brand-navy text-white shadow-xs font-bold"
                  : "bg-surface hover:bg-surface/80 text-text border border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="bg-white p-3 rounded-2xl border border-border flex items-center gap-3 shadow-xs">
          <Search size={16} className="text-text-muted ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Portal adı, kategori, kullanıcı adı veya not ara..."
            className="w-full text-xs bg-transparent outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-text-muted hover:text-text px-2">
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* KART GÖRÜNÜMÜ */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-text-muted bg-white rounded-2xl border border-border">
              Kayıtlı şirket portalı bulunamadı.
            </div>
          ) : (
            filtered.map((portal) => {
              const isPwVisible = Boolean(revealedPasswords[portal.id]);

              return (
                <div
                  key={portal.id}
                  className="bg-white rounded-2xl border border-border p-5 space-y-4 hover:border-brand-navy/30 hover:shadow-md transition duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Kart Başlığı ve Kategori */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center flex-shrink-0">
                          {getCategoryIcon(portal.category)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-text leading-snug">{portal.title}</h3>
                          <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
                            {portal.category}
                          </span>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(portal)}
                            className="p-1 rounded text-brand-navy hover:bg-surface transition"
                            title="Düzenle"
                          >
                            <Edit3 size={14} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(portal.id)}
                              className="p-1 rounded text-rose-400 hover:text-rose-600 transition"
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Notlar */}
                    {portal.notes && (
                      <p className="text-xs text-text-muted line-clamp-2 bg-surface/50 p-2 rounded-lg border border-border/60">
                        {portal.notes}
                      </p>
                    )}

                    {/* Kullanıcı Adı ve Şifre Alanı */}
                    <div className="space-y-2 pt-1 border-t border-border/70 text-xs">
                      {portal.username && (
                        <div className="flex items-center justify-between bg-surface px-2.5 py-1.5 rounded-lg border border-border">
                          <span className="text-[11px] text-text-muted font-medium">Kullanıcı:</span>
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-text">
                            <span className="truncate max-w-[150px]">{portal.username}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(portal.username!, `u-${portal.id}`, "Kullanıcı adı")}
                              className="p-1 hover:bg-white rounded transition text-text-muted hover:text-brand-navy"
                              title="Kullanıcı Adını Kopyala"
                            >
                              {copiedField === `u-${portal.id}` ? (
                                <Check size={12} className="text-emerald-600 font-bold" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {portal.password && (
                        <div className="flex items-center justify-between bg-surface px-2.5 py-1.5 rounded-lg border border-border">
                          <span className="text-[11px] text-text-muted font-medium">Şifre:</span>
                          <div className="flex items-center gap-1 font-mono font-semibold text-text">
                            <span>{isPwVisible ? portal.password : "••••••••"}</span>
                            <button
                              type="button"
                              onClick={() => toggleRevealPassword(portal.id)}
                              className="p-1 hover:bg-white rounded transition text-text-muted hover:text-brand-navy ml-1"
                              title={isPwVisible ? "Şifreyi Gizle" : "Şifreyi Göster"}
                            >
                              {isPwVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(portal.password!, `p-${portal.id}`, "Şifre")}
                              className="p-1 hover:bg-white rounded transition text-text-muted hover:text-brand-navy"
                              title="Şifreyi Kopyala"
                            >
                              {copiedField === `p-${portal.id}` ? (
                                <Check size={12} className="text-emerald-600 font-bold" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Portala Git Butonu */}
                  <div className="pt-2">
                    <a
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white py-2 rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <ExternalLink size={13} />
                      Portala Git ↗
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* LİSTE GÖRÜNÜMÜ */
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-surface border-b border-border text-text-muted uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Portal Adı</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Kullanıcı Adı</th>
                  <th className="py-3 px-4">Şifre</th>
                  <th className="py-3 px-4">Açıklama / Not</th>
                  <th className="py-3 px-4 text-center">Git</th>
                  {!isReadOnly && <th className="py-3 px-4 text-center w-16">İşlem</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isReadOnly ? 6 : 7} className="py-12 text-center text-text-muted">
                      Kayıtlı portal bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtered.map((portal) => {
                    const isPwVisible = Boolean(revealedPasswords[portal.id]);

                    return (
                      <tr key={portal.id} className="hover:bg-surface/50 transition">
                        <td className="py-3 px-4 font-bold text-text">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(portal.category)}
                            <span>{portal.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-surface px-2 py-0.5 rounded font-semibold text-text border border-border text-[11px]">
                            {portal.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {portal.username ? (
                            <div className="flex items-center gap-1">
                              <span>{portal.username}</span>
                              <button
                                onClick={() => handleCopy(portal.username!, `u-${portal.id}`, "Kullanıcı adı")}
                                className="p-0.5 text-text-muted hover:text-brand-navy"
                              >
                                {copiedField === `u-${portal.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {portal.password ? (
                            <div className="flex items-center gap-1">
                              <span>{isPwVisible ? portal.password : "••••••••"}</span>
                              <button
                                onClick={() => toggleRevealPassword(portal.id)}
                                className="p-0.5 text-text-muted hover:text-brand-navy"
                              >
                                {isPwVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                              <button
                                onClick={() => handleCopy(portal.password!, `p-${portal.id}`, "Şifre")}
                                className="p-0.5 text-text-muted hover:text-brand-navy"
                              >
                                {copiedField === `p-${portal.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              </button>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-text-muted">
                          {portal.notes || "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <a
                            href={portal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-surface hover:bg-surface/80 border border-border px-2.5 py-1 rounded-lg font-bold text-[11px] text-brand-navy"
                          >
                            <ExternalLink size={12} /> Git ↗
                          </a>
                        </td>
                        {!isReadOnly && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(portal)}
                                className="p-1 rounded text-brand-navy hover:bg-surface transition"
                                title="Düzenle"
                              >
                                <Edit3 size={14} />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(portal.id)}
                                  className="p-1 rounded text-rose-400 hover:text-rose-600 transition"
                                  title="Sil"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YENİ / DÜZENLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <Globe className="text-brand-navy" size={20} />
                {editingPortal ? "Şirket Portalını Düzenle" : "Yeni Şirket Portalı Ekle"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">Portal / Sistem Adı *</label>
                <input
                  type="text"
                  required
                  name="title"
                  defaultValue={editingPortal?.title || ""}
                  placeholder="Örn: Petrol Ofisi Otobil Portalı"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Kategori *</label>
                  <select
                    name="category"
                    defaultValue={editingPortal?.category || "B2B Tedarikçi"}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold text-xs"
                  >
                    <option value="B2B Tedarikçi">B2B Tedarikçi</option>
                    <option value="E-Dönüşüm / Fatura">E-Dönüşüm / Fatura</option>
                    <option value="Filo / GPS">Filo / GPS</option>
                    <option value="Banka">Banka</option>
                    <option value="Resmi Kurum">Resmi Kurum</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Web Adresi (URL) *</label>
                  <input
                    type="text"
                    required
                    name="url"
                    defaultValue={editingPortal?.url || ""}
                    placeholder="https://..."
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Kullanıcı Adı / E-Posta</label>
                  <input
                    type="text"
                    name="username"
                    defaultValue={editingPortal?.username || ""}
                    placeholder="user@camoluk.com"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Şifre / Parola</label>
                  <input
                    type="text"
                    name="password"
                    defaultValue={editingPortal?.password || ""}
                    placeholder="••••••••"
                    className="w-full border border-border rounded-lg px-3 py-2 bg-surface outline-none focus:bg-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Not / Hatırlatıcı Açıklama</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingPortal?.notes || ""}
                  placeholder="Giriş yaparken SMS doğrulaması gerekir, şifre her 90 günde bir değişir..."
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
                  {isPending ? "Kaydediliyor..." : "Portalı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
