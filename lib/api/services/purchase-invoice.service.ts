/**
 * Purchase Invoice API Service
 * Handles creating invoice headers and managing invoice line items.
 * Entities: PurchaseInvoiceHeader, PurchaseInvoiceLine
 */

import { apiPost, apiPatch, apiDelete } from "../client";
import type { ApiError } from "../client";
import type { PurchaseOrderData, PurchaseOrderLineItem } from "./purchase-order.service";

export type { PurchaseOrderData as PurchaseInvoiceData };
export type { PurchaseOrderLineItem as PurchaseInvoiceLineItem };

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

const HEADER_ENTITY = "PurchaseInvoiceHeader";
const LINE_ENTITY = "PurchaseInvoiceLine";

export interface CreatePurchaseInvoiceResponse {
  orderId: string;
  orderNo: string;
}

interface CreateInvoiceApiResponse {
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
 * Create a new purchase invoice header.
 * Returns the document number from BC.
 */
export async function createPurchaseInvoice(
  data: PurchaseOrderData,
): Promise<CreatePurchaseInvoiceResponse> {
  const endpoint = `/${HEADER_ENTITY}?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {
    Document_Type: "Invoice",
    PO_Type: data.poType,
    Service_Type: data.serviceType,
    Buy_from_Vendor_No: data.vendorNo,
    Posting_Date: data.postingDate,
    Order_Date: data.orderDate,
    Document_Date: data.documentDate,
    Vendor_Invoice_No: data.vendorInvoiceNo,
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
    Applies_to_Doc_Type: data.appliesToDocType || "Invoice",
    Applies_to_Doc_No: data.appliesToDocNo || "",
  };

  const filteredPayload = stripEmptyValues(payload);

  // Re-inject required keys even if empty to prevent BC AL parser crash
  filteredPayload.Vendor_Invoice_No = data.vendorInvoiceNo || "";
  filteredPayload.Applies_to_Doc_Type = data.appliesToDocType || "Invoice";
  filteredPayload.Applies_to_Doc_No = data.appliesToDocNo || "";

  console.log("[PI Create] Endpoint:", endpoint);
  console.log("[PI Create] Payload:", JSON.stringify(filteredPayload, null, 2));

  try {
    const response = await apiPost<CreateInvoiceApiResponse>(
      endpoint,
      filteredPayload,
    );

    const orderNo = response.No ?? response.Document_No ?? "";
    return { orderId: orderNo, orderNo };
  } catch (error) {
    console.error("Error creating purchase invoice:", JSON.stringify(error, null, 2));
    throw error as ApiError;
  }
}

/**
 * Add a single line item to an existing purchase invoice.
 */
export async function addSinglePurchaseInvoiceLine(
  documentNo: string,
  lineItem: PurchaseOrderLineItem,
  _locationCode: string,
): Promise<{ Line_No: number; [key: string]: any }> {
  const endpoint = `/${LINE_ENTITY}?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {
    Document_Type: "Invoice",
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
  if (lineItem.tdsSectionCode) payload.TDS_Section_Code = lineItem.tdsSectionCode;
  if (lineItem.faPostingType) payload.FA_Posting_Type = lineItem.faPostingType;
  if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null)
    payload.Salvage_Value = lineItem.salvageValue;
  if (lineItem.exempted !== undefined) payload.Exempted = lineItem.exempted;
  if (lineItem.noOfBags !== undefined && lineItem.noOfBags !== null)
    payload.No_of_Bags = lineItem.noOfBags;
  if (lineItem.gstCredit) payload.GST_Credit = lineItem.gstCredit;

  try {
    return await apiPost<{ Line_No: number; [key: string]: any }>(endpoint, payload);
  } catch (error) {
    console.error("Error adding purchase invoice line:", error);
    throw error as ApiError;
  }
}

/**
 * Update a single line item on an existing purchase invoice.
 */
export async function updateSinglePurchaseInvoiceLine(
  documentNo: string,
  lineNo: number,
  lineItem: Partial<PurchaseOrderLineItem>,
): Promise<{ Line_No: number; [key: string]: any }> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${LINE_ENTITY}(Document_Type='Invoice',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {};
  if (lineItem.type !== undefined) payload.Type = lineItem.type;
  if (lineItem.no !== undefined) payload.No = lineItem.no;
  if (lineItem.quantity !== undefined) payload.Quantity = lineItem.quantity;
  if (lineItem.uom !== undefined) payload.Unit_of_Measure_Code = lineItem.uom;
  if (lineItem.unitPrice !== undefined && lineItem.unitPrice !== null)
    payload.Direct_Unit_Cost = lineItem.unitPrice;
  if (lineItem.discount !== undefined && lineItem.discount !== null)
    payload.Line_Discount_Percent = lineItem.discount;
  if (lineItem.gstGroupCode !== undefined) payload.GST_Group_Code = lineItem.gstGroupCode;
  if (lineItem.hsnSacCode !== undefined) payload.HSN_SAC_Code = lineItem.hsnSacCode;
  if (lineItem.tdsSectionCode !== undefined) payload.TDS_Section_Code = lineItem.tdsSectionCode;
  if (lineItem.faPostingType !== undefined) payload.FA_Posting_Type = lineItem.faPostingType;
  if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null)
    payload.Salvage_Value = lineItem.salvageValue;
  if (lineItem.exempted !== undefined) payload.Exempted = lineItem.exempted;
  if (lineItem.noOfBags !== undefined && lineItem.noOfBags !== null)
    payload.No_of_Bags = lineItem.noOfBags;
  if (lineItem.gstCredit !== undefined) payload.GST_Credit = lineItem.gstCredit;

  try {
    return await apiPatch<{ Line_No: number; [key: string]: any }>(endpoint, payload);
  } catch (error) {
    console.error("Error updating purchase invoice line:", error);
    throw error as ApiError;
  }
}

/**
 * Delete a single line item from an existing purchase invoice.
 */
export async function deleteSinglePurchaseInvoiceLine(
  documentNo: string,
  lineNo: number,
): Promise<void> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${LINE_ENTITY}(Document_Type='Invoice',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  try {
    await apiDelete(endpoint);
  } catch (error) {
    console.error("Error deleting purchase invoice line:", error);
    throw error as ApiError;
  }
}

/**
 * Add multiple line items to an existing purchase invoice.
 */
export async function addPurchaseInvoiceLineItems(
  documentNo: string,
  lineItems: PurchaseOrderLineItem[],
  locationCode: string,
): Promise<void> {
  for (const lineItem of lineItems) {
    await addSinglePurchaseInvoiceLine(documentNo, lineItem, locationCode);
  }
}
