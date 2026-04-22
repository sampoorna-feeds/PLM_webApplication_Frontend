"use client";

/**
 * TransporterSelect component for Transfer Order forms
 * Opens a Dialog with a searchable, sortable, filterable, infinite-scroll table.
 * Columns: No., Name, PAN No., GST Reg. No.
 * Search covers all fields server-side (using getVendorsForDialog with transporterOnly=true).
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
  Truck,
  Settings2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  getVendorsForDialog,
  type Vendor as Transporter,
} from "@/lib/api/services/vendor.service";

interface TransporterSelectProps {
  value: string;
  onChange: (value: string, transporter?: Transporter) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
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
    width: "140px",
  },
  {
    id: "Name",
    label: "Transporter Name",
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
    id: "P_A_N_No",
    label: "PAN No.",
    sortable: true,
    filterType: "text",
    width: "170px",
  },
  {
    id: "GST_Registration_No",
    label: "GST No.",
    sortable: true,
    filterType: "text",
    width: "210px",
  },
  {
    id: "Address",
    label: "Address",
    sortable: true,
    filterType: "text",
    width: "250px",
  },
  {
    id: "State_Code",
    label: "State",
    sortable: true,
    filterType: "text",
    width: "120px",
  },
];

const OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Phone_No", label: "Phone No", sortable: true, filterType: "text", width: "150px" },
  { id: "E_Mail", label: "E Mail", sortable: true, filterType: "text", width: "150px" },
];

export function TransporterSelect({
  value,
  onChange,
  placeholder = "Select Transporter",
  disabled = false,
  className,
  hasError = false,
}: TransporterSelectProps) {
  const [open, setOpen] = useState(false);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
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
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => 
    DEFAULT_COLUMNS.map(c => c.id)
  );

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
        setTransporters([]);
      }

      try {
        const nextSkip = isNextPage ? (page + 1) * PAGE_SIZE : 0;
        const res = await getVendorsForDialog({
          skip: nextSkip,
          top: PAGE_SIZE,
          search: debouncedSearch,
          sortColumn,
          sortDirection,
          filters: columnFilters,
          visibleColumns,
          transporterOnly: true,
        });

        if (requestId !== lastRequestId.current) return;

        if (isNextPage) {
          setTransporters((prev) => [...prev, ...res.value]);
          setPage((p) => p + 1);
        } else {
          setTransporters(res.value);
          setPage(0);
        }

        setTotalCount(res.count);
        setAllFetched(res.value.length < PAGE_SIZE);
      } catch (error) {
        console.error("Error fetching transporters:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [loading, loadingMore, allFetched, page, debouncedSearch, sortColumn, sortDirection, columnFilters, visibleColumns]
  );

  useEffect(() => {
    if (open) fetchData(false);
  }, [debouncedSearch, sortColumn, sortDirection, columnFilters, visibleColumns, open]);

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
      setSortColumn("No");
      setSortDirection("asc");
    }
  };

  const handleSelect = (t: Transporter) => {
    if (value === t.No) {
      onChange("", undefined);
    } else {
      onChange(t.No, t);
    }
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

  const onColumnToggle = (id: string) => {
    setVisibleColumns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const onResetColumns = () => setVisibleColumns(DEFAULT_COLUMNS.map(c => c.id));
  const onShowAllColumns = () => setVisibleColumns([...DEFAULT_COLUMNS, ...OPTIONAL_COLUMNS].map(c => c.id));

  const hasActiveFilters = Object.keys(columnFilters).length > 0;
  const activeFilterCount = Object.keys(columnFilters).length;
  const currentColumns = [...DEFAULT_COLUMNS, ...OPTIONAL_COLUMNS].filter(c => visibleColumns.includes(c.id));

  // Find current label
  const selectedTransporter = transporters.find(t => t.No === value);
  const displayLabel = selectedTransporter ? `${selectedTransporter.No} - ${selectedTransporter.Name}` : value;

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
          className="flex h-[88vh] flex-col gap-0 p-0"
          style={{ width: "min(1160px, 92vw)", maxWidth: "none" }}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="text-muted-foreground h-4 w-4" />
                <DialogTitle className="text-[15px] font-semibold">
                  Select Transporter
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
                  <span>{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>
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
                  placeholder="Search by No. or Name …"
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
              <TransporterColumnVisibility
                visibleColumns={visibleColumns}
                defaultColumns={DEFAULT_COLUMNS}
                optionalColumns={OPTIONAL_COLUMNS}
                onColumnToggle={onColumnToggle}
                onResetColumns={onResetColumns}
                onShowAllColumns={onShowAllColumns}
              />
            </div>
          </div>

          <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="w-10 border-b px-3" />
                  {currentColumns.map((col) => (
                    <TransporterTableHead
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
                    <td colSpan={currentColumns.length + 1} className="py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="mt-2 text-xs text-muted-foreground">Loading transporters…</p>
                    </td>
                  </tr>
                ) : transporters.length === 0 ? (
                  <tr>
                    <td colSpan={currentColumns.length + 1} className="py-20 text-center">
                      <Truck className="mx-auto h-8 w-8 text-muted-foreground/40" />
                      <p className="mt-2 text-sm font-medium text-muted-foreground">No transporters found</p>
                    </td>
                  </tr>
                ) : (
                  transporters.map((t, idx) => (
                    <tr
                      key={t.No}
                      onClick={() => handleSelect(t)}
                      className={cn(
                        "group cursor-pointer border-b transition-colors hover:bg-primary/5",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                        value === t.No && "bg-primary/10"
                      )}
                    >
                      <td className="w-10 px-3 py-2.5 text-center">
                        {value === t.No && <Check className="mx-auto h-3.5 w-3.5 text-primary" />}
                      </td>
                      {currentColumns.map((col) => (
                        <td key={col.id} className={cn("px-3 py-2.5 text-xs whitespace-nowrap", col.id === "No" && "font-mono font-semibold")}>
                          {(t as any)[col.id] || <span className="opacity-30">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {!loading && <tr ref={sentinelRef}><td colSpan={currentColumns.length + 1} className="h-px" /></tr>}
                {loadingMore && (
                  <tr>
                    <td colSpan={currentColumns.length + 1} className="py-3 text-center">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-muted/20 border-t px-5 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
             <span>Showing {transporters.length} of {totalCount} transporters</span>
             {value && <span className="font-semibold text-primary">Selected: {displayLabel}</span>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TransporterTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
}

function TransporterTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: TransporterTableHeadProps) {
  return (
    <th
      className={cn("bg-muted h-10 border-b px-2 py-3 text-left align-middle text-xs font-bold whitespace-nowrap", isActive && "text-primary")}
      style={column.width ? { width: column.width, minWidth: column.width } : undefined}
    >
      <div className="flex items-center gap-1.5">
        <span className="cursor-pointer hover:text-primary" onClick={() => column.sortable && onSort(column.id)}>{column.label}</span>
        {column.sortable && (
           <button onClick={() => onSort(column.id)}>
             {!isActive || !sortDirection ? <ArrowUpDown className="h-3 w-3 opacity-50" /> : sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
           </button>
        )}
        {column.filterType && (
           <Popover>
             <PopoverTrigger asChild>
               <button className={cn("p-0.5 rounded hover:bg-background/50", filterValue ? "text-primary" : "text-muted-foreground/50")}>
                 <Filter className="h-3 w-3" />
               </button>
             </PopoverTrigger>
             <PopoverContent className="w-52 p-3">
                <Label className="text-xs font-semibold mb-2 block">Filter by {column.label}</Label>
                <Input 
                  placeholder="Search…" 
                  value={filterValue} 
                  onChange={(e) => onFilter(column.id, e.target.value)} 
                  className="h-8 text-xs mb-2"
                />
                <Button size="sm" className="w-full h-7 text-xs" onClick={() => onFilter(column.id, filterValue)}>Apply</Button>
             </PopoverContent>
           </Popover>
        )}
      </div>
    </th>
  );
}

interface TransporterColumnVisibilityProps {
  visibleColumns: string[];
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
}

function TransporterColumnVisibility({
  visibleColumns,
  defaultColumns,
  optionalColumns,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
}: TransporterColumnVisibilityProps) {
  const allColumns = [...defaultColumns, ...optionalColumns];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Settings2 className="h-4 w-4" />
          Columns ({visibleColumns.length}/{allColumns.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
         <div className="flex items-center justify-between px-2 py-1 mb-2">
           <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Columns</span>
           <div className="flex gap-1">
             <Button variant="ghost" size="xs" className="h-6 text-[10px]" onClick={onShowAllColumns}>All</Button>
             <Button variant="ghost" size="xs" className="h-6 text-[10px]" onClick={onResetColumns}>Reset</Button>
           </div>
         </div>
         <div className="max-h-60 overflow-auto space-y-1">
           {allColumns.map(c => (
              <div key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer" onClick={() => onColumnToggle(c.id)}>
                <Checkbox checked={visibleColumns.includes(c.id)} />
                <span className="text-xs">{c.label}</span>
              </div>
           ))}
         </div>
      </PopoverContent>
    </Popover>
  );
}
