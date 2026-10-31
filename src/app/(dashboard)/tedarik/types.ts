export type ProcurementStatus = "bekliyor" | "siparis_verildi" | "tedarik_edildi" | "iptal";

export interface ProcurementRecord {
  id: string; // row id in camlica_firca_rows
  company_id: string;
  _module: "tedarik";
  sale_id: string;
  sale_code: string;
  sale_item_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  product_id?: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit: string;
  supplier_name: string;
  status: ProcurementStatus;
  notes?: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsolidatedPendingProduct {
  product_name: string;
  product_code?: string;
  unit: string;
  total_pending_quantity: number;
  orders: Array<{
    procurement_id: string;
    sale_id: string;
    sale_code: string;
    customer_name: string;
    quantity: number;
    unit: string;
    supplier_name: string;
    status: ProcurementStatus;
    created_by_name?: string;
    created_at: string;
  }>;
}

export interface NewProcurementItemInput {
  sale_id: string;
  sale_code: string;
  sale_item_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  product_id?: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface CreateManualProcurementInput {
  customer_name: string;
  customer_phone?: string;
  customer_id?: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit: string;
  supplier_name?: string;
  status?: ProcurementStatus;
  notes?: string;
}

export interface CustomerOption {
  id: string;
  company_name: string;
  contact_name?: string | null;
  phone?: string | null;
}
