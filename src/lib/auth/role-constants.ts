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
    description: "Yalnızca Sevkiyat ve Yükleme modülü (Görüntüleme)",
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
