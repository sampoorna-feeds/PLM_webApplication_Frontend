"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { ItemLedgerEntry } from "@/lib/api/services/report-ledger.service";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ALL_COLUMNS,
  type SortDirection,
  type ColumnConfig,
} from "./column-config";

interface ReportLedgerTableProps {
  entries: ItemLedgerEntry[];
  isLoading: boolean;
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  pageSize: number;
  currentPage: number;
  onSort: (column: string) => void;
}

export function ReportLedgerTable({
  entries,
  isLoading,
  visibleColumns,
  sortColumn,
  sortDirection,
  pageSize,
  currentPage,
  onSort,
}: ReportLedgerTableProps) {
  // Get visible column configs in order
  const columns = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));

  // Calculate starting serial number for current page
  const startingSerialNo = (currentPage - 1) * pageSize;

  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          {/* Header - sticky */}
          <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
            <tr className="border-b transition-colors">
              {/* Serial Number Column Header */}
              <th className="text-foreground h-10 w-12 px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap">
                S.No
              </th>
              {columns.map((column) => (
                <SortableTableHead
                  key={column.id}
                  column={column}
                  isActive={sortColumn === column.id}
                  sortDirection={
                    sortColumn === column.id ? sortDirection : null
                  }
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {/* Loading state - show skeleton rows */}
            {isLoading && (
              <>
                {Array.from({ length: pageSize }).map((_, rowIndex) => (
                  <tr
                    key={`skeleton-${rowIndex}`}
                    className="border-b transition-colors"
                  >
                    <td className="text-muted-foreground p-2 px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
                      {startingSerialNo + rowIndex + 1}
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
            {/* Empty state */}
            {!isLoading && entries.length === 0 && (
              <tr className="border-b transition-colors">
                <td
                  colSpan={columns.length + 1}
                  className="text-muted-foreground h-24 p-2 text-center align-middle"
                >
                  No item ledger entries found. Please apply filters to search.
                </td>
              </tr>
            )}
            {/* Data rows */}
            {!isLoading &&
              entries.length > 0 &&
              entries.map((entry, index) => (
                <ItemLedgerRow
                  key={entry.Entry_No}
                  entry={entry}
                  columns={columns}
                  serialNo={startingSerialNo + index + 1}
                />
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SortableTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
}

function SortableTableHead({
  column,
  isActive,
  sortDirection,
  onSort,
}: SortableTableHeadProps) {
  if (!column.sortable) {
    return (
      <th className="text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap">
        {column.label}
      </th>
    );
  }

  return (
    <th className="text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap">
      <button
        onClick={() => onSort(column.id)}
        className="hover:text-foreground/80 flex items-center gap-1 transition-colors"
      >
        {column.label}
        {isActive && sortDirection === "asc" && <ArrowUp className="h-3 w-3" />}
        {isActive && sortDirection === "desc" && (
          <ArrowDown className="h-3 w-3" />
        )}
        {(!isActive || !sortDirection) && (
          <ArrowUpDown className="text-muted-foreground h-3 w-3" />
        )}
      </button>
    </th>
  );
}

interface ItemLedgerRowProps {
  entry: ItemLedgerEntry;
  columns: ColumnConfig[];
  serialNo: number;
}

function ItemLedgerRow({ entry, columns, serialNo }: ItemLedgerRowProps) {
  return (
    <tr className="hover:bg-muted/50 border-b transition-colors">
      <td className="text-muted-foreground p-2 px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
        {serialNo}
      </td>
      {columns.map((column) => (
        <td
          key={column.id}
          className="p-2 px-3 py-3 align-middle text-xs whitespace-nowrap"
        >
          {formatCellValue(entry[column.id], column)}
        </td>
      ))}
    </tr>
  );
}

function formatCellValue(value: unknown, column: ColumnConfig): string {
  if (value === null || value === undefined) {
    return "-";
  }

  // Format based on filter type
  switch (column.filterType) {
    case "date":
      if (typeof value === "string") {
        try {
          const date = new Date(value);
          return date.toLocaleDateString();
        } catch {
          return value;
        }
      }
      return String(value);

    case "number":
      if (typeof value === "number") {
        return value.toLocaleString();
      }
      return String(value);

    case "boolean":
      return value ? "Yes" : "No";

    default:
      return String(value);
  }
}
