import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CamlicaFircaClient } from "./CamlicaFircaClient";
import { getCamlicaFircaData } from "./actions";

export default async function CamlicaFircaPage() {
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

  // Sadece admin ve muhasebe1 erişebilir
  if (activeRole !== "admin" && activeRole !== "muhasebe1") {
    redirect("/dashboard");
  }

  const { columns, rows } = await getCamlicaFircaData();

  return (
    <CamlicaFircaClient
      initialColumns={columns}
      initialRows={rows}
    />
  );
}
