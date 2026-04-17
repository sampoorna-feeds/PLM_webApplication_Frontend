"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Download, Printer } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { POSTED_TRANSFER_COLUMNS, type SortDirection } from "./column-config";
import { ColumnFilter } from "./column-filter";

interface PostedTransferTableProps {
  data: any[];
  isLoading: boolean;
  visibleColumns?: string[];
  onRowClick?: (id: string) => void;
  onViewReport?: (id: string) => void;
  activeReportId?: string | null;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSort?: (column: string) => void;
  columnFilters?: Record<string, { value: string; valueTo?: string }>;
  onColumnFilter?: (columnId: string, value: string, valueTo?: string) => void;
  onDownloadRecord?: (docNo: string, docType: string, reportName: string) => void;
  onPrintRecord?: (docNo: string, docType: string, reportName: string) => void;
  type?: "shipment" | "receipt";
}

export function PostedTransferTable({ 
  data, 
  isLoading, 
  visibleColumns,
  onRowClick, 
  onViewReport, 
  activeReportId,
  sortColumn,
  sortDirection,
  onSort,
  columnFilters = {},
  onColumnFilter,
  onDownloadRecord,
  onPrintRecord,
  type = "shipment"
}: PostedTransferTableProps) {
  const columns = visibleColumns 
    ? POSTED_TRANSFER_COLUMNS.filter(col => visibleColumns.includes(col.id))
    : POSTED_TRANSFER_COLUMNS.filter(col => col.defaultVisible);

  // Filter out E-Invoice for receipts
  const filteredColumns = type === "receipt" 
    ? columns.filter(col => col.id !== "E_Invoice_No")
    : columns;

  return (
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-muted sticky top-0 z-10 border-b">
            <tr>
              <th className="text-foreground h-10 w-12 px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap">
                S.No
              </th>
              {onViewReport && (
                <th className="text-foreground h-10 w-16 px-3 py-3 text-center align-middle text-xs font-bold whitespace-nowrap">
                  Action
                </th>
              )}
              {filteredColumns.map((column) => (
                <th 
                  key={column.id} 
                  className={`text-foreground h-10 px-3 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none ${
                    sortColumn === column.id ? "text-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span 
                      className={column.sortable ? "hover:text-primary cursor-pointer transition-colors" : ""}
                      onClick={() => column.sortable && onSort?.(column.id)}
                    >
                      {column.label}
                    </span>
                    {column.sortable && (
                      <button className="hover:text-primary transition-colors" onClick={() => onSort?.(column.id)}>
                        {getSortIcon(column.id, sortColumn, sortDirection)}
                      </button>
                    )}
                    {column.filterType && onColumnFilter && (
                      <ColumnFilter
                        column={column}
                        value={columnFilters[column.id]?.value || ""}
                        valueTo={columnFilters[column.id]?.valueTo || ""}
                        onChange={(value, valueTo) => onColumnFilter(column.id, value, valueTo)}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3 text-center"><Skeleton className="h-4 w-4 mx-auto" /></td>
                  {(onViewReport ? Array.from({ length: columns.length + 1 }) : Array.from({ length: columns.length })).map((_, idx) => (
                    <td key={idx} className="p-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={filteredColumns.length + (onViewReport ? 2 : 1)} className="h-32 text-center text-muted-foreground">
                  No data found for the selected filters.
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <TransferOrderRow 
                  key={row.No}
                  row={row}
                  index={index}
                  type={type}
                  onRowClick={onRowClick}
                  onViewReport={onViewReport}
                  activeReportId={activeReportId}
                  columns={filteredColumns}
                  onDownloadRecord={onDownloadRecord}
                  onPrintRecord={onPrintRecord}
                />
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  interface TransferOrderRowProps {
    row: any;
    index: number;
    type: "shipment" | "receipt";
    onRowClick?: (id: string) => void;
    onViewReport?: (id: string) => void;
    activeReportId?: string | null;
    columns: any[];
    onDownloadRecord?: (docNo: string, docType: string, reportName: string) => void;
    onPrintRecord?: (docNo: string, docType: string, reportName: string) => void;
  }

  function TransferOrderRow({
    row,
    index,
    type,
    onRowClick,
    onViewReport,
    activeReportId,
    columns,
    onDownloadRecord,
    onPrintRecord
  }: TransferOrderRowProps) {
    return (
      <tr
        className={`border-b transition-colors ${onRowClick ? "hover:bg-muted cursor-pointer" : ""}`}
        onClick={() => onRowClick?.(row.No)}
      >
        <td className="text-muted-foreground p-3 text-center text-xs whitespace-nowrap">
          {index + 1}
        </td>
        {onViewReport && (
          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                      onClick={() => onViewReport(row.No)}
                      disabled={activeReportId === row.No}
                    >
                      {activeReportId === row.No ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>View {type === "shipment" ? "Shipment" : "Receipt"} Report</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                      onClick={() => onPrintRecord?.(row.No, "Transfer", "E-way Bill")}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Print E-way Bill</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </td>
        )}
        {columns.map(col => (
          <td key={col.id} className="p-3 text-xs whitespace-nowrap text-muted-foreground">
            {col.id === "E_Way_Bill_No" || col.id === "E_Invoice_No" ? (
              <span className="font-medium text-foreground">{row[col.id] || "-"}</span>
            ) : (
              formatValue(row[col.id], col.id)
            )}
          </td>
        ))}
      </tr>
    );
  }

function getSortIcon(columnId: string, sortColumn?: string | null, sortDirection?: SortDirection) {
  if (sortColumn !== columnId || !sortDirection) {
    return <ArrowUpDown className="h-3 w-3 opacity-50" />;
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );
}

function formatValue(value: any, columnId: string) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  
  if (columnId === "Posting_Date" && typeof value === "string" && value !== "0001-01-01") {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date.toLocaleDateString();
    } catch { /* ignore */ }
  }
  
  return String(value);
}
