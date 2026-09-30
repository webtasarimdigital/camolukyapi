import fs from "fs";
import path from "path";
export * from "./types";
import {
  Shipment,
  PaymentFollowup,
  Transporter,
  Employee,
  Rent,
  calculateDueDate12,
} from "./types";

// In-memory cache ensures that even if filesystem is read-only or ephemeral (Vercel),
// operations will NEVER crash and state updates persist within the runtime container.
const memoryStore: Record<string, any[]> = {};

const IS_VERCEL = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const DATA_DIR = IS_VERCEL
  ? path.join("/tmp", "camolukyapi_data")
  : path.join(process.cwd(), "data");

function ensureDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // ignore — read-only fs
  }
}

function readJson<T>(fileName: string, defaultData: T[] = []): T[] {
  // If we already have it in memory, return memory version
  if (memoryStore[fileName]) {
    return memoryStore[fileName] as T[];
  }

  try {
    ensureDir();
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf8");
      } catch {
        // ignore
      }
      memoryStore[fileName] = [...defaultData];
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as T[];
    memoryStore[fileName] = parsed;
    return parsed;
  } catch {
    memoryStore[fileName] = [...defaultData];
    return defaultData;
  }
}

function writeJson<T>(fileName: string, data: T[]) {
  // Always update memory store immediately
  memoryStore[fileName] = data;
  try {
    ensureDir();
    const filePath = path.join(DATA_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // ignore — memoryStore already updated
  }
}

// ──────────────────── SEVKİYAT ────────────────────
export function getShipments(): Shipment[] {
  return readJson<Shipment>("shipments.json", [
    {
      id: "sh-1",
      customer_name: "Yılmaz İnşaat Ltd.",
      seller: "Ahmet Duvarbaşı",
      destination: "Ataşehir Şantiye Sahası",
      receipt_no: "SEV-2026-001",
      is_official: "Resmi",
      m2: 340.5,
      pallet_count: 8,
      preparation_notes: "Kütahya Seramik 60x120 paletli sevk",
      status: "Sevkiyata Çıktı",
      created_by_name: "Sevkiyat Sorumlusu",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "sh-2",
      customer_name: "Kaya Mimarlık",
      seller: "Ahmet Duvarbaşı",
      destination: "Kadıköy Depo Teslim",
      receipt_no: "SEV-2026-002",
      is_official: "Gayriresmi",
      m2: 120,
      pallet_count: 3,
      preparation_notes: "Derz ve yapıştırıcılar dahil",
      status: "Depoya Gitti",
      created_by_name: "Çamoluk Yapı Admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);
}

export function saveShipment(data: Omit<Shipment, "id" | "created_at" | "updated_at"> & { id?: string }): Shipment {
  const list = getShipments();
  const now = new Date().toISOString();
  if (data.id) {
    const idx = list.findIndex(item => item.id === data.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data, updated_at: now };
      writeJson("shipments.json", list);
      return list[idx];
    }
  }
  const newShipment: Shipment = {
    ...data,
    id: "sh-" + Date.now(),
    created_at: now,
    updated_at: now,
  };
  list.unshift(newShipment);
  writeJson("shipments.json", list);
  return newShipment;
}

export function updateShipmentStatus(id: string, status: Shipment["status"]): Shipment | null {
  const list = getShipments();
  const item = list.find(s => s.id === id);
  if (!item) return null;
  item.status = status;
  item.updated_at = new Date().toISOString();
  writeJson("shipments.json", list);
  return item;
}

export function deleteShipment(id: string) {
  const list = getShipments().filter(s => s.id !== id);
  writeJson("shipments.json", list);
}

// ──────────────────── ÖDEME TAKİBİ & VADELER ────────────────────
export function getPaymentFollowups(): PaymentFollowup[] {
  return readJson<PaymentFollowup>("payment_followups.json", [
    {
      id: "pf-1",
      type: "alacak",
      contact_date: "2026-09-15",
      contact_name: "İnvest İnşaat A.Ş.",
      description: "Teklif ve seramik teslimatı 1. hakediş",
      personnel: "Ahmet Bey",
      payment_method: "Havale/EFT",
      due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      total_amount: 30000,
      paid_amount: 20000,
      status: "Kısmi Ödendi",
      notes: "Kalan 10.000 TL için teyit alındı",
      created_by_name: "Muhasebe 1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "pf-2",
      type: "borc",
      contact_date: "2026-09-10",
      contact_name: "KYK Yapı Kimyasalları",
      description: "Harç ve derz dolgu fatura bedeli",
      personnel: "Mehmet Bey",
      payment_method: "Çek",
      due_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      total_amount: 15500,
      paid_amount: 0,
      status: "Bekliyor",
      notes: "Vadesi dündü, kontrol edilecek",
      created_by_name: "Çamoluk Yapı Admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ]);
}

export function savePaymentFollowup(data: Omit<PaymentFollowup, "id" | "created_at" | "updated_at"> & { id?: string }): PaymentFollowup {
  const list = getPaymentFollowups();
  const now = new Date().toISOString();
  if (data.id) {
    const idx = list.findIndex(item => item.id === data.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data, updated_at: now };
      writeJson("payment_followups.json", list);
      return list[idx];
    }
  }
  const newItem: PaymentFollowup = {
    ...data,
    id: "pf-" + Date.now(),
    created_at: now,
    updated_at: now,
  };
  list.unshift(newItem);
  writeJson("payment_followups.json", list);
  return newItem;
}

export function deletePaymentFollowup(id: string) {
  const list = getPaymentFollowups().filter(s => s.id !== id);
  writeJson("payment_followups.json", list);
}

// ──────────────────── NAKLİYELER (12 GÜN KURALI) ────────────────────

export function getTransporters(): Transporter[] {
  return readJson<Transporter>("transporters.json", [
    {
      id: "tr-1",
      transporter_name: "Yıldız Nakliyat / Ali Usta",
      transport_date: new Date(Date.now() - 13 * 86400000).toISOString().split("T")[0],
      amount: 4500,
      iban: "TR12 0006 2000 0001 2345 6789 01",
      status: "Ödenmedi",
      due_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      notes: "Maslak şantiye sevkiyatı nakliyesi",
      created_by_name: "Sevkiyat Sorumlusu",
      created_at: new Date().toISOString(),
    },
    {
      id: "tr-2",
      transporter_name: "Özdemir Kamyonet",
      transport_date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
      amount: 2200,
      iban: "TR56 0006 2000 0001 9876 5432 10",
      status: "Ödendi",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      notes: "Üsküdar içi palet transferi",
      created_by_name: "Çamoluk Yapı Admin",
      created_at: new Date().toISOString(),
    }
  ]);
}

export function saveTransporter(data: Omit<Transporter, "id" | "due_date" | "created_at"> & { id?: string }): Transporter {
  const list = getTransporters();
  const dueDate = calculateDueDate12(data.transport_date);
  if (data.id) {
    const idx = list.findIndex(item => item.id === data.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data, due_date: dueDate };
      writeJson("transporters.json", list);
      return list[idx];
    }
  }
  const newItem: Transporter = {
    ...data,
    id: "tr-" + Date.now(),
    due_date: dueDate,
    created_at: new Date().toISOString(),
  };
  list.unshift(newItem);
  writeJson("transporters.json", list);
  return newItem;
}

export function deleteTransporter(id: string) {
  const list = getTransporters().filter(s => s.id !== id);
  writeJson("transporters.json", list);
}

// ──────────────────── PERSONEL ────────────────────
export function getEmployees(): Employee[] {
  return readJson<Employee>("employees.json", [
    {
      id: "emp-1",
      full_name: "Ahmet Duvarbaşı",
      phone: "0555 997 29 14",
      position: "Satış Müdürü",
      start_date: "2023-01-15",
      salary: 55000,
      total_advances: 5000,
      used_leave_days: 6,
      remaining_leave_days: 14,
      notes: "Satış ve teklif operasyonları sorumlusu",
      created_by_name: "Çamoluk Yapı Admin",
      created_at: new Date().toISOString(),
    },
    {
      id: "emp-2",
      full_name: "Mehmet Kaya",
      phone: "0532 123 45 67",
      position: "Sevkiyat ve Depo Şefi",
      start_date: "2023-06-01",
      salary: 42000,
      total_advances: 0,
      used_leave_days: 4,
      remaining_leave_days: 16,
      notes: "Depo stok ve araç sevkiyat sorumlusu",
      created_by_name: "Çamoluk Yapı Admin",
      created_at: new Date().toISOString(),
    }
  ]);
}

export function saveEmployee(data: Omit<Employee, "id" | "created_at"> & { id?: string }): Employee {
  const list = getEmployees();
  if (data.id) {
    const idx = list.findIndex(item => item.id === data.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      writeJson("employees.json", list);
      return list[idx];
    }
  }
  const newItem: Employee = {
    ...data,
    id: "emp-" + Date.now(),
    created_at: new Date().toISOString(),
  };
  list.unshift(newItem);
  writeJson("employees.json", list);
  return newItem;
}

export function deleteEmployee(id: string) {
  const list = getEmployees().filter(s => s.id !== id);
  writeJson("employees.json", list);
}

// ──────────────────── KİRALAR ────────────────────
export function getRents(): Rent[] {
  return readJson<Rent>("rents.json", [
    {
      id: "rent-1",
      type: "toplanan",
      title: "Libadiye Cad. Zemin Dükkan 2",
      counterpart_name: "Kardeşler Eczanesi",
      amount: 35000,
      payment_day: 5,
      payment_method: "Banka",
      status: "Ödendi",
      notes: "Her ayın 5'inde düzenli EFT",
      created_by_name: "Çamoluk Yapı Admin",
      created_at: new Date().toISOString(),
    },
    {
      id: "rent-2",
      type: "verilen",
      title: "Çamlıca Ana Depo & Sevkiyat Sahası",
      counterpart_name: "Hasan Bey (Mülk Sahibi)",
      amount: 45000,
      payment_day: 15,
      payment_method: "Banka",
      status: "Bekliyor",
      notes: "Depo kira ödemesi",
      created_by_name: "Çamoluk Yapı Admin",
      created_at: new Date().toISOString(),
    }
  ]);
}

export function saveRent(data: Omit<Rent, "id" | "created_at"> & { id?: string }): Rent {
  const list = getRents();
  if (data.id) {
    const idx = list.findIndex(item => item.id === data.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      writeJson("rents.json", list);
      return list[idx];
    }
  }
  const newItem: Rent = {
    ...data,
    id: "rent-" + Date.now(),
    created_at: new Date().toISOString(),
  };
  list.unshift(newItem);
  writeJson("rents.json", list);
  return newItem;
}

export function deleteRent(id: string) {
  const list = getRents().filter(s => s.id !== id);
  writeJson("rents.json", list);
}
