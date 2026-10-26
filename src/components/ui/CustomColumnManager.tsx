"use client";

import { useState } from "react";
import { Plus, X, Trash2, Edit3, Check, Loader2 } from "lucide-react";
import {
  CustomColumn,
  addCustomColumn,
  deleteCustomColumn,
  updateRowCustomFieldValue,
} from "@/lib/data/custom-columns-actions";

interface AddColumnModalProps {
  tableId: string;
  revalidateUrl?: string;
  onColumnAdded?: (col: CustomColumn) => void;
  existingColumns: CustomColumn[];
  onColumnDeleted?: (columnKey: string) => void;
}

export function CustomColumnButton({
  tableId,
  revalidateUrl,
  onColumnAdded,
  existingColumns,
  onColumnDeleted,
}: AddColumnModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [colName, setColName] = useState("");
  const [colType, setColType] = useState<"text" | "number" | "date">("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!colName.trim()) return;

    setLoading(true);
    setError(null);

    const res = await addCustomColumn(tableId, colName.trim(), colType, revalidateUrl);

    if (res.success && res.column) {
      if (onColumnAdded) onColumnAdded(res.column);
      setColName("");
      setIsOpen(false);
    } else {
      setError(res.error || "Sütun eklenemedi.");
    }
    setLoading(false);
  }

  async function handleDelete(key: string) {
    if (!confirm("Bu sütunu kaldırmak istediğinize emin misiniz?")) return;
    setLoading(true);
    const res = await deleteCustomColumn(tableId, key, revalidateUrl);
    if (res.success && onColumnDeleted) {
      onColumnDeleted(key);
    }
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 shadow-2xs"
        title="Tabloya yeni özel sütun ekle"
      >
        <Plus size={14} className="text-brand-gold" />
        <span>Sütun Ekle</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-border animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-brand-gold" />
                Özel Sütun Ekle & Yönet
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sütun Başlığı / Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Masraf Merkezi, Fiş No, İlgili Kişi..."
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Veri Türü
                </label>
                <select
                  value={colType}
                  onChange={(e) => setColType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-gold/40 bg-white"
                >
                  <option value="text">Metin (Yazı / Açıklama)</option>
                  <option value="number">Sayı / Tutar (₺)</option>
                  <option value="date">Tarih (GG.AA.YYYY)</option>
                </select>
              </div>

              {error && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={loading || !colName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-navy bg-brand-gold hover:bg-brand-gold-light rounded-xl transition disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Sütunu Ekle
                </button>
              </div>
            </form>

            {existingColumns && existingColumns.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Mevcut Özel Sütunlar:</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {existingColumns.map((c) => (
                    <div
                      key={c.column_key}
                      className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{c.column_name}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({c.column_type})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.column_key)}
                        disabled={loading}
                        className="text-slate-400 hover:text-rose-600 transition p-1"
                        title="Bu sütunu kaldır"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface CustomColumnCellProps {
  tableName: string;
  rowId: string;
  column: CustomColumn;
  initialValue?: any;
  revalidateUrl?: string;
  onValueSaved?: (val: any) => void;
}

export function CustomColumnCell({
  tableName,
  rowId,
  column,
  initialValue = "",
  revalidateUrl,
  onValueSaved,
}: CustomColumnCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(initialValue || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateRowCustomFieldValue(
      tableName,
      rowId,
      column.column_key,
      val,
      revalidateUrl
    );
    if (onValueSaved) onValueSaved(val);
    setSaving(false);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[120px]">
        <input
          type={column.column_type === "number" ? "number" : column.column_type === "date" ? "date" : "text"}
          value={val}
          autoFocus
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setIsEditing(false);
          }}
          className="w-full px-2 py-1 text-xs border border-brand-gold rounded-lg focus:outline-hidden bg-white shadow-2xs"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group flex items-center justify-between cursor-pointer py-1 px-1.5 -mx-1.5 rounded hover:bg-slate-100 transition min-h-[26px] text-xs"
      title="Tıklayarak düzenle"
    >
      <span className={val ? "text-slate-800" : "text-slate-400 italic"}>
        {val !== undefined && val !== null && val !== "" ? String(val) : "—"}
      </span>
      <Edit3
        size={11}
        className="text-slate-300 opacity-0 group-hover:opacity-100 transition ml-1"
      />
    </div>
  );
}
