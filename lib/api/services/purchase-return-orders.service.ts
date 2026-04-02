/**
 * Purchase Return Order API Service
 * Thin list wrapper over unified purchase-document list adapter.
 */

import type { PurchaseOrder } from "./purchase-orders.service";
import {
  getPurchaseDocumentListWithCount,
  searchPurchaseDocumentList,
  type GetPurchaseDocumentListParams,
  type PaginatedPurchaseDocumentListResponse,
  type SearchPurchaseDocumentListParams,
} from "./purchase-document-list.service";

export type PurchaseReturnOrderHeader = PurchaseOrder;

export type GetPurchaseReturnOrdersParams = GetPurchaseDocumentListParams;

export type SearchPurchaseReturnOrdersParams = SearchPurchaseDocumentListParams;

export type PaginatedPurchaseReturnOrdersResponse =
  PaginatedPurchaseDocumentListResponse;

/**
 * Get purchase return orders with pagination and optional count
 */
export async function getPurchaseReturnOrdersWithCount(
  params: GetPurchaseReturnOrdersParams = {},
): Promise<PaginatedPurchaseReturnOrdersResponse> {
  return getPurchaseDocumentListWithCount("return-order", params);
}

/**
 * Search purchase return orders across a few fields
 */
export async function searchPurchaseReturnOrders(
  params: SearchPurchaseReturnOrdersParams = {},
): Promise<PaginatedPurchaseReturnOrdersResponse> {
  return searchPurchaseDocumentList("return-order", params);
}
