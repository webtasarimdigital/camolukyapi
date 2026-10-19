export interface Vehicle {
  id: string;
  company_id: string;
  plate: string;
  driver_name: string;
  driver_phone?: string | null;
  vehicle_type: string;
  status: "Depoda" | "Yolda" | "Teslim Etti" | "Bakımda";
  current_location?: string | null;
  destination?: string | null;
  cargo_notes?: string | null;
  inspection_date?: string | null;     // Muayene Tarihi
  insurance_date?: string | null;      // Trafik Sigortası Tarihi
  license_date?: string | null;        // Ruhsat / Kasko Sigorta Tarihi
  maintenance_date?: string | null;    // Son Bakım Tarihi
  maintenance_cost?: number;           // Bakım Masrafı (₺)
  fuel_cost?: number;                  // Yakıt Masrafı (₺)
  notes?: string | null;               // Araç / Bakım Notları
  last_updated_by?: string | null;
  last_updated_at: string;
  created_at: string;
}

export type ExpiryStatus = "expired" | "critical" | "warning" | "ok" | "none";

export interface ExpiryAlertInfo {
  status: ExpiryStatus;
  daysLeft: number;
  label: string;
  badgeClass: string;
  isUrgent: boolean;
}

export function getExpiryAlert(dateStr: string | null | undefined): ExpiryAlertInfo {
  if (!dateStr || !dateStr.trim()) {
    return {
      status: "none",
      daysLeft: 9999,
      label: "Belirtilmedi",
      badgeClass: "bg-neutral-100 text-neutral-500 border-neutral-200",
      isUrgent: false,
    };
  }

  const target = new Date(dateStr);
  if (isNaN(target.getTime())) {
    return {
      status: "none",
      daysLeft: 9999,
      label: "Geçersiz Tarih",
      badgeClass: "bg-neutral-100 text-neutral-500 border-neutral-200",
      isUrgent: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysPast = Math.abs(diffDays);
    return {
      status: "expired",
      daysLeft: diffDays,
      label: `Süresi ${daysPast} gün geçti!`,
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse",
      isUrgent: true,
    };
  }

  if (diffDays <= 7) {
    return {
      status: "critical",
      daysLeft: diffDays,
      label: diffDays === 0 ? "Bugün son gün!" : `${diffDays} gün kaldı (1 Hafta)`,
      badgeClass: "bg-red-100 text-red-700 border-red-300 font-bold",
      isUrgent: true,
    };
  }

  if (diffDays <= 30) {
    return {
      status: "warning",
      daysLeft: diffDays,
      label: `${diffDays} gün kaldı (1 Ay)`,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-semibold",
      isUrgent: false,
    };
  }

  const months = Math.round(diffDays / 30);
  return {
    status: "ok",
    daysLeft: diffDays,
    label: months <= 1 ? "1 ay var" : `${months} ay var`,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    isUrgent: false,
  };
}
