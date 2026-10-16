export interface CompanyPortal {
  id: string;
  company_id?: string;
  title: string;
  category: "B2B Tedarikçi" | "E-Dönüşüm / Fatura" | "Filo / GPS" | "Banka" | "Resmi Kurum" | "Diğer";
  url: string;
  username?: string | null;
  password?: string | null;
  notes?: string | null;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
}
