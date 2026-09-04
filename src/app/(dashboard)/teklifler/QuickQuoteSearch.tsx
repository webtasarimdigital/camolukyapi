"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export function QuickQuoteSearch({ initialQuery }: { initialQuery?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialQuery || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().replace(/^TKF-/i, "");
    if (clean) {
      router.push(`/teklifler?q=${encodeURIComponent(clean)}`);
    } else {
      router.push(`/teklifler`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-1 max-w-xl">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Teklif No veya Kod ile Ara (örn: TKF-XXXXXXXXXX)..."
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition font-mono placeholder:font-sans"
        />
      </div>
      <button
        type="submit"
        className="flex items-center gap-1.5 bg-brand-navy hover:bg-brand-navy-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
      >
        <span>Bul</span>
        <ArrowRight size={14} />
      </button>
    </form>
  );
}
