"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  assignItemTracking,
  getItemAvailabilityByLot,
  getItemTrackingLines,
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

  // Helper to get location code from source (journal entries don't have location)
  const getLocationCode = (src: TrackingSource): string | undefined => {
    if (!src) return undefined;
    if (isJournalEntry(src)) return undefined;
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
          const lines = await getItemTrackingLines(prodOrderNo);
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

    // Validate against remaining quantity
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
      // Journal entries use same sourceType as lines (5406)
      const trackingType = isComponentSource ? "component" : "line";

      let sourceProdOrderLine: number;
      let sourcerefNo: number;

      if (isComponentSource) {
        // Component: use Prod_Order_Line_No and component Line_No
        sourceProdOrderLine = (source as ProductionOrderComponent)
          .Prod_Order_Line_No;
        sourcerefNo = (source as ProductionOrderComponent).Line_No;
      } else if (isJournalSource) {
        // Journal entry: use journal Line_No, sourcerefNo is 0
        sourceProdOrderLine = (source as ProductionJournalEntry).Line_No;
        sourcerefNo = 0;
      } else {
        // Production order line: use Line_No, sourcerefNo is 0
        sourceProdOrderLine = (source as ProductionOrderLine).Line_No;
        sourcerefNo = 0;
      }

      await assignItemTracking({
        itemNo: getItemNo(source),
        locationCode: getLocationCode(source) || "",
        quantity: quantityValue,
        sourceProdOrderLine: sourceProdOrderLine,
        sourceID: prodOrderNo,
        sourcerefNo: sourcerefNo,
        lotNo: lotNo.trim(),
        expirationDate: expirationDate || undefined,
        trackingType: trackingType,
      });

      toast.success("Item tracking assigned successfully");
      onSave();

      // Refresh tracking lines after assignment
      try {
        const lines = await getItemTrackingLines(prodOrderNo);
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
        <DialogContent className="flex max-h-[90vh] max-w-[95vw] flex-col p-4 sm:max-w-[85vw] sm:p-6 md:max-w-4xl md:p-8 lg:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Assign Item Tracking {getSourceTypeLabel()}
            </DialogTitle>
          </DialogHeader>

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
            <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden py-3 md:grid-cols-2 md:gap-8 md:py-5">
              {/* Left Side: Available Lots */}
              <div className="flex h-full flex-col overflow-hidden rounded-md border">
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
                          <TableHead className="h-8 text-right">Qty</TableHead>
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

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {hasTracking ? "Cancel" : "Close"}
            </Button>
            {hasTracking && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign
              </Button>
            )}
          </DialogFooter>

          {/* Separator and Item Tracking Lines Section */}
          {trackingLines.length > 0 && (
            <>
              <div className="my-4 border-t" />
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trackingLines.map((line, index) => (
                          <TableRow key={`${line.Entry_No}-${index}`}>
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
                              {line.Qty_to_Handl_Base?.toLocaleString() ?? "-"}
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
