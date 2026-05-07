"use client";

import { useEffect, useState } from "react";
import { 
  getPostedInwardGateEntryLines,
  getPostedOutwardGateEntryLines,
} from "@/lib/api/services/posted-gate-entry.service";
import {
  getPostedPurchaseReceiptLines,
  getPostedPurchaseInvoiceLines,
  getPostedPurchaseReturnShipmentLines,
  getPostedPurchaseCreditMemoLines,
} from "@/lib/api/services/posted-purchase.service";
import {
  getPostedSalesCreditMemoLines,
} from "@/lib/api/services/posted-sales.service";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  // Image 2
  "Cancelled",
  "Corrective",
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

export function PostedDocumentDetailForm({ tabId, context = {} }: PostedDocumentDetailFormProps) {
  const { tabs } = useFormStackContext();
  const currentTab = tabs.find((t) => t.id === tabId);
  const formType = currentTab?.formType;
  
  const doc = context?.doc || context?.entry;
  const [lines, setLines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!doc?.No && !doc?.Gate_Entry_No) return;

    const fetchLines = async () => {
      setIsLoading(true);
      try {
        let data: any = { value: [] };
        const docNo = doc.No || doc.Gate_Entry_No;

        // Determine which API to call based on the formType
        if (formType === "posted-inward-gate-entry") data = await getPostedInwardGateEntryLines(docNo);
        else if (formType === "posted-outward-gate-entry") data = await getPostedOutwardGateEntryLines(docNo);
        else if (formType === "posted-purchase-receipt") data = await getPostedPurchaseReceiptLines(docNo);
        else if (formType === "posted-purchase-invoice") data = await getPostedPurchaseInvoiceLines(docNo);
        else if (formType === "posted-purchase-return-shipment") data = await getPostedPurchaseReturnShipmentLines(docNo);
        else if (formType === "posted-purchase-credit-memo") data = await getPostedPurchaseCreditMemoLines(docNo);
        else if (formType === "posted-sales-credit-memo") data = await getPostedSalesCreditMemoLines(docNo);

        setLines(data.value || []);
      } catch (error) {
        console.error("Error fetching lines:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLines();
  }, [doc, formType]);

  if (!doc) return <div className="p-6 text-center">No document data found.</div>;

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
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Details Section - Optimized for 6 columns, no title */}
        <section className="space-y-3 rounded-lg border bg-card/30 p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6">
            {Object.entries(doc).map(([key, value]) => {
              if (
                typeof value === "object" || 
                EXCLUDED_FIELDS.has(key)
              ) return null;
              
              // Date formatting
              let displayValue = String(value);
              if (key.toLowerCase().includes("date") && value && typeof value === "string") {
                try {
                  const date = new Date(value);
                  if (!isNaN(date.getTime()) && value.includes("-")) {
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    displayValue = `${day}/${month}/${year}`;
                  }
                } catch (e) {
                  // Keep original if parsing fails
                }
              }
              
              return (
                <div key={key} className="space-y-1">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="text-sm font-medium text-foreground truncate">
                    {displayValue}
                  </dd>
                </div>
              );
            })}
          </div>
        </section>

        {/* Lines Section */}
        <section className="space-y-4 rounded-xl border bg-card/50 p-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Line Items
            </h3>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {lines.length} Items
            </Badge>
          </div>
          
          <div className="rounded-lg border bg-background overflow-hidden shadow-inner">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">No.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Description</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Quantity</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">UOM</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Unit Cost</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Qty Invoiced</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Dim 1</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">Dim 2</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-4 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <p className="text-sm font-medium">No line items found</p>
                        <p className="text-xs">This document has no recorded lines.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line: any, index: number) => (
                    <TableRow key={line.Line_No || index} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-[10px] font-medium text-muted-foreground">{line.Type || "-"}</TableCell>
                      <TableCell className="text-xs font-mono">{line.No || "-"}</TableCell>
                      <TableCell className="text-xs font-semibold">{line.Description || line.Item_Description || "-"}</TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono">
                        {line.Quantity ? Number(line.Quantity).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] font-medium">{line.Unit_of_Measure_Code || "-"}</TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {line.Direct_Unit_Cost ? Number(line.Direct_Unit_Cost).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {line.Quantity_Invoiced ? Number(line.Quantity_Invoiced).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] font-medium">{line.Shortcut_Dimension_1_Code || "-"}</TableCell>
                      <TableCell className="text-[10px] font-medium">{line.Shortcut_Dimension_2_Code || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
