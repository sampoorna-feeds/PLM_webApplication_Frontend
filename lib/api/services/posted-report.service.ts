import { apiPost } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Valid document types for the Posted Report API
 */
export type PostedReportDocumentType =
  | "SalesCreditMemo"
  | "PurchCreditMemo"
  | "PurchReceipt"
  | "PurchReturnShipment"
  | "PurchInvoice";

/**
 * Fetches a PDF report for a posted document as a base64 string.
 * 
 * @param documentType - The type of document (SalesCreditMemo, PurchCreditMemo, etc.)
 * @param docNo - The document number
 * @returns A promise that resolves to the base64 encoded PDF string
 */
export async function getPostedReportPdf(
  documentType: PostedReportDocumentType,
  docNo: string,
): Promise<string> {
  const endpoint = `/API_PostedReport?company='${encodeURIComponent(COMPANY)}'`;
  
  // The API expects documentType and docNo in the body
  const response = await apiPost<{ value: string }>(endpoint, {
    documentType,
    docNo,
  });

  return response?.value || "";
}
