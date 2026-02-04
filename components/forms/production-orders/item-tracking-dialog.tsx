"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
  type ProductionOrderComponent,
} from "@/lib/api/services/production-orders.service";

interface ItemTrackingDialogProps {
  component: ProductionOrderComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  prodOrderNo: string;
}

export function ItemTrackingDialog({
  component,
  open,
  onOpenChange,
  onSave,
  prodOrderNo,
}: ItemTrackingDialogProps) {
  const [lotNo, setLotNo] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!component) return;

    if (!lotNo) {
      toast.error("Lot No. is required");
      return;
    }

    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    setIsSaving(true);
    try {
      await assignItemTracking({
        itemNo: component.Item_No,
        locationCode: component.Location_Code || "",
        quantity: quantity,
        sourceProdOrderLine: component.Prod_Order_Line_No,
        sourceID: prodOrderNo,
        sourcerefNo: component.Line_No,
        lotNo: lotNo,
        expirationDate: expirationDate || undefined,
      });
      
      toast.success("Item tracking assigned successfully");
      onSave(); // Optional: trigger a refresh if needed
      onOpenChange(false);
      
      // Reset form
      setLotNo("");
      setExpirationDate("");
      setQuantity(0);
    } catch (error) {
      console.error("Error assigning item tracking:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to assign item tracking"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!component) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Item Tracking</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Read-only fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">Item No.</Label>
            <div className="col-span-3 font-medium">{component.Item_No}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Description
            </Label>
            <div className="col-span-3">{component.Description}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">Location</Label>
            <div className="col-span-3">{component.Location_Code}</div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lotNo" className="text-right">
              Lot No.
            </Label>
            <Input
              id="lotNo"
              value={lotNo}
              onChange={(e) => setLotNo(e.target.value)}
              className="col-span-3"
              placeholder="Enter Lot Number"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expirationDate" className="text-right">
              Expiration Date
            </Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="col-span-3"
              step="any"
              placeholder="Quantity to assign"
            />
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
