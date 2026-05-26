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
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "./api-error-dialog";

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
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  useEffect(() => {
    if (userID) {
      getAllLOCsFromUserSetup(userID)
        .then(setLocations)
        .catch((err) => {
          console.error("Failed to fetch locations", err);
          const { message, code } = extractApiError(err);
          setApiError({ title: "Load Locations Failed", message, code });
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
      toastError(new Error("Component data is required to check substitutes."));
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
      const { message, code } = extractApiError(error);
      setApiError({ title: "Substitutes Failed", message, code });
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
        component.Prod_Order_Line_No,
        component.Line_No,
        sub.Item_No,
      );

      // Update local state
      setItemNo(sub.Item_No);
      setDescription(sub.Description || "");
      toast.success(`Component updated with substitute: ${sub.Item_No}`);

      // Close substitute dialog
      setIsSubstituteOpen(false);

      // Refresh the components list
      onSave();

      // Close the main component dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating component with substitute:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Substitute Failed", message, code });
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
      toastError(new Error("Item No. is required"));
      return;
    }

    if (quantityPerValue < 0) {
      toastError(new Error("Quantity Per cannot be negative"));
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
      const { message, code } = extractApiError(error);
      setApiError({ title: "Update Failed", message, code });
    } finally {
      setIsSaving(false);
    }
  };

  if (!component) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-160 p-0 overflow-hidden">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col gap-4 p-4 sm:p-6 md:p-8">
            <DialogHeader>
              <DialogTitle
                className={cn("text-lg", hasTracking && "text-red-600")}
              >
                Edit Component
                {hasTracking && (
                  <span className="ml-2 text-sm font-normal">(Has Tracking)</span>
                )}
              </DialogTitle>
            </DialogHeader>

          <div className="grid gap-5 py-5">
            {/* Read-only fields */}
            {/* Edit Item No with Substitute */}
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="itemNo"
                className="text-left text-sm sm:text-right"
              >
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

            {/* Read-only stats */}
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Expected Qty
              </Label>
              <div className="col-span-3 text-sm">
                {component.Expected_Quantity?.toLocaleString() ?? "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Remaining Qty
              </Label>
              <div className="col-span-3 text-sm">
                {component.Remaining_Quantity?.toLocaleString() ?? "-"}
              </div>
            </div>

            {/* Editable field */}
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="quantityPer"
                className="text-left text-sm sm:text-right"
              >
                Quantity Per
              </Label>
              <CalculatorInput
                id="quantityPer"
                value={quantityPer}
                onValueChange={(v) => setQuantityPer(v)}
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
                      onOpenChange(false); // Close this dialog to open the next one
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

      {/* Substitution Dialog - sibling to main dialog to avoid nesting issues */}
      <Dialog open={isSubstituteOpen} onOpenChange={setIsSubstituteOpen}>
        <DialogContent className="max-w-[95vw] p-4 sm:max-w-3xl sm:p-6 md:p-8">
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

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
