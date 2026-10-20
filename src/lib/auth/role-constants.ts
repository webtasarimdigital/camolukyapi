// Bu dosya "use server" ya da "use client" direktifi OLMADAN tanımlanmıştır.
// Hem server hem client tarafında güvenle import edilebilir.

export type UserRole =
  | "admin"
  | "muhasebe1"
  | "muhasebe2"
  | "sevkiyat"
  | "depo"
  | "sofor"
  | "satis"
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
    description: "Operasyonlar, teklif, satış, ödemeler açık; Finans ve Ortak Cari kapalı",
    defaultName: "Muhasebe 1 Personeli",
  },
  muhasebe2: {
    label: "📊 Muhasebe 2",
    description: "Finans ve Ortak Cari dahil tüm finansal modüller açık",
    defaultName: "Muhasebe 2 Personeli",
  },
  sevkiyat: {
    label: "🚚 Sevkiyat Görevlisi",
    description: "Sevkiyat, Otobil GPS ve Ürünler / Stok modülleri açık",
    defaultName: "Sevkiyat Sorumlusu",
  },
  depo: {
    label: "📦 Depo Sorumlusu",
    description: "Yalnızca Sevkiyat ve Yükleme modülü (Görüntüleme)",
    defaultName: "Depo Sorumlusu",
  },
  sofor: {
    label: "🚚 Şoför",
    description: "Yalnızca Sevkiyat ve Yükleme modülü (Görüntüleme)",
    defaultName: "Şoför",
  },
  satis: {
    label: "💼 Satış Temsilcisi",
    description: "Teklif, Satış, Sevkiyat, Müşteriler ve Ürünler açık",
    defaultName: "Satış Temsilcisi",
  },
  tali_bayi: {
    label: "🏪 Tali Bayi",
    description: "Yalnızca Ürünler / Stok ve Şirket Portalları (Görüntüleme)",
    defaultName: "Tali Bayi",
  },
  bayi: {
    label: "🏪 Tali Bayi",
    description: "Yalnızca Ürünler / Stok ve Şirket Portalları (Görüntüleme)",
    defaultName: "Tali Bayi",
  },
};
