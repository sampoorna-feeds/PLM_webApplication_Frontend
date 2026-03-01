/**
 * Sales Order API Service
 * Fetches sales orders from ERP OData V4 API
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
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

export interface SearchSalesOrdersParams extends GetSalesOrdersParams {
  /** term to search across multiple columns (No, Sell_to_Customer_No, Sell_to_Customer_Name) */
  searchTerm?: string;
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

  const query = buildODataQuery(
    queryParams as Parameters<typeof buildODataQuery>[0],
  );
  const endpoint = `/SalesOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<SalesOrder>>(endpoint);

  return {
    orders: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

/**
 * Search sales orders across a few fields when the server can't handle OR.
 * Combines results from three filtered queries and de‑dupes them client-side.
 * Paging is applied after merging.
 */
export async function searchSalesOrders(
  params: SearchSalesOrdersParams = {},
): Promise<PaginatedSalesOrdersResponse> {
  const { searchTerm, $top, $skip, ...rest } = params;
  if (!searchTerm || searchTerm.trim() === "") {
    return getSalesOrdersWithCount(rest as GetSalesOrdersParams);
  }

  const escaped = searchTerm.replace(/'/g, "''");
  const fieldsToSearch = [
    "No",
    "Sell_to_Customer_No",
    "Sell_to_Customer_Name",
  ];

  // perform one request per field
  const responses = await Promise.all(
    fieldsToSearch.map((field) => {
      const filterPart = `contains(${field},'${escaped}')`;
      const filter = rest.$filter ? `${rest.$filter} and ${filterPart}` : filterPart;
      return getSalesOrdersWithCount({ ...rest, $filter: filter });
    }),
  );

  const map: Record<string, SalesOrder> = {};
  responses.forEach((res) => {
    res.orders.forEach((o) => {
      map[o.No] = o;
    });
  });

  const allOrders = Object.values(map);
  const total = allOrders.length;

  // apply paging after merge
  let paged = allOrders;
  if ($skip !== undefined || $top !== undefined) {
    const start = $skip || 0;
    const end = $top != null ? start + $top : undefined;
    paged = allOrders.slice(start, end);
  }

  return { orders: paged, totalCount: total };
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
  Qty_to_Ship?: number;
  Quantity_Shipped?: number;
  Qty_to_Invoice?: number;
  Quantity_Invoiced?: number;
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
 * Cancel approval request for a sales order (Pending Approval -> Open)
 */
export async function cancelApprovalRequest(
  salesOrderNo: string,
): Promise<unknown> {
  const endpoint = `/API_CancelApprovalRequest?company='${encodeURIComponent(COMPANY)}'`;
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

/**
 * Delete a sales order header by key.
 * Use only after deleting child sales lines.
 */
export async function deleteSalesOrderHeader(
  orderNo: string,
): Promise<unknown> {
  const escapedNo = orderNo.replace(/'/g, "''");
  const endpoint = `/SalesOrder(Document_Type='Order',No='${encodeURIComponent(escapedNo)}')?company='${encodeURIComponent(COMPANY)}'`;
  return apiDelete<unknown>(endpoint);
}

export interface Transporter {
  No: string;
  Name: string;
  [key: string]: unknown;
}

export interface SalesShipment {
  "@odata.etag"?: string;
  No: string;
  Order_No_: string;
  CustomerCode?: string;
  CustomerName?: string;
  PostingDate?: string;
  SalespersonCode?: string;
  TeamCode?: string;
  OTP?: number;
  OTPVarified?: boolean;
  [key: string]: unknown;
}

/**
 * Get sales shipment records for a specific order number.
 */
export async function getSalesShipmentsByOrder(
  orderNo: string,
  postingDate?: string,
): Promise<SalesShipment[]> {
  const escaped = orderNo.replace(/'/g, "''");
  let filter = `Order_No_ eq '${escaped}'`;
  if (postingDate) {
    // expect yyyy-mm-dd format
    filter += ` and PostingDate eq ${escapeODataValue(postingDate)}`;
  }
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/SalesShipment?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<SalesShipment>>(endpoint);
  return response.value || [];
}

/**
 * Remove properties whose value is `undefined`, `null` or an empty string.
 * This is useful when constructing patch payloads where the API should only
 * receive the fields that the user has actually entered.
 */
export function stripEmptyValues(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && value.trim() === "")
    ) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, unknown>);
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Get transporter dropdown list from VendorCard
 * Filter: Transporter eq true and Blocked eq ''
 */
export async function getTransporters(
  top: number = 20,
  skip: number = 0,
): Promise<Transporter[]> {
  const safeTop = Math.max(1, Math.min(top, 200));
  const query = buildODataQuery({
    $select: "No,Name",
    $filter: "Transporter eq true and Blocked eq ''",
    $orderby: "No",
    $top: safeTop,
    $skip: Math.max(0, skip),
  });
  const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Transporter>>(endpoint);
  return response.value || [];
}

export async function searchTransporters(
  query: string,
  top: number = 30,
  skip: number = 0,
): Promise<Transporter[]> {
  if (!query || query.trim().length < 2) return [];
  const escaped = escapeODataValue(query.trim());
  const filter = `Transporter eq true and Blocked eq '' and (contains(No,'${escaped}') or contains(Name,'${escaped}'))`;
  const odataQuery = buildODataQuery({
    $select: "No,Name",
    $filter: filter,
    $orderby: "No",
    $top: Math.max(1, Math.min(top, 200)),
    $skip: Math.max(0, skip),
  });
  const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
  const response = await apiGet<ODataResponse<Transporter>>(endpoint);
  return response.value || [];
}

export async function searchTransportersByField(
  query: string,
  field: "No" | "Name",
  top: number = 30,
  skip: number = 0,
): Promise<Transporter[]> {
  if (!query || query.trim().length < 2) return [];
  const escaped = escapeODataValue(query.trim());
  const filter = `Transporter eq true and Blocked eq '' and contains(${field},'${escaped}')`;
  const odataQuery = buildODataQuery({
    $select: "No,Name",
    $filter: filter,
    $orderby: "No",
    $top: Math.max(1, Math.min(top, 200)),
    $skip: Math.max(0, skip),
  });
  const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
  const response = await apiGet<ODataResponse<Transporter>>(endpoint);
  return response.value || [];
}

export async function getTransportersPage(
  skip: number,
  search?: string,
  top: number = 30,
): Promise<Transporter[]> {
  if (search && search.trim().length >= 2) {
    return searchTransporters(search, top, skip);
  }
  return getTransporters(top, skip);
}

/**
 * Patch sales order header fields by document number
 */
export async function patchSalesOrderHeader(
  orderNo: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const escapedNo = orderNo.replace(/'/g, "''");
  const endpoint = `/SalesOrder(Document_Type='Order',No='${encodeURIComponent(escapedNo)}')?company='${encodeURIComponent(COMPANY)}'`;
  const payload = stripEmptyValues(body);
  return apiPatch<unknown>(endpoint, payload);
}

/**
 * Post sales order
 * defaultOption: 1-Ship, 2-Invoice, 3-Ship & Invoice
 */
export async function postSalesOrder(
  docNo: string,
  defaultOption: "1" | "2" | "3",
): Promise<unknown> {
  const endpoint = `/API_PostSales?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { docNo, defaultOption });
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
  const payload = stripEmptyValues(body);
  return apiPatch<unknown>(endpoint, payload);
}

// ============================================
// SALES ITEM TRACKING (LOT ASSIGN / GET / DELETE)
// Reuse getItemAvailabilityByLot, modifyItemTrackingLine from production-orders.service
// ============================================

export interface SalesItemTrackingLine {
  "@odata.etag"?: string;
  Entry_No: number;
  Positive?: boolean;
  Source_Type?: number;
  Source_Subtype?: string;
  Source_ID?: string;
  Source_Batch_Name?: string;
  Source_Prod_Order_Line?: number;
  Source_Ref_No_?: number;
  Item_No: string;
  Location_Code?: string;
  Lot_No?: string;
  Expiration_Date?: string;
  Quantity_Base?: number;
  Qty_to_Handl_Base?: number;
  [key: string]: unknown;
}

export interface AssignSalesItemTrackingParams {
  orderNo: string;
  lineNo: number;
  itemNo: string;
  locationCode: string;
  quantity: number;
  lotNo: string;
  expirationDate?: string;
}

/**
 * Assign item tracking (lot) to a sales order line.
 * POST API_TrackingAssign with sourceType 37, sourceSubType 1; quantity and qtytoHandle are negative.
 */
export async function assignSalesItemTracking(
  params: AssignSalesItemTrackingParams,
): Promise<unknown> {
  const endpoint = `/API_TrackingAssign?company='${encodeURIComponent(COMPANY)}'`;
  const qty = -Math.abs(params.quantity);
  const payload = {
    itemNo: params.itemNo,
    locationCode: params.locationCode,
    quantity: qty,
    qtytoHandle: qty,
    sourceProdOrderLine: 0,
    sourceType: 37,
    sourceSubType: 1,
    sourceID: params.orderNo,
    sourceBatch: "",
    sourcerefNo: params.lineNo,
    lotNo: params.lotNo,
    expirationdate: params.expirationDate || "0001-01-01",
    manufacuringdate: "0001-01-01",
    newExpirationdate: "0001-01-01",
    newManufacuringdate: "0001-01-01",
    reservationStatus: 2,
  };
  return apiPost<unknown>(endpoint, payload);
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Get item tracking lines for a sales order line.
 * Filter: Source_Type eq 37, Source_Subtype eq '1', Source_ID = order No., Source_Ref_No_ = line No., Item_No, Location_Code.
 */
export async function getSalesItemTrackingLines(
  orderNo: string,
  lineNo: number,
  itemNo: string,
  locationCode: string,
): Promise<SalesItemTrackingLine[]> {
  const filter = [
    `Source_ID eq '${escapeODataString(orderNo)}'`,
    `Source_Ref_No_ eq ${lineNo}`,
    `Item_No eq '${escapeODataString(itemNo)}'`,
    `Location_Code eq '${escapeODataString(locationCode)}'`,
    "Source_Type eq 37",
    "Source_Subtype eq '1'",
  ].join(" and ");
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/ItemTrackingLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<SalesItemTrackingLine>>(endpoint);
  return response.value || [];
}

/**
 * Delete a sales item tracking line (DELETE with URL only, no body).
 */
export async function deleteSalesItemTrackingLine(
  entryNo: number,
  positive: boolean,
): Promise<unknown> {
  const endpoint = `/ItemTrackingLine(Entry_No=${entryNo},Positive=${positive})?company='${encodeURIComponent(COMPANY)}'`;
  return apiDelete<unknown>(endpoint);
}
