"use client";

/**
 * SalesItemSelectDialog — dialog-based item picker for sales documents.
 * Opens a full-screen dialog with a searchable, sortable, infinite-scroll table.
 * Columns: No., Description, Unit Price, UOM
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  ChevronDownIcon,
  Search,
  X,
  Check,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSalesItemsForDialog,
  type Item,
} from "@/lib/api/services/item.service";

interface SalesItemSelectDialogProps {
  value: string;
  onChange: (value: string, item?: Item) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  locationCode?: string;
}

interface ColumnConfig {
  id: string;
  label: string;
  sortable?: boolean;
  width?: string;
  flex?: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { id: "No", label: "No.", sortable: true, width: "140px" },
  { id: "Description", label: "Description", sortable: true, flex: true },
  { id: "Unit_Price", label: "Unit Price", sortable: true, width: "110px" },
  { id: "Sales_Unit_of_Measure", label: "UOM", width: "80px" },
  { id: "Net_Change", label: "Net Change", sortable: true, width: "110px" },
];

const PAGE_SIZE = 30;

export function SalesItemSelectDialog({
  value,
  onChange,
  placeholder = "Select Item",
  disabled = false,
  className,
  hasError = false,
  locationCode,
}: SalesItemSelectDialogProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [allFetched, setAllFetched] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("No");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const lastRequestId = useRef(0);
  const selectedItemRef = useRef<Item | undefined>(undefined);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchData = useCallback(
    async (isNextPage = false) => {
      if (isNextPage && (loading || loadingMore || allFetched)) return;

      const requestId = ++lastRequestId.current;
      if (isNextPage) setLoadingMore(true);
      else {
        setLoading(true);
        setItems([]);
        setAllFetched(false);
      }

      try {
        const nextSkip = isNextPage ? (page + 1) * PAGE_SIZE : 0;
        const res = await getSalesItemsForDialog({
          skip: nextSkip,
          top: PAGE_SIZE,
          search: debouncedSearch,
          sortColumn,
          sortDirection,
          locationCode,
        });

        if (requestId !== lastRequestId.current) return;

        if (isNextPage) {
          setItems((prev) => [...prev, ...res.value]);
          setPage((p) => p + 1);
        } else {
          setItems(res.value);
          setPage(0);
        }

        setTotalCount(res.count);
        setAllFetched(res.value.length < PAGE_SIZE);
      } catch {
        // non-fatal
      } finally {
        if (requestId === lastRequestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [loading, loadingMore, allFetched, page, debouncedSearch, sortColumn, sortDirection, locationCode],
  );

  // Refetch when search/sort/open changes
  useEffect(() => {
    if (open) fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sortColumn, sortDirection, open, locationCode]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!open) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadingMore &&
          !allFetched
        ) {
          fetchData(true);
        }
      },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [open, loading, loadingMore, allFetched, fetchData]);

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
    }
  };

  const handleSelect = (item: Item) => {
    if (value === item.No) {
      selectedItemRef.current = undefined;
      onChange("", undefined);
    } else {
      selectedItemRef.current = item;
      onChange(item.No, item);
    }
    setOpen(false);
  };

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  };

  const selectedItem = items.find((i) => i.No === value);
  const displayLabel = selectedItem
    ? `${selectedItem.No} - ${selectedItem.Description}`
    : value
      ? value
      : "";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          "h-8 w-full justify-between px-3 text-left font-normal border-border/50",
          !value && "text-muted-foreground",
          hasError && "border-destructive/50 ring-destructive/20",
          className,
        )}
      >
        <span className="max-w-[92%] truncate text-xs">
          {displayLabel || placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {value && !disabled && (
            <div
              role="button"
              tabIndex={0}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectedItemRef.current = undefined;
                onChange("", undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("", undefined);
                }
              }}
            >
              <X className="h-3 w-3" />
            </div>
          )}
          <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-40" />
        </div>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex h-[85vh] flex-col gap-0 p-0"
          style={{ width: "min(900px, 92vw)", maxWidth: "none" }}
        >
          {/* Header */}
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <div className="flex items-center gap-2.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="text-[15px] font-semibold">
                Select Item
              </DialogTitle>
              {!loading && totalCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 rounded-sm px-1.5 text-[10px] font-bold"
                >
                  {totalCount.toLocaleString()}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Search bar */}
          <div className="shrink-0 border-b bg-muted/30 px-5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by No. or Description…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 bg-background pl-9 pr-9 text-sm focus-visible:ring-1"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {locationCode && (
                <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                  Location: {locationCode}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="w-10 border-b px-3" />
                  {COLUMNS.map((col) => (
                    <th
                      key={col.id}
                      className={cn(
                        "h-10 border-b px-3 py-2 text-left text-xs font-bold bg-muted",
                        col.sortable && "cursor-pointer select-none hover:bg-muted/80",
                      )}
                      style={col.flex ? undefined : { width: col.width }}
                      onClick={() => col.sortable && handleSort(col.id)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortColumn === col.id && (
                          <span className="text-[10px] text-primary">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 1}
                      className="py-20 text-center"
                    >
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 1}
                      className="py-20 text-center text-muted-foreground"
                    >
                      No items found
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr
                      key={item.No}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "group cursor-pointer border-b transition-colors hover:bg-primary/5",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                        value === item.No && "bg-primary/10",
                      )}
                    >
                      <td className="w-10 px-3 py-2.5 text-center">
                        {value === item.No && (
                          <Check className="mx-auto h-3.5 w-3.5 text-primary" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] font-semibold">
                        {item.No}
                      </td>
                      <td className="px-3 py-2 text-xs">{item.Description}</td>
                      <td className="px-3 py-2 text-xs tabular-nums">
                        {item.Unit_Price != null && item.Unit_Price > 0
                          ? item.Unit_Price.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {item.Sales_Unit_of_Measure ||
                          item.Base_Unit_of_Measure ||
                          "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-xs font-bold tabular-nums",
                          (item.Net_Change ?? 0) <= 0
                            ? "text-red-500"
                            : "text-green-600",
                        )}
                      >
                        {item.Net_Change?.toLocaleString() ?? "0"}
                      </td>
                    </tr>
                  ))
                )}
                {!loading && (
                  <tr ref={sentinelRef}>
                    <td colSpan={COLUMNS.length + 1} className="h-px">
                      {loadingMore && (
                        <div className="flex justify-center py-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
