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
  type ProductionOrderComponent,
  type ProductionOrderLine,
  type LotAvailability,
} from "@/lib/api/services/production-orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Union type for line or component */
type TrackingSource = ProductionOrderLine | ProductionOrderComponent | null;

/** Type guard to check if source is a component (has Prod_Order_Line_No) */
function isComponent(
  source: TrackingSource,
): source is ProductionOrderComponent {
  return (
    source !== null &&
    "Prod_Order_Line_No" in source &&
    "Quantity_per" in source
  );
}

interface ItemTrackingDialogProps {
  /** Component for tracking assignment */
  component?: ProductionOrderComponent | null;
  /** Line for tracking assignment (alternative to component) */
  line?: ProductionOrderLine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  prodOrderNo: string;
}

export function ItemTrackingDialog({
  component,
  line,
  open,
  onOpenChange,
  onSave,
  prodOrderNo,
}: ItemTrackingDialogProps) {
  const [lotNo, setLotNo] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [availableLots, setAvailableLots] = useState<LotAvailability[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(false);

  // Determine the source (component or line)
  const source: TrackingSource = component || line || null;
  const isComponentSource = isComponent(source);

  // Fetch available lots when dialog opens
  useEffect(() => {
    if (open && source) {
      const fetchLots = async () => {
        setIsLoadingLots(true);
        try {
          const lots = await getItemAvailabilityByLot(
            source.Item_No,
            source.Location_Code || undefined,
          );
          setAvailableLots(lots);
        } catch (error) {
          console.error("Error fetching available lots:", error);
          toast.error("Failed to load available lots");
        } finally {
          setIsLoadingLots(false);
        }
      };

      fetchLots();
    } else {
      setAvailableLots([]);
      setLotNo("");
      setExpirationDate("");
      setQuantity(0);
    }
  }, [open, source]);

  const handleLotSelect = (lot: LotAvailability) => {
    setLotNo(lot.LotNo);
    // Format date for input type="date" (YYYY-MM-DD)
    const expDate = lot.Expiration_Date?.split("T")[0] || "";
    setExpirationDate(expDate);
    // Auto-suggest remaining quantity or available qty (whichever is smaller)
    const remainingQty = source?.Remaining_Quantity || lot.RemainingQty || 0;
    const suggestedQty = Math.min(lot.RemainingQty || 0, remainingQty);
    setQuantity(suggestedQty);
  };

  const handleSave = async () => {
    if (!source) return;

    // Validation
    if (!lotNo.trim()) {
      toast.error("Lot No. is required");
      return;
    }

    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    // Validate against remaining quantity
    const remainingQty = source.Remaining_Quantity || 0;
    if (quantity > remainingQty && remainingQty > 0) {
      toast.error(
        `Quantity cannot exceed remaining quantity (${remainingQty})`,
      );
      return;
    }

    setIsSaving(true);
    try {
      // Determine tracking parameters based on source type
      const trackingType = isComponentSource ? "component" : "line";
      const sourceProdOrderLine = isComponentSource
        ? (source as ProductionOrderComponent).Prod_Order_Line_No
        : (source as ProductionOrderLine).Line_No;
      const sourcerefNo = isComponentSource
        ? (source as ProductionOrderComponent).Line_No
        : 0; // For lines, sourcerefNo is 0

      await assignItemTracking({
        itemNo: source.Item_No,
        locationCode: source.Location_Code || "",
        quantity: quantity,
        sourceProdOrderLine: sourceProdOrderLine,
        sourceID: prodOrderNo,
        sourcerefNo: sourcerefNo,
        lotNo: lotNo.trim(),
        expirationDate: expirationDate || undefined,
        trackingType: trackingType,
      });

      toast.success("Item tracking assigned successfully");
      onSave();
      onOpenChange(false);

      // Reset form
      setLotNo("");
      setExpirationDate("");
      setQuantity(0);
    } catch (error) {
      console.error("Error assigning item tracking:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to assign item tracking",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-175 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Assign Item Tracking {isComponentSource ? "(Component)" : "(Line)"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left Side: Available Lots */}
          <div className="flex flex-col h-full overflow-hidden border rounded-md">
            <div className="bg-muted px-3 py-2 border-b text-sm font-medium">
              Available Lots
            </div>
            <div className="flex-1 overflow-auto">
              {isLoadingLots ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Loading lots...
                  </p>
                </div>
              ) : availableLots.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground p-4 text-center">
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
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleLotSelect(lot)}
                      >
                        <TableCell className="py-2 font-medium">
                          {lot.LotNo}
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {lot.Expiration_Date
                              ? lot.Expiration_Date.split("T")[0]
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-2">
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
            <div className="space-y-1 bg-muted/50 p-3 rounded-md text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">
                  {isComponentSource ? "Component" : "Line"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item No:</span>
                <span className="font-medium">{source.Item_No}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{source.Location_Code}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="lotNo">Lot No.</Label>
                <Input
                  id="lotNo"
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                  placeholder="Select or enter lot no"
                />
              </div>
              <div>
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity to Assign</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  step="any"
                  placeholder="Enter quantity"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  Remaining: {source.Remaining_Quantity?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
