import { getVehicles } from "./actions";
import { VehicleClient } from "./VehicleClient";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export default async function OtobilGpsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const cookieName = cookieStore.get("app_user_name")?.value;
  const cookieRole = cookieStore.get("app_active_role")?.value;

  let userName = cookieName || "Kullanıcı";
  if (!cookieName && user) {
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    const profile = p as { full_name?: string } | null;
    if (profile?.full_name) userName = profile.full_name;
  }

  const vehicles = await getVehicles();

  return (
    <VehicleClient
      initialVehicles={vehicles}
      userName={userName}
      userRole={cookieRole || "admin"}
    />
  );
}
