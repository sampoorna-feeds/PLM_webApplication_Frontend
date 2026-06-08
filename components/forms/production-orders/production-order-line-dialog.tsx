"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculatorInput } from "@/components/ui/calculator-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateProductionOrderLine,
  type ProductionOrderLine,
} from "@/lib/api/services/production-orders.service";
import {
  getAllLOCsFromUserSetup,
  type DimensionValue,
} from "@/lib/api/services/dimension.service";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "./api-error-dialog";

interface ProductionOrderLineDialogProps {
  line: ProductionOrderLine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onAssignTracking?: () => void;
  hasTracking?: boolean;
}

export function ProductionOrderLineDialog({
  line,
  open,
  onOpenChange,
  onSave,
  onAssignTracking,
  hasTracking = false,
}: ProductionOrderLineDialogProps) {
  const [quantity, setQuantity] = useState<string>("");
  const [description, setDescription] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [locations, setLocations] = useState<DimensionValue[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const { userID } = useAuth();
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  useEffect(() => {
    if (userID) {
      setIsLoadingLocations(true);
      getAllLOCsFromUserSetup(userID)
        .then(setLocations)
        .catch((err) => {
          console.error("Failed to fetch locations", err);
          const { message, code } = extractApiError(err);
          setApiError({ title: "Load Locations Failed", message, code });
        })
        .finally(() => setIsLoadingLocations(false));
    }
  }, [userID]);

  // Reset form when line changes
  useEffect(() => {
    if (line) {
      setQuantity(line.Quantity?.toString() || "");
      setDescription(line.Description || "");
      setLocationCode(line.Location_Code || "");
    }
  }, [line]);

  const handleSave = async () => {
    if (!line) return;

    // Parse quantity
    const quantityValue = parseFloat(quantity) || 0;

    // Validation
    if (quantityValue < 0) {
      toastError(new Error("Quantity cannot be negative"));
      return;
    }

    if (description.length > 100) {
      toastError(new Error("Description must be 100 characters or less"));
      return;
    }

    if (!locationCode.trim()) {
      toastError(new Error("Location Code is required"));
      return;
    }

    setIsSaving(true);
    try {
      await updateProductionOrderLine(line.Prod_Order_No, line.Line_No, {
        Quantity: quantityValue,
        Description: description.trim(),
        Location_Code: locationCode,
      });
      toast.success("Line updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating line:", error);
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
        <DialogContent className="p-0 sm:max-w-150 overflow-hidden">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLElement;
                if (
                  target.tagName === "INPUT" ||
                  target.tagName === "SELECT" ||
                  target.getAttribute("role") === "combobox"
                ) {
                  e.preventDefault();
                }
              }
            }}
            className="flex flex-col gap-4 p-8"
          >
            <DialogHeader>
              <DialogTitle
                className={cn("text-lg", hasTracking && "text-red-600")}
              >
                Edit Production Order Line
                {hasTracking && (
                  <span className="ml-2 text-sm font-normal">(Has Tracking)</span>
                )}
              </DialogTitle>
            </DialogHeader>

          <div className="grid gap-5 py-5">
            {/* Read-only Item No */}
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Item No.
              </Label>
              <div className="col-span-3 text-sm font-medium">
                {line.Item_No || "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="description"
                className="text-left text-sm sm:text-right"
              >
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="locationCode"
                className="text-left text-sm sm:text-right"
              >
                Location Code
              </Label>
              <div className="col-span-3">
                <Select value={locationCode} onValueChange={setLocationCode}>
                  <SelectTrigger id="locationCode">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.Code} value={loc.Code}>
                        {loc.Code} - {loc.Name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                UOM
              </Label>
              <div className="col-span-3 text-sm">
                {line.Unit_of_Measure_Code || "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Finished Qty
              </Label>
              <div className="col-span-3 text-sm">
                {line.Finished_Quantity?.toLocaleString() ?? "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Remaining Qty
              </Label>
              <div className="col-span-3 text-sm">
                {line.Remaining_Quantity?.toLocaleString() ?? "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="quantity"
                className="text-left text-sm sm:text-right"
              >
                Quantity
              </Label>
              <CalculatorInput
                id="quantity"
                value={quantity}
                onValueChange={(v) => setQuantity(v)}
                className="col-span-3"
                placeholder="Enter quantity"
              />
            </div>
          </div>

            <DialogFooter className="flex items-center justify-between border-t pt-3 gap-2 shrink-0">
              <div>
                {hasTracking && onAssignTracking && (
                  <Button
                    variant="outline"
                    type="button"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8"
                    onClick={() => {
                      onAssignTracking();
                      onOpenChange(false); // Close this dialog to open the tracking dialog
                    }}
                  >
                    Item Tracking
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8"
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
