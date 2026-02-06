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
  getSubstituteItems,
  updateComponentSubstitute,
  type ProductionOrderComponent,
  type SubstituteItem,
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
  const [quantityPer, setQuantityPer] = useState<string>("");
  const [description, setDescription] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [itemNo, setItemNo] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Substitution state
  const [isSubstituteOpen, setIsSubstituteOpen] = useState(false);
  const [substitutes, setSubstitutes] = useState<SubstituteItem[]>([]);
  const [isLoadingSubstitutes, setIsLoadingSubstitutes] = useState(false);
  const [isUpdatingSubstitute, setIsUpdatingSubstitute] = useState(false);
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
      setQuantityPer(component.Quantity_per?.toString() || "");
      setDescription(component.Description || "");
      setLocationCode(component.Location_Code || "");
      setItemNo(component.Item_No || "");
    }
  }, [component]);

  const handleFetchSubstitutes = async () => {
    if (!component) {
      toast.error("Component data is required to check substitutes.");
      return;
    }

    setIsLoadingSubstitutes(true);
    try {
      // Call the correct API to get substitute items for this component
      const data = await getSubstituteItems(
        component.Prod_Order_No,
        component.Prod_Order_Line_No,
        component.Line_No,
      );
      setSubstitutes(data);
      setIsSubstituteOpen(true);

      if (data.length === 0) {
        toast.info("No substitutes found for this component.");
      }
    } catch (error) {
      console.error("Error fetching substitutes:", error);
      toast.error("Failed to fetch substitutes");
    } finally {
      setIsLoadingSubstitutes(false);
    }
  };

  const handleSelectSubstitute = async (sub: SubstituteItem) => {
    if (!component) return;

    setIsUpdatingSubstitute(true);
    try {
      // Call API to update component with substitute item
      await updateComponentSubstitute(
        component.Prod_Order_No,
        component.Prod_Order_Line_No.toString(),
        component.Line_No.toString(),
        sub.Item_No,
      );

      // Update local state
      setItemNo(sub.Item_No);
      setIsSubstituteOpen(false);
      toast.success(`Component updated with substitute: ${sub.Item_No}`);

      // Refresh the components list
      onSave();
    } catch (error) {
      console.error("Error updating component with substitute:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to apply substitute",
      );
    } finally {
      setIsUpdatingSubstitute(false);
    }
  };

  const handleSave = async () => {
    if (!component) return;

    // Parse quantity
    const quantityPerValue = parseFloat(quantityPer) || 0;

    // Validation
    if (!itemNo.trim()) {
      toast.error("Item No. is required");
      return;
    }

    if (quantityPerValue < 0) {
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
          Quantity_per: quantityPerValue,
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
              {component?.Substitution_Available && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFetchSubstitutes}
                  disabled={isLoadingSubstitutes}
                >
                  {isLoadingSubstitutes ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : null}
                  Check Substitutes
                </Button>
              )}
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
            <Label className="text-muted-foreground text-right">
              Expected Qty
            </Label>
            <div className="col-span-3">
              {component.Expected_Quantity?.toLocaleString() ?? "-"}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-muted-foreground text-right">
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
              type="text"
              inputMode="decimal"
              value={quantityPer}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                  setQuantityPer(val);
                }
              }}
              className="col-span-3"
              placeholder="Enter quantity"
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

        {/* Tracking Action - only shown for items with tracking codes */}
        {hasTracking && (
          <div className="mt-2 border-t px-6 pt-2 pb-6">
            <Button
              variant="outline"
              className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                onAssignTracking();
                onOpenChange(false); // Close this dialog to open the next one
              }}
            >
              Item Tracking
            </Button>
          </div>
        )}
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
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="w-25">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {substitutes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center">
                      No substitutes found
                    </TableCell>
                  </TableRow>
                ) : (
                  substitutes.map((sub, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {sub.Item_No}
                      </TableCell>
                      <TableCell>{sub.Description}</TableCell>
                      <TableCell className="text-right">
                        {sub.Quantity?.toLocaleString() ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSelectSubstitute(sub)}
                          disabled={isUpdatingSubstitute}
                        >
                          {isUpdatingSubstitute ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Select"
                          )}
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
