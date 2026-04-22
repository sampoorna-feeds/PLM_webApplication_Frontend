"use client";

/**
 * Transfer Bardana Dialog
 * Allows adding a bardana line to a transfer order line item.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
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
  addTransferBardanaLine,
  postTransferBardana,
} from "@/lib/api/services/transfer-orders.service";

interface TransferBardanaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documentNo: string;
  lineNo: number;
  noOfBags?: number;
  /** Line description for context display */
  lineDescription?: string;
}

export function TransferBardanaDialog({
  isOpen,
  onOpenChange,
  documentNo,
  lineNo,
  noOfBags,
  lineDescription,
}: TransferBardanaDialogProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [uom, setUom] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedItem(null);
      setUom("");
      setQuantity(noOfBags ? String(noOfBags) : "");
      setIsSaving(false);
      setIsPosting(false);
      setError(null);
      setSuccess(false);
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
      await addTransferBardanaLine(documentNo, lineNo, selectedItem.No, uom, qty);
      setSuccess(true);
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

  const handlePost = async () => {
    setIsPosting(true);
    setError(null);
    try {
      await postTransferBardana(documentNo, lineNo);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err && typeof (err as any).message === "string"
          ? (err as any).message
          : "Failed to post bardana.";
      setError(msg);
    } finally {
      setIsPosting(false);
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

        {/* Context info */}
        <div className="bg-muted/40 rounded-md border px-3 py-2 text-xs">
          <div className="text-muted-foreground">
            <span className="text-foreground font-medium">Order:</span>{" "}
            {documentNo}
          </div>
          <div className="text-muted-foreground">
            <span className="text-foreground font-medium">Line No:</span>{" "}
            {lineNo}
            {noOfBags != null && noOfBags > 0 && (
              <span className="ml-3">
                <span className="text-foreground font-medium">Bags:</span>{" "}
                {noOfBags}
              </span>
            )}
          </div>
          {lineDescription && (
            <div className="text-muted-foreground truncate">
              <span className="text-foreground font-medium">Item:</span>{" "}
              {lineDescription}
            </div>
          )}
        </div>

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
            <p className="text-xs font-medium text-green-600">
              ✓ Bardana line added successfully.
            </p>
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
          {success ? (
            <Button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePost}
              disabled={isPosting}
            >
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting…
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Post Bardana
                </>
              )}
            </Button>
          ) : (
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
