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

function safeNum(n: unknown): number {
  const val = Number(n);
  return isNaN(val) || !isFinite(val) ? 0 : val;
}

function round2(n: number): number {
  const safe = safeNum(n);
  return Math.round(safe * 100) / 100;
}

export function calculateLine(item: LineItem): CalculatedLine {
  const qty = safeNum(item.quantity);
  const price = safeNum(item.unit_price);
  const line_subtotal = round2(qty * price);
  let discount_amount = 0;

  const discVal = safeNum(item.discount_value);
  if (item.discount_type === "percent" && discVal > 0) {
    discount_amount = round2((line_subtotal * discVal) / 100);
  } else if (item.discount_type === "fixed" && discVal > 0) {
    discount_amount = round2(Math.min(discVal, line_subtotal));
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
  const validLines = Array.isArray(lines) ? lines : [];
  const subtotal = round2(validLines.reduce((s, l) => s + safeNum(l?.line_total), 0));
  const line_discount_total = round2(validLines.reduce((s, l) => s + safeNum(l?.discount_amount), 0));

  let general_discount_amount = 0;
  const genDiscVal = safeNum(generalDiscountValue);
  if (generalDiscountType === "percent" && genDiscVal > 0) {
    general_discount_amount = round2((subtotal * genDiscVal) / 100);
  } else if (generalDiscountType === "fixed" && genDiscVal > 0) {
    general_discount_amount = round2(Math.min(genDiscVal, subtotal));
  }

  const net_total = round2(subtotal - general_discount_amount);
  const safeVatRate = safeNum(vatRate);
  const vat_total = round2((net_total * safeVatRate) / 100);
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
