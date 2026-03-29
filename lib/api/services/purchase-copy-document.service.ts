/**
 * Purchase Copy Document Service
 * Endpoint: PurchaseCopyDocument
 *
 * Flow:
 * 1. A document header is already created (via createPurchaseInvoice etc.) — we have a `toDocNo`.
 * 2. User picks a `fromDocType` and then selects a source document.
 * 3. We POST to PurchaseCopyDocument to copy the data from the source into our new document.
 */

import { apiGet, apiPost } from "../client";
import type { ApiError } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/** Valid "from" document types for the Copy Document action */
export type PurchaseCopyFromDocType =
  | "Posted Invoice"
  | "Posted Credit Memo"
  | "Posted Return Shipment"
  | "Posted Receipt"
  | "Posted Invoice (Manual)"
  | "Invoice"
  | "Credit Memo"
  | "Return Order"
  | "Order"
  | "Quote"
  | "Blanket Order";

/** Valid "to" document types */
export type PurchaseCopyToDocType =
  | "Invoice"
  | "Credit Memo"
  | "Return Order"
  | "Order";

export interface PurchaseCopyDocumentParams {
  /** The "from" document type */
  fromDocType: PurchaseCopyFromDocType;
  /** The source document number to copy from */
  fromDocNo: string;
  /** The target document type */
  toDocType: PurchaseCopyToDocType;
  /** The target document number (already created header) */
  toDocNo: string;
  /** Whether to recalculate lines. Defaults to false. */
  recalculateLines?: boolean;
  /** Whether to include header. Defaults to true. */
  includeHeader?: boolean;
}

/**
 * Execute copy document from one purchase document to another.
 * The target document must already exist (header created via create* functions).
 */
export async function executePurchaseCopyDocument(
  params: PurchaseCopyDocumentParams,
): Promise<void> {
  const endpoint = `/PurchaseCopyDocument?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {
    fromDocType: params.fromDocType,
    fromDocNo: params.fromDocNo,
    toDocType: params.toDocType,
    toDocNo: params.toDocNo,
    recalculateLines: params.recalculateLines ?? false,
    includeHeader: params.includeHeader ?? true,
  };

  console.log("[CopyDoc] Endpoint:", endpoint);
  console.log("[CopyDoc] Payload:", JSON.stringify(payload, null, 2));

  try {
    await apiPost(endpoint, payload);
  } catch (error) {
    console.error("Error executing purchase copy document:", JSON.stringify(error, null, 2));
    throw error as ApiError;
  }
}

/**
 * From-document-type options available for each target document type.
 * Used to populate the dropdown in the Copy Document dialog.
 */
export const COPY_FROM_DOC_TYPE_OPTIONS: Record<
  PurchaseCopyToDocType,
  { value: PurchaseCopyFromDocType; label: string }[]
> = {
  Invoice: [
    { value: "Order", label: "Purchase Order" },
    { value: "Posted Receipt", label: "Posted Receipt" },
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
    { value: "Invoice", label: "Invoice" },
    { value: "Credit Memo", label: "Credit Memo" },
    { value: "Return Order", label: "Return Order" },
  ],
  "Credit Memo": [
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
    { value: "Posted Return Shipment", label: "Posted Return Shipment" },
    { value: "Invoice", label: "Invoice" },
    { value: "Credit Memo", label: "Credit Memo" },
    { value: "Return Order", label: "Return Order" },
    { value: "Order", label: "Purchase Order" },
  ],
  "Return Order": [
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Receipt", label: "Posted Receipt" },
    { value: "Posted Return Shipment", label: "Posted Return Shipment" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
    { value: "Invoice", label: "Invoice" },
    { value: "Credit Memo", label: "Credit Memo" },
    { value: "Return Order", label: "Return Order" },
    { value: "Order", label: "Purchase Order" },
  ],
  Order: [],
};

export interface SourceDocumentRow {
  no: string;
  vendorNo: string;
  vendorName: string;
  postingDate: string;
  amount: string | number;
}

interface ODataListResponse<T> {
  value: T[];
}

/** OData entity + field mapping for each fromDocType */
const FROM_DOC_TYPE_ENTITY_MAP: Record<
  PurchaseCopyFromDocType,
  { entity: string; noField: string; docTypeFilter?: string }
> = {
  "Posted Invoice": {
    entity: "PurchInvHeader",
    noField: "No",
  },
  "Posted Credit Memo": {
    entity: "PurchCrMemoHdr",
    noField: "No",
  },
  "Posted Return Shipment": {
    entity: "ReturnShipmentHeader",
    noField: "No",
  },
  "Posted Receipt": {
    entity: "PurchRcptHeader",
    noField: "No",
  },
  "Posted Invoice (Manual)": {
    entity: "PurchInvHeader",
    noField: "No",
  },
  Invoice: {
    entity: "PurchaseInvoiceHeader",
    noField: "No",
    docTypeFilter: "Invoice",
  },
  "Credit Memo": {
    entity: "PurchaseCreditMemoHeader",
    noField: "No",
    docTypeFilter: "Credit Memo",
  },
  "Return Order": {
    entity: "PurchaseReturnOrder",
    noField: "No",
    docTypeFilter: "Return Order",
  },
  Order: {
    entity: "PurchaseHeader",
    noField: "No",
    docTypeFilter: "Order",
  },
  Quote: {
    entity: "PurchaseHeader",
    noField: "No",
    docTypeFilter: "Quote",
  },
  "Blanket Order": {
    entity: "PurchaseHeader",
    noField: "No",
    docTypeFilter: "Blanket Order",
  },
};

/**
 * Fetch a list of source documents for the Copy Document selection dialog.
 * Returns the first 50 documents for the given fromDocType.
 */
export async function fetchSourceDocumentsForCopy(
  fromDocType: PurchaseCopyFromDocType,
): Promise<SourceDocumentRow[]> {
  const mapping = FROM_DOC_TYPE_ENTITY_MAP[fromDocType];
  if (!mapping) return [];

  let filter = "";
  if (mapping.docTypeFilter) {
    filter = `&$filter=Document_Type eq '${encodeURIComponent(mapping.docTypeFilter)}'`;
  }

  const select = `$select=No,Buy_from_Vendor_No,Buy_from_Vendor_Name,Posting_Date,Amount`;
  const top = `$top=50`;
  const endpoint = `/${mapping.entity}?company='${encodeURIComponent(COMPANY)}'&${select}&${top}${filter}`;

  try {
    const response = await apiGet<ODataListResponse<Record<string, unknown>>>(endpoint);
    return (response.value ?? []).map((row) => ({
      no: String(row["No"] ?? row["Document_No"] ?? ""),
      vendorNo: String(row["Buy_from_Vendor_No"] ?? ""),
      vendorName: String(row["Buy_from_Vendor_Name"] ?? ""),
      postingDate: String(row["Posting_Date"] ?? ""),
      amount: Number(row["Amount"] ?? row["Amount_Including_VAT"] ?? 0),
    }));
  } catch (error) {
    console.error(`[CopyDoc] Error fetching source docs for ${fromDocType}:`, error);
    throw error as ApiError;
  }
}
