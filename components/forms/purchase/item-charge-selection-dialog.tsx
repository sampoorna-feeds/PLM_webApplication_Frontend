"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  Search,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  itemChargeAssignmentService,
  ItemChargeSourceLine,
  SourceType,
} from "@/lib/api/services/item-charge-assignment.service";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

type SortDirection = "asc" | "desc" | null;

interface ColumnConfig {
  id: string;
  label: string;
  sortable?: boolean;
  filterType?: "text" | "number" | "date";
  align?: "left" | "right" | "center";
  width?: string;
}

const SELECTION_COLUMNS: ColumnConfig[] = [
  {
    id: "Document_No",
    label: "Document No.",
    sortable: true,
    filterType: "text",
    width: "160px",
  },
  {
    id: "Line_No",
    label: "Line No.",
    sortable: true,
    filterType: "number",
    width: "90px",
    align: "center",
  },
  {
    id: "Item_No",
    label: "Item No.",
    sortable: true,
    filterType: "text",
    width: "130px",
  },
  {
    id: "Description",
    label: "Description",
    sortable: true,
    filterType: "text",
    width: "250px",
  },
  {
    id: "Quantity",
    label: "Quantity",
    sortable: true,
    filterType: "number",
    width: "100px",
    align: "right",
  },
  {
    id: "Unit_of_Measure",
    label: "UOM",
    sortable: true,
    filterType: "text",
    width: "80px",
    align: "center",
  },
  {
    id: "Posting_Date",
    label: "Posting Date",
    sortable: true,
    filterType: "date",
    width: "120px",
  },
];

interface ItemChargeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: SourceType;
  onAddSelected: (lines: ItemChargeSourceLine[]) => Promise<void> | void;
}

export function ItemChargeSelectionDialog({
  open,
  onOpenChange,
  type,
  onAddSelected,
}: ItemChargeSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sourceLines, setSourceLines] = useState<ItemChargeSourceLine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAdding, setIsAdding] = useState(false);

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sorting State
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filtering State
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});

  const fetchSourceLines = useCallback(
    async (search?: string) => {
      try {
        setLoading(true);
        const data = await itemChargeAssignmentService.getSourceLines(
          type,
          undefined,
          search,
        );
        setSourceLines(data || []);
        setSelectedIds(new Set());
      } catch (error) {
        console.error(`Failed to fetch ${type} lines:`, error);
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  useEffect(() => {
    if (open) {
      fetchSourceLines(debouncedSearchQuery);
      setCurrentPage(1);
    }
  }, [open, debouncedSearchQuery, fetchSourceLines]);

  // Filtered and Sorted Lines
  const filteredAndSortedLines = useMemo(() => {
    let result = sourceLines;

    // 1. Column filters
    Object.entries(columnFilters).forEach(([columnId, filter]) => {
      if (!filter.value && !filter.valueTo) return;

      result = result.filter((line) => {
        let value = (line as any)[columnId];
        // Handle Item No. mapping (No or Item_No)
        if (columnId === "Item_No" && value === undefined) {
          value = line.No || line.Item_No;
        }

        if (value === null || value === undefined) return false;

        const stringValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();

        if (filterValue.includes(",")) {
          const parts = filterValue
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          return parts.some((p) => stringValue.includes(p));
        }

        return stringValue.includes(filterValue);
      });
    });

    // 2. Sorting
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        let valA = (a as any)[sortColumn];
        let valB = (b as any)[sortColumn];

        // Handle Item No. mapping
        if (sortColumn === "Item_No") {
          valA = a.No || a.Item_No || "";
          valB = b.No || b.Item_No || "";
        }

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const comparison = valA < valB ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [sourceLines, columnFilters, sortColumn, sortDirection]);

  // Paginated Lines
  const paginatedLines = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedLines.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedLines, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedLines.length / pageSize);

  const toggleSelectAll = () => {
    if (
      selectedIds.size === filteredAndSortedLines.length &&
      filteredAndSortedLines.length > 0
    ) {
      setSelectedIds(new Set());
    } else {
      const allIds = filteredAndSortedLines.map(
        (line) => `${line.Document_No}-${line.Line_No}`,
      );
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelectLine = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc",
      );
      if (sortDirection === "desc") setSortColumn(null);
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (
    columnId: string,
    value: string,
    valueTo?: string,
  ) => {
    setColumnFilters((prev) => {
      if (!value && !valueTo) {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: { value, valueTo } };
    });
    setCurrentPage(1);
  };

  const handleAdd = async () => {
    try {
      setIsAdding(true);
      const selected = sourceLines.filter((line) =>
        selectedIds.has(`${line.Document_No}-${line.Line_No}`),
      );
      await onAddSelected(selected);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add lines:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const titles: Record<SourceType, string> = {
    Receipt: "Get Purchase Receipt Lines",
    SalesShipment: "Get Sales Shipment Lines",
    Transfer: "Get Transfer Receipt Lines",
    ReturnReceipt: "Get Return Receipt Lines",
    ReturnShipment: "Get Return Shipment Lines",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background flex h-[90vh] w-[90vw] flex-col gap-0 space-y-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:max-w-[90vw] sm:border">
        <DialogHeader className="border-border bg-muted/30 relative border-b px-5 py-4">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-foreground flex items-center gap-3 text-xl font-black tracking-tight uppercase">
              <div className="bg-primary h-8 w-1 rounded-full" />
              {titles[type]}
            </DialogTitle>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div className="group relative flex-1">
              <Search className="text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 transition-colors" />
              <Input
                placeholder={`Search ${type} by Document No. or Item No...`}
                className="h-10 w-full pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="bg-background/50 focus-within:ring-primary/10 flex flex-1 flex-col overflow-hidden transition-all focus-within:ring-1">
          <div className="flex-1 overflow-hidden">
            <div className="bg-background flex h-full flex-col overflow-hidden">
              <div className="bg-background relative flex-1 overflow-auto">
                <table className="relative w-full border-collapse border-separate border-spacing-0 text-sm">
                  <TableHeader className="bg-muted border-border sticky top-0 z-30 border-b shadow-sm">
                    <TableRow className="bg-muted h-10 hover:bg-transparent [&_th]:border-b">
                      <TableHead className="bg-muted border-border sticky top-0 left-0 z-40 w-16 border-b px-4 text-center align-middle">
                        <Checkbox
                          checked={
                            filteredAndSortedLines.length > 0 &&
                            selectedIds.size === filteredAndSortedLines.length
                          }
                          onCheckedChange={toggleSelectAll}
                          className="rounded-none shadow-none"
                        />
                      </TableHead>
                      {SELECTION_COLUMNS.map((col) => (
                        <SortableTableHead
                          key={col.id}
                          column={col}
                          isActive={sortColumn === col.id}
                          sortDirection={
                            sortColumn === col.id ? sortDirection : null
                          }
                          filterValue={columnFilters[col.id]?.value ?? ""}
                          onSort={handleSort}
                          onFilter={handleColumnFilter}
                        />
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="h-96 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="text-primary/40 h-12 w-12 animate-spin" />
                            <p className="text-muted-foreground animate-pulse font-medium italic">
                              Fetching records...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAndSortedLines.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="h-96 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-40">
                            <Search className="text-muted-foreground h-12 w-12" />
                            <p className="text-muted-foreground font-medium italic">
                              No lines found matching your selection.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLines.map((line, idx) => {
                        const id = `${line.Document_No}-${line.Line_No}`;
                        const isSelected = selectedIds.has(id);
                        const itemNo = line.No || line.Item_No || "";
                        return (
                          <TableRow
                            key={`${line.Document_No}-${line.Line_No}-${idx}`}
                            className="group border-border h-10 cursor-pointer border-b transition-colors"
                            onClick={() => toggleSelectLine(id)}
                          >
                            <TableCell
                              className="bg-background sticky left-0 z-20 w-16 px-4 text-center align-middle transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectLine(id)}
                                className="rounded-none shadow-none"
                              />
                            </TableCell>
                            <TableCell className="text-primary px-3 py-0 text-center align-middle text-xs tabular-nums">
                              {line.Document_No}
                            </TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">
                              {line.Line_No}
                            </TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-xs tabular-nums">
                              {itemNo}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate px-3 py-0 text-center align-middle text-[10px]">
                              {line.Description}
                            </TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-[11px] tabular-nums">
                              {line.Quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">
                              {line.Unit_of_Measure || "—"}
                            </TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">
                              {line.Posting_Date || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </table>
              </div>

              {/* Pagination Section */}
              <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-1.5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Rows:
                    </span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="bg-background h-7 w-14 text-[10px] font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent title="Rows per page">
                        {[10, 20, 50, 100].map((size) => (
                          <SelectItem
                            key={size}
                            value={size.toString()}
                            className="text-[10px]"
                          >
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    {filteredAndSortedLines.length} Records
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-background h-7 w-7"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-background h-7 w-7"
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-border bg-background shadow-top-lg items-center justify-between gap-4 border-t px-5 py-4">
          <div className="bg-primary/5 border-primary/20 hover:bg-primary/10 flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all">
            <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
            <span className="text-primary text-xs font-black tracking-widest uppercase">
              {selectedIds.size} Lines Selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={"destructive"}
              className="border-destructive/50 border-3 px-6"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="shadow-primary/20 group h-10 px-8 text-xs font-black tracking-widest uppercase shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || isAdding}
            >
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
              )}
              {isAdding ? "Processing..." : "Add Selected"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SortableTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (columnId: string) => void;
  onFilter: (columnId: string, value: string, valueTo?: string) => void;
}

function SortableTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: SortableTableHeadProps) {
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
        "bg-muted text-foreground border-border sticky top-0 z-30 h-10 border-b px-3 py-3 text-left align-middle text-[10px] font-bold tracking-tight whitespace-nowrap uppercase select-none",
        isActive && "text-primary",
      )}
      style={{ width: column.width }}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          column.align === "right"
            ? "justify-end"
            : column.align === "center"
              ? "justify-center"
              : "",
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
          <ColumnFilter
            column={column}
            value={filterValue}
            onChange={(value) => onFilter(column.id, value)}
          />
        )}
      </div>
    </th>
  );
}

interface ColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function ColumnFilter({ column, value, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const hasFilter = !!value;

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleApply = () => {
    onChange(localValue);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "hover:bg-background/50 rounded p-0.5 transition-colors",
            hasFilter
              ? "text-primary"
              : "text-muted-foreground/50 hover:text-muted-foreground",
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Filter className={cn("h-3 w-3", hasFilter ? "fill-current" : "")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-xs font-medium">Filter {column.label}</Label>
          <Input
            placeholder="Search..."
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={handleApply}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
