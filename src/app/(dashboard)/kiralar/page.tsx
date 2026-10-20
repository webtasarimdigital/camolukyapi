import { getRents, Rent } from "@/lib/data/store";
import { RentClient } from "./RentClient";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function KiralarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, full_name, company_id")
    .eq("id", user.id)
    .single();
  const profile = profileData as { role?: string; full_name?: string; company_id?: string } | null;

  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("app_active_role")?.value;
  const isActualAdmin = profile?.role === "admin";
  const activeRole = isActualAdmin ? (cookieRole || "admin") : (profile?.role || "staff");

  if (activeRole !== "admin" && activeRole !== "muhasebe2") {
    redirect("/dashboard");
  }

  const userRole = activeRole;
  const userName = cookieStore.get("app_user_name")?.value || profile?.full_name || "Kullanıcı";

  let items: Rent[] = [];
  try {
    items = await getRents();
  } catch (err) {
    console.error("KiralarPage getRents error:", err);
  }

  return (
    <RentClient
      initialItems={items}
      userRole={userRole}
      userName={userName}
    />
  );
}
