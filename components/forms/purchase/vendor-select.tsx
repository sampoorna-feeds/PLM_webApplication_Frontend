"use client";

/**
 * VendorSelect component for Purchase forms
 * Opens a Dialog with a searchable, sortable, filterable, infinite-scroll table.
 * Columns: No., Name, PAN No., GST Reg. No.
 * Search covers all four fields server-side.
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
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  type VendorRow,
} from "@/lib/api/services/vendor.service";

export type { VendorRow as PurchaseVendor };

interface VendorSelectProps {
  value: string;
  onChange: (value: string, vendor?: VendorRow) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  errorClass?: string;
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

const COLUMNS: ColumnConfig[] = [
  { id: "No", label: "No.", sortable: true, filterType: "text", width: "140px" },
  { id: "Name", label: "Vendor Name", sortable: true, filterType: "text", flex: true },
  { id: "P_A_N_No", label: "PAN No.", sortable: true, filterType: "text", width: "170px" },
  { id: "GST_Registration_No", label: "GST Reg. No.", sortable: true, filterType: "text", width: "210px" },
];

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 350;

export function VendorSelect({
  value,
  onChange,
  placeholder = "Select vendor",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
}: VendorSelectProps) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [displayLabel, setDisplayLabel] = useState("");

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch]);

  const allFetched = totalCount > 0 && vendors.length >= totalCount;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchInitial = useCallback(async (search: string) => {
    setLoading(true);
    setVendors([]);
    setTotalCount(0);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    try {
      const result = await getVendorsForDialog({
        skip: 0,
        top: PAGE_SIZE,
        search: search || undefined,
      });
      setVendors(result.value);
      setTotalCount(result.count);
    } catch (err) {
      console.error("Error loading vendors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMore = useCallback(async (currentLength: number) => {
    setLoadingMore(true);
    try {
      const result = await getVendorsForDialog({
        skip: currentLength,
        top: PAGE_SIZE,
        search: debouncedSearchRef.current || undefined,
      });
      setVendors((prev) => {
        const seen = new Set(prev.map((v) => v.No));
        return [...prev, ...result.value.filter((v) => !seen.has(v.No))];
      });
      setTotalCount(result.count);
    } catch (err) {
      console.error("Error loading more vendors:", err);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchInitial(debouncedSearch);
    }
  }, [open, debouncedSearch, fetchInitial]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let isFetching = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetching) {
          setVendors((prev) => {
            setTotalCount((total) => {
              const alreadyAll = total > 0 && prev.length >= total;
              if (!alreadyAll && !isFetching) {
                isFetching = true;
                fetchMore(prev.length).finally(() => {
                  isFetching = false;
                });
              }
              return total;
            });
            return prev;
          });
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore, loading, loadingMore]);

  useEffect(() => {
    if (!value) {
      setDisplayLabel("");
      return;
    }
    const found = vendors.find((v) => v.No === value);
    if (found) setDisplayLabel(`${found.No} – ${found.Name}`);
    else if (!displayLabel) setDisplayLabel(value);
  }, [value, vendors]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    if (!next) {
      setSearchQuery("");
      setDebouncedSearch("");
      setColumnFilters({});
      setSortColumn(null);
      setSortDirection(null);
      debouncedSearchRef.current = "";
    }
    setOpen(next);
  };

  const handleSort = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  };

  const handleFilter = (colId: string, val: string) => {
    setColumnFilters((prev) => ({ ...prev, [colId]: val }));
  };

  const filteredAndSorted = useMemo(() => {
    let result = vendors;
    Object.entries(columnFilters).forEach(([colId, filterVal]) => {
      if (!filterVal) return;
      result = result.filter((v) => {
        const cell = String(
          (v as unknown as Record<string, unknown>)[colId] ?? "",
        ).toLowerCase();
        return cell.includes(filterVal.toLowerCase());
      });
    });
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const valA = (a as unknown as Record<string, unknown>)[sortColumn] ?? "";
        const valB = (b as unknown as Record<string, unknown>)[sortColumn] ?? "";
        if (valA === valB) return 0;
        const cmp = valA < valB ? -1 : 1;
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [vendors, columnFilters, sortColumn, sortDirection]);

  const handleSelect = (vendor: VendorRow) => {
    onChange(vendor.No, vendor);
    setOpen(false);
  };

  const hasActiveFilters = Object.values(columnFilters).some(Boolean);
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={cn(
          "h-9 w-full justify-between text-sm font-normal shadow-sm",
          !value && "text-muted-foreground",
          hasError && "border-destructive ring-1 ring-destructive/20",
          className,
          errorClass,
        )}
        data-field-error={hasError}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {value && <Building2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">
            {displayLabel || (disabled ? "None" : placeholder)}
          </span>
        </span>
        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-40" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Wide dialog — uses most of the screen width on large displays */}
        <DialogContent
          className="flex h-[88vh] flex-col gap-0 p-0"
          style={{ width: "min(1160px, 92vw)", maxWidth: "none" }}
        >

          {/* ── Header ────────────────────────────────────────────────── */}
          <DialogHeader className="shrink-0 border-b px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="text-muted-foreground h-4 w-4" />
                <DialogTitle className="text-[15px] font-semibold">
                  Select Vendor
                </DialogTitle>
                {!loading && totalCount > 0 && (
                  <Badge variant="secondary" className="h-5 rounded-sm px-1.5 text-[10px] font-bold tabular-nums">
                    {totalCount.toLocaleString()}
                  </Badge>
                )}
              </div>
              {/* Active filter count pill */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => setColumnFilters({})}
                  className="text-primary hover:text-primary/80 flex items-center gap-1 text-[11px] font-medium transition-colors"
                >
                  <span>{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </DialogHeader>

          {/* ── Search bar ────────────────────────────────────────────── */}
          <div className="bg-muted/30 shrink-0 border-b px-5 py-2.5">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search by vendor No., Name, PAN No. or GST No. …"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-md border-border/60 bg-background pl-9 pr-9 text-sm shadow-none focus-visible:ring-1"
                autoFocus
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="text-muted-foreground/60 absolute top-1/2 right-3 -translate-y-1/2 hidden select-none rounded border px-1.5 py-0.5 font-mono text-[9px] sm:block">
                  ↑↓ to navigate
                </kbd>
              )}
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────────────────── */}
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-auto"
          >
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  {/* Checkmark gutter */}
                  <th className="bg-muted w-10 border-b px-3" />
                  {COLUMNS.map((col) => (
                    <VendorTableHead
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
                    <td colSpan={COLUMNS.length + 1} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                        <p className="text-muted-foreground text-xs">Loading vendors…</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length + 1}
                      className="py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="text-muted-foreground/40 h-8 w-8" />
                        <p className="text-muted-foreground text-sm font-medium">No vendors found</p>
                        {searchQuery && (
                          <p className="text-muted-foreground/70 text-xs">
                            Try a different search term or clear filters
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (() => {
                  // Split: selected vendor first (sticky), rest below
                  const selectedVendor = value ? filteredAndSorted.find((v) => v.No === value) : null;
                  const restVendors = selectedVendor
                    ? filteredAndSorted.filter((v) => v.No !== value)
                    : filteredAndSorted;

                  const renderRow = (vendor: VendorRow, idx: number, isSticky = false) => {
                    const isSelected = value === vendor.No;
                    return (
                      <tr
                        key={vendor.No}
                        onClick={() => handleSelect(vendor)}
                        className={cn(
                          "group cursor-pointer border-b transition-colors",
                          isSticky
                            ? "hover:brightness-95"
                            : cn(
                                idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                                "hover:bg-primary/5",
                              ),
                        )}
                        style={
                          isSticky
                            ? { position: "sticky", top: "40px", zIndex: 9, backgroundColor: "var(--muted)" }
                            : undefined
                        }
                      >
                        {/* Checkmark gutter */}
                        <td className="w-10 px-3 py-2.5 text-center">
                          {isSelected && (
                            <Check className="text-primary mx-auto h-3.5 w-3.5" />
                          )}
                        </td>
                        {/* No. */}
                        <td className={cn(
                          "px-3 py-2.5 font-mono text-xs font-semibold",
                          isSelected ? "text-primary" : "text-foreground",
                        )}>
                          {vendor.No}
                        </td>
                        {/* Name */}
                        <td className="px-3 py-2.5">
                          <span className={cn(
                            "text-sm",
                            isSelected ? "font-semibold text-foreground" : "font-medium text-foreground/90",
                          )}>
                            {vendor.Name}
                          </span>
                        </td>
                        {/* PAN */}
                        <td className={cn(
                          "px-3 py-2.5 text-xs",
                          isSelected ? "font-medium text-foreground/80" : "text-muted-foreground",
                        )}>
                          {vendor.P_A_N_No || <span className="opacity-30">—</span>}
                        </td>
                        {/* GST */}
                        <td className={cn(
                          "px-3 py-2.5 text-xs",
                          isSelected ? "font-medium text-foreground/80" : "text-muted-foreground",
                        )}>
                          {vendor.GST_Registration_No || <span className="opacity-30">—</span>}
                        </td>
                      </tr>
                    );
                  };

                  return (
                    <>
                      {selectedVendor && renderRow(selectedVendor, 0, true)}
                      {restVendors.map((vendor, idx) => renderRow(vendor, idx))}
                    </>
                  );
                })()}
                {/* Infinite scroll sentinel */}
                {!loading && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1}>
                      <div ref={sentinelRef} className="h-px" />
                    </td>
                  </tr>
                )}
                {loadingMore && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground text-xs">Loading more…</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && !loadingMore && allFetched && vendors.length > 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="py-2 text-center">
                      <span className="text-muted-foreground/50 text-[10px]">
                        All {totalCount.toLocaleString()} vendors loaded
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Status bar ────────────────────────────────────────────── */}
          <div className="bg-muted/20 flex shrink-0 items-center justify-between border-t px-5 py-2">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-[11px]">
                {loading ? (
                  "Loading…"
                ) : (
                  <>
                    Showing{" "}
                    <span className="text-foreground font-semibold tabular-nums">
                      {vendors.length.toLocaleString()}
                    </span>
                    {totalCount > 0 && (
                      <>
                        {" "}of{" "}
                        <span className="text-foreground font-semibold tabular-nums">
                          {totalCount.toLocaleString()}
                        </span>
                      </>
                    )}
                    {" "}vendors
                    {hasActiveFilters && (
                      <span className="text-primary ml-1 font-medium">
                        · {filteredAndSorted.length.toLocaleString()} match{filteredAndSorted.length !== 1 ? "es" : ""}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            {value && displayLabel && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Selected:</span>
                <span className="text-primary text-[11px] font-semibold truncate max-w-[300px]">
                  {displayLabel}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Table head helpers ────────────────────────────────────────────────────────

interface VendorTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
}

function VendorTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: VendorTableHeadProps) {
  const SortIcon =
    !isActive || !sortDirection
      ? ArrowUpDown
      : sortDirection === "asc"
        ? ArrowUp
        : ArrowDown;

  return (
    <th
      className={cn(
        "bg-muted border-b px-3 py-0 text-left align-middle select-none",
        column.flex && "w-full",
      )}
      style={column.width ? { width: column.width, minWidth: column.width } : undefined}
    >
      <div className="flex h-10 items-center gap-1">
        <span
          className={cn(
            "text-[11px] font-bold tracking-wide uppercase cursor-pointer transition-colors",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => column.sortable && onSort(column.id)}
        >
          {column.label}
        </span>
        {column.sortable && (
          <button
            type="button"
            className="transition-opacity hover:opacity-100"
            onClick={() => onSort(column.id)}
          >
            <SortIcon
              className={cn(
                "h-3 w-3",
                isActive ? "text-primary opacity-100" : "text-muted-foreground opacity-30",
              )}
            />
          </button>
        )}
        {column.filterType && (
          <VendorColumnFilter
            column={column}
            value={filterValue}
            onChange={(v) => onFilter(column.id, v)}
          />
        )}
      </div>
    </th>
  );
}

interface VendorColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function VendorColumnFilter({ column, value, onChange }: VendorColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const hasFilter = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded p-0.5 transition-colors",
            hasFilter
              ? "text-primary"
              : "text-muted-foreground/30 hover:text-muted-foreground/70",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className={cn("h-3 w-3", hasFilter && "fill-current")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">
            Filter by {column.label}
          </Label>
          <Input
            placeholder={`Search ${column.label}…`}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange(local);
                setOpen(false);
              }
              if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            autoFocus
          />
        </div>
        <div className="mt-2.5 flex gap-2">
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
