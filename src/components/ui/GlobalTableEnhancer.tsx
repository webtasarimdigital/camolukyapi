"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { enhanceTable } from "./table-enhancer-utils";

/**
 * Dashboard genelinde tüm sayfalardaki <table> etiketlerini otomatik olarak
 * sütun genişletme ve tıklamayla sıralama yetenekleriyle donatır.
 */
export function GlobalTableEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    function scanAndEnhance() {
      const tables = document.querySelectorAll<HTMLTableElement>("table");
      tables.forEach((tbl) => {
        try {
          enhanceTable(tbl);
        } catch (e) {
          console.error("enhanceTable error:", e);
        }
      });
    }

    // İlk taramalar (hemen, 100ms ve 400ms)
    scanAndEnhance();
    const t1 = setTimeout(scanAndEnhance, 100);
    const t2 = setTimeout(scanAndEnhance, 400);

    // Yalnızca yeni bir tablo veya sayfa eklendiğinde tetiklenen akıllı observer
    let debounceTimer: any = null;
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        const targetEl = m.target as HTMLElement | null;

        // Resizer veya rehber çizgisi kaynaklı mutasyonları yoksay
        if (targetEl?.classList?.contains("table-resize-guide")) continue;
        if (targetEl?.closest?.(".table-col-resizer")) continue;

        // Eklenen düğümlerde tablo var mı kontrol et
        for (let j = 0; j < m.addedNodes.length; j++) {
          const node = m.addedNodes[j] as HTMLElement;
          if (node.nodeType === 1 && (node.tagName === "TABLE" || node.querySelector?.("table"))) {
            shouldScan = true;
            break;
          }
        }
        if (shouldScan) break;
      }

      if (shouldScan) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(scanAndEnhance, 150);
      }
    });

    if (typeof document !== "undefined" && document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
