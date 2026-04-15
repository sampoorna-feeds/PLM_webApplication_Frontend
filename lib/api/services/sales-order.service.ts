/**
 * Sales Order API Service
 * Handles creating sales orders and managing order lines (create-time operations).
 * For list/CRUD on existing orders, see sales-orders.service.ts.
 */

import { apiPost } from "../client";
import type { ApiError } from "../client";
import type { SalesDocumentHeaderData } from "@/components/forms/sales/sales-document-header-data";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface CreateSalesDocumentResponse {
  orderId: string;
  orderNo: string;
}

interface CreateSalesOrderApiResponse {
  No?: string;
  orderId?: string;
  orderNo?: string;
  [key: string]: unknown;
}

export interface SalesDocumentLineItem {
  type: "G/L Account" | "Item" | "Fixed Asset" | "Charge (Item)" | "";
  no: string;
  description?: string;
  uom?: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  amount?: number;
  exempted?: boolean;
  gstGroupCode?: string;
  hsnSacCode?: string;
  tdsGroupCode?: string;
  gstCredit?: string;
  foc?: boolean;
  faPostingType?: string;
}

/**
 * Create a new sales order header.
 * Returns the order ID and order number (API returns document number as "No").
 */
export async function createSalesOrder(
  data: SalesDocumentHeaderData,
): Promise<CreateSalesDocumentResponse> {
  try {
    const endpoint = `/SalesOrder?company='${encodeURIComponent(COMPANY)}'`;
    const payload = {
      Document_Type: "Order",
      Sell_to_Customer_No: data.customerNo,
      Ship_to_Code: data.shipToCode || "",
      Salesperson_Code: data.salesPersonCode || "",
      Location_Code: data.locationCode || data.loc || "",
      Posting_Date: data.postingDate,
      Document_Date: data.documentDate,
      Order_Date: data.orderDate || data.postingDate,
      External_Document_No: data.externalDocumentNo || "",
      Invoice_Type: data.invoiceType || "Bill of supply",
      Shortcut_Dimension_1_Code: data.lob || "",
      Shortcut_Dimension_2_Code: data.branch || "",
      Shortcut_Dimension_3_Code: data.loc || "",
    };

    const response = await apiPost<CreateSalesOrderApiResponse>(
      endpoint,
      payload,
    );

    if (!response) return { orderId: "", orderNo: "" };
    const orderNo = response.No ?? response.orderNo ?? "";
    return { orderId: response.orderId ?? orderNo, orderNo };
  } catch (error) {
    throw error as ApiError;
  }
}

/** Add multiple line items to a sales order in sequence. */
export async function addSalesOrderLineItems(
  documentNo: string,
  lineItems: SalesDocumentLineItem[],
  locationCode: string,
): Promise<void> {
  if (!documentNo || lineItems.length === 0) return;
  const endpoint = `/SalesLine?company='${encodeURIComponent(COMPANY)}'`;
  for (const item of lineItems) {
    await apiPost(endpoint, {
      Document_No: documentNo,
      Type: item.type,
      No: item.no,
      Location_Code: locationCode || "",
      Quantity: item.quantity,
      Unit_of_Measure_Code: item.uom || "",
    });
  }
}

/** Add a single line to an existing sales order. */
export async function addSingleSalesOrderLine(
  documentNo: string,
  line: SalesDocumentLineItem,
  locationCode: string,
): Promise<{ Line_No: number; [key: string]: unknown }> {
  const endpoint = `/SalesLine?company='${encodeURIComponent(COMPANY)}'`;
  const payload: Record<string, unknown> = {
    Document_No: documentNo,
    Type: line.type,
    No: line.no,
    Location_Code: locationCode || "",
    Quantity: line.quantity,
    Unit_of_Measure_Code: line.uom || "",
  };
  if (line.description != null) payload.Description = line.description;
  if (line.unitPrice != null) payload.Unit_Price = line.unitPrice;
  if (line.discount != null) payload.Line_Discount_Percent = line.discount;
  if (line.exempted != null) payload.Exempted = line.exempted;
  if (line.gstGroupCode != null) payload.GST_Group_Code = line.gstGroupCode;
  if (line.hsnSacCode != null) payload.HSN_SAC_Code = line.hsnSacCode;
  if (line.gstCredit != null) payload.GST_Credit = line.gstCredit;
  if (line.foc != null) payload.FOC = line.foc;
  if (line.faPostingType != null) payload.FA_Posting_Type = line.faPostingType;
  const result = await apiPost<{ Line_No: number; [key: string]: unknown }>(
    endpoint,
    payload,
  );
  return result ?? { Line_No: 0 };
}
