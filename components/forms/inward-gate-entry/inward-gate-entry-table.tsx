"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { InwardGateEntryHeader } from "@/lib/api/services/inward-gate-entry.service";
import {
  type SortDirection,
  type ColumnConfig,
} from "./column-config";

interface InwardGateEntryTableProps {
  entries: InwardGateEntryHeader[];
  isLoading: boolean;
  visibleColumns: string[];
  allColumns: ColumnConfig[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  onRowClick?: (entry: InwardGateEntryHeader) => void;
  onSort: (column: string) => void;
}

export function InwardGateEntryTable({
  entries,
  isLoading,
  visibleColumns,
  allColumns,
  sortColumn,
  sortDirection,
  onRowClick,
  onSort,
}: InwardGateEntryTableProps) {
  const columns = allColumns.filter((col) => visibleColumns.includes(col.id));

  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
            <tr className="border-b transition-colors">
              <th className="text-foreground h-10 w-12 px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap">
                S.No
              </th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`text-foreground h-10 px-2 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none ${
                    sortColumn === column.id ? "text-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="hover:text-primary cursor-pointer transition-colors"
                      onClick={() => column.sortable && onSort(column.id)}
                    >
                      {column.label}
                    </span>
                    {column.sortable && (
                      <button
                        type="button"
                        className="hover:text-primary transition-colors"
                        onClick={() => onSort(column.id)}
                      >
                        {sortColumn === column.id ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading && (
              <>
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <tr
                    key={`skeleton-${rowIndex}`}
                    className="border-b transition-colors"
                  >
                    <td className="text-muted-foreground p-2 px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
                      {rowIndex + 1}
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className="p-2 px-3 py-3 align-middle whitespace-nowrap"
                      >
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
            {!isLoading && entries.length === 0 && (
              <tr className="border-b transition-colors">
                <td
                  colSpan={columns.length + 1}
                  className="text-muted-foreground h-24 p-2 text-center align-middle"
                >
                  No entries found
                </td>
              </tr>
            )}
            {!isLoading &&
              entries.length > 0 &&
              entries.map((entry, index) => (
                <tr
                  key={entry.id || entry["No."] || `row-${index}`}
                  className={`border-b transition-colors ${
                    onRowClick ? "hover:bg-muted cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(entry)}
                >
                  <td className="text-muted-foreground p-2 px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
                    {index + 1}
                  </td>
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className="p-2 px-3 py-3 align-middle text-xs whitespace-nowrap"
                    >
                      {formatValue(entry[column.id], column.id)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatValue(value: any, columnId: string): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "number") {
    if (columnId.includes("Weight") || columnId.includes("Amount") || columnId.includes("Charges")) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toString();
  }

  if (columnId.includes("Date") && typeof value === "string") {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    } catch {
      // ignore
    }
  }

  return String(value);
}
