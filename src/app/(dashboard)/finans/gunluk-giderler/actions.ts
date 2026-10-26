"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getCompanyIdAndUser(): Promise<{ companyId: string; userName: string }> {
  let companyId = "a0000000-0000-0000-0000-000000000001";
  let userName = "Admin";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id, full_name")
        .eq("id", user.id)
        .single();
      const p = profile as any;
      if (p?.company_id) companyId = p.company_id;
      if (p?.full_name) userName = p.full_name;
    }
  } catch {}
  return { companyId, userName };
}

export async function getUnifiedDailyExpenses() {
  try {
    const { companyId } = await getCompanyIdAndUser();
    const service: any = await createServiceClient();

    // 1. Manuel Giderler
    const { data: manualData, error: manErr } = await service
      .from("daily_expenses")
      .select("*")
      .eq("company_id", companyId)
      .order("expense_date", { ascending: false });

    if (manErr) console.error("daily_expenses error:", manErr);
    const manualExpenses = ((manualData || []) as any[]).map((m: any) => ({
      ...m,
      source_type: "manual",
      is_manual: true,
    }));

    // 2. Araç Akaryakıt / Benzin Masrafları (vehicles -> cargo_notes JSON)
    const { data: vehicleData } = await service
      .from("vehicles")
      .select("id, plate, driver_name, cargo_notes")
      .eq("company_id", companyId);

    const vehicleExpenses: any[] = [];
    ((vehicleData || []) as any[]).forEach((v: any) => {
      if (v.cargo_notes && typeof v.cargo_notes === "string" && v.cargo_notes.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(v.cargo_notes);
          if (Array.isArray(parsed.expenses)) {
            parsed.expenses.forEach((e: any, idx: number) => {
              if (e.type === "fuel" || e.category === "fuel" || !e.type) {
                vehicleExpenses.push({
                  id: `veh-fuel-${v.id}-${idx}`,
                  expense_date: e.date || new Date().toISOString().split("T")[0],
                  category: "Akaryakıt & Benzin",
                  description: `Araç Yakıtı: ${v.plate} (${v.driver_name || "Şoför"}) ${e.notes ? `- ${e.notes}` : ""}`,
                  amount: Number(e.amount) || 0,
                  status: "Ödendi",
                  payment_method: "Taşıtmatik / Nakit",
                  source_type: "vehicle_fuel",
                  source_id: v.id,
                  notes: `Plaka: ${v.plate} • KM: ${e.km || "—"}`,
                  custom_fields: {},
                  is_manual: false,
                });
              }
            });
          }
        } catch {}
      }
    });

    // 3. Personel Avansları (employee_transactions where type === 'avans')
    const { data: employeeData } = await service
      .from("employees")
      .select("id, full_name")
      .eq("company_id", companyId);
    const empMap = new Map(((employeeData || []) as any[]).map((emp: any) => [emp.id, emp.full_name]));

    const { data: advanceData } = await service
      .from("employee_transactions")
      .select("*")
      .eq("company_id", companyId)
      .eq("type", "avans")
      .order("transaction_date", { ascending: false });

    const advanceExpenses = ((advanceData || []) as any[]).map((adv: any) => ({
      id: `emp-adv-${adv.id}`,
      expense_date: adv.transaction_date,
      category: "Personel Avansı",
      description: `Personel Avansı: ${empMap.get(adv.employee_id) || "Personel"} ${adv.description ? `- ${adv.description}` : ""}`,
      amount: Number(adv.amount) || 0,
      status: "Ödendi",
      payment_method: "Nakit / Havale",
      source_type: "employee_advance",
      source_id: adv.employee_id,
      notes: `Veren: ${adv.created_by_name || "Yönetici"}`,
      custom_fields: {},
      is_manual: false,
    }));

    // Birleştir ve tarihe göre azalan sırala
    const unified = [...manualExpenses, ...vehicleExpenses, ...advanceExpenses].sort(
      (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );

    return unified;
  } catch (err) {
    console.error("getUnifiedDailyExpenses catch:", err);
    return [];
  }
}

export async function saveDailyExpense(formData: {
  id?: string;
  expense_date?: string;
  category: string;
  description: string;
  amount: number;
  status?: string;
  payment_method?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { companyId, userName } = await getCompanyIdAndUser();
    const service: any = await createServiceClient();

    if (formData.id) {
      const { data, error } = await service
        .from("daily_expenses")
        .update({
          expense_date: formData.expense_date || new Date().toISOString().split("T")[0],
          category: formData.category,
          description: formData.description,
          amount: Number(formData.amount),
          status: formData.status || "Ödendi",
          payment_method: formData.payment_method || "Nakit",
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      revalidatePath("/finans/gunluk-giderler");
      return { success: true, data };
    }

    const { data, error } = await service
      .from("daily_expenses")
      .insert({
        company_id: companyId,
        expense_date: formData.expense_date || new Date().toISOString().split("T")[0],
        category: formData.category,
        description: formData.description,
        amount: Number(formData.amount),
        status: formData.status || "Ödendi",
        payment_method: formData.payment_method || "Nakit",
        source_type: "manual",
        notes: formData.notes || null,
        created_by_name: userName,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/gunluk-giderler");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleDailyExpenseStatus(
  id: string,
  newStatus: "Ödendi" | "Ödenmedi"
): Promise<{ success: boolean; error?: string }> {
  try {
    // If it's a manual expense
    if (!id.startsWith("veh-fuel-") && !id.startsWith("emp-adv-")) {
      const service: any = await createServiceClient();
      const { error } = await service
        .from("daily_expenses")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) return { success: false, error: error.message };
      revalidatePath("/finans/gunluk-giderler");
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteDailyExpense(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (id.startsWith("veh-fuel-") || id.startsWith("emp-adv-")) {
      return { success: false, error: "Otomatik aktarılan giderler ilgili araç veya personel sayfasından yönetilmelidir." };
    }

    const service: any = await createServiceClient();
    const { error } = await service.from("daily_expenses").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/finans/gunluk-giderler");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
