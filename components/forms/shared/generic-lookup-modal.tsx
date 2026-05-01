"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  ChevronDownIcon,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Check,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ColumnConfig<T> {
  id: keyof T | string;
  label: string;
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface GenericLookupModalProps<T> {
  value: string;
  onChange: (value: string, item?: T) => void;
  fetchData: (skip: number, search: string) => Promise<T[]>;
  columns: ColumnConfig<T>[];
  title?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  keyExtractor: (item: T) => string;
  displayValueExtractor: (item: T) => string;
  icon?: React.ReactNode;
  pageSize?: number;
}

export function GenericLookupModal<T>({
  value,
  onChange,
  fetchData,
  columns,
  title = "Select Option",
  placeholder = "Select Option",
  disabled = false,
  className,
  hasError = false,
  keyExtractor,
  displayValueExtractor,
  icon = <List className="text-muted-foreground h-4 w-4" />,
  pageSize = 30,
}: GenericLookupModalProps<T>) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [allFetched, setAllFetched] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const lastRequestId = useRef(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(
    async (isNextPage = false) => {
      if (isNextPage && (loading || loadingMore || allFetched)) return;

      const requestId = ++lastRequestId.current;
      if (isNextPage) setLoadingMore(true);
      else {
        setLoading(true);
        setItems([]);
      }

      try {
        const nextSkip = isNextPage ? (page + 1) * pageSize : 0;
        const result = await fetchData(nextSkip, debouncedSearch);

        if (requestId !== lastRequestId.current) return;

        if (isNextPage) {
          setItems((prev) => [...prev, ...result]);
          setPage((p) => p + 1);
        } else {
          setItems(result);
          setPage(0);
        }

        setAllFetched(result.length < pageSize);
      } catch (error) {
        console.error("Error fetching data for lookup modal:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [loading, loadingMore, allFetched, page, debouncedSearch, fetchData, pageSize]
  );

  useEffect(() => {
    if (open) loadData(false);
  }, [debouncedSearch, open]);

  // Infinite scroll
  useEffect(() => {
    if (!open) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && !allFetched) {
          loadData(true);
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [open, loading, loadingMore, allFetched, loadData]);

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
    }
  };

  const handleSelect = (item: T) => {
    const itemValue = keyExtractor(item);
    if (value === itemValue) {
      onChange("", undefined);
    } else {
      onChange(itemValue, item);
    }
    setOpen(false);
  };

  const selectedItem = items.find((t) => keyExtractor(t) === value);
  const displayLabel = selectedItem ? displayValueExtractor(selectedItem) : value;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          "h-8 w-full justify-between px-2.5 text-left font-normal border-border/50 hover:border-border transition-all hover:bg-muted/30",
          !value && "text-muted-foreground",
          hasError && "border-destructive/50 ring-destructive/20",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate max-w-[92%]">
          <div className={cn("shrink-0 transition-opacity", !value && "opacity-50")}>
            {icon}
          </div>
          <span className="truncate">
            {displayLabel || placeholder}
          </span>
        </div>
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
          className="flex h-[70vh] flex-col gap-0 p-0"
          style={{ width: "min(600px, 95vw)", maxWidth: "none" }}
          aria-describedby="generic-lookup-modal-description"
        >
          <div id="generic-lookup-modal-description" className="sr-only">
            Select an option from the list. Use the search field to filter options.
          </div>
          <DialogHeader className="shrink-0 border-b px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {icon}
                <DialogTitle className="text-[15px] font-semibold">
                  {title}
                </DialogTitle>
                {!loading && items.length > 0 && (
                  <Badge variant="secondary" className="h-5 rounded-sm px-1.5 text-[10px] font-bold">
                    {items.length}{!allFetched ? "+" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="bg-muted/30 shrink-0 border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background h-8 pl-9 pr-9 text-sm focus-visible:ring-1"
                  autoFocus
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="absolute top-1/2 right-3 -translate-y-1/2">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted shadow-sm">
                <tr>
                  <th className="w-10 border-b px-3" />
                  {columns.map((col) => (
                    <th
                      key={String(col.id)}
                      className="h-10 border-b px-2 py-3 text-left align-middle text-xs font-bold whitespace-nowrap text-muted-foreground uppercase tracking-wider"
                      style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="mt-2 text-xs text-muted-foreground">Loading...</p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-20 text-center">
                      <List className="mx-auto h-8 w-8 text-muted-foreground/40" />
                      <p className="mt-2 text-sm font-medium text-muted-foreground">No options found</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const itemValue = keyExtractor(item);
                    return (
                      <tr
                        key={itemValue}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "group cursor-pointer border-b transition-colors hover:bg-primary/5",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                          value === itemValue && "bg-primary/10"
                        )}
                      >
                        <td className="w-10 px-3 py-2.5 text-center">
                          {value === itemValue && <Check className="mx-auto h-3.5 w-3.5 text-primary" />}
                        </td>
                        {columns.map((col) => (
                          <td key={String(col.id)} className="px-2 py-2.5 text-xs">
                            {col.render ? col.render(item, idx) : (item as any)[col.id] || <span className="opacity-30">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
                {!loading && <tr ref={sentinelRef}><td colSpan={columns.length + 1} className="h-px" /></tr>}
                {loadingMore && (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-3 text-center">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-muted/20 border-t px-5 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
             <span>Showing {items.length} options</span>
             {value && <span className="font-semibold text-primary">Selected: {displayLabel}</span>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
