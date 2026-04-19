"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  submitSalesPostedLine,
  type SalesGetPostedLineDocType,
} from "@/lib/api/services/sales-get-posted-line.service";
import { ItemChargeSourceLine } from "@/lib/api/services/item-charge-assignment.service";
import { ItemChargeSelectionDialog } from "@/components/forms/purchase/item-charge-selection-dialog";

interface SalesGetPostedLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNo: string;
  docType: SalesGetPostedLineDocType;
  customerNo?: string;
  currencyCode?: string;
  onSuccess: () => void;
}

// Invoice → Posted Sales Shipment lines; CreditMemo → Posted Return Receipt lines
const DOC_TYPE_SOURCE_TYPE = {
  Invoice: "SalesShipment",
  CreditMemo: "ReturnReceipt",
} as const;

export function SalesGetPostedLineDialog({
  open,
  onOpenChange,
  documentNo,
  docType,
  customerNo,
  currencyCode,
  onSuccess,
}: SalesGetPostedLineDialogProps) {
  const [, setIsSubmitting] = useState(false);

  const sourceType = DOC_TYPE_SOURCE_TYPE[docType];

  const extraFilters = useMemo(() => {
    const filters: string[] = [];
    if (docType === "Invoice") {
      filters.push("Quantity_Invoiced lt Quantity");
    } else {
      filters.push("Quantity_Invoiced lt Quantity");
    }
    if (customerNo) {
      filters.push(`Sell_to_Customer_No eq '${customerNo.replace(/'/g, "''")}'`);
    }
    if (currencyCode !== undefined) {
      filters.push(`Currency_Code eq '${currencyCode.replace(/'/g, "''")}'`);
    }
    return filters;
  }, [docType, customerNo, currencyCode]);

  const handleLinesSelected = async (lines: ItemChargeSourceLine[]) => {
    if (lines.length === 0) return;
    setIsSubmitting(true);
    try {
      for (const line of lines) {
        await submitSalesPostedLine(
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
