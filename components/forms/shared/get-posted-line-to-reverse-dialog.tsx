"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Loader2, Search, X, Check, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  fetchPstdDocLines,
  submitPstdDocLineToReverse,
  type PstdDocMenuOption,
  type PstdDocLineRow,
} from "@/lib/api/services/get-pstd-doc-lines-to-reverse.service";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { getErrorMessage } from "@/lib/errors";
import {
  SelectionTableHead,
  type ColumnConfig,
  type SortDirection,
} from "@/components/ui/selection-table-head";

const PAGE_SIZE = 200;

const TABLE_COLUMNS: ColumnConfig[] = [
  { id: "Document_No", label: "Document No.", sortable: true, filterType: "text", width: "150px" },
  { id: "Posting_Date", label: "Date", sortable: true, filterType: "text", width: "110px" },
  { id: "Location_Code", label: "Location", sortable: true, filterType: "text", width: "100px" },
  { id: "No", label: "No.", sortable: true, filterType: "text", width: "120px" },
  { id: "Description", label: "Description", sortable: true, filterType: "text", width: "260px" },
  { id: "Quantity", label: "Quantity", sortable: true, align: "right", width: "90px" },
  { id: "Unit_of_Measure", label: "UOM", sortable: true, align: "center", width: "80px" },
  { id: "Amount", label: "Amount", sortable: true, align: "right", width: "110px" },
];

interface GetPostedLineToReverseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The document number of the current document (source for the reversal) */
  sourceDocNo: string;
  /** Menu options for the document-type dropdown */
  menuOptions: PstdDocMenuOption[];
  /** Optional vendor number to filter the posted lines by Buy_from_Vendor_No */
  vendorNo?: string;
  /** Optional customer number to filter the posted lines by Sell_to_Customer_No */
  customerNo?: string;
  /** Which module this dialog is opened from */
  module: "Purchase" | "Sales";
  /** Called after all rows have been successfully submitted */
  onSuccess: () => void;
}

export function GetPostedLineToReverseDialog({
  open,
  onOpenChange,
  sourceDocNo,
  menuOptions,
  vendorNo,
  customerNo,
  module,
  onSuccess,
}: GetPostedLineToReverseDialogProps) {
  const [selectedOption, setSelectedOption] = useState<PstdDocMenuOption>(
    menuOptions[0],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<PstdDocLineRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; passed: number; failed: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragSelectingRef = useRef<boolean | null>(null);

  const allFetched = rows.length >= totalCount && totalCount > 0;
  const canFetchMore = !allFetched && !loading && !loadingMore;

  const rowId = (r: PstdDocLineRow) => `${r.Document_No}-${r.Line_No}`;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset rows + selection when option or search changes
  const fetchInitial = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setRows([]);
    setTotalCount(0);
    setSelectedIds(new Set());
    setIsAllSelected(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    try {
      const result = await fetchPstdDocLines(selectedOption.endpoint, {
        search: debouncedSearch || undefined,
        skip: 0,
        top: PAGE_SIZE,
        vendorNo,
        customerNo,
      });
      setRows(result.value);
      setTotalCount(result.count);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to fetch documents."));
    } finally {
      setLoading(false);
    }
  }, [open, selectedOption, debouncedSearch, vendorNo, customerNo]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedSearch("");
      setSelectedIds(new Set());
      setIsAllSelected(false);
      setSelectedOption(menuOptions[0]);
    }
  }, [open, menuOptions]);

  const fetchMore = useCallback(async () => {
    if (!canFetchMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchPstdDocLines(selectedOption.endpoint, {
        search: debouncedSearch || undefined,
        skip: rows.length,
        top: PAGE_SIZE,
        vendorNo,
        customerNo,
      });
      setRows((prev) => [...prev, ...result.value]);
      setTotalCount(result.count);
    } catch {
      /* silent */
    } finally {
      setLoadingMore(false);
    }
  }, [canFetchMore, selectedOption.endpoint, debouncedSearch, rows.length, vendorNo, customerNo]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchMore]);

  // Drag-select support
  useEffect(() => {
    const onUp = () => {
      isDraggingRef.current = false;
      dragSelectingRef.current = null;
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  const handleRowMouseDown = (id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("input,button")) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const isSelecting = !selectedIds.has(id);
    dragSelectingRef.current = isSelecting;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isSelecting) {
        next.add(id);
        if (next.size === totalCount) setIsAllSelected(true);
      } else {
        next.delete(id);
        setIsAllSelected(false);
      }
      return next;
    });
  };

  const handleRowMouseEnter = (id: string) => {
    if (!isDraggingRef.current || dragSelectingRef.current === null) return;
    const isSelecting = dragSelectingRef.current;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isSelecting) {
        next.add(id);
        if (next.size === totalCount) setIsAllSelected(true);
      } else {
        next.delete(id);
        setIsAllSelected(false);
      }
      return next;
    });
  };

  const filteredAndSortedLines = useMemo(() => {
    let result = rows;

    // Apply column filters
    Object.entries(columnFilters).forEach(([colId, filterVal]) => {
      if (!filterVal) return;
      result = result.filter((line) => {
        const value = (line as unknown as Record<string, unknown>)[colId];
        if (value == null) return false;
        const sv = String(value).toLowerCase();
        const fv = filterVal.toLowerCase();
        if (fv.includes(",")) {
          return fv.split(",").map((p) => p.trim()).filter(Boolean).some((p) => sv.includes(p));
        }
        return sv.includes(fv);
      });
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const valA = (a as unknown as Record<string, unknown>)[sortColumn];
        const valB = (b as unknown as Record<string, unknown>)[sortColumn];
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        const cmp = valA < valB ? -1 : 1;
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, columnFilters, sortColumn, sortDirection]);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : null));
      setSortColumn((prev) => (sortDirection === "desc" ? null : prev));
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      if (!value) {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: value };
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected || (selectedIds.size === totalCount && totalCount > 0)) {
      setIsAllSelected(false);
      setSelectedIds(new Set());
    } else {
      if (totalCount > rows.length) {
        setIsAllSelected(true);
        setSelectedIds(new Set(rows.map(rowId)));
      } else {
        setIsAllSelected(false);
        setSelectedIds(new Set(rows.map(rowId)));
      }
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setIsAllSelected(false);
      } else {
        next.add(id);
        if (next.size === totalCount) setIsAllSelected(true);
      }
      return next;
    });
  };

  const handleDone = async () => {
    let selected: PstdDocLineRow[] = [];

    if (isAllSelected && totalCount > rows.length) {
      setIsSubmitting(true);
      try {
        const result = await fetchPstdDocLines(selectedOption.endpoint, {
          search: debouncedSearch || undefined,
          skip: 0,
          top: totalCount,
          vendorNo,
          customerNo,
        });
        selected = result.value;
      } catch (err) {
        setErrorMsg(getErrorMessage(err, "Failed to fetch all lines."));
        setIsSubmitting(false);
        return;
      }
    } else {
      selected = rows.filter((r) => selectedIds.has(rowId(r)));
    }

    if (selected.length === 0) return;
    setIsSubmitting(true);
    try {
      let passed = 0;
      let failed = 0;
      const BATCH_SIZE = 5;
      setBatchProgress({ current: 0, total: selected.length, passed: 0, failed: 0 });

      for (let i = 0; i < selected.length; i += BATCH_SIZE) {
        const batch = selected.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((row) =>
            submitPstdDocLineToReverse(
              module,
              sourceDocNo,
              selectedOption.currentMenuType,
              row.Document_No,
              row.Line_No,
            ),
          ),
        );
        results.forEach((r) => {
          if (r.status === "fulfilled") passed++;
          else failed++;
        });
        setBatchProgress({ current: Math.min(i + BATCH_SIZE, selected.length), total: selected.length, passed, failed });
      }

      if (failed === 0) {
        toast.success(`${passed} line${passed > 1 ? "s" : ""} copied successfully`);
      } else {
        toast.warning(`Reversal completed: ${passed} success, ${failed} failed`);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Failed to copy lines."));
    } finally {
      setIsSubmitting(false);
      setBatchProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background flex h-[90vh] w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[90vw]">
        {/* ── Header ── */}
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle className="text-sm font-bold">
            Get Posted Line To Reverse
          </DialogTitle>

          {/* Document-type selector */}
          <div className="mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 min-w-56 justify-between text-xs"
                >
                  {selectedOption.label}
                  <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-56">
                {menuOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.currentMenuType}
                    className={cn(
                      "text-xs",
                      opt.currentMenuType === selectedOption.currentMenuType &&
                      "bg-accent font-medium",
                    )}
                    onSelect={() => setSelectedOption(opt)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search bar */}
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search by Document No. or Description…"
              className="h-8 pl-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* ── Table ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          style={{ userSelect: "none" }}
        >
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-30">
              <tr className="bg-muted border-b whitespace-nowrap">
                <th className="bg-muted sticky left-0 z-40 w-14 px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-muted-foreground w-5 text-[9px] font-bold tracking-wider uppercase">
                      #
                    </span>
                    <Checkbox
                      checked={
                        isAllSelected ||
                        (totalCount > 0 && selectedIds.size === totalCount)
                      }
                      onCheckedChange={toggleSelectAll}
                      className="rounded shadow-none"
                    />
                  </div>
                </th>
                {TABLE_COLUMNS.map((col) => (
                  <SelectionTableHead
                    key={col.id}
                    column={col}
                    isActive={sortColumn === col.id}
                    sortDirection={sortColumn === col.id ? sortDirection : null}
                    filterValue={columnFilters[col.id] ?? ""}
                    onSort={handleSort}
                    onFilter={handleColumnFilter}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="h-60 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="text-primary/40 h-8 w-8 animate-spin" />
                      <p className="text-muted-foreground text-sm italic">
                        Fetching records…
                      </p>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-60 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <Search className="text-muted-foreground h-8 w-8" />
                      <p className="text-muted-foreground text-sm italic">
                        No lines found.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredAndSortedLines.map((row: PstdDocLineRow, idx: number) => {
                    const id = rowId(row);
                    const isSelected = selectedIds.has(id);
                    return (
                      <tr
                        key={`${id}-${idx}`}
                        className={cn(
                          "border-b whitespace-nowrap transition-colors cursor-pointer",
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                        )}
                        onMouseDown={(e) => handleRowMouseDown(id, e)}
                        onMouseEnter={() => handleRowMouseEnter(id)}
                      >
                        <td
                          className="bg-card sticky left-0 z-20 w-14 px-3 py-2 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-muted-foreground w-5 text-right text-[10px] tabular-nums">
                              {idx + 1}
                            </span>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(id)}
                              className="rounded shadow-none"
                            />
                          </div>
                        </td>
                        <td className="text-primary px-3 py-2 text-left text-xs font-medium">
                          {row.Document_No}
                        </td>
                        <td className="px-3 py-2 text-left text-[10px] tabular-nums">
                          {row.Posting_Date ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-left text-[10px]">
                          {row.Location_Code ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-left text-[10px] tabular-nums">
                          {row.No ?? "—"}
                        </td>
                        <td className="max-w-64 truncate px-3 py-2 text-left text-[11px]">
                          {row.Description ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] tabular-nums">
                          {row.Quantity != null
                            ? row.Quantity.toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-[10px]">
                          {row.Unit_of_Measure ?? row.Unit_of_Measure_Code ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] tabular-nums">
                          {row.Amount != null
                            ? row.Amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={9} className="py-2 text-center">
                      {allFetched ? (
                        <span className="text-muted-foreground/50 text-[10px] italic">
                          — End of records —
                        </span>
                      ) : (
                        <div
                          ref={sentinelRef}
                          className="flex items-center justify-center gap-2 py-1"
                        >
                          {loadingMore && (
                            <>
                              <Loader2 className="text-primary/40 h-3.5 w-3.5 animate-spin" />
                              <span className="text-muted-foreground text-[10px]">
                                Loading more…
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Status bar ── */}
        <div className="flex shrink-0 items-center justify-between border-t px-4 py-1.5">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              {batchProgress ? (
                <span className="text-primary animate-pulse">
                  Reversing {batchProgress.current} / {batchProgress.total} ({batchProgress.passed} ✅, {batchProgress.failed} ❌)
                </span>
              ) : isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  {rows.length.toLocaleString()}
                  {totalCount > 0 && (
                    <span className="text-foreground/50 ml-1">
                      / {totalCount.toLocaleString()} total
                    </span>
                  )}{" "}
                  Records
                  {Object.keys(columnFilters).length > 0 && (
                    <span className="text-primary ml-2">
                      ({filteredAndSortedLines.length} filtered)
                    </span>
                  )}
                </>
              )}
            </span>
            {isSubmitting && rows.length > 0 && !batchProgress && (
              <div className="flex items-center gap-1.5">
                <Loader2 className="text-primary h-3 w-3 animate-spin" />
                <span className="text-muted-foreground text-[10px]">Processing...</span>
              </div>
            )}
          </div>
          {(selectedIds.size > 0 || isAllSelected) && (
            <span className="text-primary text-[10px] font-bold">
              {isAllSelected ? totalCount.toLocaleString() : selectedIds.size.toLocaleString()} selected
            </span>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="shrink-0 gap-2 border-t px-4 py-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDone}
            disabled={(selectedIds.size === 0 && !isAllSelected) || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {batchProgress ? `Copying (${batchProgress.current}/${batchProgress.total})...` : "Copying..."}
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Done ({isAllSelected ? totalCount.toLocaleString() : selectedIds.size.toLocaleString()})
              </>
            )}
          </Button>
        </DialogFooter>

        <RequestFailedDialog
          open={!!errorMsg}
          onOpenChange={(open) => {
            if (!open) setErrorMsg(null);
          }}
          message={errorMsg}
        />
      </DialogContent>
    </Dialog>
  );
}
