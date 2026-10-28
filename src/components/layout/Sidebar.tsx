"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  Truck,
  FileSpreadsheet,
  Users,
  FileText,
  FilePlus,
  ClipboardList,
  ShoppingCart,
  PlusCircle,
  ReceiptText,
  CalendarClock,
  Navigation,
  Wallet,
  Handshake,
  Building2,
  UserCheck,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Globe,
  ShoppingBag,
  Store,
  Landmark,
  Receipt,
  Coins,
  Paintbrush,
  PackageCheck,
} from "lucide-react";

import { type UserRole } from "@/lib/auth/role-constants";

interface NavSubItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
}

interface NavItem {
  id?: string;
  href?: string;
  label: string;
  icon: any;
  badge?: string;
  allowedRoles: UserRole[];
  subItems?: NavSubItem[];
}

const navItems: NavItem[] = [
  // Çamlıca Fırça Özel Sayfa (Sol En Üstte)
  {
    href: "/camlica-firca",
    label: "Çamlıca Fırça",
    icon: Paintbrush,
    badge: "Özel",
    allowedRoles: ["admin", "muhasebe1"],
  },
  // Tali Bayi Özel Sipariş Menüsü (En Üstte)
  {
    href: "/bayi-siparis/yeni",
    label: "Sipariş Oluştur",
    icon: ShoppingBag,
    badge: "Sipariş",
    allowedRoles: ["tali_bayi", "bayi"],
  },
  {
    href: "/bayi-siparis",
    label: "Siparişlerim",
    icon: ClipboardList,
    allowedRoles: ["tali_bayi", "bayi"],
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "muhasebe1"],
  },
  {
    href: "/sevkiyat",
    label: "Sevkiyat & Yükleme",
    icon: Truck,
    badge: "Canlı",
    allowedRoles: ["admin", "muhasebe1", "depo", "sofor", "satis"],
  },
  {
    href: "/depo-takip",
    label: "Depo Takip",
    icon: PackageCheck,
    badge: "Depo",
    allowedRoles: ["admin", "muhasebe1", "satis", "depo"],
  },
  {
    href: "/otobil-gps",
    label: "Araç & Filo Takip",
    icon: Truck,
    badge: "Filo",
    allowedRoles: ["admin", "muhasebe1", "sofor"],
  },
  {
    href: "/portallar",
    label: "Şirket Portalları",
    icon: Globe,
    badge: "B2B",
    allowedRoles: ["admin", "muhasebe1", "tali_bayi", "bayi"],
  },
  {
    href: "/urunler",
    label: "Ürünler & Stok",
    icon: Package,
    allowedRoles: ["admin", "muhasebe1", "satis", "tali_bayi", "bayi"],
  },
  {
    href: "/import",
    label: "Excel & PDF İçe Aktar",
    icon: FileSpreadsheet,
    allowedRoles: ["admin", "muhasebe1"],
  },
  {
    href: "/musteriler",
    label: "Müşteriler",
    icon: Users,
    allowedRoles: ["admin", "muhasebe1", "satis"],
  },
  {
    href: "/bayi-siparisleri",
    label: "Bayi Siparişleri",
    icon: Store,
    badge: "Bayi",
    allowedRoles: ["admin", "muhasebe1", "satis"],
  },
  {
    id: "teklif",
    label: "Teklif",
    icon: FileText,
    allowedRoles: ["admin", "muhasebe1", "satis"],
    subItems: [
      {
        href: "/teklif/yeni",
        label: "Teklif Oluştur",
        icon: FilePlus,
      },
      {
        href: "/teklifler",
        label: "Teklifler",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "satis",
    label: "Satış",
    icon: ShoppingCart,
    allowedRoles: ["admin", "muhasebe1", "satis"],
    subItems: [
      {
        href: "/satis/yeni",
        label: "Satış Oluştur",
        icon: PlusCircle,
      },
      {
        href: "/satislar",
        label: "Satışlar",
        icon: ReceiptText,
      },
    ],
  },
  {
    href: "/odemeler",
    label: "Ödeme & Vadeler",
    icon: CalendarClock,
    badge: "Vade",
    allowedRoles: ["admin", "muhasebe1"],
  },
  {
    href: "/nakliyeler",
    label: "Nakliyeler (12 Gün)",
    icon: Navigation,
    allowedRoles: ["admin", "muhasebe1"],
  },
  {
    id: "finans",
    label: "Finans & Analiz",
    icon: Wallet,
    allowedRoles: ["admin"],
    subItems: [
      {
        href: "/finans",
        label: "Genel Finans Özeti",
        icon: BarChart3,
      },
      {
        href: "/kiralar",
        label: "Kiralar (Gelir/Gider)",
        icon: Building2,
      },
      {
        href: "/finans/bankalar",
        label: "Bankalar & Krediler",
        icon: Landmark,
      },
      {
        href: "/finans/cekler",
        label: "Çekler",
        icon: Receipt,
      },
      {
        href: "/finans/vergi-ssk",
        label: "Vergi ve SSK",
        icon: FileSpreadsheet,
      },
      {
        href: "/finans/gunluk-giderler",
        label: "Günlük Giderler",
        icon: Coins,
      },
    ],
  },
  {
    href: "/ortak-cari",
    label: "Ortak Finans (Cari)",
    icon: Handshake,
    allowedRoles: ["admin"],
  },
  {
    href: "/personel",
    label: "Personel & İzinler",
    icon: UserCheck,
    allowedRoles: ["admin"],
  },
  {
    href: "/raporlar",
    label: "Raporlar",
    icon: BarChart3,
    allowedRoles: ["admin"],
  },
  {
    href: "/kullanicilar",
    label: "Kullanıcılar",
    icon: UserCog,
    allowedRoles: ["admin"],
  },
  {
    href: "/ayarlar",
    label: "Ayarlar",
    icon: Settings,
    allowedRoles: ["admin"],
  },
];

interface SidebarProps {
  userRole?: string;
  onCloseMobile?: () => void;
}

export function Sidebar({ userRole = "admin", onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const roleKey = (userRole as UserRole) || "admin";

  const isTeklifPath = pathname.startsWith("/teklif");
  const isSatisPath = pathname.startsWith("/satis");
  const isFinansPath =
    pathname.startsWith("/finans") || pathname.startsWith("/kiralar");

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    teklif: isTeklifPath,
    satis: isSatisPath,
    finans: isFinansPath,
  });

  useEffect(() => {
    if (isTeklifPath) {
      setOpenDropdowns((prev) => ({ ...prev, teklif: true }));
    }
    if (isSatisPath) {
      setOpenDropdowns((prev) => ({ ...prev, satis: true }));
    }
    if (isFinansPath) {
      setOpenDropdowns((prev) => ({ ...prev, finans: true }));
    }
  }, [pathname, isTeklifPath, isSatisPath, isFinansPath]);

  function toggleDropdown(key: string) {
    setOpenDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const visibleItems = navItems.filter((item) =>
    item.allowedRoles.includes(roleKey)
  );

  const homeHref =
    roleKey === "depo"
      ? "/depo-takip"
      : roleKey === "sofor"
      ? "/sevkiyat"
      : roleKey === "satis"
      ? "/teklifler"
      : roleKey === "tali_bayi" || (roleKey as string) === "bayi"
      ? "/bayi-siparis/yeni"
      : "/dashboard";

  const roleBadgeMap: Record<string, string> = {
    admin: "👑 Yönetici",
    muhasebe1: "💼 Muhasebe 1",
    satis: "💼 Satış",
    depo: "📦 Depo Sorumlusu",
    sofor: "🚚 Şoför",
    tali_bayi: "🏪 Tali Bayi",
    bayi: "🏪 Tali Bayi",
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href?: string) {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function isSubItemActive(href: string) {
    if (href === "/teklif/yeni") return pathname === "/teklif/yeni";
    if (href === "/teklifler") {
      return (
        pathname.startsWith("/teklifler") ||
        (pathname.startsWith("/teklif/") && pathname !== "/teklif/yeni")
      );
    }
    if (href === "/satis/yeni") return pathname === "/satis/yeni";
    if (href === "/satislar") {
      return (
        pathname.startsWith("/satislar") ||
        (pathname.startsWith("/satis/") && pathname !== "/satis/yeni")
      );
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-brand-navy flex flex-col h-full select-none">
      {/* Logo Header */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <Link
          href={homeHref}
          onClick={onCloseMobile}
          className="flex items-center justify-center flex-1"
        >
          <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm">
            <Image
              src="/logo.png"
              alt="Çamoluk Yapı"
              width={130}
              height={38}
              priority
            />
          </div>
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition ml-2"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
        {visibleItems.map((item) => {
          const Icon = item.icon;

          // Dropdown Group (Teklif or Satış)
          if (item.subItems && item.subItems.length > 0) {
            const dropdownKey = item.id || item.label.toLowerCase();
            const isOpen = !!openDropdowns[dropdownKey];
            const isParentActive = item.subItems.some((sub) =>
              isSubItemActive(sub.href)
            );

            return (
              <div key={dropdownKey} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleDropdown(dropdownKey)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors group cursor-pointer ${
                    isParentActive
                      ? "text-white bg-white/10 font-semibold"
                      : "text-slate-300 hover:bg-brand-navy-2 hover:text-white"
                  }`}
                >
                  <Icon
                    size={16}
                    className={`flex-shrink-0 ${
                      isParentActive
                        ? "text-brand-gold"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded font-semibold">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    size={14}
                    className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-90 text-brand-gold" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="pl-3 py-1 space-y-0.5 border-l-2 border-brand-gold/30 ml-4 my-0.5">
                    {item.subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive = isSubItemActive(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={onCloseMobile}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            subActive
                              ? "bg-brand-gold text-brand-navy font-bold shadow-xs"
                              : "text-slate-300 hover:bg-brand-navy-2 hover:text-white"
                          }`}
                        >
                          <SubIcon
                            size={14}
                            className={`flex-shrink-0 ${
                              subActive ? "text-brand-navy" : "text-slate-400"
                            }`}
                          />
                          <span className="flex-1 truncate">{sub.label}</span>
                          {sub.badge && !subActive && (
                            <span className="text-[9px] bg-brand-gold/20 text-brand-gold px-1 py-0.5 rounded font-semibold">
                              {sub.badge}
                            </span>
                          )}
                          {subActive && (
                            <ChevronRight size={12} className="flex-shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Single Link Item
          const active = isActive(item.href);
          return (
            <Link
              key={item.href || item.label}
              href={item.href || "#"}
              onClick={onCloseMobile}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors group ${
                active
                  ? "bg-brand-gold text-brand-navy font-bold shadow-xs"
                  : "text-slate-300 hover:bg-brand-navy-2 hover:text-white"
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && !active && (
                <span className="text-[10px] bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded font-semibold">
                  {item.badge}
                </span>
              )}
              {active && <ChevronRight size={14} className="flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom User Role Badge & Logout */}
      <div className="border-t border-white/10 p-3 space-y-2">
        <div className="px-2 py-1.5 rounded bg-brand-navy-2/60 border border-white/5 text-[11px] text-slate-300 flex items-center justify-between">
          <span>Yetki Seviyesi:</span>
          <span className="font-bold text-brand-gold">
            {roleBadgeMap[roleKey] || "Kullanıcı"}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
        >
          <LogOut size={16} />
          <span>Güvenli Çıkış</span>
        </button>
      </div>
    </aside>
  );
}
