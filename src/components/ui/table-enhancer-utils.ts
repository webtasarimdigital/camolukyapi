// Core utilities for Table Column Resizing & Click-to-Sort

export interface CellParsedValue {
  type: "number" | "date" | "string";
  val: number | string;
}

/**
 * Hücre içeriğini analiz eder: Tarih, Para/Sayı veya Türkçe metin
 */
export function parseCellValue(td: HTMLElement): CellParsedValue {
  const attrVal = td.getAttribute("data-sort-val") || td.getAttribute("data-sort-value");
  const rawText = (attrVal ?? td.innerText ?? td.textContent ?? "").trim();

  if (!rawText || rawText === "-" || rawText === "—") {
    return { type: "string", val: "" };
  }

  // 1. Tarih Algılama (DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY veya saat içeren formatlar)
  const dateDMY = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(rawText);
  if (dateDMY) {
    const day = parseInt(dateDMY[1], 10);
    const month = parseInt(dateDMY[2], 10) - 1;
    const year = parseInt(dateDMY[3], 10);
    const hour = dateDMY[4] ? parseInt(dateDMY[4], 10) : 0;
    const min = dateDMY[5] ? parseInt(dateDMY[5], 10) : 0;
    const time = new Date(year, month, day, hour, min).getTime();
    if (!isNaN(time)) {
      return { type: "date", val: time };
    }
  }

  // ISO Tarih: YYYY-MM-DD
  const dateYMD = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(rawText);
  if (dateYMD) {
    const time = new Date(rawText.replace(" ", "T")).getTime();
    if (!isNaN(time)) {
      return { type: "date", val: time };
    }
  }

  // 2. Para / Sayı / Yüzde / Ölçü Birimi Algılama
  const cleaned = rawText
    .replace(/[₺$€£]/g, "")
    .replace(/(TL|tl|m2|m²|adet|adt|palet|koli|kg|ton)/gi, "")
    .replace(/%/g, "")
    .trim();

  // "1.250,50" veya "28.000,00"
  if (/^-?\d{1,3}(?:\.\d{3})*,\d+$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized);
    if (!isNaN(num)) return { type: "number", val: num };
  } else if (/^-?\d+,\d+$/.test(cleaned)) {
    // "150,50"
    const normalized = cleaned.replace(",", ".");
    const num = parseFloat(normalized);
    if (!isNaN(num)) return { type: "number", val: num };
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(cleaned)) {
    // "1.250"
    const normalized = cleaned.replace(/\./g, "");
    const num = parseFloat(normalized);
    if (!isNaN(num)) return { type: "number", val: num };
  } else if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    // "1500" veya "1500.5"
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return { type: "number", val: num };
  }

  // 3. Varsayılan: Türkçe küçük harfli metin
  return { type: "string", val: rawText.toLocaleLowerCase("tr-TR") };
}

/**
 * İki ayrıştırılmış hücre değerini karşılaştırır
 */
export function compareValues(a: CellParsedValue, b: CellParsedValue, asc: boolean): number {
  if (a.val === "" && b.val !== "") return 1;
  if (a.val !== "" && b.val === "") return -1;
  if (a.val === "" && b.val === "") return 0;

  let res = 0;
  if (a.type === "number" && b.type === "number") {
    res = (a.val as number) - (b.val as number);
  } else if (a.type === "date" && b.type === "date") {
    res = (a.val as number) - (b.val as number);
  } else {
    const aStr = String(a.val);
    const bStr = String(b.val);
    res = aStr.localeCompare(bStr, "tr", { numeric: true, sensitivity: "base" });
  }

  return asc ? res : -res;
}

const ACTION_COL_REGEX = /(işlem|aksiyon|fotoğraf|seç|action|düzenle|sil|buton)/i;
const DATE_COL_REGEX = /(tarih|zaman|vade|gün|date|time)/i;

const CHEVRONS_UP_DOWN_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>`;
const CHEVRON_UP_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>`;
const CHEVRON_DOWN_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>`;

function getTableStorageKey(table: HTMLTableElement, colIdx: number): string {
  const tableId = table.id || table.getAttribute("data-table-id") || "";
  const path = typeof window !== "undefined" ? window.location.pathname.replace(/[^a-zA-Z0-9]/g, "_") : "tbl";
  return `camoluk_tw_${tableId || path}_col_${colIdx}`;
}

/**
 * Verilen HTMLTableElement'i sütun genişletme ve sıralama yetenekleriyle donatır.
 */
export function enhanceTable(table: HTMLTableElement) {
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  if (!thead || !tbody) return;

  const headerRows = thead.querySelectorAll("tr");
  if (headerRows.length === 0) return;
  const thList = Array.from(headerRows[headerRows.length - 1].querySelectorAll("th"));
  if (thList.length === 0) return;

  // Başlıklar zaten donatılmış mı kontrol et (React re-render durumunda eksikleri tamamla)
  const alreadySetup = thList.every((th) => th.querySelector(".table-col-resizer"));
  if (alreadySetup && table.dataset.enhanced === "true") return;
  table.dataset.enhanced = "true";

  // Tablo konteynerine yatay kaydırma garantisi ver
  if (table.parentElement && !table.parentElement.classList.contains("overflow-x-auto")) {
    table.parentElement.classList.add("overflow-x-auto");
  }
  table.style.minWidth = "100%";

  // Form kalemleri tablosu mu? (Quote/Sale builder'da fatura sırasını bozmamak için sıralama yapılmaz)
  const isFormItemTable =
    table.closest("form") !== null ||
    table.hasAttribute("data-no-sort") ||
    table.classList.contains("no-sort-table");

  // 1. Orijinal satır indekslerini kaydet
  function tagOriginalRows() {
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.forEach((tr, i) => {
      if (!tr.dataset.tableOrigIndex) {
        tr.dataset.tableOrigIndex = String(i);
      }
    });
  }
  tagOriginalRows();

  // 2. Her sütun için Başlık, Sıralama ve Genişletme Ayarı
  thList.forEach((th, colIdx) => {
    th.style.position = "relative";

    // Kaydedilmiş genişliği yükle
    try {
      const savedWidth = localStorage.getItem(getTableStorageKey(table, colIdx));
      if (savedWidth && !isNaN(Number(savedWidth))) {
        th.style.width = `${savedWidth}px`;
        th.style.minWidth = `${savedWidth}px`;
      }
    } catch {}

    // Resizer Tutamacı Ekle
    let resizer = th.querySelector<HTMLDivElement>(".table-col-resizer");
    if (!resizer) {
      resizer = document.createElement("div");
      resizer.className = "table-col-resizer";
      resizer.title = "Sütun genişliğini ayarla (Çift tık: Sıfırla)";
      th.appendChild(resizer);
    }

    // Resizer Sürükleme Mantığı
    resizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = th.getBoundingClientRect().width;
      const minWidth = 45;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      resizer?.classList.add("is-resizing");

      // Düşey rehber çizgisi
      const guide = document.createElement("div");
      guide.className = "table-resize-guide";
      guide.style.left = `${e.clientX}px`;
      document.body.appendChild(guide);

      function onMouseMove(moveEvent: MouseEvent) {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(minWidth, startWidth + delta);
        guide.style.left = `${moveEvent.clientX}px`;
        th.style.width = `${newWidth}px`;
        th.style.minWidth = `${newWidth}px`;
      }

      function onMouseUp(upEvent: MouseEvent) {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        resizer?.classList.remove("is-resizing");
        if (guide.parentNode) guide.parentNode.removeChild(guide);

        const delta = upEvent.clientX - startX;
        const finalWidth = Math.max(minWidth, startWidth + delta);
        th.style.width = `${finalWidth}px`;
        th.style.minWidth = `${finalWidth}px`;

        try {
          localStorage.setItem(getTableStorageKey(table, colIdx), String(Math.round(finalWidth)));
        } catch {}
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // Resizer Çift Tıkla Sıfırlama
    resizer.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      th.style.width = "";
      th.style.minWidth = "";
      try {
        localStorage.removeItem(getTableStorageKey(table, colIdx));
      } catch {}
    });

    // Sıralama Yeteneği: Aksiyon sütunları veya form tabloları hariç
    const colText = (th.innerText || th.textContent || "").trim();
    const isActionCol =
      ACTION_COL_REGEX.test(colText) ||
      th.classList.contains("no-sort") ||
      th.hasAttribute("data-no-sort") ||
      colText.length === 0;

    if (!isActionCol && !isFormItemTable) {
      th.classList.add("table-sortable-th");

      // Tarih sütunu mu kontrol et (Kullanıcı İsteği: "tarihe tıklayınca en güncelden sıralasın")
      let isDateColumn = DATE_COL_REGEX.test(colText);
      if (!isDateColumn && tbody) {
        const sampleRow = tbody.querySelector("tr");
        const sampleTd = sampleRow?.querySelectorAll("td")[colIdx];
        if (sampleTd && parseCellValue(sampleTd).type === "date") {
          isDateColumn = true;
        }
      }

      th.title = isDateColumn
        ? "Tarihe göre sırala (Tıklayınca: En Güncelden Eskiye)"
        : "Sıralamak için tıklayın (A-Z / 1-9)";

      // İkon kapsayıcısı ekle
      let iconWrapper = th.querySelector<HTMLSpanElement>(".table-sort-icon");
      if (!iconWrapper) {
        iconWrapper = document.createElement("span");
        iconWrapper.className = "table-sort-icon";
        iconWrapper.innerHTML = CHEVRONS_UP_DOWN_SVG;
        th.appendChild(iconWrapper);
      }

      // Sıralama tıklama dinleyicisi
      th.addEventListener("click", (e) => {
        // Resizer'a tıklandıysa sıralamayı tetikleme
        if ((e.target as HTMLElement).classList.contains("table-col-resizer")) return;

        // Sıralama Döngüsü:
        // Tarih ise: desc (en güncel) -> asc (en eski) -> none
        // Diğerleri: asc -> desc -> none
        const currentSort = th.dataset.sortDir || "none";
        let nextSort: "asc" | "desc" | "none" = "asc";

        if (isDateColumn) {
          if (currentSort === "none") nextSort = "desc";
          else if (currentSort === "desc") nextSort = "asc";
          else nextSort = "none";
        } else {
          if (currentSort === "none") nextSort = "asc";
          else if (currentSort === "asc") nextSort = "desc";
          else nextSort = "none";
        }

        // Diğer başlıklardaki sıralama durumlarını temizle
        thList.forEach((otherTh) => {
          if (otherTh !== th) {
            delete otherTh.dataset.sortDir;
            otherTh.classList.remove("is-sorted");
            const otherIcon = otherTh.querySelector<HTMLSpanElement>(".table-sort-icon");
            if (otherIcon) otherIcon.innerHTML = CHEVRONS_UP_DOWN_SVG;
          }
        });

        // Bu başlığın durumunu güncelle
        if (nextSort === "none") {
          delete th.dataset.sortDir;
          th.classList.remove("is-sorted");
          iconWrapper!.innerHTML = CHEVRONS_UP_DOWN_SVG;
        } else {
          th.dataset.sortDir = nextSort;
          th.classList.add("is-sorted");
          iconWrapper!.innerHTML = nextSort === "asc" ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG;
        }

        // Satırları sırala
        applySort(table, colIdx, nextSort);
      });
    }
  });

  // Satır değişikliklerini izle (Örn: arama, filtre veya sekme değiştiğinde)
  const observer = new MutationObserver(() => {
    tagOriginalRows();
    // Aktif bir sıralama varsa yeni gelen satırlara da uygula
    const sortedTh = thList.find((th) => th.dataset.sortDir);
    if (sortedTh) {
      const idx = thList.indexOf(sortedTh);
      const dir = sortedTh.dataset.sortDir as "asc" | "desc";
      applySort(table, idx, dir);
    }
  });

  observer.observe(tbody, { childList: true });
}

function applySort(table: HTMLTableElement, colIdx: number, dir: "asc" | "desc" | "none") {
  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  if (rows.length <= 1) return;

  // Veri satırlarını ve colSpan olan mesaj satırlarını ayır
  const dataRows: HTMLTableRowElement[] = [];
  const otherRows: HTMLTableRowElement[] = [];

  rows.forEach((tr) => {
    const cells = tr.querySelectorAll("td");
    const hasColSpan = Array.from(cells).some((c) => c.colSpan > 1);
    if (hasColSpan || cells.length === 0) {
      otherRows.push(tr);
    } else {
      dataRows.push(tr);
    }
  });

  if (dataRows.length === 0) return;

  if (dir === "none") {
    // Orijinal sıraya geri dön
    dataRows.sort((a, b) => {
      const idxA = parseInt(a.dataset.tableOrigIndex || "0", 10);
      const idxB = parseInt(b.dataset.tableOrigIndex || "0", 10);
      return idxA - idxB;
    });
  } else {
    // asc veya desc sırala
    const asc = dir === "asc";
    dataRows.sort((trA, trB) => {
      const tdA = trA.querySelectorAll("td")[colIdx];
      const tdB = trB.querySelectorAll("td")[colIdx];
      if (!tdA && !tdB) return 0;
      if (!tdA) return 1;
      if (!tdB) return -1;

      const parsedA = parseCellValue(tdA);
      const parsedB = parseCellValue(tdB);

      return compareValues(parsedA, parsedB, asc);
    });
  }

  // Yeniden yerleştir
  dataRows.forEach((tr) => tbody.appendChild(tr));
  otherRows.forEach((tr) => tbody.appendChild(tr));
}
