import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPaymentFollowups, getRents, getTransporters, getEmployees } from "@/lib/data/store";
import { FinansOverviewClient } from "./FinansOverviewClient";

export default async function FinansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id, role, full_name")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string; role: string; full_name: string } | null;
  if (!profile?.company_id) redirect("/login");

  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("app_active_role")?.value;
  const isActualAdmin = profile.role === "admin";
  const activeRole = isActualAdmin ? (cookieRole || "admin") : profile.role;

  if (activeRole !== "admin") {
    redirect("/dashboard");
  }

  // Satışlar verisini çek
  const { data: allSalesData } = await supabase
    .from("sales")
    .select("id, sale_code, grand_total, paid_amount, remaining_amount, payment_status, created_at, created_by")
    .eq("company_id", profile.company_id)
    .is("deleted_at", null);

  const sales = (allSalesData || []) as any[];

  // Finansal hareketler tablosunu çek
  const { data: transactionsData } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("transaction_date", { ascending: false })
    .limit(50);

  const transactions = (transactionsData || []) as any[];

  // Kullanıcı profilleri haritası (İşlem yapan kullanıcı imzası için)
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("company_id", profile.company_id);
  const profileObj: Record<string, string> = {};
  (profilesData || []).forEach((p: any) => {
    profileObj[p.id] = p.full_name;
  });

  // Supabase veri deposundan ödemeleri al
  const [followups, rents, transporters, employees] = await Promise.all([
    getPaymentFollowups(),
    getRents(),
    getTransporters(),
    getEmployees(),
  ]);

  return (
    <FinansOverviewClient
      sales={sales}
      transactions={transactions}
      followups={followups}
      rents={rents}
      transporters={transporters}
      employees={employees}
      profileMap={profileObj}
    />
  );
}
