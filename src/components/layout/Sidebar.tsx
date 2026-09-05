"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  FileSpreadsheet,
  Users,
  FileText,
  ClipboardList,
  ShoppingCart,
  ReceiptText,
  Wallet,
  Handshake,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",   label: "Dashboard",             icon: LayoutDashboard },
  { href: "/urunler",     label: "Ürünler",                icon: Package },
  { href: "/import",      label: "Excel & PDF İçe Aktar",  icon: FileSpreadsheet },
  { href: "/musteriler",  label: "Müşteriler",             icon: Users },
  { href: "/teklif/yeni", label: "Teklif Oluştur",         icon: FileText },
  { href: "/teklifler",   label: "Teklifler",              icon: ClipboardList },
  { href: "/satis/yeni",  label: "Satış Oluştur",          icon: ShoppingCart },
  { href: "/satislar",    label: "Satışlar",               icon: ReceiptText },
  { href: "/finans",      label: "Finans",                 icon: Wallet },
  { href: "/ortak-cari",  label: "Ortak Finans (Cari)",    icon: Handshake },
  { href: "/raporlar",    label: "Raporlar",               icon: BarChart3 },
  { href: "/kullanicilar",label: "Kullanıcılar",          icon: UserCog, adminOnly: true },
  { href: "/ayarlar",     label: "Ayarlar",                icon: Settings, adminOnly: true },
];

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
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
    <aside className="w-60 flex-shrink-0 bg-brand-navy flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center justify-center">
          <div className="bg-white rounded-lg px-3 py-2">
            <Image
              src="/logo.png"
              alt="Çamoluk Yapı"
              width={140}
              height={42}
              priority
            />
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors group ${
                active
                  ? "bg-brand-gold text-brand-navy font-semibold"
                  : "text-slate-300 hover:bg-brand-navy-2 hover:text-white"
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-brand-navy-2 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
}
