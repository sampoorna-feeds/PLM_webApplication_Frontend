import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import type { VendorLedgerEntry } from "@/lib/api/services/vendor-ledger.service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { 
  ALL_COLUMNS, 
  type ColumnConfig,
  loadColumnWidths,
  saveColumnWidths,
  loadColumnOrder,
  saveColumnOrder
} from "./vendor-ledger-column-config";
import { ColumnFilter } from "@/components/forms/report-ledger/column-filter";

interface VendorLedgerTableProps {
  entries: VendorLedgerEntry[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => void;
  openingBalance: number;
  closingBalance: number;
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
  isOutstanding?: boolean;
}

const balanceColumnIds = [
  "Amount",
  "Amount_LCY",
  "Debit_Amount_LCY",
  "Credit_Amount_LCY",
  "Remaining_Amount",
  "Original_Amount",
  "Original_Amt_LCY",
  "Remaining_Amt_LCY",
  "RunningBalanceLCY",
  "Debit_Amount",
  "Credit_Amount",
];

export function VendorLedgerTable({
  entries,
  isLoading,
  isFetchingNextPage,
  hasMore,
  loadMore,
  openingBalance,
  closingBalance,
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
  isOutstanding = false,
}: VendorLedgerTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const activeColumns = useMemo(() => {
    const filtered = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.id));
    if (columnOrder.length === 0) return filtered;

    // Filter order to only include currently visible columns
    const currentOrder = columnOrder.filter(id => visibleColumns.includes(id));
    
    // Add any new visible columns that aren't in the order list yet
    const newVisible = visibleColumns.filter(id => !currentOrder.includes(id));
    const finalOrder = [...currentOrder, ...newVisible];

    return [...filtered].sort((a, b) => {
      return finalOrder.indexOf(a.id) - finalOrder.indexOf(b.id);
    });
  }, [visibleColumns, columnOrder]);

  const handleResize = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [columnId]: width }));
  }, []);

  const saveWidths = useCallback((widths: Record<string, number>) => {
    if (typeof window !== "undefined") {
      saveColumnWidths(widths);
    }
  }, []);

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
  }, [activeColumns]);

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
        // Persist to localStorage only when dragging ends
        setColumnWidths(prev => {
          saveWidths(prev);
          return prev;
        });
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData("columnId", field);
      e.dataTransfer.effectAllowed = "move";
      // Create a ghost image or just set data
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
          maxWidth: columnWidths[field] ? `${columnWidths[field]}px` : undefined 
        }}
        className={cn(
          "bg-background z-40 border-b-2 border-border/60 px-4 py-4 text-left align-middle font-bold whitespace-nowrap sticky top-0 transition-all duration-200 group/header shadow-sm overflow-hidden",
          hasActiveFilter && "bg-primary/5 border-b-primary/60",
          isDragOver && "bg-primary/5 border-r-2 border-r-primary",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div
            className={cn(
              "flex cursor-pointer items-center gap-1.5 transition-all duration-300",
              !isSortable && "cursor-default",
              sortField === field ? "text-primary translate-x-0.5" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => isSortable && onSort(field)}
          >
            <span
              className={cn(
                "text-[10px] font-black tracking-wider whitespace-nowrap leading-none",
                hasActiveFilter && "text-primary",
              )}
            >
              {label}
            </span>
            {isSortable && <SortIcon field={field} />}
          </div>

          <div className={cn(
            "flex items-center transition-opacity duration-300",
            hasActiveFilter ? "opacity-100" : "opacity-40 group-hover/header:opacity-100"
          )}>
            {colConfig?.filterType && (
              <ColumnFilter
                column={colConfig}
                value={val}
                valueTo={valTo}
                onChange={(v, vTo) => onColumnFilterChange(field, v, vTo)}
              />
            )}
          </div>
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

  const renderCell = (col: ColumnConfig, entry: any) => {
    const value = entry[col.id];

    if (value === null || value === undefined || value === "") {
      return (
        <TableCell key={col.id} className="text-center text-muted-foreground/20 px-4 py-4">
          <span className="text-[10px]">●</span>
        </TableCell>
      );
    }

    if (col.id === "Entry_No") {
      return (
        <TableCell key={col.id} className="text-xs font-bold whitespace-nowrap text-primary px-4 py-4">
          {value}
        </TableCell>
      );
    }

    switch (col.filterType) {
      case "date":
        return (
          <TableCell key={col.id} className="text-xs font-bold text-foreground/80 px-4 py-4 whitespace-nowrap">
            {value && value !== "0001-01-01" ? format(new Date(value), "MMM dd, yyyy") : "-"}
          </TableCell>
        );
      case "number": {
        const numValue = Number(value) || 0;
        return (
          <TableCell
            key={col.id}
            className={cn(
              "text-right text-xs font-mono font-bold px-4 py-4 tabular-nums tracking-tight",
              numValue < 0 ? "text-red-500" : numValue > 0 ? "text-primary" : "text-muted-foreground/40",
            )}
          >
            {numValue === 0 ? "-" : numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
        );
      }
      case "boolean":
        return (
          <TableCell key={col.id} className="text-center px-4 py-4">
            <Badge
              variant={value ? "default" : "secondary"}
              className={cn(
                "h-5 px-2 text-[9px] font-black uppercase tracking-widest",
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
            style={{ 
              width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
              minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
              maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined 
            }}
            className={cn(
              "text-xs px-4 py-4 truncate transition-colors font-medium",
              col.id === "Document_No" ? "font-bold text-primary hover:text-primary/80 cursor-default" : "text-foreground/70"
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

  if (!entries.length && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center h-full min-h-[400px]">
        <div className="bg-primary/5 p-8 rounded-full mb-6 relative animate-pulse">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary relative z-10"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h3 className="text-xl font-black text-foreground/90 uppercase tracking-tight mb-2">
          {columnFilters && Object.keys(columnFilters).length > 0 ? "No results found" : "Select a Vendor"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm font-medium">
          {columnFilters && Object.keys(columnFilters).length > 0 
            ? "Try adjusting your filters to find what you are looking for." 
            : "Use the search bar above to select a vendor and view their complete transaction ledger."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col group/table bg-card/10">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-sm border-separate border-spacing-0 table-fixed">
          <thead className="bg-muted sticky top-0 z-50">
            <tr className="hover:bg-transparent">
              {activeColumns.map((col) => (
                <HeaderCell key={col.id} field={col.id} label={col.label} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {/* Opening Balance Row */}
            {!isLoading && entries.length > 0 && !isOutstanding && (
              <tr className="bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors group/balance border-b-2 border-primary/10">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    className="px-6 py-4 text-left font-black text-[10px] tracking-wider text-primary/60"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover/balance:animate-ping" />
                      Opening Balance
                    </div>
                  </td>
                )}
                {activeColumns.slice(balancePrefixColSpan).map((col) => {
                  if (col.id === "Amount" || col.id === "Amount_LCY") {
                    return (
                      <td
                        key={col.id}
                        className="px-4 py-4 text-right text-xs font-mono font-black tabular-nums text-primary/80 border-l border-border/10"
                      >
                        {openingBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    );
                  }
                  return <td key={col.id} className="px-4 py-4 border-l border-border/5" />;
                })}
              </tr>
            )}

            {/* Data Rows */}
            {entries.map((entry, index) => (
              <tr
                key={entry.Entry_No || index}
                className={cn(
                  "group hover:bg-primary/[0.02] transition-all duration-150 relative",
                  index % 2 === 1 ? "bg-muted/5" : "bg-transparent"
                )}
              >
                {activeColumns.map((col) => renderCell(col, entry))}
              </tr>
            ))}

            {/* Infinite Load Target */}
            <tr className="h-10 pointer-events-none border-none">
              <td colSpan={activeColumns.length} className="p-0 border-none">
                <div ref={observerTarget} className="h-full w-full" />
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-6 gap-3 text-muted-foreground/40 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Fetching Next Page</span>
                  </div>
                )}
              </td>
            </tr>

            {/* Closing Balance Row */}
            {!isLoading && entries.length > 0 && !isOutstanding && (
              <tr className="bg-background hover:bg-muted/5 transition-colors border-t-2 border-primary group/balance sticky bottom-0 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    className="px-6 py-5 text-left font-black text-[11px] tracking-wider text-primary"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Closing Balance
                    </div>
                  </td>
                )}
                {activeColumns.slice(balancePrefixColSpan).map((col) => {
                  if (col.id === "Amount" || col.id === "Amount_LCY") {
                    return (
                      <td
                        key={col.id}
                        className="px-4 py-5 text-right text-sm font-mono font-black tabular-nums border-l border-primary/10 text-primary"
                      >
                        {closingBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    );
                  }
                  return <td key={col.id} className="px-4 py-5 border-l border-border/5" />;
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
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Accessing Real-time Ledger Data</p>
          </div>
        </div>
      )}
    </div>
  );
}
