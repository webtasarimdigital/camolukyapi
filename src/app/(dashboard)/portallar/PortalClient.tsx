"use client";

import { useState, useTransition, useMemo } from "react";
import type { CompanyPortal, TaliBayiOption } from "./types";
import { savePortal, deletePortal, updatePortalBayiPermissions } from "./actions";
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
  Users,
  Lock,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";

interface Props {
  initialPortals: CompanyPortal[];
  taliBayiler?: TaliBayiOption[];
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

export function PortalClient({
  initialPortals,
  taliBayiler = [],
  userRole,
  userName,
}: Props) {
  const isTaliBayi = ["tali_bayi", "bayi"].includes(userRole);
  const isReadOnly = ["tali_bayi", "bayi", "depo", "sofor"].includes(userRole);
  const canDelete = ["admin", "muhasebe1"].includes(userRole);
  const canManageBayi = ["admin", "muhasebe1"].includes(userRole);

  const [portals, setPortals] = useState<CompanyPortal[]>(initialPortals);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // State for show/hide passwords
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Portal Ekleme / Düzenleme Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<CompanyPortal | null>(null);
  const [modalBayiIds, setModalBayiIds] = useState<string[]>([]);

  // Hızlı Bayi Yetki Modalı State
  const [permModalPortal, setPermModalPortal] = useState<CompanyPortal | null>(null);
  const [permSelectedBayiIds, setPermSelectedBayiIds] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();

  // Bayi ID -> İsim eşleşme haritası
  const bayiMap = useMemo(() => {
    const map = new Map<string, string>();
    taliBayiler.forEach((b) => map.set(b.id, b.full_name));
    return map;
  }, [taliBayiler]);

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
    setModalBayiIds([]); // Varsayılan olarak tüm bayilere kapalı!
    setIsModalOpen(true);
  }

  function handleOpenEdit(portal: CompanyPortal) {
    if (isReadOnly) {
      toast.error("Yetkiniz bulunmuyor! Yalnızca görüntüleme yetkiniz bulunmaktadır.");
      return;
    }
    setEditingPortal(portal);
    setModalBayiIds(portal.allowed_bayi_ids || []);
    setIsModalOpen(true);
  }

  function handleOpenPermModal(portal: CompanyPortal) {
    if (!canManageBayi) {
      toast.error("Yetkiniz bulunmuyor!");
      return;
    }
    setPermModalPortal(portal);
    setPermSelectedBayiIds(portal.allowed_bayi_ids || []);
  }

  async function handleSaveQuickPerms() {
    if (!permModalPortal) return;
    startTransition(async () => {
      const res = await updatePortalBayiPermissions(permModalPortal.id, permSelectedBayiIds);
      if (res.success) {
        setPortals((prev) =>
          prev.map((p) =>
            p.id === permModalPortal.id
              ? { ...p, allowed_bayi_ids: permSelectedBayiIds }
              : p
          )
        );
        toast.success(`"${permModalPortal.title}" için tali bayi yetkileri güncellendi!`);
        setPermModalPortal(null);
      } else {
        toast.error(res.error || "Yetkiler güncellenemedi.");
      }
    });
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
        allowed_bayi_ids: modalBayiIds,
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

  // Bayi yetki rozeti formatlayıcı
  function renderBayiBadge(allowedIds?: string[]) {
    const count = allowedIds?.length || 0;
    if (count === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
          <Lock size={10} /> Tali Bayilere Kapalı
        </span>
      );
    }
    const names = (allowedIds || [])
      .map((id) => bayiMap.get(id))
      .filter(Boolean)
      .join(", ");

    return (
      <span
        title={names ? `Yetkili: ${names}` : undefined}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
      >
        <Users size={10} /> {count} Tali Bayi Yetkili
      </span>
    );
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
            {isTaliBayi
              ? "Firmanıza tanımlanmış olan şirket portalları ve giriş bilgileri"
              : "Tedarikçi sistemleri, e-fatura/e-irsaliye portalları, Otobil ve banka giriş bilgileri merkezi rehberi"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Görünüm Seçici */}
          <div className="flex bg-surface p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "grid" ? "bg-white text-brand-navy shadow-xs" : "text-text-muted hover:text-text"
              }`}
              title="Kart Görünümü"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
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
            <button onClick={() => setSearch("")} className="text-xs text-text-muted hover:text-text px-2 cursor-pointer">
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* TALİ BAYİ İÇİN BOŞ DURUM (HİÇBİR PORTALA YETKİ VERİLMEMİŞSE) */}
      {isTaliBayi && portals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock size={30} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text">Tanımlı Şirket Portalı Bulunmuyor</h3>
            <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto">
              Şu anda firmanıza tanımlanmış olan aktif bir şirket portalı bulunmamaktadır.
              Yöneticiniz tarafından firmanıza özel yetki verildiğinde ilgili portallar bu ekranda otomatik olarak listelenecektir.
            </p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* KART GÖRÜNÜMÜ */
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
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
                              {portal.category}
                            </span>
                            {!isTaliBayi && renderBayiBadge(portal.allowed_bayi_ids)}
                          </div>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1 shrink-0">
                          {canManageBayi && (
                            <button
                              onClick={() => handleOpenPermModal(portal)}
                              className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                              title="Tali Bayi Yetkilerini Ayarla"
                            >
                              <Users size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(portal)}
                            className="p-1.5 rounded-lg text-brand-navy bg-surface hover:bg-white border border-border transition cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit3 size={14} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(portal.id)}
                              className="p-1.5 rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
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
                              className="p-1 hover:bg-white rounded transition text-text-muted hover:text-brand-navy cursor-pointer"
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
                              className="p-1 hover:bg-white rounded transition text-text-muted hover:text-brand-navy ml-1 cursor-pointer"
                              title={isPwVisible ? "Şifreyi Gizle" : "Şifreyi Göster"}
                            >
                              {isPwVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(portal.password!, `p-${portal.id}`, "Şifre")}
                              className="p-1 hover:bg-white rounded transition text-text-muted hover:text-brand-navy cursor-pointer"
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
                  {!isTaliBayi && <th className="py-3 px-4">Tali Bayi Yetkisi</th>}
                  <th className="py-3 px-4">Kullanıcı Adı</th>
                  <th className="py-3 px-4">Şifre</th>
                  <th className="py-3 px-4">Açıklama / Not</th>
                  <th className="py-3 px-4 text-center">Git</th>
                  {!isReadOnly && <th className="py-3 px-4 text-center w-24">İşlem</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isReadOnly ? 6 : 8} className="py-12 text-center text-text-muted">
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
                        {!isTaliBayi && (
                          <td className="py-3 px-4">
                            {renderBayiBadge(portal.allowed_bayi_ids)}
                          </td>
                        )}
                        <td className="py-3 px-4 font-mono">
                          {portal.username ? (
                            <div className="flex items-center gap-1">
                              <span>{portal.username}</span>
                              <button
                                onClick={() => handleCopy(portal.username!, `u-${portal.id}`, "Kullanıcı adı")}
                                className="p-0.5 text-text-muted hover:text-brand-navy cursor-pointer"
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
                                className="p-0.5 text-text-muted hover:text-brand-navy cursor-pointer"
                              >
                                {isPwVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                              <button
                                onClick={() => handleCopy(portal.password!, `p-${portal.id}`, "Şifre")}
                                className="p-0.5 text-text-muted hover:text-brand-navy cursor-pointer"
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
                              {canManageBayi && (
                                <button
                                  onClick={() => handleOpenPermModal(portal)}
                                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                  title="Tali Bayi Yetkileri"
                                >
                                  <Users size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEdit(portal)}
                                className="p-1 rounded text-brand-navy hover:bg-surface transition cursor-pointer"
                                title="Düzenle"
                              >
                                <Edit3 size={14} />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(portal.id)}
                                  className="p-1 rounded text-rose-400 hover:text-rose-600 transition cursor-pointer"
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

      {/* MODAL 1: HIZLI TALİ BAYİ YETKİLENDİRME MODALI */}
      {permModalPortal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text leading-tight">
                    Tali Bayi Erişim İzinleri
                  </h3>
                  <p className="text-[11px] text-text-muted truncate max-w-[260px]">
                    {permModalPortal.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermModalPortal(null)}
                className="text-text-muted hover:text-text font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">🔒 Varsayılan Kapalı Kuralı:</span> Bu portalı yalnızca işaretlediğiniz tali bayiler görebilir. İşaretlenmeyen bayilerin ekranında bu portal kesinlikle gözükmez.
              </div>

              {/* Hızlı Seç / Temizle Butonları */}
              {taliBayiler.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-text-muted">
                    Sistemdeki Tali Bayiler ({taliBayiler.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPermSelectedBayiIds(taliBayiler.map((b) => b.id))}
                      className="text-[11px] text-brand-navy hover:underline font-bold cursor-pointer"
                    >
                      Tümünü Seç
                    </button>
                    <span className="text-border text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => setPermSelectedBayiIds([])}
                      className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Tümünü Kaldır
                    </button>
                  </div>
                </div>
              )}

              {/* Bayi Listesi */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {taliBayiler.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">
                    Sistemde henüz kayıtlı bir tali bayi bulunmuyor.
                  </p>
                ) : (
                  taliBayiler.map((bayi) => {
                    const isChecked = permSelectedBayiIds.includes(bayi.id);
                    return (
                      <label
                        key={bayi.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                          isChecked
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                            : "bg-surface hover:bg-surface/80 border-border text-text"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPermSelectedBayiIds((prev) => [...prev, bayi.id]);
                              } else {
                                setPermSelectedBayiIds((prev) => prev.filter((id) => id !== bayi.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold leading-tight">{bayi.full_name}</p>
                            <span className="text-[10px] text-text-muted uppercase font-mono">
                              {bayi.role}
                            </span>
                          </div>
                        </div>
                        {isChecked ? (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Açık
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            Kapalı
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setPermModalPortal(null)}
                disabled={isPending}
                className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveQuickPerms}
                disabled={isPending}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                Yetkileri Kaydet ({permSelectedBayiIds.length} Bayi)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: YENİ / DÜZENLEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <Globe className="text-brand-navy" size={20} />
                {editingPortal ? "Şirket Portalını Düzenle" : "Yeni Şirket Portalı Ekle"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">Portal / Sistem Adı *</label>
                <input
                  type="text"
                  required
                  name="title"
                  defaultValue={editingPortal?.title || ""}
                  placeholder="Örn: Petrol Ofisi Otobil Portalı"
                  className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Kategori *</label>
                  <select
                    name="category"
                    defaultValue={editingPortal?.category || "B2B Tedarikçi"}
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-semibold text-xs"
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
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none focus:bg-white focus:border-brand-navy font-mono text-xs"
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
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none focus:bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Şifre / Parola</label>
                  <input
                    type="text"
                    name="password"
                    defaultValue={editingPortal?.password || ""}
                    placeholder="••••••••"
                    className="w-full border border-border rounded-xl px-3 py-2 bg-surface outline-none focus:bg-white font-mono text-xs"
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
                  className="w-full border border-border rounded-xl p-2.5 bg-surface outline-none focus:bg-white"
                />
              </div>

              {/* TALİ BAYİ YETKİLERİ BÖLÜMÜ */}
              {canManageBayi && taliBayiler.length > 0 && (
                <div className="bg-surface/70 border border-border rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-text flex items-center gap-1.5">
                        <Users size={14} className="text-brand-navy" />
                        Tali Bayi Yetkilendirmesi
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        İşaretlediğiniz tali bayiler bu portalı görebilir. (Varsayılan: Kapalı)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalBayiIds(taliBayiler.map((b) => b.id))}
                        className="text-[11px] text-brand-navy hover:underline font-bold cursor-pointer"
                      >
                        Tümü
                      </button>
                      <span className="text-border text-xs">|</span>
                      <button
                        type="button"
                        onClick={() => setModalBayiIds([])}
                        className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-40 overflow-y-auto">
                    {taliBayiler.map((bayi) => {
                      const isChecked = modalBayiIds.includes(bayi.id);
                      return (
                        <label
                          key={bayi.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
                            isChecked
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                              : "bg-white border-border text-text"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModalBayiIds((prev) => [...prev, bayi.id]);
                              } else {
                                setModalBayiIds((prev) => prev.filter((id) => id !== bayi.id));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="truncate text-xs">{bayi.full_name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl text-text-muted hover:text-text font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-navy text-white px-5 py-2 rounded-xl font-bold hover:bg-brand-navy/90 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isPending && <Loader2 size={13} className="animate-spin" />}
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
