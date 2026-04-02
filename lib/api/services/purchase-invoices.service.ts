/**
 * Purchase Invoice API Service
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

export type PurchaseInvoiceHeader = PurchaseOrder;

export type GetPurchaseInvoicesParams = GetPurchaseDocumentListParams;

export type SearchPurchaseInvoicesParams = SearchPurchaseDocumentListParams;

export type PaginatedPurchaseInvoicesResponse =
  PaginatedPurchaseDocumentListResponse;

/**
 * Get purchase invoices with pagination and optional count
 */
export async function getPurchaseInvoicesWithCount(
  params: GetPurchaseInvoicesParams = {},
): Promise<PaginatedPurchaseInvoicesResponse> {
  return getPurchaseDocumentListWithCount("invoice", params);
}

/**
 * Search purchase invoices across a few fields
 */
export async function searchPurchaseInvoices(
  params: SearchPurchaseInvoicesParams = {},
): Promise<PaginatedPurchaseInvoicesResponse> {
  return searchPurchaseDocumentList("invoice", params);
}
