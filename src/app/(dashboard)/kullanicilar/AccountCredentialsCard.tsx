"use client";

import { useState } from "react";
import { Key, Eye, EyeOff, ShieldCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export interface AccountInfo {
  email: string;
  pass: string;
  username: string;
  role: string;
  title: string;
  note: string;
  badge: string;
  allowedSummary: string;
}

export function AccountCredentialsCard({ accounts }: { accounts: AccountInfo[] }) {
  const [showPass, setShowPass] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyText(text: string, label: string, key: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} kopyalandı: ${text}`);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/60 to-surface border border-blue-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/60 pb-3">
        <div className="flex items-center gap-2 text-brand-navy font-bold text-sm">
          <Key size={18} className="text-brand-navy" />
          <span>Sistemde Tanımlı Kullanıcı Giriş Şifreleri (Yönetici Paneli)</span>
          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck size={11} /> Şifreler Açık
          </span>
        </div>
        <button
          onClick={() => setShowPass(!showPass)}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-navy bg-white hover:bg-surface border border-blue-200 px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
        >
          {showPass ? (
            <>
              <EyeOff size={13} /> Şifreleri Gizle
            </>
          ) : (
            <>
              <Eye size={13} /> Şifreleri Göster
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
        {accounts.map((acc) => {
          const passCopied = copiedKey === `pass-${acc.email}`;
          const userCopied = copiedKey === `user-${acc.email}`;
          return (
            <div
              key={acc.email}
              className="bg-white rounded-xl p-4 border border-blue-100 shadow-xs flex flex-col justify-between space-y-3 hover:border-blue-300 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-text flex items-center gap-1.5">
                    {acc.title}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${acc.badge}`}>
                    {acc.role.toUpperCase()}
                  </span>
                </div>

                <div className="bg-surface/80 rounded-lg p-2.5 space-y-1.5 border border-border/80">
                  {/* Kullanıcı Adı */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-text-muted">Kullanıcı Adı:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-xs text-brand-navy bg-white px-2 py-0.5 rounded border border-border">
                        {acc.username}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(acc.username, "Kullanıcı adı", `user-${acc.email}`)}
                        className="p-1 hover:bg-white rounded text-text-muted hover:text-brand-navy transition cursor-pointer"
                        title="Kullanıcı Adını Kopyala"
                      >
                        {userCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Şifre */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-text-muted font-medium">Giriş Şifresi:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 select-all tracking-wide">
                        {showPass ? acc.pass : "••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(acc.pass, "Şifre", `pass-${acc.email}`)}
                        className="p-1 hover:bg-emerald-100 rounded text-emerald-700 transition cursor-pointer"
                        title="Şifreyi Kopyala"
                      >
                        {passCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* E-posta */}
                  <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5 border-t border-border/50">
                    <span>E-posta:</span>
                    <span className="font-mono truncate select-all">{acc.email}</span>
                  </div>
                </div>
              </div>

              {/* Açıklama & İzin Kapsamı */}
              <div className="text-[11px] text-text-muted border-t border-border/70 pt-2 space-y-0.5">
                <p className="font-medium text-text">{acc.allowedSummary}</p>
                <p className="italic text-[10px] text-text-muted">{acc.note}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
