import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { BankalarClient } from "./BankalarClient";
import { getBankAccounts, getBankLoans, getBankPaymentHistory } from "./actions";
import { getCustomColumns } from "@/lib/data/custom-columns-actions";

export default async function BankalarPage() {
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

  const profile = profileData as any;
  if (!profile?.company_id) redirect("/login");

  const cookieStore = await cookies();
  const cookieRole = cookieStore.get("app_active_role")?.value;
  const cookieName = cookieStore.get("app_user_name")?.value;
  const isActualAdmin = profile.role === "admin";
  const activeRole = isActualAdmin ? cookieRole || "admin" : profile.role;
  const userName = cookieName || profile.full_name || "Yönetici";

  if (activeRole !== "admin") {
    redirect("/dashboard");
  }

  // Parallel fetch bank accounts, loans, payment history and custom columns
  const [accounts, loans, accountCustomCols, loanCustomCols, instCustomCols, paymentHistory] =
    await Promise.all([
      getBankAccounts(),
      getBankLoans(),
      getCustomColumns("bank_accounts"),
      getCustomColumns("bank_loans"),
      getCustomColumns("bank_loan_installments"),
      getBankPaymentHistory(),
    ]);

  return (
    <BankalarClient
      initialAccounts={accounts}
      initialLoans={loans}
      accountCustomColumns={accountCustomCols}
      loanCustomColumns={loanCustomCols}
      installmentCustomColumns={instCustomCols}
      initialPaymentHistory={paymentHistory}
      userName={userName}
    />
  );
}
