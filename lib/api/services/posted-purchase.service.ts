import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface PostedPurchaseHeader {
  No: string;
  Buy_from_Vendor_No?: string;
  Buy_from_Vendor_Name?: string;
  Posting_Date?: string;
  Document_Date?: string;
  Location_Code?: string;
  [key: string]: unknown;
}

export interface PostedPurchaseLine {
  Document_No: string;
  Line_No: number;
  No?: string;
  Description?: string;
  Quantity?: number;
  [key: string]: unknown;
}

// Posted Receipt
export async function getPostedPurchaseReceipts(params: any = {}) {
  const query = buildODataQuery({ ...params, $count: true });
  const endpoint = `/PostedPurchaseReceiptsH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedPurchaseHeader>>(endpoint);
}

export async function getPostedPurchaseReceiptLines(docNo: string) {
  const filter = `Document_No eq '${docNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PostedPurchaseRcptSubform?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedPurchaseLine>>(endpoint);
}

// Posted Invoice
export async function getPostedPurchaseInvoices(params: any = {}) {
  const query = buildODataQuery({ ...params, $count: true });
  const endpoint = `/PostedPurchaseInvoiceH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedPurchaseHeader>>(endpoint);
}

export async function getPostedPurchaseInvoiceLines(docNo: string) {
  const filter = `Document_No eq '${docNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PostedPurchInvoiceSubform?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedPurchaseLine>>(endpoint);
}

// Posted Return Shipment
export async function getPostedPurchaseReturnShipments(params: any = {}) {
  const query = buildODataQuery({ ...params, $count: true });
  const endpoint = `/PostedReturnShipmentH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedPurchaseHeader>>(endpoint);
}

export async function getPostedPurchaseReturnShipmentLines(docNo: string) {
  const filter = `Document_No eq '${docNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/GetPurchReturnShipmentLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedPurchaseLine>>(endpoint);
}

// Posted Credit Memo
export async function getPostedPurchaseCreditMemos(params: any = {}) {
  const query = buildODataQuery({ ...params, $count: true });
  const endpoint = `/PostedPurchaseCreditMemoH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedPurchaseHeader>>(endpoint);
}

export async function getPostedPurchaseCreditMemoLines(docNo: string) {
  const filter = `Document_No eq '${docNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PostedPurchCrMemoSubform?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedPurchaseLine>>(endpoint);
}
