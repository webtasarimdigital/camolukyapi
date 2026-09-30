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
  last_updated_by?: string | null;
  last_updated_at: string;
  created_at: string;
}
