/**
 * Sales Copy Document Service
 * Endpoint: API_SaleCopyDocument
 *
 * Flow:
 * 1. A non-order document header exists.
 * 2. User picks a source document type and selects a source document.
 * 3. We POST to API_SaleCopyDocument with the target sales header number.
 */

import { apiGet, apiPost } from "../client";
import type { ApiError } from "../client";
import { buildODataQuery } from "../endpoints";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

const DEFAULT_PAGE_SIZE = 25;

/** Valid source document types for sales copy flow */
export type SalesCopyFromDocType =
  | "Posted Invoice"
  | "Posted Shipment"
  | "Order"
  | "Posted Credit Memo";

/** Valid "to" document types (order is excluded — copy is only for 3 non-order types) */
export type SalesCopyToDocType = "Invoice" | "Credit Memo" | "Return Order";

export interface SalesCopyDocumentParams {
  fromDocType1: SalesCopyFromDocType;
  fromDocNo: string;
  salesHeaderNo: string;
}

/**
 * Execute sales copy document.
 */
export async function executeSalesCopyDocument(
  params: SalesCopyDocumentParams,
): Promise<void> {
  const endpoint = `/API_SaleCopyDocument?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {
    fromDocType1: params.fromDocType1,
    fromDocNo: params.fromDocNo,
    salesHeaderNo: params.salesHeaderNo,
  };

  console.log("[SalesCopyDoc] Endpoint:", endpoint);
  console.log("[SalesCopyDoc] Payload:", JSON.stringify(payload, null, 2));

  try {
    await apiPost(endpoint, payload);
  } catch (error) {
    console.error(
      "Error executing sales copy document:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Source document type options available for each target document type.
 */
export const SALES_COPY_FROM_DOC_TYPE_OPTIONS: Record<
  SalesCopyToDocType,
  { value: SalesCopyFromDocType; label: string }[]
> = {
  Invoice: [
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Shipment", label: "Posted Shipment" },
    { value: "Order", label: "Sales Order" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
  ],
  "Credit Memo": [
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Shipment", label: "Posted Shipment" },
    { value: "Order", label: "Sales Order" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
  ],
  "Return Order": [
    { value: "Posted Invoice", label: "Posted Invoice" },
    { value: "Posted Shipment", label: "Posted Shipment" },
    { value: "Order", label: "Sales Order" },
    { value: "Posted Credit Memo", label: "Posted Credit Memo" },
  ],
};

export interface SalesSourceDocumentRow {
  no: string;
  customerNo: string;
  customerName: string;
  postingDate: string;
}

interface ODataListResponse<T> {
  value: T[];
  "@odata.count"?: number;
}

export type SalesCopySourceSortColumn =
  | "No"
  | "Sell_to_Customer_No"
  | "Sell_to_Customer_Name"
  | "Posting_Date";

export type SalesCopySourceSortDirection = "asc" | "desc";

export interface SalesCopySourceFilters {
  documentNo?: string;
  customerNo?: string;
  postingDateFrom?: string;
  postingDateTo?: string;
}

export interface FetchSalesSourceDocumentsParams {
  fromDocType: SalesCopyFromDocType;
  searchTerm?: string;
  filters?: SalesCopySourceFilters;
  sortBy?: SalesCopySourceSortColumn;
  sortDirection?: SalesCopySourceSortDirection;
  skip?: number;
  top?: number;
}

export interface FetchSalesSourceDocumentsResult {
  rows: SalesSourceDocumentRow[];
  totalCount: number;
  hasMore: boolean;
  nextSkip: number;
}

/** OData entity mapping for each copy source type */
const FROM_DOC_TYPE_ENTITY_MAP: Record<
  SalesCopyFromDocType,
  {
    entity: string;
    defaultSort: SalesCopySourceSortColumn;
    selectFields: string;
  }
> = {
  "Posted Invoice": {
    entity: "PostedSalesInvoice",
    defaultSort: "Posting_Date",
    selectFields: "No,Sell_to_Customer_No,Sell_to_Customer_Name,Posting_Date",
  },
  "Posted Shipment": {
    entity: "PostedSalesShipment",
    defaultSort: "Posting_Date",
    selectFields: "No,Sell_to_Customer_No,Sell_to_Customer_Name,Posting_Date",
  },
  Order: {
    entity: "SalesOrder",
    defaultSort: "No",
    selectFields: "No,Sell_to_Customer_No,Sell_to_Customer_Name,Posting_Date",
  },
  "Posted Credit Memo": {
    entity: "PostedSalesCreditMemo",
    defaultSort: "Posting_Date",
    selectFields: "No,Sell_to_Customer_No,Sell_to_Customer_Name,Posting_Date",
  },
};

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function mapSourceRow(row: Record<string, unknown>): SalesSourceDocumentRow {
  return {
    no: String(row["No"] ?? ""),
    customerNo: String(row["Sell_to_Customer_No"] ?? ""),
    customerName: String(row["Sell_to_Customer_Name"] ?? ""),
    postingDate: String(row["Posting_Date"] ?? row["Document_Date"] ?? ""),
  };
}

function buildSourceFilters(
  searchTerm?: string,
  filters?: SalesCopySourceFilters,
): string | undefined {
  const clauses: string[] = [];

  if (searchTerm && searchTerm.trim()) {
    const s = escapeODataValue(searchTerm.trim());
    clauses.push(
      `(contains(No,'${s}') or contains(Sell_to_Customer_No,'${s}') or contains(Sell_to_Customer_Name,'${s}'))`,
    );
  }

  if (filters?.documentNo?.trim()) {
    clauses.push(`contains(No,'${escapeODataValue(filters.documentNo.trim())}')`);
  }

  if (filters?.customerNo?.trim()) {
    clauses.push(
      `contains(Sell_to_Customer_No,'${escapeODataValue(filters.customerNo.trim())}')`,
    );
  }

  if (filters?.postingDateFrom) {
    clauses.push(`Posting_Date ge ${filters.postingDateFrom}`);
  }

  if (filters?.postingDateTo) {
    clauses.push(`Posting_Date le ${filters.postingDateTo}`);
  }

  return clauses.length > 0
    ? clauses.map((c) => `(${c})`).join(" and ")
    : undefined;
}

/**
 * Fetch source documents with server-driven search/filter/sort/paging.
 */
export async function fetchSalesSourceDocumentsForCopy(
  params: FetchSalesSourceDocumentsParams,
): Promise<FetchSalesSourceDocumentsResult> {
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
    $select: mapping.selectFields,
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

    return { rows, totalCount, hasMore, nextSkip };
  } catch (error) {
    console.error(
      `[SalesCopyDoc] Error fetching source docs for ${params.fromDocType}:`,
      error,
    );
    throw error as ApiError;
  }
}
