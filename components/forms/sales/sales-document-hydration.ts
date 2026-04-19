/**
 * Maps API response objects to the form state used by
 * SalesCreateDocumentFormContent.
 */

import type { SalesOrder, SalesLine } from "@/lib/api/services/sales-orders.service";
import type { SalesDocumentHeaderFormState } from "./sales-document-header-data";

/** Safe string coercion for OData fields that can be anything. */
export function toStringValue(val: unknown): string {
  if (val == null) return "";
  return String(val);
}

/** Map a SalesOrder API header to the create-form state. */
export function mapSalesHeaderToFormData(
  header: SalesOrder,
): SalesDocumentHeaderFormState {
  return {
    customerNo: toStringValue(header.Sell_to_Customer_No),
    customerName: toStringValue(header.Sell_to_Customer_Name),
    customerPriceGroup: toStringValue(header.Customer_Price_Group),
    shipToCode: toStringValue(header.Ship_to_Code),
    salesPersonCode: toStringValue(header.Salesperson_Code),
    salesPersonName: "",
    locationCode: toStringValue(header.Location_Code),
    postingDate: toStringValue(header.Posting_Date),
    documentDate: toStringValue(header.Document_Date),
    orderDate: toStringValue(header.Order_Date),
    externalDocumentNo: toStringValue(header.External_Document_No),
    invoiceType: toStringValue(header.Invoice_Type).trim(),
    lob: toStringValue(header.Shortcut_Dimension_1_Code),
    branch: toStringValue(header.Shortcut_Dimension_2_Code),
    loc: toStringValue(header.Shortcut_Dimension_3_Code),
  };
}

export interface SalesLineItem {
  id: string;
  lineNo?: number;
  type: "Item" | "G/L Account";
  no: string;
  description: string;
  uom: string;
  quantity: number;
  qtyToShip: number;
  qtyToInvoice: number;
  unitPrice: number;
  lineDiscountPercent: number;
  lineAmount: number;
  amtToCustomer: number;
  gstGroupCode: string;
  hsnSacCode: string;
  exempted: boolean;
  locationCode: string;
  lob: string;
  branch: string;
  foc: boolean;
}

/** Map a SalesLine API object to our internal line item. */
export function mapSalesLineToLineItem(line: SalesLine): SalesLineItem {
  const lineNo = line.Line_No ?? 0;
  return {
    id: `line-${lineNo}-${line.No ?? ""}`,
    lineNo: lineNo > 0 ? lineNo : undefined,
    type: (line.Type as "Item" | "G/L Account") || "Item",
    no: toStringValue(line.No),
    description:
      [line.Description, line.Description_2].filter(Boolean).join(" ") || "",
    uom:
      toStringValue(line.Unit_of_Measure_Code) ||
      toStringValue(line.Unit_of_Measure),
    quantity: line.Quantity ?? 0,
    qtyToShip: line.Qty_to_Ship ?? 0,
    qtyToInvoice: line.Qty_to_Invoice ?? 0,
    unitPrice: line.Unit_Price ?? 0,
    lineDiscountPercent: line.Line_Discount_Percent ?? 0,
    lineAmount: line.Line_Amount ?? 0,
    amtToCustomer:
      line.Amt_to_Customer ?? line.Line_Amount ?? 0,
    gstGroupCode: toStringValue(line.GST_Group_Code),
    hsnSacCode: toStringValue(line.HSN_SAC_Code),
    exempted: !!line.Exempted,
    locationCode: toStringValue(line.Location_Code),
    lob: toStringValue(line.Shortcut_Dimension_1_Code),
    branch: toStringValue(line.Shortcut_Dimension_2_Code),
    foc: !!line.FOC,
  };
}
