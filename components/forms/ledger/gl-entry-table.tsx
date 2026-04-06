import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { type GLEntry } from "@/lib/api/services/gl-entry.service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2, BookOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { 
  ALL_COLUMNS, 
  type ColumnConfig,
  loadColumnWidths,
  saveColumnWidths,
  loadColumnOrder,
  saveColumnOrder
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
  frozenColumns: string[];
  setFrozenColumns: React.Dispatch<React.SetStateAction<string[]>>;
  saveFrozenColumns: (frozen: string[]) => void;
}

const balanceColumnIds = [
  "Amount",
  "Debit_Amount",
  "Credit_Amount",
  "VAT_Amount",
  "RunningBalance",
  "Additional_Currency_Amount",
];

export function GLEntryTable({
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
  accountNo,
  fromDate,
  toDate,
  frozenColumns,
  setFrozenColumns,
  saveFrozenColumns,
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
    
    // Final touch: Move frozen columns to the far left (front of array)
    const frozen = base.filter(c => frozenColumns.includes(c.id));
    const nonFrozen = base.filter(c => !frozenColumns.includes(c.id));
    
    return [...frozen, ...nonFrozen];
  }, [visibleColumns, columnOrder, frozenColumns]);

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

  const handleResize = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [columnId]: width }));
  }, []);

  const saveWidths = useCallback((widths: Record<string, number>) => {
    if (typeof window !== "undefined") {
      saveColumnWidths(widths);
    }
  }, []);

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

  const getFrozenStyle = (field: string, zIndex: number = 40, bgColor?: string) => {
    if (!frozenColumns.includes(field)) return {};

    const currentIndex = activeColumns.findIndex(c => c.id === field);
    if (currentIndex === -1) return {};

    let left = 0;
    for (let i = 0; i < currentIndex; i++) {
        left += (columnWidths[activeColumns[i].id] || 150);
    }

    const isLastFrozen = currentIndex >= 0 && 
      (currentIndex === activeColumns.length - 1 || !frozenColumns.includes(activeColumns[currentIndex + 1].id));

    return {
      position: 'sticky' as 'sticky',
      left: `${left}px`,
      zIndex,
      backgroundColor: bgColor || 'var(--background)',
      opacity: 1,
      boxShadow: isLastFrozen ? '4px 0 8px -4px rgba(0,0,0,0.2)' : undefined,
      borderRight: isLastFrozen ? '1px solid var(--border)' : undefined
    };
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

    const isFrozen = frozenColumns.includes(field);

    const toggleFreeze = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFrozenColumns(prev => {
        const newFrozen = prev.includes(field)
          ? prev.filter(id => id !== field)
          : [...prev, field];
        saveFrozenColumns(newFrozen);
        return newFrozen;
      });
    };

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
          ...getFrozenStyle(field, 50, 'var(--secondary)')
        }}
        className={cn(
          "bg-secondary border-b border-border/60 px-4 py-3 text-left align-middle font-semibold text-xs whitespace-nowrap sticky top-0 transition-all duration-200 group/header shadow-sm overflow-hidden",
          isFrozen && "z-50",
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
                "text-xs font-semibold whitespace-nowrap leading-none",
                hasActiveFilter && "text-primary",
              )}
            >
              {label}
            </span>
            <div className="flex items-center gap-1">
              {isSortable && <SortIcon field={field} />}
              <button 
                onClick={toggleFreeze}
                className={cn(
                  "p-1 rounded hover:bg-primary/10 transition-colors",
                  isFrozen ? "text-primary opacity-100" : "opacity-0 group-hover/header:opacity-40"
                )}
                title={isFrozen ? "Unfreeze Column" : "Freeze Column"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={isFrozen ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4.5l-4 4L7 4.5"/><path d="M19 12l-4 4-4-4"/><path d="M5 12l4 4 4-4"/></svg>
              </button>
            </div>
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

  const renderCell = (col: ColumnConfig, entry: any, index: number) => {
    const value = entry[col.id];
    const isFrozen = frozenColumns.includes(col.id);
    
    // Use background and secondary for stronger opaque contrast
    const baseBg = index % 2 === 1 ? 'var(--secondary)' : 'var(--background)';
    
    const cellStyle = {
      width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
      minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
      maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
      ...getFrozenStyle(col.id, isFrozen ? 30 : 1, baseBg)
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
        <TableCell key={col.id} style={cellStyle} className="text-xs font-bold whitespace-nowrap text-primary px-4 py-4">
          {value}
        </TableCell>
      );
    }

    switch (col.filterType) {
      case "date":
        return (
          <TableCell key={col.id} style={cellStyle} className="text-xs font-bold text-foreground/80 px-4 py-4 whitespace-nowrap">
            {value && value !== "0001-01-01" && value !== "0001-01-01T00:00:00Z" 
              ? format(new Date(value), "MMM dd, yyyy") 
              : "-"}
          </TableCell>
        );
      case "number": {
        const numValue = Number(value) || 0;
        return (
          <TableCell
            key={col.id}
            style={cellStyle}
            className={cn(
              "text-right text-xs font-semibold px-4 py-4 tabular-nums",
              numValue < 0 ? "text-red-500" : numValue > 0 ? "text-primary" : "text-muted-foreground/40",
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
              {value ? "Yes" : "No"}
            </Badge>
          </TableCell>
        );
      default:
        return (
          <TableCell
            key={col.id}
            style={cellStyle}
            className={cn(
              "text-xs px-4 py-4 truncate transition-colors font-medium text-foreground/70",
              col.id === "G_L_Account_No" && "text-primary font-bold"
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

  // Handle "Select Account" placeholder state
  if (!accountNo) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center h-full min-h-[400px]">
        <div className="bg-primary/5 p-8 rounded-full mb-6 relative animate-pulse">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
          <BookOpen className="h-12 w-12 text-primary relative z-10 opacity-70" />
        </div>
        <h3 className="text-xl font-black text-foreground/90 uppercase tracking-tight mb-2">
          Select G/L Account
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm font-medium">
          Choose a general ledger account from the search bar above to load transaction history and balances.
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
          Please select both starting and ending dates in the filter bar to view the ledger entries for this period.
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
          Try adjusting your filters or checking the ERP connection.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col group/table bg-card/5 border rounded-lg">
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
            {!isLoading && entries.length > 0 && Math.abs(openingBalance) > 0 && (
              <tr className="bg-primary/5 transition-colors group/balance border-b-2 border-primary/10 font-bold">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    style={{
                      ...getFrozenStyle(activeColumns[0].id, 35),
                      backgroundColor: 'hsl(var(--bg-primary) / 0.05)' // Match row bg
                    }}
                    className="px-6 py-4 text-left font-black text-[10px] tracking-wider text-primary/60"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover/balance:animate-ping" />
                      Opening Balance
                    </div>
                  </td>
                )}
                {activeColumns.slice(balancePrefixColSpan).map((col) => {
                  const cellStyle = {
                    width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    ...getFrozenStyle(col.id, 35)
                  };
                  if (col.id === "Amount" || col.id === "RunningBalance") {
                    return (
                      <td
                        key={col.id}
                        style={cellStyle}
                        className="px-4 py-4 text-right text-xs font-semibold tabular-nums text-primary/80 border-l border-border/10"
                      >
                        {openingBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    );
                  }
                  return <td key={col.id} style={cellStyle} className="px-4 py-4 border-l border-border/5" />;
                })}
              </tr>
            )}

            {/* Data Rows */}
            {entries.map((entry, index) => (
              <tr
                key={entry.Entry_No || index}
                className={cn(
                  "group hover:bg-primary/2 transition-all duration-150 relative",
                  index % 2 === 1 ? "bg-muted/5" : "bg-transparent"
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
                    <span className="text-xs font-semibold">Fetching Next Records</span>
                  </div>
                )}
              </td>
            </tr>

            {/* Closing Balance Row */}
            {!isLoading && entries.length > 0 && Math.abs(closingBalance) > 0 && (
              <tr className="bg-card border-t-2 border-primary group/balance sticky bottom-0 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
                {balancePrefixColSpan > 0 && (
                  <td
                    colSpan={balancePrefixColSpan}
                    style={{
                      ...getFrozenStyle(activeColumns[0].id, 45),
                      backgroundColor: 'hsl(var(--card))' // Match row bg
                    }}
                    className="px-6 py-5 text-left font-semibold text-xs text-primary"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Closing Balance
                    </div>
                  </td>
                )}
                {activeColumns.slice(balancePrefixColSpan).map((col) => {
                  const cellStyle = {
                    width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    maxWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                    ...getFrozenStyle(col.id, 45)
                  };
                  if (col.id === "Amount" || col.id === "RunningBalance") {
                    return (
                      <td
                        key={col.id}
                        style={cellStyle}
                        className="px-4 py-5 text-right text-xs font-semibold tabular-nums border-l border-primary/10 text-primary"
                      >
                        {closingBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    );
                  }
                  return <td key={col.id} style={cellStyle} className="px-4 py-5 border-l border-border/5" />;
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
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Accessing Real-time GL Data</p>
          </div>
        </div>
      )}
    </div>
  );
}
