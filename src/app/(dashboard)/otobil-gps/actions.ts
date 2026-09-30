"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import type { Vehicle } from "./types";

async function getCompanyAndUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  const profile = profileData as { company_id: string } | null;
  if (!profile?.company_id) throw new Error("Company not found");

  const cookieStore = await cookies();
  const userName = cookieStore.get("app_user_name")?.value || user.email || "Kullanıcı";

  return { supabase, user, companyId: profile.company_id, userName };
}

export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const { supabase, companyId } = await getCompanyAndUser();
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      // Tablo yoksa boş dön
      if (error.code === "42P01") return [];
      throw error;
    }
    return (data as Vehicle[]) || [];
  } catch {
    return [];
  }
}

export async function saveVehicle(input: {
  id?: string;
  plate: string;
  driver_name: string;
  driver_phone?: string;
  vehicle_type: string;
  status: Vehicle["status"];
  current_location?: string;
  destination?: string;
  cargo_notes?: string;
}) {
  const { supabase, companyId, userName } = await getCompanyAndUser();
  const now = new Date().toISOString();

  if (input.id) {
    // Güncelle
    const { error } = await supabase
      .from("vehicles")
      .update({
        plate: input.plate.trim().toUpperCase(),
        driver_name: input.driver_name.trim(),
        driver_phone: input.driver_phone?.trim() || null,
        vehicle_type: input.vehicle_type,
        status: input.status,
        current_location: input.current_location?.trim() || null,
        destination: input.destination?.trim() || null,
        cargo_notes: input.cargo_notes?.trim() || null,
        last_updated_by: userName,
        last_updated_at: now,
      } as never)
      .eq("id", input.id)
      .eq("company_id", companyId);

    if (error) throw new Error(error.message);
  } else {
    // Yeni ekle
    const { error } = await supabase
      .from("vehicles")
      .insert({
        company_id: companyId,
        plate: input.plate.trim().toUpperCase(),
        driver_name: input.driver_name.trim(),
        driver_phone: input.driver_phone?.trim() || null,
        vehicle_type: input.vehicle_type,
        status: input.status,
        current_location: input.current_location?.trim() || null,
        destination: input.destination?.trim() || null,
        cargo_notes: input.cargo_notes?.trim() || null,
        last_updated_by: userName,
        last_updated_at: now,
      } as never);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/otobil-gps");
  return { success: true };
}

export async function updateVehicleStatus(
  id: string,
  status: Vehicle["status"],
  current_location?: string
) {
  const { supabase, companyId, userName } = await getCompanyAndUser();
  const { error } = await supabase
    .from("vehicles")
    .update({
      status,
      current_location: current_location?.trim() || null,
      last_updated_by: userName,
      last_updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw new Error(error.message);
  revalidatePath("/otobil-gps");
  return { success: true };
}

export async function deleteVehicle(id: string) {
  const { supabase, companyId } = await getCompanyAndUser();
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw new Error(error.message);
  revalidatePath("/otobil-gps");
  return { success: true };
}
