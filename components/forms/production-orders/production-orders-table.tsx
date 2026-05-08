"use client";

import React, { useEffect, useRef } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Loader2 } from "lucide-react";
import type { ProductionOrder } from "@/lib/api/services/production-orders.service";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ALL_COLUMNS,
  type SortDirection,
  type ColumnConfig,
} from "./column-config";
import { ColumnFilter } from "./column-filter";
import { formatDate } from "@/lib/utils/date";

interface ProductionOrdersTableProps {
  orders: ProductionOrder[];
  isLoading: boolean;
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  pageSize: number;
  currentPage: number;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  onRowClick: (orderNo: string) => void;
  onSort: (column: string) => void;
  onColumnFilter: (columnId: string, value: string, valueTo?: string) => void;
  branchOptions: { label: string; value: string }[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function ProductionOrdersTable({
  orders,
  isLoading,
  visibleColumns,
  sortColumn,
  sortDirection,
  pageSize,
  currentPage,
  columnFilters,
  onRowClick,
  onSort,
  onColumnFilter,
  branchOptions = [],
  onLoadMore,
  hasMore,
  isLoadingMore,
}: ProductionOrdersTableProps) {
  // Get visible column configs in order
  const columns = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore?.();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          {/* Header is ALWAYS visible with filters - sticky */}
          <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
            <tr className="border-b transition-colors">
              {/* Serial Number Column Header */}
              <th className="text-foreground h-10 w-12 px-3 py-3 text-center align-middle text-xs font-medium whitespace-nowrap">
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
                  onFilter={onColumnFilter}
                  options={
                    column.id === "Shortcut_Dimension_2_Code"
                      ? branchOptions
                      : undefined
                  }
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
            {!isLoading && orders.length === 0 && (
              <tr className="border-b transition-colors">
                <td
                  colSpan={columns.length + 1}
                  className="text-muted-foreground h-24 p-2 text-center align-middle"
                >
                  No production orders found
                </td>
              </tr>
            )}
            {/* Data rows */}
            {orders.map((order, index) => (
              <ProductionOrderRow
                key={order.No}
                order={order}
                columns={columns}
                serialNo={index + 1}
                onClick={() => onRowClick(order.No)}
              />
            ))}
            {!isLoading && (
              <tr ref={sentinelRef}>
                <td colSpan={columns.length + 1} className="h-px p-0">
                  {isLoadingMore && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </td>
              </tr>
            )}
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
  options?: { label: string; value: string }[];
}

function SortableTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  filterValueTo,
  onSort,
  onFilter,
  options,
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
            options={options}
          />
        )}
      </div>
    </th>
  );
}

interface ProductionOrderRowProps {
  order: ProductionOrder;
  columns: ColumnConfig[];
  serialNo: number;
  onClick: () => void;
}

function ProductionOrderRow({
  order,
  columns,
  serialNo,
  onClick,
}: ProductionOrderRowProps) {
  const getCellValue = (columnId: string): string => {
    const value = (order as unknown as Record<string, unknown>)[columnId];

    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (
      columnId.includes("Date") &&
      typeof value === "string" &&
      value !== "0001-01-01"
    ) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch {
        // ignore
      }
    }

    return String(value);
  };

  return (
    <tr
      tabIndex={0}
      className="border-b transition-colors cursor-default outline-none hover:bg-muted/50 focus:bg-primary/10"
      onClick={(e) => (e.currentTarget as HTMLElement).focus()}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = e.currentTarget.nextElementSibling as HTMLElement;
          if (next?.tabIndex >= 0) next.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = e.currentTarget.previousElementSibling as HTMLElement;
          if (prev?.tabIndex >= 0) prev.focus();
        } else if (e.key === "Enter") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <td className="text-muted-foreground p-2 px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
        {serialNo}
      </td>
      {columns.map((column) => (
        <td
          key={column.id}
          className="p-2 px-3 py-3 align-middle text-xs whitespace-nowrap"
        >
          {column.id === "No" ? (
            <span
              className="text-primary cursor-pointer hover:underline underline-offset-2 font-medium"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              {getCellValue(column.id)}
            </span>
          ) : (
            getCellValue(column.id)
          )}
        </td>
      ))}
    </tr>
  );
}
