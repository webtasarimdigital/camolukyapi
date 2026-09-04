import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

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

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar userRole={profile?.role} />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <TopBar
          userName={profile?.full_name || user.email}
          userRole={profile?.role}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
