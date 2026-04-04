/**
 * Purchase Credit Memo API Service
 * Thin compatibility wrapper over unified purchase-document adapter.
 */

import type { ApiError } from "../client";
import type {
  PurchaseOrderData,
  PurchaseOrderLineItem,
} from "./purchase-order.service";
import type { PurchaseOrder, PurchaseLine } from "./purchase-orders.service";
import {
  addPurchaseDocumentLineItems,
  addSinglePurchaseDocumentLine,
  createPurchaseDocumentCopyBootstrapHeader,
  createPurchaseDocumentHeader,
  deletePurchaseDocumentHeaderByNo,
  deleteSinglePurchaseDocumentLine,
  getPurchaseDocumentHeaderByNo,
  getPurchaseDocumentLinesByNo,
  patchPurchaseDocumentHeaderByNo,
  updateSinglePurchaseDocumentLine,
} from "./purchase-document.service";

export type { PurchaseOrderData as PurchaseCreditMemoData };
export type { PurchaseOrderLineItem as PurchaseCreditMemoLineItem };

export interface CreatePurchaseCreditMemoResponse {
  orderId: string;
  orderNo: string;
}

/**
 * Create a new purchase credit memo header.
 */
export async function createPurchaseCreditMemo(
  data: PurchaseOrderData,
): Promise<CreatePurchaseCreditMemoResponse> {
  try {
    return await createPurchaseDocumentHeader("credit-memo", data);
  } catch (error) {
    console.error(
      "Error creating purchase credit memo:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Create purchase credit-memo header for copy-first flow using location.
 */
export async function createPurchaseCreditMemoCopyHeader(
  locationCode: string,
): Promise<CreatePurchaseCreditMemoResponse> {
  try {
    return await createPurchaseDocumentCopyBootstrapHeader(
      "credit-memo",
      locationCode,
    );
  } catch (error) {
    console.error(
      "Error creating purchase credit memo copy header:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Get a single purchase credit memo by document number.
 */
export async function getPurchaseCreditMemoByNo(
  documentNo: string,
): Promise<PurchaseOrder | null> {
  return getPurchaseDocumentHeaderByNo("credit-memo", documentNo);
}

/**
 * Get purchase credit-memo lines by document number.
 */
export async function getPurchaseCreditMemoLines(
  documentNo: string,
): Promise<PurchaseLine[]> {
  return getPurchaseDocumentLinesByNo("credit-memo", documentNo);
}

/**
 * Patch purchase credit-memo header fields by document number.
 */
export async function patchPurchaseCreditMemoHeader(
  documentNo: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return patchPurchaseDocumentHeaderByNo("credit-memo", documentNo, body);
}

/**
 * Delete a purchase credit-memo header by key.
 */
export async function deletePurchaseCreditMemoHeader(
  documentNo: string,
): Promise<unknown> {
  return deletePurchaseDocumentHeaderByNo("credit-memo", documentNo);
}

/**
 * Add a single line item to an existing purchase credit memo.
 */
export async function addSinglePurchaseCreditMemoLine(
  documentNo: string,
  lineItem: PurchaseOrderLineItem,
  _locationCode: string,
): Promise<{ Line_No: number; [key: string]: any }> {
  try {
    return await addSinglePurchaseDocumentLine(
      "credit-memo",
      documentNo,
      lineItem,
    );
  } catch (error) {
    console.error("Error adding purchase credit memo line:", error);
    throw error as ApiError;
  }
}

/**
 * Update a single line item on an existing purchase credit memo.
 */
export async function updateSinglePurchaseCreditMemoLine(
  documentNo: string,
  lineNo: number,
  lineItem: Partial<PurchaseOrderLineItem>,
): Promise<{ Line_No: number; [key: string]: any }> {
  try {
    return await updateSinglePurchaseDocumentLine(
      "credit-memo",
      documentNo,
      lineNo,
      lineItem,
    );
  } catch (error) {
    console.error("Error updating purchase credit memo line:", error);
    throw error as ApiError;
  }
}

/**
 * Delete a single line item from an existing purchase credit memo.
 */
export async function deleteSinglePurchaseCreditMemoLine(
  documentNo: string,
  lineNo: number,
): Promise<void> {
  try {
    await deleteSinglePurchaseDocumentLine("credit-memo", documentNo, lineNo);
  } catch (error) {
    console.error("Error deleting purchase credit memo line:", error);
    throw error as ApiError;
  }
}

/**
 * Add multiple line items to an existing purchase credit memo.
 */
export async function addPurchaseCreditMemoLineItems(
  documentNo: string,
  lineItems: PurchaseOrderLineItem[],
  _locationCode: string,
): Promise<void> {
  await addPurchaseDocumentLineItems("credit-memo", documentNo, lineItems);
}
