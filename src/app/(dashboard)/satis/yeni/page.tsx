import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SaleForm } from "./SaleForm";

export default async function NewSalePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, full_name")
    .eq("id", userData.user.id)
    .single();
  const profile = profileData as { company_id: string; full_name: string } | null;
  if (!profile?.company_id) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text">Yeni Satış</h1>
      <SaleForm creatorName={profile.full_name} />
    </div>
  );
}
