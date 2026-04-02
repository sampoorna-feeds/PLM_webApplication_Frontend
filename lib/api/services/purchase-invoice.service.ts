/**
 * Purchase Invoice API Service
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

export type { PurchaseOrderData as PurchaseInvoiceData };
export type { PurchaseOrderLineItem as PurchaseInvoiceLineItem };

export interface CreatePurchaseInvoiceResponse {
  orderId: string;
  orderNo: string;
}

/**
 * Create a new purchase invoice header.
 */
export async function createPurchaseInvoice(
  data: PurchaseOrderData,
): Promise<CreatePurchaseInvoiceResponse> {
  try {
    return await createPurchaseDocumentHeader("invoice", data);
  } catch (error) {
    console.error(
      "Error creating purchase invoice:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Create purchase invoice header for copy-first flow using location and LOB.
 */
export async function createPurchaseInvoiceCopyHeader(
  locationCode: string,
  lobCode: string,
): Promise<CreatePurchaseInvoiceResponse> {
  try {
    return await createPurchaseDocumentCopyBootstrapHeader(
      "invoice",
      locationCode,
      lobCode,
    );
  } catch (error) {
    console.error(
      "Error creating purchase invoice copy header:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Get a single purchase invoice by document number.
 */
export async function getPurchaseInvoiceByNo(
  documentNo: string,
): Promise<PurchaseOrder | null> {
  return getPurchaseDocumentHeaderByNo("invoice", documentNo);
}

/**
 * Get purchase invoice lines by document number.
 */
export async function getPurchaseInvoiceLines(
  documentNo: string,
): Promise<PurchaseLine[]> {
  return getPurchaseDocumentLinesByNo("invoice", documentNo);
}

/**
 * Patch purchase invoice header fields by document number.
 */
export async function patchPurchaseInvoiceHeader(
  documentNo: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return patchPurchaseDocumentHeaderByNo("invoice", documentNo, body);
}

/**
 * Delete a purchase invoice header by key.
 */
export async function deletePurchaseInvoiceHeader(
  documentNo: string,
): Promise<unknown> {
  return deletePurchaseDocumentHeaderByNo("invoice", documentNo);
}

/**
 * Add a single line item to an existing purchase invoice.
 */
export async function addSinglePurchaseInvoiceLine(
  documentNo: string,
  lineItem: PurchaseOrderLineItem,
  _locationCode: string,
): Promise<{ Line_No: number; [key: string]: any }> {
  try {
    return await addSinglePurchaseDocumentLine("invoice", documentNo, lineItem);
  } catch (error) {
    console.error("Error adding purchase invoice line:", error);
    throw error as ApiError;
  }
}

/**
 * Update a single line item on an existing purchase invoice.
 */
export async function updateSinglePurchaseInvoiceLine(
  documentNo: string,
  lineNo: number,
  lineItem: Partial<PurchaseOrderLineItem>,
): Promise<{ Line_No: number; [key: string]: any }> {
  try {
    return await updateSinglePurchaseDocumentLine(
      "invoice",
      documentNo,
      lineNo,
      lineItem,
    );
  } catch (error) {
    console.error("Error updating purchase invoice line:", error);
    throw error as ApiError;
  }
}

/**
 * Delete a single line item from an existing purchase invoice.
 */
export async function deleteSinglePurchaseInvoiceLine(
  documentNo: string,
  lineNo: number,
): Promise<void> {
  try {
    await deleteSinglePurchaseDocumentLine("invoice", documentNo, lineNo);
  } catch (error) {
    console.error("Error deleting purchase invoice line:", error);
    throw error as ApiError;
  }
}

/**
 * Add multiple line items to an existing purchase invoice.
 */
export async function addPurchaseInvoiceLineItems(
  documentNo: string,
  lineItems: PurchaseOrderLineItem[],
  _locationCode: string,
): Promise<void> {
  await addPurchaseDocumentLineItems("invoice", documentNo, lineItems);
}
