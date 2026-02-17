"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SalesOrder } from "@/lib/api/services/sales-orders.service";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ALL_COLUMNS,
  type SortDirection,
  type ColumnConfig,
} from "./column-config";
import { SalesOrderColumnFilter } from "./column-filter";

interface SalesOrdersTableProps {
  orders: SalesOrder[];
  isLoading: boolean;
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  pageSize: number;
  currentPage: number;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  onRowClick?: (orderNo: string) => void;
  onSort: (column: string) => void;
  onColumnFilter: (columnId: string, value: string, valueTo?: string) => void;
}

export function SalesOrdersTable({
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
}: SalesOrdersTableProps) {
  const columns = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));
  const startingSerialNo = (currentPage - 1) * pageSize;

  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border">
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted sticky top-0 z-10 [&_tr]:border-b">
            <tr className="border-b transition-colors">
              <th className="text-foreground h-10 w-12 px-3 py-3 text-center align-middle text-xs font-bold font-medium whitespace-nowrap">
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
            {!isLoading && orders.length === 0 && (
              <tr className="border-b transition-colors">
                <td
                  colSpan={columns.length + 1}
                  className="text-muted-foreground h-24 p-2 text-center align-middle"
                >
                  No sales orders found
                </td>
              </tr>
            )}
            {!isLoading &&
              orders.length > 0 &&
              orders.map((order, index) => (
                <SalesOrderRow
                  key={order.No}
                  order={order}
                  columns={columns}
                  serialNo={startingSerialNo + index + 1}
                  onClick={onRowClick ? () => onRowClick(order.No) : undefined}
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
      className={`text-foreground h-10 px-2 px-3 py-3 text-left align-middle text-xs font-bold font-medium whitespace-nowrap select-none ${
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
            type="button"
            className="hover:text-primary transition-colors"
            onClick={() => onSort(column.id)}
          >
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <SalesOrderColumnFilter
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

interface SalesOrderRowProps {
  order: SalesOrder;
  columns: ColumnConfig[];
  serialNo: number;
  onClick?: () => void;
}

function SalesOrderRow({
  order,
  columns,
  serialNo,
  onClick,
}: SalesOrderRowProps) {
  const getCellValue = (columnId: string): string => {
    const value = (order as Record<string, unknown>)[columnId];

    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    // Format dates
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

    // Format numbers (amount)
    if (columnId === "Amt_to_Customer" && typeof value === "number") {
      return value.toLocaleString();
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
      <td className="text-muted-foreground p-2 px-3 py-3 text-center align-middle text-xs whitespace-nowrap">
        {serialNo}
      </td>
      {columns.map((column) => (
        <td
          key={column.id}
          className="p-2 px-3 py-3 align-middle text-xs whitespace-nowrap"
        >
          {getCellValue(column.id)}
        </td>
      ))}
    </tr>
  );
}
