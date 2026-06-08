"use client";

import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Download, Printer, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { POSTED_TRANSFER_COLUMNS, type SortDirection } from "./column-config";
import { ColumnFilter } from "./column-filter";
import { formatDate } from "@/lib/utils/date";

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
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
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
  type = "shipment",
  onLoadMore,
  hasMore,
  isLoadingMore,
}: PostedTransferTableProps) {
  const columns = visibleColumns 
    ? POSTED_TRANSFER_COLUMNS.filter(col => visibleColumns.includes(col.id))
    : POSTED_TRANSFER_COLUMNS.filter(col => col.defaultVisible);

  // Filter out E-Invoice for receipts
  const filteredColumns = type === "receipt" 
    ? columns.filter(col => col.id !== "E_Invoice_No")
    : columns;

  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore?.();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: "100px",
      },
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
    <div className="bg-card flex h-full flex-1 flex-col overflow-hidden rounded-lg border shadow-sm w-full">
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto">
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
              <>
                {data.map((row, index) => (
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
                ))}
                {!isLoading && (
                  <tr ref={sentinelRef}>
                    <td colSpan={filteredColumns.length + (onViewReport ? 2 : 1)} className="p-0 border-0 bg-transparent">
                      <div className="w-full flex items-center justify-center transition-all duration-200">
                        {isLoadingMore ? (
                          <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground font-medium animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span>Loading more records...</span>
                          </div>
                        ) : (
                          <div className="h-4 w-full" />
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
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
            onRowClick?.(row.No);
          }
        }}
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

              {type === "shipment" ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                        onClick={() => onPrintRecord?.(row.No, "Transfer", "E-way Bill")}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>View E-way Bill</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                        onClick={() => onPrintRecord?.(row.No, "Transfer", "Receipt Report")}
                        disabled={activeReportId === row.No}
                      >
                        {activeReportId === row.No ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Print Receipt Report</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </td>
        )}
        {columns.map(col => (
          <td key={col.id} className="p-3 text-xs whitespace-nowrap text-muted-foreground">
            {col.id === "No" && onRowClick ? (
              <span
                className="text-primary cursor-pointer hover:underline underline-offset-2 font-medium"
                onClick={(e) => { e.stopPropagation(); onRowClick(row.No); }}
              >
                {row[col.id] || "-"}
              </span>
            ) : col.id === "E_Way_Bill_No" || col.id === "E_Invoice_No" ? (
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
      if (!isNaN(date.getTime())) return formatDate(date);
    } catch { /* ignore */ }
  }
  
  return String(value);
}
