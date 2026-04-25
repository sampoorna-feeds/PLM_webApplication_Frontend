"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Zap,
  Trash2,
  ChevronLeft,
  Equal,
  Coins,
  Scale,
  Package,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
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
import { ErrorDialog, ErrorDetail } from "@/components/ui/error-dialog";
import {
  salesItemChargeAssignmentService,
  type SalesChargeSourceType,
} from "@/lib/api/services/sales-item-charge-assignment.service";
import type {
  ItemChargeAssignment,
  ItemChargeSourceLine,
  SourceType,
} from "@/lib/api/services/item-charge-assignment.service";
import { ItemChargeSelectionDialog } from "@/components/forms/purchase/item-charge-selection-dialog";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 200;

type SortDirection = "asc" | "desc" | null;

interface ColumnConfig {
  id: keyof ItemChargeAssignment | string;
  label: string;
  sortable?: boolean;
  filterType?: "text" | "number";
  align?: "left" | "right" | "center";
  width?: string;
  editable?: boolean;
}

const ASSIGNMENT_COLUMNS: ColumnConfig[] = [
  {
    id: "Applies_toDocType",
    label: "Doc. Type",
    sortable: true,
    filterType: "text",
    width: "110px",
  },
  {
    id: "Applies_toDocNo",
    label: "Doc. No.",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Applies_toDocLineNo",
    label: "Line No.",
    sortable: true,
    width: "80px",
    align: "center",
  },
  {
    id: "ItemNo",
    label: "Item No.",
    sortable: true,
    filterType: "text",
    width: "120px",
  },
  {
    id: "Description",
    label: "Description",
    sortable: true,
    filterType: "text",
    width: "200px",
  },
  {
    id: "QtytoAssign",
    label: "Qty. to Assign",
    sortable: true,
    width: "110px",
    align: "right",
    editable: true,
  },
  {
    id: "QtytoHandle",
    label: "Qty. to Handle",
    sortable: true,
    width: "110px",
    align: "right",
    editable: true,
  },
  {
    id: "QtyAssigned",
    label: "Qty. Assigned",
    sortable: true,
    width: "110px",
    align: "right",
  },
  {
    id: "AmounttoAssign",
    label: "Amt. to Assign",
    sortable: true,
    width: "120px",
    align: "right",
    editable: true,
  },
  {
    id: "AmounttoHandle",
    label: "Amt. to Handle",
    sortable: true,
    width: "120px",
    align: "right",
    editable: true,
  },
  {
    id: "GrossWeight",
    label: "Gross Wt.",
    sortable: true,
    width: "100px",
    align: "right",
  },
  {
    id: "UnitVolume",
    label: "Unit Vol.",
    sortable: true,
    width: "100px",
    align: "right",
  },
  {
    id: "QtyToReceiveBase",
    label: "Qty. Rec. (B)",
    sortable: true,
    width: "110px",
    align: "right",
  },
  {
    id: "QtyReceivedBase",
    label: "Qty. Rec'd (B)",
    sortable: true,
    width: "110px",
    align: "right",
  },
  {
    id: "QtyToShipBase",
    label: "Qty. Ship (B)",
    sortable: true,
    width: "110px",
    align: "right",
  },
  {
    id: "QtyShippedBase",
    label: "Qty. Shipp'd (B)",
    sortable: true,
    width: "115px",
    align: "right",
  },
];

const TOTAL_COLS = ASSIGNMENT_COLUMNS.length + 1;

interface SalesItemChargeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: string;
  docNo: string;
  docLineNo: number;
  itemChargeNo: string;
  itemChargeDescription: string;
  totalQuantity: number;
  totalAmount: number;
}

export function SalesItemChargeAssignmentDialog({
  open,
  onOpenChange,
  docType,
  docNo,
  docLineNo,
  itemChargeNo,
  itemChargeDescription,
  totalQuantity,
  totalAmount,
}: SalesItemChargeAssignmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [lines, setLines] = useState<ItemChargeAssignment[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string }>
  >({});

  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionType, setSelectionType] =
    useState<SalesChargeSourceType>("SalesShipment");

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [apiErrors, setApiErrors] = useState<ErrorDetail[]>([]);
  const [deleteConfirmLine, setDeleteConfirmLine] =
    useState<ItemChargeAssignment | null>(null);
  const [deleteConfirmBulk, setDeleteConfirmBulk] = useState(false);

  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [selectedSuggestMethod, setSelectedSuggestMethod] =
    useState("Equally");

  const isDraggingRef = useRef(false);
  const dragSelectingRef = useRef<boolean | null>(null);

  const allFetched = lines.length >= totalCount && totalCount > 0;
  const canFetchMore = !allFetched && !loading && !loadingMore;

  const showError = (title: string, message: string, error?: unknown) => {
    const err = error as
      | { message?: string; code?: string; status?: number; details?: unknown }
      | undefined;
    setErrorTitle(title);
    setErrorMessage(message);
    setApiErrors(
      err
        ? [
            {
              message: err.message || "Unknown error",
              code: err.code,
              status: err.status,
              details: typeof err.details === "string" ? err.details : undefined,
            },
          ]
        : [],
    );
    setErrorDialogOpen(true);
  };

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      setLines([]);
      setTotalCount(0);
      setSelectedLines(new Set());
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      const result = await salesItemChargeAssignmentService.getAssignments({
        docType,
        docNo,
        docLineNo,
        itemChargeNo,
        skip: 0,
        top: PAGE_SIZE,
      });
      setLines(result.value);
      setTotalCount(result.count);
    } catch (error) {
      showError("Fetch Failed", "Could not load assignments from the server.", error);
    } finally {
      setLoading(false);
    }
  }, [docType, docNo, docLineNo, itemChargeNo]);

  const fetchMore = useCallback(async () => {
    if (!canFetchMore) return;
    try {
      setLoadingMore(true);
      const result = await salesItemChargeAssignmentService.getAssignments({
        docType,
        docNo,
        docLineNo,
        itemChargeNo,
        skip: lines.length,
        top: PAGE_SIZE,
      });
      setLines((prev) => [...prev, ...result.value]);
      setTotalCount(result.count);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [canFetchMore, docType, docNo, docLineNo, itemChargeNo, lines.length]);

  useEffect(() => {
    if (open) fetchInitial();
  }, [open, fetchInitial]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore]);

  const handleOpenSelection = (type: SalesChargeSourceType) => {
    setSelectionType(type);
    setSelectionOpen(true);
  };

  const handleLinesAdded = async (sourceLines: ItemChargeSourceLine[]) => {
    setLoading(true);
    try {
      const apiGetType = salesItemChargeAssignmentService.getApiGetType(selectionType);
      await Promise.all(
        sourceLines.map((sl) =>
          salesItemChargeAssignmentService.postAssignment({
            sourceDoc: docNo,
            sourceLine: docLineNo,
            getType: apiGetType,
            chargeDocNo: sl.Document_No,
            chargeLineNo: sl.Line_No,
          }),
        ),
      );
      toast.success(`Successfully added ${sourceLines.length} assignments`);
      await fetchInitial();
    } catch (error) {
      showError(
        "Assignment Failed",
        "Failed to sync some assignments with the server.",
        error,
      );
      await fetchInitial();
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async (criteria: string) => {
    try {
      setLoading(true);
      await salesItemChargeAssignmentService.suggestAssignment({
        docNo,
        lineNo: docLineNo,
        totalQtyToAssign: totalQuantity,
        totalAmtToAssign: totalAmount,
        totalQtyToHandle: totalQuantity,
        totalAmtToHandle: totalAmount,
        selectionTxt: criteria,
      });
      toast.success(`Successfully suggested assignments by ${criteria}`);
      setIsSuggestDialogOpen(false);
      await fetchInitial();
    } catch (error) {
      showError("Suggestion Failed", "Failed to suggest assignments.", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestClick = () => {
    if (lines.length === 0) return;
    if (lines.length === 1) {
      handleSuggest("Equally");
    } else {
      setIsSuggestDialogOpen(true);
    }
  };

  const filteredAndSortedLines = useMemo(() => {
    let result = lines;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.Applies_toDocNo.toLowerCase().includes(q) ||
          l.Description.toLowerCase().includes(q) ||
          l.ItemNo.toLowerCase().includes(q) ||
          l.Applies_toDocType.toLowerCase().includes(q),
      );
    }
    Object.entries(columnFilters).forEach(([columnId, filter]) => {
      if (!filter.value) return;
      result = result.filter((line) => {
        const value = (line as unknown as Record<string, unknown>)[columnId];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(filter.value.toLowerCase());
      });
    });
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
  }, [lines, searchQuery, columnFilters, sortColumn, sortDirection]);

  const totals = useMemo(() => {
    const toAssignQty = lines.reduce((s, l) => s + (Number(l.QtytoAssign) || 0), 0);
    const toAssignAmt = lines.reduce(
      (s, l) => s + (Number(l.AmounttoAssign) || 0),
      0,
    );
    const toHandleQty = lines.reduce((s, l) => s + (Number(l.QtytoHandle) || 0), 0);
    const toHandleAmt = lines.reduce(
      (s, l) => s + (Number(l.AmounttoHandle) || 0),
      0,
    );
    return {
      assignableQty: totalQuantity,
      assignableAmt: totalAmount,
      toAssignQty,
      toAssignAmt,
      remToAssignQty: totalQuantity - toAssignQty,
      remToAssignAmt: totalAmount - toAssignAmt,
      toHandleQty,
      toHandleAmt,
      remToHandleQty: totalQuantity - toHandleQty,
      remToHandleAmt: totalAmount - toHandleAmt,
    };
  }, [lines, totalQuantity, totalAmount]);

  const lineKey = (l: ItemChargeAssignment) => `${l.Applies_toDocNo}-${l.Line_No}`;

  const toggleSelectAll = () => {
    if (
      selectedLines.size === filteredAndSortedLines.length &&
      filteredAndSortedLines.length > 0
    ) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(filteredAndSortedLines.map(lineKey)));
    }
  };

  const toggleSelectLine = (line: ItemChargeAssignment) => {
    const key = lineKey(line);
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRowMouseDown = (line: ItemChargeAssignment, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("input, button")) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const key = lineKey(line);
    dragSelectingRef.current = !selectedLines.has(key);
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (dragSelectingRef.current) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleRowMouseEnter = (line: ItemChargeAssignment) => {
    if (!isDraggingRef.current || dragSelectingRef.current === null) return;
    const key = lineKey(line);
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (dragSelectingRef.current) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  useEffect(() => {
    const onMouseUp = () => {
      isDraggingRef.current = false;
      dragSelectingRef.current = null;
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : null));
      setSortColumn((prev) => (sortDirection === "desc" ? null : prev));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (columnId: string, value: string) => {
    setColumnFilters((prev) => {
      if (!value) {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: { value } };
    });
  };

  const handleDeleteLine = async (line: ItemChargeAssignment) => {
    try {
      setLoading(true);
      await salesItemChargeAssignmentService.deleteAssignment(line);
      setLines((prev) =>
        prev.filter(
          (l) =>
            !(
              l.Document_Type === line.Document_Type &&
              l.Document_No === line.Document_No &&
              l.Document_Line_No === line.Document_Line_No &&
              l.Line_No === line.Line_No
            ),
        ),
      );
      setTotalCount((prev) => Math.max(0, prev - 1));
      setSelectedLines((prev) => {
        const next = new Set(prev);
        next.delete(lineKey(line));
        return next;
      });
      toast.success("Assignment deleted");
    } catch (error) {
      showError("Deletion Failed", "Failed to delete assignment from server.", error);
    } finally {
      setLoading(false);
      setDeleteConfirmLine(null);
    }
  };

  const handleDeleteSelected = async () => {
    const toDelete = lines.filter((l) => selectedLines.has(lineKey(l)));
    if (toDelete.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(
        toDelete.map((l) => salesItemChargeAssignmentService.deleteAssignment(l)),
      );
      const deletedKeys = new Set(toDelete.map(lineKey));
      setLines((prev) => prev.filter((l) => !deletedKeys.has(lineKey(l))));
      setTotalCount((prev) => Math.max(0, prev - toDelete.length));
      setSelectedLines(new Set());
      toast.success(
        `${toDelete.length} assignment${toDelete.length > 1 ? "s" : ""} deleted`,
      );
    } catch (error) {
      showError("Deletion Failed", "Failed to delete some assignments.", error);
    } finally {
      setLoading(false);
      setDeleteConfirmBulk(false);
    }
  };

  const handleUpdateLine = (
    lineNo: number,
    field: keyof ItemChargeAssignment,
    value: number,
  ) => {
    setLines((prev) =>
      prev.map((l) => (l.Line_No === lineNo ? { ...l, [field]: value } : l)),
    );
  };

  const editableCellClass =
    "h-9 w-full rounded-none border-0 bg-transparent px-2 text-right text-xs tabular-nums ring-0 focus-visible:ring-1 focus-visible:ring-primary/40 focus:bg-background/80";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-border bg-background flex h-[95vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
          <DialogHeader className="border-b px-4 py-3 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground flex items-center gap-2 text-sm font-bold">
                Item Charge Assignment
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
                  {itemChargeNo} - {itemChargeDescription}
                </span>
              </DialogTitle>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                onClick={() => handleOpenSelection("SalesShipment")}
              >
                <ArrowDown className="mr-1 h-3 w-3" /> Get Sales Shipment Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                onClick={() => handleOpenSelection("Transfer")}
              >
                <ArrowUpDown className="mr-1 h-3 w-3" /> Get Transfer Receipt Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                onClick={() => handleOpenSelection("ReturnShipment")}
              >
                <ChevronLeft className="mr-1 h-3 w-3" /> Get Return Shipment Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                onClick={handleSuggestClick}
                disabled={loading || lines.length === 0}
              >
                <Zap className="mr-1 h-3 w-3 fill-current" /> Suggest Assignment
              </Button>
            </div>

            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search by Doc No, Item No or Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
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

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {loading && lines.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  <p className="text-muted-foreground text-sm">Fetching assignments...</p>
                </div>
              </div>
            ) : (
              <>
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-auto"
                  style={{ userSelect: "none" }}
                >
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-30">
                      <tr className="bg-muted border-b border-border whitespace-nowrap">
                        <th className="bg-muted sticky left-0 z-40 w-28 h-10 px-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-foreground w-5 text-[9px] font-bold tracking-wider uppercase">
                              #
                            </span>
                            <Checkbox
                              checked={
                                filteredAndSortedLines.length > 0 &&
                                selectedLines.size === filteredAndSortedLines.length
                              }
                              onCheckedChange={toggleSelectAll}
                              className="rounded shadow-none"
                            />
                            <div className="w-6" />
                          </div>
                        </th>
                        {ASSIGNMENT_COLUMNS.map((col) => (
                          <AssignmentTableHead
                            key={col.id as string}
                            column={col}
                            isActive={sortColumn === col.id}
                            sortDirection={sortColumn === col.id ? sortDirection : null}
                            filterValue={columnFilters[col.id as string]?.value ?? ""}
                            onSort={handleSort}
                            onFilter={handleColumnFilter}
                            bgClass="bg-muted"
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody ref={tbodyRef}>
                      {filteredAndSortedLines.length === 0 && !loading ? (
                        <tr>
                          <td
                            colSpan={TOTAL_COLS}
                            className="text-muted-foreground h-40 text-center text-xs italic"
                          >
                            {searchQuery
                              ? "No assignments match your search."
                              : "No assignments yet. Use the buttons above to add lines."}
                          </td>
                        </tr>
                      ) : (
                        <>
                          {filteredAndSortedLines.map((line, idx) => {
                            const key = lineKey(line);
                            const isSelected = selectedLines.has(key);
                            return (
                              <tr
                                key={key}
                                className={cn(
                                  "border-b whitespace-nowrap transition-colors",
                                  isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                                  "cursor-pointer",
                                )}
                                onMouseDown={(e) => handleRowMouseDown(line, e)}
                                onMouseEnter={() => handleRowMouseEnter(line)}
                              >
                                <td
                                  className="bg-card sticky left-0 z-20 w-28 px-3 py-2 text-center align-middle"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-muted-foreground w-5 text-right text-[10px] tabular-nums">
                                      {idx + 1}
                                    </span>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleSelectLine(line)}
                                      className="rounded shadow-none"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:bg-destructive/10 h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmLine(line);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                                <td className="text-muted-foreground px-3 py-2 text-center align-middle text-[10px] whitespace-nowrap">
                                  {line.Applies_toDocType || "-"}
                                </td>
                                <td className="text-primary px-3 py-2 text-center align-middle text-xs font-medium tabular-nums">
                                  {line.Applies_toDocNo}
                                </td>
                                <td className="text-muted-foreground px-3 py-2 text-center align-middle text-[10px] tabular-nums">
                                  {line.Applies_toDocLineNo}
                                </td>
                                <td className="px-3 py-2 text-center align-middle text-xs tabular-nums">
                                  {line.ItemNo}
                                </td>
                                <td className="max-w-50 truncate px-3 py-2 text-left align-middle text-[10px]">
                                  {line.Description}
                                </td>
                                <td className="p-0 align-middle" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    className={editableCellClass}
                                    value={line.QtytoAssign}
                                    onChange={(e) =>
                                      handleUpdateLine(
                                        line.Line_No,
                                        "QtytoAssign",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </td>
                                <td className="p-0 align-middle" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    className={editableCellClass}
                                    value={line.QtytoHandle}
                                    onChange={(e) =>
                                      handleUpdateLine(
                                        line.Line_No,
                                        "QtytoHandle",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 text-right align-middle text-[11px] font-medium tabular-nums">
                                  {line.QtyAssigned}
                                </td>
                                <td className="p-0 align-middle" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    className={editableCellClass}
                                    value={line.AmounttoAssign}
                                    onChange={(e) =>
                                      handleUpdateLine(
                                        line.Line_No,
                                        "AmounttoAssign",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </td>
                                <td className="p-0 align-middle" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    className={editableCellClass}
                                    value={line.AmounttoHandle}
                                    onChange={(e) =>
                                      handleUpdateLine(
                                        line.Line_No,
                                        "AmounttoHandle",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 text-right align-middle text-[11px] tabular-nums">
                                  {line.GrossWeight}
                                </td>
                                <td className="px-3 py-2 text-right align-middle text-[11px] tabular-nums">
                                  {line.UnitVolume}
                                </td>
                                <td className="px-3 py-2 text-right align-middle text-[11px] tabular-nums">
                                  {line.QtyToReceiveBase || 0}
                                </td>
                                <td className="px-3 py-2 text-right align-middle text-[11px] tabular-nums">
                                  {line.QtyReceivedBase || 0}
                                </td>
                                <td className="px-3 py-2 text-right align-middle text-[11px] tabular-nums">
                                  {line.QtyToShipBase || 0}
                                </td>
                                <td className="px-3 py-2 text-right align-middle text-[11px] tabular-nums">
                                  {line.QtyShippedBase || 0}
                                </td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan={TOTAL_COLS} className="py-2 text-center">
                              {allFetched ? (
                                <span className="text-muted-foreground/50 text-[10px] italic">
                                  - End of records -
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
                                        Loading more...
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

                <div className="border-t px-4 py-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      {loading ? (
                        "Loading..."
                      ) : (
                        <>
                          {lines.length.toLocaleString()}
                          {totalCount > 0 && (
                            <span className="text-foreground/50 ml-1">
                              / {totalCount.toLocaleString()} total
                            </span>
                          )}
                          Records
                          {(searchQuery || Object.keys(columnFilters).length > 0) && (
                            <span className="text-primary ml-2">
                              ({filteredAndSortedLines.length} filtered)
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    {loading && lines.length > 0 && (
                      <>
                        <Loader2 className="text-primary h-3 w-3 animate-spin" />
                        <span className="text-muted-foreground text-[10px]">Refreshing...</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedLines.size > 0 && (
                      <span className="text-primary text-[10px] font-bold">
                        {selectedLines.size} selected
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-destructive/40 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                      onClick={() => setDeleteConfirmBulk(true)}
                      disabled={selectedLines.size === 0 || loading}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {selectedLines.size > 0
                        ? `Delete ${selectedLines.size} Selected`
                        : "Delete Selected"}
                    </Button>
                  </div>
                </div>

                {!loading && lines.length > 0 && (
                  <div className="border-t bg-muted/10 overflow-x-auto px-4 py-2 shrink-0">
                    <table className="border-collapse">
                      <thead>
                        <tr>
                          <th className="w-36" />
                          {[
                            "Assignable",
                            "To Assign",
                            "Rem. to Assign",
                            "To Handle",
                            "Rem. to Handle",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-muted-foreground w-28 px-4 text-right text-[9px] font-bold tracking-wider uppercase"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-foreground px-4 py-0.5 text-[11px] font-bold">
                            Total (Qty.)
                          </td>
                          <td className="px-4 py-0.5 text-right text-[12px] font-black tabular-nums">
                            {totals.assignableQty.toLocaleString()}
                          </td>
                          <td className="px-4 py-0.5 text-right text-[12px] font-black tabular-nums">
                            {totals.toAssignQty.toLocaleString()}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-0.5 text-right text-[12px] font-black tabular-nums",
                              totals.remToAssignQty !== 0
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {totals.remToAssignQty.toLocaleString()}
                          </td>
                          <td className="px-4 py-0.5 text-right text-[12px] font-black tabular-nums">
                            {totals.toHandleQty.toLocaleString()}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-0.5 text-right text-[12px] font-black tabular-nums",
                              totals.remToHandleQty !== 0
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {totals.remToHandleQty.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-foreground px-4 py-0.5 text-[11px] font-bold">
                            Total (Amount)
                          </td>
                          <td className="px-4 py-0.5 text-right text-[12px] font-black tabular-nums">
                            {totals.assignableAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-0.5 text-right text-[12px] font-black tabular-nums">
                            {totals.toAssignAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-0.5 text-right text-[12px] font-black tabular-nums",
                              totals.remToAssignAmt !== 0
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {totals.remToAssignAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-0.5 text-right text-[12px] font-black tabular-nums">
                            {totals.toHandleAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-0.5 text-right text-[12px] font-black tabular-nums",
                              totals.remToHandleAmt !== 0
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {totals.remToHandleAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="border-t px-4 py-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ItemChargeSelectionDialog
        open={selectionOpen}
        onOpenChange={setSelectionOpen}
        onAddSelected={handleLinesAdded}
        type={selectionType as SourceType}
      />

      <AlertDialog
        open={!!deleteConfirmLine}
        onOpenChange={(o) => !o && setDeleteConfirmLine(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the assignment for item{" "}
              <span className="text-foreground font-semibold">
                {deleteConfirmLine?.ItemNo}
              </span>{" "}
              ({deleteConfirmLine?.Description}) from{" "}
              <span className="text-foreground font-semibold">
                {deleteConfirmLine?.Applies_toDocNo}
              </span>
              ? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteConfirmLine) handleDeleteLine(deleteConfirmLine);
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteConfirmBulk}
        onOpenChange={(o) => !o && setDeleteConfirmBulk(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedLines.size} Assignments
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {selectedLines.size} selected
              assignment{selectedLines.size > 1 ? "s" : ""}. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSelected();
              }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedLines.size}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ErrorDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title={errorTitle}
        message={errorMessage}
        errors={apiErrors}
      />

      <Dialog open={isSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="text-primary h-4 w-4 fill-current" /> Suggest Assignment
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {[
              {
                id: "Equally",
                icon: Equal,
                label: "Equally",
                desc: "Divide uniformly across all lines",
              },
              {
                id: "By Amount",
                icon: Coins,
                label: "By Amount",
                desc: "Proportional to line item values",
              },
              {
                id: "By Weight",
                icon: Scale,
                label: "By Weight",
                desc: "Based on gross weights of items",
              },
              {
                id: "By Volume",
                icon: Package,
                label: "By Volume",
                desc: "Based on unit volumes of items",
              },
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = selectedSuggestMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedSuggestMethod(method.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-md p-1.5 shrink-0",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold tracking-wide uppercase">
                      {method.label}
                    </p>
                    <p className="text-muted-foreground text-[10px]">{method.desc}</p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="text-primary ml-auto h-4 w-4 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuggestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSuggest(selectedSuggestMethod)} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AssignmentTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (id: string) => void;
  onFilter: (id: string, value: string) => void;
  bgClass?: string;
}

function AssignmentTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
  bgClass = "bg-muted",
}: AssignmentTableHeadProps) {
  const SortIcon =
    !isActive || !sortDirection
      ? ArrowUpDown
      : sortDirection === "asc"
        ? ArrowUp
        : ArrowDown;
  return (
    <th
      className={cn(
        bgClass,
        "text-foreground h-10 px-3 text-left align-middle text-[10px] font-bold tracking-wider whitespace-nowrap uppercase select-none",
        column.align === "right" && "text-right",
        column.align === "center" && "text-center",
      )}
      style={{ minWidth: column.width }}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          column.align === "right"
            ? "justify-end"
            : column.align === "center"
              ? "justify-center"
              : "",
        )}
      >
        <span
          className="cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => column.sortable && onSort(column.id as string)}
        >
          {column.label}
        </span>
        {column.sortable && (
          <button
            type="button"
            className="hover:opacity-70 transition-opacity"
            onClick={() => onSort(column.id as string)}
          >
            <SortIcon className={cn("h-3 w-3", !isActive && "opacity-30")} />
          </button>
        )}
        {column.filterType && (
          <AssignmentColumnFilter
            column={column}
            value={filterValue}
            onChange={(v) => onFilter(column.id as string, v)}
          />
        )}
      </div>
    </th>
  );
}

interface AssignmentColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function AssignmentColumnFilter({
  column,
  value,
  onChange,
}: AssignmentColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const hasFilter = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded p-0.5 transition-colors",
            hasFilter
              ? "text-primary"
              : "text-primary/30 hover:text-primary/60",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className={cn("h-3 w-3", hasFilter && "fill-current")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-xs">Filter {column.label}</Label>
          <Input
            placeholder="Search..."
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onChange(local);
                setOpen(false);
              }
            }}
          />
        </div>
        <div className="mt-2 flex gap-2">
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
