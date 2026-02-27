"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSalesLine, type SalesLine } from "@/lib/api/services/sales-orders.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";

interface SalesOrderLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: SalesLine | null;
  orderNo: string;
  hasTracking?: boolean;
  onSave: () => void;
  onAssignTracking?: () => void;
}

export function SalesOrderLineDialog({
  open,
  onOpenChange,
  line,
  orderNo,
  hasTracking = false,
  onSave,
  onAssignTracking,
}: SalesOrderLineDialogProps) {
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  useEffect(() => {
    if (!line) return;
    setDescription(line.Description || "");
    setQuantity(line.Quantity?.toString() || "");
    // Keep existing location untouched (hidden in UI)
  }, [line]);

  const handleSave = async () => {
    if (!line || !line.Line_No || !orderNo) return;

    const quantityValue = parseFloat(quantity) || 0;
    if (quantityValue < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }
    setIsSaving(true);
    try {
      await updateSalesLine(orderNo, line.Line_No, {
        Description: description.trim(),
        Quantity: quantityValue,
      });
      toast.success("Line updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      const { message, code } = extractApiError(error);
      setApiError({ title: "Update Failed", message, code });
    } finally {
      setIsSaving(false);
    }
  };

  if (!line) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-8 sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className={hasTracking ? "text-red-600" : ""}>
              Sales Line Details
              {hasTracking && (
                <span className="ml-2 text-sm font-normal">(Has Tracking)</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Item No.
              </Label>
              <div className="col-span-3 text-sm font-medium">{line.No || "-"}</div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="description" className="text-left text-sm sm:text-right">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label htmlFor="quantity" className="text-left text-sm sm:text-right">
                Quantity
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
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                UOM
              </Label>
              <div className="col-span-3 text-sm">
                {line.Unit_of_Measure_Code || line.Unit_of_Measure || "-"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground block text-xs">Qty to Ship</span>
                <span className="font-medium">{line.Qty_to_Ship ?? "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Qty Shipped</span>
                <span className="font-medium">{line.Quantity_Shipped ?? "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Qty to Invoice</span>
                <span className="font-medium">{line.Qty_to_Invoice ?? "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Qty Invoiced</span>
                <span className="font-medium">{line.Quantity_Invoiced ?? "-"}</span>
              </div>
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

          {hasTracking && onAssignTracking && (
            <div className="mt-3 border-t pt-4 pb-2">
              <Button
                variant="outline"
                className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  onAssignTracking();
                  onOpenChange(false);
                }}
              >
                Item Tracking
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
