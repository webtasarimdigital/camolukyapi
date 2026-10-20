"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { setActiveUserRole } from "@/lib/auth/role";
import { type UserRole } from "@/lib/auth/role-constants";
import { toast } from "sonner";
import { Lock, User, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let inputVal = username.trim().toLowerCase();
    
    // Kullanıcı adını normalize et
    if (inputVal === "şoför" || inputVal === "sofor") {
      inputVal = "sofor";
    } else if (inputVal === "satış" || inputVal === "satis") {
      inputVal = "satis";
    } else if (inputVal === "depo") {
      inputVal = "depo";
    } else if (inputVal === "bayi" || inputVal === "tali_bayi" || inputVal === "talibayi") {
      inputVal = "bayi";
    } else if (inputVal === "admin" || inputVal === "camoluk") {
      inputVal = "camoluk";
    }

    const email = inputVal.includes("@") ? inputVal : `${inputVal}@camolukyapi.com`;

    // 1. Girilen şifre ile dene
    let res = await supabase.auth.signInWithPassword({ email, password });

    // 2. Başarısız olursa ve Türkçe karakter farkı varsa alternatif şifre ile dene
    if (res.error) {
      let altPassword = password;
      if (altPassword.includes("ş") || altPassword.includes("ö") || altPassword.includes("ı") || altPassword.includes("ç") || altPassword.includes("ğ") || altPassword.includes("ü")) {
        altPassword = altPassword
          .replace(/ş/g, "s")
          .replace(/ö/g, "o")
          .replace(/ı/g, "i")
          .replace(/ç/g, "c")
          .replace(/ğ/g, "g")
          .replace(/ü/g, "u");
      } else {
        if (inputVal === "sofor" && password === "camoluksofor1") altPassword = "camolukşoför1";
        if (inputVal === "satis" && password === "camoluksatis2") altPassword = "camoluksatış2";
      }

      if (altPassword !== password) {
        res = await supabase.auth.signInWithPassword({ email, password: altPassword });
      }
    }

    if (res.error || !res.data.user) {
      toast.error("Giriş başarısız", {
        description: "Kullanıcı adı veya şifre hatalı.",
      });
      setLoading(false);
      return;
    }

    // Gerçek profil rolünü doğrudan veritabanından çek (Güvenlik / RBAC)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", res.data.user.id)
      .single();

    const profile = profileData as { role?: string; full_name?: string } | null;
    const actualRole = (profile?.role as UserRole) || "admin";
    const actualName = profile?.full_name || undefined;

    await setActiveUserRole(actualRole, actualName);

    toast.success("Giriş başarılı", {
      description: `Hoş geldiniz, ${actualName || actualRole}`,
    });

    // Role göre yetkili ana sayfaya yönlendir
    if (actualRole === "depo" || actualRole === "sofor" || actualRole === "sevkiyat") {
      router.push("/sevkiyat");
    } else if (actualRole === "tali_bayi" || (actualRole as string) === "bayi") {
      router.push("/urunler");
    } else if (actualRole === "satis") {
      router.push("/teklifler");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy p-4">
      <div className="w-full max-w-md space-y-6">
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
            <p className="text-slate-400 text-xs mt-1.5">
              Lütfen sisteme erişmek için kullanıcı adı ve şifrenizi giriniz.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-brand-gold" />
                Kullanıcı Adı veya E-Posta
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-brand-navy border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition placeholder:text-slate-500"
                placeholder="Örn: depo, şoför, satış, bayi, camoluk"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock size={14} className="text-brand-gold" />
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
              className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-bold rounded-xl py-3 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <span>Sisteme Giriş Yap</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500">
          Çamoluk Yapı © 2026 • Tüm Hakları Saklıdır
        </p>
      </div>
    </div>
  );
}
