"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, User, Menu, ShieldCheck, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setActiveUserRole } from "@/lib/auth/role";
import { type UserRole, ROLE_DEFINITIONS } from "@/lib/auth/role-constants";
import { toast } from "sonner";

interface TopBarProps {
  userName?: string;
  userRole?: string;
  onToggleMobile?: () => void;
}

export function TopBar({ userName, userRole = "admin", onToggleMobile }: TopBarProps) {
  const [search, setSearch] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const profileRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  const currentRole = (userRole as UserRole) || "admin";

  // Dışarı tıklanınca açılır menüleri kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/arama?q=${encodeURIComponent(search.trim())}`);
    }
  }

  async function handleSwitchRole(targetRole: UserRole) {
    setSwitching(true);
    setShowRoleMenu(false);
    try {
      await setActiveUserRole(targetRole);
      toast.success(`Aktif rol değiştirildi: ${ROLE_DEFINITIONS[targetRole].label}`);
      if (targetRole === "sevkiyat") {
        router.push("/sevkiyat");
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Rol değiştirilemedi.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <header className="h-14 bg-white border-b border-border flex items-center px-4 md:px-6 gap-3 sticky top-0 z-20 shadow-xs">
      {/* Mobil Hamburger Butonu */}
      <button
        onClick={onToggleMobile}
        className="lg:hidden p-2 rounded-lg text-text hover:bg-surface border border-border transition flex-shrink-0"
        title="Menüyü Aç"
      >
        <Menu size={18} />
      </button>

      {/* Global Arama */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün, müşteri, teklif no, fiş ara..."
            className="w-full pl-9 pr-4 py-1.5 text-xs md:text-sm bg-surface border border-border rounded-lg outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 md:gap-3 ml-auto">
        {/* HIZLI ROL GEÇİŞ BUTONU & DROPDOWN */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            disabled={switching}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 transition text-xs font-semibold cursor-pointer"
            title="Kullanıcı Rolünü Değiştir"
          >
            <ShieldCheck size={14} className="text-amber-700" />
            <span className="hidden sm:inline">
              {currentRole === "admin"
                ? "Admin"
                : currentRole === "muhasebe1"
                ? "Muhasebe 1"
                : currentRole === "muhasebe2"
                ? "Muhasebe 2"
                : "Sevkiyat"}
            </span>
            <ChevronDown size={12} className="text-amber-700" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-border rounded-xl shadow-xl z-50 py-1.5 divide-y divide-border">
              <div className="px-3 py-2">
                <p className="text-xs font-bold text-text">Hızlı Rol Seçimi (RBAC)</p>
                <p className="text-[11px] text-text-muted">
                  Test etmek veya işlem yapmak istediğiniz kullanıcı rolünü seçin.
                </p>
              </div>

              <div className="p-1 space-y-0.5">
                {(Object.keys(ROLE_DEFINITIONS) as UserRole[]).map((r) => {
                  const def = ROLE_DEFINITIONS[r];
                  const isSelected = currentRole === r;
                  return (
                    <button
                      key={r}
                      onClick={() => handleSwitchRole(r)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-start justify-between gap-2 ${
                        isSelected
                          ? "bg-brand-navy text-white"
                          : "hover:bg-surface text-text"
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          {def.label}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isSelected ? "text-slate-300" : "text-text-muted"
                          }`}
                        >
                          {def.description}
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-brand-gold flex-shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Kullanıcı Profili */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-border transition"
          >
            <div className="w-7 h-7 rounded-full bg-brand-navy flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-text leading-tight truncate max-w-[120px]">
                {userName || "Kullanıcı"}
              </div>
              <div className="text-[10px] text-text-muted capitalize leading-tight">
                {currentRole}
              </div>
            </div>
            <ChevronDown size={12} className="text-text-muted hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-border rounded-xl shadow-lg z-50 py-1.5 text-xs">
              <div className="px-3 py-2 border-b border-border">
                <div className="font-bold text-text truncate">{userName || "Kullanıcı"}</div>
                <div className="text-[11px] text-text-muted capitalize">{currentRole} Yetkisi</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 transition font-medium"
              >
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
