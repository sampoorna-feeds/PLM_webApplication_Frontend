import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";
import type { PurchaseOrder } from "./purchase-orders.service";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export type PurchaseDocumentListType =
  | "invoice"
  | "return-order"
  | "credit-memo";

interface PurchaseDocumentListConfig {
  headerEntity: string;
}

const PURCHASE_DOCUMENT_LIST_CONFIG: Record<
  PurchaseDocumentListType,
  PurchaseDocumentListConfig
> = {
  invoice: {
    headerEntity: "PurchaseInvoiceHeader",
  },
  "return-order": {
    headerEntity: "PurchaseReturnOrderHeader",
  },
  "credit-memo": {
    headerEntity: "PurchaseCreditMemoHeader",
  },
};

export interface GetPurchaseDocumentListParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface SearchPurchaseDocumentListParams extends GetPurchaseDocumentListParams {
  searchTerm?: string;
}

export interface PaginatedPurchaseDocumentListResponse {
  orders: PurchaseOrder[];
  totalCount: number;
}

function translateSelect(select: string): string {
  const mapped = select
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .flatMap((field) => {
      // Non-order purchase documents do not expose Order_Date and PO_Type.
      if (field === "Order_Date") return ["Posting_Date"];
      if (field === "PO_Type") return [];
      return [field];
    });

  return [...new Set(mapped)].join(",");
}

function translateFilter(filter?: string): string | undefined {
  if (!filter) return filter;

  return filter
    .replace(/\bOrder_Date\b/g, "Posting_Date")
    .replace(/\s+and\s+PO_Type\s+(eq|gt|lt|ge|le)\s+[^ )]+/g, "")
    .replace(/PO_Type\s+(eq|gt|lt|ge|le)\s+[^ )]+\s+and\s+/g, "")
    .replace(/\(\s*\)/g, "")
    .trim();
}

function translateOrderBy(orderBy?: string): string | undefined {
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

function normalizeHeader(order: PurchaseOrder): PurchaseOrder {
  return {
    ...order,
    Order_Date: order.Order_Date || order.Posting_Date || order.Document_Date,
  };
}

export async function getPurchaseDocumentListWithCount(
  documentType: PurchaseDocumentListType,
  params: GetPurchaseDocumentListParams = {},
): Promise<PaginatedPurchaseDocumentListResponse> {
  const config = PURCHASE_DOCUMENT_LIST_CONFIG[documentType];
  const {
    $select = "No,Buy_from_Vendor_No,Buy_from_Vendor_Name,Order_Date,Posting_Date,Document_Date,Vendor_Order_No",
    $filter,
    $orderby = "No desc",
    $top = 10,
    $skip,
  } = params;

  const queryParams: Record<string, unknown> = {
    $select: translateSelect($select),
    $top,
    $count: true,
  };

  const translatedFilter = translateFilter($filter);
  const translatedOrderBy = translateOrderBy($orderby);

  if (translatedFilter) queryParams.$filter = translatedFilter;
  if (translatedOrderBy) queryParams.$orderby = translatedOrderBy;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(
    queryParams as Parameters<typeof buildODataQuery>[0],
  );
  const endpoint = `/${config.headerEntity}?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseOrder>>(endpoint);

  return {
    orders: (response.value || []).map(normalizeHeader),
    totalCount: response["@odata.count"] ?? 0,
  };
}

export async function searchPurchaseDocumentList(
  documentType: PurchaseDocumentListType,
  params: SearchPurchaseDocumentListParams = {},
): Promise<PaginatedPurchaseDocumentListResponse> {
  const { searchTerm, $top, $skip, ...rest } = params;
  if (!searchTerm || searchTerm.trim() === "") {
    return getPurchaseDocumentListWithCount(
      documentType,
      rest as GetPurchaseDocumentListParams,
    );
  }

  const escaped = searchTerm.replace(/'/g, "''");
  const fieldsToSearch = ["No", "Buy_from_Vendor_No", "Buy_from_Vendor_Name"];

  // Merge unique records from per-field contains queries.
  const responses = await Promise.all(
    fieldsToSearch.map((field) => {
      const filterPart = `contains(${field},'${escaped}')`;
      const filter = rest.$filter
        ? `${rest.$filter} and ${filterPart}`
        : filterPart;

      return getPurchaseDocumentListWithCount(documentType, {
        ...rest,
        $filter: filter,
      });
    }),
  );

  const map: Record<string, PurchaseOrder> = {};
  responses.forEach((result) => {
    result.orders.forEach((order) => {
      map[order.No] = order;
    });
  });

  const allOrders = Object.values(map);
  const total = allOrders.length;

  let paged = allOrders;
  if ($skip !== undefined || $top !== undefined) {
    const start = $skip || 0;
    const end = $top != null ? start + $top : undefined;
    paged = allOrders.slice(start, end);
  }

  return { orders: paged, totalCount: total };
}
