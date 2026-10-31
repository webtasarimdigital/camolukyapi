/**
 * Müşteri notları veya alanlarından Plasiyer, Hesap Kodu, Sabit Hat çözümleme yardımcıları
 */

export function extractPlasiyer(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Plasiyer:\s*([^|\]\n\r]+)/i);
  if (!match || !match[1]) return null;
  let p = match[1].trim();
  p = p.replace(/[\]]+$/, '').trim();
  return p || null;
}

export function extractAccountCode(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Hesap\s*Kodu:\s*([^|\]\n\r]+)/i);
  return match && match[1] ? match[1].trim() : null;
}

export function extractLandline(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Sabit\s*Hat:\s*([^|\]\n\r]+)/i);
  return match && match[1] ? match[1].trim() : null;
}

export const KNOWN_PLASIYERS = [
  "AHMET D-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "BATUHAN-[PERAKENDE SATIŞ]",
  "BÜLENT-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "EMRAH G-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "FIRAT B-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "İSMAİL-[PERAKENDE SATIŞ]",
  "MAHSUN B-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "MUHAMMET-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "ONUR G-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "ÖMER-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "ŞABAN-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "ŞEREF Y-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
  "YASİN-[TOPTAN SATIŞ MÜŞTERİ TEMSİLCİLERİ]",
];
