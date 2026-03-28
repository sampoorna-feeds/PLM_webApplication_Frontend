/**
 * Purchase Credit Memo API Service
 * Fetches purchase credit memos from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";
import type { PurchaseOrder } from "./purchase-orders.service";

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";
const HEADER_ENTITY = "PurchaseCreditMemoHeader";

export type PurchaseCreditMemoHeader = PurchaseOrder;

function translateCreditMemoSelect(select: string): string {
  const mapped = select
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .flatMap((field) => {
      // Return orders / credit memos don't have Order_Date, use Posting_Date
      if (field === "Order_Date") return ["Posting_Date"];
      if (field === "PO_Type") return [];
      return [field];
    });

  return [...new Set(mapped)].join(",");
}

function translateCreditMemoFilter(filter?: string): string | undefined {
  if (!filter) return filter;

  return filter
    .replace(/\bOrder_Date\b/g, "Posting_Date")
    .replace(/\s+and\s+PO_Type\s+(eq|gt|lt|ge|le)\s+[^ )]+/g, "")
    .replace(/PO_Type\s+(eq|gt|lt|ge|le)\s+[^ )]+\s+and\s+/g, "")
    .replace(/\(\s*\)/g, "")
    .trim();
}

function translateCreditMemoOrderBy(orderBy?: string): string | undefined {
  if (!orderBy) return orderBy;

  return orderBy
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      if (part.startsWith("Order_Date")) {
        return [part.replace("Order_Date", "Posting_Date")];
      }
      if (part.startsWith("PO_Type")) {
        return [];
      }
      return [part];
    })
    .join(",");
}

function normalizeCreditMemoHeader(order: PurchaseCreditMemoHeader): PurchaseOrder {
  return {
    ...order,
    Order_Date: order.Order_Date || order.Posting_Date || order.Document_Date,
  };
}

export interface GetPurchaseCreditMemosParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface SearchPurchaseCreditMemosParams extends GetPurchaseCreditMemosParams {
  /** term to search across multiple columns (No, Buy_from_Vendor_No, Buy_from_Vendor_Name) */
  searchTerm?: string;
}

export interface PaginatedPurchaseCreditMemosResponse {
  orders: PurchaseOrder[];
  totalCount: number;
}

/**
 * Get purchase credit memos with pagination and optional count
 */
export async function getPurchaseCreditMemosWithCount(
  params: GetPurchaseCreditMemosParams = {},
): Promise<PaginatedPurchaseCreditMemosResponse> {
  const {
    $select = "No,Buy_from_Vendor_No,Buy_from_Vendor_Name,Order_Date,Posting_Date,Document_Date,Vendor_Order_No",
    $filter,
    $orderby = "No desc",
    $top = 10,
    $skip,
  } = params;

  const queryParams: Record<string, unknown> = {
    $select: translateCreditMemoSelect($select),
    $top,
    $count: true,
  };

  const translatedFilter = translateCreditMemoFilter($filter);
  const translatedOrderBy = translateCreditMemoOrderBy($orderby);

  if (translatedFilter) queryParams.$filter = translatedFilter;
  if (translatedOrderBy) queryParams.$orderby = translatedOrderBy;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(
    queryParams as Parameters<typeof buildODataQuery>[0],
  );
  const endpoint = `/${HEADER_ENTITY}?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseCreditMemoHeader>>(endpoint);

  return {
    orders: (response.value || []).map(normalizeCreditMemoHeader),
    totalCount: response["@odata.count"] ?? 0,
  };
}

/**
 * Search purchase credit memos across a few fields
 */
export async function searchPurchaseCreditMemos(
  params: SearchPurchaseCreditMemosParams = {},
): Promise<PaginatedPurchaseCreditMemosResponse> {
  const { searchTerm, $top, $skip, ...rest } = params;
  if (!searchTerm || searchTerm.trim() === "") {
    return getPurchaseCreditMemosWithCount(rest as GetPurchaseCreditMemosParams);
  }

  const escaped = searchTerm.replace(/'/g, "''");
  const fieldsToSearch = ["No", "Buy_from_Vendor_No", "Buy_from_Vendor_Name"];

  // perform one request per field
  const responses = await Promise.all(
    fieldsToSearch.map((field) => {
      const filterPart = `contains(${field},'${escaped}')`;
      const filter = rest.$filter
        ? `${rest.$filter} and ${filterPart}`
        : filterPart;
      return getPurchaseCreditMemosWithCount({ ...rest, $filter: filter });
    }),
  );

  const map: Record<string, PurchaseOrder> = {};
  responses.forEach((res) => {
    res.orders.forEach((o) => {
      map[o.No] = o;
    });
  });

  const allOrders = Object.values(map);
  const total = allOrders.length;

  // apply paging after merge
  let paged = allOrders;
  if ($skip !== undefined || $top !== undefined) {
    const start = $skip || 0;
    const end = $top != null ? start + $top : undefined;
    paged = allOrders.slice(start, end);
  }

  return { orders: paged, totalCount: total };
}
