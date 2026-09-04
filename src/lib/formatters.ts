// Para formatları — TRY / tr-TR
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "₺0,00";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Tarih formatı — 24.06.2026
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// Miktar formatı (max 3 decimal, gereksiz sıfır yok)
export function formatQty(qty: number | null | undefined): string {
  if (qty == null) return "0";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(qty);
}

// Türkçe sayı string → number (3.870,00 → 3870)
export function parseTurkishNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  // Nokta binlik ayracı, virgül ondalık
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Para string input temizle
export function parseCurrencyInput(value: string): number {
  // ₺, boşluk, nokta (binlik), virgülü ondalık yap
  const cleaned = value
    .replace(/₺/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
