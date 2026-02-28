"use client";

import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, X } from "lucide-react";
import type { ItemLedgerEntry } from "@/lib/api/services/report-ledger.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ALL_COLUMNS,
  type SortDirection,
  type ColumnConfig,
} from "./column-config";
import { ColumnFilter } from "./column-filter";
import type { ReportLedgerFilters } from "./types";

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
  // Column filters state (for columns that are NOT synced with top-level filters)
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});

  // Get visible column configs in order
  const columns = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));

  // Calculate starting serial number for current page
  const startingSerialNo = (currentPage - 1) * pageSize;

  // Count active column filters
  const activeFilterCount = Object.values(columnFilters).filter(
    (f) => f.value.trim() !== "" || (f.valueTo && f.valueTo.trim() !== ""),
  ).length;

  // Client-side filtering
  const filteredEntries = useMemo(() => {
    if (activeFilterCount === 0) return entries;

    return entries.filter((entry) => {
      return Object.entries(columnFilters).every(([columnId, filter]) => {
        if (!filter.value.trim() && (!filter.valueTo || !filter.valueTo.trim()))
          return true;

        const cellValue = entry[columnId];
        const column = ALL_COLUMNS.find((c) => c.id === columnId);

        if (cellValue === null || cellValue === undefined) return false;

        switch (column?.filterType) {
          case "boolean": {
            if (filter.value === "true") return cellValue === true;
            if (filter.value === "false") return cellValue === false;
            return true;
          }
          case "number": {
            const val = filter.value;
            if (val.startsWith("eq:")) {
              const num = parseFloat(val.slice(3));
              return !isNaN(num) && Number(cellValue) === num;
            }
            if (val.startsWith("gt:")) {
              const num = parseFloat(val.slice(3));
              return !isNaN(num) && Number(cellValue) > num;
            }
            if (val.startsWith("lt:")) {
              const num = parseFloat(val.slice(3));
              return !isNaN(num) && Number(cellValue) < num;
            }
            // Range filter
            if (val && filter.valueTo) {
              const min = parseFloat(val);
              const max = parseFloat(filter.valueTo);
              const num = Number(cellValue);
              return num >= min && num <= max;
            }
            // Plain text match fallback
            return String(cellValue).includes(val);
          }
          case "date": {
            const dateVal = String(cellValue);
            if (filter.value && filter.valueTo) {
              return dateVal >= filter.value && dateVal <= filter.valueTo;
            }
            if (filter.value) {
              return dateVal >= filter.value;
            }
            if (filter.valueTo) {
              return dateVal <= filter.valueTo;
            }
            return true;
          }
          case "text": {
            const textFilter = filter.value.trim().toLowerCase();
            // Support comma-separated values
            const values = textFilter
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            if (values.length === 0) return true;
            const cellStr = String(cellValue).toLowerCase();
            return values.some((v) => cellStr.includes(v));
          }
          default: {
            return String(cellValue)
              .toLowerCase()
              .includes(filter.value.trim().toLowerCase());
          }
        }
      });
    });
  }, [entries, columnFilters, activeFilterCount]);

  // Precompute unique values for text columns for the checkbox filters
  const textColumnOptions = useMemo(() => {
    const options: Record<string, { value: string; label: string }[]> = {};
    columns.forEach((col) => {
      if (
        col.filterType === "text" ||
        col.filterType === "enum" ||
        col.filterType === "date"
      ) {
        const uniqueValues = new Set<string>();
        entries.forEach((entry) => {
          const val = entry[col.id];
          if (val && typeof val === "string") {
            uniqueValues.add(val.trim());
          }
        });
        options[col.id] = Array.from(uniqueValues)
          .filter(Boolean)
          .sort()
          .map((v) => ({ value: v, label: v }));
      }
    });
    return options;
  }, [entries, columns]);

  const handleColumnFilter = (
    columnId: string,
    value: string,
    valueTo?: string,
  ) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnId]: { value, valueTo },
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({});
  };

  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      {/* Active column filter indicator */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between border-b px-3 py-1.5">
          <span className="text-muted-foreground text-xs">
            {activeFilterCount} column filter{activeFilterCount > 1 ? "s" : ""}{" "}
            active · Showing {filteredEntries.length} of {entries.length} rows
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-xs"
            onClick={clearAllColumnFilters}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
            <tr className="border-b transition-colors">
              {/* Serial Number Column Header */}
              <th className="text-foreground h-10 w-12 px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap">
                S.No
              </th>
              {columns.map((column) => (
                <SortableTableHead
                  key={column.id}
                  column={{
                    ...column,
                    filterOptions:
                      textColumnOptions[column.id] || column.filterOptions,
                  }}
                  isActive={sortColumn === column.id}
                  sortDirection={
                    sortColumn === column.id ? sortDirection : null
                  }
                  filterValue={columnFilters[column.id]?.value || ""}
                  filterValueTo={columnFilters[column.id]?.valueTo || ""}
                  onSort={onSort}
                  onFilter={handleColumnFilter}
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
            {!isLoading && filteredEntries.length === 0 && (
              <tr className="border-b transition-colors">
                <td
                  colSpan={columns.length + 1}
                  className="text-muted-foreground h-24 p-2 text-center align-middle"
                >
                  {entries.length > 0 && activeFilterCount > 0
                    ? "No entries match the column filters."
                    : "No item ledger entries found. Please apply filters to search."}
                </td>
              </tr>
            )}
            {/* Data rows */}
            {!isLoading &&
              filteredEntries.length > 0 &&
              filteredEntries.map((entry, index) => (
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
  filterValue: string;
  filterValueTo: string;
  onSort: (column: string) => void;
  onFilter: (columnId: string, value: string, valueTo?: string) => void;
}

function SortableTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  filterValueTo,
  onSort,
  onFilter,
}: SortableTableHeadProps) {
  const getSortIcon = () => {
    if (!isActive || !sortDirection) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th
      className={`text-foreground h-10 px-2 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none ${
        isActive ? "text-primary" : ""
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
            className="hover:text-primary transition-colors"
            onClick={() => onSort(column.id)}
          >
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <ColumnFilter
            column={column}
            value={filterValue}
            valueTo={filterValueTo}
            onChange={(value, valueTo) => onFilter(column.id, value, valueTo)}
          />
        )}
      </div>
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
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  // Format based on filter type
  switch (column.filterType) {
    case "date":
      if (typeof value === "string") {
        try {
          const date = new Date(value);
          return date.toLocaleDateString("en-IN");
        } catch {
          return value;
        }
      }
      return String(value);

    case "number":
      if (typeof value === "number") {
        return value.toLocaleString("en-IN");
      }
      return String(value);

    case "boolean":
      return value ? "Yes" : "No";

    default:
      return String(value);
  }
}
