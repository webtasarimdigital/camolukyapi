export interface CustomerImportRow {
  type: "bireysel" | "kurumsal";
  company_name?: string | null;
  contact_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_office?: string | null;
  tax_number?: string | null;
  notes?: string | null;
}
