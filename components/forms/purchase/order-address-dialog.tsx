"use client";

/**
 * OrderAddressDialog — Create or Edit an order address for a vendor.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrderAddress,
  updateOrderAddress,
  type OrderAddress,
} from "@/lib/api/services/order-address.service";

interface OrderAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorNo: string;
  /** If provided, the dialog is in edit mode */
  address: OrderAddress | null;
  onSaved: () => void;
}

interface FormFields {
  Code: string;
  Name: string;
  Address: string;
  Address_2: string;
  City: string;
  County: string;
  Post_Code: string;
  Country_Region_Code: string;
  Contact: string;
  Phone_No: string;
}

const emptyForm: FormFields = {
  Code: "",
  Name: "",
  Address: "",
  Address_2: "",
  City: "",
  County: "",
  Post_Code: "",
  Country_Region_Code: "",
  Contact: "",
  Phone_No: "",
};

export function OrderAddressDialog({
  open,
  onOpenChange,
  vendorNo,
  address,
  onSaved,
}: OrderAddressDialogProps) {
  const isEdit = !!address;
  const [form, setForm] = useState<FormFields>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (address) {
      setForm({
        Code: address.Code,
        Name: address.Name || "",
        Address: address.Address || "",
        Address_2: address.Address_2 || "",
        City: address.City || "",
        County: address.County || "",
        Post_Code: address.Post_Code || "",
        Country_Region_Code: address.Country_Region_Code || "",
        Contact: address.Contact || "",
        Phone_No: address.Phone_No || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [address, open]);

  const handleChange = (field: keyof FormFields, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.Code.trim()) {
      toast.error("Code is required");
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit) {
        const { Code, ...updateData } = form;
        await updateOrderAddress(vendorNo, address!.Code, updateData);
        toast.success("Address updated");
      } else {
        await createOrderAddress({
          Vendor_No: vendorNo,
          Code: form.Code,
          Name: form.Name,
          Address: form.Address,
          Address_2: form.Address_2,
          City: form.City,
          County: form.County,
          Post_Code: form.Post_Code,
          Country_Region_Code: form.Country_Region_Code,
          Contact: form.Contact,
          Phone_No: form.Phone_No,
        });
        toast.success("Address created");
      }
      onSaved();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save address");
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = "space-y-1.5";
  const labelClass = "text-xs font-medium";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Order Address" : "New Order Address"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className={fieldClass}>
            <Label className={labelClass}>Code *</Label>
            <Input
              value={form.Code}
              onChange={(e) => handleChange("Code", e.target.value)}
              disabled={isEdit}
              className="h-8"
              placeholder="Address code"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Name</Label>
            <Input
              value={form.Name}
              onChange={(e) => handleChange("Name", e.target.value)}
              className="h-8"
              placeholder="Name"
            />
          </div>
          <div className="col-span-2">
            <div className={fieldClass}>
              <Label className={labelClass}>Address</Label>
              <Input
                value={form.Address}
                onChange={(e) => handleChange("Address", e.target.value)}
                className="h-8"
                placeholder="Address line 1"
              />
            </div>
          </div>
          <div className="col-span-2">
            <div className={fieldClass}>
              <Label className={labelClass}>Address 2</Label>
              <Input
                value={form.Address_2}
                onChange={(e) => handleChange("Address_2", e.target.value)}
                className="h-8"
                placeholder="Address line 2"
              />
            </div>
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>City</Label>
            <Input
              value={form.City}
              onChange={(e) => handleChange("City", e.target.value)}
              className="h-8"
              placeholder="City"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>County</Label>
            <Input
              value={form.County}
              onChange={(e) => handleChange("County", e.target.value)}
              className="h-8"
              placeholder="County"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Post Code</Label>
            <Input
              value={form.Post_Code}
              onChange={(e) => handleChange("Post_Code", e.target.value)}
              className="h-8"
              placeholder="Post code"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Country/Region</Label>
            <Input
              value={form.Country_Region_Code}
              onChange={(e) =>
                handleChange("Country_Region_Code", e.target.value)
              }
              className="h-8"
              placeholder="Country code"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Contact</Label>
            <Input
              value={form.Contact}
              onChange={(e) => handleChange("Contact", e.target.value)}
              className="h-8"
              placeholder="Contact person"
            />
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Phone No</Label>
            <Input
              value={form.Phone_No}
              onChange={(e) => handleChange("Phone_No", e.target.value)}
              className="h-8"
              placeholder="Phone number"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
