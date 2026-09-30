import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CustomerRowActions } from "./CustomerRowActions";
import { CustomerImportModal } from "./CustomerImportModal";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  Users,
} from "lucide-react";

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string; role: string } | null;
  if (!profile?.company_id) redirect("/login");

  const q = sp?.q?.trim() || "";
  const typeFilter = sp?.type || "";
  const statusFilter = sp?.status || "";

  // Sayfalama parametreleri
  const rawPageSize = parseInt(sp?.pageSize || "50", 10);
  const pageSize = [25, 50, 100].includes(rawPageSize) ? rawPageSize : 50;
  const requestedPage = Math.max(1, parseInt(sp?.page || "1", 10));

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `company_name.ilike.%${q}%,contact_name.ilike.%${q}%,phone.ilike.%${q}%`
    );
  }
  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }
  if (statusFilter) {
    query = query.eq("is_active", statusFilter === "aktif");
  }

  const from = (requestedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: rawData, count } = await query.range(from, to);
  const customers = rawData as any[] | null;

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);

  function buildUrl(targetPage: number, targetPageSize?: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    const ps = targetPageSize || pageSize;
    if (ps !== 50) params.set("pageSize", String(ps));
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/musteriler?${qs}` : "/musteriler";
  }

  function getPaginationPages(curr: number, total: number) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (curr <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (curr >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", curr - 1, curr, curr + 1, "...", total];
  }

  const paginationPages = getPaginationPages(currentPage, totalPages);
  const startItem = totalCount === 0 ? 0 : from + 1;
  const endItem = Math.min(from + (customers?.length || 0), totalCount);
  const hasFilters = Boolean(q || typeFilter || statusFilter);

  return (
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Users className="text-brand-navy" size={24} />
            Müşteriler
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Müşteri listesi ve yönetimi • Toplam{" "}
            <span className="font-semibold text-text">
              {totalCount.toLocaleString("tr-TR")}
            </span>{" "}
            müşteri
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CustomerImportModal />
          <Link
            href="/musteriler/yeni"
            className="bg-brand-gold text-brand-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition shadow-xs"
          >
            + Yeni Müşteri
          </Link>
        </div>
      </div>

      {/* Filtre ve Arama Alanı */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-xs">
        <form method="GET" action="/musteriler" className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Müşteri Adı, Yetkili Kişi veya Telefon..."
              className="border border-border rounded-lg pl-9 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-navy/20"
            />
          </div>

          <select
            name="type"
            defaultValue={typeFilter}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
          >
            <option value="">Tüm Türler</option>
            <option value="bireysel">Bireysel</option>
            <option value="kurumsal">Kurumsal</option>
          </select>

          <select
            name="status"
            defaultValue={statusFilter}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
          >
            <option value="">Tüm Durumlar</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>

          {pageSize !== 50 && (
            <input type="hidden" name="pageSize" value={pageSize} />
          )}

          <button
            type="submit"
            className="bg-brand-navy text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-navy-light transition cursor-pointer"
          >
            Filtrele
          </button>

          {hasFilters && (
            <Link
              href="/musteriler"
              className="flex items-center gap-1 text-xs text-text-muted hover:text-red-600 px-2 py-2 transition"
              title="Filtreleri Sıfırla"
            >
              <X size={14} />
              Temizle
            </Link>
          )}
        </form>
      </div>

      {/* Müşteri Tablosu */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Müşteri Adı / Ünvanı
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  İletişim Kişisi
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Telefon
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  E-posta
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Tür
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Durum
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers && customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-surface/50 transition">
                    <td className="px-4 py-3 font-medium text-text">
                      {c.type === "kurumsal" && c.company_name
                        ? c.company_name
                        : c.contact_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {c.contact_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-text">
                      {c.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {c.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.type === "kurumsal" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Kurumsal
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          Bireysel
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Pasif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CustomerRowActions customer={c} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    {hasFilters ? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="font-medium text-text">Aradığınız kriterlere uygun müşteri bulunamadı.</p>
                        <Link
                          href="/musteriler"
                          className="text-xs text-brand-navy underline font-medium hover:text-brand-navy-light"
                        >
                          Filtreleri temizle ve tüm listeyi gör
                        </Link>
                      </div>
                    ) : (
                      "Henüz kayıtlı müşteri bulunmuyor."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ──────────────────── SAYFALAMA (PAGINATION) ALANI ──────────────────── */}
        {totalCount > 0 && (
          <div className="px-4 py-3.5 bg-surface/40 border-t border-border flex flex-wrap items-center justify-between gap-4">
            {/* Sol: Bilgi & Sayfa Başına Gösterim */}
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <div>
                Toplam <span className="font-semibold text-text">{totalCount.toLocaleString("tr-TR")}</span> kayıt
                {" • "}
                <span className="font-semibold text-text">{startItem} - {endItem}</span> arası gösteriliyor
              </div>

              <div className="flex items-center gap-1.5 border-l border-border pl-4">
                <span>Sayfa başına:</span>
                <div className="flex gap-1">
                  {[25, 50, 100].map((size) => (
                    <Link
                      key={size}
                      href={buildUrl(1, size)}
                      className={`px-2 py-1 rounded text-xs font-medium transition ${
                        pageSize === size
                          ? "bg-brand-navy text-white"
                          : "bg-white border border-border text-text hover:bg-surface"
                      }`}
                    >
                      {size}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sağ: Sayfa Butonları */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* İlk Sayfa */}
                <Link
                  href={buildUrl(1)}
                  aria-disabled={currentPage === 1}
                  className={`p-1.5 rounded-lg border text-text transition ${
                    currentPage === 1
                      ? "opacity-40 pointer-events-none border-border"
                      : "border-border hover:bg-surface"
                  }`}
                  title="İlk Sayfa"
                >
                  <ChevronsLeft size={16} />
                </Link>

                {/* Önceki Sayfa */}
                <Link
                  href={buildUrl(Math.max(1, currentPage - 1))}
                  aria-disabled={currentPage === 1}
                  className={`p-1.5 rounded-lg border text-text transition ${
                    currentPage === 1
                      ? "opacity-40 pointer-events-none border-border"
                      : "border-border hover:bg-surface"
                  }`}
                  title="Önceki Sayfa"
                >
                  <ChevronLeft size={16} />
                </Link>

                {/* Sayfa Numaraları */}
                <div className="flex items-center gap-1 px-1">
                  {paginationPages.map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="px-1.5 text-xs text-text-muted select-none"
                        >
                          …
                        </span>
                      );
                    }
                    const pageNum = Number(p);
                    const isActive = pageNum === currentPage;
                    return (
                      <Link
                        key={pageNum}
                        href={buildUrl(pageNum)}
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition ${
                          isActive
                            ? "bg-brand-navy text-white shadow-xs"
                            : "bg-white border border-border text-text hover:bg-surface"
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>

                {/* Sonraki Sayfa */}
                <Link
                  href={buildUrl(Math.min(totalPages, currentPage + 1))}
                  aria-disabled={currentPage === totalPages}
                  className={`p-1.5 rounded-lg border text-text transition ${
                    currentPage === totalPages
                      ? "opacity-40 pointer-events-none border-border"
                      : "border-border hover:bg-surface"
                  }`}
                  title="Sonraki Sayfa"
                >
                  <ChevronRight size={16} />
                </Link>

                {/* Son Sayfa */}
                <Link
                  href={buildUrl(totalPages)}
                  aria-disabled={currentPage === totalPages}
                  className={`p-1.5 rounded-lg border text-text transition ${
                    currentPage === totalPages
                      ? "opacity-40 pointer-events-none border-border"
                      : "border-border hover:bg-surface"
                  }`}
                  title="Son Sayfa"
                >
                  <ChevronsRight size={16} />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
