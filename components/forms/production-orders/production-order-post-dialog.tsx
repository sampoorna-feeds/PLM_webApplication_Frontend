"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  type ProductionJournalEntry,
} from "@/lib/api/services/production-orders.service";
import { getItemsByNos } from "@/lib/api/services/item.service";
import { ItemTrackingDialog } from "./item-tracking-dialog";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "./api-error-dialog";

interface ProductionOrderPostSheetProps {
  prodOrderNo: string;
}

export function ProductionOrderPostSheet({
  prodOrderNo,
}: ProductionOrderPostSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [journalEntries, setJournalEntries] = useState<
    ProductionJournalEntry[]
  >([]);

  // Item tracking state
  const [selectedEntry, setSelectedEntry] =
    useState<ProductionJournalEntry | null>(null);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [trackingMap, setTrackingMap] = useState<Record<string, boolean>>({});
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

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

  // Fetch journal entries when sheet opens
  useEffect(() => {
    if (isOpen) {
      fetchJournalEntries();
    }
  }, [isOpen, fetchJournalEntries]);

  // Fetch item tracking info when journal entries change
  useEffect(() => {
    if (journalEntries.length === 0) {
      setTrackingMap({});
      return;
    }

    const fetchItemTracking = async () => {
      try {
        const uniqueItemNos = [
          ...new Set(
            journalEntries.map((e) => e.Item_No_).filter(Boolean) as string[],
          ),
        ];
        if (uniqueItemNos.length === 0) {
          setTrackingMap({});
          return;
        }

        const items = await getItemsByNos(uniqueItemNos);
        const map: Record<string, boolean> = {};
        items.forEach((item) => {
          if (item.No) {
            // Key by Item_No_Location_Code for lookup
            const hasTracking = !!(
              item.Item_Tracking_Code && item.Item_Tracking_Code.trim()
            );
            map[item.No] = hasTracking;
          }
        });
        setTrackingMap(map);
      } catch (error) {
        console.error("Error fetching item tracking info:", error);
        setTrackingMap({});
      }
    };

    fetchItemTracking();
  }, [journalEntries]);

  // Handle delete all journal lines
  const handleDeleteJournalLines = async () => {
    if (!prodOrderNo) return;

    setIsDeleting(true);
    try {
      await deleteProdJnlLines(prodOrderNo);
      toast.success("Journal lines deleted successfully");
      // Refresh the entries list
      await fetchJournalEntries();
    } catch (error) {
      console.error("Error deleting journal lines:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Delete Failed", message, code });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle row click to open item tracking
  const handleRowClick = (entry: ProductionJournalEntry) => {
    // Only allow tracking for entries that have items with tracking codes
    const hasTracking = entry.Item_No_ && trackingMap[entry.Item_No_];
    if (hasTracking) {
      setSelectedEntry(entry);
      setIsTrackingDialogOpen(true);
    }
  };

  // Check if an entry has tracking
  const entryHasTracking = (entry: ProductionJournalEntry) => {
    return entry.Item_No_ && trackingMap[entry.Item_No_];
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="default" size="sm" data-post-order-trigger>
            <FileText className="mr-2 h-4 w-4" />
            Post Order
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-[50vw] max-w-[50vw] flex-col gap-0 p-0"
        >
          <SheetHeader className="bg-background sticky top-0 z-10 flex flex-row items-center justify-between border-b px-6 py-4">
            <SheetTitle>Production Journal - {prodOrderNo}</SheetTitle>
            {journalEntries.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting || isLoading}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete All Lines
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete All Journal Lines?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {journalEntries.length}{" "}
                      journal entries for production order {prodOrderNo}. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteJournalLines}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-auto px-6 py-4">
            {isLoading ? (
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
                      const hasTracking = entryHasTracking(entry);
                      return (
                        <TableRow
                          key={`${entry.Line_No}-${index}`}
                          className={
                            hasTracking
                              ? "cursor-pointer text-red-600 hover:bg-red-50"
                              : ""
                          }
                          onClick={() => handleRowClick(entry)}
                        >
                          <TableCell>{entry.Entry_Type}</TableCell>
                          <TableCell className="font-medium">
                            {entry.Item_No_ || "-"}
                          </TableCell>
                          <TableCell>{entry.Description || "-"}</TableCell>
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
