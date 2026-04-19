/**
 * Sales Get Posted Line Service
 * Endpoint: API_SaleGetPostedline
 *
 * Flow:
 * 1. Invoice: user picks from Posted Sales Shipment lines
 * 2. Credit Memo: user picks from Posted Sales Return Receipt lines
 * 3. POST per selected row to copy it into the sales document
 */

import { apiPost } from "../client";
import type { ApiError } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export type SalesGetPostedLineDocType = "Invoice" | "CreditMemo";

/**
 * Submit a single selected posted line to copy it into the sales document.
 *
 * Invoice: pass shipment (Document_No) + shipmentLine (Line_No) from SalesShipmentLine
 * CreditMemo: pass returnReceipt (Document_No) + returnReceiptLine (Line_No) from ReturnReceiptLine
 */
export async function submitSalesPostedLine(
  docType: SalesGetPostedLineDocType,
  documentNo: string,
  sourceDocNo: string,
  sourceLineNo: number,
): Promise<void> {
  const endpoint = `/API_SaleGetPostedline?company='${encodeURIComponent(COMPANY)}'`;

  const payload =
    docType === "Invoice"
      ? {
          docType,
          documentNo,
          shipment: sourceDocNo,
          shipmentline: sourceLineNo,
        }
      : {
          docType,
          documentNo,
          returnReceipt: sourceDocNo,
          returnReceiptLine: sourceLineNo,
        };

  try {
    await apiPost(endpoint, payload);
  } catch (error) {
    console.error(
      "Error submitting sales posted line:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}
