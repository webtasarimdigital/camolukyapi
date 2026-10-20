import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { type UserRole } from "@/lib/auth/role-constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Profil bilgilerini çek
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const profile = profileData as { full_name: string | null; role: string } | null;

  // Çerezden aktif rolü veya veritabanı profilini oku
  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("app_active_role")?.value as UserRole | undefined;
  const cookieName = cookieStore.get("app_user_name")?.value;

  // GÜVENLİK: Yalnızca gerçek veritabanı rolü 'admin' olanlar simülasyon çerezini kullanabilir.
  // Diğer tüm kullanıcılar (depo, şoför, satış vb.) veritabanındaki rolleriyle sınırlandırılır.
  const isActualAdmin = profile?.role === "admin";
  const activeRole: UserRole = isActualAdmin
    ? (cookieRole || "admin")
    : ((profile?.role as UserRole) || "depo");

  const activeName = isActualAdmin
    ? (cookieName || profile?.full_name || "Çamoluk Yönetici")
    : (profile?.full_name || user.email?.split("@")[0] || "Kullanıcı");

  return (
    <DashboardShell userName={activeName} userRole={activeRole}>
      {children}
    </DashboardShell>
  );
}
