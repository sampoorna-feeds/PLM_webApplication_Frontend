"use client";

/**
 * ItemSelect component for Transfer Order forms
 * Opens a Dialog with a searchable, sortable, filterable, infinite-scroll table.
 * Columns: No., Description, Net Change (Stock)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  ChevronDownIcon,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Check,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTransferItemsForDialog,
  type TransferItem as Item,
} from "@/lib/api/services/transfer-orders.service";

interface ItemSelectProps {
  value: string;
  onChange: (value: string, item?: Item) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  locationCode?: string;
  dateFilter?: string;
  customFilter?: string;
}

type SortDirection = "asc" | "desc" | null;

interface ColumnConfig {
  id: string;
  label: string;
  sortable?: boolean;
  filterType?: "text";
  width?: string;
  flex?: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "No",
    label: "No.",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Description",
    label: "Description",
    sortable: true,
    filterType: "text",
    flex: true,
  },
  {
    id: "Net_Change",
    label: "Net Change",
    sortable: true,
    width: "120px",
  },
];

export function ItemSelect({
  value,
  onChange,
  placeholder = "Select Item",
  disabled = false,
  className,
  hasError = false,
  locationCode,
  dateFilter,
  customFilter,
}: ItemSelectProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [allFetched, setAllFetched] = useState(false);
  
  const [sortColumn, setSortColumn] = useState<string | null>("No");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const PAGE_SIZE = 30;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const lastRequestId = useRef(0);

  const fetchData = useCallback(
    async (isNextPage = false) => {
      if (isNextPage && (loading || loadingMore || allFetched)) return;

      const requestId = ++lastRequestId.current;
      if (isNextPage) setLoadingMore(true);
      else {
        setLoading(true);
        setItems([]);
      }

      try {
        const nextSkip = isNextPage ? (page + 1) * PAGE_SIZE : 0;
        const res = await getTransferItemsForDialog({
          skip: nextSkip,
          top: PAGE_SIZE,
          search: debouncedSearch,
          sortColumn,
          sortDirection,
          filters: columnFilters,
          locationCode,
          dateFilter,
          customFilter,
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
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [loading, loadingMore, allFetched, page, debouncedSearch, sortColumn, sortDirection, columnFilters, locationCode, dateFilter, customFilter]
  );

  useEffect(() => {
    if (open) fetchData(false);
  }, [debouncedSearch, sortColumn, sortDirection, columnFilters, open, locationCode, customFilter]);

  useEffect(() => {
    if (!open) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && !allFetched) {
          fetchData(true);
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [open, loading, loadingMore, allFetched, fetchData]);

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
      setColumnFilters({});
    }
  };

  const handleSelect = (i: Item) => {
    if (value === i.No) {
      onChange("", undefined);
    } else {
      onChange(i.No, i);
    }
    setOpen(false);
  };

  const hasActiveFilters = Object.keys(columnFilters).length > 0;
  
  const selectedItem = items.find(i => i.No === value);
  const displayLabel = selectedItem ? `${selectedItem.No} - ${selectedItem.Description}` : value;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          "w-full h-8 justify-between px-3 text-left font-normal border-border/50",
          !value && "text-muted-foreground",
          hasError && "border-destructive/50 ring-destructive/20",
          className
        )}
      >
        <span className="truncate max-w-[92%]">
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <div
              role="button"
              tabIndex={0}
              className="hover:text-foreground p-1 text-muted-foreground transition-colors hover:bg-muted rounded-full"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("", undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
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
          style={{ width: "min(1000px, 92vw)", maxWidth: "none" }}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package className="text-muted-foreground h-4 w-4" />
                <DialogTitle className="text-[15px] font-semibold">
                  Select Item
                </DialogTitle>
                {!loading && totalCount > 0 && (
                  <Badge variant="secondary" className="h-5 rounded-sm px-1.5 text-[10px] font-bold">
                    {totalCount.toLocaleString()}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="bg-muted/30 shrink-0 border-b px-5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by No. or Description …"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background h-9 pl-9 pr-9 text-sm focus-visible:ring-1"
                  autoFocus
                />
              </div>
              {locationCode && (
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-md text-[11px] font-semibold text-primary">
                  Location: {locationCode}
                </div>
              )}
            </div>
          </div>

          <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="w-10 border-b px-3" />
                  {DEFAULT_COLUMNS.map((col) => (
                    <th key={col.id} className="bg-muted h-10 border-b px-3 py-2 text-left text-xs font-bold">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={DEFAULT_COLUMNS.length + 1} className="py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={DEFAULT_COLUMNS.length + 1} className="py-20 text-center text-muted-foreground">
                      No items found
                    </td>
                  </tr>
                ) : (
                  items.map((i, idx) => (
                    <tr
                      key={i.No}
                      onClick={() => handleSelect(i)}
                      className={cn(
                        "group cursor-pointer border-b transition-colors hover:bg-primary/5",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                        value === i.No && "bg-primary/10"
                      )}
                    >
                      <td className="w-10 px-3 py-2.5 text-center">
                        {value === i.No && <Check className="mx-auto h-3.5 w-3.5 text-primary" />}
                      </td>
                      <td className="px-3 py-2 text-[11px] font-mono font-semibold">{i.No}</td>
                      <td className="px-3 py-2 text-xs">{i.Description}</td>
                      <td className={cn(
                        "px-3 py-2 text-xs font-bold",
                        (i.Net_Change || 0) <= 0 ? "text-red-500" : "text-green-600"
                      )}>
                        {i.Net_Change?.toLocaleString() || "0"}
                      </td>
                    </tr>
                  ))
                )}
                {!loading && <tr ref={sentinelRef}><td colSpan={DEFAULT_COLUMNS.length + 1} className="h-px" /></tr>}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
