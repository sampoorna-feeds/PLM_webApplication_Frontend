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
  updateProductionOrderComponent,
  type ProductionOrderComponent,
} from "@/lib/api/services/production-orders.service";
import { cn } from "@/lib/utils";

interface ProductionOrderComponentDialogProps {
  component: ProductionOrderComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onAssignTracking: () => void;
  hasTracking?: boolean;
}

export function ProductionOrderComponentDialog({
  component,
  open,
  onOpenChange,
  onSave,
  onAssignTracking,
  hasTracking = false,
}: ProductionOrderComponentDialogProps) {
  const [quantityPer, setQuantityPer] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when component changes
  useEffect(() => {
    if (component) {
      setQuantityPer(component.Quantity_per || 0);
    }
  }, [component]);

  const handleSave = async () => {
    if (!component) return;

    setIsSaving(true);
    try {
      await updateProductionOrderComponent(
        component.Prod_Order_No,
        component.Prod_Order_Line_No,
        component.Line_No,
        {
          Quantity_per: quantityPer,
        }
      );
      toast.success("Component updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating component:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update component"
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
          <DialogTitle className={cn(hasTracking && "text-red-600")}>
            Edit Component
            {hasTracking && (
              <span className="ml-2 text-xs font-normal">(Has Tracking)</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Read-only fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">Item No.</Label>
            <div className="col-span-3 font-medium">{component.Item_No || "-"}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Description
            </Label>
            <div className="col-span-3">{component.Description || "-"}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Location Code
            </Label>
            <div className="col-span-3">{component.Location_Code || "-"}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Expected Qty
            </Label>
            <div className="col-span-3">
              {component.Expected_Quantity?.toLocaleString() ?? "-"}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Remaining Qty
            </Label>
            <div className="col-span-3">
              {component.Remaining_Quantity?.toLocaleString() ?? "-"}
            </div>
          </div>

          {/* Editable field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantityPer" className="text-right">
              Quantity Per
            </Label>
            <Input
              id="quantityPer"
              type="number"
              value={quantityPer}
              onChange={(e) => setQuantityPer(parseFloat(e.target.value) || 0)}
              className="col-span-3"
              step="any"
            />
          </div>

          {/* Tracking Action */}
          {hasTracking && (
             <div className="grid grid-cols-4 items-center gap-4 mt-2">
               <div className="col-start-2 col-span-3">
                 <Button 
                    variant="secondary" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      onAssignTracking();
                      onOpenChange(false); // Close this dialog to open the next one
                    }}
                 >
                   Assign Item Tracking
                 </Button>
               </div>
             </div>
          )}
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
