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
      e.preventDefault();
      e.stopPropagation();
      const startX = e.pageX;
      const headerElement = (e.currentTarget as HTMLElement).parentElement;
      const startWidth = headerElement?.offsetWidth || 0;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const currentWidth = Math.max(80, startWidth + (moveEvent.pageX - startX));
        handleResize(field, currentWidth);
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        setColumnWidths(prev => {
          saveWidths(prev);
          return prev;
        });
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
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
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ 
          width: columnWidths[field] ? `${columnWidths[field]}px` : undefined,
          minWidth: columnWidths[field] ? `${columnWidths[field]}px` : undefined,
          maxWidth: columnWidths[field] ? `${columnWidths[field]}px` : undefined,
        }}
        className={cn(
          "bg-background border-b border-border/40 px-5 py-3.5 text-left align-middle font-bold tracking-widest text-muted-foreground whitespace-nowrap sticky top-0 transition-all duration-200 group/header overflow-hidden backdrop-blur-md",
          hasActiveFilter && "bg-primary/5 text-primary border-b-primary/40",
          isDragOver && "bg-primary/5 border-r-2 border-r-primary",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 transition-all duration-300",
              !isSortable && "cursor-default",
              sortField === field ? "text-primary translate-x-0.5" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => isSortable && onSort(field)}
          >
            <span
              className={cn(
                "truncate whitespace-nowrap leading-none transition-colors",
                hasActiveFilter ? "text-primary" : "group-hover/header:text-foreground",
              )}
            >
              {label}
            </span>
            {isSortable && <SortIcon field={field} />}
          </div>

          <Popover open={isActionsOpen} onOpenChange={setIsActionsOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={cn(
                  "shrink-0 rounded-md p-1 transition-colors hover:bg-primary/10 hover:text-foreground",
                  hasActiveFilter || isActionsOpen
                    ? "text-primary opacity-100"
                    : "text-muted-foreground/60 opacity-50 group-hover/header:opacity-100"
                )}
                title="Column actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-56 gap-3 p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                {isSortable && (
                  <button
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                    onClick={() => {
                      onSort(field);
                      setIsActionsOpen(false);
                    }}
                  >
                    <span>Sort</span>
                    <SortIcon field={field} />
                  </button>
                )}
              </div>

              {colConfig?.filterType && (
                <div className="border-t border-border/50 pt-3">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Filter
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5">
                    <span className="text-sm text-foreground/80">
                      {hasActiveFilter ? "Edit filter" : "Open filter"}
                    </span>
                    <ColumnFilter
                      column={colConfig}
                      value={val}
                      valueTo={valTo}
                      onChange={(v, vTo) => onColumnFilterChange(field, v, vTo)}
                    />
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={onResizeMouseDown}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize transition-all z-50 hover:bg-primary/40",
            "after:content-[''] after:absolute after:right-0 after:top-1/4 after:bottom-1/4 after:w-px after:bg-border/50",
            columnWidths[field] ? "bg-primary/10" : "bg-transparent"
          )}
        />
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
        <TableCell key={col.id} style={cellStyle} className="text-center text-muted-foreground/20 px-4 py-4">
          <span className="text-[10px]">●</span>
        </TableCell>
      );
    }

    if (col.id === "Entry_No") {
      return (
        <TableCell key={col.id} style={cellStyle} className="text-[13px] font-bold whitespace-nowrap text-primary px-5 py-3.5">
          {value}
        </TableCell>
      );
    }

    switch (col.filterType) {
      case "date":
        return (
          <TableCell key={col.id} style={cellStyle} className="text-xs font-bold text-foreground/80 px-4 py-4 whitespace-nowrap">
            {value && value !== "0001-01-01" ? format(new Date(value), "MMM dd, yyyy") : "-"}
          </TableCell>
        );
      case "number": {
        const numValue = Number(value) || 0;
        return (
          <TableCell
            key={col.id}
            style={cellStyle}
            className={cn(
              "text-right text-[13px] font-semibold px-5 py-3.5 tabular-nums tracking-tight",
              numValue < 0 ? "text-destructive" : numValue > 0 ? "text-primary" : "text-muted-foreground/40",
            )}
          >
            {numValue === 0 ? "-" : numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
        );
      }
      case "boolean":
        return (
          <TableCell key={col.id} style={cellStyle} className="text-center px-4 py-4">
            <Badge
              variant={value ? "default" : "secondary"}
              className={cn(
                "h-5 px-2 text-[10px] font-medium",
                value ? "bg-primary/20 text-primary border-primary/20 shadow-sm" : "bg-muted text-muted-foreground border-transparent"
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
              "text-[13px] px-5 py-3.5 truncate transition-colors",
              col.id === "Document_No" ? "font-bold text-primary hover:text-primary/80 cursor-default" : "text-foreground/80 font-medium"
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
    <div className="relative flex-1 overflow-hidden flex flex-col group/table bg-card/10">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table 
          className="min-w-full text-sm border-separate border-spacing-0 table-fixed"
          style={{ width: `${totalTableWidth}px` }}
        >
          <thead className="bg-muted sticky top-0 z-50">
            <tr className="hover:bg-transparent">
              {activeColumns.map((col) => (
                <HeaderCell key={col.id} field={col.id} label={col.label} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {/* Opening Balance Row */}
            {!isLoading && entries.length > 0 && (
              <tr className="bg-card group/balance border-b border-primary/10">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    className="px-6 py-4 text-left font-black text-primary/85"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary/70 group-hover/balance:animate-ping" />
                      <span className="text-sm font-black tracking-wide">Opening Balance</span>
                    </div>
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
                        className="px-5 py-4 text-right text-[14px] font-bold tabular-nums text-primary/90 border-l border-primary/10 tracking-tight"
                      >
                        {openingBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    );
                  }
                  return <td key={col.id} style={cellStyle} className="px-5 py-4 border-l border-border/5" />;
                })}
              </tr>
            )}

            {/* Data Rows */}
            {entries.map((entry, index) => (
              <tr
                key={entry.Entry_No || index}
                className={cn(
                  "group hover:bg-muted/50 transition-colors duration-200 relative",
                  index % 2 === 1 ? "bg-muted/30" : "bg-background"
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
                  <div className="flex items-center justify-center py-6 gap-3 text-muted-foreground/40 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-semibold">Fetching Next Page</span>
                  </div>
                )}
              </td>
            </tr>

            {/* Summary Row */}
            {!isLoading && entries.length > 0 && (
              <tr className="bg-card border-t-2 border-primary group/balance sticky bottom-0 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    className="px-6 py-4 text-left font-black text-[13px] text-primary tracking-wider"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Summary
                    </div>
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
                        className="px-5 py-3.5 text-right border-l border-primary/10"
                      >
                        <div className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1">
                          Total Debit
                        </div>
                        <div className="text-[13px] font-black tabular-nums tracking-tight text-foreground/90">
                          {formatAmount(debitSum)}
                        </div>
                      </td>
                    );
                  }

                  if (col.id === "Credit_Amount") {
                    return (
                      <td
                        key={col.id}
                        style={cellStyle}
                        className="px-5 py-3.5 text-right border-l border-primary/10"
                      >
                        <div className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1">
                          Total Credit
                        </div>
                        <div className="text-[13px] font-black tabular-nums tracking-tight text-foreground/90">
                          {formatAmount(creditSum)}
                        </div>
                      </td>
                    );
                  }

                  if (col.id === closingBalanceColumnId) {
                    return (
                      <td
                        key={col.id}
                        style={cellStyle}
                        className="px-5 py-3.5 text-right border-l border-primary/10"
                      >
                        <div className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1">
                          Closing Balance
                        </div>
                        <div className="text-[14px] font-black tabular-nums tracking-tight text-primary">
                          {formatAmount(closingBalance)}
                        </div>
                      </td>
                    );
                  }

                  return <td key={col.id} style={cellStyle} className="px-5 py-3.5 border-l border-border/5" />;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isLoading && entries.length === 0 && (
        <div className="absolute inset-0 bg-background/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
          <div className="relative h-16 w-16">
             <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
             <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Synchronizing</h4>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Accessing Real-time Financial Data</p>
          </div>
        </div>
      )}
    </div>
  );
}
