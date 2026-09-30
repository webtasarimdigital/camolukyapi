import { getTransporters, Transporter } from "@/lib/data/store";
import { TransporterClient } from "./TransporterClient";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function NakliyelerPage() {
  let userRole = "staff";
  let userName = "Kullanıcı";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const cookieRole = cookieStore.get("app_active_role")?.value;
    const cookieName = cookieStore.get("app_user_name")?.value;

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      const profile = profileData as { role?: string; full_name?: string } | null;
      if (profile?.role) userRole = profile.role;
      if (profile?.full_name) userName = profile.full_name;
    }

    if (cookieRole) userRole = cookieRole;
    if (cookieName) userName = cookieName;
  } catch (authErr) {
    console.error("NakliyelerPage auth error:", authErr);
  }

  let items: Transporter[] = [];
  try {
    items = await getTransporters();
  } catch (err) {
    console.error("NakliyelerPage getTransporters error:", err);
  }

  return (
    <TransporterClient
      initialItems={items}
      userRole={userRole}
      userName={userName}
    />
  );
}
