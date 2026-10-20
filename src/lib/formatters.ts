// Para formatları — TRY / tr-TR
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
    return "₺0,00";
  }
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

// Miktar formatı (max 6 decimal, tüm ondalıkları korur, gereksiz sıfır eklemez)
export function formatQty(qty: number | null | undefined): string {
  if (qty == null) return "0";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(qty);
}

// Türkçe ve uluslararası sayı formatlarını (3.870,00, 4359,32905, 4359.32905, 103000) bozmadan number'a çevirir
export function parseTurkishNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") {
    return isNaN(value) || !isFinite(value) ? 0 : parseFloat(value.toFixed(6));
  }

  const raw = String(value).trim();
  if (!raw) return 0;

  let cleaned = raw.replace(/[₺$€\s]/g, "");

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) {
      // 1,234.56 -> virgül binlik, nokta ondalık
      cleaned = cleaned.replace(/,/g, "");
    } else {
      // 1.234,56 veya 4.359,32905 -> nokta binlik, virgül ondalık
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastComma !== -1) {
    // Sadece virgül var: 4359,32905 veya 1960,56 -> virgül ondalık
    cleaned = cleaned.replace(",", ".");
  } else if (lastDot !== -1) {
    const parts = cleaned.split(".");
    if (parts.length === 2) {
      // Tek nokta var. Eğer sağındaki 3 hane değilse kesinlikle ondalıktır (örn: 1960.56, 4359.32905)
      if (parts[1].length !== 3) {
        // ondalık nokta, olduğu gibi bırak
      } else {
        // Tam 3 hane (örn: 103.000) binlik ayıracı
        cleaned = cleaned.replace(".", "");
      }
    } else {
      // Birden fazla nokta: 1.000.000 -> binlik ayıracı
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : parseFloat(num.toFixed(6));
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
