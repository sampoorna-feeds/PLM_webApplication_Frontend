/**
 * Purchase Get Posted Line Service
 * Endpoint: API_PurchaseGetPostedline
 *
 * Flow:
 * 1. POST with DocType + DocumentNo → fetch available posted lines
 * 2. User selects one or more rows
 * 3. POST per selected row with all 4 fields → copies line to the document
 */

import { apiPost } from "../client";
import type { ApiError } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export type GetPostedLineDocType = "Invoice" | "CreditMemo";

export interface PostedLineRow {
  Document_No?: string;
  Line_No?: number;
  Description?: string;
  Quantity?: number;
  Unit_Price?: number;
  Receipt?: string;
  Receiptline?: number;
  [key: string]: unknown;
}

/**
 * Fetch available posted lines for a document.
 * Posts with DocType and DocumentNo; returns array of line rows.
 */
export async function fetchPostedLines(
  docType: GetPostedLineDocType,
  documentNo: string,
): Promise<PostedLineRow[]> {
  const endpoint = `/API_PurchaseGetPostedline?company='${encodeURIComponent(COMPANY)}'`;

  const payload = {
    docType: docType,
    documentNo: documentNo,
  };

  try {
    const response = await apiPost<
      { value?: PostedLineRow[] } | PostedLineRow[]
    >(endpoint, payload);

    if (Array.isArray(response)) {
      return response;
    }
    if (
      response &&
      typeof response === "object" &&
      "value" in response &&
      Array.isArray(response.value)
    ) {
      return response.value;
    }
    return [];
  } catch (error) {
    console.error(
      "Error fetching posted lines:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

/**
 * Submit a single selected posted line to copy it into the document.
 */
export async function submitPostedLine(
  docType: GetPostedLineDocType,
  documentNo: string,
  receipt: string,
  receiptLine: number,
): Promise<void> {
  const endpoint = `/API_PurchaseGetPostedline?company='${encodeURIComponent(COMPANY)}'`;

  const payload = {
    docType: docType,
    documentNo: documentNo,
    receipt: receipt,
    receiptline: receiptLine,
  };

  try {
    await apiPost(endpoint, payload);
  } catch (error) {
    console.error(
      "Error submitting posted line:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}
