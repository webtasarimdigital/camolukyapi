import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CeklerClient } from "./CeklerClient";
import { getChecks } from "./actions";
import { getCustomColumns } from "@/lib/data/custom-columns-actions";

export default async function CeklerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  const profile = profileData as any;
  if (!profile?.company_id) redirect("/login");

  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("app_active_role")?.value;
  const isActualAdmin = profile.role === "admin";
  const activeRole = isActualAdmin ? cookieRole || "admin" : profile.role;

  if (activeRole !== "admin") {
    redirect("/dashboard");
  }

  const [checks, customCols] = await Promise.all([
    getChecks(),
    getCustomColumns("checks"),
  ]);

  return <CeklerClient initialChecks={checks} customColumns={customCols} />;
}
