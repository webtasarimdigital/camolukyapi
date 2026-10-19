import { createClient } from "@supabase/supabase-js";
export * from "./types";
import {
  Shipment,
  PaymentFollowup,
  Transporter,
  Employee,
  EmployeeTransaction,
  Rent,
  RentPayment,
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
  const shipmentDate = data.shipment_date || now.split("T")[0];

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
        shipment_date: shipmentDate,
        shipment_time: data.shipment_time || null,
        vehicle_plate: data.vehicle_plate || null,
        driver_name: data.driver_name || null,
        photos: data.photos || [],
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
      shipment_date: shipmentDate,
      shipment_time: data.shipment_time || null,
      vehicle_plate: data.vehicle_plate || null,
      driver_name: data.driver_name || null,
      photos: data.photos || [],
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
        invoice_no: data.invoice_no || null,
        document_url: data.document_url || null,
        documents: data.documents || [],
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
      invoice_no: data.invoice_no || null,
      document_url: data.document_url || null,
      documents: data.documents || [],
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

export async function saveTransportersBatch(
  items: Array<Omit<Transporter, "id" | "created_at">>
): Promise<Transporter[]> {
  const now = new Date().toISOString();
  const rows = items.map((item) => ({
    transporter_name: item.transporter_name,
    transport_date: item.transport_date,
    amount: item.amount,
    iban: item.iban,
    status: item.status || "Ödenmedi",
    notes: item.notes || "",
    due_date: item.due_date,
    invoice_no: item.invoice_no || null,
    document_url: item.document_url || null,
    documents: item.documents || [],
    created_by_name: item.created_by_name || "Excel İçe Aktarımı",
    created_at: now,
    updated_at: now,
  }));

  const { data, error } = await supabase
    .from("transporters")
    .insert(rows)
    .select();

  if (error) {
    throw new Error(error.message || "Toplu nakliye kaydı eklenemedi");
  }
  return (data || []) as Transporter[];
}

export async function deleteTransporter(id: string): Promise<void> {
  await supabase.from("transporters").delete().eq("id", id);
}

export async function deleteAllTransporters(): Promise<void> {
  const { error } = await supabase.from("transporters").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
  memFallback.transporters = [];
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
        iban: data.iban || null,
        official_salary: data.official_salary ?? 0,
        unofficial_salary: data.unofficial_salary ?? 0,
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
      iban: data.iban || null,
      official_salary: data.official_salary ?? 0,
      unofficial_salary: data.unofficial_salary ?? 0,
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

// ──────────────────── PERSONEL DETAY HAREKETLERİ (AVANS & İZİN) ────────────────────
export async function getEmployeeTransactions(employeeId: string): Promise<EmployeeTransaction[]> {
  try {
    const { data, error } = await supabase
      .from("employee_transactions")
      .select("*")
      .eq("employee_id", employeeId)
      .order("transaction_date", { ascending: false });

    if (error) {
      console.error("getEmployeeTransactions error:", error);
      return [];
    }
    return (data || []) as EmployeeTransaction[];
  } catch (err) {
    console.error("getEmployeeTransactions catch:", err);
    return [];
  }
}

export async function saveEmployeeTransaction(data: {
  employee_id: string;
  type: "avans" | "izin" | "maas_odeme";
  transaction_date: string;
  amount?: number;
  days?: number;
  description?: string;
  created_by_name?: string;
}): Promise<EmployeeTransaction> {
  const { data: inserted, error } = await supabase
    .from("employee_transactions")
    .insert({
      employee_id: data.employee_id,
      type: data.type,
      transaction_date: data.transaction_date,
      amount: data.amount ?? 0,
      days: data.days ?? 0,
      description: data.description || null,
      created_by_name: data.created_by_name || "Yetkili",
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Hareket kaydedilemedi.");
  }

  // Personelin toplam avansını veya kalan izin gününü otomatik güncelle
  if (data.type === "avans") {
    const { data: allAdvances } = await supabase
      .from("employee_transactions")
      .select("amount")
      .eq("employee_id", data.employee_id)
      .eq("type", "avans");
    const totalAdv = (allAdvances || []).reduce((s, a) => s + (Number(a.amount) || 0), 0);
    await supabase.from("employees").update({ total_advances: totalAdv }).eq("id", data.employee_id);
  } else if (data.type === "izin") {
    const { data: allLeaves } = await supabase
      .from("employee_transactions")
      .select("days")
      .eq("employee_id", data.employee_id)
      .eq("type", "izin");
    const usedDays = (allLeaves || []).reduce((s, l) => s + (Number(l.days) || 0), 0);
    await supabase.from("employees").update({ 
      used_leave_days: usedDays,
      remaining_leave_days: Math.max(0, 14 - usedDays)
    }).eq("id", data.employee_id);
  }

  return inserted as EmployeeTransaction;
}

export async function deleteEmployeeTransaction(id: string, employeeId: string): Promise<void> {
  const { data: item } = await supabase.from("employee_transactions").select("type").eq("id", id).single();
  await supabase.from("employee_transactions").delete().eq("id", id);

  if (item?.type === "avans") {
    const { data: allAdvances } = await supabase
      .from("employee_transactions")
      .select("amount")
      .eq("employee_id", employeeId)
      .eq("type", "avans");
    const totalAdv = (allAdvances || []).reduce((s, a) => s + (Number(a.amount) || 0), 0);
    await supabase.from("employees").update({ total_advances: totalAdv }).eq("id", employeeId);
  } else if (item?.type === "izin") {
    const { data: allLeaves } = await supabase
      .from("employee_transactions")
      .select("days")
      .eq("employee_id", employeeId)
      .eq("type", "izin");
    const usedDays = (allLeaves || []).reduce((s, l) => s + (Number(l.days) || 0), 0);
    await supabase.from("employees").update({ 
      used_leave_days: usedDays,
      remaining_leave_days: Math.max(0, 14 - usedDays)
    }).eq("id", employeeId);
  }
}

// ──────────────────── KİRALAR ────────────────────
export function parseRentNotes(rawNotes: string | null | undefined): { text: string; payments: RentPayment[] } {
  if (!rawNotes) return { text: "", payments: [] };
  try {
    if (rawNotes.startsWith("{") && rawNotes.includes('"payments"')) {
      const parsed = JSON.parse(rawNotes);
      return {
        text: parsed.text || "",
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      };
    }
  } catch {}
  return { text: rawNotes, payments: [] };
}

export function serializeRentNotes(text: string, payments: RentPayment[]): string {
  return JSON.stringify({
    text: text || "",
    payments: payments || [],
  });
}

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
    
    const formatted = (data || []).map((r: any) => {
      const { text, payments } = parseRentNotes(r.notes);
      return {
        ...r,
        notes: text,
        payments,
      } as Rent;
    });

    memFallback.rents = formatted;
    return formatted;
  } catch (err) {
    console.error("getRents catch:", err);
    return memFallback.rents as Rent[];
  }
}

export async function saveRent(
  data: Omit<Rent, "id" | "created_at"> & { id?: string }
): Promise<Rent> {
  const now = new Date().toISOString();
  // Mevcut payments varsa koru
  const currentPayments = data.payments || [];
  const serializedNotes = serializeRentNotes(data.notes || "", currentPayments);

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
        notes: serializedNotes,
        updated_at: now,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (!error && updated) {
      const { text, payments } = parseRentNotes(updated.notes);
      return { ...updated, notes: text, payments } as Rent;
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
      notes: serializedNotes,
      created_by_name: data.created_by_name || "Admin",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || "Kira kaydı kaydedilemedi");
  }
  const { text, payments } = parseRentNotes(inserted.notes);
  return { ...inserted, notes: text, payments } as Rent;
}

export async function deleteRent(id: string): Promise<void> {
  await supabase.from("rents").delete().eq("id", id);
}

export async function addRentPayment(
  rentId: string,
  paymentData: Omit<RentPayment, "id" | "created_at">
): Promise<Rent> {
  const { data: rent, error } = await supabase
    .from("rents")
    .select("*")
    .eq("id", rentId)
    .single();

  if (error || !rent) {
    throw new Error("Kira kaydı bulunamadı.");
  }

  const { text, payments } = parseRentNotes(rent.notes);
  const newPayment: RentPayment = {
    ...paymentData,
    id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    created_at: new Date().toISOString(),
  };

  const updatedPayments = [newPayment, ...payments];
  const newNotes = serializeRentNotes(text, updatedPayments);

  const { data: updated, error: updateErr } = await supabase
    .from("rents")
    .update({
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rentId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error("Parça ödeme kaydedilemedi.");
  }

  return { ...updated, notes: text, payments: updatedPayments } as Rent;
}

export async function deleteRentPayment(
  rentId: string,
  paymentId: string
): Promise<Rent> {
  const { data: rent, error } = await supabase
    .from("rents")
    .select("*")
    .eq("id", rentId)
    .single();

  if (error || !rent) {
    throw new Error("Kira kaydı bulunamadı.");
  }

  const { text, payments } = parseRentNotes(rent.notes);
  const updatedPayments = payments.filter((p) => p.id !== paymentId);
  const newNotes = serializeRentNotes(text, updatedPayments);

  const { data: updated, error: updateErr } = await supabase
    .from("rents")
    .update({
      notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rentId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error("Parça ödeme silinemedi.");
  }

  return { ...updated, notes: text, payments: updatedPayments } as Rent;
}
