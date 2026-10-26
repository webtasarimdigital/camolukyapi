"use client";

import { useState, useMemo, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  Paintbrush,
  Plus,
  Trash2,
  Download,
  Search,
  Check,
  Edit2,
  ChevronDown,
  ArrowUpDown,
  Copy,
  Sparkles,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Calendar,
  Hash,
  Type,
  X,
} from "lucide-react";
import {
  CamlicaColumn,
  CamlicaRow,
  addCamlicaFircaColumn,
  updateCamlicaFircaColumn,
  deleteCamlicaFircaColumn,
  addCamlicaFircaRow,
  updateCamlicaFircaCell,
  deleteCamlicaFircaRow,
  deleteCamlicaFircaRows,
} from "./actions";

interface CamlicaFircaClientProps {
  initialColumns: CamlicaColumn[];
  initialRows: CamlicaRow[];
}

export function CamlicaFircaClient({
  initialColumns,
  initialRows,
}: CamlicaFircaClientProps) {
  const [columns, setColumns] = useState<CamlicaColumn[]>(initialColumns);
  const [rows, setRows] = useState<CamlicaRow[]>(initialRows);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Sütun Ekle Modal
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("text");

  // Sütun Düzenle Modal
  const [editingCol, setEditingCol] = useState<CamlicaColumn | null>(null);
  const [editColName, setEditColName] = useState("");

  // Hücre kaydetme durumu göstergesi (rowId_colKey -> 'saving' | 'saved')
  const [cellStatus, setCellStatus] = useState<Record<string, "saving" | "saved">>({});

  // Sıralama
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Filtrelenmiş ve sıralanmış satırlar
  const processedRows = useMemo(() => {
    let result = [...rows];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row.row_data || {}).some((val) =>
          String(val || "").toLowerCase().includes(q)
        )
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a.row_data?.[sortConfig.key] ?? "";
        const valB = b.row_data?.[sortConfig.key] ?? "";

        const numA = Number(valA);
        const numB = Number(valB);

        if (!isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "") {
          return sortConfig.direction === "asc" ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
        if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rows, searchTerm, sortConfig]);

  // Sayısal sütun toplamları (Excel SUM)
  const columnSums = useMemo(() => {
    const sums: Record<string, number | null> = {};
    columns.forEach((col) => {
      let sum = 0;
      let hasNumbers = false;
      rows.forEach((r) => {
        const val = r.row_data?.[col.column_key];
        if (val !== undefined && val !== null && val !== "") {
          const num = Number(val);
          if (!isNaN(num)) {
            sum += num;
            hasNumbers = true;
          }
        }
      });
      sums[col.column_key] = hasNumbers && col.column_type === "number" ? sum : null;
    });
    return sums;
  }, [columns, rows]);

  // Yeni Sütun Ekle
  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColName.trim()) return;

    startTransition(async () => {
      const res = await addCamlicaFircaColumn(newColName.trim(), newColType);
      if (res.success && res.data) {
        setColumns((prev) => [...prev, res.data]);
        setNewColName("");
        setIsColModalOpen(false);
      } else {
        alert(res.error || "Sütun eklenemedi");
      }
    });
  }

  // Sütun Güncelle
  async function handleUpdateColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCol || !editColName.trim()) return;

    startTransition(async () => {
      const res = await updateCamlicaFircaColumn(editingCol.column_key, editColName.trim());
      if (res.success && res.data) {
        setColumns((prev) =>
          prev.map((c) => (c.column_key === editingCol.column_key ? res.data : c))
        );
        setEditingCol(null);
      } else {
        alert(res.error || "Sütun güncellenemedi");
      }
    });
  }

  // Sütun Sil
  async function handleDeleteColumn(colKey: string, colName: string) {
    if (!confirm(`"${colName}" sütununu ve bu sütuna ait tüm verileri silmek istediğinize emin misiniz?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteCamlicaFircaColumn(colKey);
      if (res.success) {
        setColumns((prev) => prev.filter((c) => c.column_key !== colKey));
      } else {
        alert(res.error || "Sütun silinemedi");
      }
    });
  }

  // Yeni Satır Ekle
  async function handleAddRow() {
    startTransition(async () => {
      const emptyData: Record<string, any> = {};
      columns.forEach((c) => {
        emptyData[c.column_key] = "";
      });
      const res = await addCamlicaFircaRow(emptyData);
      if (res.success && res.data) {
        setRows((prev) => [...prev, res.data]);
      } else {
        alert(res.error || "Satır eklenemedi");
      }
    });
  }

  // Satır Kopyala/Çoğalt
  async function handleDuplicateRow(row: CamlicaRow) {
    startTransition(async () => {
      const duplicateData = { ...(row.row_data || {}) };
      const res = await addCamlicaFircaRow(duplicateData);
      if (res.success && res.data) {
        setRows((prev) => [...prev, res.data]);
      }
    });
  }

  // Satır Sil
  async function handleDeleteRow(rowId: string) {
    if (!confirm("Bu satırı silmek istediğinize emin misiniz?")) return;

    startTransition(async () => {
      const res = await deleteCamlicaFircaRow(rowId);
      if (res.success) {
        setRows((prev) => prev.filter((r) => r.id !== rowId));
        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          next.delete(rowId);
          return next;
        });
      }
    });
  }

  // Çoklu Satır Sil
  async function handleDeleteSelectedRows() {
    if (selectedRowIds.size === 0) return;
    if (!confirm(`Seçilen ${selectedRowIds.size} satırı silmek istediğinize emin misiniz?`)) return;

    const ids = Array.from(selectedRowIds);
    startTransition(async () => {
      const res = await deleteCamlicaFircaRows(ids);
      if (res.success) {
        setRows((prev) => prev.filter((r) => !selectedRowIds.has(r.id)));
        setSelectedRowIds(new Set());
      }
    });
  }

  // Hücre Değeri Değişimi (Local State + Sunucuya Kayıt)
  function handleCellChange(rowId: string, colKey: string, newValue: any) {
    // 1. Önce UI'ı hemen güncelle
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          row_data: {
            ...(r.row_data || {}),
            [colKey]: newValue,
          },
        };
      })
    );

    const cellKey = `${rowId}_${colKey}`;
    setCellStatus((prev) => ({ ...prev, [cellKey]: "saving" }));

    // 2. Sunucuya kaydet
    updateCamlicaFircaCell(rowId, colKey, newValue).then((res) => {
      if (res.success) {
        setCellStatus((prev) => ({ ...prev, [cellKey]: "saved" }));
        setTimeout(() => {
          setCellStatus((prev) => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
          });
        }, 1200);
      }
    });
  }

  // Hepsini Seç / Kaldır
  function toggleSelectAll() {
    if (selectedRowIds.size === processedRows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(processedRows.map((r) => r.id)));
    }
  }

  // Tek Satır Seçim
  function toggleRowSelection(rowId: string) {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  // Excel'e Aktar (.xlsx)
  function exportToExcel() {
    if (rows.length === 0 || columns.length === 0) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }

    const exportData = rows.map((r, idx) => {
      const rowObj: Record<string, any> = { "#": idx + 1 };
      columns.forEach((c) => {
        rowObj[c.column_name] = r.row_data?.[c.column_key] ?? "";
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Çamlıca Fırça");
    XLSX.writeFile(workbook, `Camlica_Firca_Tablosu_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  // Örnek Başlangıç Şablonu Oluştur (Kullanıcı sıfırdan başladıysa)
  async function handleLoadTemplate() {
    const defaultCols = [
      { name: "Ürün Kodu", type: "text" },
      { name: "Fırça Tanımı", type: "text" },
      { name: "Kıl Tipi / Malzeme", type: "text" },
      { name: "Adet", type: "number" },
      { name: "Birim Fiyat (TL)", type: "number" },
      { name: "Tarih", type: "date" },
      { name: "Notlar", type: "text" },
    ];

    startTransition(async () => {
      for (const col of defaultCols) {
        await addCamlicaFircaColumn(col.name, col.type);
      }
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6 max-w-full mx-auto pb-16">
      {/* BAŞLIK & KONTROL PANELİ */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-xs">
            <Paintbrush size={26} className="text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Çamlıca Fırça
              </h1>
              <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">
                Özel Excel Çalışma Alanı
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sadece bu sayfaya etki eden bağımsız veri tablosu. Aklınıza geldikçe sütun ekleyin, verileri doğrudan hücrelere yazın.
            </p>
          </div>
        </div>

        {/* Eylemler */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedRowIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelectedRows}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Trash2 size={15} />
              <span>Seçilenleri Sil ({selectedRowIds.size})</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            title="Excel (.xlsx) formatında indir"
          >
            <Download size={15} />
            <span>Excel İndir</span>
          </button>

          <button
            type="button"
            onClick={() => setIsColModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus size={15} />
            <span>Sütun Ekle</span>
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-xs"
          >
            <Plus size={16} />
            <span>+ Satır Ekle</span>
          </button>
        </div>
      </div>

      {/* ARAMA VE ÖZET ÇUBUĞU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tabloda ara (tüm sütunlarda filtrele)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1.5">
            <Layers size={14} className="text-amber-600" />
            Toplam: <strong className="text-slate-900 font-bold">{rows.length}</strong> satır
          </span>
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet size={14} className="text-blue-600" />
            Sütun: <strong className="text-slate-900 font-bold">{columns.length}</strong> adet
          </span>
        </div>
      </div>

      {/* SIFIR SÜTUN HALİ (ONBOARDING) */}
      {columns.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <Sparkles size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Çamlıca Fırça Tablonuz Henüz Boş
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              İstediğiniz sütun adlarını belirleyerek kendi tablonuzu hemen oluşturabilirsiniz. Dilerseniz hazır fırça şablonunu yükleyebilir veya tek tek ekleyebilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsColModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition"
            >
              <Plus size={16} />
              <span>İlk Sütununuzu Ekleyin</span>
            </button>
            <button
              type="button"
              onClick={handleLoadTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-xs hover:bg-amber-600 transition"
            >
              <Sparkles size={16} />
              <span>Hazır Fırça Şablonu Oluştur</span>
            </button>
          </div>
        </div>
      ) : (
        /* EXCEL TABLOSU */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[72vh] relative">
            <table className="w-full text-left text-xs border-collapse">
              {/* TABLO BAŞLIĞI */}
              <thead className="bg-slate-900 text-white sticky top-0 z-20 shadow-xs select-none">
                <tr>
                  {/* Seçim kutusu */}
                  <th className="py-3 px-3 w-10 text-center border-r border-slate-800">
                    <input
                      type="checkbox"
                      checked={
                        processedRows.length > 0 &&
                        selectedRowIds.size === processedRows.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                    />
                  </th>
                  {/* Sıra No */}
                  <th className="py-3 px-3 w-12 text-center text-slate-400 font-bold border-r border-slate-800">
                    #
                  </th>

                  {/* Dinamik Sütunlar */}
                  {columns.map((col) => {
                    const isSorted = sortConfig?.key === col.column_key;
                    return (
                      <th
                        key={col.id}
                        className="py-3 px-3 font-semibold text-slate-200 border-r border-slate-800 min-w-[170px] group hover:bg-slate-800/80 transition relative"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (sortConfig?.key === col.column_key) {
                                setSortConfig(
                                  sortConfig.direction === "asc"
                                    ? { key: col.column_key, direction: "desc" }
                                    : null
                                );
                              } else {
                                setSortConfig({ key: col.column_key, direction: "asc" });
                              }
                            }}
                            className="flex items-center gap-1.5 font-bold hover:text-amber-400 transition text-left truncate flex-1"
                            title="Sıralamak için tıklayın"
                          >
                            {col.column_type === "number" && (
                              <Hash size={13} className="text-amber-400 shrink-0" />
                            )}
                            {col.column_type === "date" && (
                              <Calendar size={13} className="text-blue-400 shrink-0" />
                            )}
                            {col.column_type === "text" && (
                              <Type size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{col.column_name}</span>
                            {isSorted && (
                              <span className="text-[10px] text-amber-400 font-black">
                                {sortConfig.direction === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </button>

                          {/* Sütun Düzenleme ve Silme İkonları */}
                          <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCol(col);
                                setEditColName(col.column_name);
                              }}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                              title="Sütun Adını Değiştir"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteColumn(col.column_key, col.column_name)}
                              className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-900/50"
                              title="Sütunu Sil"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* Sütun Ekleme Butonu (Excel tarzı en sağda) */}
                  <th className="py-2.5 px-3 w-36 text-center border-r border-slate-800 bg-slate-900/90">
                    <button
                      type="button"
                      onClick={() => setIsColModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition"
                    >
                      <Plus size={13} />
                      <span>Sütun Ekle</span>
                    </button>
                  </th>

                  {/* İşlemler Başlığı */}
                  <th className="py-3 px-3 w-20 text-center font-bold text-slate-400">
                    İşlem
                  </th>
                </tr>
              </thead>

              {/* TABLO GÖVDESİ */}
              <tbody className="divide-y divide-slate-100">
                {processedRows.map((row, rIndex) => {
                  const isChecked = selectedRowIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors group hover:bg-amber-50/20 ${
                        isChecked ? "bg-amber-50/40" : rIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      {/* Seçim kutusu */}
                      <td className="py-2 px-3 text-center border-r border-slate-100">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRowSelection(row.id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                        />
                      </td>

                      {/* Sıra No */}
                      <td className="py-2 px-3 text-center text-slate-400 font-semibold border-r border-slate-100">
                        {rIndex + 1}
                      </td>

                      {/* Sütun Hücreleri (Excel Gibi Doğrudan Düzenlenebilir) */}
                      {columns.map((col) => {
                        const cellKey = `${row.id}_${col.column_key}`;
                        const status = cellStatus[cellKey];
                        const val = row.row_data?.[col.column_key] ?? "";

                        return (
                          <td
                            key={col.id}
                            className="py-1 px-2 border-r border-slate-100 relative focus-within:ring-2 focus-within:ring-amber-500 focus-within:bg-amber-50/50"
                          >
                            <div className="relative flex items-center">
                              {col.column_type === "number" ? (
                                <input
                                  type="number"
                                  value={val}
                                  onChange={(e) =>
                                    handleCellChange(row.id, col.column_key, e.target.value)
                                  }
                                  placeholder="0.00"
                                  className="w-full bg-transparent px-2 py-1.5 text-xs text-right font-medium text-slate-900 focus:outline-none"
                                />
                              ) : col.column_type === "date" ? (
                                <input
                                  type="date"
                                  value={val}
                                  onChange={(e) =>
                                    handleCellChange(row.id, col.column_key, e.target.value)
                                  }
                                  className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) =>
                                    handleCellChange(row.id, col.column_key, e.target.value)
                                  }
                                  placeholder="..."
                                  className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
                                />
                              )}

                              {/* Kaydediliyor / Kaydedildi İkonu */}
                              {status === "saving" && (
                                <span className="absolute right-1 text-[10px] text-amber-500 animate-pulse font-bold">
                                  ...
                                </span>
                              )}
                              {status === "saved" && (
                                <span className="absolute right-1 text-emerald-600 animate-in fade-in">
                                  <Check size={12} />
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Boş hücre (Sütun ekle hizası) */}
                      <td className="py-2 px-3 border-r border-slate-100 text-center bg-slate-50/20"></td>

                      {/* Satır İşlemleri */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition"
                            title="Satırı Çoğalt"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            title="Satırı Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Eğer hiç satır yoksa */}
                {processedRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + 4}
                      className="py-10 text-center text-slate-400"
                    >
                      <p className="text-xs font-medium">Bu görünümde henüz kayıt bulunmuyor.</p>
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition"
                      >
                        <Plus size={14} />
                        <span>İlk Satırı Ekle</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* TOPLAM ÇUBUĞU (EXCEL FOOTER) */}
              {columns.some((c) => columnSums[c.column_key] !== null) && (
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 sticky bottom-0 z-10">
                  <tr>
                    <td className="py-2.5 px-3 text-center border-r border-slate-200"></td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-black">
                      TOPLAM
                    </td>
                    {columns.map((col) => {
                      const sum = columnSums[col.column_key];
                      return (
                        <td
                          key={col.id}
                          className="py-2.5 px-3 border-r border-slate-200 text-right text-xs font-extrabold text-slate-900"
                        >
                          {sum !== null && sum !== undefined ? (
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                              {sum.toLocaleString("tr-TR", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 border-r border-slate-200"></td>
                    <td className="py-2.5 px-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Alt Yeni Satır Ekle Çubuğu */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-amber-50 text-slate-900 hover:text-amber-950 border border-slate-300 rounded-lg text-xs font-bold transition shadow-2xs"
            >
              <Plus size={14} className="text-amber-600" />
              <span>+ Yeni Satır Ekle</span>
            </button>
            <span className="text-[11px] text-slate-500 italic">
              * Değişiklikler yazdığınız anda otomatik kaydedilir.
            </span>
          </div>
        </div>
      )}

      {/* SÜTUN EKLE MODAL */}
      {isColModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm">Yeni Sütun Ekle</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsColModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddColumn} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sütun Adı / Başlığı *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Örn: Fırça Boyu, Kıl Cinsi, Tedarikçi, Notlar"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sütun Veri Türü
                </label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="text">Metin / Yazı (Normal metin, kod vs.)</option>
                  <option value="number">Sayı / Tutar (Adet, fiyat, otomatik toplanır)</option>
                  <option value="date">Tarih (GG.AA.YYYY seçici)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsColModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-xs"
                >
                  {isPending ? "Ekleniyor..." : "Sütunu Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SÜTUN ADI DEĞİŞTİR MODAL */}
      {editingCol && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm">Sütun Adını Değiştir</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCol(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateColumn} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Yeni Sütun Adı *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editColName}
                  onChange={(e) => setEditColName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCol(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-xs"
                >
                  {isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
