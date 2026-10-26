"use client";

import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";

interface MonthFilterProps {
  selectedMonth: string; // "all" veya "YYYY-MM"
  onChange: (month: string) => void;
  className?: string;
}

export function MonthFilter({
  selectedMonth,
  onChange,
  className = "",
}: MonthFilterProps) {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function getMonthLabel(ym: string) {
    if (ym === "all") return "Tüm Zamanlar";
    const [year, month] = ym.split("-").map(Number);
    if (!year || !month) return ym;
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  }

  function handlePrev() {
    const ym = selectedMonth === "all" ? currentYM : selectedMonth;
    const [year, month] = ym.split("-").map(Number);
    const d = new Date(year, month - 2, 1);
    const nextYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onChange(nextYM);
  }

  function handleNext() {
    const ym = selectedMonth === "all" ? currentYM : selectedMonth;
    const [year, month] = ym.split("-").map(Number);
    const d = new Date(year, month, 1);
    const nextYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onChange(nextYM);
  }

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs ${className}`}
    >
      {/* Tüm Zamanlar Butonu */}
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
          selectedMonth === "all"
            ? "bg-slate-900 text-white shadow-xs"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <RotateCcw size={13} />
        <span>Tüm Zamanlar</span>
      </button>

      {/* Önceki Ay */}
      <button
        type="button"
        onClick={handlePrev}
        className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        title="Önceki Ay"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Ay Seçici & Etiket */}
      <div className="relative flex items-center">
        <label
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer select-none ${
            selectedMonth !== "all"
              ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs"
              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <Calendar
            size={14}
            className={selectedMonth !== "all" ? "text-slate-950" : "text-amber-600"}
          />
          <span className="capitalize">{getMonthLabel(selectedMonth)}</span>
          <input
            type="month"
            value={selectedMonth === "all" ? currentYM : selectedMonth}
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>

      {/* Sonraki Ay */}
      <button
        type="button"
        onClick={handleNext}
        className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        title="Sonraki Ay"
      >
        <ChevronRight size={16} />
      </button>

      {/* Bu Ay (Hızlıca Cari Aya Git) */}
      {selectedMonth !== currentYM && (
        <button
          type="button"
          onClick={() => onChange(currentYM)}
          className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
        >
          Bu Ay
        </button>
      )}
    </div>
  );
}
