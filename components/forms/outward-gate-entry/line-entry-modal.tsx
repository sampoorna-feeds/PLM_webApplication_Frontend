"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { type OutwardGateEntryLine } from "@/lib/api/services/outward-gate-entry.service";
import { Loader2, Save, Search } from "lucide-react";
import { SourceLookupModal } from "./source-lookup-modal";

interface LineEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (line: Partial<OutwardGateEntryLine>) => Promise<void>;
  initialData?: Partial<OutwardGateEntryLine>;
  mode: "add" | "edit";
  branchCode?: string;
  locationCode?: string;
}

export function LineEntryModal({ isOpen, onClose, onSave, initialData, mode, branchCode, locationCode }: LineEntryModalProps) {
  const [formData, setFormData] = useState<Partial<OutwardGateEntryLine>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        Source_Type: "Posted Purchase Return Shipment",
        Challan_Date: new Date().toISOString().split("T")[0]
      });
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Remove Source_Name as it's a read-only field in the API
      const { Source_Name, ...dataToSave } = formData;
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error("Error saving line:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSourceSelect = (no: string, item: any) => {
    const name =
      item.Buy_from_Vendor_Name ||
      item.Sell_to_Customer_Name ||
      (formData.Source_Type === "Transfer Shipment" ? item.Transfer_to_Name : item.Transfer_from_Name) ||
      "";
    
    setFormData((prev) => ({
      ...prev,
      Source_No: no,
      Source_Name: name,
    }));
    setIsLookupOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider">
              {mode === "add" ? "Add New Line Item" : "Edit Line Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase tracking-wider">Challan No.</Label>
              <Input
                value={formData.Challan_No || ""}
                onChange={(e) => setFormData({ ...formData, Challan_No: e.target.value })}
                className="col-span-3 h-8 text-xs"
                placeholder="Enter Challan Number"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase tracking-wider">Challan Date</Label>
              <div className="col-span-3">
                <DateInput
                  value={formData.Challan_Date || ""}
                  onChange={(v) => setFormData({ ...formData, Challan_Date: v })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase tracking-wider">Source Type</Label>
              <div className="col-span-3">
                <Select
                  value={formData.Source_Type || ""}
                  onValueChange={(v) => setFormData({ ...formData, Source_Type: v, Source_No: "", Source_Name: "" })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Source Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Posted Purchase Return Shipment">Posted Purchase Return Shipment</SelectItem>
                    <SelectItem value="Transfer Shipment">Transfer Shipment</SelectItem>
                    <SelectItem value="Sales Shipment">Sales Shipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase tracking-wider">Source No.</Label>
              <div 
                className="relative col-span-3 cursor-pointer"
                onClick={() => setIsLookupOpen(true)}
              >
                <Input
                  value={formData.Source_No || ""}
                  onChange={(e) => setFormData({ ...formData, Source_No: e.target.value })}
                  className="h-8 pr-8 text-xs cursor-pointer"
                  placeholder="Select Source Number"
                  readOnly
                />
                <div className="absolute top-0 right-0 flex h-8 w-8 items-center justify-center">
                  <Search className="text-muted-foreground h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase tracking-wider">Source Name</Label>
              <Input
                value={formData.Source_Name || ""}
                onChange={(e) => setFormData({ ...formData, Source_Name: e.target.value })}
                className="col-span-3 h-8 bg-muted/50 text-xs"
                placeholder="Enter Source Name"
                readOnly
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase tracking-wider">Description</Label>
              <Input
                value={formData.Description || ""}
                onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                className="col-span-3 h-8 text-xs"
                placeholder="Enter Description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-[10px] font-bold uppercase tracking-wider">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider">
              {isSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
              {mode === "add" ? "Add Line" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SourceLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        onSelect={handleSourceSelect}
        sourceType={formData.Source_Type as any}
        branchCode={branchCode}
        locationCode={locationCode}
      />
    </>
  );
}
