"use client";

import { useState, useEffect } from "react";
import { Pencil, X, Save, Loader2 } from "lucide-react";
import type { ProductionOrder } from "@/lib/api/services/production-orders.service";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProductionOrderFormFields } from "./production-order-form-fields";
import { ProductionOrderLinesTable } from "./production-order-lines-table";
import { ProductionOrderComponentsTable } from "./production-order-components-table";
import {
  useProductionOrderLines,
  useProductionOrderComponents,
} from "./use-production-orders";
import type { SheetMode, ProductionOrderFormData } from "./types";
import { EMPTY_FORM_DATA } from "./types";

interface ProductionOrderSheetProps {
  order: ProductionOrder | null;
  open: boolean;
  mode: SheetMode;
  initialFormData: ProductionOrderFormData;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: SheetMode) => void;
  onSave: (data: ProductionOrderFormData) => Promise<void>;
  onRefresh?: () => void;
}

export function ProductionOrderSheet({
  order,
  open,
  mode,
  initialFormData,
  isSaving,
  onOpenChange,
  onModeChange,
  onSave,
  onRefresh,
}: ProductionOrderSheetProps) {
  const [formData, setFormData] =
    useState<ProductionOrderFormData>(initialFormData);

  // Fetch order lines when viewing/editing an existing order
  const { lines, isLoading: isLoadingLines } = useProductionOrderLines(
    mode !== "create" ? (order?.No ?? null) : null,
  );

  // Fetch order components when viewing/editing an existing order
  const { components, isLoading: isLoadingComponents } =
    useProductionOrderComponents(
      mode !== "create" ? (order?.No ?? null) : null,
      null,
    );

  // Reset form data when order changes or mode changes
  useEffect(() => {
    if (mode === "create") {
      setFormData(EMPTY_FORM_DATA);
    } else if (order) {
      setFormData(initialFormData);
    }
  }, [order, mode, initialFormData]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleEdit = () => {
    onModeChange("edit");
  };

  const handleCancel = () => {
    if (mode === "create") {
      handleClose();
    } else {
      setFormData(initialFormData);
      onModeChange("view");
    }
  };

  const handleSave = async () => {
    await onSave(formData);
    onRefresh?.();
  };

  const getTitle = () => {
    switch (mode) {
      case "create":
        return "Create Production Order";
      case "edit":
        return "Edit Production Order";
      default:
        return "Production Order Details";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "create":
        return "Fill in the details to create a new production order";
      case "edit":
        return `Editing order: ${order?.No}`;
      default:
        return `Order No: ${order?.No}`;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 md:w-[70vw] lg:w-[60vw]">
        <SheetHeader className="bg-background sticky top-0 z-10 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{getTitle()}</SheetTitle>
              <SheetDescription>{getDescription()}</SheetDescription>
            </div>
            {mode === "view" && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <ProductionOrderFormFields
            data={formData}
            mode={mode}
            onChange={setFormData}
          />

          {/* Order Lines Table - only show when viewing/editing existing order */}
          {mode !== "create" && order && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">
                Release Production Order Line
              </h3>
              <ProductionOrderLinesTable
                lines={lines}
                isLoading={isLoadingLines}
              />
            </div>
          )}

          {/* Order Components Table - only show when viewing/editing existing order */}
          {mode !== "create" && order && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">
                Production Order Component
              </h3>
              <ProductionOrderComponentsTable
                components={components}
                isLoading={isLoadingComponents}
              />
            </div>
          )}
        </div>

        <SheetFooter className="bg-background sticky bottom-0 z-10 border-t px-6 py-4">
          <div className="flex w-full justify-end gap-2">
            {mode === "view" ? (
              <Button variant="destructive" onClick={handleClose}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {mode === "create" ? "Create Order" : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
