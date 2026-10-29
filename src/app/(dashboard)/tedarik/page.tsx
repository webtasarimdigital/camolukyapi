import { getProcurementRecords } from "./actions";
import TedarikClient from "./TedarikClient";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TedarikPage() {
  let userRole = "staff";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const cookieRole = cookieStore.get("app_active_role")?.value;

    if (user) {
      const { data: profile } = (await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()) as any;
      if (profile?.role) userRole = profile.role;
    }

    if (cookieRole) userRole = cookieRole;
  } catch (err) {
    console.error("TedarikPage auth error:", err);
  }

  let customers: any[] = [];
  try {
    const supabase = await createClient();
    const { data: custData } = await supabase
      .from("customers")
      .select("id, company_name, contact_name, phone")
      .eq("is_active", true)
      .order("company_name", { ascending: true });
    if (custData) customers = custData;
  } catch (err) {
    console.error("TedarikPage customers error:", err);
  }

  const records = await getProcurementRecords();

  return (
    <TedarikClient
      initialRecords={records}
      userRole={userRole}
      initialCustomers={customers}
    />
  );
}
