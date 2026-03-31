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
  ChevronRight,
  Equal,
  Coins,
  Scale,
  Package,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
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
  itemChargeAssignmentService,
  ItemChargeAssignment,
  SourceType,
  ItemChargeSourceLine,
} from "@/lib/api/services/item-charge-assignment.service";
import { ItemChargeSelectionDialog } from "./item-charge-selection-dialog";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
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

const PAGE_SIZE = 200;

const FIELD_INPUT_CLASS =
  "disabled:opacity-100 disabled:text-foreground font-normal text-xs disabled:pointer-events-none disabled:bg-muted/30";

type SortDirection = "asc" | "desc" | null;

interface ColumnConfig {
  id: keyof ItemChargeAssignment | string;
  label: string;
  sortable?: boolean;
  filterType?: "text" | "number" | "date";
  align?: "left" | "right" | "center";
  width?: string;
  editable?: boolean;
}

const ASSIGNMENT_COLUMNS: ColumnConfig[] = [
  { id: "Applies_toDocType", label: "Doc. Type", sortable: true, filterType: "text", width: "110px" },
  { id: "Applies_toDocNo", label: "Doc. No.", sortable: true, filterType: "text", width: "150px" },
  { id: "Applies_toDocLineNo", label: "Line No.", sortable: true, filterType: "number", width: "80px", align: "center" },
  { id: "ItemNo", label: "Item No.", sortable: true, filterType: "text", width: "120px" },
  { id: "Description", label: "Description", sortable: true, filterType: "text", width: "200px" },
  { id: "QtytoAssign", label: "Qty. to Assign", sortable: true, filterType: "number", width: "110px", align: "right", editable: true },
  { id: "QtytoHandle", label: "Qty. to Handle", sortable: true, filterType: "number", width: "110px", align: "right", editable: true },
  { id: "QtyAssigned", label: "Qty. Assigned", sortable: true, filterType: "number", width: "110px", align: "right" },
  { id: "AmounttoAssign", label: "Amt. to Assign", sortable: true, filterType: "number", width: "120px", align: "right", editable: true },
  { id: "AmounttoHandle", label: "Amt. to Handle", sortable: true, filterType: "number", width: "120px", align: "right", editable: true },
  { id: "GrossWeight", label: "Gross Wt.", sortable: true, filterType: "number", width: "100px", align: "right" },
  { id: "UnitVolume", label: "Unit Vol.", sortable: true, filterType: "number", width: "100px", align: "right" },
  { id: "QtyToReceiveBase", label: "Qty. Rec. (B)", sortable: true, filterType: "number", width: "110px", align: "right" },
  { id: "QtyReceivedBase", label: "Qty. Rec'd (B)", sortable: true, filterType: "number", width: "110px", align: "right" },
  { id: "QtyToShipBase", label: "Qty. Ship (B)", sortable: true, filterType: "number", width: "110px", align: "right" },
  { id: "QtyShippedBase", label: "Qty. Shipp'd (B)", sortable: true, filterType: "number", width: "115px", align: "right" },
];

// S.No + Checkbox/Delete col + all data cols
const TOTAL_COLS = ASSIGNMENT_COLUMNS.length + 1;

interface ItemChargeAssignmentDialogProps {
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

export function ItemChargeAssignmentDialog({
  open,
  onOpenChange,
  docType,
  docNo,
  docLineNo,
  itemChargeNo,
  itemChargeDescription,
  totalQuantity,
  totalAmount,
}: ItemChargeAssignmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Server-side paged state
  const [lines, setLines] = useState<ItemChargeAssignment[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sorting + Column filters (client-side on fetched data)
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});

  // Selection Dialog
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionType, setSelectionType] = useState<SourceType>("Receipt");

  // Error Dialog
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [apiErrors, setApiErrors] = useState<ErrorDetail[]>([]);
  const [deleteConfirmLine, setDeleteConfirmLine] =
    useState<ItemChargeAssignment | null>(null);

  // Suggestion Flow States
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [selectedSuggestMethod, setSelectedSuggestMethod] = useState("Equally");

  const allFetched = lines.length >= totalCount && totalCount > 0;
  const canFetchMore = !allFetched && !loading && !loadingMore;

  const showError = (title: string, message: string, error?: any) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setApiErrors(
      error
        ? [{ message: error.message || "Unknown error", code: error.code, status: error.status, details: error.details }]
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
      const result = await itemChargeAssignmentService.getAssignments({
        docType, docNo, docLineNo, itemChargeNo,
        skip: 0, top: PAGE_SIZE,
      });
      setLines(result.value);
      setTotalCount(result.count);
    } catch (error: any) {
      console.error("Failed to fetch assignments:", error);
      showError("Fetch Failed", "Could not load assignments from the server.", error);
    } finally {
      setLoading(false);
    }
  }, [docType, docNo, docLineNo, itemChargeNo]);

  const fetchMore = useCallback(async () => {
    if (!canFetchMore) return;
    try {
      setLoadingMore(true);
      const result = await itemChargeAssignmentService.getAssignments({
        docType, docNo, docLineNo, itemChargeNo,
        skip: lines.length, top: PAGE_SIZE,
      });
      setLines((prev) => [...prev, ...result.value]);
      setTotalCount(result.count);
    } catch (error: any) {
      console.error("Failed to fetch more assignments:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [canFetchMore, docType, docNo, docLineNo, itemChargeNo, lines.length]);

  useEffect(() => {
    if (open) {
      fetchInitial();
    }
  }, [open, fetchInitial]);

  // IntersectionObserver
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

  const handleOpenSelection = (type: SourceType) => {
    setSelectionType(type);
    setSelectionOpen(true);
  };

  const handleLinesAdded = async (sourceLines: ItemChargeSourceLine[]) => {
    setLoading(true);
    try {
      const apiGetType = itemChargeAssignmentService.getApiGetType(selectionType);
      await Promise.all(
        sourceLines.map((sl) =>
          itemChargeAssignmentService.postAssignment({
            sourceDoc: docNo,
            sourceLine: docLineNo,
            getType: apiGetType,
            chargeDocNo: sl.Document_No,
            chargeLineNo: sl.Line_No,
            assignmentType: "Purchase",
          }),
        ),
      );
      toast.success(`Successfully added ${sourceLines.length} assignments`);
      await fetchInitial();
    } catch (error: any) {
      console.error("Failed to post assignments:", error);
      showError("Assignment Failed", "Failed to sync some assignments with the server.", error);
      await fetchInitial();
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async (criteria: string) => {
    try {
      setLoading(true);
      await itemChargeAssignmentService.suggestAssignment({
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
    } catch (error: any) {
      console.error("Failed to suggest assignments:", error);
      showError("Suggestion Failed", "Failed to suggest assignments. Please try again or assign manually.", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestClick = () => {
    if (lines.length === 0) return;

    if (lines.length === 1) {
      // Replicate Business Central logic: skip prompt if only one entry exists
      handleSuggest("Equally");
    } else {
      setIsSuggestDialogOpen(true);
    }
  };

  // Client-side filter + sort on fetched lines
  const filteredAndSortedLines = useMemo(() => {
    let result = lines;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (line) =>
          line.Applies_toDocNo.toLowerCase().includes(lowerQuery) ||
          line.Description.toLowerCase().includes(lowerQuery) ||
          line.ItemNo.toLowerCase().includes(lowerQuery) ||
          line.Applies_toDocType.toLowerCase().includes(lowerQuery),
      );
    }

    Object.entries(columnFilters).forEach(([columnId, filter]) => {
      if (!filter.value && !filter.valueTo) return;
      result = result.filter((line) => {
        const value = (line as any)[columnId];
        if (value === null || value === undefined) return false;
        const stringValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();
        if (filterValue.includes(",")) {
          const parts = filterValue.split(",").map((p) => p.trim()).filter(Boolean);
          return parts.some((p) => stringValue.includes(p));
        }
        return stringValue.includes(filterValue);
      });
    });

    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const valA = (a as any)[sortColumn];
        const valB = (b as any)[sortColumn];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const comparison = valA < valB ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [lines, searchQuery, columnFilters, sortColumn, sortDirection]);

  const totals = useMemo(() => {
    const toAssignQty = lines.reduce((sum, l) => sum + (Number(l.QtytoAssign) || 0), 0);
    const toAssignAmt = lines.reduce((sum, l) => sum + (Number(l.AmounttoAssign) || 0), 0);
    const toHandleQty = lines.reduce((sum, l) => sum + (Number(l.QtytoHandle) || 0), 0);
    const toHandleAmt = lines.reduce((sum, l) => sum + (Number(l.AmounttoHandle) || 0), 0);
    return {
      assignableQty: totalQuantity, assignableAmt: totalAmount,
      toAssignQty, toAssignAmt,
      remToAssignQty: totalQuantity - toAssignQty,
      remToAssignAmt: totalAmount - toAssignAmt,
      toHandleQty, toHandleAmt,
      remToHandleQty: totalQuantity - toHandleQty,
      remToHandleAmt: totalAmount - toHandleAmt,
    };
  }, [lines, totalQuantity, totalAmount]);

  const toggleSelectAll = () => {
    if (selectedLines.size === filteredAndSortedLines.length && filteredAndSortedLines.length > 0) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(filteredAndSortedLines.map((l) => `${l.Applies_toDocNo}-${l.Line_No}`)));
    }
  };

  const toggleSelectLine = (line: ItemChargeAssignment) => {
    const uniqueKey = `${line.Applies_toDocNo}-${line.Line_No}`;
    const next = new Set(selectedLines);
    if (next.has(uniqueKey)) next.delete(uniqueKey);
    else next.add(uniqueKey);
    setSelectedLines(next);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : null));
      setSortColumn((prev) => (sortDirection === "desc" ? null : prev));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (columnId: string, value: string, valueTo?: string) => {
    setColumnFilters((prev) => {
      if (!value && !valueTo) {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: { value, valueTo } };
    });
  };

  const handleDeleteLine = async (line: ItemChargeAssignment) => {
    try {
      setLoading(true);
      await itemChargeAssignmentService.deleteAssignment(line);
      setLines((prev) =>
        prev.filter(
          (l) =>
            !(l.Document_Type === line.Document_Type &&
              l.Document_No === line.Document_No &&
              l.Document_Line_No === line.Document_Line_No &&
              l.Line_No === line.Line_No),
        ),
      );
      setTotalCount((prev) => Math.max(0, prev - 1));
      const next = new Set(selectedLines);
      next.delete(`${line.Applies_toDocNo}-${line.Line_No}`);
      setSelectedLines(next);
      toast.success("Assignment deleted");
    } catch (error: any) {
      console.error("Failed to delete assignment:", error);
      showError("Deletion Failed", "Failed to delete assignment from server.", error);
    } finally {
      setLoading(false);
      setDeleteConfirmLine(null);
    }
  };

  const handleUpdateLine = (lineNo: number, field: keyof ItemChargeAssignment, value: number) => {
    setLines((prev) =>
      prev.map((l) => (l.Line_No === lineNo ? { ...l, [field]: value } : l)),
    );
  };

  const fieldInputClass = cn(
    "h-full w-full rounded-none border-0 text-center tabular-nums focus:bg-background/80 transition-all pr-0 text-xs bg-transparent ring-0 focus-visible:ring-1 focus-visible:ring-primary/40",
    FIELD_INPUT_CLASS,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-border bg-background flex h-[95vh] w-[95vw] flex-col gap-0 space-y-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:max-w-[95vw] sm:border">
          <DialogHeader className="border-border space-y-3 border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground flex items-center gap-2 text-lg font-extrabold tracking-tight">
                Item Charge Assignment (Purch)
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
                  {itemChargeNo} — {itemChargeDescription}
                </span>
              </DialogTitle>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="outline" size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("Receipt")}>
                <ArrowUp className="h-3 w-3" /> Get Receipt Lines
              </Button>
              <Button variant="outline" size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("SalesShipment")}>
                <ArrowDown className="h-3 w-3" /> Get Sales Shipment Lines
              </Button>
              <Button variant="outline" size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("Transfer")}>
                <ArrowUpDown className="h-3 w-3" /> Get Transfer Receipt Lines
              </Button>
              <Button variant="outline" size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("ReturnReceipt")}>
                <ChevronRight className="h-3 w-3" /> Get Return Receipt Lines
              </Button>
              <Button variant="outline" size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("ReturnShipment")}>
                <ChevronLeft className="h-3 w-3" /> Get Return Shipment Lines
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="hover:bg-primary-dark border-primary/50 text-primary flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all hover:bg-primary hover:text-white"
                onClick={handleSuggestClick}
                disabled={loading || lines.length === 0}>
                <Zap className="h-3 w-3 fill-current" /> Suggest Assignment
              </Button>
            </div>

            {/* Search */}
            <div className="relative w-full">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search assignments by Doc No, Item No or Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full pl-9"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="bg-background/50 flex flex-1 flex-col overflow-hidden">
            {loading && lines.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="text-primary h-12 w-12 animate-spin" />
                  <p className="text-muted-foreground animate-pulse font-medium">Fetching assignments...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-hidden">
                  <div className="bg-background flex h-full flex-col overflow-hidden">
                    <div ref={scrollContainerRef} className="relative flex-1 overflow-auto">
                      <table className="relative w-full border-collapse text-sm">
                        {/* Sticky header */}
                        <thead className="sticky top-0 z-30">
                          <tr className="bg-muted border-b border-border whitespace-nowrap">
                            {/* S.No + Checkbox + Delete sticky column */}
                            <th className="bg-muted sticky left-0 z-40 w-28 px-3 text-center align-middle">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-primary w-6 text-[9px] font-black tracking-wider uppercase">
                                  #
                                </span>
                                <Checkbox
                                  checked={
                                    filteredAndSortedLines.length > 0 &&
                                    selectedLines.size === filteredAndSortedLines.length
                                  }
                                  onCheckedChange={toggleSelectAll}
                                  className="rounded-none shadow-none"
                                />
                                <div className="w-7" /> {/* spacer for delete */}
                              </div>
                            </th>
                            {ASSIGNMENT_COLUMNS.map((col) => (
                              <SortableTableHead
                                key={col.id as string}
                                column={col}
                                isActive={sortColumn === col.id}
                                sortDirection={sortColumn === col.id ? sortDirection : null}
                                filterValue={columnFilters[col.id as string]?.value ?? ""}
                                onSort={handleSort}
                                onFilter={handleColumnFilter}
                              />
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedLines.length === 0 && !loading ? (
                            <tr>
                              <td colSpan={TOTAL_COLS}
                                className="text-muted-foreground h-96 text-center text-sm font-medium italic opacity-50">
                                {searchQuery
                                  ? "(No assignments match your search)"
                                  : "(There is nothing to show in this view)"}
                              </td>
                            </tr>
                          ) : (
                            <>
                              {filteredAndSortedLines.map((line, idx) => {
                                const uniqueKey = `${line.Applies_toDocNo}-${line.Line_No}`;
                                const isSelected = selectedLines.has(uniqueKey);
                                return (
                                  <tr key={uniqueKey}
                                    className={cn(
                                      "border-border hover:bg-muted/50 h-9 cursor-pointer border-b whitespace-nowrap transition-colors",
                                      isSelected && "bg-primary/5",
                                    )}
                                    onClick={() => toggleSelectLine(line)}>
                                    {/* S.No + Checkbox + Delete sticky cell */}
                                    <td
                                      className="bg-card sticky left-0 z-20 w-28 px-3 text-center align-middle transition-colors"
                                      onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-center gap-2">
                                        <span className="text-muted-foreground w-6 text-right text-[10px] tabular-nums">
                                          {idx + 1}
                                        </span>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleSelectLine(line)}
                                          className="rounded-none shadow-none"
                                        />
                                        <Button variant="ghost" size="icon"
                                          className="text-destructive hover:bg-secondary/50 h-7 w-7 transition-colors"
                                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmLine(line); }}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                    <td className="text-muted-foreground px-3 py-0 text-center align-middle text-[10px] whitespace-nowrap">
                                      {line.Applies_toDocType || "—"}
                                    </td>
                                    <td className="text-primary px-3 py-0 text-center align-middle text-xs font-medium tabular-nums">
                                      {line.Applies_toDocNo}
                                    </td>
                                    <td className="text-muted-foreground px-3 py-0 text-center align-middle text-[10px] tabular-nums">
                                      {line.Applies_toDocLineNo}
                                    </td>
                                    <td className="px-3 py-0 text-center align-middle text-xs tabular-nums">
                                      {line.ItemNo}
                                    </td>
                                    <td className="max-w-[200px] truncate px-3 py-0 text-left align-middle text-[10px]">
                                      {line.Description}
                                    </td>
                                    {/* Editable: Qty to Assign */}
                                    <td className="h-9 p-0 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                      <Input type="text" className={fieldInputClass} style={{ height: "36px" }}
                                        value={line.QtytoAssign}
                                        onChange={(e) => handleUpdateLine(line.Line_No, "QtytoAssign", parseFloat(e.target.value) || 0)} />
                                    </td>
                                    {/* Editable: Qty to Handle */}
                                    <td className="h-9 p-0 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                      <Input type="text" className={fieldInputClass} style={{ height: "36px" }}
                                        value={line.QtytoHandle}
                                        onChange={(e) => handleUpdateLine(line.Line_No, "QtytoHandle", parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="px-3 text-right align-middle text-[11px] tabular-nums font-medium">
                                      {line.QtyAssigned}
                                    </td>
                                    {/* Editable: Amount to Assign */}
                                    <td className="h-9 p-0 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                      <Input type="text" className={fieldInputClass} style={{ height: "36px" }}
                                        value={line.AmounttoAssign}
                                        onChange={(e) => handleUpdateLine(line.Line_No, "AmounttoAssign", parseFloat(e.target.value) || 0)} />
                                    </td>
                                    {/* Editable: Amount to Handle */}
                                    <td className="h-9 p-0 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                      <Input type="text" className={fieldInputClass} style={{ height: "36px" }}
                                        value={line.AmounttoHandle}
                                        onChange={(e) => handleUpdateLine(line.Line_No, "AmounttoHandle", parseFloat(e.target.value) || 0)} />
                                    </td>
                                    <td className="px-3 py-0 text-right align-middle text-[11px] tabular-nums">{line.GrossWeight}</td>
                                    <td className="px-3 py-0 text-right align-middle text-[11px] tabular-nums">{line.UnitVolume}</td>
                                    <td className="px-3 py-0 text-right align-middle text-[11px] tabular-nums">{line.QtyToReceiveBase || 0}</td>
                                    <td className="px-3 py-0 text-right align-middle text-[11px] tabular-nums">{line.QtyReceivedBase || 0}</td>
                                    <td className="px-3 py-0 text-right align-middle text-[11px] tabular-nums">{line.QtyToShipBase || 0}</td>
                                    <td className="px-3 py-0 text-right align-middle text-[11px] tabular-nums">{line.QtyShippedBase || 0}</td>
                                  </tr>
                                );
                              })}

                              {/* Sentinel / end-of-list row */}
                              <tr>
                                <td colSpan={TOTAL_COLS} className="py-3 text-center">
                                  {allFetched ? (
                                    <span className="text-muted-foreground/50 text-[10px] font-medium italic">
                                      — No more records —
                                    </span>
                                  ) : (
                                    <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-1">
                                      {loadingMore && (
                                        <>
                                          <Loader2 className="text-primary/40 h-4 w-4 animate-spin" />
                                          <span className="text-muted-foreground text-[10px]">Loading more...</span>
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

                    {/* Status bar */}
                    <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-1.5">
                      <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                        {loading && lines.length === 0 ? "Loading..." : (
                          <>
                            {lines.length.toLocaleString()}
                            {totalCount > 0 && (
                              <span className="text-foreground/50 ml-1">
                                / {totalCount.toLocaleString()} total
                              </span>
                            )}
                            {" "}Records
                            {(searchQuery || Object.keys(columnFilters).length > 0) && (
                              <span className="text-primary ml-2">
                                ({filteredAndSortedLines.length} filtered)
                              </span>
                            )}
                          </>
                        )}
                      </span>
                      {(loading && lines.length > 0) && (
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="text-primary h-3 w-3 animate-spin" />
                          <span className="text-muted-foreground text-[10px]">Refreshing...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Totals Section */}
                {!loading && lines.length > 0 && (
                  <div className="bg-muted/10 border-border overflow-x-auto border-t px-4 py-2">
                    <table className="border-collapse">
                      <thead>
                        <tr className="h-6 border-none">
                          <th className="h-6 w-[150px]"></th>
                          {["Assignable", "To Assign", "Rem. to Assign", "To Handle", "Rem. to Handle"].map((h) => (
                            <th key={h} className="text-muted-foreground h-6 w-[120px] px-4 text-right text-[9px] font-black uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="h-7 border-none">
                          <td className="text-foreground h-7 px-4 py-0 text-[11px] font-bold">Total (Qty.)</td>
                          <td className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">{totals.assignableQty.toLocaleString()}</td>
                          <td className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">{totals.toAssignQty.toLocaleString()}</td>
                          <td className={cn("h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums", totals.remToAssignQty !== 0 ? "text-destructive" : "text-green-600")}>
                            {totals.remToAssignQty.toLocaleString()}
                          </td>
                          <td className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">{totals.toHandleQty.toLocaleString()}</td>
                          <td className={cn("h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums", totals.remToHandleQty !== 0 ? "text-destructive" : "text-green-600")}>
                            {totals.remToHandleQty.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="h-7 border-none">
                          <td className="text-foreground h-7 px-4 py-0 text-[11px] font-bold">Total (Amount)</td>
                          <td className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">{totals.assignableAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">{totals.toAssignAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className={cn("h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums", totals.remToAssignAmt !== 0 ? "text-destructive" : "text-green-600")}>
                            {totals.remToAssignAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">{totals.toHandleAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className={cn("h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums", totals.remToHandleAmt !== 0 ? "text-destructive" : "text-green-600")}>
                            {totals.remToHandleAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="border-border bg-background shadow-top-lg flex items-center justify-end gap-2 border-t px-4 py-2">
            <Button variant={"destructive"} className="border-destructive/50 border-3 px-6" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ItemChargeSelectionDialog
        open={selectionOpen}
        onOpenChange={setSelectionOpen}
        onAddSelected={handleLinesAdded}
        type={selectionType}
      />

      <AlertDialog open={!!deleteConfirmLine} onOpenChange={(open) => !open && setDeleteConfirmLine(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the assignment for item{" "}
              <span className="text-foreground font-semibold">{deleteConfirmLine?.ItemNo}</span>{" "}
              ({deleteConfirmLine?.Description}) from{" "}
              <span className="text-foreground font-semibold">{deleteConfirmLine?.Applies_toDocNo}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deleteConfirmLine) handleDeleteLine(deleteConfirmLine); }}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}
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

      {/* Suggestion Method Dialog */}
      <Dialog open={isSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <div className="bg-primary px-6 py-8 relative overflow-hidden">
            {/* Glossy background effect */}
            <div className="absolute inset-0 bg-white/5 opacity-20 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/30">
                  <Zap className="w-5 h-5 text-white fill-current" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Suggest Assignment</h2>
              </div>
              <p className="text-primary-foreground/80 text-sm font-medium">Select a distribution method to automatically assign item charges.</p>
            </div>
            <button
              onClick={() => setIsSuggestDialogOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 bg-background space-y-4">
            <div className="grid gap-3">
              {[
                { id: "Equally", icon: Equal, label: "Equally", desc: "Divide uniformly across all lines" },
                { id: "By Amount", icon: Coins, label: "By Amount", desc: "Proportional to line item values" },
                { id: "By Weight", icon: Scale, label: "By Weight", desc: "Based on gross weights of items" },
                { id: "By Volume", icon: Package, label: "By Volume", desc: "Based on unit volumes of items" }
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = selectedSuggestMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedSuggestMethod(method.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "border-muted hover:border-primary/40 hover:bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "p-2.5 rounded-lg transition-colors shrink-0",
                      isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm tracking-wide uppercase">{method.label}</span>
                        {isSelected && (
                          <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{method.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 font-bold tracking-wider uppercase h-11 rounded-xl"
                onClick={() => setIsSuggestDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 font-bold tracking-wider uppercase h-11 rounded-xl shadow-lg shadow-primary/20"
                onClick={() => handleSuggest(selectedSuggestMethod)}
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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

function SortableTableHead({ column, isActive, sortDirection, filterValue, onSort, onFilter }: SortableTableHeadProps) {
  const getSortIcon = () => {
    if (!isActive || !sortDirection) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    if (sortDirection === "asc") return <ArrowUp className="h-3 w-3" />;
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th
      className={cn(
        "bg-muted text-primary h-10 px-3 py-3 text-left align-middle text-[10px] font-bold tracking-wider whitespace-nowrap uppercase select-none",
        column.align === "right" && "text-right",
        column.align === "center" && "text-center",
        isActive && "text-primary",
      )}
      style={{ width: column.width }}
    >
      <div className={cn("flex items-center gap-1.5",
        column.align === "right" ? "justify-end" : column.align === "center" ? "justify-center" : "")}>
        <span className="hover:text-primary/70 cursor-pointer transition-colors"
          onClick={() => column.sortable && onSort(column.id as string)}>
          {column.label}
        </span>
        {column.sortable && (
          <button type="button" className="hover:text-primary/70 transition-colors"
            onClick={() => onSort(column.id as string)}>
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <ColumnFilter column={column} value={filterValue}
            onChange={(value) => onFilter(column.id as string, value)} />
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

  useEffect(() => { setLocalValue(value); }, [value]);

  const handleApply = () => { onChange(localValue); setOpen(false); };
  const handleClear = () => { setLocalValue(""); onChange(""); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button"
          className={cn("hover:bg-background/50 rounded p-0.5 transition-colors",
            hasFilter ? "text-primary" : "text-primary/30 hover:text-primary/60")}
          onClick={(e) => e.stopPropagation()}>
          <Filter className={cn("h-3 w-3", hasFilter ? "fill-current" : "")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Filter {column.label}</Label>
          <Input placeholder="Search..." value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleApply()} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="h-7 flex-1 text-xs" onClick={handleApply}>Apply</Button>
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
