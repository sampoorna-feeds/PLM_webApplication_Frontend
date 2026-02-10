"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  assignItemTracking,
  getItemAvailabilityByLot,
  getItemTrackingLines,
  modifyItemTrackingLine,
  deleteItemTrackingLine,
  type ProductionOrderComponent,
  type ProductionOrderLine,
  type ProductionJournalEntry,
  type LotAvailability,
  type ItemTrackingLine,
} from "@/lib/api/services/production-orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "./api-error-dialog";

/** Union type for line, component, or journal entry */
type TrackingSource =
  | ProductionOrderLine
  | ProductionOrderComponent
  | ProductionJournalEntry
  | null;

/** Type guard to check if source is a component (has Prod_Order_Line_No and Quantity_per) */
function isComponent(
  source: TrackingSource,
): source is ProductionOrderComponent {
  return (
    source !== null &&
    "Prod_Order_Line_No" in source &&
    "Quantity_per" in source
  );
}

/** Type guard to check if source is a journal entry (has Item_No_ with underscore) */
function isJournalEntry(
  source: TrackingSource,
): source is ProductionJournalEntry {
  return source !== null && "Item_No_" in source && "Entry_Type" in source;
}

interface ItemTrackingDialogProps {
  /** Component for tracking assignment */
  component?: ProductionOrderComponent | null;
  /** Line for tracking assignment (alternative to component) */
  line?: ProductionOrderLine | null;
  /** Journal entry for tracking assignment (alternative to component/line) */
  journalEntry?: ProductionJournalEntry | null;
  /** Whether the item has tracking enabled */
  hasTracking?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  prodOrderNo: string;
}

export function ItemTrackingDialog({
  component,
  line,
  journalEntry,
  hasTracking = true,
  open,
  onOpenChange,
  onSave,
  prodOrderNo,
}: ItemTrackingDialogProps) {
  const [lotNo, setLotNo] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [availableLots, setAvailableLots] = useState<LotAvailability[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(false);
  const [trackingLines, setTrackingLines] = useState<ItemTrackingLine[]>([]);
  const [isLoadingTrackingLines, setIsLoadingTrackingLines] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  // Edit mode state
  const [editingLine, setEditingLine] = useState<ItemTrackingLine | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<ItemTrackingLine | null>(
    null,
  );

  // Determine the source (component, line, or journal entry)
  const source: TrackingSource = component || line || journalEntry || null;
  const isComponentSource = isComponent(source);
  const isJournalSource = isJournalEntry(source);

  // Helper to get item number from source (journal entries use Item_No_)
  const getItemNo = (src: TrackingSource): string => {
    if (!src) return "";
    if (isJournalEntry(src)) return src.Item_No_ || "";
    return src.Item_No || "";
  };

  // Helper to get location code from source
  const getLocationCode = (src: TrackingSource): string | undefined => {
    if (!src) return undefined;
    if (isJournalEntry(src)) return src.Location_Code || undefined;
    return (
      (src as ProductionOrderLine | ProductionOrderComponent).Location_Code ||
      undefined
    );
  };

  // Fetch available lots and tracking lines when dialog opens
  useEffect(() => {
    if (open && source) {
      const fetchLots = async () => {
        setIsLoadingLots(true);
        try {
          const lots = await getItemAvailabilityByLot(
            getItemNo(source),
            getLocationCode(source),
          );
          setAvailableLots(lots);
        } catch (error) {
          console.error("Error fetching available lots:", error);
          const { message, code } = extractApiError(error);
          setApiError({ title: "Load Lots Failed", message, code });
        } finally {
          setIsLoadingLots(false);
        }
      };

      const fetchTrackingLines = async () => {
        setIsLoadingTrackingLines(true);
        try {
          let filter = `Source_ID eq '${prodOrderNo}' and Source_Ref_No_ eq ${(source as ProductionOrderComponent).Line_No}`;

          const lines = await getItemTrackingLines({ customFilter: filter });
          setTrackingLines(lines);
        } catch (error) {
          console.error("Error fetching tracking lines:", error);
          // Don't show error dialog for tracking lines, just log it
        } finally {
          setIsLoadingTrackingLines(false);
        }
      };

      fetchLots();
      fetchTrackingLines();
    } else {
      setAvailableLots([]);
      setTrackingLines([]);
      setLotNo("");
      setExpirationDate("");
      setQuantity("");
      setEditingLine(null);
      setIsDeleting(null);
    }
  }, [open, source, prodOrderNo]);

  const handleLotSelect = (lot: LotAvailability) => {
    setLotNo(lot.LotNo);
    // Format date for input type="date" (YYYY-MM-DD)
    const expDate = lot.Expiration_Date?.split("T")[0] || "";
    setExpirationDate(expDate);
    // Auto-suggest remaining quantity or available qty (whichever is smaller)
    // Journal entries use Quantity, lines/components use Remaining_Quantity
    const sourceRemainingQty = source
      ? isJournalEntry(source)
        ? source.Quantity || 0
        : (source as ProductionOrderLine | ProductionOrderComponent)
            .Remaining_Quantity || 0
      : 0;
    const suggestedQty = Math.min(lot.RemainingQty || 0, sourceRemainingQty);
    setQuantity(suggestedQty.toString());
  };

  const handleSave = async () => {
    if (!source) return;

    // Parse quantity
    const quantityValue = parseFloat(quantity) || 0;

    // Validation
    if (!lotNo.trim()) {
      toast.error("Lot No. is required");
      return;
    }

    if (!quantityValue || quantityValue <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    // If editing, handle modification
    if (editingLine) {
      setIsSaving(true);
      try {
        await modifyItemTrackingLine({
          entryNo: editingLine.Entry_No,
          positive: editingLine.Positive,
          quantityBase: -Math.abs(quantityValue),
          qtyToHandlBase: -Math.abs(quantityValue),
          lotNo: lotNo.trim(),
          expirationDate: expirationDate || undefined,
        });

        toast.success("Item tracking updated successfully");
        onSave();

        // Refresh tracking lines
        try {
          let filter = `Source_ID eq '${prodOrderNo}'`;
          if (isComponentSource && source) {
            filter += ` and Source_Ref_No_ eq ${(source as ProductionOrderComponent).Line_No}`;
          } else if (isJournalSource || !source) {
            filter += ` and Source_Ref_No_ eq 0`;
          }
          const lines = await getItemTrackingLines({ customFilter: filter });
          setTrackingLines(lines);
        } catch (error) {
          console.error("Error refreshing tracking lines:", error);
        }

        // Reset form
        setLotNo("");
        setExpirationDate("");
        setQuantity("");
        setEditingLine(null);
      } catch (error) {
        console.error("Error updating item tracking:", error);
        const { message, code } = extractApiError(error);
        setApiError({ title: "Update Failed", message, code });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Validate against remaining quantity (only for new assignments)
    // Journal entries use Quantity, lines/components use Remaining_Quantity
    const remainingQty = isJournalSource
      ? (source as ProductionJournalEntry).Quantity || 0
      : (source as ProductionOrderLine | ProductionOrderComponent)
          .Remaining_Quantity || 0;
    if (quantityValue > remainingQty && remainingQty > 0) {
      toast.error(
        `Quantity cannot exceed remaining quantity (${remainingQty})`,
      );
      return;
    }

    setIsSaving(true);
    try {
      // Determine tracking parameters based on source type
      let trackingType: "line" | "component" | "journal";
      let sourceProdOrderLine: number;
      let sourcerefNo: number;
      let sourceID: string;

      if (isComponentSource) {
        // Component: use Prod_Order_Line_No and component Line_No
        trackingType = "component";
        sourceProdOrderLine = (source as ProductionOrderComponent)
          .Prod_Order_Line_No;
        sourcerefNo = (source as ProductionOrderComponent).Line_No;
        sourceID = prodOrderNo; // Production order number for components
      } else if (isJournalSource) {
        // Journal entry: use journal Line_No, sourcerefNo is 0, sourceID is template name
        trackingType = "journal";
        sourceProdOrderLine = (source as ProductionJournalEntry).Line_No;
        sourcerefNo = 0;
        sourceID = "PROD.ORDEA"; // Journal template name for journals
      } else {
        // Production order line: use Line_No, sourcerefNo is 0
        trackingType = "line";
        sourceProdOrderLine = (source as ProductionOrderLine).Line_No;
        sourcerefNo = 0;
        sourceID = prodOrderNo; // Production order number for lines
      }

      await assignItemTracking({
        itemNo: getItemNo(source),
        locationCode: getLocationCode(source) || "",
        quantity: -Math.abs(quantityValue), // Send as negative number
        sourceProdOrderLine: sourceProdOrderLine,
        sourceID: sourceID,
        sourcerefNo: sourcerefNo,
        lotNo: lotNo.trim(),
        expirationDate: expirationDate || undefined,
        trackingType: trackingType,
      });

      toast.success("Item tracking assigned successfully");
      onSave();

      // Refresh tracking lines after assignment
      try {
        let filter = `Source_ID eq '${prodOrderNo}'`;
        if (isComponentSource && source) {
          filter += ` and Source_Ref_No_ eq ${(source as ProductionOrderComponent).Line_No}`;
        } else if (isJournalSource || !source) {
          filter += ` and Source_Ref_No_ eq 0`;
        }
        const lines = await getItemTrackingLines({ customFilter: filter });
        setTrackingLines(lines);
      } catch (error) {
        console.error("Error refreshing tracking lines:", error);
      }

      // Reset form
      setLotNo("");
      setExpirationDate("");
      setQuantity("");
    } catch (error) {
      console.error("Error assigning item tracking:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Tracking Failed", message, code });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditLine = (line: ItemTrackingLine) => {
    setEditingLine(line);
    setLotNo(line.Lot_No || "");
    setExpirationDate(line.Expiration_Date?.split("T")[0] || "");
    // Convert negative quantity to positive for display
    setQuantity(Math.abs(line.Quantity_Base || 0).toString());
  };

  const handleCancelEdit = () => {
    setEditingLine(null);
    setLotNo("");
    setExpirationDate("");
    setQuantity("");
  };

  const handleDeleteLine = (line: ItemTrackingLine) => {
    setLineToDelete(line);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!lineToDelete) return;

    setIsDeleting(lineToDelete.Entry_No);
    setDeleteConfirmOpen(false);

    try {
      await deleteItemTrackingLine(lineToDelete);
      toast.success("Item tracking deleted successfully");
      onSave();

      // Refresh tracking lines
      try {
        let filter = `Source_ID eq '${prodOrderNo}'`;
        if (isComponentSource && source) {
          filter += ` and Source_Ref_No_ eq ${(source as ProductionOrderComponent).Line_No}`;
        } else if (isJournalSource || !source) {
          filter += ` and Source_Ref_No_ eq 0`;
        }
        const lines = await getItemTrackingLines({ customFilter: filter });
        setTrackingLines(lines);
      } catch (error) {
        console.error("Error refreshing tracking lines:", error);
      }
    } catch (error) {
      console.error("Error deleting item tracking:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Delete Failed", message, code });
    } finally {
      setIsDeleting(null);
      setLineToDelete(null);
    }
  };

  if (!source) return null;

  // Get source type label for title
  const getSourceTypeLabel = () => {
    if (isComponentSource) return "(Component)";
    if (isJournalSource) return "(Journal)";
    return "(Line)";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-[95vw] flex-col gap-0 p-0 sm:max-w-[85vw] md:max-w-4xl lg:max-w-6xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6 md:px-8">
            <DialogTitle className="text-lg">
              {editingLine
                ? `Edit Item Tracking ${getSourceTypeLabel()}`
                : `Assign Item Tracking ${getSourceTypeLabel()}`}
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-8">
            {!hasTracking && (
              <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <p className="font-medium">Item Tracking Not Available</p>
                <p className="mt-1 text-xs">
                  This item does not have item tracking enabled. Tracking codes
                  such as lot numbers or serial numbers cannot be assigned.
                </p>
              </div>
            )}

            {hasTracking && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
                {/* Left Side: Available Lots */}
                <div className="flex h-100 flex-col overflow-hidden rounded-md border">
                  <div className="bg-muted border-b px-4 py-3 font-medium">
                    Available Lots
                  </div>
                  <div className="flex-1 overflow-auto">
                    {isLoadingLots ? (
                      <div className="flex h-40 flex-col items-center justify-center gap-2">
                        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                        <p className="text-muted-foreground text-sm">
                          Loading lots...
                        </p>
                      </div>
                    ) : availableLots.length === 0 ? (
                      <div className="text-muted-foreground flex h-40 items-center justify-center p-4 text-center text-sm">
                        No available lots found for this item and location.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8">Lot No.</TableHead>
                            <TableHead className="h-8 text-right">
                              Qty
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableLots.map((lot, index) => (
                            <TableRow
                              key={`${lot.LotNo}-${index}`}
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleLotSelect(lot)}
                            >
                              <TableCell className="py-2 font-medium">
                                {lot.LotNo}
                                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                  <Calendar className="h-3 w-3" />
                                  {lot.Expiration_Date
                                    ? lot.Expiration_Date.split("T")[0]
                                    : "-"}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                {(lot.RemainingQty || 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>

                {/* Right Side: Assignment Form */}
                <div className="space-y-4">
                  {editingLine && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      <p className="font-medium">Editing Tracking Line</p>
                      <p className="mt-1 text-xs">
                        Modifying Entry #{editingLine.Entry_No}. Click
                        &quot;Cancel Edit&quot; to create a new tracking line
                        instead.
                      </p>
                    </div>
                  )}

                  {/* Source Info */}
                  <div className="bg-muted/50 space-y-2 rounded-md p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">
                        {isComponentSource
                          ? "Component"
                          : isJournalSource
                            ? "Journal"
                            : "Line"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item No:</span>
                      <span className="font-medium">{getItemNo(source)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">
                        {getLocationCode(source) || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="lotNo" className="text-sm">
                        Lot No.
                      </Label>
                      <Input
                        id="lotNo"
                        value={lotNo}
                        onChange={(e) => setLotNo(e.target.value)}
                        placeholder="Select or enter lot no"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="expirationDate" className="text-sm">
                        Expiration Date
                      </Label>
                      <Input
                        id="expirationDate"
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="quantity" className="text-sm">
                        Quantity to Assign
                      </Label>
                      <Input
                        id="quantity"
                        type="text"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            setQuantity(val);
                          }
                        }}
                        placeholder="Enter quantity"
                      />
                      <p className="text-muted-foreground mt-1 text-right text-xs">
                        Remaining:{" "}
                        {(isJournalSource
                          ? (source as ProductionJournalEntry).Quantity
                          : (
                              source as
                                | ProductionOrderLine
                                | ProductionOrderComponent
                            ).Remaining_Quantity
                        )?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Separator and Item Tracking Lines Section */}
            {hasTracking && (
              <>
                <div className="my-6 border-t" />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">
                    Existing Item Tracking Lines
                  </h3>
                  <div className="max-h-60 overflow-auto rounded-md border">
                    {isLoadingTrackingLines ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                        <span className="text-muted-foreground ml-2 text-sm">
                          Loading tracking lines...
                        </span>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8">Item No.</TableHead>
                            <TableHead className="h-8">Lot No.</TableHead>
                            <TableHead className="h-8">Location</TableHead>
                            <TableHead className="h-8 text-right">
                              Quantity
                            </TableHead>
                            <TableHead className="h-8 text-right">
                              Qty to Handle
                            </TableHead>
                            <TableHead className="h-8">Expiration</TableHead>
                            <TableHead className="h-8 text-center">
                              Type
                            </TableHead>
                            <TableHead className="h-8 text-center">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trackingLines.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                className="h-24 text-center"
                              >
                                <div className="text-muted-foreground flex flex-col items-center justify-center gap-1">
                                  <p className="text-sm">
                                    No tracking lines assigned yet
                                  </p>
                                  <p className="text-xs">
                                    Assign a lot number above to create tracking
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            trackingLines.map((line, index) => (
                              <TableRow
                                key={`${line.Entry_No}-${index}`}
                                className={
                                  editingLine?.Entry_No === line.Entry_No
                                    ? "bg-blue-100/50"
                                    : ""
                                }
                              >
                                <TableCell className="py-2 font-medium">
                                  {line.Item_No || "-"}
                                </TableCell>
                                <TableCell className="py-2">
                                  {line.Lot_No || "-"}
                                </TableCell>
                                <TableCell className="py-2">
                                  {line.Location_Code || "-"}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  {line.Quantity_Base?.toLocaleString() ?? "-"}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  {line.Qty_to_Handl_Base?.toLocaleString() ??
                                    "-"}
                                </TableCell>
                                <TableCell className="py-2">
                                  {line.Expiration_Date
                                    ? line.Expiration_Date.split("T")[0]
                                    : "-"}
                                </TableCell>
                                <TableCell className="py-2 text-center">
                                  <span className="text-xs">
                                    {line.Source_Type === 5407
                                      ? "Component"
                                      : line.Source_Type === 5406
                                        ? "Line"
                                        : "-"}
                                  </span>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleEditLine(line)}
                                      disabled={!!editingLine}
                                      title="Edit tracking line"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                      onClick={() => handleDeleteLine(line)}
                                      disabled={isDeleting === line.Entry_No}
                                      title="Delete tracking line"
                                    >
                                      {isDeleting === line.Entry_No ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="border-t px-4 py-4 sm:px-6 md:px-8">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {hasTracking && editingLine && (
              <Button variant="destructive" onClick={handleCancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancel Edit
              </Button>
            )}
            {hasTracking && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLine ? "Update" : "Assign"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item Tracking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tracking line? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="destructive">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
