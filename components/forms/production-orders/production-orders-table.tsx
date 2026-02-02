"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { ProductionOrder } from "@/lib/api/services/production-orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ALL_COLUMNS, type SortDirection, type ColumnConfig } from "./column-config";
import { ColumnFilter } from "./column-filter";

interface ProductionOrdersTableProps {
  orders: ProductionOrder[];
  isLoading: boolean;
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  pageSize: number;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  onRowClick: (orderNo: string) => void;
  onSort: (column: string) => void;
  onColumnFilter: (columnId: string, value: string, valueTo?: string) => void;
}

export function ProductionOrdersTable({
  orders,
  isLoading,
  visibleColumns,
  sortColumn,
  sortDirection,
  pageSize,
  columnFilters,
  onRowClick,
  onSort,
  onColumnFilter,
}: ProductionOrdersTableProps) {
  // Get visible column configs in order
  const columns = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          {/* Header is ALWAYS visible with filters */}
          <TableHeader>
            <TableRow className="bg-muted">
              {columns.map((column) => (
                <SortableTableHead
                  key={column.id}
                  column={column}
                  isActive={sortColumn === column.id}
                  sortDirection={sortColumn === column.id ? sortDirection : null}
                  filterValue={columnFilters[column.id]?.value || ""}
                  filterValueTo={columnFilters[column.id]?.valueTo || ""}
                  onSort={onSort}
                  onFilter={onColumnFilter}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading state - show skeleton rows */}
            {isLoading && (
              <>
                {Array.from({ length: pageSize }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell key={column.id} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            )}
            {/* Empty state */}
            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No production orders found
                </TableCell>
              </TableRow>
            )}
            {/* Data rows */}
            {!isLoading && orders.length > 0 && orders.map((order) => (
              <ProductionOrderRow
                key={order.No}
                order={order}
                columns={columns}
                onClick={() => onRowClick(order.No)}
              />
            ))}
          </TableBody>
        </Table>
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
    <TableHead
      className={`px-3 py-3 text-xs font-bold select-none ${
        isActive ? "text-primary" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="cursor-pointer hover:text-primary transition-colors"
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
    </TableHead>
  );
}

interface ProductionOrderRowProps {
  order: ProductionOrder;
  columns: ColumnConfig[];
  onClick: () => void;
}

function ProductionOrderRow({ order, columns, onClick }: ProductionOrderRowProps) {
  // Helper to get cell value
  const getCellValue = (columnId: string): string => {
    const value = (order as unknown as Record<string, unknown>)[columnId];
    
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    
    // Format boolean values
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    
    // Format dates
    if (columnId.includes("Date") && typeof value === "string" && value !== "0001-01-01") {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      } catch {
        // Return as-is if parsing fails
      }
    }
    
    return String(value);
  };

  return (
    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={onClick}>
      {columns.map((column) => (
        <TableCell key={column.id} className="px-3 py-3 text-xs">
          {getCellValue(column.id)}
        </TableCell>
      ))}
    </TableRow>
  );
}

interface SkeletonTableProps {
  columns: ColumnConfig[];
  rowCount: number;
}

function SkeletonTable({ columns, rowCount }: SkeletonTableProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              {columns.map((column) => (
                <TableHead key={column.id} className="px-3 py-3 text-xs font-bold">
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={column.id} className="px-3 py-3">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <p className="text-muted-foreground">No production orders found</p>
    </div>
  );
}
