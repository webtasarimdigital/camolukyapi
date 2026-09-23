"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { quickRoleLogin } from "./actions";
import { setActiveUserRole } from "@/lib/auth/role";
import { type UserRole } from "@/lib/auth/role-constants";
import { toast } from "sonner";
import { Shield, Briefcase, BarChart3, Truck, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickLoadingRole, setQuickLoadingRole] = useState<UserRole | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const inputVal = username.trim().toLowerCase();
    const email = inputVal.includes("@") ? inputVal : `${inputVal}@camolukyapi.com`;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Giriş başarısız", {
        description: "Kullanıcı adı veya şifre hatalı.",
      });
      setLoading(false);
      return;
    }

    // Role tespiti
    let detectedRole: UserRole = "admin";
    if (inputVal.includes("muhasebe1")) detectedRole = "muhasebe1";
    else if (inputVal.includes("muhasebe2")) detectedRole = "muhasebe2";
    else if (inputVal.includes("sevkiyat")) detectedRole = "sevkiyat";

    await setActiveUserRole(detectedRole);

    toast.success("Giriş başarılı");
    if (detectedRole === "sevkiyat") {
      router.push("/sevkiyat");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  async function handleQuickRole(role: UserRole) {
    setQuickLoadingRole(role);
    try {
      const res = await quickRoleLogin(role);
      if (res.success) {
        toast.success(`${role.toUpperCase()} girişi sağlandı`);
        router.push(res.redirectTo || "/dashboard");
        router.refresh();
      } else {
        toast.error("Giriş yapılırken hata oluştu: " + res.error);
      }
    } catch {
      toast.error("Giriş işlemi başarısız.");
    } finally {
      setQuickLoadingRole(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* LOGO */}
        <div className="flex justify-center">
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            <Image
              src="/logo.png"
              alt="Çamoluk Yapı"
              width={180}
              height={52}
              priority
            />
          </div>
        </div>

        {/* GİRİŞ KARTI */}
        <div className="bg-brand-navy-2 rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10">
          <div className="mb-6 text-center">
            <h1 className="text-white text-xl font-bold">
              Operasyon & Yönetim Paneli
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Lütfen giriş bilgilerinizi giriniz veya aşağıdan doğrudan rol seçiniz.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kullanıcı Adı veya E-Posta
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-brand-navy border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition placeholder:text-slate-500"
                placeholder="Örn: camoluk, muhasebe1, sevkiyat"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Şifre
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-navy border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition placeholder:text-slate-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold rounded-xl py-3 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
            >
              {loading ? "Giriş yapılıyor..." : "Sisteme Giriş Yap"}
            </button>
          </form>

          {/* ROL TABANLI HIZLI GİRİŞ BUTONLARI (RBAC) */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              ⚡ Hızlı / Rol Tabanlı Giriş Seçenekleri
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Admin */}
              <button
                type="button"
                onClick={() => handleQuickRole("admin")}
                disabled={quickLoadingRole !== null}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-gold/60 text-left transition group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
                  <Shield size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-brand-gold flex items-center gap-1.5">
                    Admin / Çamoluk
                    {quickLoadingRole === "admin" && <Loader2 size={12} className="animate-spin" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Tüm yetkiler, finans ve ayarlar açık
                  </div>
                </div>
              </button>

              {/* 2. Muhasebe 1 */}
              <button
                type="button"
                onClick={() => handleQuickRole("muhasebe1")}
                disabled={quickLoadingRole !== null}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/60 text-left transition group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
                  <Briefcase size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-300 flex items-center gap-1.5">
                    Muhasebe 1
                    {quickLoadingRole === "muhasebe1" && <Loader2 size={12} className="animate-spin" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Finans & Ortak Cari hariç tüm operasyonlar
                  </div>
                </div>
              </button>

              {/* 3. Muhasebe 2 */}
              <button
                type="button"
                onClick={() => handleQuickRole("muhasebe2")}
                disabled={quickLoadingRole !== null}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/60 text-left transition group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 mt-0.5">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 flex items-center gap-1.5">
                    Muhasebe 2
                    {quickLoadingRole === "muhasebe2" && <Loader2 size={12} className="animate-spin" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Finans & Ortak Cari dahil tüm tablolar
                  </div>
                </div>
              </button>

              {/* 4. Sevkiyat */}
              <button
                type="button"
                onClick={() => handleQuickRole("sevkiyat")}
                disabled={quickLoadingRole !== null}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/60 text-left transition group cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                  <Truck size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                    Sevkiyat Kullanıcısı
                    {quickLoadingRole === "sevkiyat" && <Loader2 size={12} className="animate-spin" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Yalnızca Sevkiyat & Stok yetkisi
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Çamoluk Yapı © 2026 • Tüm Hakları Saklıdır
        </p>
      </div>
    </div>
  );
}
