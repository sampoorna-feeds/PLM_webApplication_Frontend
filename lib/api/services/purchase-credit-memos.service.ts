/**
 * Purchase Credit Memo API Service
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

export type PurchaseCreditMemoHeader = PurchaseOrder;

export type GetPurchaseCreditMemosParams = GetPurchaseDocumentListParams;

export type SearchPurchaseCreditMemosParams = SearchPurchaseDocumentListParams;

export type PaginatedPurchaseCreditMemosResponse =
  PaginatedPurchaseDocumentListResponse;

/**
 * Get purchase credit memos with pagination and optional count
 */
export async function getPurchaseCreditMemosWithCount(
  params: GetPurchaseCreditMemosParams = {},
): Promise<PaginatedPurchaseCreditMemosResponse> {
  return getPurchaseDocumentListWithCount("credit-memo", params);
}

/**
 * Search purchase credit memos across a few fields
 */
export async function searchPurchaseCreditMemos(
  params: SearchPurchaseCreditMemosParams = {},
): Promise<PaginatedPurchaseCreditMemosResponse> {
  return searchPurchaseDocumentList("credit-memo", params);
}
