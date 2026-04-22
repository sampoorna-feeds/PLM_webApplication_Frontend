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
  {
    id: "County",
    label: "State",
    sortable: true,
    filterType: "text",
    width: "150px",
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
        setLocations([]); // Clear results for fresh search
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
    [loading, loadingMore, allFetched, page, debouncedSearch, sortColumn, sortDirection, columnFilters, authorizedCodes]
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
    }
  };

  const handleSelect = (l: Location) => {
    onChange(l.Code, l);
    setOpen(false);
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
  const displayLabel = selectedLocation ? `${selectedLocation.Code} - ${selectedLocation.Name}` : value;

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
        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-40" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex h-[85vh] flex-col gap-0 p-0"
          style={{ width: "min(1000px, 92vw)", maxWidth: "none" }}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="text-muted-foreground h-4 w-4" />
                <DialogTitle className="text-[15px] font-semibold">
                  {title}
                </DialogTitle>
                {!loading && totalCount > 0 && (
                  <Badge variant="secondary" className="h-5 rounded-sm px-1.5 text-[10px] font-bold">
                    {totalCount.toLocaleString()}
                  </Badge>
                )}
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => setColumnFilters({})}
                  className="text-primary hover:text-primary/80 flex items-center gap-1 text-[11px] font-medium"
                >
                  <span>{activeFilterCount} filter active</span>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="bg-muted/30 shrink-0 border-b px-5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by Code or Name …"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background h-9 pl-9 pr-9 text-sm focus-visible:ring-1"
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
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="w-10 border-b px-3" />
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
                {loading ? (
                  <tr>
                    <td colSpan={DEFAULT_COLUMNS.length + 1} className="py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : locations.length === 0 ? (
                  <tr>
                    <td colSpan={DEFAULT_COLUMNS.length + 1} className="py-20 text-center text-muted-foreground">
                      No locations found
                    </td>
                  </tr>
                ) : (
                  locations.map((l, idx) => (
                    <tr
                      key={l.Code}
                      onClick={() => handleSelect(l)}
                      className={cn(
                        "group cursor-pointer border-b transition-colors hover:bg-primary/5",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                        value === l.Code && "bg-primary/10"
                      )}
                    >
                      <td className="w-10 px-3 py-2.5 text-center">
                        {value === l.Code && <Check className="mx-auto h-3.5 w-3.5 text-primary" />}
                      </td>
                      {DEFAULT_COLUMNS.map((col) => (
                        <td key={col.id} className={cn("px-3 py-2 text-xs", col.id === "Code" && "font-mono font-semibold")}>
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
        </DialogContent>
      </Dialog>
    </>
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
