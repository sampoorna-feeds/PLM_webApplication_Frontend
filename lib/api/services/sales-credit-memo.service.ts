/**
 * Sales Credit Memo API Service
 * Handles creating sales credit memos and managing credit memo lines.
 */

import { apiPost, apiPatch } from "../client";
import { toUpperCaseValues } from "./payload-utils";
import type { ApiError } from "../client";
import type { SalesDocumentHeaderData } from "@/components/forms/sales/sales-document-header-data";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";
const HEADER_ENTITY = "SalesCreditMemoHeader";
const LINE_ENTITY = "SalesCreditMemoLine";
const DOCUMENT_TYPE = "Credit Memo";

export interface CreateSalesDocumentResponse {
  orderId: string;
  orderNo: string;
}

interface CreateSalesDocumentApiResponse {
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
  foc?: boolean;
  faPostingType?: string;
}

function stripNullish(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null) acc[key] = value;
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

/** Create a new sales credit memo header. */
export async function createSalesCreditMemo(
  data: SalesDocumentHeaderData,
): Promise<CreateSalesDocumentResponse> {
  try {
    const endpoint = `/${HEADER_ENTITY}?company='${encodeURIComponent(COMPANY)}'`;
    const payload = {
      Document_Type: DOCUMENT_TYPE,
      Sell_to_Customer_No: data.customerNo,
      Ship_to_Code: data.shipToCode || "",
      Salesperson_Code: data.salesPersonCode || "",
      Location_Code: data.locationCode || "",
      Posting_Date: data.postingDate,
      Document_Date: data.documentDate,
      External_Document_No: data.externalDocumentNo || "",
      Invoice_Type: data.invoiceType || "Bill of supply",
      Shortcut_Dimension_1_Code: data.lob || "",
      Shortcut_Dimension_2_Code: data.branch || "",
    };
    const response = await apiPost<CreateSalesDocumentApiResponse>(
      endpoint,
      toUpperCaseValues(payload, ["Document_Type", "Type"]),
    );
    if (!response) return { orderId: "", orderNo: "" };
    const orderNo = response.No ?? response.orderNo ?? "";
    return { orderId: response.orderId ?? orderNo, orderNo };
  } catch (error) {
    throw error as ApiError;
  }
}

/** Create a minimal sales credit memo header for the Copy Document flow. */
export async function createSalesCreditMemoCopyHeader(
  locationCode: string,
  lobCode: string,
  branchCode: string,
): Promise<CreateSalesDocumentResponse> {
  try {
    const endpoint = `/${HEADER_ENTITY}?company='${encodeURIComponent(COMPANY)}'`;
    const payload = {
      Location_Code: locationCode,
      Shortcut_Dimension_1_Code: lobCode,
      Shortcut_Dimension_2_Code: branchCode,
      Shortcut_Dimension_3_Code: locationCode,
    };
    const response = await apiPost<CreateSalesDocumentApiResponse>(
      endpoint,
      toUpperCaseValues(payload, ["Document_Type", "Type"]),
    );
    if (!response) return { orderId: "", orderNo: "" };
    const orderNo = response.No ?? response.orderNo ?? "";
    return { orderId: response.orderId ?? orderNo, orderNo };
  } catch (error) {
    throw error as ApiError;
  }
}

/** Add multiple line items to a credit memo in sequence. */
export async function addSalesCreditMemoLineItems(
  documentNo: string,
  lineItems: SalesDocumentLineItem[],
  locationCode: string,
): Promise<void> {
  if (!documentNo || lineItems.length === 0) return;
  const endpoint = `/${LINE_ENTITY}?company='${encodeURIComponent(COMPANY)}'`;
  for (const item of lineItems) {
    const linePayload: Record<string, unknown> = toUpperCaseValues({
      Document_No: documentNo,
      Type: item.type,
      No: item.no,
      Quantity: item.quantity,
    }, ["Document_Type", "Type"]);
    if (locationCode) {
      linePayload.Location_Code = locationCode;
      linePayload.ShortcutDimCode3 = locationCode;
    }
    if (item.uom) linePayload.Unit_of_Measure_Code = item.uom;
    await apiPost(endpoint, linePayload);
  }
}

/** Add a single line to an existing credit memo. */
export async function addSingleSalesCreditMemoLine(
  documentNo: string,
  line: SalesDocumentLineItem,
  locationCode: string,
): Promise<{ Line_No: number; [key: string]: unknown }> {
  const endpoint = `/${LINE_ENTITY}?company='${encodeURIComponent(COMPANY)}'`;
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
  if (line.discount != null) payload.Line_Discount_Percent = line.discount;
  if (line.exempted != null) payload.Exempted = line.exempted;
  if (line.gstGroupCode) payload.GST_Group_Code = line.gstGroupCode;
  if (line.hsnSacCode) payload.HSN_SAC_Code = line.hsnSacCode;
  if (line.foc != null) payload.FOC = line.foc;
  if (line.faPostingType) payload.FA_Posting_Type = line.faPostingType;
  const result = await apiPost<{ Line_No: number; [key: string]: unknown }>(
    endpoint,
    toUpperCaseValues(payload, ["Document_Type", "Type"]),
  );
  return result ?? { Line_No: 0 };
}

/** Update an existing credit memo line. */
export async function updateSingleSalesCreditMemoLine(
  documentNo: string,
  lineNo: number,
  body: Partial<SalesDocumentLineItem>,
): Promise<{ Line_No: number; [key: string]: unknown }> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${LINE_ENTITY}(Document_Type='${encodeURIComponent(DOCUMENT_TYPE)}',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  const payload = stripNullish(body as Record<string, unknown>);
  const result = await apiPatch<{ Line_No: number; [key: string]: unknown }>(
    endpoint,
    toUpperCaseValues(payload, ["Document_Type", "Type"]),
  );
  return result ?? { Line_No: lineNo };
}

/** Delete a single credit memo line. */
export async function deleteSingleSalesCreditMemoLine(
  documentNo: string,
  lineNo: number,
): Promise<void> {
  const endpoint = `/API_SalesOrderLine?company='${encodeURIComponent(COMPANY)}'`;
  await apiPost(endpoint, { orderNo: documentNo, lineNo });
}
