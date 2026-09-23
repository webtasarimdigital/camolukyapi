"use client";

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
  ClipboardList,
  ShoppingCart,
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
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  allowedRoles: Array<"admin" | "muhasebe1" | "muhasebe2" | "sevkiyat">;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/sevkiyat",
    label: "Sevkiyat & GPS",
    icon: Truck,
    badge: "Canlı",
    allowedRoles: ["admin", "muhasebe1", "muhasebe2", "sevkiyat"],
  },
  {
    href: "/urunler",
    label: "Ürünler & Stok",
    icon: Package,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2", "sevkiyat"],
  },
  {
    href: "/import",
    label: "Excel & PDF İçe Aktar",
    icon: FileSpreadsheet,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/musteriler",
    label: "Müşteriler",
    icon: Users,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/teklif/yeni",
    label: "Teklif Oluştur",
    icon: FileText,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/teklifler",
    label: "Teklifler",
    icon: ClipboardList,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/satis/yeni",
    label: "Satış Oluştur",
    icon: ShoppingCart,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/satislar",
    label: "Satışlar",
    icon: ReceiptText,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/odemeler",
    label: "Ödeme & Vadeler",
    icon: CalendarClock,
    badge: "Vade",
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/nakliyeler",
    label: "Nakliyeler (12 Gün)",
    icon: Navigation,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/finans",
    label: "Finans & Analiz",
    icon: Wallet,
    allowedRoles: ["admin", "muhasebe2"],
  },
  {
    href: "/ortak-cari",
    label: "Ortak Finans (Cari)",
    icon: Handshake,
    allowedRoles: ["admin", "muhasebe2"],
  },
  {
    href: "/kiralar",
    label: "Kiralar (Gelir/Gider)",
    icon: Building2,
    allowedRoles: ["admin", "muhasebe2"],
  },
  {
    href: "/personel",
    label: "Personel & İzinler",
    icon: UserCheck,
    allowedRoles: ["admin", "muhasebe1", "muhasebe2"],
  },
  {
    href: "/raporlar",
    label: "Raporlar",
    icon: BarChart3,
    allowedRoles: ["admin", "muhasebe2"],
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

  const roleKey = (userRole as any) || "admin";

  const visibleItems = navItems.filter((item) =>
    item.allowedRoles.includes(roleKey)
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-brand-navy flex flex-col h-full select-none">
      {/* Logo Header */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <Link
          href={roleKey === "sevkiyat" ? "/sevkiyat" : "/dashboard"}
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
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
          <span className="font-bold text-brand-gold capitalize">
            {roleKey === "admin"
              ? "👑 Yönetici"
              : roleKey === "muhasebe1"
              ? "💼 Muhasebe 1"
              : roleKey === "muhasebe2"
              ? "📊 Muhasebe 2"
              : "🚚 Sevkiyat"}
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
