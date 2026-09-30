"use client";

import { useState } from "react";
import { Key, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface Account {
  email: string;
  pass: string;
  role: string;
  note: string;
}

export function AccountCredentialsCard({ accounts }: { accounts: Account[] }) {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-brand-navy font-bold text-sm">
          <Key size={16} />
          <span>Sistemde Tanımlı Kullanıcı Hesapları & Giriş Bilgileri</span>
          <span className="text-[10px] font-semibold bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck size={11} /> Yalnızca Admin Görebilir
          </span>
        </div>
        <button
          onClick={() => setShowPass(!showPass)}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-navy bg-white hover:bg-surface border border-blue-200 px-3 py-1.5 rounded-lg transition shadow-2xs"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {accounts.map((acc) => (
          <div
            key={acc.email}
            className="bg-white rounded-xl p-3 border border-blue-100 shadow-xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">{acc.role.toUpperCase()}</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                Aktif
              </span>
            </div>
            <div className="text-text-muted">
              <span className="font-mono text-text block truncate select-all">{acc.email}</span>
              <span className="font-mono text-emerald-700 font-semibold block mt-0.5">
                Şifre: {showPass ? acc.pass : "••••••••"}
              </span>
            </div>
            <p className="text-[11px] text-text-muted italic border-t border-border pt-1">
              {acc.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
