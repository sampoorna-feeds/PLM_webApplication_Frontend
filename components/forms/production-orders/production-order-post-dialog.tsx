"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, FileText, Send, XIcon } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getProductionJournal,
  deleteProdJnlLines,
  createProductionJournal,
  postProductionOrder,
  type ProductionJournalEntry,
} from "@/lib/api/services/production-orders.service";
import { ItemTrackingDialog } from "./item-tracking-dialog";
import { useItemTracking } from "./use-item-tracking";
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

export function ProductionOrderPostSheet({
  prodOrderNo,
  prodOrderLineNo = 10000,
  userId,
}: ProductionOrderPostSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [journalEntries, setJournalEntries] = useState<
    ProductionJournalEntry[]
  >([]);

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

  // Fetch journal entries
  const fetchJournalEntries = useCallback(async () => {
    if (!prodOrderNo) return;

    setIsLoading(true);
    try {
      const entries = await getProductionJournal(prodOrderNo);
      setJournalEntries(entries);
      if (entries.length === 0) {
        toast.info("No journal entries found for this production order");
      }
    } catch (error) {
      console.error("Error fetching production journal:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Load Journal Failed", message, code });
      setJournalEntries([]);
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
      // Close the sheet
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting journal lines:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Delete Failed", message, code });
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

  // Handle post production order journal
  const handlePostOrderJn = async () => {
    if (!prodOrderNo) return;

    setIsPosting(true);
    try {
      await postProductionOrder(prodOrderNo);
      toast.success("Production order journal posted successfully");
      // Refresh the entries list
      await fetchJournalEntries();
    } catch (error) {
      console.error("Error posting production order:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Post Failed", message, code });
    } finally {
      setIsPosting(false);
    }
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
                  disabled={isPosting || isLoading}
                >
                  {isPosting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
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

          <div className="flex-1 overflow-auto px-6 py-4">
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntries.map((entry, index) => {
                      // Check if this item has a tracking code
                      const itemKey = entry.Item_No_
                        ? entry.Item_No_.trim().toLowerCase()
                        : "";
                      const hasTracking = trackingMap[itemKey] || false;

                      return (
                        <TableRow
                          key={`${entry.Line_No}-${index}`}
                          className={cn(
                            hasTracking && "text-red-600",
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
                          <TableCell className="text-right">
                            {entry.Quantity?.toLocaleString() ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.Output_Quantity?.toLocaleString() ?? "-"}
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

      {/* Item Tracking Dialog for Journal Entries */}
      <ItemTrackingDialog
        journalEntry={selectedEntry}
        hasTracking={selectedEntryHasTracking}
        open={isTrackingDialogOpen}
        onOpenChange={setIsTrackingDialogOpen}
        onSave={() => {
          // Refresh entries after tracking assignment
          fetchJournalEntries();
        }}
        prodOrderNo={prodOrderNo}
      />

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}

// Re-export as ProductionOrderPostDialog for backward compatibility
export { ProductionOrderPostSheet as ProductionOrderPostDialog };
