"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { enhanceTable } from "./table-enhancer-utils";

/**
 * Dashboard genelinde tüm sayfalardaki <table> etiketlerini otomatik olarak
 * sütun genişletme ve tıklamayla sıralama (tarih için en güncel önce) yetenekleriyle donatır.
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

    // İlk taramalar (hemen, 80ms, 300ms ve 800ms)
    scanAndEnhance();
    const t1 = setTimeout(scanAndEnhance, 80);
    const t2 = setTimeout(scanAndEnhance, 300);
    const t3 = setTimeout(scanAndEnhance, 800);

    // Dinamik React güncellemeleri için MutationObserver
    let debounceTimer: any = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanAndEnhance, 60);
    });

    if (typeof document !== "undefined" && document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
