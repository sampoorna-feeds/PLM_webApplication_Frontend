import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface PostedSalesHeader {
  No: string;
  Sell_to_Customer_No?: string;
  Sell_to_Customer_Name?: string;
  Posting_Date?: string;
  Document_Date?: string;
  Location_Code?: string;
  [key: string]: unknown;
}

export interface PostedSalesLine {
  Document_No: string;
  Line_No: number;
  No?: string;
  Description?: string;
  Quantity?: number;
  [key: string]: unknown;
}

// Posted Sales Credit Memo
export async function getPostedSalesCreditMemos(params: any = {}) {
  const query = buildODataQuery({ ...params, $count: true });
  const endpoint = `/PostedSalesCreditMemoH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedSalesHeader>>(endpoint);
}

export async function getPostedSalesCreditMemoLines(docNo: string) {
  const filter = `Document_No eq '${docNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PostedSalesCrMemoSubform?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedSalesLine>>(endpoint);
}
