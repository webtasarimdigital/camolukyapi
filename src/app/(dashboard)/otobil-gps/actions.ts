"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import type { Vehicle, VehicleExpense, VehicleDocuments } from "./types";

async function getCompanyAndUser() {
  let companyId = "a0000000-0000-0000-0000-000000000001";
  let userName = "Admin";

  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (user) {
      const { data: profileData } = await authClient
        .from("profiles")
        .select("company_id, full_name")
        .eq("id", user.id)
        .single();
      const profile = profileData as { company_id: string; full_name?: string } | null;
      if (profile?.company_id) companyId = profile.company_id;
      if (profile?.full_name) userName = profile.full_name;
    }
  } catch {}

  try {
    const cookieStore = await cookies();
    const cookieName = cookieStore.get("app_user_name")?.value;
    if (cookieName) userName = cookieName;
  } catch {}

  const serviceClient = await createServiceClient();
  return { supabase: serviceClient, companyId, userName };
}

function parseVehicleRecord(raw: any): Vehicle {
  let cargo_notes = raw.cargo_notes || "";
  let inspection_date: string | null = null;
  let insurance_date: string | null = null;
  let license_date: string | null = null;
  let maintenance_date: string | null = null;
  let maintenance_cost: number = 0;
  let fuel_cost: number = 0;
  let notes: string | null = null;
  let expenses: VehicleExpense[] = [];
  let documents: VehicleDocuments = {};

  if (raw.cargo_notes && typeof raw.cargo_notes === "string" && raw.cargo_notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw.cargo_notes);
      cargo_notes = parsed.cargo || "";
      inspection_date = parsed.inspection_date || null;
      insurance_date = parsed.insurance_date || null;
      license_date = parsed.license_date || null;
      maintenance_date = parsed.maintenance_date || null;
      maintenance_cost = Number(parsed.maintenance_cost) || 0;
      fuel_cost = Number(parsed.fuel_cost) || 0;
      notes = parsed.notes || null;
      if (Array.isArray(parsed.expenses)) {
        expenses = parsed.expenses;
      }
      if (parsed.documents && typeof parsed.documents === "object") {
        documents = parsed.documents;
      }
    } catch {}
  }

  // If expenses array exists, calculate dynamic totals
  if (expenses.length > 0) {
    const calcFuel = expenses
      .filter((e) => e.type === "fuel")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const calcMaint = expenses
      .filter((e) => e.type === "repair")
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    fuel_cost = calcFuel;
    maintenance_cost = calcMaint;
  }

  return {
    ...raw,
    cargo_notes,
    inspection_date,
    insurance_date,
    license_date,
    maintenance_date,
    maintenance_cost,
    fuel_cost,
    notes,
    expenses,
    documents,
  };
}

function serializeCargoNotes(input: {
  cargo_notes?: string | null;
  inspection_date?: string | null;
  insurance_date?: string | null;
  license_date?: string | null;
  maintenance_date?: string | null;
  maintenance_cost?: number;
  fuel_cost?: number;
  notes?: string | null;
  expenses?: VehicleExpense[];
  documents?: VehicleDocuments;
}): string {
  return JSON.stringify({
    cargo: input.cargo_notes || "",
    inspection_date: input.inspection_date || null,
    insurance_date: input.insurance_date || null,
    license_date: input.license_date || null,
    maintenance_date: input.maintenance_date || null,
    maintenance_cost: Number(input.maintenance_cost) || 0,
    fuel_cost: Number(input.fuel_cost) || 0,
    notes: input.notes || null,
    expenses: input.expenses || [],
    documents: input.documents || {},
  });
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
      if (error.code === "42P01") return [];
      throw error;
    }
    return ((data || []) as any[]).map(parseVehicleRecord);
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
  current_location?: string;
  destination?: string;
  cargo_notes?: string;
  inspection_date?: string;
  insurance_date?: string;
  license_date?: string;
  maintenance_date?: string;
  maintenance_cost?: number;
  fuel_cost?: number;
  notes?: string;
  expenses?: VehicleExpense[];
  documents?: VehicleDocuments;
}) {
  const { supabase, companyId, userName } = await getCompanyAndUser();
  const now = new Date().toISOString();

  // If updating, preserve existing expenses and documents unless explicitly overridden
  let existingExpenses = input.expenses;
  let existingDocs = input.documents;

  if (input.id && (!existingExpenses || !existingDocs)) {
    const { data: existing } = await (supabase.from("vehicles") as any)
      .select("cargo_notes")
      .eq("id", input.id)
      .single();

    const existingRaw = existing as any;
    if (existingRaw?.cargo_notes && existingRaw.cargo_notes.startsWith("{")) {
      try {
        const parsed = JSON.parse(existingRaw.cargo_notes);
        if (!existingExpenses && Array.isArray(parsed.expenses)) {
          existingExpenses = parsed.expenses;
        }
        if (!existingDocs && parsed.documents) {
          existingDocs = parsed.documents;
        }
      } catch {}
    }
  }

  const serializedNotes = serializeCargoNotes({
    cargo_notes: input.cargo_notes,
    inspection_date: input.inspection_date,
    insurance_date: input.insurance_date,
    license_date: input.license_date,
    maintenance_date: input.maintenance_date,
    maintenance_cost: input.maintenance_cost,
    fuel_cost: input.fuel_cost,
    notes: input.notes,
    expenses: existingExpenses || [],
    documents: existingDocs || {},
  });

  if (input.id) {
    // Güncelle
    const { error } = await supabase
      .from("vehicles")
      .update({
        plate: input.plate.trim().toUpperCase(),
        driver_name: input.driver_name.trim(),
        driver_phone: input.driver_phone?.trim() || null,
        vehicle_type: input.vehicle_type,
        status: "Aktif",
        current_location: input.current_location?.trim() || null,
        destination: input.destination?.trim() || null,
        cargo_notes: serializedNotes,
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
        status: "Aktif",
        current_location: input.current_location?.trim() || null,
        destination: input.destination?.trim() || null,
        cargo_notes: serializedNotes,
        last_updated_by: userName,
        last_updated_at: now,
      } as never);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/otobil-gps");
  return { success: true };
}

export async function addVehicleExpense(
  vehicleId: string,
  expense: Omit<VehicleExpense, "id" | "created_at">
) {
  const { supabase, companyId, userName } = await getCompanyAndUser();

  const { data: vehicle, error: fetchErr } = await supabase
    .from("vehicles")
    .select("cargo_notes")
    .eq("id", vehicleId)
    .eq("company_id", companyId)
    .single();

  if (fetchErr || !vehicle) throw new Error("Araç bulunamadı.");

  const vehicleRaw = vehicle as any;
  let parsed: any = {};
  try {
    if (vehicleRaw.cargo_notes && vehicleRaw.cargo_notes.startsWith("{")) {
      parsed = JSON.parse(vehicleRaw.cargo_notes);
    }
  } catch {}

  const currentExpenses: VehicleExpense[] = Array.isArray(parsed.expenses)
    ? parsed.expenses
    : [];

  const newExpense: VehicleExpense = {
    ...expense,
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  const updatedExpenses = [newExpense, ...currentExpenses];
  parsed.expenses = updatedExpenses;

  const { error } = await supabase
    .from("vehicles")
    .update({
      cargo_notes: JSON.stringify(parsed),
      last_updated_by: userName,
      last_updated_at: new Date().toISOString(),
    } as never)
    .eq("id", vehicleId)
    .eq("company_id", companyId);

  if (error) throw new Error("Masraf kaydedilemedi: " + error.message);

  revalidatePath("/otobil-gps");
  return { success: true, expense: newExpense };
}

export async function deleteVehicleExpense(vehicleId: string, expenseId: string) {
  const { supabase, companyId, userName } = await getCompanyAndUser();

  const { data: vehicle, error: fetchErr } = await supabase
    .from("vehicles")
    .select("cargo_notes")
    .eq("id", vehicleId)
    .eq("company_id", companyId)
    .single();

  if (fetchErr || !vehicle) throw new Error("Araç bulunamadı.");

  const vehicleRaw = vehicle as any;
  let parsed: any = {};
  try {
    if (vehicleRaw.cargo_notes && vehicleRaw.cargo_notes.startsWith("{")) {
      parsed = JSON.parse(vehicleRaw.cargo_notes);
    }
  } catch {}

  const currentExpenses: VehicleExpense[] = Array.isArray(parsed.expenses)
    ? parsed.expenses
    : [];
  parsed.expenses = currentExpenses.filter((e) => e.id !== expenseId);

  const { error } = await supabase
    .from("vehicles")
    .update({
      cargo_notes: JSON.stringify(parsed),
      last_updated_by: userName,
      last_updated_at: new Date().toISOString(),
    } as never)
    .eq("id", vehicleId)
    .eq("company_id", companyId);

  if (error) throw new Error("Masraf silinemedi: " + error.message);

  revalidatePath("/otobil-gps");
  return { success: true };
}

export async function updateVehicleDocuments(
  vehicleId: string,
  documents: VehicleDocuments
) {
  const { supabase, companyId, userName } = await getCompanyAndUser();

  const { data: vehicle, error: fetchErr } = await supabase
    .from("vehicles")
    .select("cargo_notes")
    .eq("id", vehicleId)
    .eq("company_id", companyId)
    .single();

  if (fetchErr || !vehicle) throw new Error("Araç bulunamadı.");

  const vehicleRaw = vehicle as any;
  let parsed: any = {};
  try {
    if (vehicleRaw.cargo_notes && vehicleRaw.cargo_notes.startsWith("{")) {
      parsed = JSON.parse(vehicleRaw.cargo_notes);
    }
  } catch {}

  parsed.documents = {
    ...(parsed.documents || {}),
    ...documents,
  };

  const { error } = await supabase
    .from("vehicles")
    .update({
      cargo_notes: JSON.stringify(parsed),
      last_updated_by: userName,
      last_updated_at: new Date().toISOString(),
    } as never)
    .eq("id", vehicleId)
    .eq("company_id", companyId);

  if (error) throw new Error("Belgeler kaydedilemedi: " + error.message);

  revalidatePath("/otobil-gps");
  return { success: true };
}

export async function uploadVehicleFile(formData: FormData): Promise<{ url: string; fileName: string }> {
  const { supabase } = await getCompanyAndUser();
  const file = formData.get("file") as File;
  if (!file) throw new Error("Dosya bulunamadı.");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const extension = file.name.split(".").pop() || "jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
  const filePath = `uploads/${safeName}`;

  const { error } = await supabase.storage
    .from("vehicle-docs")
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error("Dosya yüklenemedi: " + error.message);
  }

  const { data: urlData } = supabase.storage
    .from("vehicle-docs")
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    fileName: file.name,
  };
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
