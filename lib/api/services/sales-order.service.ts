/**
 * Sales Order API Service
 * Handles creating sales orders and managing order lines (create-time operations).
 * For list/CRUD on existing orders, see sales-orders.service.ts.
 */

import { apiPost, apiPatch } from "../client";
import type { ApiError } from "../client";
import type { SalesDocumentHeaderData } from "@/components/forms/sales/sales-document-header-data";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";
const LINE_ENTITY = "SalesLine";
const DOCUMENT_TYPE = "Order";

function stripNullish(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null) acc[key] = value;
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

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
  mrp?: number;
  discount?: number;
  amount?: number;
  exempted?: boolean;
  gstGroupCode?: string;
  hsnSacCode?: string;
  tdsGroupCode?: string;
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
    const linePayload: Record<string, unknown> = {
      Document_No: documentNo,
      Type: item.type,
      No: item.no,
      Quantity: item.quantity,
    };
    if (locationCode) {
      linePayload.Location_Code = locationCode;
      linePayload.ShortcutDimCode3 = locationCode;
    }
    if (item.uom) linePayload.Unit_of_Measure_Code = item.uom;
    await apiPost(endpoint, linePayload);
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
    Quantity: line.quantity,
  };
  if (locationCode) {
    payload.Location_Code = locationCode;
    payload.ShortcutDimCode3 = locationCode;
  }
  if (line.uom) payload.Unit_of_Measure_Code = line.uom;
  if (line.description != null) payload.Description = line.description;
  if (line.unitPrice != null) payload.Unit_Price = line.unitPrice;
  if (line.mrp != null) payload.MRP_Price = line.mrp;
  if (line.discount != null) payload.Line_Discount_Percent = line.discount;
  if (line.exempted != null) payload.Exempted = line.exempted;
  if (line.gstGroupCode) payload.GST_Group_Code = line.gstGroupCode;
  if (line.hsnSacCode) payload.HSN_SAC_Code = line.hsnSacCode;
  if (line.foc != null) payload.FOC = line.foc;
  if (line.faPostingType) payload.FA_Posting_Type = line.faPostingType;
  const result = await apiPost<{ Line_No: number; [key: string]: unknown }>(
    endpoint,
    payload,
  );
  return result ?? { Line_No: 0 };
}

/** Update an existing sales order line (partial PATCH). Caller passes BC field names. */
export async function updateSingleSalesOrderLine(
  documentNo: string,
  lineNo: number,
  body: Record<string, unknown>,
): Promise<{ Line_No: number; [key: string]: unknown }> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${LINE_ENTITY}(Document_Type='${encodeURIComponent(DOCUMENT_TYPE)}',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  const payload = stripNullish(body);
  const result = await apiPatch<{ Line_No: number; [key: string]: unknown }>(
    endpoint,
    payload,
  );
  return result ?? { Line_No: lineNo };
}
