export interface Shipment {
  id: string;
  customer_name: string;
  seller: string;
  destination: string;
  receipt_no: string;
  is_official: "Resmi" | "Gayriresmi";
  m2: number;
  pallet_count: number;
  preparation_notes: string;
  status: "Depoya Gitti" | "Sevkiyata Çıktı" | "Teslim Edildi";
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentFollowup {
  id: string;
  type: "alacak" | "borc"; // Toplanacak vs Yapılacak
  contact_date: string; // Görüşme Tarihi
  contact_name: string; // Müşteri / Tedarikçi Adı
  description: string;
  personnel: string;
  payment_method: "Nakit" | "Kredi Kartı" | "Havale/EFT" | "Çek" | "Senet";
  due_date: string; // Ödeyeceği Tarih (Vade)
  total_amount: number;
  paid_amount: number;
  status: "Bekliyor" | "Kısmi Ödendi" | "Ödendi" | "Ertelendi";
  notes: string; // Durum / Not
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Transporter {
  id: string;
  transporter_name: string;
  transport_date: string;
  amount: number;
  iban: string;
  status: "Ödendi" | "Ödenmedi";
  notes?: string;
  due_date: string; // transport_date + 12 days
  created_by_name: string;
  created_at: string;
}

export interface Employee {
  id: string;
  full_name: string;
  phone: string;
  position: string;
  start_date: string;
  salary: number;
  total_advances: number;
  used_leave_days: number;
  remaining_leave_days: number;
  notes: string;
  created_by_name: string;
  created_at: string;
}

export interface Rent {
  id: string;
  type: "toplanan" | "verilen"; // Toplanan (Gelir) vs Verilen (Gider)
  title: string; // Mülk / Dükkan Adı
  counterpart_name: string; // Kiracı veya Mülk Sahibi
  amount: number;
  payment_day: number; // Ayın kaçı
  payment_method: string;
  status: "Ödendi" | "Bekliyor" | "Gecikmede";
  notes?: string;
  created_by_name: string;
  created_at: string;
}

/**
 * 12 Gün Kuralı Hesaplayıcı (Nakliyeler için)
 * Saf fonksiyon - fs veya Node bağımlılığı yoktur.
 */
export function calculateDueDate12(transportDate: string): string {
  try {
    const d = new Date(transportDate);
    if (isNaN(d.getTime())) return transportDate;
    d.setDate(d.getDate() + 12);
    return d.toISOString().split("T")[0];
  } catch {
    return transportDate;
  }
}
