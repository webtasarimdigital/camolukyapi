import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QuoteForm } from "./QuoteForm";

export default async function NewQuotePage() {
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

  const { data: settingsData } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", profile.company_id)
    .single();

  const settings = (settingsData as any) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Yeni Teklif Oluştur</h1>
          <p className="text-sm text-text-muted">Müşteri ve ürünleri seçerek yeni teklif hazırlayın</p>
        </div>
      </div>
      
      <QuoteForm 
        creatorName={profile.full_name} 
        defaultSettings={settings} 
      />
    </div>
  );
}
