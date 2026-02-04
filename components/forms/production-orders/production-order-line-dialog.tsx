"use client";

import { useState, useEffect } from "react";
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
  updateProductionOrderLine,
  type ProductionOrderLine,
} from "@/lib/api/services/production-orders.service";
import { cn } from "@/lib/utils";

interface ProductionOrderLineDialogProps {
  line: ProductionOrderLine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  hasTracking?: boolean;
}

export function ProductionOrderLineDialog({
  line,
  open,
  onOpenChange,
  onSave,
  hasTracking = false,
}: ProductionOrderLineDialogProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when line changes
  useEffect(() => {
    if (line) {
      setQuantity(line.Quantity || 0);
    }
  }, [line]);

  const handleSave = async () => {
    if (!line) return;

    setIsSaving(true);
    try {
      await updateProductionOrderLine(line.Prod_Order_No, line.Line_No, {
        Quantity: quantity,
      });
      toast.success("Line updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating line:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update line"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!line) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className={cn(hasTracking && "text-red-600")}>
            Edit Production Order Line
            {hasTracking && (
              <span className="ml-2 text-xs font-normal">(Has Tracking)</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Read-only fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">Item No.</Label>
            <div className="col-span-3 font-medium">{line.Item_No || "-"}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Description
            </Label>
            <div className="col-span-3">{line.Description || "-"}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Location Code
            </Label>
            <div className="col-span-3">{line.Location_Code || "-"}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">UOM</Label>
            <div className="col-span-3">
              {line.Unit_of_Measure_Code || "-"}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Finished Qty
            </Label>
            <div className="col-span-3">
              {line.Finished_Quantity?.toLocaleString() ?? "-"}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Remaining Qty
            </Label>
            <div className="col-span-3">
              {line.Remaining_Quantity?.toLocaleString() ?? "-"}
            </div>
          </div>

          {/* Editable field */}
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
              min={0}
              step="any"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
