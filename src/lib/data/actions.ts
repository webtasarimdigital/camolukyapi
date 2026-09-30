"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  Shipment,
  PaymentFollowup,
  Transporter,
  Employee,
  Rent,
  getShipments,
  saveShipment,
  updateShipmentStatus,
  deleteShipment,
  getPaymentFollowups,
  savePaymentFollowup,
  deletePaymentFollowup,
  getTransporters,
  saveTransporter,
  deleteTransporter,
  getEmployees,
  saveEmployee,
  deleteEmployee,
  getRents,
  saveRent,
  deleteRent,
} from "./store";

import { cookies } from "next/headers";

async function getCurrentUserName(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieName = cookieStore.get("app_user_name")?.value;
    if (cookieName) return cookieName;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "Çamoluk Kullanıcısı";
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    const profile = profileData as { full_name?: string; role?: string } | null;
    if (profile?.full_name) return profile.full_name;
    if (profile?.role) {
      if (profile.role === "muhasebe1") return "Muhasebe 1";
      if (profile.role === "muhasebe2") return "Muhasebe 2";
      if (profile.role === "sevkiyat") return "Sevkiyat Sorumlusu";
      return "Admin";
    }
    return user.email || "Kullanıcı";
  } catch {
    return "Çamoluk Kullanıcısı";
  }
}

// ──────────────────── SEVKİYAT ACTIONS ────────────────────
export async function actionGetShipments() {
  try {
    return await getShipments();
  } catch (err: any) {
    console.error("actionGetShipments error:", err);
    return [];
  }
}

export async function actionSaveShipment(formData: FormData) {
  try {
    const userName = await getCurrentUserName();
    const id = (formData.get("id") as string) || undefined;
    const customer_name = (formData.get("customer_name") as string) || "";
    const seller = (formData.get("seller") as string) || "";
    const destination = (formData.get("destination") as string) || "";
    const receipt_no = (formData.get("receipt_no") as string) || "";
    const is_official = (formData.get("is_official") as "Resmi" | "Gayriresmi") || "Resmi";
    const m2 = parseFloat(formData.get("m2") as string) || 0;
    const pallet_count = parseFloat(formData.get("pallet_count") as string) || 0;
    const preparation_notes = (formData.get("preparation_notes") as string) || "";
    const status = (formData.get("status") as Shipment["status"]) || "Depoya Gitti";

    const saved = await saveShipment({
      id,
      customer_name,
      seller,
      destination,
      receipt_no,
      is_official,
      m2,
      pallet_count,
      preparation_notes,
      status,
      created_by_name: userName,
    });

    try {
      revalidatePath("/sevkiyat");
    } catch {}

    return { success: true, shipment: saved };
  } catch (err: any) {
    console.error("actionSaveShipment error:", err);
    return { success: false, error: err?.message || "Sevkiyat kaydedilemedi." };
  }
}

export async function actionUpdateShipmentStatus(id: string, status: Shipment["status"]) {
  try {
    const updated = await updateShipmentStatus(id, status);
    try {
      revalidatePath("/sevkiyat");
    } catch {}
    return { success: true, shipment: updated };
  } catch (err: any) {
    console.error("actionUpdateShipmentStatus error:", err);
    return { success: false, error: err?.message || "Durum güncellenemedi." };
  }
}

export async function actionDeleteShipment(id: string) {
  try {
    await deleteShipment(id);
    try {
      revalidatePath("/sevkiyat");
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("actionDeleteShipment error:", err);
    return { success: false, error: err?.message || "Sevkiyat silinemedi." };
  }
}

// ──────────────────── ÖDEME TAKİBİ ACTIONS ────────────────────
export async function actionGetPaymentFollowups() {
  try {
    return await getPaymentFollowups();
  } catch (err: any) {
    console.error("actionGetPaymentFollowups error:", err);
    return [];
  }
}

export async function actionSavePaymentFollowup(formData: FormData) {
  try {
    const userName = await getCurrentUserName();
    const id = (formData.get("id") as string) || undefined;
    const type = (formData.get("type") as "alacak" | "borc") || "alacak";
    const contact_date = (formData.get("contact_date") as string) || new Date().toISOString().split("T")[0];
    const contact_name = (formData.get("contact_name") as string) || "";
    const description = (formData.get("description") as string) || "";
    const personnel = (formData.get("personnel") as string) || "";
    const payment_method = (formData.get("payment_method") as any) || "Nakit";
    const due_date = (formData.get("due_date") as string) || "";
    const total_amount = parseFloat(formData.get("total_amount") as string) || 0;
    const paid_amount = parseFloat(formData.get("paid_amount") as string) || 0;
    const status = (formData.get("status") as any) || (paid_amount >= total_amount ? "Ödendi" : paid_amount > 0 ? "Kısmi Ödendi" : "Bekliyor");
    const notes = (formData.get("notes") as string) || "";

    const saved = await savePaymentFollowup({
      id,
      type,
      contact_date,
      contact_name,
      description,
      personnel,
      payment_method,
      due_date,
      total_amount,
      paid_amount,
      status,
      notes,
      created_by_name: userName,
    });

    try {
      revalidatePath("/odemeler");
    } catch {}

    return { success: true, payment: saved };
  } catch (err: any) {
    console.error("actionSavePaymentFollowup error:", err);
    return { success: false, error: err?.message || "Ödeme takibi kaydedilemedi." };
  }
}

export async function actionDeletePaymentFollowup(id: string) {
  try {
    await deletePaymentFollowup(id);
    try {
      revalidatePath("/odemeler");
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("actionDeletePaymentFollowup error:", err);
    return { success: false, error: err?.message || "Kayıt silinemedi." };
  }
}

// ──────────────────── NAKLİYELER ACTIONS ────────────────────
export async function actionGetTransporters() {
  try {
    return await getTransporters();
  } catch (err: any) {
    console.error("actionGetTransporters error:", err);
    return [];
  }
}

export async function actionSaveTransporter(formData: FormData) {
  try {
    const userName = await getCurrentUserName();
    const id = (formData.get("id") as string) || undefined;
    const transporter_name = (formData.get("transporter_name") as string) || "";
    const transport_date = (formData.get("transport_date") as string) || new Date().toISOString().split("T")[0];
    const amount = parseFloat(formData.get("amount") as string) || 0;
    const iban = (formData.get("iban") as string) || "";
    const status = (formData.get("status") as "Ödendi" | "Ödenmedi") || "Ödenmedi";
    const notes = (formData.get("notes") as string) || "";
    const due_date = (formData.get("due_date") as string) || transport_date;

    const saved = await saveTransporter({
      id,
      transporter_name,
      transport_date,
      amount,
      iban,
      status,
      notes,
      due_date,
      created_by_name: userName,
    });

    try {
      revalidatePath("/nakliyeler");
    } catch {}

    return { success: true, transporter: saved };
  } catch (err: any) {
    console.error("actionSaveTransporter error:", err);
    return { success: false, error: err?.message || "Nakliye kaydı kaydedilemedi." };
  }
}

export async function actionDeleteTransporter(id: string) {
  try {
    await deleteTransporter(id);
    try {
      revalidatePath("/nakliyeler");
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("actionDeleteTransporter error:", err);
    return { success: false, error: err?.message || "Nakliye kaydı silinemedi." };
  }
}

// ──────────────────── PERSONEL ACTIONS ────────────────────
export async function actionGetEmployees() {
  try {
    return await getEmployees();
  } catch (err: any) {
    console.error("actionGetEmployees error:", err);
    return [];
  }
}

export async function actionSaveEmployee(formData: FormData) {
  try {
    const userName = await getCurrentUserName();
    const id = (formData.get("id") as string) || undefined;
    const full_name = (formData.get("full_name") as string) || "";
    const phone = (formData.get("phone") as string) || "";
    const position = (formData.get("position") as string) || "";
    const start_date = (formData.get("start_date") as string) || "";
    const salary = parseFloat(formData.get("salary") as string) || 0;
    const total_advances = parseFloat(formData.get("total_advances") as string) || 0;
    const used_leave_days = parseFloat(formData.get("used_leave_days") as string) || 0;
    const remaining_leave_days = parseFloat(formData.get("remaining_leave_days") as string) || 14;
    const notes = (formData.get("notes") as string) || "";

    const saved = await saveEmployee({
      id,
      full_name,
      phone,
      position,
      start_date,
      salary,
      total_advances,
      used_leave_days,
      remaining_leave_days,
      notes,
      created_by_name: userName,
    });

    try {
      revalidatePath("/personel");
    } catch {}

    return { success: true, employee: saved };
  } catch (err: any) {
    console.error("actionSaveEmployee error:", err);
    return { success: false, error: err?.message || "Personel kaydı kaydedilemedi." };
  }
}

export async function actionDeleteEmployee(id: string) {
  try {
    await deleteEmployee(id);
    try {
      revalidatePath("/personel");
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("actionDeleteEmployee error:", err);
    return { success: false, error: err?.message || "Personel silinemedi." };
  }
}

// ──────────────────── KİRALAR ACTIONS ────────────────────
export async function actionGetRents() {
  try {
    return await getRents();
  } catch (err: any) {
    console.error("actionGetRents error:", err);
    return [];
  }
}

export async function actionSaveRent(formData: FormData) {
  try {
    const userName = await getCurrentUserName();
    const id = (formData.get("id") as string) || undefined;
    const type = (formData.get("type") as "toplanan" | "verilen") || "toplanan";
    const title = (formData.get("title") as string) || "";
    const counterpart_name = (formData.get("counterpart_name") as string) || "";
    const amount = parseFloat(formData.get("amount") as string) || 0;
    const payment_day = parseInt(formData.get("payment_day") as string, 10) || 1;
    const payment_method = (formData.get("payment_method") as string) || "Banka";
    const status = (formData.get("status") as any) || "Bekliyor";
    const notes = (formData.get("notes") as string) || "";

    const saved = await saveRent({
      id,
      type,
      title,
      counterpart_name,
      amount,
      payment_day,
      payment_method,
      status,
      notes,
      created_by_name: userName,
    });

    try {
      revalidatePath("/kiralar");
    } catch {}

    return { success: true, rent: saved };
  } catch (err: any) {
    console.error("actionSaveRent error:", err);
    return { success: false, error: err?.message || "Kira kaydı kaydedilemedi." };
  }
}

export async function actionDeleteRent(id: string) {
  try {
    await deleteRent(id);
    try {
      revalidatePath("/kiralar");
    } catch {}
    return { success: true };
  } catch (err: any) {
    console.error("actionDeleteRent error:", err);
    return { success: false, error: err?.message || "Kira kaydı silinemedi." };
  }
}
