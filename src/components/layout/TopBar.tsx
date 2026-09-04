"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TopBarProps {
  userName?: string;
  userRole?: string;
}

export function TopBar({ userName, userRole }: TopBarProps) {
  const [search, setSearch] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const profileRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklanınca kapat
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
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

  return (
    <header className="h-14 bg-white border-b border-border flex items-center px-6 gap-4 sticky top-0 z-20">
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
            placeholder="Ürün, müşteri, teklif kodu ara..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface border border-border rounded-lg outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition"
          />
        </div>
      </form>

      <div className="flex items-center gap-3 ml-auto">
        {/* Bildirim (ileride kullanılacak) */}
        <button className="p-2 rounded-lg text-text-muted hover:bg-surface transition">
          <Bell size={18} />
        </button>

        {/* Kullanıcı */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface transition"
          >
            <div className="w-7 h-7 rounded-full bg-brand-navy flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-text leading-tight">
                {userName || "Kullanıcı"}
              </div>
              <div className="text-xs text-text-muted capitalize leading-tight">
                {userRole === "admin" ? "Admin" : "Personel"}
              </div>
            </div>
            <ChevronDown size={14} className="text-text-muted" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-border rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface transition"
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
