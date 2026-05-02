/**
 * Unified Purchase Document Adapter Service
 * Centralizes common header/line operations for invoice, return-order, and credit-memo.
 */

import { apiDelete, apiGet, apiPatch, apiPost } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";
import type {
  PurchaseOrderData,
  PurchaseOrderLineItem,
} from "./purchase-order.service";
import type { PurchaseLine, PurchaseOrder } from "./purchase-orders.service";
import {
  buildPurchaseHeaderPayload,
  stripEmptyValues,
  stripNullish,
  type PurchaseDocumentHeaderType,
  type RequiredPurchaseHeaderField,
} from "./purchase-header-payload";
import { toUpperCaseValues } from "./payload-utils";
import {
  buildCreatePurchaseLinePayload,
  buildUpdatePurchaseLinePayload,
} from "./purchase-line-payload";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export type PurchaseDocumentAdapterType =
  | "invoice"
  | "return-order"
  | "credit-memo";

interface PurchaseDocumentAdapterConfig {
  headerEntity: string;
  lineEntity: string;
  documentTypeValue: PurchaseDocumentHeaderType;
  requiredCreateFields: RequiredPurchaseHeaderField[];
  logPrefix: string;
  // Per-type field inclusion flags derived from actual BC API schemas
  includeVendorInvoiceNo: boolean;
  includeVendorCrMemoNo: boolean;
  includeVendorAuthorizationNo: boolean;
  includeInvoiceType: boolean;
  includeQcType: boolean;
  includeOrderDate: boolean;
  includeRateBasis: boolean;
  includeDueDateCalculation: boolean;
  includeDueDate: boolean;
  includeAppliesToFields: boolean;
}

interface CreateHeaderApiResponse {
  No?: string;
  Document_No?: string;
  [key: string]: unknown;
}

const PURCHASE_DOCUMENT_ADAPTER_CONFIG: Record<
  PurchaseDocumentAdapterType,
  PurchaseDocumentAdapterConfig
> = {
  invoice: {
    // Schema: PurchaseInvoiceHeader
    headerEntity: "PurchaseInvoiceHeader",
    lineEntity: "PurchaseInvoiceLine",
    documentTypeValue: "Invoice",
    requiredCreateFields: ["Vendor_Invoice_No"],
    logPrefix: "PI",
    includeVendorInvoiceNo: true,
    includeVendorCrMemoNo: false,
    includeVendorAuthorizationNo: false,
    includeInvoiceType: true,
    includeQcType: false,
    includeOrderDate: false,
    includeRateBasis: true,
    includeDueDateCalculation: true,
    includeDueDate: true,
    includeAppliesToFields: true,
  },
  "return-order": {
    // Schema: PurchaseReturnOrderHeader
    headerEntity: "PurchaseReturnOrderHeader",
    lineEntity: "PurchaseReturnOrderLine",
    documentTypeValue: "Return Order",
    requiredCreateFields: ["Vendor_Cr_Memo_No", "Vendor_Authorization_No"],
    logPrefix: "PRO",
    includeVendorInvoiceNo: false,
    includeVendorCrMemoNo: true,
    includeVendorAuthorizationNo: true,
    includeInvoiceType: false,
    includeQcType: false,
    includeOrderDate: true,
    includeRateBasis: false,
    includeDueDateCalculation: false,
    includeDueDate: false,
    includeAppliesToFields: true,
  },
  "credit-memo": {
    // Schema: PurchaseCreditMemoHeader
    headerEntity: "PurchaseCreditMemoHeader",
    lineEntity: "PurchaseCreditMemoLine",
    documentTypeValue: "Credit Memo",
    requiredCreateFields: ["Vendor_Cr_Memo_No", "Vendor_Authorization_No"],
    logPrefix: "PCM",
    includeVendorInvoiceNo: false,
    includeVendorCrMemoNo: true,
    includeVendorAuthorizationNo: true,
    includeInvoiceType: true,
    includeQcType: true,
    includeOrderDate: false,
    includeRateBasis: false,
    includeDueDateCalculation: true,
    includeDueDate: true,
    includeAppliesToFields: true,
  },
};

export async function createPurchaseDocumentHeader(
  documentType: PurchaseDocumentAdapterType,
  data: PurchaseOrderData,
): Promise<{ orderId: string; orderNo: string }> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const endpoint = `/${config.headerEntity}?company='${encodeURIComponent(COMPANY)}'`;
  const payload = buildPurchaseHeaderPayload(data, {
    documentType: config.documentTypeValue,
    includeVendorInvoiceNo: config.includeVendorInvoiceNo,
    includeVendorCrMemoNo: config.includeVendorCrMemoNo,
    includeVendorAuthorizationNo: config.includeVendorAuthorizationNo,
    includeInvoiceType: config.includeInvoiceType,
    includeQcType: config.includeQcType,
    includeOrderDate: config.includeOrderDate,
    includeRateBasis: config.includeRateBasis,
    includeDueDateCalculation: config.includeDueDateCalculation,
    includeDueDate: config.includeDueDate,
    includeAppliesToFields: config.includeAppliesToFields,
    includeOrderAddressState: true,
    stripEmpty: true,
    requiredFields: config.requiredCreateFields,
  });

  console.log(`[${config.logPrefix} Create] Endpoint:`, endpoint);
  console.log(
    `[${config.logPrefix} Create] Payload:`,
    JSON.stringify(payload, null, 2),
  );

  const response = await apiPost<CreateHeaderApiResponse>(endpoint, payload);
  const orderNo = response.No ?? response.Document_No ?? "";

  return { orderId: orderNo, orderNo };
}

/**
 * Create a lightweight header for copy-first flow using location.
 */
export async function createPurchaseDocumentCopyBootstrapHeader(
  documentType: PurchaseDocumentAdapterType,
  locationCode: string,
): Promise<{ orderId: string; orderNo: string }> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const endpoint = `/${config.headerEntity}?company='${encodeURIComponent(COMPANY)}'`;
  const payload = stripEmptyValues({
    Location_Code: locationCode,
  });

  const response = await apiPost<CreateHeaderApiResponse>(endpoint, payload);
  const orderNo = response.No ?? response.Document_No ?? "";

  return { orderId: orderNo, orderNo };
}

export async function getPurchaseDocumentHeaderByNo(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
): Promise<PurchaseOrder | null> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const escapedNo = documentNo.replace(/'/g, "''");
  const filter = `No eq '${escapedNo}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/${config.headerEntity}?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseOrder>>(endpoint);
  const value = response.value;

  return value && value.length > 0 ? value[0] : null;
}

export async function getPurchaseDocumentLinesByNo(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
): Promise<PurchaseLine[]> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const escapedNo = documentNo.replace(/'/g, "''");
  const filter = `Document_No eq '${escapedNo}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/${config.lineEntity}?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseLine>>(endpoint);

  return response.value || [];
}

export async function patchPurchaseDocumentHeaderByNo(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${config.headerEntity}(Document_Type='${config.documentTypeValue}',No='${encodeURIComponent(escapedNo)}')?company='${encodeURIComponent(COMPANY)}'`;
  const payload = toUpperCaseValues(stripNullish(body), ["Document_Type", "Type"]);
  return apiPatch<unknown>(endpoint, payload);
}

export async function deletePurchaseDocumentHeaderByNo(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
): Promise<unknown> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${config.headerEntity}(Document_Type='${config.documentTypeValue}',No='${encodeURIComponent(escapedNo)}')?company='${encodeURIComponent(COMPANY)}'`;

  return apiDelete<unknown>(endpoint);
}

export async function addSinglePurchaseDocumentLine(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
  lineItem: PurchaseOrderLineItem,
): Promise<{ Line_No: number; [key: string]: unknown }> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const endpoint = `/${config.lineEntity}?company='${encodeURIComponent(COMPANY)}'`;
  const payload = buildCreatePurchaseLinePayload(
    config.documentTypeValue,
    documentNo,
    lineItem,
  );

  return apiPost<{ Line_No: number; [key: string]: unknown }>(
    endpoint,
    payload,
  );
}

export async function updateSinglePurchaseDocumentLine(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
  lineNo: number,
  lineItem: Partial<PurchaseOrderLineItem>,
): Promise<{ Line_No: number; [key: string]: unknown }> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${config.lineEntity}(Document_Type='${config.documentTypeValue}',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  const payload = buildUpdatePurchaseLinePayload(lineItem);

  return apiPatch<{ Line_No: number; [key: string]: unknown }>(
    endpoint,
    payload,
  );
}

export async function deleteSinglePurchaseDocumentLine(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
  lineNo: number,
): Promise<void> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${config.lineEntity}(Document_Type='${config.documentTypeValue}',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;

  await apiDelete(endpoint);
}

export async function patchPurchaseDocumentLineByKey(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
  lineNo: number,
  body: Record<string, unknown>,
): Promise<unknown> {
  const config = PURCHASE_DOCUMENT_ADAPTER_CONFIG[documentType];
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/${config.lineEntity}(Document_Type='${config.documentTypeValue}',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  const payload = toUpperCaseValues(stripNullish(body), ["Document_Type", "Type"]);
  return apiPatch<unknown>(endpoint, payload);
}

export async function addPurchaseDocumentLineItems(
  documentType: PurchaseDocumentAdapterType,
  documentNo: string,
  lineItems: PurchaseOrderLineItem[],
): Promise<void> {
  for (const lineItem of lineItems) {
    await addSinglePurchaseDocumentLine(documentType, documentNo, lineItem);
  }
}
