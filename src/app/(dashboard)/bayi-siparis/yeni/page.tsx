import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DealerOrderForm } from "./DealerOrderForm";

export default async function YeniBayiSiparisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user.id)
    .single();

  const dealerProfile = {
    fullName: (profile as any)?.full_name || "Tali Bayi",
    phone: (profile as any)?.phone || "",
  };

  return <DealerOrderForm profile={dealerProfile} />;
}
