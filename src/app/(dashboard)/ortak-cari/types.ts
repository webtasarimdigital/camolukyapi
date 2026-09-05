export type PartnerMovementType =
  | "partner_to_company" // Ortağın Firmaya Borç Vermesi
  | "company_to_partner" // Firmanın Ortağa Borç Ödemesi / Avans
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
    key: "akaryakit",
    label: "Akaryakıt & Araç",
    icon: "Fuel",
    color: "amber",
    description: "Mazot, benzin, araç bakımı, lastik masrafları",
  },
  {
    key: "malzeme",
    label: "Acil Malzeme Alımı",
    icon: "Boxes",
    color: "blue",
    description: "Toptancıya nakit ödeme, seramik, yapıştırıcı, profil",
  },
  {
    key: "kira",
    label: "Kira & Fatura & Harç",
    icon: "Building2",
    color: "purple",
    description: "Dükkan/depo kirası, elektrik, su, resmi harçlar",
  },
  {
    key: "personel",
    label: "Usta & Personel & Nakliye",
    icon: "Users2",
    color: "indigo",
    description: "İşçilik, şantiye ustası, vinç, tır nakliyesi",
  },
  {
    key: "sermaye",
    label: "Kasa / Sermaye Takviyesi",
    icon: "Landmark",
    color: "emerald",
    description: "Kasaya nakit aktarımı, işletme sermayesi desteği",
  },
  {
    key: "sahsi_avans",
    label: "Şahsi Borç / Avans",
    icon: "Wallet",
    color: "rose",
    description: "Ortağın şahsi harcaması veya kasadan çektiği avans",
  },
  {
    key: "kar_dagitimi",
    label: "Bağımsız Kâr Dağıtımı",
    icon: "TrendingUp",
    color: "teal",
    description: "Dönem sonu ortaklar arası bağımsız kâr payı paylaşımı",
  },
  {
    key: "zarar_karsilama",
    label: "Zarar / Masraf Karşılama",
    icon: "TrendingDown",
    color: "orange",
    description: "Ortaklarca cepten karşılanan zarar veya masraf",
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
    description: "Belirtilmeyen diğer borç ve alacak hareketleri",
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
