"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, X, Loader2 } from "lucide-react";
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
import { formatDate } from "@/lib/utils/date";

interface ReportLedgerTableProps {
  entries: ItemLedgerEntry[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => void;
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  onFilter: (columnId: string, value: string, valueTo?: string) => void;
  onClearColumnFilters: () => void;
}

export function ReportLedgerTable({
  entries,
  isLoading,
  isFetchingNextPage,
  hasMore,
  loadMore,
  visibleColumns,
  sortColumn,
  sortDirection,
  onSort,
  columnFilters,
  onFilter,
  onClearColumnFilters,
}: ReportLedgerTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (
        target.isIntersecting &&
        hasMore &&
        !isFetchingNextPage &&
        !isLoading
      ) {
        loadMore();
      }
    },
    [hasMore, isFetchingNextPage, isLoading, loadMore],
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "100px",
      root: scrollContainerRef.current,
    });

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [handleObserver]);

  // Get visible column configs in order
  const columns = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));

  // Starting serial number is 0 for infinite scroll
  const startingSerialNo = 0;

  // Count active column filters
  const activeFilterCount = Object.values(columnFilters).filter(
    (f) => f.value.trim() !== "" || (f.valueTo && f.valueTo.trim() !== ""),
  ).length;

  // Client-side filtering is removed - entries are filtered at the API level
  const filteredEntries = entries;

  const clearAllColumnFilters = () => {
    onClearColumnFilters();
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

      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
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
                  column={column}
                  isActive={sortColumn === column.id}
                  sortDirection={
                    sortColumn === column.id ? sortDirection : null
                  }
                  filterValue={columnFilters[column.id]?.value || ""}
                  filterValueTo={columnFilters[column.id]?.valueTo || ""}
                  onSort={onSort}
                  onFilter={onFilter}
                />
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {/* Loading state - show skeleton rows */}
            {isLoading && (
              <>
                {Array.from({ length: 20 }).map((_, rowIndex) => (
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
                  serialNo={index + 1}
                />
              ))}

            {/* Infinite Load Target */}
            <tr className="h-10 pointer-events-none border-none">
              <td colSpan={columns.length + 1} className="p-0 border-none">
                <div ref={observerTarget} className="h-full w-full" />
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading more...</span>
                  </div>
                )}
              </td>
            </tr>
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
          return formatDate(date);
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
