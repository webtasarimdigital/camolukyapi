export type PartnerMovementType =
  | "partner_to_company" // Firmaya Verdiği (Ortağın Firmaya Borç / Sermaye Vermesi)
  | "company_to_partner" // Firmadan Aldığı (Firmanın Ortağa Avans / Borç Vermesi)
  | "sahsi_gelir"        // Şahsi Gelir & Kâr (Kira geliri, kâr payı, hak ediş vb.)
  | "partner_to_partner" // Ortaklar Arası Şahsi Borç (Ahmet ↔ Mehmet)
  | "profit_distribution" // Bağımsız Kâr Payı Dağıtımı
  | "loss_coverage"; // Bağımsız Zarar / Sermaye Karşılama

export interface MovementCategoryDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const MOVEMENT_CATEGORIES: MovementCategoryDef[] = [
  {
    key: "kira",
    label: "Kira Geliri (Dükkan / Mülk)",
    icon: "Building2",
    color: "purple",
    description: "Mülklerden veya dükkandan gelen kira ödemesi",
  },
  {
    key: "kar_dagitimi",
    label: "Şahsi Kâr Payı & Hak Ediş",
    icon: "TrendingUp",
    color: "teal",
    description: "Dönem kârından veya projeden ortaklara düşen kâr payı",
  },
  {
    key: "sermaye",
    label: "Kasa / Sermaye Takviyesi",
    icon: "Landmark",
    color: "emerald",
    description: "Kasaya nakit aktarımı, işletme sermayesi desteği",
  },
  {
    key: "malzeme",
    label: "Acil Malzeme Alımı",
    icon: "Boxes",
    color: "blue",
    description: "Toptancıya nakit ödeme, seramik, yapıştırıcı, profil",
  },
  {
    key: "akaryakit",
    label: "Akaryakıt & Araç",
    icon: "Fuel",
    color: "amber",
    description: "Mazot, benzin, araç bakımı, lastik masrafları",
  },
  {
    key: "sahsi_avans",
    label: "Şahsi Çekim / Avans",
    icon: "Wallet",
    color: "rose",
    description: "Ortağın şahsi harcaması veya kasadan çektiği avans",
  },
  {
    key: "personel",
    label: "Usta & Personel & Nakliye",
    icon: "Users2",
    color: "indigo",
    description: "İşçilik, şantiye ustası, vinç, tır nakliyesi",
  },
  {
    key: "ortaklar_arasi",
    label: "Ortaklar Arası Şahsi Borç",
    icon: "Handshake",
    color: "cyan",
    description: "Ahmet ve Mehmet'in kendi aralarında borç alıp vermesi",
  },
  {
    key: "diger",
    label: "Diğer / Özel Sebep",
    icon: "FileText",
    color: "gray",
    description: "Belirtilmeyen diğer gelir, borç ve alacak hareketleri",
  },
];

export interface PartnerNote {
  id: string;
  company_id: string;
  partner_id?: string | null;
  partner_name?: string;
  title: string;
  content: string;
  amount?: number | null;
  due_date?: string | null;
  priority: "normal" | "urgent" | "financial";
  is_completed: boolean;
  created_at: string;
  created_by?: string | null;
}
