// Bu dosya "use server" ya da "use client" direktifi OLMADAN tanımlanmıştır.
// Hem server hem client tarafında güvenle import edilebilir.

export type UserRole =
  | "admin"
  | "muhasebe1"
  | "satis"
  | "depo"
  | "sofor"
  | "tali_bayi"
  | "bayi";

export const ROLE_DEFINITIONS: Record<
  UserRole,
  { label: string; description: string; defaultName: string }
> = {
  admin: {
    label: "👑 Yönetici (Admin / Çamoluk)",
    description: "Tüm sistem, finans, ortak cari, ayarlar ve operasyonlar açık",
    defaultName: "Çamoluk Yönetici",
  },
  muhasebe1: {
    label: "💼 Muhasebe 1",
    description: "Operasyonlar, teklif, satış, ödemeler açık; Personel, Kiralar, Finans ve Ortak Cari kapalı",
    defaultName: "Muhasebe 1 Personeli",
  },
  satis: {
    label: "💼 Satış Temsilcisi",
    description: "Teklif, Satış, Sevkiyat, Müşteriler ve Ürünler açık (Silme yetkisi yok)",
    defaultName: "Satış Temsilcisi",
  },
  depo: {
    label: "📦 Depo Sorumlusu",
    description: "Depo Takip (Giriş/Çıkış, Teslimat, Kırıklar) ve Sevkiyat & Yükleme",
    defaultName: "Depo Sorumlusu",
  },
  sofor: {
    label: "🚚 Şoför",
    description: "Yalnızca Sevkiyat ve Yükleme modülü (Görüntüleme)",
    defaultName: "Şoför",
  },
  tali_bayi: {
    label: "🏪 Tali Bayi",
    description: "Sipariş Oluşturma, Sipariş Takibi, Ürünler / Stok ve Portallar",
    defaultName: "Tali Bayi",
  },
  bayi: {
    label: "🏪 Tali Bayi",
    description: "Sipariş Oluşturma, Sipariş Takibi, Ürünler / Stok ve Portallar",
    defaultName: "Tali Bayi",
  },
};

/**
 * Kullanıcı adını Türkçe karakterlerden arındırıp temiz bir ASCII slug üretir.
 * Örn: "sırrı" -> "sirri", "şoför ali" -> "soforali", "Sırrı123" -> "sirri123"
 */
export function slugifyUsername(input: string): string {
  if (!input) return "";
  let s = input.trim().toLowerCase();

  // Eğer kullanıcı tam e-posta yazdıysa (@ öncesini al)
  if (s.includes("@")) {
    s = s.split("@")[0].trim();
  }

  // Türkçe karakter dönüşümleri
  const turkishCharMap: Record<string, string> = {
    ş: "s",
    Ş: "s",
    ı: "i",
    I: "i",
    İ: "i",
    i: "i",
    ğ: "g",
    Ğ: "g",
    ü: "u",
    Ü: "u",
    ö: "o",
    Ö: "o",
    ç: "c",
    Ç: "c",
  };

  s = s.replace(/[şŞıIİiğĞüÜöÖçÇ]/g, (char) => turkishCharMap[char] || char);

  // Boşlukları ve alfanümerik olmayan harfleri temizle
  s = s.replace(/[^a-z0-9_-]/g, "");

  return s;
}

/**
 * Kullanıcı adını Supabase Auth'un hatasız kabul edeceği geçerli bir e-postaya çevirir.
 * Kullanıcı "sırrı" girdiğinde "sirri@camolukyapi.com" üretir.
 */
export function usernameToAuthEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  // Eğer özel bir harici e-posta ise (örn: ahmet@gmail.com)
  if (trimmed.includes("@") && !trimmed.endsWith("@camolukyapi.com")) {
    const [local, domain] = trimmed.split("@");
    const cleanLocal = slugifyUsername(local);
    return `${cleanLocal}@${domain}`;
  }

  const cleanSlug = slugifyUsername(trimmed);
  return `${cleanSlug || "kullanici"}@camolukyapi.com`;
}
