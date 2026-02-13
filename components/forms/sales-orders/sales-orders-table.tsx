"use client";

import { ArrowUp, ArrowDown, ArrowUpDown, Eye, Pencil, Check, RotateCcw } from "lucide-react";
import type { SalesOrder } from "@/lib/api/services/sales-orders.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  ALL_COLUMNS,
  type SortDirection,
  type ColumnConfig,
} from "./column-config";
import { SalesOrderColumnFilter } from "./column-filter";
import type { SalesOrderStatusTab } from "./use-sales-orders";

interface SalesOrdersTableProps {
  orders: SalesOrder[];
  isLoading: boolean;
  visibleColumns: string[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  pageSize: number;
  currentPage: number;
  columnFilters: Record<string, { value: string; valueTo?: string }>;
  /** Current tab filter; used to show correct row actions (Open | Pending Approval | Released). */
  statusFilter?: SalesOrderStatusTab;
  onRowClick?: (orderNo: string) => void;
  onApprove?: (orderNo: string) => void;
  onReopen?: (orderNo: string) => void;
  onEdit?: (orderNo: string) => void;
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
  statusFilter,
  onRowClick,
  onApprove,
  onReopen,
  onEdit,
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
              <th className="text-foreground bg-muted border-border sticky right-0 z-10 h-10 w-24 min-w-24 border-l px-2 py-3 text-center align-middle text-xs font-bold font-medium whitespace-nowrap shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">
                Actions
              </th>
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
                    <td className="bg-muted border-border sticky right-0 w-24 min-w-24 border-l p-2 px-3 py-3 align-middle shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]" />
                  </tr>
                ))}
              </>
            )}
            {!isLoading && orders.length === 0 && (
              <tr className="border-b transition-colors">
                <td
                  colSpan={columns.length + 2}
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
                  statusFilter={statusFilter}
                  onView={onRowClick ? () => onRowClick(order.No) : undefined}
                  onEdit={onEdit ? () => onEdit(order.No) : undefined}
                  onApprove={onApprove ? () => onApprove(order.No) : undefined}
                  onReopen={onReopen ? () => onReopen(order.No) : undefined}
                  onClick={
                    onRowClick
                      ? () => onRowClick(order.No)
                      : undefined
                  }
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
  statusFilter?: SalesOrderStatusTab;
  onView?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReopen?: () => void;
  onClick?: () => void;
}

function SalesOrderRow({
  order,
  columns,
  serialNo,
  statusFilter,
  onView,
  onEdit,
  onApprove,
  onReopen,
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

  const handleActionClick = (e: React.MouseEvent, fn?: () => void) => {
    e.stopPropagation();
    fn?.();
  };

  const showEdit = statusFilter === "Open" || statusFilter === "Pending Approval";
  const showApprove = statusFilter === "Open";
  const showReopen = statusFilter === "Pending Approval" || statusFilter === "Released";

  const rowContent = (
    <>
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
      <td className="bg-muted border-border sticky right-0 w-24 min-w-24 border-l p-2 px-3 py-3 align-middle shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-center gap-0.5">
          {onView && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-7 w-7"
              onClick={(e) => handleActionClick(e, onView)}
              title="View"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          {showEdit && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-7 w-7"
              onClick={(e) => handleActionClick(e, onEdit)}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {showApprove && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-7 w-7"
              onClick={(e) => handleActionClick(e, onApprove)}
              title="Approve"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {showReopen && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-7 w-7"
              onClick={(e) => handleActionClick(e, onReopen)}
              title="Reopen"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr
          className={`border-b transition-colors ${
            onClick ? "hover:bg-muted cursor-pointer" : ""
          }`}
          onClick={onClick}
        >
          {rowContent}
        </tr>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-40">
        {onView && (
          <ContextMenuItem onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </ContextMenuItem>
        )}
        {onEdit && (
          <ContextMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </ContextMenuItem>
        )}
        {(showApprove || showReopen) && (
          <>
            <ContextMenuSeparator />
            {showApprove && onApprove && (
              <ContextMenuItem onClick={onApprove}>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </ContextMenuItem>
            )}
            {showReopen && onReopen && (
              <ContextMenuItem onClick={onReopen}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
