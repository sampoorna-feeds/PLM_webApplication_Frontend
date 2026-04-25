"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, FileText, Send, Trash2, XIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createProductionJournal,
  deleteProdJnlLines,
  deleteProductionJournalEntry,
  getProductionJournal,
  type ProductionJournalEntry,
  updateProductionJournalEntry,
} from "@/lib/api/services/production-orders.service";
import { ItemTrackingDialog } from "./item-tracking-dialog";
import { ProductionOrderPostConfirmationDialog } from "./production-order-post-confirmation-dialog";
import { useItemTracking } from "./use-item-tracking";
import { useAssignedTracking } from "./use-assigned-tracking";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "./api-error-dialog";
import { cn } from "@/lib/utils";

interface ProductionOrderPostSheetProps {
  prodOrderNo: string;
  prodOrderLineNo?: number;
  userId: string;
}

type JournalEditableField = "Quantity" | "Output_Quantity";
type JournalRowDraftValues = Record<JournalEditableField, string>;
type JournalRowChanges = Partial<Record<JournalEditableField, number>>;

function parseJournalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProductionOrderPostSheet({
  prodOrderNo,
  prodOrderLineNo = 10000,
  userId,
}: ProductionOrderPostSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [journalEntries, setJournalEntries] = useState<
    ProductionJournalEntry[]
  >([]);
  const [rowDrafts, setRowDrafts] = useState<
    Record<number, JournalRowDraftValues>
  >({});
  const [rowChanges, setRowChanges] = useState<
    Record<number, JournalRowChanges>
  >({});
  const [savingLineNo, setSavingLineNo] = useState<number | null>(null);
  const [deletingLineNo, setDeletingLineNo] = useState<number | null>(null);
  const [entryToDelete, setEntryToDelete] =
    useState<ProductionJournalEntry | null>(null);
  const pendingDebounceRef = useRef<
    Record<number, ReturnType<typeof setTimeout>>
  >({});

  // Post confirmation dialog state
  const [isPostConfirmationOpen, setIsPostConfirmationOpen] = useState(false);

  // Item tracking state
  const [selectedEntry, setSelectedEntry] =
    useState<ProductionJournalEntry | null>(null);
  const [selectedEntryHasTracking, setSelectedEntryHasTracking] =
    useState(false);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  // Fetch item tracking info for all journal entries
  // Note: Journal entries use Item_No_ field, need to map it to Item_No for the hook
  const journalEntriesWithItemNo = journalEntries.map((entry) => ({
    ...entry,
    Item_No: entry.Item_No_,
  }));
  const { trackingMap } = useItemTracking(journalEntriesWithItemNo);
  const { assignedMap, refresh: refreshAssignedTracking } = useAssignedTracking(
    {
      sourceType: 83,
      sourceId: "PROD.ORDEA",
      sourceBatchName: userId,
      enabled: journalEntries.length > 0,
    },
  );

  const getEntryNumericValue = useCallback(
    (entry: ProductionJournalEntry, field: JournalEditableField): number => {
      if (field === "Quantity") {
        return Number(entry.Quantity ?? 0);
      }

      return Number(entry.Output_Quantity ?? 0);
    },
    [],
  );

  const getEntryKeys = useCallback((entry: ProductionJournalEntry) => {
    const templateName =
      typeof entry.Journal_Template_Name === "string"
        ? entry.Journal_Template_Name.trim()
        : "";
    const batchName =
      typeof entry.Journal_Batch_Name === "string"
        ? entry.Journal_Batch_Name.trim()
        : "";

    if (!templateName || !batchName) {
      return null;
    }

    return {
      Journal_Template_Name: templateName,
      Journal_Batch_Name: batchName,
      Line_No: entry.Line_No,
    };
  }, []);

  const clearRowEditState = useCallback((lineNo: number) => {
    const pendingTimeout = pendingDebounceRef.current[lineNo];
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      delete pendingDebounceRef.current[lineNo];
    }

    setRowDrafts((prev) => {
      if (!(lineNo in prev)) return prev;
      const next = { ...prev };
      delete next[lineNo];
      return next;
    });

    setRowChanges((prev) => {
      if (!(lineNo in prev)) return prev;
      const next = { ...prev };
      delete next[lineNo];
      return next;
    });
  }, []);

  const handleEditableValueChange = useCallback(
    (
      entry: ProductionJournalEntry,
      field: JournalEditableField,
      rawValue: string,
    ) => {
      setRowDrafts((prev) => {
        const existing = prev[entry.Line_No] ?? {
          Quantity: String(entry.Quantity ?? ""),
          Output_Quantity: String(entry.Output_Quantity ?? ""),
        };

        return {
          ...prev,
          [entry.Line_No]: {
            ...existing,
            [field]: rawValue,
          },
        };
      });

      const parsed = parseJournalNumber(rawValue);
      const originalValue = getEntryNumericValue(entry, field);

      setRowChanges((prev) => {
        const current = prev[entry.Line_No] ?? {};
        const next = { ...current };

        if (parsed === null || parsed === originalValue) {
          delete next[field];
        } else {
          next[field] = parsed;
        }

        if (Object.keys(next).length === 0) {
          if (!(entry.Line_No in prev)) {
            return prev;
          }

          const withoutLine = { ...prev };
          delete withoutLine[entry.Line_No];
          return withoutLine;
        }

        return {
          ...prev,
          [entry.Line_No]: next,
        };
      });
    },
    [getEntryNumericValue],
  );

  const runAutoPatchForLine = useCallback(
    async (lineNo: number) => {
      const entry = journalEntries.find((line) => line.Line_No === lineNo);
      const lineChanges = rowChanges[lineNo];

      if (!entry || !lineChanges || Object.keys(lineChanges).length === 0) {
        return;
      }

      const keys = getEntryKeys(entry);
      if (!keys) {
        setApiError({
          title: "Update Failed",
          message:
            "Journal line keys are missing. Refresh the journal and try again.",
        });
        return;
      }

      setSavingLineNo(lineNo);
      try {
        await updateProductionJournalEntry(keys, lineChanges);

        setJournalEntries((prev) =>
          prev.map((line) =>
            line.Line_No === lineNo
              ? {
                  ...line,
                  ...lineChanges,
                }
              : line,
          ),
        );

        clearRowEditState(lineNo);
      } catch (error) {
        console.error("Error updating journal line:", error);
        const { message, code } = extractApiError(error);
        setApiError({ title: "Update Failed", message, code });
      } finally {
        setSavingLineNo((current) => (current === lineNo ? null : current));
      }
    },
    [clearRowEditState, getEntryKeys, journalEntries, rowChanges],
  );

  useEffect(() => {
    for (const [lineNoKey, timeout] of Object.entries(
      pendingDebounceRef.current,
    )) {
      const lineNo = Number(lineNoKey);
      if (!rowChanges[lineNo]) {
        clearTimeout(timeout);
        delete pendingDebounceRef.current[lineNo];
      }
    }

    for (const lineNoKey of Object.keys(rowChanges)) {
      const lineNo = Number(lineNoKey);
      const previousTimeout = pendingDebounceRef.current[lineNo];
      if (previousTimeout) {
        clearTimeout(previousTimeout);
      }

      pendingDebounceRef.current[lineNo] = setTimeout(() => {
        delete pendingDebounceRef.current[lineNo];
        void runAutoPatchForLine(lineNo);
      }, 750);
    }
  }, [rowChanges, runAutoPatchForLine]);

  useEffect(() => {
    return () => {
      for (const timeout of Object.values(pendingDebounceRef.current)) {
        clearTimeout(timeout);
      }
      pendingDebounceRef.current = {};
    };
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!entryToDelete) return;

    const keys = getEntryKeys(entryToDelete);
    if (!keys) {
      setApiError({
        title: "Delete Failed",
        message:
          "Journal line keys are missing. Refresh the journal and try again.",
      });
      setEntryToDelete(null);
      return;
    }

    setDeletingLineNo(entryToDelete.Line_No);
    try {
      await deleteProductionJournalEntry(keys);
      setJournalEntries((prev) =>
        prev.filter((line) => line.Line_No !== entryToDelete.Line_No),
      );
      clearRowEditState(entryToDelete.Line_No);
      setEntryToDelete(null);
      toast.success(`Line ${entryToDelete.Line_No} deleted`);
    } catch (error) {
      console.error("Error deleting journal line:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Delete Failed", message, code });
    } finally {
      setDeletingLineNo(null);
    }
  }, [clearRowEditState, entryToDelete, getEntryKeys]);

  // Fetch journal entries
  const fetchJournalEntries = useCallback(async () => {
    if (!prodOrderNo) return;

    setIsLoading(true);
    try {
      const entries = await getProductionJournal(prodOrderNo);
      setJournalEntries(entries);
      setRowDrafts({});
      setRowChanges({});
      setEntryToDelete(null);
      if (entries.length === 0) {
        toast.info("No journal entries found for this production order");
      }
    } catch (error) {
      console.error("Error fetching production journal:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Load Journal Failed", message, code });
      setJournalEntries([]);
      setRowDrafts({});
      setRowChanges({});
      setEntryToDelete(null);
    } finally {
      setIsLoading(false);
    }
  }, [prodOrderNo]);

  // Handle sheet open - create journal entries
  const handleSheetOpen = useCallback(async () => {
    if (!prodOrderNo || !userId) return;

    setIsCreating(true);
    try {
      // Create production journal entries
      await createProductionJournal(prodOrderNo, prodOrderLineNo, userId);
      // Fetch the created entries
      await fetchJournalEntries();
    } catch (error) {
      console.error("Error creating production journal:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Create Journal Failed", message, code });
    } finally {
      setIsCreating(false);
    }
  }, [prodOrderNo, prodOrderLineNo, userId, fetchJournalEntries]);

  // Handle sheet close - delete journal entries
  const handleSheetClose = useCallback(async () => {
    if (!prodOrderNo) {
      setIsOpen(false);
      return;
    }

    setIsClosing(true);
    try {
      // Delete all journal lines
      await deleteProdJnlLines(prodOrderNo, prodOrderLineNo.toString());
      setRowDrafts({});
      setRowChanges({});
      setEntryToDelete(null);
      // Close the sheet
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting journal lines:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Delete Failed", message, code });
      setRowDrafts({});
      setRowChanges({});
      setEntryToDelete(null);
      // Still close the sheet even if delete fails
      setIsOpen(false);
    } finally {
      setIsClosing(false);
    }
  }, [prodOrderNo, prodOrderLineNo]);

  // Create journal entries when sheet opens
  useEffect(() => {
    if (isOpen) {
      handleSheetOpen();
    }
  }, [isOpen, handleSheetOpen]);

  // Handle post production order journal - opens confirmation dialog
  const handlePostOrderJn = () => {
    if (!prodOrderNo) return;
    setIsPostConfirmationOpen(true);
  };

  // Handle successful post from confirmation dialog
  const handlePostSuccess = async () => {
    // Refresh the entries list
    await fetchJournalEntries();
  };

  // Handle row click to open item tracking
  const handleRowClick = (
    entry: ProductionJournalEntry,
    hasTracking: boolean,
  ) => {
    // Only open dialog if item has tracking
    if (!hasTracking) {
      toast.info("Item tracking not available for this item");
      return;
    }

    setSelectedEntry(entry);
    setSelectedEntryHasTracking(hasTracking);
    setIsTrackingDialogOpen(true);
  };

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Intercept close to delete journal entries first
            handleSheetClose();
          } else {
            setIsOpen(open);
          }
        }}
      >
        <SheetTrigger asChild>
          <Button variant="default" size="sm" data-post-order-trigger>
            <FileText className="mr-2 h-4 w-4" />
            Post Order
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-screen flex-col gap-0 p-0 md:w-[75vw] lg:w-[50vw]"
          showCloseButton={false}
        >
          <SheetHeader className="bg-background sticky top-0 z-10 flex flex-row items-center justify-between border-b px-6 py-4">
            <SheetTitle>Production Journal - {prodOrderNo}</SheetTitle>
            <div className="flex items-center gap-2">
              {journalEntries.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePostOrderJn}
                  disabled={isLoading}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Post Order Jn
                </Button>
              )}
              <SheetClose asChild>
                <Button variant="ghost" size="icon-sm">
                  <XIcon className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-hidden p-6 pt-4">
            {isCreating ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Creating journal entries...
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Loading journal entries...
                </p>
              </div>
            ) : journalEntries.length === 0 ? (
              <div className="text-muted-foreground flex items-center justify-center py-12">
                No journal entries found for this production order.
              </div>
            ) : (
              <div className="min-h-0 flex-1 rounded-md border **:data-[slot=table-container]:h-full **:data-[slot=table-container]:overflow-auto">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-30 rounded-t-md shadow-sm">
                    <TableRow className="[&>th:first-child]:rounded-tl-md [&>th:last-child]:rounded-tr-md">
                      <TableHead className="w-32">Entry Type</TableHead>
                      <TableHead>Item No.</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-32">Location Code</TableHead>
                      <TableHead className="w-32 text-right">
                        Quantity
                      </TableHead>
                      <TableHead className="w-32 text-right">
                        Output Qty
                      </TableHead>
                      <TableHead className="bg-muted sticky right-0 z-40 w-40 text-right shadow-[-8px_0_14px_-8px_rgba(0,0,0,0.24)]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntries.map((entry, index) => {
                      // Check if this item has a tracking code
                      const itemKey = entry.Item_No_
                        ? entry.Item_No_.trim().toLowerCase()
                        : "";
                      const hasTracking = trackingMap[itemKey] || false;
                      const isAssigned = assignedMap[entry.Line_No] || false;
                      const draftValues = rowDrafts[entry.Line_No];
                      const lineChanges = rowChanges[entry.Line_No];
                      const isLineBusy =
                        savingLineNo === entry.Line_No ||
                        deletingLineNo === entry.Line_No;
                      const quantityInputValue =
                        draftValues?.Quantity ?? String(entry.Quantity ?? "");
                      const outputQtyInputValue =
                        draftValues?.Output_Quantity ??
                        String(entry.Output_Quantity ?? "");

                      return (
                        <TableRow
                          key={`${entry.Line_No}-${index}`}
                          className={cn(
                            isAssigned
                              ? "text-green-600"
                              : hasTracking
                                ? "text-red-600"
                                : "",
                            "hover:bg-muted/50 cursor-pointer",
                          )}
                          onClick={() => handleRowClick(entry, hasTracking)}
                        >
                          <TableCell>{entry.Entry_Type}</TableCell>
                          <TableCell className="font-medium">
                            {entry.Item_No_ || "-"}
                          </TableCell>
                          <TableCell>{entry.Description || "-"}</TableCell>
                          <TableCell>{entry.Location_Code || "-"}</TableCell>
                          <TableCell
                            className="p-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={quantityInputValue}
                              onChange={(event) =>
                                handleEditableValueChange(
                                  entry,
                                  "Quantity",
                                  event.target.value,
                                )
                              }
                              disabled={isLineBusy}
                              className={cn(
                                "focus-visible:border-input focus-visible:bg-background h-8 border-transparent bg-transparent px-2 text-right text-xs tabular-nums shadow-none",
                                lineChanges?.Quantity !== undefined &&
                                  "border-amber-300 bg-amber-50/70 focus-visible:border-amber-400 dark:border-amber-500 dark:bg-amber-950/30",
                              )}
                            />
                          </TableCell>
                          <TableCell
                            className="p-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={outputQtyInputValue}
                              onChange={(event) =>
                                handleEditableValueChange(
                                  entry,
                                  "Output_Quantity",
                                  event.target.value,
                                )
                              }
                              disabled={isLineBusy}
                              className={cn(
                                "focus-visible:border-input focus-visible:bg-background h-8 border-transparent bg-transparent px-2 text-right text-xs tabular-nums shadow-none",
                                lineChanges?.Output_Quantity !== undefined &&
                                  "border-amber-300 bg-amber-50/70 focus-visible:border-amber-400 dark:border-amber-500 dark:bg-amber-950/30",
                              )}
                            />
                          </TableCell>
                          <TableCell
                            className="bg-background/95 sticky right-0 z-0 py-1 pr-2 text-right shadow-[-8px_0_14px_-8px_rgba(0,0,0,0.24)]"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {savingLineNo === entry.Line_No && (
                                <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
                              )}
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={isLineBusy}
                                onClick={() => setEntryToDelete(entry)}
                              >
                                {deletingLineNo === entry.Line_No ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                <span className="sr-only">Delete line</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!entryToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingLineNo) {
            setEntryToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Line</AlertDialogTitle>
            <AlertDialogDescription>
              Delete line {entryToDelete?.Line_No} for item{" "}
              {entryToDelete?.Item_No_ || "-"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingLineNo}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!!deletingLineNo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item Tracking Dialog for Journal Entries */}
      <ItemTrackingDialog
        journalEntry={selectedEntry}
        hasTracking={selectedEntryHasTracking}
        open={isTrackingDialogOpen}
        onOpenChange={(open) => {
          setIsTrackingDialogOpen(open);
          if (!open) {
            refreshAssignedTracking();
          }
        }}
        onSave={() => {
          // Refresh entries after tracking assignment
          fetchJournalEntries();
          refreshAssignedTracking();
        }}
        prodOrderNo={prodOrderNo}
        userId={userId}
      />

      <ProductionOrderPostConfirmationDialog
        open={isPostConfirmationOpen}
        onOpenChange={setIsPostConfirmationOpen}
        prodOrderNo={prodOrderNo}
        onSuccess={handlePostSuccess}
      />

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}

// Re-export as ProductionOrderPostDialog for backward compatibility
export { ProductionOrderPostSheet as ProductionOrderPostDialog };
