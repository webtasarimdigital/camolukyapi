import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getWarehousePageData } from "./actions";
import { DepoTakipClient } from "./DepoTakipClient";

export const dynamic = "force-dynamic";

export default async function DepoTakipPage() {
  let userRole = "staff";
  let userName = "Depo Sorumlusu";

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
    console.error("DepoTakipPage auth error:", authErr);
  }

  // YETKİLENDİRME KONTROLÜ:
  // "sadece tali bayi ve şoför hariç herkes görüp işlem yapabilecek"
  if (["sofor", "tali_bayi", "bayi"].includes(userRole)) {
    if (userRole === "sofor") {
      redirect("/sevkiyat");
    } else {
      redirect("/bayi-siparis");
    }
  }

  // Verileri çek
  const {
    brokenRecords,
    deliveryRecords,
    brokenColumns,
    deliveryColumns,
    customers,
  } = await getWarehousePageData();

  return (
    <DepoTakipClient
      initialBrokenRecords={brokenRecords}
      initialDeliveryRecords={deliveryRecords}
      initialBrokenColumns={brokenColumns}
      initialDeliveryColumns={deliveryColumns}
      customers={customers}
      userRole={userRole}
      userName={userName}
    />
  );
}
