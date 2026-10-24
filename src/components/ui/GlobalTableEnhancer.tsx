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
      const main = document.querySelector("main");
      if (!main) return;

      const tables = main.querySelectorAll<HTMLTableElement>("table");
      tables.forEach((tbl) => {
        try {
          enhanceTable(tbl);
        } catch (e) {
          console.error("enhanceTable error:", e);
        }
      });
    }

    // İlk tarama
    const timer = setTimeout(scanAndEnhance, 80);

    // Dinamik React güncellemeleri için MutationObserver
    const observer = new MutationObserver(() => {
      scanAndEnhance();
    });

    const main = document.querySelector("main");
    if (main) {
      observer.observe(main, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
