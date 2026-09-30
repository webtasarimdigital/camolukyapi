import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewUserModal from "./NewUserModal";
import { Shield, Key, CheckCircle2, User, Mail, ShieldAlert } from "lucide-react";

const ROLE_CONFIG: Record<string, { label: string; desc: string; badge: string }> = {
  admin: {
    label: "Yönetici (Admin)",
    desc: "Tüm sistem, finans, ortak cari ve ayarlar tam yetki",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
  },
  muhasebe1: {
    label: "Muhasebe 1",
    desc: "Genel muhasebe, teklif, satış ve ödemeler (Finans & Ortak Cari hariç)",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  muhasebe2: {
    label: "Muhasebe 2 (Yetkili)",
    desc: "Tüm muhasebe + Finans & Ortak Cari erişimi",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  sevkiyat: {
    label: "Sevkiyat Sorumlusu",
    desc: "Yalnızca Sevkiyat, Otobil GPS ve Ürünler/Stok erişimi",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
  },
  staff: {
    label: "Personel",
    desc: "Standart personel yetkisi",
    badge: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

const DEFAULT_ACCOUNTS = [
  { email: "camoluk@camolukyapi.com", pass: "camoluk2861", role: "admin", note: "Ana Yönetici hesabı" },
  { email: "muhasebe1@camolukyapi.com", pass: "camoluk123", role: "muhasebe1", note: "Finans & Ortak Cari hariç" },
  { email: "muhasebe2@camolukyapi.com", pass: "camoluk123", role: "muhasebe2", note: "Finans & Ortak Cari dahil" },
  { email: "sevkiyat@camolukyapi.com", pass: "camoluk123", role: "sevkiyat", note: "Sevkiyat, GPS & Stok" },
];

import { cookies } from "next/headers";
import { AccountCredentialsCard } from "./AccountCredentialsCard";

export default async function KullanicilarPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", userData.user.id)
    .single();

  const profile = profileData as { company_id: string; role: string } | null;
  const cookieStore = await cookies();
  const activeRole = cookieStore.get("app_active_role")?.value || profile?.role;

  // STRICT ACCESS CONTROL: Only admin can see this page
  if (!profile?.company_id || profile.role !== "admin" || activeRole !== "admin") {
    redirect("/dashboard");
  }

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true });

  // Fetch auth users to get exact emails
  let authUsersMap = new Map<string, string>();
  try {
    const serviceClient = await createServiceClient();
    const { data: authList } = await serviceClient.auth.admin.listUsers();
    if (authList?.users) {
      authList.users.forEach((u) => {
        authUsersMap.set(u.id, u.email || "");
      });
    }
  } catch {
    // ignore if admin api fails
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Kullanıcılar & Roller</h1>
          <p className="text-sm text-text-muted">
            Sistem kullanıcıları, rolleri ve oturum açma yetkileri (Yalnızca Yönetici Görür)
          </p>
        </div>
        <NewUserModal companyId={profile.company_id} />
      </div>

      {/* Hazır Hesaplar Bilgi Kartı (Şifre Göster/Gizle Butonlu, Yalnızca Admin) */}
      <AccountCredentialsCard accounts={DEFAULT_ACCOUNTS} />

      {/* Veritabanı Kullanıcı Listesi */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                Ad Soyad
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                E-posta / Giriş
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                Yetki & Rol
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                Erişim Kapsamı
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                Durum
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles && profiles.length > 0 ? (
              profiles.map((p: any) => {
                const email =
                  authUsersMap.get(p.id) ||
                  (p.role === "admin"
                    ? "camoluk@camolukyapi.com"
                    : `${p.role}@camolukyapi.com`);
                const roleInfo = ROLE_CONFIG[p.role] || ROLE_CONFIG.staff;
                return (
                  <tr key={p.id} className="hover:bg-surface transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center text-text font-bold text-xs">
                          {p.full_name?.charAt(0) || "U"}
                        </div>
                        <span className="font-medium text-text">{p.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${roleInfo.badge}`}
                      >
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {roleInfo.desc}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 size={12} /> Aktif
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  Kayıtlı profil bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
