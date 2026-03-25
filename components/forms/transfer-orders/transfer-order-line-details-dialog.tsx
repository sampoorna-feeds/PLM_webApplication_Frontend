"use client";

import React, { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateTransferLine,
  checkItemTracking,
  getItemAvailableQuantity,
  getTransferItemByNo,
  getTransferItemLedgerEntries,
  type TransferLine,
  type TransferItemLedgerEntry,
} from "@/lib/api/services/transfer-orders.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  TransferOrderItemTrackingDialog
} from "./transfer-order-item-tracking-dialog";



interface TransferOrderLineDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  line: TransferLine;
  locationCode?: string;
  onSuccess: () => void;
}

export function TransferOrderLineDetailsDialog({
  isOpen,
  onOpenChange,
  line,
  locationCode,
  onSuccess,
}: TransferOrderLineDetailsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTracking, setHasTracking] = useState(false);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<TransferItemLedgerEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);


  const [formData, setFormData] = useState<Partial<TransferLine>>({ ...line });

  useEffect(() => {
    setFormData({ ...line });
    if (isOpen && line?.Item_No && locationCode) {
      const activeLocationCode = locationCode;
      
      const fetchData = async () => {
        setHasTracking(false);
        setAvailableQty(null);
        setIsLoadingTracking(true);
        setIsLoadingStock(true);
        try {
          // Parallel fetch for ledger tracking, stock and item master
          const [ledgerTrackingResult, availableResult, itemResult] = await Promise.all([
            checkItemTracking(line.Item_No!, activeLocationCode),
            getItemAvailableQuantity(line.Item_No!, activeLocationCode),
            getTransferItemByNo(line.Item_No!)
          ]);
          
          // An item has tracking if it either has tracked entries OR is setup for tracking in item master
          const isTrackedInMaster = !!itemResult?.Item_Tracking_Code?.trim();
          const tracked = ledgerTrackingResult || isTrackedInMaster;
          setHasTracking(tracked);
          setAvailableQty(availableResult);

          if (tracked) {
            setIsLoadingLedger(true);
            try {
              const entries = await getTransferItemLedgerEntries(line.Item_No!, activeLocationCode);
              setLedgerEntries(entries);
            } finally {
              setIsLoadingLedger(false);
            }
          }
        } catch (err) {
          console.error("Error fetching line metadata:", err);
        } finally {
          setIsLoadingTracking(false);
          setIsLoadingStock(false);
        }
      };
      fetchData();
    }


  }, [line, isOpen, locationCode]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!line?.Document_No || !line?.Line_No) return;

    // Validation: Qty to Ship <= Available Quantity
    const qtyToShip = Number(formData.Qty_to_Ship);
    if (availableQty !== null && qtyToShip > availableQty) {
      toast.error(`Cannot ship ${qtyToShip}. Only ${availableQty} available at ${locationCode}`);
      return;
    }



    setIsSubmitting(true);
    try {
      await updateTransferLine(line.Document_No, line.Line_No, {
        Description: formData.Description,
        Quantity: Number(formData.Quantity),
        Qty_to_Ship: Number(formData.Qty_to_Ship),
        Qty_to_Receive: Number(formData.Qty_to_Receive),
        GST_Group_Code: formData.GST_Group_Code,
        HSN_SAC_Code: formData.HSN_SAC_Code,
        Exempted: !!formData.Exempted,
        Appl_to_Item_Entry: formData.Appl_to_Item_Entry ? Number(formData.Appl_to_Item_Entry) : undefined,
      });
      toast.success("Line details updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating line:", err);
      toast.error(err.message || "Failed to update line details");
    } finally {
      setIsSubmitting(false);
    }
  };

  const infoLabelClass = "text-muted-foreground text-sm font-medium w-32";
  const infoValueClass = "text-sm font-bold text-white";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0a0a0a] border-[#222] text-white p-0 overflow-hidden rounded-2xl">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className={cn(
                "text-base font-semibold transition-colors duration-300",
                hasTracking ? "text-red-500" : "text-white"
            )}>
              Transfer Line Details 
              {isLoadingTracking ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground animate-pulse">(Checking tracking...)</span>
              ) : hasTracking && (
                <span className="ml-2 animate-in fade-in slide-in-from-left-2 duration-500">(Has Tracking)</span>
              )}
            </h2>

          </div>

          {/* Read-only Info Section - Grid for more width, less height */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
            <div className="flex items-center">
              <span className={infoLabelClass}>Item No.</span>
              <span className={infoValueClass}>{line.Item_No}</span>
            </div>
            <div className="flex items-center">
              <span className={infoLabelClass}>Type</span>
              <span className={infoValueClass}>Item</span>
            </div>
            <div className="flex items-center">
              <span className={infoLabelClass}>UOM</span>
              <span className={infoValueClass}>{line.Unit_of_Measure_Code}</span>
            </div>
            <div className="flex items-center">
              <span className={infoLabelClass}>Quantity</span>
              <span className={infoValueClass}>{line.Quantity?.toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span className={infoLabelClass}>Qty Received</span>
              <span className={infoValueClass}>{line.Quantity_Received?.toLocaleString() || "-"}</span>
            </div>
            <div className="flex items-center">
              <span className={infoLabelClass}>Qty Shipped</span>
              <span className={infoValueClass}>{line.Quantity_Shipped?.toLocaleString() || "0"}</span>
            </div>
            <div className="flex items-center">
              <span className={infoLabelClass}>Available Qty</span>
              <span className={cn(
                infoValueClass,
                availableQty !== null && availableQty <= 0 && "text-red-500",
                isLoadingStock && "animate-pulse"
              )}>
                {isLoadingStock ? "..." : (availableQty?.toLocaleString() ?? "-")}
              </span>
            </div>
          </div>


          {!locationCode && hasTracking && (
            <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium animate-in fade-in zoom-in duration-300">
              Note: Select a source location in the header to manage item tracking correctly.
            </div>
          )}

          <div className="h-px bg-[#222] w-full" />

          {/* Editable Fields Section - 2-column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input
                value={formData.Description || ""}
                onChange={(e) => handleChange("Description", e.target.value)}
                className="bg-[#111] border-[#222] h-9 text-sm text-white focus:border-red-500/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Qty to Ship</label>
              <Input
                type="number"
                value={formData.Qty_to_Ship || ""}
                onChange={(e) => handleChange("Qty_to_Ship", Number(e.target.value))}
                className="bg-[#111] border-[#222] h-9 text-sm text-white focus:border-red-500/50 transition-colors"
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Qty to Receive</label>
              <Input
                type="number"
                value={formData.Qty_to_Receive || ""}
                onChange={(e) => handleChange("Qty_to_Receive", Number(e.target.value))}
                className="bg-[#111] border-[#222] h-9 text-sm text-white focus:border-red-500/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">GST Group Code</label>
              <Input
                value={formData.GST_Group_Code || ""}
                readOnly
                className="bg-[#111]/50 border-[#222] h-9 text-sm text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">HSN/SAC Code</label>
              <Input
                value={formData.HSN_SAC_Code || ""}
                readOnly
                className="bg-[#111]/50 border-[#222] h-9 text-sm text-muted-foreground"
              />
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <div className={cn(
                  "w-4 h-4 rounded border bg-[#111] flex items-center justify-center transition-colors cursor-pointer",
                  formData.Exempted ? "bg-green-600 border-green-600" : "border-[#333]"
              )}
              onClick={() => handleChange("Exempted", !formData.Exempted)}
              >
                  {formData.Exempted && <div className="text-white text-[8px]">✔</div>}
              </div>
              <label className="text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => handleChange("Exempted", !formData.Exempted)}>
                Exempted
              </label>
            </div>

            {hasTracking && (
              <div className="space-y-1.5 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xs font-medium text-muted-foreground">Applies to Entry</label>
                <SearchableSelect
                  options={ledgerEntries.map((e) => ({
                    value: e.Entry_No.toString(),
                    label: `Entry: ${e.Entry_No} | Lot: ${e.Lot_No || "N/A"} | Qty: ${e.Remaining_Quantity}`,
                  }))}
                  value={formData.Appl_to_Item_Entry?.toString() || ""}
                  onValueChange={(v) => handleChange("Appl_to_Item_Entry", v)}
                  placeholder={isLoadingLedger ? "Loading entries..." : "Select Entry No."}
                  className="h-9 transition-all focus:ring-1 focus:ring-red-500/50"
                  disabled={isLoadingLedger}
                />
                
                {formData.Appl_to_Item_Entry && (
                  <div className="mt-3 grid grid-cols-2 gap-4 p-3 rounded-lg bg-[#111] border border-[#222] animate-in slide-in-from-right-2 duration-500">
                    {(() => {
                      const selectedEntry = ledgerEntries.find(e => e.Entry_No.toString() === formData.Appl_to_Item_Entry?.toString());
                      if (!selectedEntry) return null;
                      return (
                        <>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Posting Date</span>
                            <p className="text-xs font-bold text-white">
                              {selectedEntry.Posting_Date ? new Date(selectedEntry.Posting_Date).toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Vehicle No.</span>
                            <p className="text-xs font-bold text-white uppercase">
                              {selectedEntry.Vehicle_No || "N/A"}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}


          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#1a1a1a] border-[#333] hover:bg-[#222] text-white hover:text-white rounded-lg px-8 h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-8 h-9 text-sm"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>

          {hasTracking && (
            <div className="pt-2 border-t border-[#222]">
              <Button
                variant="outline"
                className="w-full text-red-500 border-[#222] hover:bg-red-500/10 hover:text-red-500 font-bold h-10 rounded-xl text-sm"
                onClick={() => setIsTrackingOpen(true)}
              >
                Item Tracking
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      <TransferOrderItemTrackingDialog
        open={isTrackingOpen}
        onOpenChange={setIsTrackingOpen}
        orderNo={line.Document_No}
        locationCode={locationCode || ""}
        line={line}
        onSave={onSuccess}
      />
    </Dialog>
  );
}
