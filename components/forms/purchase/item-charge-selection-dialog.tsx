"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Search, Check, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from "lucide-react";
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
import { itemChargeAssignmentService, ItemChargeSourceLine, SourceType } from "@/lib/api/services/item-charge-assignment.service";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  { id: "Document_No", label: "Document No.", sortable: true, filterType: "text", width: "160px" },
  { id: "Line_No", label: "Line No.", sortable: true, filterType: "number", width: "90px", align: "center" },
  { id: "Item_No", label: "Item No.", sortable: true, filterType: "text", width: "130px" },
  { id: "Description", label: "Description", sortable: true, filterType: "text", width: "250px" },
  { id: "Quantity", label: "Quantity", sortable: true, filterType: "number", width: "100px", align: "right" },
  { id: "Unit_of_Measure", label: "UOM", sortable: true, filterType: "text", width: "80px", align: "center" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, filterType: "date", width: "120px" },
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Sorting State
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filtering State
  const [columnFilters, setColumnFilters] = useState<Record<string, { value: string; valueTo?: string }>>({});

  const fetchSourceLines = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const data = await itemChargeAssignmentService.getSourceLines(type, undefined, search);
      setSourceLines(data);
      setSelectedIds(new Set());
    } catch (error) {
      console.error(`Failed to fetch ${type} lines:`, error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const handleSearch = () => {
    fetchSourceLines(searchTerm);
  };

  useEffect(() => {
    if (open) {
      fetchSourceLines();
      setSearchTerm("");
    }
  }, [open, fetchSourceLines]);

  // Filtered and Sorted Lines
  const filteredAndSortedLines = useMemo(() => {
    let result = sourceLines;

    // 1. Column filters
    Object.entries(columnFilters).forEach(([columnId, filter]) => {
      if (!filter.value && !filter.valueTo) return;
      
      result = result.filter(line => {
        let value = (line as any)[columnId];
        // Handle Item No. mapping (No or Item_No)
        if (columnId === 'Item_No' && value === undefined) {
          value = line.No || line.Item_No;
        }

        if (value === null || value === undefined) return false;
        
        const stringValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();
        
        if (filterValue.includes(',')) {
          const parts = filterValue.split(',').map(p => p.trim()).filter(Boolean);
          return parts.some(p => stringValue.includes(p));
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
        if (sortColumn === 'Item_No') {
          valA = a.No || a.Item_No || "";
          valB = b.No || b.Item_No || "";
        }
        
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        const comparison = valA < valB ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [sourceLines, columnFilters, sortColumn, sortDirection]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedLines.length && filteredAndSortedLines.length > 0) {
      setSelectedIds(new Set());
    } else {
      const allIds = filteredAndSortedLines.map(line => `${line.Document_No}-${line.Line_No}`);
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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') setSortColumn(null);
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleColumnFilter = (columnId: string, value: string, valueTo?: string) => {
    setColumnFilters(prev => {
      if (!value && !valueTo) {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: { value, valueTo } };
    });
  };

  const handleAdd = async () => {
    try {
      setIsAdding(true);
      const selected = sourceLines.filter(line => 
        selectedIds.has(`${line.Document_No}-${line.Line_No}`)
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
      <DialogContent className="sm:max-w-[90vw] w-[90vw] h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-background shadow-2xl rounded-xl sm:border">
        <DialogHeader className="px-5 py-4 border-b border-border bg-muted/30 relative">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
              <div className="h-8 w-1 bg-primary rounded-full" />
              {titles[type]}
            </DialogTitle>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={`Search ${type} by Document No. or Item No...`}
                className="pl-10 h-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button 
              size="sm" 
              className="h-10 px-6 text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95" 
              onClick={handleSearch} 
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden bg-background/50 focus-within:ring-1 focus-within:ring-primary/10 transition-all">
          <div className="flex-1 overflow-hidden">
            <div className="overflow-hidden flex flex-col bg-background h-full">
              <div className="relative flex-1 overflow-auto">
                <Table className="relative w-full border-collapse">
                  <TableHeader className="bg-muted sticky top-0 z-30 border-b border-border shadow-sm">
                    <TableRow className="h-10 hover:bg-transparent [&_th]:border-b">
                      <TableHead className="bg-muted sticky left-0 z-40 w-16 px-4 text-center align-middle">
                        <Checkbox
                          checked={filteredAndSortedLines.length > 0 && selectedIds.size === filteredAndSortedLines.length}
                          onCheckedChange={toggleSelectAll}
                          className="rounded-none shadow-none"
                        />
                      </TableHead>
                      {SELECTION_COLUMNS.map((col) => (
                        <SortableTableHead
                          key={col.id}
                          column={col}
                          isActive={sortColumn === col.id}
                          sortDirection={sortColumn === col.id ? sortDirection : null}
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
                            <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
                            <p className="text-muted-foreground font-medium italic animate-pulse">Fetching records...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAndSortedLines.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="h-96 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-40">
                            <Search className="h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground font-medium italic">No lines found matching your selection.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedLines.map((line, idx) => {
                        const id = `${line.Document_No}-${line.Line_No}`;
                        const isSelected = selectedIds.has(id);
                        const itemNo = line.No || line.Item_No || "";
                        return (
                          <TableRow
                            key={`${line.Document_No}-${line.Line_No}-${idx}`}
                            className="group h-10 border-b border-border cursor-pointer transition-colors"
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
                            <TableCell className="text-primary px-3 py-0 text-center align-middle text-xs tabular-nums">{line.Document_No}</TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">{line.Line_No}</TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-xs tabular-nums">{itemNo}</TableCell>
                            <TableCell className="max-w-[300px] truncate px-3 py-0 text-center align-middle text-[10px]">{line.Description}</TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-[11px] tabular-nums">{line.Quantity.toLocaleString()}</TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">{line.Unit_of_Measure || "—"}</TableCell>
                            <TableCell className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">{line.Posting_Date || "—"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-4 border-t border-border bg-background items-center justify-between gap-4 shadow-top-lg">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/20 transition-all hover:bg-primary/10">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-black text-primary uppercase tracking-widest">
              {selectedIds.size} Lines Selected
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="px-6 font-bold h-10 text-xs border-border/50 uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all hover:bg-muted/50" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              size="sm"
              className="px-8 font-black h-10 text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group" 
              onClick={handleAdd} 
              disabled={selectedIds.size === 0 || isAdding}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
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
  onSort: (column: string) => void;
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
        "bg-muted text-foreground h-10 px-3 py-3 text-left align-middle text-[10px] font-bold uppercase tracking-tight whitespace-nowrap select-none",
        isActive && "text-primary"
      )}
      style={{ width: column.width }}
    >
      <div className={cn("flex items-center gap-1.5", column.align === "right" ? "justify-end" : column.align === "center" ? "justify-center" : "")}>
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
            hasFilter ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Filter className={cn("h-3 w-3", hasFilter ? "fill-current" : "")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start" onClick={(e) => e.stopPropagation()}>
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
          <Button size="sm" className="h-7 flex-1 text-xs" onClick={handleApply}>
            Apply
          </Button>
          {hasFilter && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleClear}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
