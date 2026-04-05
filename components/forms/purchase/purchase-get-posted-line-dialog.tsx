"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  submitPostedLine,
  type GetPostedLineDocType,
} from "@/lib/api/services/purchase-get-posted-line.service";
import {
  ItemChargeSourceLine,
} from "@/lib/api/services/item-charge-assignment.service";
import { ItemChargeSelectionDialog } from "./item-charge-selection-dialog";

interface PurchaseGetPostedLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNo: string;
  docType: GetPostedLineDocType;
  vendorNo?: string;
  payToVendorNo?: string;
  currencyCode?: string;
  onSuccess: () => void;
}

// Invoice → Purchase Receipt lines; CreditMemo → Return Shipment lines
const DOC_TYPE_SOURCE_TYPE = {
  Invoice: "Receipt",
  CreditMemo: "ReturnShipment",
} as const;

export function PurchaseGetPostedLineDialog({
  open,
  onOpenChange,
  documentNo,
  docType,
  vendorNo,
  payToVendorNo,
  currencyCode,
  onSuccess,
}: PurchaseGetPostedLineDialogProps) {
  const [, setIsSubmitting] = useState(false);

  const sourceType = DOC_TYPE_SOURCE_TYPE[docType];

  const extraFilters = useMemo(() => {
    const filters: string[] = [];
    if (docType === "Invoice") {
      filters.push("Qty_Rcd_Not_Invoiced ne 0");
    } else {
      filters.push("Return_Qty_Shipped_Not_Invd ne 0");
    }
    if (vendorNo) {
      filters.push(`Buy_from_Vendor_No eq '${vendorNo.replace(/'/g, "''")}'`);
    }
    if (payToVendorNo) {
      filters.push(`Pay_to_Vendor_No eq '${payToVendorNo.replace(/'/g, "''")}'`);
    }
    if (currencyCode !== undefined) {
      filters.push(`Currency_Code eq '${currencyCode.replace(/'/g, "''")}'`);
    }
    return filters;
  }, [docType, vendorNo, payToVendorNo, currencyCode]);

  const handleLinesSelected = async (lines: ItemChargeSourceLine[]) => {
    if (lines.length === 0) return;
    setIsSubmitting(true);
    try {
      // Post each selected line sequentially
      for (const line of lines) {
        await submitPostedLine(
          docType,
          documentNo,
          line.Document_No,
          line.Line_No,
        );
      }
      toast.success(
        `${lines.length} line${lines.length > 1 ? "s" : ""} copied successfully`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to get posted lines:", error);
      toast.error("Failed to copy lines. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ItemChargeSelectionDialog
      open={open}
      onOpenChange={onOpenChange}
      type={sourceType}
      extraFilters={extraFilters}
      onAddSelected={handleLinesSelected}
    />
  );
}

