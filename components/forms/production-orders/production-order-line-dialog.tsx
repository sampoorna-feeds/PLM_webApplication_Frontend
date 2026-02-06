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
  const [quantity, setQuantity] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [locations, setLocations] = useState<DimensionValue[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const { userID } = useAuth();

  useEffect(() => {
    if (userID) {
      setIsLoadingLocations(true);
      getAllLOCsFromUserSetup(userID)
        .then(setLocations)
        .catch((err) => {
          console.error("Failed to fetch locations", err);
          toast.error("Failed to load locations");
        })
        .finally(() => setIsLoadingLocations(false));
    }
  }, [userID]);

  // Reset form when line changes
  useEffect(() => {
    if (line) {
      setQuantity(line.Quantity || 0);
      setDescription(line.Description || "");
      setLocationCode(line.Location_Code || "");
    }
  }, [line]);

  const handleSave = async () => {
    if (!line) return;

    // Validation
    if (quantity < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }

    if (description.length > 100) {
      toast.error("Description must be 100 characters or less");
      return;
    }

    if (!locationCode.trim()) {
      toast.error("Location Code is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateProductionOrderLine(line.Prod_Order_No, line.Line_No, {
        Quantity: quantity,
        Description: description.trim(),
        Location_Code: locationCode,
      });
      toast.success("Line updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating line:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update line",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!line) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle className={cn(hasTracking && "text-red-600")}>
            Edit Production Order Line
            {hasTracking && (
              <span className="ml-2 text-xs font-normal">(Has Tracking)</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Read-only Item No */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">Item No.</Label>
            <div className="col-span-3 font-medium">{line.Item_No || "-"}</div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="locationCode" className="text-right">
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">UOM</Label>
            <div className="col-span-3">{line.Unit_of_Measure_Code || "-"}</div>
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

        {/* Item Tracking Action - only show if has tracking */}
        {hasTracking && onAssignTracking && (
          <div className="px-6 pb-6 pt-2 border-t mt-2">
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 justify-center"
              onClick={() => {
                onAssignTracking();
                onOpenChange(false); // Close this dialog to open the tracking dialog
              }}
            >
              Item Tracking
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
