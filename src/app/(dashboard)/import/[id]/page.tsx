import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";
import { ArrowLeft, FileSpreadsheet, FileText, CheckCircle2 } from "lucide-react";

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recordData } = await supabase
    .from("product_imports")
    .select("*, profiles:created_by(full_name)")
    .eq("id", id)
    .single();

  const record = recordData as {
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
  } | null;

  if (!record) {
    return (
      <div className="space-y-6">
        <Link href="/import" className="text-text-muted hover:text-text flex items-center gap-2">
          <ArrowLeft size={16} /> Geri Dön
        </Link>
        <p className="text-text-muted">İçe aktarma kaydı bulunamadı.</p>
      </div>
    );
  }

  const isPdf = record.file_name.startsWith("[PDF");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link
          href="/import"
          className="p-2 rounded-lg hover:bg-white text-text-muted hover:text-text border border-border transition"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            {isPdf ? <FileText className="text-rose-600" /> : <FileSpreadsheet className="text-emerald-600" />}
            {record.file_name}
          </h1>
          <p className="text-sm text-text-muted">
            Yüklenme Tarihi: {formatDate(record.created_at)} • Yükleyen: {record.profiles?.full_name || "Sistem"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-surface rounded-lg">
            <p className="text-xs text-text-muted mb-1">Durum</p>
            <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 size={15} /> {record.status === "completed" ? "Tamamlandı" : record.status}
            </p>
          </div>
          <div className="p-4 bg-surface rounded-lg">
            <p className="text-xs text-text-muted mb-1">Toplam Kayıt</p>
            <p className="text-sm font-semibold text-text">{record.total_rows || 0}</p>
          </div>
          <div className="p-4 bg-surface rounded-lg">
            <p className="text-xs text-text-muted mb-1">Eklenen Yeni Ürün</p>
            <p className="text-sm font-semibold text-emerald-600">+{record.inserted_rows || 0}</p>
          </div>
          <div className="p-4 bg-surface rounded-lg">
            <p className="text-xs text-text-muted mb-1">Güncellenen Ürün</p>
            <p className="text-sm font-semibold text-blue-600">~{record.updated_rows || 0}</p>
          </div>
        </div>

        {record.summary && (
          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-semibold text-text uppercase tracking-wide mb-2">Özet Bilgi</h3>
            <p className="text-sm text-text-muted bg-surface p-4 rounded-lg">{record.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
