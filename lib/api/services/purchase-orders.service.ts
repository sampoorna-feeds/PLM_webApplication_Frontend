/**
 * Purchase Order API Service
 * Fetches purchase orders from ERP OData V4 API
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface PurchaseOrder {
  No: string;
  Buy_from_Vendor_No: string;
  Buy_from_Vendor_Name: string;
  Ship_to_Code?: string;
  Ship_to_Name?: string;
  Order_Date?: string;
  Posting_Date?: string;
  Document_Date?: string;
  Vendor_Order_No?: string;
  Vendor_Invoice_No?: string;
  Status?: string;
  Location_Code?: string;
  Invoice_Type?: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  Shortcut_Dimension_3_Code?: string;
  /** API field: Purchaser_Code */
  Purchaser_Code?: string;
  PO_Type?: string;
  Service_Type?: string;
  Vendor_GST_Reg_No?: string;
  /** API field: P_A_N_No */
  P_A_N_No?: string;
  Order_Address_Code?: string;
  /** API field: Brokerage_Code (broker vendor number) */
  Brokerage_Code?: string;
  Brokerage_Rate?: number;
  Rate_Basis?: string;
  /** API field: Terms_Code */
  Terms_Code?: string;
  Mandi_Name?: string;
  File_No?: string;
  /** API field: Payment_Terms_Code */
  Payment_Terms_Code?: string;
  Payment_Method_Code?: string;
  /** API field: Due_Date_calculation (lowercase c) */
  Due_Date_calculation?: string;
  /** API field: Creditors_Type */
  Creditors_Type?: string;
  /** API field: QCType (no underscore) */
  QCType?: string;
  Due_Date?: string;
  Vehicle_No?: string;
  Line_Narration1?: string;
  /** API returns Freight as a string e.g. "0" */
  Freight?: string;
  Buy_from_City?: string;
  "@odata.etag"?: string;
  [key: string]: unknown;
}

export interface PurchaseReceipt {
  No: string;
  Order_No: string;
  Buy_from_Vendor_No?: string;
  Buy_from_Vendor_Name?: string;
  Posting_Date?: string;
  Document_Date?: string;
  Vendor_Shipment_No?: string;
  [key: string]: unknown;
}

export interface PurchaseReceiptLine {
  Document_No: string;
  Line_No: number;
  Type: string;
  No: string;
  Description: string;
  Quantity: number;
  [key: string]: unknown;
}

export interface ItemCharge {
  No: string;
  Description: string;
  [key: string]: unknown;
}

export interface GetPurchaseOrdersParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface SearchPurchaseOrdersParams extends GetPurchaseOrdersParams {
  /** term to search across multiple columns (No, Buy_from_Vendor_No, Buy_from_Vendor_Name) */
  searchTerm?: string;
}

export interface PaginatedPurchaseOrdersResponse {
  orders: PurchaseOrder[];
  totalCount: number;
}

/**
 * Get purchase orders with pagination and optional count
 */
export async function getPurchaseOrdersWithCount(
  params: GetPurchaseOrdersParams = {},
): Promise<PaginatedPurchaseOrdersResponse> {
  const {
    $select = "No,Buy_from_Vendor_No,Buy_from_Vendor_Name,Order_Date,Posting_Date,Document_Date,Vendor_Order_No,Status",
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
  const endpoint = `/PurchaseOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseOrder>>(endpoint);

  return {
    orders: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

/**
 * Search purchase orders across a few fields when the server can't handle OR.
 * Combines results from three filtered queries and de‑dupes them client-side.
 * Paging is applied after merging.
 */
export async function searchPurchaseOrders(
  params: SearchPurchaseOrdersParams = {},
): Promise<PaginatedPurchaseOrdersResponse> {
  const { searchTerm, $top, $skip, ...rest } = params;
  if (!searchTerm || searchTerm.trim() === "") {
    return getPurchaseOrdersWithCount(rest as GetPurchaseOrdersParams);
  }

  const escaped = searchTerm.replace(/'/g, "''");
  const fieldsToSearch = ["No", "Buy_from_Vendor_No", "Buy_from_Vendor_Name"];

  // perform one request per field
  const responses = await Promise.all(
    fieldsToSearch.map((field) => {
      const filterPart = `contains(${field},'${escaped}')`;
      const filter = rest.$filter
        ? `${rest.$filter} and ${filterPart}`
        : filterPart;
      return getPurchaseOrdersWithCount({ ...rest, $filter: filter });
    }),
  );

  const map: Record<string, PurchaseOrder> = {};
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
 * Get a single purchase order by document number
 */
export async function getPurchaseOrderByNo(
  orderNo: string,
): Promise<PurchaseOrder | null> {
  const filter = `No eq '${orderNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PurchaseOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseOrder>>(endpoint);
  const value = response.value;
  return value && value.length > 0 ? value[0] : null;
}

export interface PurchaseLine {
  Document_Type?: string;
  Document_No: string;
  Line_No: number;
  Type?: string;
  No?: string;
  Description?: string;
  Description_2?: string;
  Quantity?: number;
  Qty_to_Receive?: number;
  Quantity_Received?: number;
  Qty_to_Invoice?: number;
  Quantity_Invoiced?: number;
  Unit_of_Measure_Code?: string;
  Unit_of_Measure?: string;
  Direct_Unit_Cost?: number;
  Line_Amount?: number;
  Line_Discount_Amount?: number;
  Line_Discount_Percent?: number;
  Amt_to_Vendor?: number;
  GST_Group_Code?: string;
  HSN_SAC_Code?: string;
  FOC?: boolean;
  Exempted?: boolean;
  Location_Code?: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  ShortcutDimCode3?: string;
  TDS_Group_Code?: string;
  TDS_Section_Code?: string;
  FA_Posting_Type?: string;
  Salvage_Value?: number;
  No_of_Bags?: number;
  Challan_Qty?: number;
  Weight_Qty?: number;
  [key: string]: unknown;
}

/**
 * Get purchase order line items by document number
 */
export async function getPurchaseOrderLines(
  documentNo: string,
): Promise<PurchaseLine[]> {
  const escaped = documentNo.replace(/'/g, "''");
  const filter = `Document_No eq '${escaped}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/PurchaseLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseLine>>(endpoint);
  return response.value || [];
}

/**
 * Send approval request for a purchase order (Approve action)
 */
export async function sendApprovalRequest(docNo: string): Promise<unknown> {
  const endpoint = `/API_SendPurchaseApprovalReqeust?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { docNo });
}

/**
 * Cancel approval request for a purchase order (Pending Approval -> Open)
 */
export async function cancelApprovalRequest(docNo: string): Promise<unknown> {
  const endpoint = `/API_CancelApprovalPurchase?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { docNo });
}

/**
 * Reopen a purchase order
 */
export async function reopenPurchaseOrder(docNo: string): Promise<unknown> {
  const endpoint = `/API_ReopenPurchase?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { docNo });
}

/**
 * Update ship-to code on a purchase order
 */
export async function orderShiptocodeModify(
  documentNo: string,
  shiptocode: string,
): Promise<unknown> {
  const endpoint = `/API_OrderShiptocodeModify?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { documentNo, shiptocode });
}

/**
 * Delete a purchase order line (POST to API_PurchaseOrderLine with orderNo and lineNo)
 */
export async function deletePurchaseOrderLine(
  orderNo: string,
  lineNo: number,
): Promise<unknown> {
  const endpoint = `/API_PurchaseOrderLine?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { orderNo, lineNo });
}

/**
 * Delete a purchase order header by key.
 * Use only after deleting child purchase lines.
 */
export async function deletePurchaseOrderHeader(
  orderNo: string,
): Promise<unknown> {
  const escapedNo = orderNo.replace(/'/g, "''");
  const endpoint = `/PurchaseOrder(Document_Type='Order',No='${encodeURIComponent(escapedNo)}')?company='${encodeURIComponent(COMPANY)}'`;
  return apiDelete<unknown>(endpoint);
}

export interface Transporter {
  No: string;
  Name: string;
  [key: string]: unknown;
}

export interface PurchaseShipment {
  "@odata.etag"?: string;
  No: string;
  Order_No: string;
  Buy_from_Vendor_No?: string;
  Buy_from_Vendor_Name?: string;
  Transporter_Code?: string;
  LR_RR_No?: string;
  Vehicle_No?: string;
  LR_RR_Date?: string;
  Posting_Date?: string; // sometimes named this way in OData
  Purchaseperson_Code?: string;
  [key: string]: unknown;
}

export interface PostGateEntryLine {
  "@odata.etag"?: string;
  Entry_Type?: string;
  Gate_Entry_No: string;
  Line_No: number;
  Source_Type?: string;
  Source_No?: string;
  Source_Name?: string;
  Description?: string;
  Challan_No?: string;
  Challan_Date?: string;
  [key: string]: unknown;
}

export interface AttachGateEntryPayload {
  SourceType: string;
  SourceNo: string;
  EntryType: string;
  GateEntryNo: string;
  LineNo: number;
}

/**
 * Get purchase shipment records for a specific order number.
 */
export async function getPurchaseShipmentsByOrder(
  orderNo: string,
  postingDate?: string,
): Promise<PurchaseShipment[]> {
  const escaped = orderNo.replace(/'/g, "''");
  let filter = `Order_No eq '${escaped}'`;
  if (postingDate) {
    // expect yyyy-mm-dd format
    filter += ` and Posting_Date eq ${escapeODataValue(postingDate)}`;
  }
  const query = buildODataQuery({ $filter: filter });
  // API uses PurchaseShipment_ entity set
  const endpoint = `/PurchaseShipment_?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseShipment>>(endpoint);
  return response.value || [];
}

/**
 * Get post gate entry lines for a source document (for example a purchase order).
 */
export async function getPostGateEntryLineList(
  sourceNo: string,
  entryType: "Inward" | "Outward" = "Inward",
): Promise<PostGateEntryLine[]> {
  const escapedSourceNo = sourceNo.replace(/'/g, "''");
  const escapedEntryType = entryType.replace(/'/g, "''");
  const filter = `Entry_Type eq '${escapedEntryType}' and Source_No eq '${escapedSourceNo}'`;
  const query = buildODataQuery({
    $filter: filter,
    $orderby: "Line_No asc",
  });
  const endpoint = `/PostGateEntryLineList?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PostGateEntryLine>>(endpoint);
  return response.value || [];
}

/**
 * Attach a gate entry line to its source document.
 */
export async function attachGateEntry(
  payload: AttachGateEntryPayload,
): Promise<unknown> {
  const endpoint = `/API_AttachedGateEntry?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, payload);
}

/**
 * Remove properties whose value is `undefined`, `null` or an empty string.
 * This is useful when constructing patch payloads where the API should only
 * receive the fields that the user has actually entered.
 */
export function stripEmptyValues(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && value.trim() === "")
      ) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  );
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
 * Patch purchase order header fields by document number
 */
export async function patchPurchaseOrderHeader(
  orderNo: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const escapedNo = orderNo.replace(/'/g, "''");
  const endpoint = `/PurchaseOrder(Document_Type='Order',No='${encodeURIComponent(escapedNo)}')?company='${encodeURIComponent(COMPANY)}'`;
  const payload = stripEmptyValues(body);
  return apiPatch<unknown>(endpoint, payload);
}

/**
 * Post purchase order
 * defaultOption: 1-Receive, 2-Invoice, 3-Receive & Invoice
 */
export async function postPurchaseOrder(
  docNo: string,
  defaultOption: "1" | "2" | "3",
): Promise<unknown> {
  const endpoint = `/API_PostPurchase?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { docNo, defaultOption });
}

export interface AddPurchaseLinePayload {
  Document_No: string;
  Type: string;
  No: string;
  Location_Code: string;
  Quantity: number;
  Unit_of_Measure_Code: string;
}

/**
 * Add a new purchase line
 */
export async function addPurchaseLine(
  line: AddPurchaseLinePayload,
): Promise<unknown> {
  const endpoint = `/PurchaseLine?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, line);
}

/**
 * Update an existing purchase line (PATCH by key)
 */
export async function updatePurchaseLine(
  documentNo: string,
  lineNo: number,
  body: Record<string, unknown>,
): Promise<unknown> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/PurchaseLine(Document_Type='Order',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  const payload = stripEmptyValues(body);
  return apiPatch<unknown>(endpoint, payload);
}

// ============================================
// GST AND HSN SAC CODES
// ============================================

export interface GstGroupCode {
  Code: string;
  GST_Group_Type: string;
  Reverse_Charge: boolean;
}

export async function getGstGroupCodes(): Promise<GstGroupCode[]> {
  const endpoint = `/GSTGroup?company='${encodeURIComponent(COMPANY)}'&$select=Code,GST_Group_Type,Reverse_Charge`;
  const response = await apiGet<ODataResponse<GstGroupCode>>(endpoint);
  return response.value || [];
}

export interface HsnSacCode {
  GST_Group_Code: string;
  Code: string;
  Type: string;
}

export async function getHsnSacCodes(
  gstGroupCode: string,
): Promise<HsnSacCode[]> {
  const endpoint = `/HSNSAC?company='${encodeURIComponent(COMPANY)}'&$select=GST_Group_Code,Code,Type&$filter=GST_Group_Code eq '${encodeURIComponent(gstGroupCode)}'`;
  const response = await apiGet<ODataResponse<HsnSacCode>>(endpoint);
  return response.value || [];
}

// ============================================
// SALES ITEM TRACKING (LOT ASSIGN / GET / DELETE)
// Reuse getItemAvailabilityByLot, modifyItemTrackingLine from production-orders.service
// ============================================

export interface PurchaseItemTrackingLine {
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

export interface AssignPurchaseItemTrackingParams {
  orderNo: string;
  lineNo: number;
  itemNo: string;
  locationCode: string;
  quantity: number;
  lotNo: string;
  expirationDate?: string;
}

/**
 * Assign item tracking (lot) to a purchase order line.
 * POST API_TrackingAssign with sourceType 37, sourceSubType 1; quantity and qtytoHandle are negative.
 */
export async function assignPurchaseItemTracking(
  params: AssignPurchaseItemTrackingParams,
): Promise<unknown> {
  const endpoint = `/API_TrackingAssign?company='${encodeURIComponent(COMPANY)}'`;
  const qty = Math.abs(params.quantity);
  const payload = {
    itemNo: params.itemNo,
    locationCode: params.locationCode,
    quantity: qty,
    qtytoHandle: qty,
    sourceProdOrderLine: 0,
    sourceType: 39,
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
 * Get item tracking lines for a purchase order line.
 * Filter: Source_Type eq 37, Source_Subtype eq '1', Source_ID = order No., Source_Ref_No_ = line No., Item_No, Location_Code.
 */
export async function getPurchaseItemTrackingLines(
  orderNo: string,
  lineNo: number,
  itemNo: string,
  locationCode: string,
): Promise<PurchaseItemTrackingLine[]> {
  const filter = [
    `Source_ID eq '${escapeODataString(orderNo)}'`,
    `Source_Ref_No_ eq ${lineNo}`,
    `Item_No eq '${escapeODataString(itemNo)}'`,
    `Location_Code eq '${escapeODataString(locationCode)}'`,
    "Source_Type eq 39",
    "Source_Subtype eq '1'",
  ].join(" and ");
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/ItemTrackingLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response =
    await apiGet<ODataResponse<PurchaseItemTrackingLine>>(endpoint);
  return response.value || [];
}

/**
 * Delete a purchase item tracking line (DELETE with URL only, no body).
 */
export async function deletePurchaseItemTrackingLine(
  entryNo: number,
  positive: boolean,
): Promise<unknown> {
  const endpoint = `/ItemTrackingLine(Entry_No=${entryNo},Positive=${positive})?company='${encodeURIComponent(COMPANY)}'`;
  return apiDelete<unknown>(endpoint);
}

// ============================================
// TAX COMPONENTS INFORMATION
// ============================================
export interface TaxComponentInfo {
  Component: string;
  Percent: string;
  Amount: string;
}

/**
 * Get tax components for a purchase/sales line.
 * Fetches base64 encoded JSON, decodes and parses.
 */
export async function getTaxComponents(
  documentNo: string,
  lineNo: number,
  tableID: string = "39",
): Promise<TaxComponentInfo[]> {
  const endpoint = `/API_GetTaxComponentsInJsonSales_Purchase?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    tableID,
    documentNo,
    lineNo,
  };
  const response = await apiPost<{ value: string }>(endpoint, payload);
  if (!response || !response.value) return [];

  try {
    // Decoding base64 to utf-8 string using atob
    const b64 = response.value;
    const decoded =
      typeof window !== "undefined"
        ? atob(b64)
        : Buffer.from(b64, "base64").toString("utf-8");

    return JSON.parse(decoded) as TaxComponentInfo[];
  } catch (err) {
    console.error("Failed to parse tax components", err);
    return [];
  }
}

/**
 * Get purchase receipts for a specific order number.
 */
export async function getPurchasereceipts(
  orderNo: string,
): Promise<PurchaseReceipt[]> {
  const escaped = orderNo.replace(/'/g, "''");
  const filter = `Order_No eq '${escaped}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/Purchasereceipt?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseReceipt>>(endpoint);
  return response.value || [];
}

/**
 * Get Purchase Order Report (Base64 PDF)
 */
export async function getPurchaseOrderReport(orderNo: string): Promise<string> {
  const endpoint = `/API_GetPurchaseOrderReport?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<{ value: string }>(endpoint, { orderNo });
  return response.value || "";
}

/**
 * Get Purchase Receipt Report (MRN Report - Base64 PDF)
 */
export async function getPurchasereceiptReport(MRNNo: string): Promise<string> {
  const endpoint = `/API_GetPurchasereceiptReport?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<{ value: string }>(endpoint, { MRNNo });
  return response.value || "";
}

/**
 * Get Item Charges list
 */
export async function getItemCharges(): Promise<ItemCharge[]> {
  const endpoint = `/Itemcharge?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiGet<ODataResponse<ItemCharge>>(endpoint);
  return response.value || [];
}

/**
 * Get Purchase Receipt Lines for a specific MRN.
 * Filtered by Item type usually for charge assignment.
 */
export async function getPurchasereceiptLines(
  mrnNo: string,
  itemNo?: string,
): Promise<PurchaseReceiptLine[]> {
  const escapedMrn = mrnNo.replace(/'/g, "''");
  let filter = `Document_No eq '${escapedMrn}' and Type eq 'Item'`;
  if (itemNo) {
    filter += ` and No eq '${itemNo.replace(/'/g, "''")}'`;
  }
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PurchasereceiptLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PurchaseReceiptLine>>(endpoint);
  return response.value || [];
}

/**
 * Assign Item Charge to a Purchase Receipt Line using API_TrackingAssign.
 */
export async function assignItemCharge(params: {
  itemChargeNo: string;
  mrnNo: string;
  lineNo: number;
  amount: number;
  locationCode?: string;
}): Promise<unknown> {
  const endpoint = `/API_TrackingAssign?company='${encodeURIComponent(COMPANY)}'`;
  // Using the structure provided by the user for item charge assignment via TrackingAssign
  const payload = {
    itemNo: params.itemChargeNo,
    locationCode: params.locationCode || "",
    quantity: params.amount,
    qtytoHandle: params.amount,
    sourceProdOrderLine: 0,
    sourceType: 123, // 123 for Purchase Receipt Line in this context
    sourceSubType: 0,
    sourceID: params.mrnNo,
    sourceBatch: "",
    sourcerefNo: params.lineNo,
    appliestoDocType: 1, // Order? or Receipt? User said appliestoDocNo is MRN
    appliestoDocNo: params.mrnNo,
    appliestoDocLineNo: params.lineNo,
    lotNo: "",
    expirationdate: "0001-01-01",
    manufacuringdate: "0001-01-01",
    newExpirationdate: "0001-01-01",
    newManufacuringdate: "0001-01-01",
    reservationStatus: 2,
  };
  return apiPost<unknown>(endpoint, payload);
}
