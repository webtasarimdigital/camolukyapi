import { createClient } from "@supabase/supabase-js";
export * from "./types";
import {
  Shipment,
  PaymentFollowup,
  Transporter,
  Employee,
  Rent,
} from "./types";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jlxuvdhwbzaotrdlmwyl.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Fallback in-memory cache to ensure zero crash guarantee
const memFallback: Record<string, any[]> = {
  shipments: [],
  payment_followups: [],
  transporters: [],
  employees: [],
  rents: [],
};

// ──────────────────── SEVKİYAT ────────────────────
export async function getShipments(): Promise<Shipment[]> {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getShipments error:", error);
      return memFallback.shipments as Shipment[];
    }
    memFallback.shipments = data || [];
    return (data || []) as Shipment[];
  } catch (err) {
    console.error("getShipments catch:", err);
    return memFallback.shipments as Shipment[];
  }
}

export async function saveShipment(
  data: Omit<Shipment, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<Shipment> {
  const now = new Date().toISOString();
  if (data.id) {
    const { data: updated, error } = await supabase
      .from("shipments")
      .update({
        customer_name: data.customer_name,
        seller: data.seller,
        destination: data.destination,
        receipt_no: data.receipt_no,
        is_official: data.is_official,
        m2: data.m2,
        pallet_count: data.pallet_count,
        preparation_notes: data.preparation_notes,
        status: data.status,
        updated_at: now,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (!error && updated) {
      return updated as Shipment;
    }
  }

  const { data: inserted, error } = await supabase
    .from("shipments")
    .insert({
      customer_name: data.customer_name,
      seller: data.seller,
      destination: data.destination,
      receipt_no: data.receipt_no,
      is_official: data.is_official,
      m2: data.m2,
      pallet_count: data.pallet_count,
      preparation_notes: data.preparation_notes,
      status: data.status,
      created_by_name: data.created_by_name || "Admin",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Sevkiyat kaydedilemedi");
  }
  return inserted as Shipment;
}

export async function updateShipmentStatus(
  id: string,
  status: Shipment["status"]
): Promise<Shipment | null> {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("updateShipmentStatus error:", error);
      return null;
    }
    return data as Shipment;
  } catch (err) {
    console.error("updateShipmentStatus catch:", err);
    return null;
  }
}

export async function deleteShipment(id: string): Promise<void> {
  await supabase.from("shipments").delete().eq("id", id);
}

// ──────────────────── ÖDEME TAKİBİ & VADELER ────────────────────
export async function getPaymentFollowups(): Promise<PaymentFollowup[]> {
  try {
    const { data, error } = await supabase
      .from("payment_followups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getPaymentFollowups error:", error);
      return memFallback.payment_followups as PaymentFollowup[];
    }
    memFallback.payment_followups = data || [];
    return (data || []) as PaymentFollowup[];
  } catch (err) {
    console.error("getPaymentFollowups catch:", err);
    return memFallback.payment_followups as PaymentFollowup[];
  }
}

export async function savePaymentFollowup(
  data: Omit<PaymentFollowup, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<PaymentFollowup> {
  const now = new Date().toISOString();
  if (data.id) {
    const { data: updated, error } = await supabase
      .from("payment_followups")
      .update({
        type: data.type,
        contact_date: data.contact_date,
        contact_name: data.contact_name,
        description: data.description,
        personnel: data.personnel,
        payment_method: data.payment_method,
        due_date: data.due_date,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount,
        status: data.status,
        notes: data.notes,
        updated_at: now,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (!error && updated) {
      return updated as PaymentFollowup;
    }
  }

  const { data: inserted, error } = await supabase
    .from("payment_followups")
    .insert({
      type: data.type,
      contact_date: data.contact_date,
      contact_name: data.contact_name,
      description: data.description,
      personnel: data.personnel,
      payment_method: data.payment_method,
      due_date: data.due_date,
      total_amount: data.total_amount,
      paid_amount: data.paid_amount,
      status: data.status,
      notes: data.notes,
      created_by_name: data.created_by_name || "Admin",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Ödeme takibi kaydedilemedi");
  }
  return inserted as PaymentFollowup;
}

export async function deletePaymentFollowup(id: string): Promise<void> {
  await supabase.from("payment_followups").delete().eq("id", id);
}

// ──────────────────── NAKLİYELER ────────────────────
export async function getTransporters(): Promise<Transporter[]> {
  try {
    const { data, error } = await supabase
      .from("transporters")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getTransporters error:", error);
      return memFallback.transporters as Transporter[];
    }
    memFallback.transporters = data || [];
    return (data || []) as Transporter[];
  } catch (err) {
    console.error("getTransporters catch:", err);
    return memFallback.transporters as Transporter[];
  }
}

export async function saveTransporter(
  data: Omit<Transporter, "id" | "created_at"> & { id?: string }
): Promise<Transporter> {
  const now = new Date().toISOString();
  if (data.id) {
    const { data: updated, error } = await supabase
      .from("transporters")
      .update({
        transporter_name: data.transporter_name,
        transport_date: data.transport_date,
        amount: data.amount,
        iban: data.iban,
        status: data.status,
        notes: data.notes,
        due_date: data.due_date,
        updated_at: now,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (!error && updated) {
      return updated as Transporter;
    }
  }

  const { data: inserted, error } = await supabase
    .from("transporters")
    .insert({
      transporter_name: data.transporter_name,
      transport_date: data.transport_date,
      amount: data.amount,
      iban: data.iban,
      status: data.status,
      notes: data.notes,
      due_date: data.due_date,
      created_by_name: data.created_by_name || "Admin",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Nakliye kaydı kaydedilemedi");
  }
  return inserted as Transporter;
}

export async function deleteTransporter(id: string): Promise<void> {
  await supabase.from("transporters").delete().eq("id", id);
}

// ──────────────────── PERSONEL YÖNETİMİ ────────────────────
export async function getEmployees(): Promise<Employee[]> {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getEmployees error:", error);
      return memFallback.employees as Employee[];
    }
    memFallback.employees = data || [];
    return (data || []) as Employee[];
  } catch (err) {
    console.error("getEmployees catch:", err);
    return memFallback.employees as Employee[];
  }
}

export async function saveEmployee(
  data: Omit<Employee, "id" | "created_at"> & { id?: string }
): Promise<Employee> {
  const now = new Date().toISOString();
  if (data.id) {
    const { data: updated, error } = await supabase
      .from("employees")
      .update({
        full_name: data.full_name,
        phone: data.phone,
        position: data.position,
        start_date: data.start_date,
        salary: data.salary,
        total_advances: data.total_advances,
        used_leave_days: data.used_leave_days,
        remaining_leave_days: data.remaining_leave_days,
        notes: data.notes,
        updated_at: now,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (!error && updated) {
      return updated as Employee;
    }
  }

  const { data: inserted, error } = await supabase
    .from("employees")
    .insert({
      full_name: data.full_name,
      phone: data.phone,
      position: data.position,
      start_date: data.start_date,
      salary: data.salary,
      total_advances: data.total_advances,
      used_leave_days: data.used_leave_days,
      remaining_leave_days: data.remaining_leave_days,
      notes: data.notes,
      created_by_name: data.created_by_name || "Admin",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Personel kaydı kaydedilemedi");
  }
  return inserted as Employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  await supabase.from("employees").delete().eq("id", id);
}

// ──────────────────── KİRALAR ────────────────────
export async function getRents(): Promise<Rent[]> {
  try {
    const { data, error } = await supabase
      .from("rents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getRents error:", error);
      return memFallback.rents as Rent[];
    }
    memFallback.rents = data || [];
    return (data || []) as Rent[];
  } catch (err) {
    console.error("getRents catch:", err);
    return memFallback.rents as Rent[];
  }
}

export async function saveRent(
  data: Omit<Rent, "id" | "created_at"> & { id?: string }
): Promise<Rent> {
  const now = new Date().toISOString();
  if (data.id) {
    const { data: updated, error } = await supabase
      .from("rents")
      .update({
        type: data.type,
        title: data.title,
        counterpart_name: data.counterpart_name,
        amount: data.amount,
        payment_day: data.payment_day,
        payment_method: data.payment_method,
        status: data.status,
        notes: data.notes,
        updated_at: now,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (!error && updated) {
      return updated as Rent;
    }
  }

  const { data: inserted, error } = await supabase
    .from("rents")
    .insert({
      type: data.type,
      title: data.title,
      counterpart_name: data.counterpart_name,
      amount: data.amount,
      payment_day: data.payment_day,
      payment_method: data.payment_method,
      status: data.status,
      notes: data.notes,
      created_by_name: data.created_by_name || "Admin",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Kira kaydı kaydedilemedi");
  }
  return inserted as Rent;
}

export async function deleteRent(id: string): Promise<void> {
  await supabase.from("rents").delete().eq("id", id);
}
