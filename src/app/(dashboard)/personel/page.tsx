import { getEmployees } from "@/lib/data/store";
import { EmployeeClient } from "./EmployeeClient";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export default async function PersonelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("app_active_role")?.value;
  const cookieName = cookieStore.get("app_user_name")?.value;

  let dbRole = "staff";
  let dbName = "Kullanıcı";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    if (profile?.role) dbRole = profile.role;
    if (profile?.full_name) dbName = profile.full_name;
  }

  const userRole = cookieRole || dbRole;
  const userName = cookieName || dbName;

  const items = getEmployees();

  return (
    <EmployeeClient
      initialItems={items}
      userRole={userRole}
      userName={userName}
    />
  );
}
