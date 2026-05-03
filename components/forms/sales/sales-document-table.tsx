"use client";

import React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SalesOrder } from "@/lib/api/services/sales-orders.service";
import { Skeleton } from "@/components/ui/skeleton";
import { type SortDirection, type ColumnConfig } from "./column-config";
import { SalesDocumentColumnFilter } from "./sales-document-column-filter";

interface SalesDocumentTableProps {
  orders: SalesOrder[];
  isLoading: boolean;
  visibleColumns: string[];
  allColumns: ColumnConfig[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  pageSize: number;
  currentPage: number;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  emptyMessage?: string;
  onRowClick?: (orderNo: string) => void;
  onSort: (column: string) => void;
  onColumnFilter: (columnId: string, value: string, valueTo?: string) => void;
  renderRowAction?: (row: SalesOrder) => React.ReactNode;
}

export function SalesDocumentTable({
  orders,
  isLoading,
  visibleColumns,
  allColumns,
  sortColumn,
  sortDirection,
  pageSize,
  currentPage,
  columnFilters,
  emptyMessage = "No documents found",
  onRowClick,
  onSort,
  onColumnFilter,
  renderRowAction,
}: SalesDocumentTableProps) {
  const columns = allColumns.filter((col) => visibleColumns.includes(col.id));
  const startingSerialNo = (currentPage - 1) * pageSize;

  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm table-auto">
          <colgroup>
            <col className="w-12" />
            {renderRowAction && <col className="w-16" />}
            {columns.map((column) => (
              <col key={column.id} className={column.width ? undefined : "w-auto"} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
          <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
            <tr className="border-b transition-colors">
              <th className="text-foreground h-12 w-12 px-1 py-3 text-center align-middle text-xs font-bold whitespace-nowrap">
                S.No
              </th>
              {renderRowAction && (
                <th className="text-foreground bg-muted h-12 w-16 px-1 py-3 text-center align-middle text-xs font-bold whitespace-nowrap" />
              )}
              {columns.map((column) => (
                <SortableTableHead
                  key={column.id}
                  column={column}
                  isActive={sortColumn === column.id}
                  sortDirection={sortColumn === column.id ? sortDirection : null}
                  filterValue={columnFilters[column.id]?.value ?? ""}
                  filterValueTo={columnFilters[column.id]?.valueTo}
                  onSort={onSort}
                  onFilter={onColumnFilter}
                />
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading && (
              <>
                {Array.from({ length: pageSize }).map((_, rowIndex) => (
                  <tr
                    key={`skeleton-${rowIndex}`}
                    className="border-b transition-colors"
                  >
                    <td className="text-muted-foreground p-1 px-1 py-3 text-center align-middle text-xs whitespace-nowrap">
                      {startingSerialNo + rowIndex + 1}
                    </td>
                    {renderRowAction && <td className="px-1 py-3" />}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className="p-1 px-1 py-3 align-middle whitespace-nowrap"
                      >
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
            {!isLoading && orders.length === 0 && (
              <tr className="border-b transition-colors">
                <td
                  colSpan={columns.length + (renderRowAction ? 2 : 1)}
                  className="text-muted-foreground h-24 p-2 text-center align-middle"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!isLoading &&
              orders.length > 0 &&
              orders.map((order, index) => (
                <SalesDocumentRow
                  key={order.No}
                  order={order}
                  columns={columns}
                  serialNo={startingSerialNo + index + 1}
                  onClick={onRowClick ? () => onRowClick(order.No) : undefined}
                  renderRowAction={renderRowAction}
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
  filterValueTo?: string;
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
      className={`text-foreground h-12 px-1 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none ${column.width ? "" : "min-w-max"} ${
        isActive ? "text-primary" : ""
      }`}
      style={column.width ? { width: column.width, minWidth: column.width } : undefined}
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
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <SalesDocumentColumnFilter
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

interface SalesDocumentRowProps {
  order: SalesOrder;
  columns: ColumnConfig[];
  serialNo: number;
  onClick?: () => void;
  renderRowAction?: (row: SalesOrder) => React.ReactNode;
}

function SalesDocumentRow({
  order,
  columns,
  serialNo,
  onClick,
  renderRowAction,
}: SalesDocumentRowProps) {
  const getCellValue = (columnId: string): string => {
    const value = (order as Record<string, unknown>)[columnId];

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
          return date.toLocaleDateString();
        }
      } catch {
        // ignore
      }
    }

    if (columnId === "Amt_to_Customer" && typeof value === "number") {
      return String(value);
    }

    return String(value);
  };

  return (
    <tr
      className={`border-b transition-colors ${
        onClick ? "hover:bg-muted cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <td className="text-muted-foreground p-1 px-1 py-3 text-center align-middle text-xs whitespace-nowrap">
        {serialNo}
      </td>
      {renderRowAction && (
        <td className="px-1 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
          {renderRowAction(order)}
        </td>
      )}
      {columns.map((column) => (
        <td
          key={column.id}
          className="p-1 px-1 py-3 align-middle text-xs whitespace-nowrap"
        >
          {getCellValue(column.id)}
        </td>
      ))}
    </tr>
  );
}
