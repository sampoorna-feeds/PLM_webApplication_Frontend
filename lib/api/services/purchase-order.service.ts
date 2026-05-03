/**
 * Purchase Order API Service
 * Handles creating purchase orders and adding line items
 */

import { apiPost, apiPatch, apiDelete } from "../client";
import type { ApiError } from "../client";
import { buildPurchaseHeaderPayload } from "./purchase-header-payload";
import { toUpperCaseValues } from "./payload-utils";
import {
  buildCreatePurchaseLinePayload,
  buildUpdatePurchaseLinePayload,
} from "./purchase-line-payload";

export interface PurchaseOrderData {
  vendorNo: string;
  vendorName?: string;
  shipToCode?: string;
  purchasePersonCode?: string;
  locationCode?: string;
  postingDate: string;
  documentDate: string;
  orderDate: string;
  externalDocumentNo?: string;
  vendorInvoiceNo?: string;
  invoiceType?: string;
  lob?: string;
  branch?: string;
  loc?: string;
  // New fields
  poType?: string;
  serviceType?: string;
  vendorGstRegNo?: string;
  vendorPanNo?: string;
  brokerNo?: string;
  brokerName?: string;
  brokerageRate?: string | number;
  orderAddressCode?: string;
  orderAddressState?: string;
  rateBasis?: string;
  termCode?: string;
  mandiName?: string;
  paymentTermCode?: string;
  dueDateCalculation?: string;
  creditorType?: string;
  qcType?: string;
  dueDate?: string;
  vendorCrMemoNo?: string;
  appliesToDocType?: string;
  appliesToDocNo?: string;
  vendorAuthorizationNo?: string;
  no?: string;
  paymentMethodCode?: string;
}

export interface PurchaseOrderLineItem {
  type: "" | "G/L Account" | "Item" | "Fixed Asset" | "Charge (Item)";
  no: string;
  description: string;
  uom?: string;
  quantity: number;
  price?: number;
  unitPrice: number;
  discount: number;
  amount: number;
  exempted?: boolean;
  gstGroupCode?: string;
  hsnSacCode?: string;
  tdsSectionCode?: string;
  faPostingType?: string;
  salvageValue?: number;
  noOfBags?: number;
  gstCredit?: string;
}

export interface CreatePurchaseOrderResponse {
  orderId: string;
  orderNo: string;
}

/** API may return the created entity with No (document number) */
interface CreatePurchaseOrderApiResponse {
  No?: string;
  PO_No?: string;
  Document_No?: string;
  docNo?: string;
  orderId?: string;
  orderNo?: string;
  [key: string]: unknown;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Fetch the next document number for a service-type purchase order.
 */
export async function createNoSeriesForPO(postingDate: string): Promise<string> {
  const endpoint = `/API_CreateNoSeriesForVouchers?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<{ value: string }>(endpoint, {
    seriesCode: "POS",
    postingDate,
  });
  return response.value;
}

/**
 * Create a new purchase order
 * Returns the order ID and order number. API returns document number as "No".
 */
export async function createPurchaseOrder(
  orderData: PurchaseOrderData,
): Promise<CreatePurchaseOrderResponse> {
  try {
    const endpoint = `/PurchaseOrder?company='${encodeURIComponent(COMPANY)}'`;
    const filteredPayload = buildPurchaseHeaderPayload(orderData, {
      documentType: "Order",
      includePoType: true,
      includeServiceType: true,
      includeOrderDate: true,
      includeInvoiceType: true,
      includeVendorInvoiceNo: true,
      includeOrderAddressState: true,
      includeQcType: true,
      includeRateBasis: true,
      includeTermsCode: true,
      includeDueDateCalculation: true,
      includeDueDate: true,
      includePoExpirationDate: true,
      includeAppliesToFields: true,
      stripEmpty: true,
    });

    if (orderData.no) {
      filteredPayload.No = orderData.no;
    }

    console.log("[PO Create] Endpoint:", endpoint);
    console.log(
      "[PO Create] Payload:",
      JSON.stringify(filteredPayload, null, 2),
    );

    const response = await apiPost<CreatePurchaseOrderApiResponse>(
      endpoint,
      filteredPayload,
    );

    if (!response) {
      return { orderId: "", orderNo: "" };
    }

    // API may return document number under different key names
    const orderNo =
      response.No ??
      response.PO_No ??
      response.Document_No ??
      response.docNo ??
      response.orderNo ??
      "";
    const orderId = response.orderId ?? orderNo;

    return { orderId, orderNo };
  } catch (error) {
    console.error(
      "Error creating purchase order:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Add line items to an existing purchase order.
 * Company is passed as query parameter; body only includes required fields.
 */
export async function addPurchaseOrderLineItems(
  documentNo: string,
  lineItems: PurchaseOrderLineItem[],
  _locationCode: string,
): Promise<void> {
  if (!documentNo || lineItems.length === 0) {
    return;
  }

  const endpoint = `/PurchaseLine?company='${encodeURIComponent(COMPANY)}'`;

  try {
    for (const lineItem of lineItems) {
      const payload = buildCreatePurchaseLinePayload(
        "Order",
        documentNo,
        lineItem,
      );

      await apiPost(endpoint, payload);
    }
  } catch (error) {
    console.error("Error adding purchase order line items:", error);
    throw error as ApiError;
  }
}

/**
 * Add a single line item to an existing purchase order.
 * Returns the line record with the Line_No populated from BC.
 */
export async function addSinglePurchaseOrderLine(
  documentNo: string,
  lineItem: PurchaseOrderLineItem,
  _locationCode: string,
): Promise<{ Line_No: number; [key: string]: any }> {
  const endpoint = `/PurchaseLine?company='${encodeURIComponent(COMPANY)}'`;
  const payload = buildCreatePurchaseLinePayload("Order", documentNo, lineItem);

  try {
    const response = await apiPost<{ Line_No: number; [key: string]: any }>(
      endpoint,
      payload,
    );
    return response;
  } catch (error) {
    console.error("Error adding single purchase order line:", error);
    throw error as ApiError;
  }
}

/**
 * Update a single line item on an existing purchase order.
 */
export async function updateSinglePurchaseOrderLine(
  documentNo: string,
  lineNo: number,
  lineItem: Partial<PurchaseOrderLineItem>,
): Promise<{ Line_No: number; [key: string]: any }> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/PurchaseLine(Document_Type='Order',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  const payload = buildUpdatePurchaseLinePayload(lineItem);

  try {
    const response = await apiPatch<{ Line_No: number; [key: string]: any }>(
      endpoint,
      payload,
    );
    return response;
  } catch (error) {
    console.error("Error updating single purchase order line:", error);
    throw error as ApiError;
  }
}

/**
 * Delete a single line item from an existing purchase order.
 */
export async function deleteSinglePurchaseOrderLine(
  orderNo: string,
  lineNo: number,
): Promise<void> {
  const endpoint = `/API_PurchaseOrderLine?company='${encodeURIComponent(COMPANY)}'`;
  try {
    await apiPost(endpoint, { orderNo, lineNo });
  } catch (error) {
    console.error("Error deleting single purchase order line:", error);
    throw error as ApiError;
  }
}

/**
 * Upload a PDF attachment to an existing purchase order.
 * The file must be base64-encoded.
 */
export async function uploadPurchaseAttachment(
  orderNo: string,
  fileName: string,
  fileBase64: string,
): Promise<void> {
  const endpoint = `/API_InitiateUploadFilePurchase?company='${encodeURIComponent(COMPANY)}'`;
  try {
    await apiPost(endpoint, {
      recNo: orderNo.toUpperCase(),
      fileName: fileName.toUpperCase(),
      fileEncodedTextDialog: fileBase64,
    });
  } catch (error) {
    console.error("Error uploading purchase attachment:", error);
    throw error as ApiError;
  }
}

/**
 * Add a bardana line for a purchase order line item.
 */
export async function addBardanaLine(
  documentNo: string,
  documentLineNo: number,
  itemNo: string,
  uom: string,
  quantity: number,
): Promise<any> {
  const endpoint = `/QCPurchaseBardanaList?company='${encodeURIComponent(COMPANY)}'`;
  try {
    const response = await apiPost<any>(endpoint, {
      Document_Type: "Order",
      Document_No: documentNo.toUpperCase(),
      Document_Line_No: documentLineNo,
      Item_No: itemNo.toUpperCase(),
      UOM: uom.toUpperCase(),
      Quantity: quantity,
    });
    return response;
  } catch (error) {
    console.error("Error adding bardana line:", error);
    throw error as ApiError;
  }
}

/**
 * Delete a bardana line.
 */
export async function deleteBardanaLine(
  documentNo: string,
  documentLineNo: number,
  lineNo: number,
): Promise<void> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/QCPurchaseBardanaList(Document_Type='Order',Document_No='${encodeURIComponent(escapedNo)}',Document_Line_No=${documentLineNo},Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;

  try {
    await apiDelete(endpoint);
  } catch (error) {
    console.error("Error deleting bardana line:", error);
    throw error as ApiError;
  }
}
