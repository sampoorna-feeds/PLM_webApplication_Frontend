"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Check,
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
  salesItemChargeAssignmentService,
  type SalesChargeSourceType,
} from "@/lib/api/services/sales-item-charge-assignment.service";
import type { ItemChargeSourceLine } from "@/lib/api/services/item-charge-assignment.service";
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
  filterType?: "text" | "number";
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
  { id: "Posting_Date", label: "Date", sortable: true, filterType: "text", width: "120px" },
  {
    id: "Location_Code",
    label: "Location",
    sortable: true,
    filterType: "text",
    width: "120px",
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
    width: "100px",
    align: "right",
  },
  {
    id: "Unit_of_Measure",
    label: "UOM",
    sortable: true,
    width: "80px",
    align: "center",
  },
];

const TOTAL_COLS = SELECTION_COLUMNS.length + 1;

const TITLES: Record<SalesChargeSourceType, string> = {
  SalesShipment: "Get Sales Shipment Lines",
  ReturnShipment: "Get Return Shipment Lines",
  Transfer: "Get Transfer Receipt Lines",
};

interface SalesItemChargeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: SalesChargeSourceType;
  onAddSelected: (lines: ItemChargeSourceLine[]) => Promise<void> | void;
  extraFilters?: string[];
  sellToCustomerNo?: string;
}

export function SalesItemChargeSelectionDialog({
  open,
  onOpenChange,
  type,
  onAddSelected,
  extraFilters,
  sellToCustomerNo,
}: SalesItemChargeSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sourceLines, setSourceLines] = useState<ItemChargeSourceLine[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );

  const isDraggingRef = useRef(false);
  const dragSelectingRef = useRef<boolean | null>(null);

  const allFetched = sourceLines.length >= totalCount && totalCount > 0;
  const canFetchMore = !allFetched && !loading && !loadingMore;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      setSourceLines([]);
      setTotalCount(0);
      setSelectedIds(new Set());
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      const result = await salesItemChargeAssignmentService.getSourceLines(
        type,
        {
          search: debouncedSearchQuery || undefined,
          skip: 0,
          top: PAGE_SIZE,
          extraFilters,
          sellToCustomerNo,
        },
      );
      setSourceLines(result.value);
      setTotalCount(result.count);
    } catch (error) {
      console.error(`Failed to fetch ${type} lines:`, error);
    } finally {
      setLoading(false);
    }
  }, [type, debouncedSearchQuery, extraFilters]);

  const fetchMore = useCallback(async () => {
    if (!canFetchMore) return;
    try {
      setLoadingMore(true);
      const result = await salesItemChargeAssignmentService.getSourceLines(
        type,
        {
          search: debouncedSearchQuery || undefined,
          skip: sourceLines.length,
          top: PAGE_SIZE,
          extraFilters,
          sellToCustomerNo,
        },
      );
      setSourceLines((prev) => [...prev, ...result.value]);
      setTotalCount(result.count);
    } catch (error) {
      console.error(`Failed to fetch more ${type} lines:`, error);
    } finally {
      setLoadingMore(false);
    }
  }, [
    canFetchMore,
    type,
    debouncedSearchQuery,
    sourceLines.length,
    extraFilters,
  ]);

  useEffect(() => {
    if (open) fetchInitial();
  }, [open, debouncedSearchQuery, fetchInitial]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore]);

  const filteredAndSortedLines = useMemo(() => {
    let result = sourceLines;
    Object.entries(columnFilters).forEach(([colId, filterVal]) => {
      if (!filterVal) return;
      result = result.filter((line) => {
        let value = (line as unknown as Record<string, unknown>)[colId];
        if (colId === "Item_No" && value === undefined)
          value = line.No || line.Item_No;
        if (colId === "Posting_Date" && value === undefined)
          value = line.Posting_Date || line.Shipment_Date;
        if (value == null) return false;
        const sv = String(value).toLowerCase();
        const fv = filterVal.toLowerCase();
        if (fv.includes(","))
          return fv
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .some((p) => sv.includes(p));
        return sv.includes(fv);
      });
    });
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        let valA = (a as unknown as Record<string, unknown>)[sortColumn];
        let valB = (b as unknown as Record<string, unknown>)[sortColumn];
        if (sortColumn === "Item_No") {
          valA = a.No || a.Item_No || "";
          valB = b.No || b.Item_No || "";
        }
        if (sortColumn === "Posting_Date") {
          valA = valA ?? a.Shipment_Date;
          valB = valB ?? b.Shipment_Date;
        }
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        const cmp = valA < valB ? -1 : 1;
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [sourceLines, columnFilters, sortColumn, sortDirection]);

  const lineId = (line: ItemChargeSourceLine) =>
    `${line.Document_No}-${line.Line_No}`;

  const toggleSelectAll = () => {
    if (
      selectedIds.size === filteredAndSortedLines.length &&
      filteredAndSortedLines.length > 0
    ) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedLines.map(lineId)));
    }
  };

  const toggleSelectLine = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRowMouseDown = (id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("input, button")) return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragSelectingRef.current = !selectedIds.has(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (dragSelectingRef.current) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleRowMouseEnter = (id: string) => {
    if (!isDraggingRef.current || dragSelectingRef.current === null) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (dragSelectingRef.current) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  useEffect(() => {
    const onMouseUp = () => {
      isDraggingRef.current = false;
      dragSelectingRef.current = null;
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : null));
      setSortColumn((prev) => (sortDirection === "desc" ? null : prev));
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      if (!value) {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: value };
    });
  };

  const handleAdd = async () => {
    try {
      setIsAdding(true);
      const selected = sourceLines.filter((line) =>
        selectedIds.has(lineId(line)),
      );
      await onAddSelected(selected);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add lines:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background flex h-[90vh] w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw]">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle className="text-sm font-bold">
            {TITLES[type]}
          </DialogTitle>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search by Document No. or Item No..."
              className="h-8 pl-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
          style={{ userSelect: "none" }}
        >
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-30">
              <tr className="bg-muted border-border border-b whitespace-nowrap">
                <th className="bg-muted sticky left-0 z-40 h-10 w-16 px-3 text-center align-middle">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-foreground w-5 text-[9px] font-bold tracking-wider uppercase">
                      #
                    </span>
                    <Checkbox
                      checked={
                        filteredAndSortedLines.length > 0 &&
                        selectedIds.size === filteredAndSortedLines.length
                      }
                      onCheckedChange={toggleSelectAll}
                      className="rounded shadow-none"
                    />
                  </div>
                </th>
                {SELECTION_COLUMNS.map((col) => (
                  <SelectionTableHead
                    key={col.id}
                    column={col}
                    isActive={sortColumn === col.id}
                    sortDirection={sortColumn === col.id ? sortDirection : null}
                    filterValue={columnFilters[col.id] ?? ""}
                    onSort={handleSort}
                    onFilter={handleColumnFilter}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={TOTAL_COLS} className="h-60 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="text-primary/40 h-8 w-8 animate-spin" />
                      <p className="text-muted-foreground text-sm italic">
                        Fetching records...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedLines.length === 0 ? (
                <tr>
                  <td colSpan={TOTAL_COLS} className="h-60 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <Search className="text-muted-foreground h-8 w-8" />
                      <p className="text-muted-foreground text-sm italic">
                        No lines found.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredAndSortedLines.map((line, idx) => {
                    const id = lineId(line);
                    const isSelected = selectedIds.has(id);
                    const itemNo = line.No || line.Item_No || "";
                    return (
                      <tr
                        key={`${id}-${idx}`}
                        className={cn(
                          "cursor-pointer border-b whitespace-nowrap transition-colors",
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                        )}
                        onMouseDown={(e) => handleRowMouseDown(id, e)}
                        onMouseEnter={() => handleRowMouseEnter(id)}
                      >
                        <td
                          className="bg-card sticky left-0 z-20 w-16 px-3 py-2 text-center align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-muted-foreground w-5 text-right text-[10px] tabular-nums">
                              {idx + 1}
                            </span>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectLine(id)}
                              className="rounded shadow-none"
                            />
                          </div>
                        </td>
                        <td className="text-primary px-3 py-2 text-left align-middle text-xs font-medium">
                          {line.Document_No}
                        </td>
                        <td className="px-3 py-2 text-left align-middle text-[10px] tabular-nums">
                          {line.Posting_Date || line.Shipment_Date || "—"}
                        </td>
                        <td className="px-3 py-2 text-left align-middle text-[10px] tabular-nums">
                          {line.Location_Code || "—"}
                        </td>
                        <td className="px-3 py-2 text-left align-middle text-xs tabular-nums">
                          {itemNo}
                        </td>
                        <td className="max-w-64 truncate px-3 py-2 text-left align-middle text-[11px]">
                          {line.Description}
                        </td>
                        <td className="px-3 py-2 text-right align-middle text-[11px] tabular-nums">
                          {line.Quantity.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center align-middle text-[10px]">
                          {line.Unit_of_Measure || "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={TOTAL_COLS} className="py-2 text-center">
                      {allFetched ? (
                        <span className="text-muted-foreground/50 text-[10px] italic">
                          — End of records —
                        </span>
                      ) : (
                        <div
                          ref={sentinelRef}
                          className="flex items-center justify-center gap-2 py-1"
                        >
                          {loadingMore && (
                            <>
                              <Loader2 className="text-primary/40 h-3.5 w-3.5 animate-spin" />
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

        <div className="flex shrink-0 items-center justify-between border-t px-4 py-1.5">
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
          {selectedIds.size > 0 && (
            <span className="text-primary text-[10px] font-bold">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Add {selectedIds.size} Selected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Table head helpers ──────────────────────────────────────────────────────

interface SelectionTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
}

function SelectionTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: SelectionTableHeadProps) {
  const SortIcon =
    !isActive || !sortDirection
      ? ArrowUpDown
      : sortDirection === "asc"
        ? ArrowUp
        : ArrowDown;
  return (
    <th
      className={cn(
        "bg-muted text-foreground h-10 px-3 text-left align-middle text-[10px] font-bold tracking-wider whitespace-nowrap uppercase select-none",
        column.align === "right" && "text-right",
        column.align === "center" && "text-center",
      )}
      style={{ minWidth: column.width }}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          column.align === "right"
            ? "justify-end"
            : column.align === "center"
              ? "justify-center"
              : "",
        )}
      >
        <span
          className="cursor-pointer transition-opacity hover:opacity-70"
          onClick={() => column.sortable && onSort(column.id)}
        >
          {column.label}
        </span>
        {column.sortable && (
          <button
            type="button"
            className="transition-opacity hover:opacity-70"
            onClick={() => onSort(column.id)}
          >
            <SortIcon className={cn("h-3 w-3", !isActive && "opacity-30")} />
          </button>
        )}
        {column.filterType && (
          <SelectionColumnFilter
            column={column}
            value={filterValue}
            onChange={(v) => onFilter(column.id, v)}
          />
        )}
      </div>
    </th>
  );
}

interface SelectionColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function SelectionColumnFilter({
  column,
  value,
  onChange,
}: SelectionColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  const hasFilter = !!value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded p-0.5 transition-colors",
            hasFilter
              ? "text-primary"
              : "text-primary/30 hover:text-primary/60",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className={cn("h-3 w-3", hasFilter && "fill-current")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-xs">Filter {column.label}</Label>
          <Input
            placeholder="Search..."
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange(local);
                setOpen(false);
              }
            }}
          />
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => {
              onChange(local);
              setOpen(false);
            }}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => {
                setLocal("");
                onChange("");
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
