"use client";

/**
 * Bardana Dialog
 * Allows adding a bardana line to a purchase order line item.
 * Bardana items are filtered by Status = Approved and RM_Bardana_Item = true.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Package, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldTitle } from "@/components/ui/field";
import { SearchableSelect } from "@/components/forms/shared/searchable-select";
import {
  getBardanaItems,
  getBardanaItemsPage,
  searchBardanaItems,
  type Item,
} from "@/lib/api/services/item.service";
import {
  addBardanaLine,
  deleteBardanaLine,
} from "@/lib/api/services/purchase-order.service";

interface BardanaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documentNo: string;
  lineNo: number;
  noOfBags?: number;
  /** Line description for context display */
  lineDescription?: string;
  onSuccess?: () => void;
}

export function BardanaDialog({
  isOpen,
  onOpenChange,
  documentNo,
  lineNo,
  noOfBags,
  lineDescription,
  onSuccess,
}: BardanaDialogProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [uom, setUom] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [addedLine, setAddedLine] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedItem(null);
      setUom("");
      setQuantity(noOfBags ? String(noOfBags) : "");
      setIsSaving(false);
      setError(null);
      setSuccess(false);
      setAddedLine(null);
      setIsDeleting(false);
    }
  }, [isOpen, noOfBags]);

  const handleItemSelect = useCallback((itemNo: string, item?: Item) => {
    if (!item) {
      setSelectedItem(null);
      setUom("");
      return;
    }
    setSelectedItem(item);
    setUom(item.Sales_Unit_of_Measure || item.Base_Unit_of_Measure || "");
  }, []);

  const handleSubmit = async () => {
    if (!selectedItem) {
      setError("Please select a bardana item.");
      return;
    }
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }
    if (!uom) {
      setError("Selected item has no unit of measure.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await addBardanaLine(
        documentNo,
        lineNo,
        selectedItem.No,
        uom,
        qty,
      );
      setAddedLine(response);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const msg =
        err && typeof (err as any).message === "string"
          ? (err as any).message
          : "Failed to add bardana line.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!addedLine) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteBardanaLine(
        addedLine.Document_No,
        addedLine.Document_Line_No,
        addedLine.Line_No,
      );
      setSuccess(false);
      setAddedLine(null);
      setError(null);
      onSuccess?.();
    } catch (err) {
      const msg =
        err && typeof (err as any).message === "string"
          ? (err as any).message
          : "Failed to delete bardana line.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Add Bardana
          </DialogTitle>
        </DialogHeader>



        <div className="space-y-3">
          {/* Bardana Item */}
          <div className="space-y-1">
            <FieldTitle>
              Bardana Item <span className="text-red-500">*</span>
            </FieldTitle>
            <SearchableSelect<Item>
              value={selectedItem?.No || ""}
              onChange={handleItemSelect}
              placeholder="Search bardana items…"
              loadInitial={() => getBardanaItems(20)}
              searchItems={searchBardanaItems}
              loadMore={(skip, search) => getBardanaItemsPage(skip, search, 20)}
              getDisplayValue={(item) => `${item.No} - ${item.Description}`}
              getItemValue={(item) => item.No}
              supportsDualSearch={false}
            />
            {selectedItem && (
              <p className="pl-1 text-[10px] font-medium text-green-600">
                {selectedItem.Description}
              </p>
            )}
          </div>

          {/* UOM — read-only, auto-filled from selected item */}
          <div className="space-y-1">
            <FieldTitle>Unit of Measure</FieldTitle>
            <Input
              value={uom}
              readOnly
              disabled
              placeholder="Auto-filled from item"
              className="bg-muted h-8 text-sm"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <FieldTitle>
              Quantity <span className="text-red-500">*</span>
            </FieldTitle>
            <Input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={noOfBags ? String(noOfBags) : "Enter quantity"}
              className="h-8 text-sm"
            />
            {noOfBags != null && noOfBags > 0 && (
              <p className="text-muted-foreground pl-1 text-[10px]">
                Bags on this line: {noOfBags}
              </p>
            )}
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          {success && (
            <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-green-700">
                  ✓ Bardana line added successfully.
                </p>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-fit  px-2 py-1 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  title="Delete added line"
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-1 justify-center">
                    <Trash2 className="size-4" />
                    <p>Delete</p>
                    </div>
                  )}
                </Button>
              </div>
              {addedLine && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Document No
                    </span>
                    <span className="font-semibold">{addedLine.Document_No}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Item No
                    </span>
                    <span className="font-semibold">{addedLine.Item_No}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block font-medium">
                      Description
                    </span>
                    <span className="font-semibold">{addedLine.Description}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Quantity
                    </span>
                    <span className="font-semibold">
                      {addedLine.Quantity} {addedLine.UOM}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Weight Per
                    </span>
                    <span className="font-semibold">{addedLine.Weight_Per}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Total Weight
                    </span>
                    <span className="font-semibold">
                      {addedLine.Total_Weight}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {success ? "Close" : "Cancel"}
          </Button>
          {!success && (
            <Button type="button" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Add Bardana
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
