/**
 * Purchase Comment Sheet API Service
 * Full CRUD for PurchCommentSheet — works for all purchase document types.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

const BASE_ENDPOINT = `/PurchCommentSheet?company='${encodeURIComponent(COMPANY)}'`;

export interface PurchaseComment {
  Document_Type: string;
  No: string;
  Document_Line_No: number;
  Line_No: number;
  Date: string;
  Comment: string;
  Code?: string;
}

function buildCommentKey(
  documentType: PurchaseCommentDocumentType,
  documentNo: string,
  lineNo: number,
  documentLineNo: number = 0,
): string {
  const escapedType = documentType.replace(/'/g, "''");
  const escapedNo = documentNo.replace(/'/g, "''");
  return `/PurchCommentSheet(Document_Type='${escapedType}',No='${escapedNo}',Document_Line_No=${documentLineNo},Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
}

export type PurchaseCommentDocumentType =
  | "Order"
  | "Invoice"
  | "Return Order"
  | "Credit Memo";

export async function getPurchaseComments(
  documentType: PurchaseCommentDocumentType,
  documentNo: string,
): Promise<PurchaseComment[]> {
  const escapedType = documentType.replace(/'/g, "''");
  const escapedNo = documentNo.replace(/'/g, "''");
  const filter = `Document_Type eq '${escapedType}' and No eq '${escapedNo}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/PurchCommentSheet?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseComment>>(endpoint);
  return response.value || [];
}

export async function createPurchaseComment(
  documentType: PurchaseCommentDocumentType,
  documentNo: string,
  comment: string,
  date: string,
): Promise<PurchaseComment> {
  return apiPost<PurchaseComment>(BASE_ENDPOINT, {
    Document_Type: documentType,
    No: documentNo,
    Date: date,
    Comment: comment,
  });
}

export async function updatePurchaseComment(
  documentType: PurchaseCommentDocumentType,
  documentNo: string,
  lineNo: number,
  comment: string,
  date: string,
  documentLineNo: number = 0,
): Promise<unknown> {
  const endpoint = buildCommentKey(documentType, documentNo, lineNo, documentLineNo);
  return apiPatch<unknown>(endpoint, { Comment: comment, Date: date });
}

export async function deletePurchaseComment(
  documentType: PurchaseCommentDocumentType,
  documentNo: string,
  lineNo: number,
  documentLineNo: number = 0,
): Promise<void> {
  const endpoint = buildCommentKey(documentType, documentNo, lineNo, documentLineNo);
  await apiDelete(endpoint);
}
