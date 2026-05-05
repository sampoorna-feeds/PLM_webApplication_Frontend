"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Package, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculatorInput } from "@/components/ui/calculator-input";
import { FieldTitle } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ItemSelect } from "./item-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createTransferLine,
  updateTransferLine,
  getTransferItemLedgerEntries,
  getTransferItems,
  getTransferItemByNo,
  type TransferItem,
  type TransferLine,
  type TransferItemLedgerEntry,
} from "@/lib/api/services/transfer-orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransferBardanaDialog } from "./transfer-bardana-dialog";

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
  const [items, setItems] = useState<TransferItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<TransferItemLedgerEntry[]>([]);
  const [isLoadingLedgerEntries, setIsLoadingLedgerEntries] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBardanaOpen, setIsBardanaOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [canAddBardana, setCanAddBardana] = useState(false);

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
    GST_Credit: "Non-Availment", // Default to Non-Availment
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
        GST_Credit: "Non-Availment",
      });
    }
  }, [line, documentNo, defaultDimensions, isOpen]);

  useEffect(() => {
    const loadItems = async () => {
      setIsLoadingItems(true);
      try {
        const data = await getTransferItems(searchQuery || undefined);
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
        const entries = await getTransferItemLedgerEntries(formData.Item_No, locationCode);
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

  // Check if bardana can be added
  useEffect(() => {
    const checkBardana = async () => {
      if (!formData.Item_No) {
        setCanAddBardana(false);
        return;
      }
      try {
        const item = items.find(i => i.No === formData.Item_No) || await getTransferItemByNo(formData.Item_No);
        setCanAddBardana(item?.Bardana_Generation_Enable === true);
      } catch (err) {
        setCanAddBardana(false);
      }
    };
    if (isOpen) checkBardana();
  }, [formData.Item_No, items, isOpen]);

  const handleItemChange = async (itemNo: string) => {
    const item = await getTransferItemByNo(itemNo);
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
      GST_Credit: formData.GST_Credit,
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
      <DialogContent showCloseButton={false} className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between border-b pb-3 space-y-0">
          <DialogTitle>{isEdit ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
          <div className="flex items-center gap-2">
            {isEdit && canAddBardana && (
              <Button
                variant="ghost"
                type="button"
                size="sm"
                className="flex items-center gap-2 text-primary hover:bg-primary/5 h-8 px-2 mr-2"
                onClick={() => setIsBardanaOpen(true)}
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Add Bardana</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 px-3"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update Line" : "Add Line"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1 -mr-1 mt-4">
          {formData.Description && (
            <div className="text-sm px-1">
              <span className="text-muted-foreground font-medium mr-1.5">Description:</span>
              <span className="text-foreground font-medium">{formData.Description}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-12">
            {/* Row 1 */}
            <div className="space-y-1 sm:col-span-5">
              <FieldTitle>Item No. <span className="text-red-500">*</span></FieldTitle>
              <ItemSelect
                value={formData.Item_No || ""}
                onChange={(v, item) => {
                  if (item) {
                    setFormData(prev => ({
                      ...prev,
                      Item_No: item.No,
                      Description: item.Description,
                      Unit_of_Measure_Code: item.Base_Unit_of_Measure,
                    }));
                    handleItemChange(item.No);
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      Item_No: "",
                      Description: "",
                      Unit_of_Measure_Code: "",
                    }));
                  }
                }}
                locationCode={locationCode}
                placeholder="Select Item"
                disabled={isEdit}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldTitle required>Quantity</FieldTitle>
              <CalculatorInput
                value={formData.Quantity || ""}
                onValueChange={(v) => handleChange("Quantity", v)}
                placeholder="0.00"
                className="h-8"
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <FieldTitle>UOM</FieldTitle>
              <Input
                value={formData.Unit_of_Measure_Code || ""}
                readOnly
                className="bg-muted h-8 text-xs font-medium"
              />
            </div>

            <div className="space-y-1 sm:col-span-3">
              <FieldTitle>GST Credit</FieldTitle>
              <SearchableSelect
                options={[
                  { value: "Availment", label: "Availment" },
                  { value: "Non-Availment", label: "Non-Availment" },
                ]}
                value={formData.GST_Credit || "Availment"}
                onValueChange={(v) => handleChange("GST_Credit", v)}
                placeholder="Select GST Credit"
                allowCustomValue={true}
              />
            </div>

            {/* Row 2 */}
            <div className="space-y-1 sm:col-span-3">
              <FieldTitle>Transfer Price</FieldTitle>
              <CalculatorInput
                value={formData.Transfer_Price || ""}
                onValueChange={(v) => handleChange("Transfer_Price", v)}
                placeholder="0.00"
                className="h-8"
                onFocus={(e) => e.target.select()}
              />
            </div>

            <div className="space-y-1 sm:col-span-3">
              <FieldTitle>Amount</FieldTitle>
              <Input
                type="number"
                value={formData.Amount}
                readOnly
                className="bg-muted font-bold h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5 md:col-span-6">
              {isLoadingLedgerEntries ? (
                <div className="h-full flex items-end pb-1 gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground italic">Fetching entries...</span>
                </div>
              ) : (ledgerEntries.length > 0 || (isEdit && formData.Appl_to_Item_Entry)) ? (
                <>
                  <FieldTitle>Appl.-to Item Entry</FieldTitle>
                  <div className="relative">
                    <Input
                      value={formData.Appl_to_Item_Entry ? String(formData.Appl_to_Item_Entry) : ""}
                      readOnly
                      onClick={() => !isLoadingLedgerEntries && setIsLedgerModalOpen(true)}
                      placeholder="Click to select Entry No."
                      className="h-8 cursor-pointer pr-10 text-xs font-medium"
                    />
                    <div
                      className="absolute top-2 right-3 cursor-pointer opacity-50 transition-opacity hover:opacity-100"
                      onClick={() => !isLoadingLedgerEntries && setIsLedgerModalOpen(true)}
                    >
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                </>
              ) : formData.Item_No ? (
                <div className="h-full flex items-end pb-1">
                  <span className="text-[10px] text-red-500/80 italic">No applicable entries found for this item/location</span>
                </div>
              ) : (
                <div className="h-full flex items-end pb-1">
                  <span className="text-[10px] text-muted-foreground italic">Select an item to view available entries</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Dialog open={isLedgerModalOpen} onOpenChange={setIsLedgerModalOpen}>
          <DialogContent className="flex max-h-[85vh] w-fit max-w-[95vw] sm:max-w-[95vw] flex-col overflow-hidden p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Select Ledger Entry</DialogTitle>
              <div className="relative mt-4">
                <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                  placeholder="Search by Entry No., Document No., or Lot No..."
                  value={ledgerSearchQuery}
                  onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 pt-0">
              <div className="border-border overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10 whitespace-nowrap">
                    <TableRow>
                      <TableHead className="w-[100px]">Entry No.</TableHead>
                      <TableHead>Posting Date</TableHead>
                      <TableHead>Document No.</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Rem. Qty</TableHead>
                      <TableHead>Lot No.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries
                      .filter(
                        (e) =>
                          e.Entry_No.toString().includes(ledgerSearchQuery) ||
                          e.Document_No?.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
                          e.Lot_No?.toLowerCase().includes(ledgerSearchQuery.toLowerCase())
                      )
                      .map((entry) => (
                        <TableRow
                          key={entry.Entry_No}
                          className="hover:bg-muted/50 cursor-pointer transition-colors whitespace-nowrap"
                          onClick={() => {
                            handleChange("Appl_to_Item_Entry", entry.Entry_No);
                            setIsLedgerModalOpen(false);
                          }}
                        >
                          <TableCell className="font-bold">{entry.Entry_No}</TableCell>
                          <TableCell>
                            {entry.Posting_Date ? formatDate(new Date(entry.Posting_Date)) : "-"}
                          </TableCell>
                          <TableCell>{entry.Document_No}</TableCell>
                          <TableCell className="text-right">
                            {entry.Quantity?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {entry.Remaining_Quantity?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">{entry.Lot_No || "-"}</TableCell>
                        </TableRow>
                      ))}
                    {ledgerEntries.length === 0 && !isLoadingLedgerEntries && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                          No ledger entries found for this item and location.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter className="bg-muted/20 border-t p-4">
              <Button variant="outline" onClick={() => setIsLedgerModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      </DialogContent>

      {isBardanaOpen && (
        <TransferBardanaDialog
          isOpen={isBardanaOpen}
          onOpenChange={setIsBardanaOpen}
          documentNo={documentNo}
          lineNo={line?.Line_No || 0}
          locationCode={locationCode}
          lineDescription={formData.Description}
        />
      )}
    </Dialog>
  );
}
