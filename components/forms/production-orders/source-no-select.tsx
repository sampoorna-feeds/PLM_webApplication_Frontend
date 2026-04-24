"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { getSourcesForDialog } from "@/lib/api/services/production-order-data.service";

type SortDirection = "asc" | "desc" | null;

interface SourceRecord {
  No: string;
  Description?: string;
  Base_Unit_of_Measure?: string;
  Inventory?: number;
  Sell_to_Customer_Name?: string;
  Document_Type?: string;
  Production_BOM_No?: string;
  [key: string]: unknown;
}

interface SourceNoSelectProps {
  value: string;
  sourceType: string;
  onChange: (value: string, description: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  filters?: Record<string, string>;
}

interface ColumnConfig {
  id: string;
  label: string;
  sortable?: boolean;
  filterType?: "text";
  width?: string;
  flex?: boolean;
  align?: "left" | "right";
}

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 350;

function getSourceColumns(sourceType: string): {
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  idField: string;
} {
  if (sourceType === "Item") {
    return {
      idField: "No",
      defaultColumns: [
        { id: "No", label: "No.", sortable: true, filterType: "text", width: "160px" },
        { id: "Description", label: "Description", sortable: true, filterType: "text", flex: true },
        { id: "Base_Unit_of_Measure", label: "UOM", sortable: true, filterType: "text", width: "120px" },
      ],
      optionalColumns: [
        { id: "Inventory", label: "Inventory", sortable: true, filterType: "text", width: "130px", align: "right" },
      ],
    };
  }

  if (sourceType === "Family") {
    return {
      idField: "No",
      defaultColumns: [
        { id: "No", label: "No.", sortable: true, filterType: "text", width: "180px" },
        { id: "Description", label: "Description", sortable: true, filterType: "text", flex: true },
      ],
      optionalColumns: [],
    };
  }

  if (sourceType === "Sales Header") {
    return {
      idField: "No",
      defaultColumns: [
        { id: "No", label: "No.", sortable: true, filterType: "text", width: "180px" },
        { id: "Sell_to_Customer_Name", label: "Customer Name", sortable: true, filterType: "text", flex: true },
      ],
      optionalColumns: [
        { id: "Document_Type", label: "Document Type", sortable: true, filterType: "text", width: "170px" },
      ],
    };
  }

  if (sourceType === "BOM") {
    return {
      idField: "No",
      defaultColumns: [
        { id: "No", label: "BOM No.", sortable: true, filterType: "text", width: "160px" },
        { id: "Description", label: "Description", sortable: true, filterType: "text", flex: true },
        { id: "Status", label: "Status", sortable: true, filterType: "text", width: "120px" },
      ],
      optionalColumns: [
        { id: "ActiveVersionCode", label: "Active Version", sortable: true, filterType: "text", width: "140px" },
        { id: "Unit_of_Measure_Code", label: "UOM", sortable: true, filterType: "text", width: "100px" },
      ],
    };
  }

  if (sourceType === "BOM Version") {
    return {
      idField: "Version_Code",
      defaultColumns: [
        { id: "Version_Code", label: "Ver Code", sortable: true, filterType: "text", width: "120px" },
        { id: "Starting_Date", label: "Start Date", sortable: true, filterType: "text", width: "140px" },
        { id: "Status", label: "Status", sortable: true, filterType: "text", width: "120px" },
        { id: "Description", label: "Description", sortable: true, filterType: "text", flex: true },
      ],
      optionalColumns: [
        { id: "Production_BOM_No", label: "BOM No.", sortable: true, filterType: "text", width: "150px" },
      ],
    };
  }

  return {
    idField: "No",
    defaultColumns: [
      { id: "No", label: "No.", sortable: true, filterType: "text", width: "180px" },
    ],
    optionalColumns: [],
  };
}

function getSecondaryText(sourceType: string, record: SourceRecord): string {
  if (sourceType === "Sales Header") {
    return record.Sell_to_Customer_Name || "";
  }
  if (sourceType === "BOM Version") {
    return record.Description || record.Production_BOM_No || "";
  }
  return record.Description || "";
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }

  return String(value);
}

export function SourceNoSelect({
  value,
  sourceType,
  onChange,
  disabled = false,
  error = false,
  placeholder = "Select source no",
  filters,
}: SourceNoSelectProps) {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(() => 
    sourceType === "BOM Version" ? "Starting_Date" : null
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => 
    sourceType === "BOM Version" ? "desc" : null
  );
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );
  const [displayLabel, setDisplayLabel] = useState("");

  const { defaultColumns, optionalColumns, idField } = useMemo(
    () => getSourceColumns(sourceType),
    [sourceType],
  );
  const allColumns = useMemo(
    () => [...defaultColumns, ...optionalColumns],
    [defaultColumns, optionalColumns],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    defaultColumns.map((c) => c.id),
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearchRef = useRef(debouncedSearch);
  const sortColumnRef = useRef(sortColumn);
  const sortDirectionRef = useRef(sortDirection);
  const columnFiltersRef = useRef(columnFilters);
  const sourcesLengthRef = useRef(0);
  const totalCountRef = useRef(0);
  const isFetchingMoreRef = useRef(false);

  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
    sortColumnRef.current = sortColumn;
    sortDirectionRef.current = sortDirection;
    columnFiltersRef.current = columnFilters;
  }, [debouncedSearch, sortColumn, sortDirection, columnFilters]);

  useEffect(() => {
    sourcesLengthRef.current = sources.length;
  }, [sources]);

  useEffect(() => {
    totalCountRef.current = totalCount;
  }, [totalCount]);

  useEffect(() => {
    setVisibleColumns(defaultColumns.map((c) => c.id));
    setColumnFilters({});
    if (sourceType === "BOM Version") {
      setSortColumn("Starting_Date");
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
    setSearchQuery("");
    setDebouncedSearch("");
  }, [sourceType, defaultColumns]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchQuery),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchInitial = useCallback(
    async (
      search: string,
      sortCol: string | null,
      sortDir: SortDirection,
      colFilters: Record<string, string>,
    ) => {
      if (!sourceType) return;

      setLoading(true);
      setSources([]);
      setTotalCount(0);

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      try {
        const result = await getSourcesForDialog({
          sourceType,
          skip: 0,
          top: PAGE_SIZE,
          search: search || undefined,
          sortColumn: sortCol,
          sortDirection: sortDir,
          filters: { ...filters, ...colFilters },
        });
        setSources(result.value || []);
        setTotalCount(result.count || 0);
      } catch (err) {
        console.error("Error loading source numbers:", err);
      } finally {
        setLoading(false);
      }
    },
    [sourceType, filters],
  );

  const fetchMore = useCallback(
    async (currentLength: number) => {
      if (!sourceType) return;

      setLoadingMore(true);
      try {
        const result = await getSourcesForDialog({
          sourceType,
          skip: currentLength,
          top: PAGE_SIZE,
          search: debouncedSearchRef.current || undefined,
          sortColumn: sortColumnRef.current,
          sortDirection: sortDirectionRef.current,
          filters: { ...filters, ...columnFiltersRef.current },
        });

        setSources((prev) => {
          const seen = new Set(prev.map((item) => item[idField]));
          const deduped = (result.value || []).filter(
            (item) => !seen.has(item[idField]),
          );
          return [...prev, ...deduped];
        });
        setTotalCount(result.count || 0);
      } catch (err) {
        console.error("Error loading more source numbers:", err);
      } finally {
        setLoadingMore(false);
      }
    },
    [sourceType, idField, filters],
  );

  useEffect(() => {
    if (open) {
      fetchInitial(debouncedSearch, sortColumn, sortDirection, columnFilters);
    }
  }, [
    open,
    debouncedSearch,
    sortColumn,
    sortDirection,
    columnFilters,
    fetchInitial,
  ]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !open || loading) return;

    const checkAndFetch = () => {
      const total = totalCountRef.current;
      const count = sourcesLengthRef.current;
      if ((total > 0 && count >= total) || isFetchingMoreRef.current) return;

      isFetchingMoreRef.current = true;
      fetchMore(count).finally(() => {
        isFetchingMoreRef.current = false;
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          checkAndFetch();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, loading, fetchMore]);

  useEffect(() => {
    if (!value) {
      setDisplayLabel("");
      return;
    }

    const found = sources.find((item) => item[idField] === value);
    if (found) {
      const secondary = getSecondaryText(sourceType, found);
      const idVal = found[idField] as string;
      setDisplayLabel(secondary ? `${idVal} - ${secondary}` : idVal);
    } else if (!displayLabel) {
      setDisplayLabel(value);
    }
  }, [value, sources, sourceType, idField]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenChange = (next: boolean) => {
    if (disabled || !sourceType) return;

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

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnId);
      setSortDirection("desc");
    }
  };

  const handleFilter = (columnId: string, input: string) => {
    setColumnFilters((prev) => ({ ...prev, [columnId]: input }));
  };

  const handleSelect = (record: SourceRecord) => {
    onChange(record[idField] as string, getSecondaryText(sourceType, record));
    setOpen(false);
  };

  const onColumnToggle = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((colId) => colId !== id) : [...prev, id],
    );
  };

  const onResetColumns = () => {
    setVisibleColumns(defaultColumns.map((c) => c.id));
  };

  const onShowAllColumns = () => {
    setVisibleColumns(allColumns.map((c) => c.id));
  };

  const hasActiveFilters = Object.values(columnFilters).some(Boolean);
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;
  const allFetched = totalCount > 0 && sources.length >= totalCount;

  const currentColumns = allColumns.filter((column) =>
    visibleColumns.includes(column.id),
  );
  const renderColumns =
    currentColumns.length > 0 ? currentColumns : defaultColumns;

  const sourceLabel = sourceType || "Source";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        disabled={disabled || !sourceType}
        onClick={() => !disabled && sourceType && setOpen(true)}
        className={cn(
          "h-9 w-full justify-between text-sm font-normal shadow-sm",
          !value && "text-muted-foreground",
          error && "border-destructive ring-destructive/20 ring-1",
        )}
      >
        <span className="min-w-0 truncate">
          {displayLabel || (disabled ? "None" : placeholder)}
        </span>
        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-40" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="flex h-[88vh] flex-col gap-0 p-0"
          style={{ width: "min(1160px, 92vw)", maxWidth: "none" }}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <DialogTitle className="text-[15px] font-semibold">
                  Select {sourceLabel} No.
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

          <div className="bg-muted/30 shrink-0 border-b px-5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder={`Search ${sourceLabel} by No. or name...`}
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
                ) : null}
              </div>
              <SourceColumnVisibility
                visibleColumns={visibleColumns}
                defaultColumns={defaultColumns}
                optionalColumns={optionalColumns}
                onColumnToggle={onColumnToggle}
                onResetColumns={onResetColumns}
                onShowAllColumns={onShowAllColumns}
              />
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-auto"
          >
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-muted w-10 border-b px-3" />
                  {renderColumns.map((col) => (
                    <SourceTableHead
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
                      colSpan={renderColumns.length + 1}
                      className="py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                        <p className="text-muted-foreground text-xs">
                          Loading source numbers...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : sources.length === 0 ? (
                  <tr>
                    <td
                      colSpan={renderColumns.length + 1}
                      className="py-20 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground text-sm font-medium">
                          No source records found
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
                    const selectedRecord = value
                      ? sources.find((record) => record[idField] === value)
                      : null;
                    const remainingRecords = selectedRecord
                      ? sources.filter((record) => record[idField] !== value)
                      : sources;

                    const renderRow = (
                      record: SourceRecord,
                      idx: number,
                      isSticky = false,
                    ) => {
                      const isSelected = value === record[idField];
                      return (
                        <tr
                          key={record[idField] as string}
                          onClick={() => handleSelect(record)}
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
                          <td className="w-10 px-3 py-2.5 text-center">
                            {isSelected && (
                              <Check className="text-primary mx-auto h-3.5 w-3.5" />
                            )}
                          </td>
                          {renderColumns.map((col) => {
                            const raw = record[col.id];
                            const cellText = formatCellValue(raw);

                            if (col.id === idField) {
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
                                  {cellText}
                                </td>
                              );
                            }

                            return (
                              <td
                                key={col.id}
                                className={cn(
                                  "px-3 py-2.5 text-xs whitespace-nowrap",
                                  col.align === "right" && "text-right",
                                  isSelected
                                    ? "text-foreground/80 font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                {cellText}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    };

                    return (
                      <>
                        {selectedRecord && renderRow(selectedRecord, 0, true)}
                        {remainingRecords.map((record, idx) =>
                          renderRow(record, idx),
                        )}
                      </>
                    );
                  })()
                )}

                {!loading && (
                  <tr>
                    <td colSpan={renderColumns.length + 1}>
                      <div ref={sentinelRef} className="h-px" />
                    </td>
                  </tr>
                )}

                {loadingMore && (
                  <tr>
                    <td
                      colSpan={renderColumns.length + 1}
                      className="py-3 text-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground text-xs">
                          Loading more...
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !loadingMore &&
                  allFetched &&
                  sources.length > 0 && (
                    <tr>
                      <td
                        colSpan={renderColumns.length + 1}
                        className="py-2 text-center"
                      >
                        <span className="text-muted-foreground/50 text-[10px]">
                          All {totalCount.toLocaleString()} source records
                          loaded
                        </span>
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          <div className="bg-muted/20 flex shrink-0 items-center justify-between border-t px-5 py-2">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-[11px]">
                {loading ? (
                  "Loading..."
                ) : (
                  <>
                    Showing{" "}
                    <span className="text-foreground font-semibold tabular-nums">
                      {sources.length.toLocaleString()}
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
                    records
                    {hasActiveFilters && (
                      <span className="text-primary ml-1 font-medium">
                        filtered
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

interface SourceTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
}

function SourceTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: SourceTableHeadProps) {
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
        column.align === "right" && "text-right",
      )}
      style={
        column.width
          ? { width: column.width, minWidth: column.width }
          : undefined
      }
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          column.align === "right" && "justify-end",
        )}
      >
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
          <SourceColumnFilter
            column={column}
            value={filterValue}
            onChange={(newValue) => onFilter(column.id, newValue)}
          />
        )}
      </div>
    </th>
  );
}

interface SourceColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function SourceColumnFilter({
  column,
  value,
  onChange,
}: SourceColumnFilterProps) {
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
            placeholder={`Search ${column.label}...`}
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

function SourceColumnVisibility({
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

  const filteredDefault = defaultColumns.filter((column) =>
    column.label.toLowerCase().includes(columnSearch.toLowerCase()),
  );
  const filteredOptional = optionalColumns.filter((column) =>
    column.label.toLowerCase().includes(columnSearch.toLowerCase()),
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
