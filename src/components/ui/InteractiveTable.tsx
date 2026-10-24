"use client";

import React, { useRef, useEffect } from "react";
import { enhanceTable } from "./table-enhancer-utils";

interface InteractiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  tableId?: string;
  children: React.ReactNode;
}

/**
 * Belirli bir tabloyu doğrudan sarmalamak için kullanılan Client Component.
 */
export function InteractiveTable({
  tableId,
  children,
  className = "",
  ...props
}: InteractiveTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function setup() {
      if (!containerRef.current) return;
      const table = containerRef.current.querySelector<HTMLTableElement>("table");
      if (table) {
        if (tableId && !table.id) {
          table.id = tableId;
        }
        enhanceTable(table);
      }
    }

    setup();
    const t1 = setTimeout(setup, 60);
    const t2 = setTimeout(setup, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tableId, children]);

  return (
    <div
      ref={containerRef}
      className={`overflow-x-auto w-full ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
