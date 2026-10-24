"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { type UserRole } from "@/lib/auth/role-constants";
import { GlobalTableEnhancer } from "@/components/ui/GlobalTableEnhancer";

interface DashboardShellProps {
  userName?: string;
  userRole?: string;
  children: React.ReactNode;
}

function isRouteAllowed(role: UserRole, pathname: string): boolean {
  if (role === "admin") return true;

  // Depocu ve Şoför YALNIZCA /sevkiyat sayfasına erişebilir
  if (role === "depo" || role === "sofor") {
    return pathname.startsWith("/sevkiyat");
  }

  // Tali Bayi: Ürünler / Stok, Şirket Portalları ve Bayi Sipariş
  if (role === "tali_bayi" || (role as string) === "bayi") {
    if (pathname.startsWith("/urunler/yeni")) return false;
    return (
      pathname.startsWith("/urunler") ||
      pathname.startsWith("/stok") ||
      pathname.startsWith("/portallar") ||
      pathname.startsWith("/bayi-siparis")
    );
  }

  // Satış Temsilcisi: Teklif, Satış, Sevkiyat, Müşteriler, Ürünler, Bayi Siparişleri
  if (role === "satis") {
    return (
      pathname.startsWith("/teklif") ||
      pathname.startsWith("/teklifler") ||
      pathname.startsWith("/satis") ||
      pathname.startsWith("/satislar") ||
      pathname.startsWith("/bayi-siparisleri") ||
      pathname.startsWith("/sevkiyat") ||
      pathname.startsWith("/musteriler") ||
      pathname.startsWith("/urunler") ||
      pathname.startsWith("/stok") ||
      pathname.startsWith("/arama")
    );
  }

  // Muhasebe 1: Personel & İzinler, Kiralar, Ortak Finans (Cari), Finans & Analiz, Raporlar, Kullanıcılar, Ayarlar hariç açık
  if (role === "muhasebe1") {
    const forbidden = ["/personel", "/kiralar", "/ortak-cari", "/finans", "/raporlar", "/kullanicilar", "/ayarlar", "/audit"];
    return !forbidden.some((prefix) => pathname.startsWith(prefix));
  }

  return true;
}

export function DashboardShell({
  userName,
  userRole = "admin",
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Sayfa değiştiğinde mobil menüyü otomatik kapat
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const roleKey = (userRole as UserRole) || "admin";
  const hasAccess = isRouteAllowed(roleKey, pathname);

  let defaultRoute = "/dashboard";
  let defaultRouteLabel = "Dashboard'a Dön";
  if (roleKey === "depo" || roleKey === "sofor") {
    defaultRoute = "/sevkiyat";
    defaultRouteLabel = "Sevkiyat ve Yükleme Modülüne Git";
  } else if (roleKey === "tali_bayi" || (roleKey as string) === "bayi") {
    defaultRoute = "/urunler";
    defaultRouteLabel = "Ürünler ve Stok Modülüne Git";
  } else if (roleKey === "satis") {
    defaultRoute = "/teklifler";
    defaultRouteLabel = "Teklifler Sayfasına Git";
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* MASAÜSTÜ SIDEBAR (lg ve üzeri) */}
      <div className="hidden lg:flex flex-shrink-0 h-full">
        <Sidebar userRole={userRole} />
      </div>

      {/* MOBİL DRAWER SIDEBAR (lg altı) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Karartma Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sola yaslı menü */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-brand-navy z-10 shadow-2xl h-full animate-in slide-in-from-left duration-200">
            <Sidebar
              userRole={userRole}
              onCloseMobile={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ANA İÇERİK ALANI */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar
          userName={userName}
          userRole={userRole}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 min-w-0">
          <GlobalTableEnhancer />
          {hasAccess ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 shadow-sm">
                <ShieldAlert size={36} />
              </div>
              <h2 className="text-2xl font-black text-slate-800">
                Yetkiniz Bulunmuyor
              </h2>
              <p className="text-sm text-slate-600 max-w-md mt-2">
                Giriş yaptığınız hesap ({userName || roleKey}) bu sayfaya ({pathname}) erişim yetkisine sahip değildir.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={defaultRoute}
                  className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-sm"
                >
                  <span>{defaultRouteLabel}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
