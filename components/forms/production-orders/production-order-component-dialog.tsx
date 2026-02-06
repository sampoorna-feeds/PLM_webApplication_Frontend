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
  getComponentSubstitutes,
  type ProductionOrderComponent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getLOCs,
  getAllLOCsFromUserSetup,
  type DimensionValue,
} from "@/lib/api/services/dimension.service";
import { useAuth } from "@/lib/contexts/auth-context";

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
  const [description, setDescription] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [itemNo, setItemNo] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Substitution state
  const [isSubstituteOpen, setIsSubstituteOpen] = useState(false);
  const [substitutes, setSubstitutes] = useState<LotAvailability[]>([]);
  const [isLoadingSubstitutes, setIsLoadingSubstitutes] = useState(false);
  const [locations, setLocations] = useState<DimensionValue[]>([]);
  const { userID } = useAuth();

  useEffect(() => {
    if (userID) {
      getAllLOCsFromUserSetup(userID)
        .then(setLocations)
        .catch((err) => {
          console.error("Failed to fetch locations", err);
          toast.error("Failed to load locations");
        });
    }
  }, [userID]);

  // Reset form when component changes
  useEffect(() => {
    if (component) {
      setQuantityPer(component.Quantity_per || 0);
      setDescription(component.Description || "");
      setLocationCode(component.Location_Code || "");
      setItemNo(component.Item_No || "");
    }
  }, [component]);

  const handleFetchSubstitutes = async () => {
    // Determine which item/location to check.
    // Use current state values so user can type a new item and check it.
    const targetItem = itemNo || component?.Item_No || "";
    const targetLocation = locationCode || component?.Location_Code || "";

    if (!targetItem || !targetLocation) {
      toast.error(
        "Item No and Location Code are required to check availability.",
      );
      return;
    }

    setIsLoadingSubstitutes(true);
    try {
      const data = await getComponentSubstitutes(targetItem, targetLocation);
      setSubstitutes(data);
      setIsSubstituteOpen(true);

      if (data.length === 0) {
        toast.info("No availability found for this item/location.");
      }
    } catch (error) {
      console.error("Error fetching substitutes:", error);
      toast.error("Failed to fetch availability");
    } finally {
      setIsLoadingSubstitutes(false);
    }
  };

  const handleSelectSubstitute = (sub: LotAvailability) => {
    // If user selects a lot, we confirm using this Item No (and potentially Lot logic later)
    setItemNo(sub.ItemNo);
    setIsSubstituteOpen(false);
    toast.success(`Selected Item: ${sub.ItemNo} (Lot: ${sub.LotNo})`);
  };

  const handleSave = async () => {
    if (!component) return;

    // Validation
    if (!itemNo.trim()) {
      toast.error("Item No. is required");
      return;
    }

    if (quantityPer < 0) {
      toast.error("Quantity Per cannot be negative");
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
      await updateProductionOrderComponent(
        component.Prod_Order_No,
        component.Prod_Order_Line_No,
        component.Line_No,
        {
          Quantity_per: quantityPer,
          Description: description.trim(),
          Location_Code: locationCode,
          Item_No:
            itemNo.trim() !== component.Item_No ? itemNo.trim() : undefined,
        },
      );
      toast.success("Component updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating component:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update component",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!component) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
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
          {/* Edit Item No with Substitute */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="itemNo" className="text-right">
              Item No.
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="itemNo"
                value={itemNo || ""}
                onChange={(e) => setItemNo(e.target.value)}
                className=""
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchSubstitutes}
                disabled={isLoadingSubstitutes}
              >
                {isLoadingSubstitutes ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Check Availability
              </Button>
            </div>
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

          {/* Read-only stats */}
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

        {/* Tracking Action */}
        <div className="px-6 pb-6 pt-2 border-t mt-2">
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 justify-center"
            onClick={() => {
              onAssignTracking();
              onOpenChange(false); // Close this dialog to open the next one
            }}
          >
            Item Tracking
          </Button>
        </div>
      </DialogContent>

      {/* Substitution Dialog */}
      <Dialog open={isSubstituteOpen} onOpenChange={setIsSubstituteOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Substitute Item</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item No</TableHead>
                  <TableHead>Lot No</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="w-25">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {substitutes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No availability found
                    </TableCell>
                  </TableRow>
                ) : (
                  substitutes.map((sub, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {sub.ItemNo}
                      </TableCell>
                      <TableCell>{sub.LotNo}</TableCell>
                      <TableCell>{sub.Location_Code}</TableCell>
                      <TableCell>{sub.RemainingQty}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSelectSubstitute(sub)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubstituteOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
