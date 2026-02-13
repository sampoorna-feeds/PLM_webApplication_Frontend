/**
 * Sales Order API Service
 * Fetches sales orders from ERP OData V4 API
 */

import { apiGet, apiPost, apiPatch } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface SalesOrder {
  No: string;
  Sell_to_Customer_No: string;
  Sell_to_Customer_Name: string;
  Ship_to_Code?: string;
  Ship_to_Name?: string;
  Order_Date?: string;
  Posting_Date?: string;
  Document_Date?: string;
  External_Document_No?: string;
  Status?: string;
  Amt_to_Customer?: number;
  Location_Code?: string;
  Invoice_Type?: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  Shortcut_Dimension_3_Code?: string;
  Salesperson_Code?: string;
  "@odata.etag"?: string;
  [key: string]: unknown;
}

export interface GetSalesOrdersParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface PaginatedSalesOrdersResponse {
  orders: SalesOrder[];
  totalCount: number;
}

/**
 * Get sales orders with pagination and optional count
 */
export async function getSalesOrdersWithCount(
  params: GetSalesOrdersParams = {},
): Promise<PaginatedSalesOrdersResponse> {
  const {
    $select = "No,Sell_to_Customer_No,Sell_to_Customer_Name,Order_Date,Posting_Date,Document_Date,External_Document_No,Status,Amt_to_Customer",
    $filter,
    $orderby = "No desc",
    $top = 10,
    $skip,
  } = params;

  const queryParams: Record<string, unknown> = {
    $select,
    $top,
    $count: true,
  };

  if ($filter) queryParams.$filter = $filter;
  if ($orderby) queryParams.$orderby = $orderby;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(queryParams as Parameters<typeof buildODataQuery>[0]);
  const endpoint = `/SalesOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<SalesOrder>>(endpoint);

  return {
    orders: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

/**
 * Get a single sales order by document number
 */
export async function getSalesOrderByNo(
  orderNo: string,
): Promise<SalesOrder | null> {
  const filter = `No eq '${orderNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/SalesOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<SalesOrder>>(endpoint);
  const value = response.value;
  return value && value.length > 0 ? value[0] : null;
}

export interface SalesLine {
  Document_Type?: string;
  Document_No: string;
  Line_No: number;
  Type?: string;
  No?: string;
  Description?: string;
  Description_2?: string;
  Quantity?: number;
  Unit_of_Measure_Code?: string;
  Unit_of_Measure?: string;
  Unit_Price?: number;
  Line_Amount?: number;
  Line_Discount_Amount?: number;
  Line_Discount_Percent?: number;
  Amt_to_Customer?: number;
  MRP_Price?: number;
  Total_MRP?: number;
  GST_Group_Code?: string;
  HSN_SAC_Code?: string;
  FOC?: boolean;
  Exempted?: boolean;
  Location_Code?: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  ShortcutDimCode3?: string;
  [key: string]: unknown;
}

/**
 * Get sales order line items by document number
 */
export async function getSalesOrderLines(
  documentNo: string,
): Promise<SalesLine[]> {
  const escaped = documentNo.replace(/'/g, "''");
  const filter = `Document_No eq '${escaped}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/SalesLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<SalesLine>>(endpoint);
  return response.value || [];
}

/**
 * Send approval request for a sales order (Approve action)
 */
export async function sendApprovalRequest(
  salesOrderNo: string,
): Promise<unknown> {
  const endpoint = `/API_SendApprovalRequest?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { salesOrderNo });
}

/**
 * Reopen a sales order
 */
export async function reopenSalesOrder(salesOrderNo: string): Promise<unknown> {
  const endpoint = `/API_ReOpenSalesOrder?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { salesOrderNo });
}

/**
 * Update ship-to code on a sales order
 */
export async function orderShiptocodeModify(
  documentNo: string,
  shiptocode: string,
): Promise<unknown> {
  const endpoint = `/API_OrderShiptocodeModify?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { documentNo, shiptocode });
}

/**
 * Delete a sales order line (POST to API_SalesOrderLine with orderNo and lineNo)
 */
export async function deleteSalesOrderLine(
  orderNo: string,
  lineNo: number,
): Promise<unknown> {
  const endpoint = `/API_SalesOrderLine?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { orderNo, lineNo });
}

export interface AddSalesLinePayload {
  Document_No: string;
  Type: string;
  No: string;
  Location_Code: string;
  Quantity: number;
  Unit_of_Measure_Code: string;
}

/**
 * Add a new sales line
 */
export async function addSalesLine(
  line: AddSalesLinePayload,
): Promise<unknown> {
  const endpoint = `/SalesLine?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, line);
}

/**
 * Update an existing sales line (PATCH by key)
 */
export async function updateSalesLine(
  documentNo: string,
  lineNo: number,
  body: Record<string, unknown>,
): Promise<unknown> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/SalesLine(Document_Type='Order',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  return apiPatch<unknown>(endpoint, body);
}
