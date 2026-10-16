import { getPortals } from "./actions";
import { PortalClient } from "./PortalClient";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function PortallarPage() {
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
      const { data: profile } = (await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()) as any;
      if (profile?.role) userRole = profile.role;
      if (profile?.full_name) userName = profile.full_name;
    }

    if (cookieRole) userRole = cookieRole;
    if (cookieName) userName = cookieName;
  } catch (err) {
    console.error("PortallarPage auth error:", err);
  }

  const portals = await getPortals();

  return (
    <PortalClient
      initialPortals={portals}
      userRole={userRole}
      userName={userName}
    />
  );
}
