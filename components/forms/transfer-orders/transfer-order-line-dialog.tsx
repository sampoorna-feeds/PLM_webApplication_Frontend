"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldTitle } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  SearchableSelect,
} from "@/components/ui/searchable-select";
import {
  getItems,
  getItemByNo,
  type Item,
} from "@/lib/api/services/production-order-data.service";
import {
  createTransferLine,
  updateTransferLine,
  type TransferLine,
  getItemLedgerEntries,
  type ItemLedgerEntry,
} from "@/lib/api/services/transfer-orders.service";

interface TransferOrderLineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documentNo: string;
  line?: TransferLine | null;
  onSuccess: () => void;
  locationCode: string;
  defaultDimensions: {
    Shortcut_Dimension_1_Code: string;
    Shortcut_Dimension_2_Code: string;
    In_Transit_Code: string;
    Shipment_Date: string;
    Receipt_Date: string;
  };
}

export function TransferOrderLineDialog({
  isOpen,
  onOpenChange,
  documentNo,
  line,
  onSuccess,
  locationCode,
  defaultDimensions,
}: TransferOrderLineDialogProps) {
  const isEdit = !!line;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<ItemLedgerEntry[]>([]);
  const [isLoadingLedgerEntries, setIsLoadingLedgerEntries] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState<Partial<TransferLine>>({
    Document_No: documentNo,
    Item_No: "",
    Quantity: 0,
    Transfer_Price: 0,
    Amount: 0,
    Description: "",
    Unit_of_Measure_Code: "",
    Shortcut_Dimension_1_Code: defaultDimensions.Shortcut_Dimension_1_Code,
    Shortcut_Dimension_2_Code: defaultDimensions.Shortcut_Dimension_2_Code,
    New_LOB: defaultDimensions.Shortcut_Dimension_1_Code,
    New_Branch: defaultDimensions.Shortcut_Dimension_2_Code,
    Shortcut_Dimension_3_Code: "", // Usually the location?
    Shipment_Date: defaultDimensions.Shipment_Date,
    Receipt_Date: defaultDimensions.Receipt_Date,
    Appl_to_Item_Entry: 0,
  });

  useEffect(() => {
    if (line) {
      setFormData(line);
    } else {
      setFormData({
        Document_No: documentNo,
        Item_No: "",
        Quantity: 0,
        Transfer_Price: 0,
        Amount: 0,
        Description: "",
        Unit_of_Measure_Code: "",
        Shortcut_Dimension_1_Code: defaultDimensions.Shortcut_Dimension_1_Code,
        Shortcut_Dimension_2_Code: defaultDimensions.Shortcut_Dimension_2_Code,
        New_LOB: defaultDimensions.Shortcut_Dimension_1_Code,
        New_Branch: defaultDimensions.Shortcut_Dimension_2_Code,
        Shortcut_Dimension_3_Code: "",
        Shipment_Date: defaultDimensions.Shipment_Date,
        Receipt_Date: defaultDimensions.Receipt_Date,
        Appl_to_Item_Entry: 0,
      });
    }
  }, [line, documentNo, defaultDimensions, isOpen]);

  useEffect(() => {
    const loadItems = async () => {
      setIsLoadingItems(true);
      try {
        const data = await getItems(searchQuery || undefined);
        setItems(data);
      } catch (err) {
        console.error("Error loading items:", err);
      } finally {
        setIsLoadingItems(false);
      }
    };

    if (isOpen) {
      loadItems();
    }
  }, [isOpen, searchQuery]);

  // Load Item Ledger Entries when item or location changes
  useEffect(() => {
    const loadLedgerEntries = async () => {
      if (!formData.Item_No || !locationCode) {
        setLedgerEntries([]);
        return;
      }

      setIsLoadingLedgerEntries(true);
      try {
        const entries = await getItemLedgerEntries(formData.Item_No, locationCode);
        setLedgerEntries(entries);
      } catch (err) {
        console.error("Error loading item ledger entries:", err);
      } finally {
        setIsLoadingLedgerEntries(false);
      }
    };

    if (isOpen) {
      loadLedgerEntries();
    }
  }, [isOpen, formData.Item_No, locationCode]);

  const handleItemChange = async (itemNo: string) => {
    const item = await getItemByNo(itemNo);
    if (item) {
      setFormData(prev => ({
        ...prev,
        Item_No: item.No,
        Description: item.Description,
        Unit_of_Measure_Code: item.Base_Unit_of_Measure,
        GST_Group_Code: item.GST_Group_Code as string,
        HSN_SAC_Code: item.HSN_SAC_Code as string,
      }));
    }
  };

  const handleCalcAmount = (qty: number, price: number) => {
    return Number((qty * price).toFixed(2));
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === "Quantity" || field === "Transfer_Price") {
        next.Amount = handleCalcAmount(Number(next.Quantity || 0), Number(next.Transfer_Price || 0));
        next.Qty_to_Ship = next.Quantity;
        next.Qty_to_Receive = next.Quantity;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!formData.Item_No || !formData.Quantity) {
      toast.error("Item No and Quantity are required");
      return;
    }

    const payload = {
      Document_No: documentNo,
      Item_No: formData.Item_No,
      Quantity: Number(formData.Quantity),
      Appl_to_Item_Entry: Number(formData.Appl_to_Item_Entry || 0),
    };

    setIsSubmitting(true);
    try {
      if (isEdit && line) {
        await updateTransferLine(documentNo, line.Line_No, payload);
        toast.success("Line updated successfully");
      } else {
        await createTransferLine(payload);
        toast.success("Line added successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving line:", error);
      toast.error(error.message || "Failed to save line");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2 col-span-2">
            <FieldTitle required>Item No.</FieldTitle>
            <SearchableSelect
              options={items.map(i => ({ value: i.No, label: `${i.No} - ${i.Description}` }))}
              value={formData.Item_No}
              onValueChange={handleItemChange}
              onSearch={setSearchQuery}
              isLoading={isLoadingItems}
              placeholder="Select Item"
              disabled={isEdit}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <FieldTitle>Description</FieldTitle>
            <Input
              value={formData.Description || ""}
              onChange={(e) => handleChange("Description", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <FieldTitle required>Quantity</FieldTitle>
            <Input
              type="number"
              value={formData.Quantity}
              onChange={(e) => handleChange("Quantity", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <FieldTitle>UOM</FieldTitle>
            <Input
              value={formData.Unit_of_Measure_Code || ""}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <FieldTitle>Transfer Price</FieldTitle>
            <Input
              type="number"
              value={formData.Transfer_Price}
              onChange={(e) => handleChange("Transfer_Price", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>Amount</FieldTitle>
            <Input
              type="number"
              value={formData.Amount}
              readOnly
              className="bg-muted font-bold"
            />
          </div>

          {(ledgerEntries.length > 0 || (isEdit && formData.Appl_to_Item_Entry)) && (
            <div className="space-y-2">
              <FieldTitle>Appl.-to Item Entry</FieldTitle>
              <SearchableSelect
                options={ledgerEntries.map(e => ({
                  value: String(e.Entry_No),
                  label: `${e.Entry_No} (Rem: ${e.Remaining_Quantity}) - ${e.Lot_No || "No Lot"}`,
                }))}
                value={formData.Appl_to_Item_Entry ? String(formData.Appl_to_Item_Entry) : ""}
                onValueChange={(v) => handleChange("Appl_to_Item_Entry", Number(v))}
                isLoading={isLoadingLedgerEntries}
                placeholder="Select Entry No."
              />
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Update Line" : "Add Line"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
