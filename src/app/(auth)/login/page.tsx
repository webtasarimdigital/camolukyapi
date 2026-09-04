"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Kullanıcı adını e-postaya dönüştür (arka planda)
    const email = `${username.trim().toLowerCase()}@camolukyapi.com`;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Giriş başarısız", {
        description: "Kullanıcı adı veya şifre hatalı.",
      });
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl px-8 py-4">
            <Image
              src="/logo.png"
              alt="Çamoluk Yapı"
              width={200}
              height={60}
              priority
            />
          </div>
        </div>

        {/* Kart */}
        <div className="bg-brand-navy-2 rounded-2xl p-8 shadow-2xl border border-white/10">
          <h1 className="text-white text-xl font-semibold mb-1">
            Operasyon Paneli
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            Yetkili giriş gereklidir.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-brand-navy border border-white/10 text-white rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition placeholder:text-slate-600"
                placeholder="camoluk"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">
                Şifre
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-navy border border-white/10 text-white rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-navy font-semibold rounded-lg py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
