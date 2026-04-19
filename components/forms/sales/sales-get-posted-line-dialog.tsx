"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  submitSalesPostedLine,
  type SalesGetPostedLineDocType,
} from "@/lib/api/services/sales-get-posted-line.service";
import type { ItemChargeSourceLine, SourceType } from "@/lib/api/services/item-charge-assignment.service";
import { ItemChargeSelectionDialog } from "@/components/forms/purchase/item-charge-selection-dialog";

interface SalesGetPostedLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNo: string;
  docType: SalesGetPostedLineDocType;
  /** Sell-to Customer No. from the sales document header */
  sellToCustomerNo?: string;
  /** Bill-to Customer No. from the sales document header */
  billToCustomerNo?: string;
  /** Currency Code from the sales document header */
  currencyCode?: string;
  onSuccess: () => void;
}

export function SalesGetPostedLineDialog({
  open,
  onOpenChange,
  documentNo,
  docType,
  sellToCustomerNo,
  billToCustomerNo,
  currencyCode,
  onSuccess,
}: SalesGetPostedLineDialogProps) {
  const [, setIsSubmitting] = useState(false);

  // Invoice uses the dedicated GetShipmentLine endpoint with the full BC filter set.
  // CreditMemo uses the standard ReturnReceiptLine endpoint.
  const sourceType: SourceType = docType === "Invoice" ? "GetShipmentLine" : "ReturnReceipt";

  const extraFilters = useMemo(() => {
    if (docType === "Invoice") {
      const filters: string[] = [
        "Qty_Shipped_Not_Invoiced ne 0",
        "Authorized_for_Credit_Card eq false",
      ];
      if (billToCustomerNo) {
        filters.push(`Bill_to_Customer_No eq '${billToCustomerNo.replace(/'/g, "''")}'`);
      }
      if (sellToCustomerNo) {
        filters.push(`Sell_to_Customer_No eq '${sellToCustomerNo.replace(/'/g, "''")}'`);
      }
      if (currencyCode !== undefined) {
        filters.push(`Currency_Code eq '${currencyCode.replace(/'/g, "''")}'`);
      }
      return filters;
    }

    // CreditMemo — return receipt lines not yet fully credited
    const filters: string[] = ["Qty_Rtn_Shipped_Not_Invd ne 0"];
    if (sellToCustomerNo) {
      filters.push(`Sell_to_Customer_No eq '${sellToCustomerNo.replace(/'/g, "''")}'`);
    }
    if (currencyCode !== undefined) {
      filters.push(`Currency_Code eq '${currencyCode.replace(/'/g, "''")}'`);
    }
    return filters;
  }, [docType, sellToCustomerNo, billToCustomerNo, currencyCode]);

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
