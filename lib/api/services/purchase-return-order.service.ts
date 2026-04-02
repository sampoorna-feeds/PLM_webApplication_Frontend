/**
 * Purchase Return Order API Service
 * Handles creating return order headers and managing return order line items.
 * Entities: PurchaseReturnOrderHeader, PurchaseReturnOrderLine
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import type { ApiError } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";
import type {
  PurchaseOrderData,
  PurchaseOrderLineItem,
} from "./purchase-order.service";
import type { PurchaseOrder, PurchaseLine } from "./purchase-orders.service";

export type { PurchaseOrderData as PurchaseReturnOrderData };
export type { PurchaseOrderLineItem as PurchaseReturnOrderLineItem };

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

const HEADER_ENTITY = "PurchaseReturnOrderHeader";
const LINE_ENTITY = "PurchaseReturnOrderLine";

export interface CreatePurchaseReturnOrderResponse {
  orderId: string;
  orderNo: string;
}

interface CreateReturnOrderApiResponse {
  No?: string;
  Document_No?: string;
  [key: string]: unknown;
}

function stripEmptyValues(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && value.trim() === "")
      ) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

/**
 * Create a new purchase return order header.
 */
export async function createPurchaseReturnOrder(
  data: PurchaseOrderData,
): Promise<CreatePurchaseReturnOrderResponse> {
  const endpoint = `/${HEADER_ENTITY}?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {
    Document_Type: "Return Order",
    PO_Type: data.poType,
    Service_Type: data.serviceType,
    Buy_from_Vendor_No: data.vendorNo,
    Posting_Date: data.postingDate,
    Order_Date: data.orderDate,
    Document_Date: data.documentDate,
    Vendor_Cr_Memo_No: data.vendorCrMemoNo,
    Vendor_Authorization_No: data.vendorAuthorizationNo,
    Applies_to_Doc_Type: data.appliesToDocType || "Invoice",
    Applies_to_Doc_No: data.appliesToDocNo,
    Purchaser_Code: data.purchasePersonCode,
    Due_Date_calculation: data.dueDateCalculation,
    Brokerage_Code: data.brokerNo,
    Brokerage_Rate:
      data.brokerageRate === "" ||
      data.brokerageRate === null ||
      data.brokerageRate === undefined
        ? 0
        : Number(data.brokerageRate),
    Rate_Basis: data.rateBasis,
    QCType: data.qcType,
    Terms_Code: data.termCode,
    Mandi_Name: data.mandiName,
    Payment_Terms_Code: data.paymentTermCode,
    Location_Code: data.locationCode,
    Creditors_Type: data.creditorType,
    Shortcut_Dimension_3_Code: data.loc,
    Responsibility_Center: data.lob,
    Shortcut_Dimension_1_Code: data.lob || "",
    Shortcut_Dimension_2_Code: data.branch || "",
    Order_Address_Code: data.orderAddressCode,
    GST_Order_Address_State: data.orderAddressState,
    Due_Date: data.dueDate,
  };

  const filteredPayload = stripEmptyValues(payload);

  // Re-inject the required fields even if empty, so AL parser doesn't crash on missing keys
  filteredPayload.Vendor_Cr_Memo_No = data.vendorCrMemoNo || "";
  filteredPayload.Vendor_Authorization_No = data.vendorAuthorizationNo || "";
  filteredPayload.Applies_to_Doc_Type = data.appliesToDocType || "Invoice";
  filteredPayload.Applies_to_Doc_No = data.appliesToDocNo || "";

  console.log("[PRO Create] Endpoint:", endpoint);
  console.log(
    "[PRO Create] Payload:",
    JSON.stringify(filteredPayload, null, 2),
  );

  try {
    const response = await apiPost<CreateReturnOrderApiResponse>(
      endpoint,
      filteredPayload,
    );

    const orderNo = response.No ?? response.Document_No ?? "";
    return { orderId: orderNo, orderNo };
  } catch (error) {
    console.error(
      "Error creating purchase return order:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Get a single purchase return order by document number.
 */
export async function getPurchaseReturnOrderByNo(
  documentNo: string,
): Promise<PurchaseOrder | null> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const filter = `No eq '${escapedNo}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/${HEADER_ENTITY}?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseOrder>>(endpoint);
  const value = response.value;
  return value && value.length > 0 ? value[0] : null;
}

/**
 * Get purchase return-order lines by document number.
 */
export async function getPurchaseReturnOrderLines(
  documentNo: string,
): Promise<PurchaseLine[]> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const filter = `Document_No eq '${escapedNo}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/${LINE_ENTITY}?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseLine>>(endpoint);
  return response.value || [];
}

/**
 * Patch purchase return-order header fields by document number.
 */
export async function patchPurchaseReturnOrderHeader(
  documentNo: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${HEADER_ENTITY}(Document_Type='Return Order',No='${encodeURIComponent(escapedNo)}')?company='${encodeURIComponent(COMPANY)}'`;
  const payload = stripEmptyValues(body);
  return apiPatch<unknown>(endpoint, payload);
}

/**
 * Delete a purchase return-order header by key.
 * Use only after deleting child purchase return-order lines.
 */
export async function deletePurchaseReturnOrderHeader(
  documentNo: string,
): Promise<unknown> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${HEADER_ENTITY}(Document_Type='Return Order',No='${encodeURIComponent(escapedNo)}')?company='${encodeURIComponent(COMPANY)}'`;
  return apiDelete<unknown>(endpoint);
}

/**
 * Add a single line item to an existing purchase return order.
 */
export async function addSinglePurchaseReturnOrderLine(
  documentNo: string,
  lineItem: PurchaseOrderLineItem,
  _locationCode: string,
): Promise<{ Line_No: number; [key: string]: any }> {
  const endpoint = `/${LINE_ENTITY}?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {
    Document_Type: "Return Order",
    Document_No: documentNo,
    Type: lineItem.type,
    No: lineItem.no,
    Quantity: lineItem.quantity,
    Unit_of_Measure_Code: lineItem.uom || "",
  };

  if (lineItem.unitPrice !== undefined && lineItem.unitPrice !== null)
    payload.Direct_Unit_Cost = lineItem.unitPrice;
  if (lineItem.discount !== undefined && lineItem.discount !== null)
    payload.Line_Discount_Percent = lineItem.discount;
  if (lineItem.gstGroupCode) payload.GST_Group_Code = lineItem.gstGroupCode;
  if (lineItem.hsnSacCode) payload.HSN_SAC_Code = lineItem.hsnSacCode;
  if (lineItem.tdsSectionCode)
    payload.TDS_Section_Code = lineItem.tdsSectionCode;
  if (lineItem.faPostingType) payload.FA_Posting_Type = lineItem.faPostingType;
  if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null)
    payload.Salvage_Value = lineItem.salvageValue;
  if (lineItem.exempted !== undefined) payload.Exempted = lineItem.exempted;
  if (lineItem.noOfBags !== undefined && lineItem.noOfBags !== null)
    payload.No_of_Bags = lineItem.noOfBags;
  if (lineItem.gstCredit) payload.GST_Credit = lineItem.gstCredit;

  try {
    return await apiPost<{ Line_No: number; [key: string]: any }>(
      endpoint,
      payload,
    );
  } catch (error) {
    console.error("Error adding purchase return order line:", error);
    throw error as ApiError;
  }
}

/**
 * Update a single line item on an existing purchase return order.
 */
export async function updateSinglePurchaseReturnOrderLine(
  documentNo: string,
  lineNo: number,
  lineItem: Partial<PurchaseOrderLineItem>,
): Promise<{ Line_No: number; [key: string]: any }> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${LINE_ENTITY}(Document_Type='Return Order',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {};
  if (lineItem.type !== undefined) payload.Type = lineItem.type;
  if (lineItem.no !== undefined) payload.No = lineItem.no;
  if (lineItem.quantity !== undefined) payload.Quantity = lineItem.quantity;
  if (lineItem.uom !== undefined) payload.Unit_of_Measure_Code = lineItem.uom;
  if (lineItem.unitPrice !== undefined && lineItem.unitPrice !== null)
    payload.Direct_Unit_Cost = lineItem.unitPrice;
  if (lineItem.discount !== undefined && lineItem.discount !== null)
    payload.Line_Discount_Percent = lineItem.discount;
  if (lineItem.gstGroupCode !== undefined)
    payload.GST_Group_Code = lineItem.gstGroupCode;
  if (lineItem.hsnSacCode !== undefined)
    payload.HSN_SAC_Code = lineItem.hsnSacCode;
  if (lineItem.tdsSectionCode !== undefined)
    payload.TDS_Section_Code = lineItem.tdsSectionCode;
  if (lineItem.faPostingType !== undefined)
    payload.FA_Posting_Type = lineItem.faPostingType;
  if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null)
    payload.Salvage_Value = lineItem.salvageValue;
  if (lineItem.exempted !== undefined) payload.Exempted = lineItem.exempted;
  if (lineItem.noOfBags !== undefined && lineItem.noOfBags !== null)
    payload.No_of_Bags = lineItem.noOfBags;
  if (lineItem.gstCredit !== undefined) payload.GST_Credit = lineItem.gstCredit;

  try {
    return await apiPatch<{ Line_No: number; [key: string]: any }>(
      endpoint,
      payload,
    );
  } catch (error) {
    console.error("Error updating purchase return order line:", error);
    throw error as ApiError;
  }
}

/**
 * Delete a single line item from an existing purchase return order.
 */
export async function deleteSinglePurchaseReturnOrderLine(
  documentNo: string,
  lineNo: number,
): Promise<void> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${LINE_ENTITY}(Document_Type='Return Order',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  try {
    await apiDelete(endpoint);
  } catch (error) {
    console.error("Error deleting purchase return order line:", error);
    throw error as ApiError;
  }
}

/**
 * Add multiple line items to an existing purchase return order.
 */
export async function addPurchaseReturnOrderLineItems(
  documentNo: string,
  lineItems: PurchaseOrderLineItem[],
  locationCode: string,
): Promise<void> {
  for (const lineItem of lineItems) {
    await addSinglePurchaseReturnOrderLine(documentNo, lineItem, locationCode);
  }
}
