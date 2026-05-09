"use client";

/**
 * LocationSelect component for Transfer Order forms
 * Opens a Dialog with a searchable, sortable, filterable, infinite-scroll table.
 * Columns: Code, Name, City, Address, PIN Code
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
  MapPin,
  Settings2,
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
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  getTransferLocationsForDialog,
  type TransferLocationCode as Location,
} from "@/lib/api/services/transfer-orders.service";

interface LocationSelectProps {
  value: string;
  onChange: (value: string, location?: Location) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  authorizedCodes?: string[];
  title?: string;
  branchCode?: string;
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
    id: "Code",
    label: "Code",
    sortable: true,
    filterType: "text",
    width: "120px",
  },
  {
    id: "Name",
    label: "Name",
    sortable: true,
    filterType: "text",
    flex: true,
  },
  {
    id: "City",
    label: "City",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Address",
    label: "Address",
    sortable: true,
    filterType: "text",
    width: "250px",
  },
  {
    id: "Post_Code",
    label: "PIN Code",
    sortable: true,
    filterType: "text",
    width: "100px",
  },
];

export function LocationSelect({
  value,
  onChange,
  placeholder = "Select Location",
  disabled = false,
  className,
  hasError = false,
  authorizedCodes,
  title = "Select Location",
  branchCode,
}: LocationSelectProps) {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [allFetched, setAllFetched] = useState(false);
  
  const [sortColumn, setSortColumn] = useState<string | null>("Code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const PAGE_SIZE = 30;

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
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
        if (!isNextPage) setLocations([]); // Clear results for fresh search
      }

      try {
        const nextSkip = isNextPage ? (page + 1) * PAGE_SIZE : 0;
        const res = await getTransferLocationsForDialog({
          skip: nextSkip,
          top: PAGE_SIZE,
          search: debouncedSearch,
          sortColumn,
          sortDirection,
          filters: columnFilters,
          authorizedCodes,
          branchCode,
        });

        if (requestId !== lastRequestId.current) return;

        if (isNextPage) {
          setLocations((prev) => [...prev, ...res.value]);
          setPage((p) => p + 1);
        } else {
          setLocations(res.value);
          setPage(0);
        }

        setTotalCount(res.count);
        setAllFetched(res.value.length < PAGE_SIZE);
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [loading, loadingMore, allFetched, page, debouncedSearch, sortColumn, sortDirection, columnFilters, authorizedCodes, branchCode]
  );

  useEffect(() => {
    if (open) fetchData(false);
  }, [debouncedSearch, sortColumn, sortDirection, columnFilters, open]);

  // Infinite scroll
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
    } else {
      setFocusedIndex(-1);
    }
  };

  const handleSelect = (l: Location) => {
    if (value === l.Code) {
      onChange("", undefined);
    } else {
      onChange(l.Code, l);
    }
    setOpen(false);
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleSort = (id: string) => {
    if (sortColumn === id) {
      setSortDirection(sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc");
      if (sortDirection === "desc") setSortColumn(null);
    } else {
      setSortColumn(id);
      setSortDirection("asc");
    }
  };

  const handleFilter = (colId: string, val: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!val) delete next[colId];
      else next[colId] = val;
      return next;
    });
  };

  const hasActiveFilters = Object.keys(columnFilters).length > 0;
  const activeFilterCount = Object.keys(columnFilters).length;

  const selectedLocation = locations.find(l => l.Code === value);
  const displayValue = selectedLocation ? `${selectedLocation.Code} - ${selectedLocation.Name}` : value;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setFocusedIndex((prev) => 
          prev < locations.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === "Enter") {
      if (open && focusedIndex >= 0) {
        e.preventDefault();
        const item = locations[focusedIndex];
        if (item) {
          handleSelect(item);
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearchQuery("");
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  // Scroll focused row into view
  useEffect(() => {
    if (open && focusedIndex >= 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const rows = container.querySelectorAll("tbody tr");
      const focusedRow = rows[focusedIndex] as HTMLElement;
      if (focusedRow) {
        focusedRow.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, open]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            value={open ? searchQuery : displayValue}
            onChange={(e) => {
              const query = e.target.value;
              setSearchQuery(query);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              if (!open) {
                setSearchQuery("");
                setOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "h-9 w-full pr-10 text-sm font-normal shadow-sm",
              !value && !open && "text-muted-foreground",
              className,
              hasError && "border-destructive/50 ring-destructive/20"
            )}
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
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 opacity-50" />
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="flex max-h-[var(--radix-popover-content-available-height,80vh)] min-h-0 w-auto max-w-[95vw] min-w-[320px] flex-col overflow-hidden p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ width: "min(800px, 92vw)" }}>
          <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <MapPin className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
              {!loading && totalCount > 0 && (
                <Badge variant="secondary" className="h-4 rounded-sm px-1 text-[10px] font-bold">
                  {totalCount.toLocaleString()}
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => setColumnFilters({})}
                className="text-primary hover:text-primary/80 flex items-center gap-1 text-[10px] font-medium"
              >
                <span>{activeFilterCount} filter active</span>
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="w-8 border-b px-2" />
                  {DEFAULT_COLUMNS.map((col) => (
                    <LocationTableHead
                      key={col.id}
                      column={col}
                      isActive={sortColumn === col.id}
                      sortDirection={sortColumn === col.id ? sortDirection : null}
                      filterValue={columnFilters[col.id] ?? ""}
                      onSort={handleSort}
                      onFilter={handleFilter}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && locations.length === 0 ? (
                  <tr>
                    <td colSpan={DEFAULT_COLUMNS.length + 1} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : locations.length === 0 ? (
                  <tr>
                    <td colSpan={DEFAULT_COLUMNS.length + 1} className="py-10 text-center text-muted-foreground">
                      No locations found
                    </td>
                  </tr>
                ) : (
                  locations.map((l, idx) => (
                    <tr
                      key={l.Code}
                      onClick={() => handleSelect(l)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={cn(
                        "group cursor-pointer border-b transition-colors",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                        value === l.Code && "bg-primary/5",
                        focusedIndex === idx && "bg-accent text-accent-foreground"
                      )}
                    >
                      <td className="w-8 px-2 py-1.5 text-center">
                        {value === l.Code && <Check className={cn("mx-auto h-3 w-3 text-primary", focusedIndex === idx && "text-accent-foreground")} />}
                      </td>
                      {DEFAULT_COLUMNS.map((col) => (
                        <td key={col.id} className={cn("px-2 py-1.5", col.id === "Code" && "font-mono font-semibold", focusedIndex === idx && "text-accent-foreground/90")}>
                          {(l as any)[col.id] || <span className="opacity-30">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {!loading && <tr ref={sentinelRef}><td colSpan={DEFAULT_COLUMNS.length + 1} className="h-px" /></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LocationTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
}) {
  return (
    <th
      className={cn("bg-muted h-10 border-b px-2 py-2 text-left align-middle text-xs font-bold", isActive && "text-primary")}
      style={column.width ? { width: column.width, minWidth: column.width } : undefined}
    >
      <div className="flex items-center gap-1.5">
        <span className="cursor-pointer" onClick={() => column.sortable && onSort(column.id)}>{column.label}</span>
        {column.sortable && (
           <button onClick={() => onSort(column.id)}>
             {!isActive || !sortDirection ? <ArrowUpDown className="h-3 w-3 opacity-50" /> : sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
           </button>
        )}
        {column.filterType && (
           <Popover>
             <PopoverTrigger asChild>
               <button className={cn("p-0.5 rounded", filterValue ? "text-primary" : "text-muted-foreground/30")}>
                 <Filter className="h-3 w-3" />
               </button>
             </PopoverTrigger>
             <PopoverContent className="w-52 p-3">
                <Label className="text-xs mb-2 block">Filter</Label>
                <Input 
                  value={filterValue} 
                  onChange={(e) => onFilter(column.id, e.target.value)} 
                  className="h-8 text-xs mb-2"
                />
             </PopoverContent>
           </Popover>
        )}
      </div>
    </th>
  );
}
