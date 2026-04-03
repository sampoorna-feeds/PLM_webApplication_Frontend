"use client";

import React, { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AccountSelect } from "@/components/forms/account-select";
import { DateInput } from "@/components/ui/date-input";
import { 
  type VendorLedgerEntry, 
  createVendorLedgerEntry 
} from "@/lib/api/services/vendor-ledger.service";
import { toast } from "sonner";

interface NewVendorEntryDialogProps {
  onSuccess?: () => void;
  defaultVendorNo?: string;
}

export function NewVendorEntryDialog({ onSuccess, defaultVendorNo }: NewVendorEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<VendorLedgerEntry>>({
    Vendor_No: defaultVendorNo || "",
    Posting_Date: new Date().toISOString().split("T")[0],
    Document_Type: "Invoice",
    Document_No: "",
    External_Document_No: "",
    Amount: 0,
    Description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Vendor_No || !formData.Document_No || !formData.Amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createVendorLedgerEntry(formData);
      toast.success("Vendor ledger entry created successfully.");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating vendor ledger entry:", error);
      toast.error("Failed to create vendor ledger entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Vendor Ledger Entry</DialogTitle>
            <DialogDescription>
              Create a new ledger entry for the selected vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendor" className="text-right">
                Vendor
              </Label>
              <div className="col-span-3">
                <AccountSelect
                  accountType="Vendor"
                  value={formData.Vendor_No || ""}
                  onChange={(val) => setFormData(prev => ({ ...prev, Vendor_No: val }))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Posting Date
              </Label>
              <div className="col-span-3">
                <DateInput
                  value={formData.Posting_Date || ""}
                  onChange={(val) => setFormData(prev => ({ ...prev, Posting_Date: val }))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-no" className="text-right">
                Doc No.
              </Label>
              <Input
                id="doc-no"
                value={formData.Document_No || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, Document_No: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ext-doc-no" className="text-right">
                Ext. Doc No.
              </Label>
              <Input
                id="ext-doc-no"
                value={formData.External_Document_No || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, External_Document_No: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.Amount || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, Amount: parseFloat(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="desc" className="text-right">
                Description
              </Label>
              <Input
                id="desc"
                value={formData.Description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, Description: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
