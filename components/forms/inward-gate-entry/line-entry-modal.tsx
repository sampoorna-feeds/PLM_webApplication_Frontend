"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { InwardGateEntryLine } from "@/lib/api/services/inward-gate-entry.service";
import { Loader2, Save } from "lucide-react";

interface LineEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (line: Partial<InwardGateEntryLine>) => Promise<void>;
  initialData?: Partial<InwardGateEntryLine>;
  mode: "add" | "edit";
}

export function LineEntryModal({ isOpen, onClose, onSave, initialData, mode }: LineEntryModalProps) {
  const [formData, setFormData] = useState<Partial<InwardGateEntryLine>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        Source_Type: "Purchase Order",
        Challan_Date: new Date().toISOString().split("T")[0]
      });
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving line:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
                onValueChange={(v) => setFormData({ ...formData, Source_Type: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Source Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Purchase Order">Purchase Order</SelectItem>
                  <SelectItem value="Sales Return Order">Sales Return Order</SelectItem>
                  <SelectItem value="Transfer Receipt">Transfer Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-[10px] font-bold uppercase tracking-wider">Source No.</Label>
            <Input
              value={formData.Source_No || ""}
              onChange={(e) => setFormData({ ...formData, Source_No: e.target.value })}
              className="col-span-3 h-8 text-xs"
              placeholder="Enter Source Number"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-[10px] font-bold uppercase tracking-wider">Source Name</Label>
            <Input
              value={formData.Source_Name || ""}
              onChange={(e) => setFormData({ ...formData, Source_Name: e.target.value })}
              className="col-span-3 h-8 text-xs"
              placeholder="Enter Source Name"
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
  );
}
