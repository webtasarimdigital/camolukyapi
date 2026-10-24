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
    desc: "Genel muhasebe, teklif, satış ve ödemeler (Personel, Kiralar, Finans & Ortak Cari hariç)",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
  },
  satis: {
    label: "Satış Temsilcisi",
    desc: "Teklif, Satış, Sevkiyat, Müşteriler ve Ürünler erişimi (Silme yapamaz)",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  depo: {
    label: "Depo Sorumlusu",
    desc: "Yalnızca Sevkiyat ve Yükleme modülü erişimi (Salt okunur)",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
  },
  sofor: {
    label: "Şoför",
    desc: "Yalnızca Sevkiyat ve Yükleme modülü erişimi (Salt okunur)",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  tali_bayi: {
    label: "Tali Bayi",
    desc: "Yalnızca Stok / Ürün Kataloğu ve Şirket Portalları (Görüntüleme)",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  bayi: {
    label: "Tali Bayi",
    desc: "Yalnızca Stok / Ürün Kataloğu ve Şirket Portalları (Görüntüleme)",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  staff: {
    label: "Personel",
    desc: "Standart personel yetkisi",
    badge: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

const DEFAULT_ACCOUNTS: AccountInfo[] = [
  {
    role: "admin",
    title: "👑 Yönetici (Admin)",
    username: "camoluk",
    email: "camoluk@camolukyapi.com",
    pass: "camoluk2861",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    allowedSummary: "Tüm sistem, finans, ortak cari, personel, kiralar & ayarlar tam yetki",
    note: "Girişte 'camoluk' veya 'admin' yazabilirsiniz.",
  },
  {
    role: "muhasebe1",
    title: "💼 Muhasebe 1",
    username: "muhasebe1",
    email: "muhasebe1@camolukyapi.com",
    pass: "camoluk123",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    allowedSummary: "Teklif, satış, ödemeler & sevkiyat açık",
    note: "Personel, Kiralar, Finans ve Ortak Cari kapalıdır.",
  },
  {
    role: "satis",
    title: "💼 Satış Temsilcisi",
    username: "satış",
    email: "satis@camolukyapi.com",
    pass: "camoluksatış2",
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    allowedSummary: "Teklif, satış, sevkiyat, müşteriler & ürünler açık",
    note: "Girişte 'satış' veya 'satis' yazabilirsiniz. Silme yapamaz.",
  },
  {
    role: "depo",
    title: "📦 Depo Sorumlusu",
    username: "depo",
    email: "depo@camolukyapi.com",
    pass: "camolukdepo0",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    allowedSummary: "Yalnızca Sevkiyat & Yükleme (Görüntüleme)",
    note: "Veri silme/ekleme yapamaz, sadece sevkiyatları görür.",
  },
  {
    role: "sofor",
    title: "🚚 Şoför",
    username: "şoför",
    email: "sofor@camolukyapi.com",
    pass: "camolukşoför1",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    allowedSummary: "Yalnızca Sevkiyat & Yükleme (Görüntüleme)",
    note: "Girişte 'şoför' veya 'sofor' yazabilirsiniz.",
  },
  {
    role: "tali_bayi",
    title: "🏪 Tali Bayi",
    username: "bayi",
    email: "bayi@camolukyapi.com",
    pass: "camolukbayi0",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    allowedSummary: "Yalnızca Ürünler/Stok ve Şirket Portalları",
    note: "Girişte 'bayi' yazabilirsiniz. Fiyat & stok inceler.",
  },
];

const ACCOUNT_CREDENTIALS_MAP: Record<string, { username: string; pass: string }> = {
  admin: { username: "camoluk (veya admin)", pass: "camoluk2861" },
  muhasebe1: { username: "muhasebe1 (veya muhasebe)", pass: "camoluk123" },
  satis: { username: "satış (veya satis)", pass: "camoluksatış2" },
  depo: { username: "depo", pass: "camolukdepo0" },
  sofor: { username: "şoför (veya sofor)", pass: "camolukşoför1" },
  tali_bayi: { username: "bayi", pass: "camolukbayi0" },
  bayi: { username: "bayi", pass: "camolukbayi0" },
};

import { cookies } from "next/headers";
import { AccountCredentialsCard, AccountInfo } from "./AccountCredentialsCard";
import { UserRowActions } from "./UserRowActions";

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

  // Fetch auth users to get exact emails and plain passwords
  let authUsersMap = new Map<string, { email: string; pass?: string }>();
  try {
    const serviceClient = await createServiceClient();
    const { data: authList } = await serviceClient.auth.admin.listUsers();
    if (authList?.users) {
      authList.users.forEach((u) => {
        authUsersMap.set(u.id, {
          email: u.email || "",
          pass: u.user_metadata?.plain_password as string | undefined,
        });
      });
    }
  } catch {
    // ignore if admin api fails
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Kullanıcılar & Şifre Yönetimi</h1>
          <p className="text-sm text-text-muted">
            Sistem kullanıcıları, şifreleri ve oturum açma yetkileri (Yalnızca Yönetici Görür)
          </p>
        </div>
        <NewUserModal companyId={profile.company_id} />
      </div>

      {/* Hazır Hesaplar ve Şifreler Bilgi Kartı (Yalnızca Admin) */}
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
                E-posta
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                Giriş Kullanıcı Adı & Şifresi
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
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles && profiles.length > 0 ? (
              profiles.map((p: any) => {
                const authInfo = authUsersMap.get(p.id);
                const email =
                  authInfo?.email ||
                  (p.role === "admin"
                    ? "camoluk@camolukyapi.com"
                    : `${p.role}@camolukyapi.com`);
                const roleInfo = ROLE_CONFIG[p.role] || ROLE_CONFIG.staff;
                const defaultCred = ACCOUNT_CREDENTIALS_MAP[p.role];
                const isSystemRoleAccount = [
                  "camoluk@camolukyapi.com",
                  "muhasebe1@camolukyapi.com",
                  "satis@camolukyapi.com",
                  "depo@camolukyapi.com",
                  "sofor@camolukyapi.com",
                  "bayi@camolukyapi.com",
                ].includes(email);

                const displayPass = authInfo?.pass || (isSystemRoleAccount ? defaultCred?.pass : null);
                const displayUser = isSystemRoleAccount ? defaultCred?.username : email.split("@")[0];
                const isSelf = p.id === userData.user.id;
                const isProtected = email === "camoluk@camolukyapi.com";
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
                      {displayPass ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-text-muted font-medium">Şifre:</span>
                            <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 select-all tracking-wide">
                              {displayPass}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-text-muted">
                            <span>Giriş Adı:</span>
                            <span className="font-mono font-semibold text-brand-navy bg-surface px-1.5 py-0.2 rounded border border-border">
                              {displayUser}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                            Özel Şifre
                          </span>
                          <span className="text-[10px] text-text-muted">
                            Yandaki 🔑 butonuyla şifre belirleyebilirsiniz
                          </span>
                        </div>
                      )}
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
                        <CheckCircle2 size={12} /> {p.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserRowActions
                        userId={p.id}
                        userEmail={email}
                        isSelf={isSelf}
                        isProtected={isProtected}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-muted">
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
