"use client";

/**
 * CustomerSelect component for Sales forms
 * Opens a Dialog with a searchable, sortable, filterable, infinite-scroll table.
 * Columns: No., Customer Name, City, PAN No., GST Reg. No., Address
 * Search covers No, Name, P_A_N_No, GST_Registration_No server-side.
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
  Users,
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
  getCustomersForDialog,
  type Customer,
} from "@/lib/api/services/customer.service";

export type { Customer as SalesCustomer };

interface CustomerSelectProps {
  value: string;
  onChange: (value: string, customer?: Customer) => void;
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
    label: "Customer Name",
    sortable: true,
    filterType: "text",
    flex: true,
  },
  {
    id: "Responsibility_Center",
    label: "Responsibility Center",
    sortable: true,
    filterType: "text",
    width: "170px",
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
    label: "GST Reg. No.",
    sortable: true,
    filterType: "text",
    width: "210px",
  },
  {
    id: "Address",
    label: "Address",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
];

const OPTIONAL_COLUMNS: ColumnConfig[] = [
  {
    id: "Salesperson_Code",
    label: "Salesperson Code",
    sortable: true,
    filterType: "text",
    width: "160px",
  },
  {
    id: "Customer_Price_Group",
    label: "Price Group",
    sortable: true,
    filterType: "text",
    width: "140px",
  },
  {
    id: "State_Code",
    label: "State Code",
    sortable: true,
    filterType: "text",
    width: "120px",
  },
  {
    id: "Assessee_Code",
    label: "Assessee Code",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Phone_No",
    label: "Phone No.",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "E_Mail",
    label: "E-Mail",
    sortable: true,
    filterType: "text",
    width: "200px",
  },
  {
    id: "Address_2",
    label: "Address 2",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Post_Code",
    label: "Post Code",
    sortable: true,
    filterType: "text",
    width: "120px",
  },
  {
    id: "Country_Region_Code",
    label: "Country/Region",
    sortable: true,
    filterType: "text",
    width: "140px",
  },
  {
    id: "Customer_Posting_Group",
    label: "Posting Group",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Gen_Bus_Posting_Group",
    label: "Gen. Bus. Posting Group",
    sortable: true,
    filterType: "text",
    width: "180px",
  },
  {
    id: "Payment_Terms_Code",
    label: "Payment Terms",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Currency_Code",
    label: "Currency",
    sortable: true,
    filterType: "text",
    width: "110px",
  },
];

const ALL_COLUMNS = [...DEFAULT_COLUMNS, ...OPTIONAL_COLUMNS];

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 350;

export function CustomerSelect({
  value,
  onChange,
  placeholder = "Select customer",
  disabled = false,
  className,
  hasError = false,
  errorClass = "",
}: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_COLUMNS.map((c) => c.id),
  );
  const [displayLabel, setDisplayLabel] = useState("");

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearchRef = useRef(debouncedSearch);
  const sortColumnRef = useRef(sortColumn);
  const sortDirectionRef = useRef(sortDirection);
  const columnFiltersRef = useRef(columnFilters);
  const visibleColumnsRef = useRef(visibleColumns);
  const customersLengthRef = useRef(0);
  const totalCountRef = useRef(0);
  const isFetchingMoreRef = useRef(false);

  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
    sortColumnRef.current = sortColumn;
    sortDirectionRef.current = sortDirection;
    columnFiltersRef.current = columnFilters;
    visibleColumnsRef.current = visibleColumns;
  }, [debouncedSearch, sortColumn, sortDirection, columnFilters, visibleColumns]);

  useEffect(() => { customersLengthRef.current = customers.length; }, [customers]);
  useEffect(() => { totalCountRef.current = totalCount; }, [totalCount]);

  const allFetched = totalCount > 0 && customers.length >= totalCount;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchInitial = useCallback(
    async (
      search: string,
      sortCol: string | null,
      sortDir: SortDirection,
      colFilters: Record<string, string>,
      visCols: string[],
    ) => {
      setLoading(true);
      setCustomers([]);
      setTotalCount(0);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      try {
        const result = await getCustomersForDialog({
          skip: 0,
          top: PAGE_SIZE,
          search: search || undefined,
          sortColumn: sortCol,
          sortDirection: sortDir,
          filters: colFilters,
          visibleColumns: visCols,
        });
        setCustomers(result.value);
        setTotalCount(result.count);
      } catch (err) {
        console.error("Error loading customers:", err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchMore = useCallback(async (currentLength: number) => {
    setLoadingMore(true);
    try {
      const result = await getCustomersForDialog({
        skip: currentLength,
        top: PAGE_SIZE,
        search: debouncedSearchRef.current || undefined,
        sortColumn: sortColumnRef.current,
        sortDirection: sortDirectionRef.current,
        filters: columnFiltersRef.current,
        visibleColumns: visibleColumnsRef.current,
      });
      setCustomers((prev) => {
        const seen = new Set(prev.map((c) => c.No));
        return [...prev, ...result.value.filter((c) => !seen.has(c.No))];
      });
      setTotalCount(result.count);
    } catch (err) {
      console.error("Error loading more customers:", err);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchInitial(
        debouncedSearch,
        sortColumn,
        sortDirection,
        columnFilters,
        visibleColumns,
      );
    }
  }, [
    open,
    debouncedSearch,
    fetchInitial,
    sortColumn,
    sortDirection,
    columnFilters,
    visibleColumns,
  ]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let obs: IntersectionObserver;

    const checkAndFetch = () => {
      const total = totalCountRef.current;
      const count = customersLengthRef.current;
      if ((total > 0 && count >= total) || isFetchingMoreRef.current) return;
      isFetchingMoreRef.current = true;
      fetchMore(count).finally(() => {
        isFetchingMoreRef.current = false;
      });
    };

    obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) checkAndFetch(); },
      { threshold: 0.1 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [fetchMore, loading]);

  useEffect(() => {
    if (!value) {
      setDisplayLabel("");
      return;
    }
    const found = customers.find((c) => c.No === value);
    if (found) setDisplayLabel(`${found.No} – ${found.Name}`);
    else if (!displayLabel) setDisplayLabel(value);
  }, [value, customers]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleSelect = (customer: Customer) => {
    onChange(customer.No, customer);
    setOpen(false);
  };

  const hasActiveFilters = Object.values(columnFilters).some(Boolean);
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;

  const onColumnToggle = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };
  const onResetColumns = () =>
    setVisibleColumns(DEFAULT_COLUMNS.map((c) => c.id));
  const onShowAllColumns = () =>
    setVisibleColumns(ALL_COLUMNS.map((c) => c.id));

  const currentColumns = ALL_COLUMNS.filter((col) =>
    visibleColumns.includes(col.id),
  );

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
          hasError && "border-destructive ring-destructive/20 ring-1",
          className,
          errorClass,
        )}
        data-field-error={hasError}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {value && (
            <Users className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
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
                <Users className="text-muted-foreground h-4 w-4" />
                <DialogTitle className="text-[15px] font-semibold">
                  Select Customer
                </DialogTitle>
                {!loading && totalCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 rounded-sm px-1.5 text-[10px] font-bold tabular-nums"
                  >
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
                  <span>
                    {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}{" "}
                    active
                  </span>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </DialogHeader>

          {/* ── Search bar ────────────────────────────────────────────── */}
          <div className="bg-muted/30 shrink-0 border-b px-5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by No. or Customer Name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-border/60 bg-background h-9 rounded-md pr-9 pl-9 text-sm shadow-none focus-visible:ring-1"
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
                  <kbd className="text-muted-foreground/60 absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 font-mono text-[9px] select-none sm:block">
                    ↑↓ to navigate
                  </kbd>
                )}
              </div>
              <CustomerColumnVisibility
                visibleColumns={visibleColumns}
                defaultColumns={DEFAULT_COLUMNS}
                optionalColumns={OPTIONAL_COLUMNS}
                onColumnToggle={onColumnToggle}
                onResetColumns={onResetColumns}
                onShowAllColumns={onShowAllColumns}
              />
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
                  {currentColumns.map((col) => (
                    <CustomerTableHead
                      key={col.id}
                      column={col}
                      isActive={sortColumn === col.id}
                      sortDirection={
                        sortColumn === col.id ? sortDirection : null
                      }
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
                    <td
                      colSpan={currentColumns.length + 1}
                      className="py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                        <p className="text-muted-foreground text-xs">
                          Loading customers…
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentColumns.length + 1}
                      className="py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Users className="text-muted-foreground/40 h-8 w-8" />
                        <p className="text-muted-foreground text-sm font-medium">
                          No customers found
                        </p>
                        {searchQuery && (
                          <p className="text-muted-foreground/70 text-xs">
                            Try a different search term or clear filters
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    // Split: selected customer first (sticky), rest below
                    const selectedCustomer = value
                      ? customers.find((c) => c.No === value)
                      : null;
                    const restCustomers = selectedCustomer
                      ? customers.filter((c) => c.No !== value)
                      : customers;

                    const renderRow = (
                      customer: Customer,
                      idx: number,
                      isSticky = false,
                    ) => {
                      const isSelected = value === customer.No;
                      return (
                        <tr
                          key={customer.No}
                          onClick={() => handleSelect(customer)}
                          className={cn(
                            "group cursor-pointer border-b transition-colors",
                            isSticky
                              ? "hover:brightness-95"
                              : cn(
                                  idx % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/20",
                                  "hover:bg-primary/5",
                                ),
                          )}
                          style={
                            isSticky
                              ? {
                                  position: "sticky",
                                  top: "40px",
                                  zIndex: 9,
                                  backgroundColor: "var(--muted)",
                                }
                              : undefined
                          }
                        >
                          {/* Checkmark gutter */}
                          <td className="w-10 px-3 py-2.5 text-center">
                            {isSelected && (
                              <Check className="text-primary mx-auto h-3.5 w-3.5" />
                            )}
                          </td>
                          {currentColumns.map((col) => {
                            if (col.id === "No") {
                              return (
                                <td
                                  key={col.id}
                                  className={cn(
                                    "px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap",
                                    isSelected
                                      ? "text-primary"
                                      : "text-foreground",
                                  )}
                                >
                                  {(customer as unknown as Record<string, unknown>)[col.id] as string || (
                                    <span className="opacity-30">—</span>
                                  )}
                                </td>
                              );
                            }
                            if (col.id === "Name") {
                              return (
                                <td key={col.id} className="px-3 py-2.5">
                                  <span
                                    className={cn(
                                      "w-full text-sm font-medium whitespace-nowrap",
                                      isSelected
                                        ? "text-foreground font-semibold"
                                        : "text-foreground/90",
                                    )}
                                  >
                                    {(customer as unknown as Record<string, unknown>)[col.id] as string || (
                                      <span className="opacity-30">—</span>
                                    )}
                                  </span>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={col.id}
                                className={cn(
                                  "px-3 py-2.5 text-xs whitespace-nowrap",
                                  isSelected
                                    ? "text-foreground/80 font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                {(customer as unknown as Record<string, unknown>)[col.id] as string || (
                                  <span className="opacity-30">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    };

                    return (
                      <>
                        {selectedCustomer &&
                          renderRow(selectedCustomer, 0, true)}
                        {restCustomers.map((customer, idx) =>
                          renderRow(customer, idx),
                        )}
                      </>
                    );
                  })()
                )}
                {/* Infinite scroll sentinel */}
                {!loading && (
                  <tr>
                    <td colSpan={currentColumns.length + 1}>
                      <div ref={sentinelRef} className="h-px" />
                    </td>
                  </tr>
                )}
                {loadingMore && (
                  <tr>
                    <td
                      colSpan={currentColumns.length + 1}
                      className="py-3 text-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground text-xs">
                          Loading more…
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  !loadingMore &&
                  allFetched &&
                  customers.length > 0 && (
                    <tr>
                      <td
                        colSpan={currentColumns.length + 1}
                        className="py-2 text-center"
                      >
                        <span className="text-muted-foreground/50 text-[10px]">
                          All {totalCount.toLocaleString()} customers loaded
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
                      {customers.length.toLocaleString()}
                    </span>
                    {totalCount > 0 && (
                      <>
                        {" "}
                        of{" "}
                        <span className="text-foreground font-semibold tabular-nums">
                          {totalCount.toLocaleString()}
                        </span>
                      </>
                    )}{" "}
                    customers
                    {hasActiveFilters && (
                      <span className="text-primary ml-1 font-medium">
                        ·{" "}
                        {totalCount > 0
                          ? customers.length.toLocaleString()
                          : totalCount.toLocaleString()}{" "}
                        match{customers.length !== 1 ? "es" : ""}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            {value && displayLabel && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">
                  Selected:
                </span>
                <span className="text-primary max-w-75 truncate text-[11px] font-semibold">
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

interface CustomerTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
}

function CustomerTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: CustomerTableHeadProps) {
  const getSortIcon = () => {
    if (!isActive || !sortDirection) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th
      className={cn(
        "text-foreground bg-muted h-10 border-b px-2 py-3 text-left align-middle text-xs font-bold whitespace-nowrap select-none",
        isActive ? "text-primary" : "",
        column.flex && "w-full",
      )}
      style={
        column.width
          ? { width: column.width, minWidth: column.width }
          : undefined
      }
    >
      <div className="flex items-center gap-1.5">
        <span
          className="hover:text-primary cursor-pointer transition-colors"
          onClick={() => column.sortable && onSort(column.id)}
        >
          {column.label}
        </span>
        {column.sortable && (
          <button
            type="button"
            className="hover:text-primary transition-colors"
            onClick={() => onSort(column.id)}
          >
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <CustomerColumnFilter
            column={column}
            value={filterValue}
            onChange={(v) => onFilter(column.id, v)}
          />
        )}
      </div>
    </th>
  );
}

interface CustomerColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function CustomerColumnFilter({
  column,
  value,
  onChange,
}: CustomerColumnFilterProps) {
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
          className={`hover:bg-background/50 rounded p-0.5 transition-colors ${
            hasFilter
              ? "text-primary"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          <Filter className={`h-3 w-3 ${hasFilter ? "fill-current" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-foreground text-xs font-semibold">
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

function CustomerColumnVisibility({
  visibleColumns,
  defaultColumns,
  optionalColumns,
  onColumnToggle,
  onResetColumns,
  onShowAllColumns,
}: {
  visibleColumns: string[];
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onShowAllColumns: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");

  const visibleCount = visibleColumns.length;
  const totalCount = defaultColumns.length + optionalColumns.length;

  const filteredDefault = defaultColumns.filter((c) =>
    c.label.toLowerCase().includes(columnSearch.toLowerCase()),
  );
  const filteredOptional = optionalColumns.filter((c) =>
    c.label.toLowerCase().includes(columnSearch.toLowerCase()),
  );

  useEffect(() => {
    if (!open) {
      setTimeout(() => setColumnSearch(""), 150);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-2">
          <Settings2 className="h-4 w-4" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-70 p-0"
        align="end"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="border-b p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Toggle Columns</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onShowAllColumns}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onResetColumns}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search columns..."
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              className="bg-background border-border/50 h-8 rounded-sm pl-8 text-xs shadow-none focus-visible:ring-1"
            />
          </div>
        </div>

        <div
          className="max-h-80 overflow-x-hidden overflow-y-auto overscroll-contain p-2"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {filteredDefault.length > 0 && (
            <div className="mb-2">
              <span className="text-muted-foreground px-2 text-[10px] font-semibold tracking-wider uppercase">
                Default Columns
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredDefault.map((column) => (
                  <ColumnToggleItem
                    key={column.id}
                    column={column}
                    isChecked={visibleColumns.includes(column.id)}
                    onToggle={() => onColumnToggle(column.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredDefault.length > 0 && filteredOptional.length > 0 && (
            <Separator className="my-2" />
          )}

          {filteredOptional.length > 0 && (
            <div>
              <span className="text-muted-foreground px-2 text-[10px] font-semibold tracking-wider uppercase">
                Additional Columns
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredOptional.map((column) => (
                  <ColumnToggleItem
                    key={column.id}
                    column={column}
                    isChecked={visibleColumns.includes(column.id)}
                    onToggle={() => onColumnToggle(column.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredDefault.length === 0 && filteredOptional.length === 0 && (
            <div className="text-muted-foreground py-6 text-center text-xs">
              No columns matched your search
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColumnToggleItem({
  column,
  isChecked,
  isDisabled = false,
  onToggle,
}: {
  column: ColumnConfig;
  isChecked: boolean;
  isDisabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 ${
        isDisabled ? "cursor-not-allowed opacity-60" : ""
      }`}
      onClick={() => !isDisabled && onToggle()}
    >
      <Checkbox
        checked={isChecked}
        disabled={isDisabled}
        onCheckedChange={() => !isDisabled && onToggle()}
        className="pointer-events-none"
      />
      <span className="text-sm">{column.label}</span>
    </div>
  );
}
