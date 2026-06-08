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
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
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
  { id: "Sales_Unit_of_Measure", label: "UOM", width: "80px" },
  { id: "Net_Change", label: "Net Change", sortable: true, width: "110px" },
];

const PAGE_SIZE = 50;

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
  const [activeIndex, setActiveIndex] = useState(-1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const lastRequestId = useRef(0);
  const selectedItemRef = useRef<Item | undefined>(undefined);

  const isLoading = useRef(false);
  const isLoadingMore = useRef(false);
  const isAllFetched = useRef(false);
  const pageRef = useRef(0);
  const isKeyboardActionRef = useRef(false);
  const closeReasonRef = useRef<"select" | "escape" | "tab" | "clickOutside" | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Client-side filtering is no longer needed since we search on the backend for all query lengths
  const filteredItems = items;

  const fetchData = useCallback(
    async (isNextPage = false) => {
      if (isNextPage && (isLoading.current || isLoadingMore.current || isAllFetched.current)) return;
      if (!isNextPage && isLoading.current) return;

      const requestId = ++lastRequestId.current;
      if (isNextPage) {
        isLoadingMore.current = true;
        setLoadingMore(true);
      } else {
        isLoading.current = true;
        setLoading(true);
        setItems([]);
        setPage(0);
        pageRef.current = 0;
        isAllFetched.current = false;
        setAllFetched(false);
      }

      try {
        const nextSkip = isNextPage ? (pageRef.current + 1) * PAGE_SIZE : 0;
        const res = await getSalesItemsForDialog({
          skip: nextSkip,
          top: PAGE_SIZE,
          search: debouncedSearch === value ? "" : debouncedSearch,
          sortColumn,
          sortDirection,
          locationCode,
        });

        if (requestId !== lastRequestId.current) return;

        if (isNextPage) {
          setItems((prev) => [...prev, ...res.value]);
          pageRef.current += 1;
          setPage(pageRef.current);
        } else {
          setItems(res.value);
          pageRef.current = 0;
          setPage(0);
        }

        setTotalCount(res.count);
        const reachedEnd = res.value.length < PAGE_SIZE;
        isAllFetched.current = reachedEnd;
        setAllFetched(reachedEnd);
      } catch {
        // non-fatal
      } finally {
        if (requestId === lastRequestId.current) {
          isLoading.current = false;
          setLoading(false);
          isLoadingMore.current = false;
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, sortColumn, sortDirection, locationCode, value]
  );

  // Refetch when search/sort/open changes
  useEffect(() => {
    if (open) fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sortColumn, sortDirection, open, locationCode, fetchData]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!open) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isLoading.current &&
          !isLoadingMore.current &&
          !isAllFetched.current
        ) {
          fetchData(true);
        }
      },
      { 
        threshold: 0.1,
        root: scrollContainerRef.current
      },
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [open, fetchData]);

  // Scroll active item into view
  useEffect(() => {
    if (open && activeIndex >= 0 && scrollContainerRef.current && isKeyboardActionRef.current) {
      const container = scrollContainerRef.current;
      const activeElement = container.querySelector(
        `[data-row-index="${activeIndex}"]`
      ) as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
    isKeyboardActionRef.current = false;
    if (newOpen) {
      closeReasonRef.current = null;
      setActiveIndex(-1);
    } else {
      setSearchQuery("");
      setActiveIndex(-1);
    }
  };

  const handleSelect = (item: Item) => {
    closeReasonRef.current = "select";
    if (value === item.No) {
      selectedItemRef.current = undefined;
      onChange("", undefined);
    } else {
      selectedItemRef.current = item;
      onChange(item.No, item);
    }
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      isKeyboardActionRef.current = true;
      setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      isKeyboardActionRef.current = true;
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && activeIndex < filteredItems.length) {
        handleSelect(filteredItems[activeIndex]);
      } else if (!open) {
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        closeReasonRef.current = "escape";
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      closeReasonRef.current = "tab";
      setOpen(false);
    }
  };

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  };

  const handleListWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollHeight <= element.clientHeight) return;
    e.preventDefault();
    e.stopPropagation();
    element.scrollTop += e.deltaY;
  };

  const displayLabel = value || "";

  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            value={open ? searchQuery : displayLabel}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveIndex(-1);
              if (!open) setOpen(true);
              if (value) {
                onChange("", undefined);
                selectedItemRef.current = undefined;
              }
            }}
            onFocus={(e) => {
              setIsFocused(true);
              setSearchQuery(displayLabel);
              setTimeout(() => e.target.select(), 0);
            }}
            onBlur={() => {
              setIsFocused(false);
              setSearchQuery("");
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "h-8 w-full bg-background pr-8 text-xs font-medium",
              hasError && "border-destructive focus-visible:ring-destructive",
              className
            )}
            onClick={() => {
              if (!open && !disabled) setOpen(true);
            }}
          />
          <div className="absolute right-0 top-0 flex h-full items-center gap-1.5 px-3">
            {value && !disabled && (
              <div
                role="button"
                tabIndex={0}
                className="hover:text-foreground p-1 text-muted-foreground transition-colors hover:bg-muted rounded-full pointer-events-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange("", undefined);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                <X className="h-3 w-3" />
              </div>
            )}
            {loading && items.length === 0 ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 opacity-40" />
            )}
          </div>
        </div>
      </PopoverAnchor>

      <PopoverContent
        className="flex flex-col gap-0 p-0 shadow-xl"
        style={{ width: "min(620px, 92vw)", height: "400px" }}
        align="start"
        sideOffset={4}
        onPointerDownOutside={() => {
          closeReasonRef.current = "clickOutside";
        }}
        onCloseAutoFocus={(e) => {
          if (closeReasonRef.current === "tab" || closeReasonRef.current === "clickOutside") {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          inputRef.current?.focus();
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-3 py-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Items</span>
            {!loading && totalCount > 0 && (
              <Badge variant="secondary" className="h-4 rounded-[4px] px-1 text-[9px]">
                {totalCount.toLocaleString()}
              </Badge>
            )}
          </div>
          {locationCode && (
            <div className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Loc: {locationCode}
            </div>
          )}
        </div>

        {/* Table */}
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-auto"
            data-scroll-lock-ignore
            onWheel={handleListWheel}
          >
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
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 1}
                      className="py-20 text-center text-muted-foreground"
                    >
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isFocused = activeIndex === idx;
                    const isSelected = value === item.No;
                    return (
                      <tr
                        key={item.No}
                        data-row-index={idx}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "group cursor-pointer border-b transition-colors hover:bg-primary/5",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                          isFocused && "bg-accent",
                          isSelected && (isFocused ? "bg-primary/10" : "bg-primary/5"),
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
                  );
                })
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
          {/* Footer / Status */}
          <div className="flex shrink-0 items-center justify-between border-t bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
            <span>
              Showing <b>{filteredItems.length}</b> of <b>{totalCount}</b> items
            </span>
          </div>
        </PopoverContent>
      </Popover>
  );
}
