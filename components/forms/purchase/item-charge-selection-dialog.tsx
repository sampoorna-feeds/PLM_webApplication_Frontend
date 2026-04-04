"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  Search,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  itemChargeAssignmentService,
  ItemChargeSourceLine,
  SourceType,
} from "@/lib/api/services/item-charge-assignment.service";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 200;

type SortDirection = "asc" | "desc" | null;

interface ColumnConfig {
  id: string;
  label: string;
  sortable?: boolean;
  filterType?: "text" | "number" | "date";
  align?: "left" | "right" | "center";
  width?: string;
}

const SELECTION_COLUMNS: ColumnConfig[] = [
  {
    id: "Document_No",
    label: "Document No.",
    sortable: true,
    filterType: "text",
    width: "160px",
  },
  {
    id: "Line_No",
    label: "Line No.",
    sortable: true,
    filterType: "number",
    width: "90px",
    align: "center",
  },
  {
    id: "Item_No",
    label: "Item No.",
    sortable: true,
    filterType: "text",
    width: "130px",
  },
  {
    id: "Description",
    label: "Description",
    sortable: true,
    filterType: "text",
    width: "250px",
  },
  {
    id: "Quantity",
    label: "Quantity",
    sortable: true,
    filterType: "number",
    width: "100px",
    align: "right",
  },
  {
    id: "Unit_of_Measure",
    label: "UOM",
    sortable: true,
    filterType: "text",
    width: "80px",
    align: "center",
  },
  {
    id: "Posting_Date",
    label: "Posting Date",
    sortable: true,
    filterType: "date",
    width: "120px",
  },
];

// Number of header columns including S.No + checkbox col
const TOTAL_COLS = SELECTION_COLUMNS.length + 1;

interface ItemChargeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: SourceType;
  onAddSelected: (lines: ItemChargeSourceLine[]) => Promise<void> | void;
}

export function ItemChargeSelectionDialog({
  open,
  onOpenChange,
  type,
  onAddSelected,
}: ItemChargeSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // All fetched records accumulated client-side
  const [sourceLines, setSourceLines] = useState<ItemChargeSourceLine[]>([]);
  // Total record count from OData $count
  const [totalCount, setTotalCount] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Sentinel reference for IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sorting + Filtering (client-side on fetched records)
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});

  // Whether all server-side records have been fetched
  const allFetched = sourceLines.length >= totalCount && totalCount > 0;
  // Whether more can be fetched from the server
  const canFetchMore = !allFetched && !loading && !loadingMore;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial fetch (reset everything)
  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      setSourceLines([]);
      setTotalCount(0);
      setSelectedIds(new Set());
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      const result = await itemChargeAssignmentService.getSourceLines(type, {
        search: debouncedSearchQuery || undefined,
        skip: 0,
        top: PAGE_SIZE,
      });

      setSourceLines(result.value);
      setTotalCount(result.count);
    } catch (error) {
      console.error(`Failed to fetch ${type} lines:`, error);
    } finally {
      setLoading(false);
    }
  }, [type, debouncedSearchQuery]);

  // Load more (append)
  const fetchMore = useCallback(async () => {
    if (!canFetchMore) return;
    try {
      setLoadingMore(true);
      const result = await itemChargeAssignmentService.getSourceLines(type, {
        search: debouncedSearchQuery || undefined,
        skip: sourceLines.length,
        top: PAGE_SIZE,
      });
      setSourceLines((prev) => [...prev, ...result.value]);
      // Update count in case it changed (shouldn't, but defensive)
      setTotalCount(result.count);
    } catch (error) {
      console.error(`Failed to fetch more ${type} lines:`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [canFetchMore, type, debouncedSearchQuery, sourceLines.length]);

  // Trigger initial fetch whenever dialog opens or search changes
  useEffect(() => {
    if (open) {
      fetchInitial();
    }
  }, [open, debouncedSearchQuery, fetchInitial]);

  // IntersectionObserver — triggers server-side load more
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore]);

  // Client-side filter + sort on already-fetched records
  const filteredAndSortedLines = useMemo(() => {
    let result = sourceLines;

    // Column filters
    Object.entries(columnFilters).forEach(([columnId, filter]) => {
      if (!filter.value && !filter.valueTo) return;

      result = result.filter((line) => {
        let value = (line as any)[columnId];
        if (columnId === "Item_No" && value === undefined) {
          value = line.No || line.Item_No;
        }
        if (value === null || value === undefined) return false;

        const stringValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();

        if (filterValue.includes(",")) {
          const parts = filterValue
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          return parts.some((p) => stringValue.includes(p));
        }

        return stringValue.includes(filterValue);
      });
    });

    // Sorting
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        let valA = (a as any)[sortColumn];
        let valB = (b as any)[sortColumn];

        if (sortColumn === "Item_No") {
          valA = a.No || a.Item_No || "";
          valB = b.No || b.Item_No || "";
        }

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const comparison = valA < valB ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [sourceLines, columnFilters, sortColumn, sortDirection]);

  const toggleSelectAll = () => {
    if (
      selectedIds.size === filteredAndSortedLines.length &&
      filteredAndSortedLines.length > 0
    ) {
      setSelectedIds(new Set());
    } else {
      const allIds = filteredAndSortedLines.map(
        (line) => `${line.Document_No}-${line.Line_No}`,
      );
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelectLine = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) => {
        if (prev === "asc") return "desc";
        return null;
      });
      setSortColumn((prev) => {
        if (sortDirection === "desc") return null;
        return prev;
      });
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (
    columnId: string,
    value: string,
    valueTo?: string,
  ) => {
    setColumnFilters((prev) => {
      if (!value && !valueTo) {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: { value, valueTo } };
    });
  };

  const handleAdd = async () => {
    try {
      setIsAdding(true);
      const selected = sourceLines.filter((line) =>
        selectedIds.has(`${line.Document_No}-${line.Line_No}`),
      );
      await onAddSelected(selected);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add lines:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const titles: Record<SourceType, string> = {
    Receipt: "Get Purchase Receipt Lines",
    SalesShipment: "Get Sales Shipment Lines",
    Transfer: "Get Transfer Receipt Lines",
    ReturnReceipt: "Get Return Receipt Lines",
    ReturnShipment: "Get Return Shipment Lines",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background flex h-[90vh] w-[90vw] flex-col gap-0 space-y-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:max-w-[90vw] sm:border">
        <DialogHeader className="border-border bg-muted/30 relative border-b px-5 py-4">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-foreground flex items-center gap-3 text-xl font-black tracking-tight uppercase">
              <div className="bg-primary h-8 w-1 rounded-full" />
              {titles[type]}
            </DialogTitle>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="group relative flex-1">
              <Search className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 transition-colors" />
              <Input
                placeholder={`Search ${type} by Document No. or Item No...`}
                className="h-10 w-full pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollContainerRef} className="flex-1 overflow-auto">
            <table className="relative w-full border-collapse text-sm">
              {/* Sticky header */}
              <thead className="sticky top-0 z-30">
                <tr className="bg-muted border-border border-b whitespace-nowrap">
                  {/* S.No + Checkbox sticky column */}
                  <th className="bg-muted sticky left-0 z-40 w-20 px-3 text-center align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-primary w-6 text-[9px] font-black tracking-wider uppercase">
                        #
                      </span>
                      <Checkbox
                        checked={
                          filteredAndSortedLines.length > 0 &&
                          selectedIds.size === filteredAndSortedLines.length
                        }
                        onCheckedChange={toggleSelectAll}
                        className="rounded-none shadow-none"
                      />
                    </div>
                  </th>
                  {SELECTION_COLUMNS.map((col) => (
                    <SortableTableHead
                      key={col.id}
                      column={col}
                      isActive={sortColumn === col.id}
                      sortDirection={
                        sortColumn === col.id ? sortDirection : null
                      }
                      filterValue={columnFilters[col.id]?.value ?? ""}
                      onSort={handleSort}
                      onFilter={handleColumnFilter}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={TOTAL_COLS} className="h-96 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="text-primary/40 h-12 w-12 animate-spin" />
                        <p className="text-muted-foreground animate-pulse font-medium italic">
                          Fetching records...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedLines.length === 0 ? (
                  <tr>
                    <td colSpan={TOTAL_COLS} className="h-96 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <Search className="text-muted-foreground h-12 w-12" />
                        <p className="text-muted-foreground font-medium italic">
                          No lines found matching your selection.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredAndSortedLines.map((line, idx) => {
                      const id = `${line.Document_No}-${line.Line_No}`;
                      const isSelected = selectedIds.has(id);
                      const itemNo = line.No || line.Item_No || "";
                      return (
                        <tr
                          key={`${line.Document_No}-${line.Line_No}-${idx}`}
                          className={cn(
                            "border-border hover:bg-muted/50 h-9 cursor-pointer border-b whitespace-nowrap transition-colors",
                            isSelected && "bg-primary/5",
                          )}
                          onClick={() => toggleSelectLine(id)}
                        >
                          {/* S.No + Checkbox sticky cell */}
                          <td
                            className="bg-card sticky left-0 z-20 w-20 px-3 text-center align-middle transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-muted-foreground w-6 text-right text-[10px] tabular-nums">
                                {idx + 1}
                              </span>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectLine(id)}
                                className="rounded-none shadow-none"
                              />
                            </div>
                          </td>
                          <td className="text-primary px-3 py-0 text-center align-middle text-xs font-medium tabular-nums">
                            {line.Document_No}
                          </td>
                          <td className="text-muted-foreground px-3 py-0 text-center align-middle text-[10px] tabular-nums">
                            {line.Line_No}
                          </td>
                          <td className="px-3 py-0 text-center align-middle text-xs tabular-nums">
                            {itemNo}
                          </td>
                          <td className="max-w-75 truncate px-3 py-0 text-left align-middle text-[11px]">
                            {line.Description}
                          </td>
                          <td className="px-3 py-0 text-right align-middle text-[11px] tabular-nums">
                            {line.Quantity.toLocaleString()}
                          </td>
                          <td className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">
                            {line.Unit_of_Measure || "—"}
                          </td>
                          <td className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">
                            {line.Posting_Date || "—"}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Sentinel / end-of-list row */}
                    <tr>
                      <td colSpan={TOTAL_COLS} className="py-3 text-center">
                        {allFetched ? (
                          <span className="text-muted-foreground/50 text-[10px] font-medium italic">
                            — No more records —
                          </span>
                        ) : (
                          <div
                            ref={sentinelRef}
                            className="flex items-center justify-center gap-2 py-1"
                          >
                            {loadingMore && (
                              <>
                                <Loader2 className="text-primary/40 h-4 w-4 animate-spin" />
                                <span className="text-muted-foreground text-[10px]">
                                  Loading more...
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Status bar */}
          <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-1.5">
            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              {loading ? (
                "Loading..."
              ) : (
                <>
                  {sourceLines.length.toLocaleString()}
                  {totalCount > 0 && (
                    <span className="text-foreground/50 ml-1">
                      / {totalCount.toLocaleString()} total
                    </span>
                  )}{" "}
                  Records
                  {Object.keys(columnFilters).length > 0 && (
                    <span className="text-primary ml-2">
                      ({filteredAndSortedLines.length} filtered)
                    </span>
                  )}
                </>
              )}
            </span>
            <div className="bg-primary/5 border-primary/20 flex items-center gap-2 rounded-full border px-3 py-1 transition-all">
              <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
              <span className="text-primary text-[10px] font-black tracking-widest uppercase">
                {selectedIds.size} Selected
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="border-border bg-background shadow-top-lg items-center justify-end gap-3 border-t px-5 py-4">
          <Button
            variant={"destructive"}
            className="border-destructive/50 border-3 px-6"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="shadow-primary/20 group h-10 px-8 text-xs font-black tracking-widest uppercase shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || isAdding}
          >
            {isAdding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
            )}
            {isAdding ? "Processing..." : `Add ${selectedIds.size} Selected`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SortableTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (columnId: string) => void;
  onFilter: (columnId: string, value: string, valueTo?: string) => void;
}

function SortableTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: SortableTableHeadProps) {
  const getSortIcon = () => {
    if (!isActive || !sortDirection) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th
      className={cn(
        "bg-muted text-primary h-10 px-3 py-3 text-left align-middle text-[10px] font-bold tracking-wider whitespace-nowrap uppercase select-none",
        column.align === "right" && "text-right",
        column.align === "center" && "text-center",
        isActive && "text-primary",
      )}
      style={{ width: column.width }}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          column.align === "right"
            ? "justify-end"
            : column.align === "center"
              ? "justify-center"
              : "",
        )}
      >
        <span
          className="hover:text-primary/70 cursor-pointer transition-colors"
          onClick={() => column.sortable && onSort(column.id)}
        >
          {column.label}
        </span>
        {column.sortable && (
          <button
            type="button"
            className="hover:text-primary/70 transition-colors"
            onClick={() => onSort(column.id)}
          >
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <ColumnFilter
            column={column}
            value={filterValue}
            onChange={(value) => onFilter(column.id, value)}
          />
        )}
      </div>
    </th>
  );
}

interface ColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function ColumnFilter({ column, value, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const hasFilter = !!value;

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleApply = () => {
    onChange(localValue);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "hover:bg-background/50 rounded p-0.5 transition-colors",
            hasFilter
              ? "text-primary"
              : "text-primary/30 hover:text-primary/60",
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Filter className={cn("h-3 w-3", hasFilter ? "fill-current" : "")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-xs font-medium">Filter {column.label}</Label>
          <Input
            placeholder="Search..."
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={handleApply}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
