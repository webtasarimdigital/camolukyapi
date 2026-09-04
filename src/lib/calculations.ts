// ============================================================
// TEKLIF / SATIŞ HESAP MOTORU — tek kaynak, server+client ortak
// Floating point yok, tüm değerler round(2) ile sabitlenir
// ============================================================

export interface LineItem {
  quantity: number;
  unit_price: number;
  discount_type?: "percent" | "fixed" | null;
  discount_value?: number | null;
}

export interface CalculatedLine {
  line_subtotal: number;    // qty * unit_price
  discount_amount: number;  // hesaplanan iskonto tutarı
  line_total: number;       // line_subtotal - discount_amount
}

export interface QuoteTotals {
  subtotal: number;               // Σ line_total
  line_discount_total: number;    // Σ discount_amount
  general_discount_amount: number;
  net_total: number;              // subtotal - general_discount_amount
  vat_total: number;
  grand_total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateLine(item: LineItem): CalculatedLine {
  const line_subtotal = round2(item.quantity * item.unit_price);
  let discount_amount = 0;

  if (item.discount_type === "percent" && item.discount_value) {
    discount_amount = round2(line_subtotal * item.discount_value / 100);
  } else if (item.discount_type === "fixed" && item.discount_value) {
    discount_amount = round2(Math.min(item.discount_value, line_subtotal));
  }

  return {
    line_subtotal,
    discount_amount,
    line_total: round2(line_subtotal - discount_amount),
  };
}

export function calculateTotals(
  lines: CalculatedLine[],
  vatRate: number,
  generalDiscountType?: "percent" | "fixed" | null,
  generalDiscountValue?: number | null
): QuoteTotals {
  const subtotal = round2(lines.reduce((s, l) => s + l.line_total, 0));
  const line_discount_total = round2(lines.reduce((s, l) => s + l.discount_amount, 0));

  let general_discount_amount = 0;
  if (generalDiscountType === "percent" && generalDiscountValue) {
    general_discount_amount = round2(subtotal * generalDiscountValue / 100);
  } else if (generalDiscountType === "fixed" && generalDiscountValue) {
    general_discount_amount = round2(Math.min(generalDiscountValue, subtotal));
  }

  const net_total = round2(subtotal - general_discount_amount);
  const vat_total = round2(net_total * vatRate / 100);
  const grand_total = round2(net_total + vat_total);

  return {
    subtotal,
    line_discount_total,
    general_discount_amount,
    net_total,
    vat_total,
    grand_total,
  };
}
