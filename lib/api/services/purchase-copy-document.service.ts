/**
 * Purchase Copy Document Service
 * Endpoint: PurchaseCopyDocument
 *
 * Flow:
 * 1. A non-order document header exists (or is bootstrap-created for copy flow).
 * 2. User picks a source document type and selects a source document.
 * 3. We POST to PurchaseCopyDocument with strict backend payload fields.
 */

import { apiGet, apiPost } from "../client";
import type { ApiError } from "../client";
import { buildODataQuery } from "../endpoints";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

const DEFAULT_PAGE_SIZE = 25;

/** Valid source document types for non-order copy flow */
export type PurchaseCopyFromDocType =
  | "Posted Invoice"
  | "Posted Receipt"
  | "Order"
  | "Posted Credit Memo";

/** Valid "to" document types */
export type PurchaseCopyToDocType =
  | "Invoice"
  | "Credit Memo"
  | "Return Order"
  | "Order";

export interface PurchaseCopyDocumentParams {
  /** Backend field: source document type */
  fromDocType1: PurchaseCopyFromDocType;
  /** Backend field: source document number */
  fromDocNo: string;
  /** Backend field: target purchase header number */
  purchaseHeaderNo: string;
}

/**
 * Execute copy document with strict payload contract.
 */
export async function executePurchaseCopyDocument(
  params: PurchaseCopyDocumentParams,
): Promise<void> {
  const endpoint = `/PurchaseCopyDocument?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {
    fromDocType1: params.fromDocType1,
    fromDocNo: params.fromDocNo,
    purchaseHeaderNo: params.purchaseHeaderNo,
  };

  console.log("[CopyDoc] Endpoint:", endpoint);
  console.log("[CopyDoc] Payload:", JSON.stringify(payload, null, 2));

  try {
    await apiPost(endpoint, payload);
  } catch (error) {
    console.error(
      "Error executing purchase copy document:",
      JSON.stringify(error, null, 2),
    );
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
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Receipt", label: "Posted Receipt" },
    { value: "Order", label: "Purchase Order" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
  ],
  "Credit Memo": [
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Receipt", label: "Posted Receipt" },
    { value: "Order", label: "Purchase Order" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
  ],
  "Return Order": [
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Receipt", label: "Posted Receipt" },
    { value: "Order", label: "Purchase Order" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
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
  "@odata.count"?: number;
}

export type CopySourceSortColumn =
  | "No"
  | "Buy_from_Vendor_No"
  | "Buy_from_Vendor_Name"
  | "Posting_Date"
  | "Amount";

export type CopySourceSortDirection = "asc" | "desc";

export interface CopySourceFilters {
  documentNo?: string;
  vendorNo?: string;
  postingDateFrom?: string;
  postingDateTo?: string;
  locationCode?: string;
}

export interface FetchSourceDocumentsForCopyParams {
  fromDocType: PurchaseCopyFromDocType;
  searchTerm?: string;
  filters?: CopySourceFilters;
  sortBy?: CopySourceSortColumn;
  sortDirection?: CopySourceSortDirection;
  skip?: number;
  top?: number;
}

export interface FetchSourceDocumentsForCopyResult {
  rows: SourceDocumentRow[];
  totalCount: number;
  hasMore: boolean;
  nextSkip: number;
}

/** OData entity mapping for each copy source type */
const FROM_DOC_TYPE_ENTITY_MAP: Record<
  PurchaseCopyFromDocType,
  { entity: string; defaultSort: CopySourceSortColumn }
> = {
  "Posted Invoice": {
    entity: "PostedPurchaseInvoiceH",
    defaultSort: "Posting_Date",
  },
  "Posted Receipt": {
    entity: "PostedPurchaseReceiptH",
    defaultSort: "Posting_Date",
  },
  Order: {
    entity: "PurchaseOrder",
    defaultSort: "No",
  },
  "Posted Credit Memo": {
    entity: "PostedPurchaseCreditMemoH",
    defaultSort: "Posting_Date",
  },
};

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function mapSourceRow(row: Record<string, unknown>): SourceDocumentRow {
  return {
    no: String(row["No"] ?? row["Document_No"] ?? ""),
    vendorNo: String(row["Buy_from_Vendor_No"] ?? ""),
    vendorName: String(row["Buy_from_Vendor_Name"] ?? ""),
    postingDate: String(row["Posting_Date"] ?? row["Document_Date"] ?? ""),
    amount: Number(
      row["Amount"] ?? row["Amount_Including_VAT"] ?? row["Line_Amount"] ?? 0,
    ),
  };
}

function buildSourceFilters(
  searchTerm?: string,
  filters?: CopySourceFilters,
): string | undefined {
  const clauses: string[] = [];

  if (searchTerm && searchTerm.trim()) {
    const escapedSearch = escapeODataValue(searchTerm.trim());
    clauses.push(
      `contains(No,'${escapedSearch}') or contains(Buy_from_Vendor_No,'${escapedSearch}') or contains(Buy_from_Vendor_Name,'${escapedSearch}')`,
    );
  }

  if (filters?.documentNo?.trim()) {
    const escapedDocNo = escapeODataValue(filters.documentNo.trim());
    clauses.push(`contains(No,'${escapedDocNo}')`);
  }

  if (filters?.vendorNo?.trim()) {
    const escapedVendorNo = escapeODataValue(filters.vendorNo.trim());
    clauses.push(`contains(Buy_from_Vendor_No,'${escapedVendorNo}')`);
  }

  if (filters?.postingDateFrom) {
    clauses.push(`Posting_Date ge ${filters.postingDateFrom}`);
  }

  if (filters?.postingDateTo) {
    clauses.push(`Posting_Date le ${filters.postingDateTo}`);
  }

  if (filters?.locationCode?.trim()) {
    const escapedLocationCode = escapeODataValue(filters.locationCode.trim());
    clauses.push(`Location_Code eq '${escapedLocationCode}'`);
  }

  if (clauses.length === 0) {
    return undefined;
  }

  return clauses.map((clause) => `(${clause})`).join(" and ");
}

/**
 * Fetch source documents with server-driven search/filter/sort/paging.
 */
export async function fetchSourceDocumentsForCopy(
  params: FetchSourceDocumentsForCopyParams,
): Promise<FetchSourceDocumentsForCopyResult> {
  const mapping = FROM_DOC_TYPE_ENTITY_MAP[params.fromDocType];
  if (!mapping) {
    return { rows: [], totalCount: 0, hasMore: false, nextSkip: 0 };
  }

  const skip = Math.max(0, params.skip ?? 0);
  const top = Math.max(1, params.top ?? DEFAULT_PAGE_SIZE);
  const filter = buildSourceFilters(params.searchTerm, params.filters);
  const sortBy = params.sortBy ?? mapping.defaultSort;
  const sortDirection = params.sortDirection ?? "desc";

  const query = buildODataQuery({
    $select: "No,Buy_from_Vendor_No,Buy_from_Vendor_Name,Posting_Date,Amount",
    $filter: filter,
    $orderby: `${sortBy} ${sortDirection}`,
    $top: top,
    $skip: skip > 0 ? skip : undefined,
    $count: true,
  });
  const endpoint = `/${mapping.entity}?company='${encodeURIComponent(COMPANY)}'&${query}`;

  try {
    const response =
      await apiGet<ODataListResponse<Record<string, unknown>>>(endpoint);
    const rows = (response.value ?? []).map(mapSourceRow);
    const totalCount = response["@odata.count"] ?? skip + rows.length;
    const nextSkip = skip + rows.length;
    const hasMore =
      response["@odata.count"] !== undefined
        ? nextSkip < response["@odata.count"]
        : rows.length === top;

    return {
      rows,
      totalCount,
      hasMore,
      nextSkip,
    };
  } catch (error) {
    console.error(
      `[CopyDoc] Error fetching source docs for ${params.fromDocType}:`,
      error,
    );
    throw error as ApiError;
  }
}
