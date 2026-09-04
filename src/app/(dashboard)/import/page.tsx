import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";
import { FileSpreadsheet, FileText, UploadCloud, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default async function ImportListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) redirect("/login");

  const { data: rawImports } = await supabase
    .from("product_imports")
    .select("*, profiles:created_by(full_name)")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const imports = (rawImports ?? []) as Array<{
    id: string;
    file_name: string;
    sheet_name: string | null;
    status: string;
    total_rows: number | null;
    inserted_rows: number | null;
    updated_rows: number | null;
    error_rows: number | null;
    summary: string | null;
    created_at: string;
    profiles: { full_name: string | null } | null;
  }>;

  const totalImports = imports.length;
  const excelImports = imports.filter((i) => !i.file_name.startsWith("[PDF"));
  const pdfImports = imports.filter((i) => i.file_name.startsWith("[PDF"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Excel & PDF Fiyat Listeleri</h1>
          <p className="text-sm text-text-muted">
            Tedarikçi Excel fiyat listelerini içe aktarın veya PDF katalogları arşivleyin.
          </p>
        </div>
        <Link
          href="/import/yeni"
          className="flex items-center gap-2 bg-brand-gold text-brand-navy px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-gold-light transition shadow-sm"
        >
          <UploadCloud size={16} />
          + Yeni Excel / PDF Yükle
        </Link>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
            <UploadCloud size={20} />
          </div>
          <div>
            <p className="text-xs text-text-muted">Toplam İçe Aktarma</p>
            <p className="text-lg font-bold text-text">{totalImports} Belge</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <p className="text-xs text-text-muted">Excel Fiyat Listeleri</p>
            <p className="text-lg font-bold text-text">{excelImports.length} Dosya</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-4">
          <div className="bg-rose-50 text-rose-600 p-3 rounded-lg">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs text-text-muted">PDF Liste & Kataloglar</p>
            <p className="text-lg font-bold text-text">{pdfImports.length} Belge</p>
          </div>
        </div>
      </div>

      {/* Liste Tablosu */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text">İçe Aktarma ve Belge Geçmişi</h2>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Belge / Dosya Adı
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Format
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Tarih
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Durum
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Toplam / Yeni / Güncellenen
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Yükleyen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {imports.length > 0 ? (
              imports.map((item) => {
                const isPdf = item.file_name.startsWith("[PDF");
                return (
                  <tr key={item.id} className="hover:bg-surface transition">
                    <td className="px-4 py-3 font-medium text-text flex items-center gap-2">
                      {isPdf ? (
                        <FileText size={16} className="text-rose-600 flex-shrink-0" />
                      ) : (
                        <FileSpreadsheet size={16} className="text-emerald-600 flex-shrink-0" />
                      )}
                      <span className="truncate max-w-md">{item.file_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isPdf ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700">
                          PDF
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          Excel (.xlsx)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 size={13} /> Tamamlandı
                        </span>
                      ) : item.status === "processing" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <Clock size={13} /> İşleniyor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
                          <AlertCircle size={13} /> Hata
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {isPdf ? (
                        <span className="text-text-muted text-xs">Arşiv Belgesi</span>
                      ) : (
                        <span className="text-xs">
                          <span className="font-semibold text-text">{item.total_rows || 0}</span> satır{" "}
                          <span className="text-emerald-600 font-medium">+{item.inserted_rows || 0}</span> /{" "}
                          <span className="text-blue-600 font-medium">~{item.updated_rows || 0}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {item.profiles?.full_name || "Sistem"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                  <UploadCloud size={32} className="mx-auto mb-2 text-slate-400 opacity-60" />
                  Henüz içe aktarılmış Excel veya yüklenmiş PDF belgesi bulunmuyor.
                  <div className="mt-3">
                    <Link
                      href="/import/yeni"
                      className="text-brand-gold text-xs font-semibold hover:underline"
                    >
                      + İlk dosyanızı yükleyin
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
