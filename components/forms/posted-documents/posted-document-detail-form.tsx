"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getPostedInwardGateEntryLines,
  getPostedOutwardGateEntryLines,
} from "@/lib/api/services/posted-gate-entry.service";
import {
  getPostedPurchaseCreditMemoLines,
  getPostedPurchaseInvoiceLines,
  getPostedPurchaseReceiptLines,
  getPostedPurchaseReturnShipmentLines,
} from "@/lib/api/services/posted-purchase.service";
import { getPostedSalesCreditMemoLines } from "@/lib/api/services/posted-sales.service";
import { 
  getPostedReportPdf, 
  type PostedReportDocumentType 
} from "@/lib/api/services/posted-report.service";
import { viewPdfFromBase64 } from "@/lib/pdf-utils";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Printer, Undo2, ClipboardCheck, Zap } from "lucide-react";


import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { undoReceipt, undoReturnShipment } from "@/lib/api/services/undo-actions.service";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PostedBardanaDialog } from "./posted-bardana-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { generateQCForm } from "@/lib/api/services/bardana.service";
import { getItemsByNos, Item } from "@/lib/api/services/item.service";



interface PostedDocumentDetailFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: {
    doc?: any;
    entry?: any;
    mode?: string;
  };
}

const EXCLUDED_FIELDS = new Set([
  "id",
  "@odata.etag",
  "No",
  "Gate_Entry_No",
  // Image 1
  "Buy_from_Contact_No",
  "Buy_from_Country_Region_Code",
  "Buy_from_County",
  "BuyFromContactPhoneNo",
  "BuyFromContactMobilePhoneNo",
  "BuyFromContactEmail",
  "Buy_from_Contact",
  "VAT_Reporting_Date",
  "Quote_No",
  "Pre_Assigned_No",
  "Vendor_Order_No",
  "No_Printed",
  "Responsibility_Center",
  "Line_Narration1",
  "Mandi_Name",
  "File_No",
  "Vendor_Authorization_No",
  // Sales specific
  "VAT_Registration_No",
  "Sell_to_County",
  "Sell_to_Country_Region_Code",
  "Sell_to_Contact_No",
  "SellToPhoneNo",
  "SellToMobilePhoneNo",
  "SellToEmail",
  "Sell_to_Contact",
  "Your_Reference",
  "Document_Exchange_Status",
  "GetWorkDescription",
  "Company_Bank_Account_Code",
  "Customer_Posting_Group",
  "EU_3_Party_Trade",
  "GST_Bill_to_State_Code",
  "GST_Ship_to_State_Code",
  "Customer_GST_Reg_No",
  "Ship_to_GST_Reg_No",
  "GST_Customer_Type",
  "Ship_to_GST_Customer_Type",
  "GST_Without_Payment_of_Duty",
  "Bill_Of_Export_No",
  "Bill_Of_Export_Date",
  "e_Commerce_Customer",
  "e_Commerce_Merchant_Id",
  "E_Comm_Merchant_Id",
  "Sale_Return_Type",
  "Acknowledgement_No",
  "Acknowledgement_Date",
  "IRN_Hash",
  "E_Inv_Cancelled_Date",
  "Cancel_Reason",
  "Bill_to_Country_Region_Code",
  "Bill_to_Contact_No",
  "BillToContactPhoneNo",
  "BillToContactMobilePhoneNo",
  "BillToContactEmail",
  "Bill_to_Contact",
  "Shipping_Agent_Service_Code",
  "Package_Tracking_No",
  // Image 2
  "Cancelled",
  "Corrective",
  "Correction",
  "Pay_to_Country_Region_Code",
  "Pay_to_Contact_No",
  "PayToContactPhoneNo",
  "PayToContactMobilePhoneNo",
  "PayToContactEmail",
  "Pay_to_Contact",
  "Pay_to_County",
  "Payment_Discount_Percent",
  "Pmt_Discount_Date",
  "Payment_Method_Code",
  "Tax_Liable",
  "Tax_Area_Code",
  "Payment_Reference",
  "Creditor_No",
  "Reference_Invoice_No",
  // Image 3
  "Vendor_Posting_Group",
  "Ship_to_Code",
  "Ship_to_Name",
  "Ship_to_Address",
  "Ship_to_Address_2",
  "Ship_to_Post_Code",
  "Ship_to_City",
  "Ship_to_County",
  "Ship_to_Country_Region_Code",
  "Ship_to_Contact",
  "Shipment_Method_Code",
  "Expected_Receipt_Date",
  "Remit_to_Code",
  "Remit_to_Name",
  "Remit_to_Address",
  "Remit_to_Address_2",
  "Remit_to_City",
  "Remit_to_County",
  "Remit_to_Post_Code",
  "Remit_to_Country_Region_Code",
  "Remit_to_Contact",
  "Currency_Code",
  "Without_Bill_Of_Entry",
  "Associated_Enterprises",
  "Bill_of_Entry_No",
  "Bill_of_Entry_Date",
  "Bill_of_Entry_Value",
  "Vehicle_No",
  "Vehicle_Type",
  "Shipping_Agent_Code",
  "GST_Invoice",
  "Order_Address_GST_Reg_No",
  "GST_Order_Address_State",
  "Nature_of_Supply",
  "Rate_Change_Applicable",
  "Supply_Finish_Date",
  "POS_as_Vendor_State",
  "POS_Out_Of_India",
]);

export function PostedDocumentDetailForm({
  tabId,
  context = {},
}: PostedDocumentDetailFormProps) {
  const { tabs } = useFormStackContext();
  const currentTab = tabs.find((t) => t.id === tabId);
  const formType = currentTab?.formType;

  const doc = context?.doc || context?.entry;
  const [lines, setLines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [undoingLine, setUndoingLine] = useState<number | null>(null);
  const [generatingQCLine, setGeneratingQCLine] = useState<number | null>(null);
  const [qcDialog, setQcDialog] = useState<{ isOpen: boolean; line: any; qty: string } | null>(null);
  const [bardanaConfig, setBardanaConfig] = useState<{ isOpen: boolean; line: any } | null>(null);
  const [itemConfigs, setItemConfigs] = useState<Record<string, Item>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    actionLabel?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });




  const canUndo = formType === "posted-purchase-receipt" || formType === "posted-purchase-return-shipment";

  const getApiDocType = (): PostedReportDocumentType | null => {
    switch (formType) {
      case "posted-purchase-receipt": return "PurchReceipt";
      case "posted-purchase-invoice": return "PurchInvoice";
      case "posted-purchase-return-shipment": return "PurchReturnShipment";
      case "posted-purchase-credit-memo": return "PurchCreditMemo";
      case "posted-sales-credit-memo": return "SalesCreditMemo";
      default: return null;
    }
  };

  const handlePrint = async () => {
    const apiDocType = getApiDocType();
    if (!apiDocType) {
      toastError(new Error("Print functionality is not available for this document type."));
      return;
    }

    const docNo = doc.No || doc.Gate_Entry_No;
    if (!docNo) return;

    setIsPrinting(true);
    try {
      const base64 = await getPostedReportPdf(apiDocType, docNo);
      if (!base64) {
        toastError(new Error("No report data received from server."));
        return;
      }
      viewPdfFromBase64(base64, `${apiDocType}_${docNo}`);
      toast.success("Report generated successfully.");
    } catch (error: any) {
      console.error("Print error:", error);
      toastError(error, "Failed to generate report.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleUndo = async (lineNo: number) => {
    if (!doc.No) return;
    
    setConfirmDialog({
      isOpen: true,
      title: "Undo Line Item",
      description: "Are you sure you want to undo this line item? This action cannot be reversed.",
      actionLabel: "Undo",
      variant: "destructive",
      onConfirm: async () => {
        setUndoingLine(lineNo);
        try {
          if (formType === "posted-purchase-receipt") {
            await undoReceipt(doc.No, lineNo);
          } else if (formType === "posted-purchase-return-shipment") {
            await undoReturnShipment(doc.No, lineNo);
          }
          toast.success("Line item undone successfully.");
          // Refresh lines
          const docNo = doc.No || doc.Gate_Entry_No;
          let data: any = { value: [] };
          if (formType === "posted-purchase-receipt")
            data = await getPostedPurchaseReceiptLines(docNo);
          else if (formType === "posted-purchase-return-shipment")
            data = await getPostedPurchaseReturnShipmentLines(docNo);
          
          setLines(data.value || []);
        } catch (error: any) {
          console.error("Undo error:", error);
          toastError(error, "Failed to undo line item.");
        } finally {
          setUndoingLine(null);
        }
      }
    });
  };

  const handleGenerateQC = (line: any) => {
    setQcDialog({
      isOpen: true,
      line,
      qty: String(line.Quantity || ""),
    });
  };

  const confirmGenerateQC = async () => {
    if (!qcDialog?.line || !doc.No) return;
    const { line, qty } = qcDialog;
    const numQty = parseFloat(qty);
    
    if (isNaN(numQty) || numQty <= 0) {
      toast.error("Please enter a valid positive quantity.");
      return;
    }

    setGeneratingQCLine(line.Line_No);
    setQcDialog(prev => prev ? { ...prev, isOpen: false } : null);
    
    try {
      await generateQCForm(doc.No, line.Line_No, numQty);
      toast.success("QC form generated successfully.");
    } catch (error: any) {
      console.error("QC generation error:", error);
      toast.error(error.message || "Failed to generate QC form.");
    } finally {
      setGeneratingQCLine(null);
    }
  };

  const handleBardana = (line: any) => {

    setBardanaConfig({ isOpen: true, line });
  };

  useEffect(() => {
    if (!doc?.No && !doc?.Gate_Entry_No) return;

    const fetchLines = async () => {
      setIsLoading(true);
      try {
        let data: any = { value: [] };
        const docNo = doc.No || doc.Gate_Entry_No;

        // Determine which API to call based on the formType
        if (formType === "posted-inward-gate-entry")
          data = await getPostedInwardGateEntryLines(docNo);
        else if (formType === "posted-outward-gate-entry")
          data = await getPostedOutwardGateEntryLines(docNo);
        else if (formType === "posted-purchase-receipt")
          data = await getPostedPurchaseReceiptLines(docNo);
        else if (formType === "posted-purchase-invoice")
          data = await getPostedPurchaseInvoiceLines(docNo);
        else if (formType === "posted-purchase-return-shipment")
          data = await getPostedPurchaseReturnShipmentLines(docNo);
        else if (formType === "posted-purchase-credit-memo")
          data = await getPostedPurchaseCreditMemoLines(docNo);
        else if (formType === "posted-sales-credit-memo")
          data = await getPostedSalesCreditMemoLines(docNo);

        const fetchedLines = data.value || [];
        setLines(fetchedLines);

        // Fetch item configurations for actions (Bardana, QC)
        if (formType === "posted-purchase-receipt" && fetchedLines.length > 0) {
          const itemNos = fetchedLines
            .filter((l: any) => l.Type === "Item" && l.No)
            .map((l: any) => l.No);
          
          if (itemNos.length > 0) {
            try {
              const items = await getItemsByNos(itemNos);
              const configs: Record<string, Item> = {};
              items.forEach((item) => {
                configs[item.No] = item;
              });
              setItemConfigs(configs);
            } catch (err) {

              console.error("Error fetching item configs:", err);
            }
          }
        }
      } catch (error) {

        console.error("Error fetching lines:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLines();
  }, [doc, formType]);

  if (!doc)
    return <div className="p-6 text-center">No document data found.</div>;

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden">
      {/* ── Action Bar ── */}
      <div className="flex items-center justify-end gap-2 border-b px-4 py-2">
        <div className="mr-auto flex items-center gap-2">
          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            Status:
          </span>
          <Badge
            variant="outline"
            className="h-6 border-green-200 bg-green-500/10 px-3 text-[10px] font-bold tracking-wider text-green-600 uppercase"
          >
            Posted
          </Badge>
          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            — {doc.No || doc.Gate_Entry_No}
          </span>
        </div>

        {getApiDocType() && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase"
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
            {isPrinting ? "Generating..." : "Print Report"}
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Details Section - Optimized for 6 columns, no title */}
        <section className="bg-card/30 space-y-2 rounded-lg border p-4 shadow-sm">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {Object.entries(doc).map(([key, value]) => {
              if (typeof value === "object" || EXCLUDED_FIELDS.has(key))
                return null;

              // Date formatting
              let displayValue = String(value);
              if (
                key.toLowerCase().includes("date") &&
                value &&
                typeof value === "string"
              ) {
                try {
                  const date = new Date(value);
                  if (!isNaN(date.getTime()) && value.includes("-")) {
                    const day = String(date.getDate()).padStart(2, "0");
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const year = date.getFullYear();
                    displayValue = `${day}/${month}/${year}`;
                  }
                } catch (e) {
                  // Keep original if parsing fails
                }
              }

              return (
                <div key={key} className="flex flex-col gap-1">
                  <dt className="text-muted-foreground text-xs font-medium">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="text-foreground text-xs font-medium leading-tight">
                    {displayValue}
                  </dd>
                </div>
              );
            })}
          </div>
        </section>

        {/* Lines Section */}
        <section className="bg-card/50 space-y-2 rounded-lg border p-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-1.5">
            <h3 className="text-foreground text-[10px] font-bold tracking-wider uppercase">
              Line Items
            </h3>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {lines.length} Items
            </Badge>
          </div>

          <div className="bg-background rounded-lg border shadow-inner">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {formType === "posted-purchase-invoice" && (
                    <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                      Line No.
                    </TableHead>
                  )}
                  {formType === "posted-inward-gate-entry" || formType === "posted-outward-gate-entry" ? (
                    <>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Line No.
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Source Type
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Source No.
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Source Name
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Challan No.
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Challan Date
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Description
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Type
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        No.
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Description
                      </TableHead>
                      <TableHead className="text-primary text-right h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Quantity
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        UOM
                      </TableHead>
                      <TableHead className="text-primary text-right h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Unit Cost
                      </TableHead>

                      {formType === "posted-purchase-invoice" && (
                        <TableHead className="text-primary text-right h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                          Disc %
                        </TableHead>
                      )}

                      {formType === "posted-purchase-invoice" ||
                      formType === "posted-purchase-credit-memo" ? (
                        <>
                          <TableHead className="text-primary text-right h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                            Amount
                          </TableHead>
                          <TableHead className="text-primary text-right h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                            Disc Amt
                          </TableHead>
                        </>
                      ) : (
                        <TableHead className="text-primary text-right h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                          Qty Invoiced
                        </TableHead>
                      )}

                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Dim 1
                      </TableHead>
                      <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                        Dim 2
                      </TableHead>

                      {(formType === "posted-purchase-invoice" ||
                        formType === "posted-purchase-credit-memo") && (
                        <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase">
                          Dim 3
                        </TableHead>
                      )}
                    </>
                  )}
                  {canUndo && (
                    <TableHead className="text-primary h-8 px-3 text-[10px] font-bold tracking-wider uppercase text-center">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell
                        colSpan={
                          formType === "posted-purchase-invoice"
                            ? 13
                            : formType === "posted-purchase-credit-memo"
                              ? 11
                              : formType === "posted-inward-gate-entry" || formType === "posted-outward-gate-entry"
                              ? 7
                              : (canUndo ? 10 : 9)
                        }
                      >
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : lines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        formType === "posted-purchase-invoice"
                          ? 13
                          : formType === "posted-purchase-credit-memo"
                            ? 11
                            : formType === "posted-inward-gate-entry" || formType === "posted-outward-gate-entry"
                              ? 7
                              : (canUndo ? 10 : 9)
                      }
                      className="h-32 text-center"
                    >
                      <div className="text-muted-foreground flex flex-col items-center justify-center">
                        <p className="text-sm font-medium">
                          No line items found
                        </p>
                        <p className="text-xs">
                          This document has no recorded lines.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line: any, index: number) => (
                    <TableRow
                      key={line.Line_No || index}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {formType === "posted-inward-gate-entry" || formType === "posted-outward-gate-entry" ? (
                        <>
                          <TableCell className="text-muted-foreground font-mono text-[10px]">
                            {line.Line_No}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-[10px] font-medium">
                            {line.Source_Type || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {line.Source_No || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs font-semibold">
                            {line.Source_Name || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {line.Challan_No || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs">
                            {line.Challan_Date ? (() => {
                              const date = new Date(line.Challan_Date);
                              if (isNaN(date.getTime())) return line.Challan_Date;
                              const day = String(date.getDate()).padStart(2, "0");
                              const month = String(date.getMonth() + 1).padStart(2, "0");
                              const year = date.getFullYear();
                              return `${day}/${month}/${year}`;
                            })() : "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs">
                            {line.Description || "-"}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          {formType === "posted-purchase-invoice" && (
                            <TableCell className="text-muted-foreground font-mono text-[10px]">
                              {line.Line_No}
                            </TableCell>
                          )}
                          <TableCell className="px-3 py-2 text-[10px] font-medium">
                            {line.Type || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {line.No || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs font-semibold">
                            {line.Description || line.Item_Description || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">
                            {line.Quantity
                              ? Number(line.Quantity).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] font-medium">
                            {line.Unit_of_Measure_Code || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right font-mono text-xs">
                            {line.Direct_Unit_Cost
                              ? Number(line.Direct_Unit_Cost).toLocaleString()
                              : "-"}
                          </TableCell>

                          {formType === "posted-purchase-invoice" && (
                            <TableCell className="text-right font-mono text-xs">
                              {line.Line_Discount_Percent
                                ? Number(
                                    line.Line_Discount_Percent,
                                  ).toLocaleString()
                                : "0"}
                            </TableCell>
                          )}

                          {formType === "posted-purchase-invoice" ||
                          formType === "posted-purchase-credit-memo" ? (
                            <>
                              <TableCell className="px-3 py-2 text-right font-mono text-xs font-bold">
                                {line.Line_Amount
                                  ? Number(line.Line_Amount).toLocaleString()
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-orange-600">
                                {line.Line_Discount_Amount
                                  ? Number(
                                      line.Line_Discount_Amount,
                                    ).toLocaleString()
                                  : "0"}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell className="px-3 py-2 text-right font-mono text-xs">
                              {line.Quantity_Invoiced
                                ? Number(line.Quantity_Invoiced).toLocaleString()
                                : "-"}
                            </TableCell>
                          )}

                          <TableCell className="px-3 py-2 text-[10px] font-medium">
                            {line.Shortcut_Dimension_1_Code || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-[10px] font-medium">
                            {line.Shortcut_Dimension_2_Code || "-"}
                          </TableCell>
                          {(formType === "posted-purchase-invoice" ||
                            formType === "posted-purchase-credit-memo") && (
                            <TableCell className="px-3 py-2 text-[10px] font-medium">
                              {line.ShortcutDimCode_x005B_3_x005D_ || "-"}
                            </TableCell>
                          )}
                        </>
                      )}
                      {(canUndo || formType === "posted-purchase-receipt") && (
                        <TableCell className="px-3 py-1 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {formType === "posted-purchase-receipt" && line.Type === "Item" && line.No && (
                              <>
                                {itemConfigs[line.No]?.QC_Required && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                                          onClick={() => handleGenerateQC(line)}
                                          disabled={generatingQCLine === line.Line_No}
                                        >
                                          {generatingQCLine === line.Line_No ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <ClipboardCheck className="h-3.5 w-3.5" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>QC Generate</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {itemConfigs[line.No]?.Bardana_Generation_Enable && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                          onClick={() => handleBardana(line)}
                                        >
                                          <Package className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Bardana Details</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </>
                            )}

                            {canUndo && line.Type && line.Type.trim() !== "" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                      onClick={() => handleUndo(line.Line_No)}
                                      disabled={undoingLine === line.Line_No}
                                    >
                                      {undoingLine === line.Line_No ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Undo2 className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Undo {formType === "posted-purchase-receipt" ? "Receipt" : "Return Shipment"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {qcDialog && (
        <Dialog 
          open={qcDialog.isOpen} 
          onOpenChange={(open) => setQcDialog(prev => prev ? { ...prev, isOpen: open } : null)}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate QC Form</DialogTitle>
              <DialogDescription>
                Enter the quantity for item {qcDialog.line.No} to generate the QC form.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="qty" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={qcDialog.qty}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && parseFloat(val) < 0) return;
                    setQcDialog(prev => prev ? { ...prev, qty: val } : null);
                  }}
                  className="col-span-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmGenerateQC();
                    } else if (e.key === '-' || e.key === 'e') {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQcDialog(prev => prev ? { ...prev, isOpen: false } : null)}>
                Cancel
              </Button>
              <Button onClick={confirmGenerateQC}>
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {bardanaConfig && (
        <PostedBardanaDialog
          isOpen={bardanaConfig.isOpen}
          onOpenChange={(open) => setBardanaConfig(open ? bardanaConfig : null)}
          postedDocNo={doc.No}
          lineNo={bardanaConfig.line.Line_No}
          itemNo={bardanaConfig.line.No}
          itemDescription={bardanaConfig.line.Description || bardanaConfig.line.Item_Description}
          orderNo={doc.Order_No}
        />
      )}

      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmDialog.variant}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
              }}
            >
              {confirmDialog.actionLabel || "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
