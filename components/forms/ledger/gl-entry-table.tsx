import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableCell } from "@/components/ui/table";
import type { GLEntry } from "@/lib/api/services/gl-entry.service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { 
  ALL_COLUMNS, 
  type ColumnConfig
} from "./gl-entry-column-config";
import { ColumnFilter } from "@/components/forms/report-ledger/column-filter";

interface GLEntryTableProps {
  entries: GLEntry[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => void;
  openingBalance: number;
  closingBalance: number;
  debitSum?: number;
  creditSum?: number;
  onSort: (field: string) => void;
  onColumnFilterChange: (field: string, value: string, valueTo?: string) => void;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  columnFilters?: Record<string, string>;
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  setColumnWidths: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  saveColumnWidths: (widths: Record<string, number>) => void;
  columnOrder: string[];
  setColumnOrder: React.Dispatch<React.SetStateAction<string[]>>;
  saveColumnOrder: (order: string[]) => void;
  accountNo?: string;
  fromDate?: string;
  toDate?: string;
}

const balanceColumnIds = [
  "Amount",
  "RunningBalance",
  "Debit_Amount",
  "Credit_Amount",
];

export function GLEntryTable({
  entries,
  isLoading,
  isFetchingNextPage,
  hasMore,
  loadMore,
  openingBalance,
  closingBalance,
  debitSum = 0,
  creditSum = 0,
  onSort,
  onColumnFilterChange,
  sortField,
  sortOrder,
  columnFilters = {},
  visibleColumns,
  columnWidths,
  setColumnWidths,
  saveColumnWidths,
  columnOrder,
  setColumnOrder,
  saveColumnOrder,
  accountNo,
  fromDate,
  toDate,
}: GLEntryTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const activeColumns = useMemo(() => {
    let base = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));
    if (columnOrder.length > 0) {
      const currentOrder = columnOrder.filter(id => visibleColumns.includes(id));
      const newVisible = visibleColumns.filter(id => !currentOrder.includes(id));
      const finalOrder = [...currentOrder, ...newVisible];
      base = [...base].sort((a, b) => finalOrder.indexOf(a.id) - finalOrder.indexOf(b.id));
    }
    return base;
  }, [visibleColumns, columnOrder]);

  const handleResize = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [columnId]: width }));
  }, [setColumnWidths]);

  const saveWidths = useCallback((widths: Record<string, number>) => {
    if (typeof window !== "undefined") {
      saveColumnWidths(widths);
    }
  }, [saveColumnWidths]);

  const handleColumnReorder = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    setColumnOrder(prev => {
      const currentIds = activeColumns.map(c => c.id);
      const draggedIndex = currentIds.indexOf(draggedId);
      const targetIndex = currentIds.indexOf(targetId);
      
      const newIds = [...currentIds];
      newIds.splice(draggedIndex, 1);
      newIds.splice(targetIndex, 0, draggedId);
      
      if (typeof window !== "undefined") {
        saveColumnOrder(newIds);
      }
      return newIds;
    });
  }, [activeColumns, setColumnOrder, saveColumnOrder]);

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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-30" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="text-primary ml-2 h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="text-primary ml-2 h-3.5 w-3.5" />
    );
  };

  const HeaderCell = ({
    field,
    label,
    className,
    isSortable = true,
  }: {
    field: string;
    label: string;
    className?: string;
    isSortable?: boolean;
  }) => {
    const colConfig = ALL_COLUMNS.find((c) => c.id === field);
    const filterState = columnFilters[field] || "";
    const hasActiveFilter = !!filterState;

    const [val, valTo] = filterState.includes(",")
      ? filterState.split(",")
      : [filterState, ""];

    const onResizeMouseDown = (e: React.MouseEvent) => {
      // Resizing disabled as per user request
    };

    const [isDragOver, setIsDragOver] = useState(false);
    const [isActionsOpen, setIsActionsOpen] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData("columnId", field);
      e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    };

    const handleDragLeave = () => {
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const draggedId = e.dataTransfer.getData("columnId");
      if (draggedId && draggedId !== field) {
        handleColumnReorder(draggedId, field);
      }
    };

    return (
      <th
        style={{ 
          width: columnWidths[field] ? `${columnWidths[field]}px` : undefined,
          minWidth: columnWidths[field] ? `${columnWidths[field]}px` : undefined,
          maxWidth: columnWidths[field] ? `${columnWidths[field]}px` : undefined,
        }}
        className={cn(
          "bg-muted border-b px-4 py-3 text-left align-middle text-xs font-bold whitespace-nowrap sticky top-0 z-10 transition-all overflow-hidden select-none",
          sortField === field ? "text-primary" : "text-foreground",
          className,
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden py-1">
          <span
            className="hover:text-primary cursor-pointer transition-colors truncate"
            onClick={() => isSortable && onSort(field)}
            title={label}
          >
            {label}
          </span>
          {isSortable && (
            <button
              type="button"
              className="hover:text-primary transition-colors shrink-0"
              onClick={() => onSort(field)}
            >
              <SortIcon field={field} />
            </button>
          )}
          {colConfig?.filterType && (
            <div className="shrink-0">
              <ColumnFilter
                column={colConfig}
                value={val}
                valueTo={valTo}
                onChange={(v, vTo) => onColumnFilterChange(field, v, vTo)}
              />
            </div>
          )}
        </div>
      </th>
    );
  };

  const renderCell = (col: ColumnConfig, entry: any, index: number) => {
    const value = entry[col.id];
    
    const cellStyle = {
      width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
      minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
      maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
    };

    if (value === null || value === undefined || value === "") {
      return (
        <TableCell key={col.id} style={cellStyle} className="text-center text-muted-foreground/30 px-4 py-2">
          -
        </TableCell>
      );
    }

    if (col.id === "Entry_No") {
      return (
        <TableCell key={col.id} style={cellStyle} className="text-xs font-medium whitespace-nowrap text-primary px-4 py-3">
          {value}
        </TableCell>
      );
    }

    switch (col.filterType) {
      case "date":
        return (
          <TableCell key={col.id} style={cellStyle} className="text-xs text-foreground/80 px-4 py-3 break-words">
            {value && value !== "0001-01-01" ? format(new Date(value), "dd-MM-yyyy") : "-"}
          </TableCell>
        );
      case "number": {
        const numValue = Number(value) || 0;
        return (
          <TableCell
            key={col.id}
            style={cellStyle}
            className={cn(
              "text-right text-xs px-4 py-3 tabular-nums",
              numValue < 0 ? "text-destructive" : numValue > 0 ? "text-primary" : "text-muted-foreground/40",
            )}
          >
            {numValue === 0 ? "-" : numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
        );
      }
      case "boolean":
        return (
          <TableCell key={col.id} style={cellStyle} className="text-center px-4 py-3">
            <Badge
              variant={value ? "default" : "secondary"}
              className={cn(
                "h-5 px-2 text-[10px]",
                value ? "bg-primary/10 text-primary border-primary/20 shadow-none" : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {value ? "Open" : "Closed"}
            </Badge>
          </TableCell>
        );
      default:
        return (
          <TableCell
            key={col.id}
            style={cellStyle}
            className={cn(
              "text-xs px-4 py-3 transition-colors break-words",
              col.id === "Document_No" ? "font-bold text-primary hover:underline cursor-pointer" : "text-foreground/80"
            )}
            title={String(value)}
          >
            {String(value)}
          </TableCell>
        );
    }
  };

  const balancePrefixColSpan = useMemo(() => {
    const firstBalanceColIndex = activeColumns.findIndex((col) =>
      balanceColumnIds.includes(col.id),
    );
    return firstBalanceColIndex === -1 ? activeColumns.length : firstBalanceColIndex;
  }, [activeColumns]);

  const totalTableWidth = useMemo(() => {
    return activeColumns.reduce((acc, col) => {
      return acc + (columnWidths[col.id] || 150);
    }, 0);
  }, [activeColumns, columnWidths]);

  const closingBalanceColumnId = useMemo(() => {
    return activeColumns.find((col) =>
      ["Amount", "RunningBalance"].includes(col.id),
    )?.id;
  }, [activeColumns]);

  const formatAmount = useCallback((value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  if (!accountNo) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center h-full min-h-[400px]">
        <div className="bg-primary/5 p-8 rounded-full mb-6 relative animate-pulse">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary relative z-10 opacity-70"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <h3 className="text-xl font-black text-foreground/90 uppercase tracking-tight mb-2">
          Select G/L Account
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm font-medium">
          Choose a general ledger account from the search bar above to load the entries.
        </p>
      </div>
    );
  }

  if (!fromDate || !toDate) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center h-full min-h-[400px]">
        <div className="bg-primary/5 p-8 rounded-full mb-6 relative animate-pulse">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary relative z-10"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
        </div>
        <h3 className="text-xl font-black text-foreground/90 uppercase tracking-tight mb-2">
          Select Date Range
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm font-medium">
          Please select both starting and ending dates in the filter bar to view the transaction history for this period.
        </p>
      </div>
    );
  }

  if (!entries.length && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center h-full min-h-[400px]">
        <div className="bg-primary/5 p-8 rounded-full mb-6 relative animate-pulse">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary relative z-10"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h3 className="text-xl font-black text-foreground/90 uppercase tracking-tight mb-2">
          No Results Found
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm font-medium">
          No entries were found for the selected account and date range. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col group/table">
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        <table 
          className="min-w-full text-sm border-separate border-spacing-0 table-fixed"
          style={{ width: `${totalTableWidth}px` }}
        >
          <thead className="bg-muted sticky top-0 z-50">
            <tr>
              {activeColumns.map((col) => (
                <HeaderCell key={col.id} field={col.id} label={col.label} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Opening Balance Row */}
            {!isLoading && entries.length > 0 && (
              <tr className="bg-muted/30 font-medium">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    className="px-4 py-2 text-left"
                  >
                    Opening Balance
                  </td>
                )}
                {activeColumns.slice(balancePrefixColSpan).map((col) => {
                  const cellStyle = {
                    width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                  };
                  if (col.id === "Amount" || col.id === "RunningBalance") {
                    return (
                      <td
                        key={col.id}
                        style={cellStyle}
                        className="px-4 py-2 text-right border-l"
                      >
                        {openingBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    );
                  }
                  return <td key={col.id} style={cellStyle} className="px-4 py-2 border-l" />;
                })}
              </tr>
            )}

            {/* Data Rows */}
            {entries.map((entry, index) => (
              <tr
                key={entry.Entry_No || index}
                className={cn(
                  "group hover:bg-muted/50 transition-colors duration-200",
                  index % 2 === 1 ? "bg-muted/10" : "bg-background"
                )}
              >
                {activeColumns.map((col) => renderCell(col, entry, index))}
              </tr>
            ))}

            {/* Infinite Load Target */}
            <tr className="h-10 pointer-events-none border-none">
              <td colSpan={activeColumns.length} className="p-0 border-none">
                <div ref={observerTarget} className="h-full w-full" />
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Loading more...</span>
                  </div>
                )}
              </td>
            </tr>

            {/* Summary Row */}
            {!isLoading && entries.length > 0 && (
              <tr className="bg-muted sticky bottom-0 z-40 border-t shadow-sm font-bold">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    className="px-4 py-3 text-left"
                  >
                    Summary
                  </td>
                )}
                {activeColumns.slice(balancePrefixColSpan).map((col) => {
                  const cellStyle = {
                    width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                  };

                  if (col.id === "Debit_Amount") {
                    return (
                      <td
                        key={col.id}
                        style={cellStyle}
                        className="px-4 py-3 text-right border-l"
                      >
                        <div className="text-xs text-muted-foreground uppercase font-medium">Total Debit</div>
                        <div>{formatAmount(debitSum)}</div>
                      </td>
                    );
                  }

                  if (col.id === "Credit_Amount") {
                    return (
                      <td
                        key={col.id}
                        style={cellStyle}
                        className="px-4 py-3 text-right border-l"
                      >
                        <div className="text-xs text-muted-foreground uppercase font-medium">Total Credit</div>
                        <div>{formatAmount(creditSum)}</div>
                      </td>
                    );
                  }

                  if (col.id === closingBalanceColumnId) {
                    return (
                      <td
                        key={col.id}
                        style={cellStyle}
                        className="px-4 py-3 text-right border-l text-primary"
                      >
                        <div className="text-xs text-muted-foreground uppercase font-medium">Closing Balance</div>
                        <div>{formatAmount(closingBalance)}</div>
                      </td>
                    );
                  }

                  return <td key={col.id} style={cellStyle} className="px-4 py-3 border-l" />;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isLoading && entries.length === 0 && (
        <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading GL entry data...</p>
        </div>
      )}
    </div>
  );
}
