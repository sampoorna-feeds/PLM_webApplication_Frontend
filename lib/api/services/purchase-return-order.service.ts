/**
 * Purchase Return Order API Service
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

export type { PurchaseOrderData as PurchaseReturnOrderData };
export type { PurchaseOrderLineItem as PurchaseReturnOrderLineItem };

export interface CreatePurchaseReturnOrderResponse {
  orderId: string;
  orderNo: string;
}

/**
 * Create a new purchase return order header.
 */
export async function createPurchaseReturnOrder(
  data: PurchaseOrderData,
): Promise<CreatePurchaseReturnOrderResponse> {
  try {
    return await createPurchaseDocumentHeader("return-order", data);
  } catch (error) {
    console.error(
      "Error creating purchase return order:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Create purchase return-order header for copy-first flow using location.
 */
export async function createPurchaseReturnOrderCopyHeader(
  locationCode: string,
): Promise<CreatePurchaseReturnOrderResponse> {
  try {
    return await createPurchaseDocumentCopyBootstrapHeader(
      "return-order",
      locationCode,
    );
  } catch (error) {
    console.error(
      "Error creating purchase return order copy header:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Get a single purchase return order by document number.
 */
export async function getPurchaseReturnOrderByNo(
  documentNo: string,
): Promise<PurchaseOrder | null> {
  return getPurchaseDocumentHeaderByNo("return-order", documentNo);
}

/**
 * Get purchase return-order lines by document number.
 */
export async function getPurchaseReturnOrderLines(
  documentNo: string,
): Promise<PurchaseLine[]> {
  return getPurchaseDocumentLinesByNo("return-order", documentNo);
}

/**
 * Patch purchase return-order header fields by document number.
 */
export async function patchPurchaseReturnOrderHeader(
  documentNo: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return patchPurchaseDocumentHeaderByNo("return-order", documentNo, body);
}

/**
 * Delete a purchase return-order header by key.
 */
export async function deletePurchaseReturnOrderHeader(
  documentNo: string,
): Promise<unknown> {
  return deletePurchaseDocumentHeaderByNo("return-order", documentNo);
}

/**
 * Add a single line item to an existing purchase return order.
 */
export async function addSinglePurchaseReturnOrderLine(
  documentNo: string,
  lineItem: PurchaseOrderLineItem,
  _locationCode: string,
): Promise<{ Line_No: number; [key: string]: any }> {
  try {
    return await addSinglePurchaseDocumentLine(
      "return-order",
      documentNo,
      lineItem,
    );
  } catch (error) {
    console.error("Error adding purchase return order line:", error);
    throw error as ApiError;
  }
}

/**
 * Update a single line item on an existing purchase return order.
 */
export async function updateSinglePurchaseReturnOrderLine(
  documentNo: string,
  lineNo: number,
  lineItem: Partial<PurchaseOrderLineItem>,
): Promise<{ Line_No: number; [key: string]: any }> {
  try {
    return await updateSinglePurchaseDocumentLine(
      "return-order",
      documentNo,
      lineNo,
      lineItem,
    );
  } catch (error) {
    console.error("Error updating purchase return order line:", error);
    throw error as ApiError;
  }
}

/**
 * Delete a single line item from an existing purchase return order.
 */
export async function deleteSinglePurchaseReturnOrderLine(
  documentNo: string,
  lineNo: number,
): Promise<void> {
  try {
    await deleteSinglePurchaseDocumentLine("return-order", documentNo, lineNo);
  } catch (error) {
    console.error("Error deleting purchase return order line:", error);
    throw error as ApiError;
  }
}

/**
 * Add multiple line items to an existing purchase return order.
 */
export async function addPurchaseReturnOrderLineItems(
  documentNo: string,
  lineItems: PurchaseOrderLineItem[],
  _locationCode: string,
): Promise<void> {
  await addPurchaseDocumentLineItems("return-order", documentNo, lineItems);
}
