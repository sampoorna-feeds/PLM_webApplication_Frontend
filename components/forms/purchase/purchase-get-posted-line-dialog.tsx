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
  onSuccess: () => void;
}

// Invoice → Receipt lines; CreditMemo → Sales Shipment lines
const DOC_TYPE_SOURCE_TYPE = {
  Invoice: "Receipt",
  CreditMemo: "SalesShipment",
} as const;

export function PurchaseGetPostedLineDialog({
  open,
  onOpenChange,
  documentNo,
  docType,
  vendorNo,
  onSuccess,
}: PurchaseGetPostedLineDialogProps) {
  const [, setIsSubmitting] = useState(false);

  const sourceType = DOC_TYPE_SOURCE_TYPE[docType];

  const extraFilters = useMemo(() => {
    const filters: string[] = ["Qty_Rcd_Not_Invoiced ne 0"];
    if (vendorNo) {
      filters.push(`Buy_from_Vendor_No eq '${vendorNo.replace(/'/g, "''")}'`);
    }
    return filters;
  }, [vendorNo]);

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

