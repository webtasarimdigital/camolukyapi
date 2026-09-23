"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface DashboardShellProps {
  userName?: string;
  userRole?: string;
  children: React.ReactNode;
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
          {children}
        </main>
      </div>
    </div>
  );
}
