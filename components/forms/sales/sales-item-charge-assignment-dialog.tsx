"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  Search,
  X,
  ArrowDown,
  ArrowUpDown,
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
} from "@/lib/api/services/item-charge-assignment.service";
import { cn } from "@/lib/utils";
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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionType, setSelectionType] =
    useState<SalesChargeSourceType>("SalesShipment");
  const [selectionLines, setSelectionLines] = useState<ItemChargeSourceLine[]>(
    [],
  );
  const [selectionSearch, setSelectionSearch] = useState("");
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionSelected, setSelectionSelected] = useState<
    Set<string | number>
  >(new Set());

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [apiErrors, setApiErrors] = useState<ErrorDetail[]>([]);
  const [deleteConfirmLine, setDeleteConfirmLine] =
    useState<ItemChargeAssignment | null>(null);
  const [deleteConfirmBulk, setDeleteConfirmBulk] = useState(false);
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = useState(false);
  const [selectedSuggestMethod, setSelectedSuggestMethod] = useState("Equally");

  // Drag-select
  const isDraggingRef = useRef(false);
  const dragSelectingRef = useRef<boolean | null>(null);

  const allFetched = lines.length >= totalCount && totalCount > 0;
  const canFetchMore = !allFetched && !loading && !loadingMore;

  const showError = (title: string, message: string, error?: unknown) => {
    const err = error as {
      message?: string;
      code?: string;
      status?: number;
      details?: unknown;
    };
    setErrorTitle(title);
    setErrorMessage(message);
    setApiErrors(
      err
        ? [
            {
              message: err.message || "Unknown error",
              code: err.code,
              status: err.status,
              details:
                typeof err.details === "string" ? err.details : undefined,
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
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
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
      showError(
        "Fetch Failed",
        "Could not load assignments from the server.",
        error,
      );
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

  // Source line selection
  const openSelection = async (type: SalesChargeSourceType) => {
    setSelectionType(type);
    setSelectionLines([]);
    setSelectionSearch("");
    setSelectionSelected(new Set());
    setSelectionOpen(true);
    setSelectionLoading(true);
    try {
      const result = await salesItemChargeAssignmentService.getSourceLines(
        type,
        { top: PAGE_SIZE },
      );
      setSelectionLines(result.value);
    } catch (error) {
      showError("Fetch Failed", "Could not load source lines.", error);
    } finally {
      setSelectionLoading(false);
    }
  };

  const handleAddSelected = async () => {
    const toAdd = selectionLines.filter((sl) =>
      selectionSelected.has(sl.Line_No),
    );
    if (toAdd.length === 0) return;
    setLoading(true);
    setSelectionOpen(false);
    try {
      const apiGetType =
        salesItemChargeAssignmentService.getApiGetType(selectionType);
      await Promise.all(
        toAdd.map((sl) =>
          salesItemChargeAssignmentService.postAssignment({
            sourceDoc: docNo,
            sourceLine: docLineNo,
            getType: apiGetType,
            chargeDocNo: sl.Document_No,
            chargeLineNo: sl.Line_No,
            assignmentType: "Sale",
          }),
        ),
      );
      toast.success(`Added ${toAdd.length} assignment(s)`);
      await fetchInitial();
    } catch (error) {
      showError(
        "Assignment Failed",
        "Failed to add some assignments.",
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
      toast.success(`Suggested by ${criteria}`);
      setIsSuggestDialogOpen(false);
      await fetchInitial();
    } catch (error) {
      showError("Suggestion Failed", "Failed to suggest assignments.", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLines = useMemo(() => {
    let result = lines;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.Applies_toDocNo.toLowerCase().includes(q) ||
          l.Description.toLowerCase().includes(q) ||
          l.ItemNo.toLowerCase().includes(q),
      );
    }
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const va = (a as unknown as Record<string, unknown>)[sortColumn];
        const vb = (b as unknown as Record<string, unknown>)[sortColumn];
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp = va < vb ? -1 : 1;
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [lines, searchQuery, sortColumn, sortDirection]);

  const totals = useMemo(() => {
    const toAssignQty = lines.reduce(
      (s, l) => s + (Number(l.QtytoAssign) || 0),
      0,
    );
    const toAssignAmt = lines.reduce(
      (s, l) => s + (Number(l.AmounttoAssign) || 0),
      0,
    );
    return {
      toAssignQty,
      toAssignAmt,
      remQty: totalQuantity - toAssignQty,
      remAmt: totalAmount - toAssignAmt,
    };
  }, [lines, totalQuantity, totalAmount]);

  const lineKey = (l: ItemChargeAssignment) =>
    `${l.Applies_toDocNo}-${l.Line_No}`;

  const toggleAll = () => {
    if (
      selectedLines.size === filteredLines.length &&
      filteredLines.length > 0
    ) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(filteredLines.map(lineKey)));
    }
  };

  const toggleLine = (line: ItemChargeAssignment) => {
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
      toast.success("Assignment deleted");
    } catch (error) {
      showError("Delete Failed", "Failed to delete assignment.", error);
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
        toDelete.map((l) =>
          salesItemChargeAssignmentService.deleteAssignment(l),
        ),
      );
      const deleted = new Set(toDelete.map(lineKey));
      setLines((prev) => prev.filter((l) => !deleted.has(lineKey(l))));
      setTotalCount((prev) => Math.max(0, prev - toDelete.length));
      setSelectedLines(new Set());
      toast.success(`${toDelete.length} assignment(s) deleted`);
    } catch (error) {
      showError("Delete Failed", "Failed to delete some assignments.", error);
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

  const selectionTypeLabel: Record<SalesChargeSourceType, string> = {
    SalesShipment: "Sales Shipment Lines",
    ReturnShipment: "Return Shipment Lines",
    Transfer: "Transfer Receipt Lines",
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-border bg-background flex h-[95vh] w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
          <DialogHeader className="border-b px-4 py-3 shrink-0">
            <DialogTitle className="text-foreground flex items-center gap-2 text-sm font-bold">
              Sales Item Charge Assignment
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
                {itemChargeNo} — {itemChargeDescription}
              </span>
            </DialogTitle>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                onClick={() => openSelection("SalesShipment")}
              >
                <ArrowDown className="mr-1 h-3 w-3" /> Get Shipment Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                onClick={() => openSelection("ReturnShipment")}
              >
                <ChevronLeft className="mr-1 h-3 w-3" /> Get Return Shipment
                Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                onClick={() => openSelection("Transfer")}
              >
                <ArrowUpDown className="mr-1 h-3 w-3" /> Get Transfer Receipt
                Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                onClick={() => {
                  if (lines.length === 0) return;
                  if (lines.length === 1) handleSuggest("Equally");
                  else setIsSuggestDialogOpen(true);
                }}
                disabled={loading || lines.length === 0}
              >
                <Zap className="mr-1 h-3 w-3 fill-current" /> Suggest
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
                  <p className="text-muted-foreground text-sm">
                    Fetching assignments...
                  </p>
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
                      <tr className="bg-muted border-b whitespace-nowrap">
                        <th className="bg-muted sticky left-0 z-40 h-10 w-28 px-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <Checkbox
                              checked={
                                filteredLines.length > 0 &&
                                selectedLines.size === filteredLines.length
                              }
                              onCheckedChange={toggleAll}
                            />
                          </div>
                        </th>
                        {[
                          "Doc. Type",
                          "Doc. No.",
                          "Line No.",
                          "Item No.",
                          "Description",
                          "Qty to Assign",
                          "Qty to Handle",
                          "Qty Assigned",
                          "Amt to Assign",
                          "Amt to Handle",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-primary px-3 py-2 text-left text-[10px] font-bold tracking-wider uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLines.length === 0 && !loading ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="text-muted-foreground h-40 text-center text-xs italic"
                          >
                            {searchQuery
                              ? "No assignments match your search."
                              : "No assignments yet. Use the buttons above to add lines."}
                          </td>
                        </tr>
                      ) : (
                        <>
                          {filteredLines.map((line, idx) => {
                            const key = lineKey(line);
                            const isSelected = selectedLines.has(key);
                            return (
                              <tr
                                key={key}
                                className={cn(
                                  "border-b whitespace-nowrap transition-colors",
                                  isSelected
                                    ? "bg-primary/5"
                                    : "hover:bg-muted/50",
                                  "cursor-pointer",
                                )}
                                onMouseDown={(e) =>
                                  handleRowMouseDown(line, e)
                                }
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
                                      onCheckedChange={() => toggleLine(line)}
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
                                <td className="text-muted-foreground px-3 py-2 text-[10px]">
                                  {line.Applies_toDocType || "—"}
                                </td>
                                <td className="text-primary px-3 py-2 text-xs font-medium tabular-nums">
                                  {line.Applies_toDocNo}
                                </td>
                                <td className="text-muted-foreground px-3 py-2 text-center text-[10px] tabular-nums">
                                  {line.Applies_toDocLineNo}
                                </td>
                                <td className="px-3 py-2 text-xs tabular-nums">
                                  {line.ItemNo}
                                </td>
                                <td className="max-w-50 truncate px-3 py-2 text-left text-[10px]">
                                  {line.Description}
                                </td>
                                <td
                                  className="p-0 align-middle"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
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
                                <td
                                  className="p-0 align-middle"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
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
                                <td className="px-3 py-2 text-right text-[11px] tabular-nums">
                                  {line.QtyAssigned}
                                </td>
                                <td
                                  className="p-0 align-middle"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
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
                                <td
                                  className="p-0 align-middle"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
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
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan={11} className="py-2 text-center">
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

                {/* Status bar */}
                <div className="flex shrink-0 items-center justify-between border-t px-4 py-2">
                  <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    {lines.length} Record{lines.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedLines.size > 0 && (
                      <span className="text-primary text-[10px] font-bold">
                        {selectedLines.size} selected
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-destructive/40 px-3 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmBulk(true)}
                      disabled={selectedLines.size === 0 || loading}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete Selected ({selectedLines.size})
                    </Button>
                  </div>
                </div>

                {/* Totals */}
                {!loading && lines.length > 0 && (
                  <div className="shrink-0 overflow-x-auto border-t bg-muted/10 px-4 py-2">
                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-muted-foreground">
                          Total Qty to Assign:
                        </span>
                        <span
                          className={cn(
                            "ml-2 font-bold tabular-nums",
                            totals.remQty !== 0
                              ? "text-destructive"
                              : "text-green-600",
                          )}
                        >
                          {totals.toAssignQty} / {totalQuantity} (rem:{" "}
                          {totals.remQty})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Total Amt to Assign:
                        </span>
                        <span
                          className={cn(
                            "ml-2 font-bold tabular-nums",
                            totals.remAmt !== 0
                              ? "text-destructive"
                              : "text-green-600",
                          )}
                        >
                          {totals.toAssignAmt.toFixed(2)} / {totalAmount.toFixed(2)} (rem:{" "}
                          {totals.remAmt.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-4 py-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Source line selection dialog */}
      <Dialog open={selectionOpen} onOpenChange={setSelectionOpen}>
        <DialogContent className="flex h-[80vh] w-[80vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[80vw]">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-sm font-bold">
              Select {selectionTypeLabel[selectionType]}
            </DialogTitle>
            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                placeholder="Search..."
                value={selectionSearch}
                onChange={(e) => setSelectionSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectionLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-muted z-10">
                  <tr>
                    <th className="w-10 px-3 py-2 text-center">
                      <Checkbox
                        checked={
                          selectionLines.length > 0 &&
                          selectionSelected.size === selectionLines.length
                        }
                        onCheckedChange={(c) =>
                          setSelectionSelected(
                            c
                              ? new Set(selectionLines.map((l) => l.Line_No))
                              : new Set(),
                          )
                        }
                      />
                    </th>
                    {["Document No.", "Line No.", "Description", "Quantity", "Posting Date"].map((h) => (
                      <th key={h} className="text-primary px-3 py-2 text-left text-[10px] font-bold tracking-wider uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectionLines
                    .filter((l) => {
                      if (!selectionSearch) return true;
                      const q = selectionSearch.toLowerCase();
                      return (
                        l.Document_No.toLowerCase().includes(q) ||
                        l.Description.toLowerCase().includes(q)
                      );
                    })
                    .map((line) => (
                      <tr
                        key={line.Line_No}
                        className={cn(
                          "cursor-pointer border-b transition-colors",
                          selectionSelected.has(line.Line_No)
                            ? "bg-primary/5"
                            : "hover:bg-muted/50",
                        )}
                        onClick={() =>
                          setSelectionSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(line.Line_No)) next.delete(line.Line_No);
                            else next.add(line.Line_No);
                            return next;
                          })
                        }
                      >
                        <td
                          className="px-3 py-2 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectionSelected.has(line.Line_No)}
                            onCheckedChange={() =>
                              setSelectionSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(line.Line_No))
                                  next.delete(line.Line_No);
                                else next.add(line.Line_No);
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-xs font-medium">
                          {line.Document_No}
                        </td>
                        <td className="px-3 py-2 text-center text-xs tabular-nums">
                          {line.Line_No}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {line.Description}
                        </td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums">
                          {line.Quantity}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {line.Posting_Date}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter className="border-t px-4 py-2">
            <Button variant="outline" onClick={() => setSelectionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={selectionSelected.size === 0}
            >
              Add {selectionSelected.size} Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggest dialog */}
      <Dialog open={isSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="text-primary h-4 w-4 fill-current" /> Suggest
              Assignment
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {[
              { id: "Equally", icon: Equal, desc: "Divide uniformly" },
              { id: "By Amount", icon: Coins, desc: "Proportional to values" },
              { id: "By Weight", icon: Scale, desc: "Based on gross weights" },
              { id: "By Volume", icon: Package, desc: "Based on unit volumes" },
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
                      "shrink-0 rounded-md p-1.5",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold tracking-wide uppercase">
                      {method.id}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {method.desc}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="text-primary ml-auto h-4 w-4 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSuggestDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSuggest(selectedSuggestMethod)}
              disabled={loading}
            >
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

      <AlertDialog
        open={!!deleteConfirmLine}
        onOpenChange={(o) => !o && setDeleteConfirmLine(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Delete assignment for{" "}
              <span className="text-foreground font-semibold">
                {deleteConfirmLine?.ItemNo}
              </span>{" "}
              from{" "}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
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
              This will permanently delete {selectedLines.size} assignment(s).
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete {selectedLines.size}
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
    </>
  );
}
