export interface SaleItemInput {
  productId?: string | null;
  productCode?: string | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountType?: "percent" | "fixed" | null;
  discountValue?: number;
  discountAmount?: number;
  lineTotal: number;
  costPrice?: number;
}

export interface CreateSaleInput {
  customerId?: string | null;
  retailCustomerName?: string;
  saleDate?: string;
  items: SaleItemInput[];
  vatRate: number;
  subtotal: number;
  discountTotal: number;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  paidAmount: number;
  paymentMethod?: "nakit" | "havale_eft" | "kredi_karti" | "cek" | "diger";
  notes?: string;
  dueDate?: string | null;
}
