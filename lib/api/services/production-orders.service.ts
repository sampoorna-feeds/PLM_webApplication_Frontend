/**
 * Production Order API Service
 * Handles fetching production orders from ERP OData V4 API
 */

import { apiGet, apiPost, apiPatch } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface ProductionOrder {
  "@odata.etag"?: string;
  Status?: string;
  No: string;
  Description: string;
  Description_2?: string;
  Source_Type?: string;
  Source_No: string;
  Search_Description?: string;
  Supervisor_Name?: string;
  Quantity: number;
  Due_Date?: string;
  Blocked?: boolean;
  Location_Code: string;
  Hatching_Date?: string;
  Breed_Code?: string;
  Hatchery_Entry?: boolean;
  Hatchery_Name?: string;
  Shortcut_Dimension_3_Code?: string;
  Hatchery_No?: string;
  Flock_No_Breeder?: string;
  Laying_EGG_Week?: number;
  STD_Percent?: number;
  Opening_Female_Bird?: number;
  DOC_Placing_Date?: string;
  Flock_Value?: number;
  Prod_Bom_No?: string;
  BOM_Version_No?: string;
  Batch_Size?: string;
  Variant_Code?: string;
  Assigned_User_ID?: string;
  Last_Date_Modified?: string;
  Starting_Time?: string;
  Starting_Date?: string;
  Ending_Time?: string;
  Ending_Date?: string;
  Starting_Date_Time?: string;
  Ending_Date_Time?: string;
  Inventory_Posting_Group?: string;
  Gen_Prod_Posting_Group?: string;
  Gen_Bus_Posting_Group?: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  Bin_Code?: string;
  "Batch_Barcode@odata.mediaEditLink"?: string;
  "Batch_Barcode@odata.mediaReadLink"?: string;
}

export interface ProductionOrderLine {
  Prod_Order_No: string;
  Line_No: number;
  Item_No: string;
  Description: string;
  Quantity: number;
  Unit_of_Measure_Code?: string;
  Location_Code?: string;
  Due_Date?: string;
  Finished_Quantity?: number;
  Remaining_Quantity?: number;
  [key: string]: unknown;
}

export interface ProductionOrderComponent {
  Prod_Order_No: string;
  Prod_Order_Line_No: number;
  Line_No: number;
  Item_No: string;
  Description: string;
  Quantity_per: number;
  Expected_Quantity: number;
  Remaining_Quantity?: number;
  Unit_of_Measure_Code?: string;
  Location_Code?: string;
  Substitution_Available?: boolean;
  [key: string]: unknown;
}

export interface GetProductionOrdersParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

/**
 * Build filter for production orders based on status and LOB codes
 */
function buildProductionOrderFilter(
  status: "Released" | "Finished",
  lobCodes: string[],
): string {
  const lobFilter =
    lobCodes.length > 0
      ? `(${lobCodes.map((code) => `'${code}'`).join(",")})`
      : "('CATTLE','CBF','FEED')"; // Fallback to default

  return `Status eq '${status}' and Shortcut_Dimension_1_Code in ${lobFilter}`;
}

/**
 * Response type for paginated production orders
 */
export interface PaginatedProductionOrdersResponse {
  orders: ProductionOrder[];
  totalCount: number;
}

/**
 * Get production orders (Released or Finished)
 */
export async function getProductionOrders(
  params: GetProductionOrdersParams = {},
  lobCodes: string[] = [],
): Promise<ProductionOrder[]> {
  const {
    $select = "No,Description,Source_No,Quantity,Location_Code",
    $filter,
    $orderby,
    $top = 10,
    $skip,
    $count,
  } = params;

  // Use provided filter or build default for Released status
  const finalFilter =
    $filter || buildProductionOrderFilter("Released", lobCodes);

  const queryParams: Record<string, any> = {
    $select,
    $filter: finalFilter,
    $top,
  };

  if ($orderby) queryParams.$orderby = $orderby;
  if ($skip !== undefined) queryParams.$skip = $skip;
  if ($count !== undefined) queryParams.$count = $count;

  const query = buildODataQuery(queryParams);
  const endpoint = `/ReleaseprodOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ProductionOrder>>(endpoint);
  return response.value;
}

/**
 * Get production orders with total count for pagination
 * Returns both the orders array and the total count
 */
export async function getProductionOrdersWithCount(
  params: GetProductionOrdersParams = {},
  lobCodes: string[] = [],
): Promise<PaginatedProductionOrdersResponse> {
  const {
    $select = "No,Description,Source_No,Quantity,Location_Code",
    $filter,
    $orderby,
    $top = 10,
    $skip,
  } = params;

  // Use provided filter or build default for Released status
  const finalFilter =
    $filter || buildProductionOrderFilter("Released", lobCodes);

  const queryParams: Record<string, any> = {
    $select,
    $filter: finalFilter,
    $top,
    $count: true, // Always request count
  };

  if ($orderby) queryParams.$orderby = $orderby;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(queryParams);
  const endpoint = `/ReleaseprodOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ProductionOrder>>(endpoint);
  
  return {
    orders: response.value,
    totalCount: response['@odata.count'] ?? 0,
  };
}

/**
 * Get a single production order by No with all details
 */
export async function getProductionOrderByNo(
  orderNo: string,
): Promise<ProductionOrder | null> {
  const filter = `No eq '${orderNo}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/ReleaseprodOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<ProductionOrder>>(endpoint);
  return response.value?.[0] || null;
}

/**
 * Get production order lines for a specific production order
 */
export async function getProductionOrderLines(
  prodOrderNo: string,
  top: number = 100,
): Promise<ProductionOrderLine[]> {
  const filter = `Prod_Order_No eq '${prodOrderNo}'`;
  const select =
    "Item_No,Description,Location_Code,Quantity,Unit_of_Measure_Code,Finished_Quantity,Remaining_Quantity,Line_No,Prod_Order_No";
  const query = buildODataQuery({
    $filter: filter,
    $select: select,
    $top: top,
  });
  const endpoint = `/ReleaseprodOrderLine?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<ProductionOrderLine>>(endpoint);
  return response.value || [];
}

/**
 * Get production order components for a specific production order line
 * @param prodOrderNo - Production Order No
 * @param prodOrderLineNo - Production Order Line No (required)
 */
export async function getProductionOrderComponents(
  prodOrderNo: string,
  prodOrderLineNo: number,
  top: number = 100,
): Promise<ProductionOrderComponent[]> {
  const filter = `Prod_Order_No eq '${prodOrderNo}' and Prod_Order_Line_No eq ${prodOrderLineNo}`;
  const select =
    "Item_No,Description,Location_Code,Quantity_per,Expected_Quantity,Remaining_Quantity,Substitution_Available,Prod_Order_No,Prod_Order_Line_No,Line_No";
  const query = buildODataQuery({
    $filter: filter,
    $select: select,
    $top: top,
  });
  const endpoint = `/ReleaseprodOrderComponenet?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response =
    await apiGet<ODataResponse<ProductionOrderComponent>>(endpoint);
  return response.value || [];
}

/**
 * Change production order status (e.g., mark as finished)
 * @param prodOrder - Production Order No
 * @param newPostingDate - New posting date (YYYY-MM-DD format)
 */
export async function changeProductionOrderStatus(
  prodOrder: string,
  newPostingDate: string,
): Promise<unknown> {
  const endpoint = `/API_ChangeProdOrderStatus?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    prodOrder,
    newPostingDate,
  };

  return apiPost<unknown>(endpoint, payload);
}

/**
 * Refresh production order data
 * @param prodOrder - Production Order No
 */
export async function refreshProductionOrder(
  prodOrder: string,
): Promise<unknown> {
  const endpoint = `/API_RefressProductionOrder?company='${encodeURIComponent(COMPANY)}'`;
  const payload = { prodOrder };

  return apiPost<unknown>(endpoint, payload);
}

// ============================================
// CREATE PRODUCTION ORDER
// ============================================

export interface CreateProductionOrderPayload {
  Status: "Released";
  Description: string;
  Source_Type: "Item" | "Family" | "Sales Header";
  Source_No: string;
  Quantity: number;
  Due_Date: string;
  Location_Code: string;
  Hatching_Date?: string;
  Shortcut_Dimension_1_Code: string; // LOB Code
  Shortcut_Dimension_2_Code: string; // Branch Code
  Shortcut_Dimension_3_Code: string; // LOC Code
  Prod_Bom_No?: string;
  BOM_Version_No?: string;
  Batch_Size?: string;
}

/**
 * Create a new production order
 * @param data - Production order data
 * @returns Created production order
 */
export async function createProductionOrder(
  data: CreateProductionOrderPayload,
): Promise<ProductionOrder> {
  const endpoint = `/ReleaseprodOrder?company='${encodeURIComponent(COMPANY)}'`;

  // Build the payload, only include BOM_Version_No if Prod_Bom_No is manually set
  const payload: Record<string, unknown> = {
    Status: "Released",
    Description: data.Description,
    Source_Type: data.Source_Type,
    Source_No: data.Source_No,
    Quantity: data.Quantity,
    Due_Date: data.Due_Date,
    Location_Code: data.Location_Code,
    Hatching_Date: data.Hatching_Date || "0001-01-01",
    Shortcut_Dimension_1_Code: data.Shortcut_Dimension_1_Code,
    Shortcut_Dimension_2_Code: data.Shortcut_Dimension_2_Code,
    Shortcut_Dimension_3_Code: data.Shortcut_Dimension_3_Code,
  };

  // Add Prod_Bom_No if provided
  if (data.Prod_Bom_No) {
    payload.Prod_Bom_No = data.Prod_Bom_No;
  }

  // Add BOM_Version_No only when Prod_Bom_No is manually filled (not from item)
  if (data.BOM_Version_No && data.Prod_Bom_No) {
    payload.BOM_Version_No = data.BOM_Version_No;
  }

  // Add Batch_Size if provided
  if (data.Batch_Size) {
    payload.Batch_Size = data.Batch_Size;
  }

  return apiPost<ProductionOrder>(endpoint, payload);
}

// ============================================
// UPDATE PRODUCTION ORDER LINE
// ============================================

/**
 * Update a production order line
 * Uses entity key format: ReleaseprodOrderLine(Status='Released',Prod_Order_No='...',Line_No=...)
 * @param prodOrderNo - Production order number
 * @param lineNo - Line number
 * @param data - Data to update (Quantity)
 */
export async function updateProductionOrderLine(
  prodOrderNo: string,
  lineNo: number,
  data: { Quantity: number }
): Promise<void> {
  // Encode the production order number for URL (handles slashes)
  const encodedProdOrderNo = encodeURIComponent(prodOrderNo);
  const encodedCompany = encodeURIComponent(COMPANY);
  
  const endpoint = `/Company('${encodedCompany}')/ReleaseprodOrderLine(Status='Released',Prod_Order_No='${encodedProdOrderNo}',Line_No=${lineNo})`;
  
  await apiPatch<void>(endpoint, data);
}

// ============================================
// UPDATE PRODUCTION ORDER COMPONENT
// ============================================

/**
 * Update a production order component
 * Uses entity key format: ReleaseprodOrderComponenet('Released','RPO/...',prodOrderLineNo,lineNo)
 * @param prodOrderNo - Production order number
 * @param prodOrderLineNo - Production order line number
 * @param lineNo - Component line number
 * @param data - Data to update (Quantity_per)
 */
export async function updateProductionOrderComponent(
  prodOrderNo: string,
  prodOrderLineNo: number,
  lineNo: number,
  data: { Quantity_per: number }
): Promise<void> {
  const encodedProdOrderNo = encodeURIComponent(prodOrderNo);
  const encodedCompany = encodeURIComponent(COMPANY);
  
  const endpoint = `/Company('${encodedCompany}')/ReleaseprodOrderComponenet('Released','${encodedProdOrderNo}',${prodOrderLineNo},${lineNo})`;
  
  await apiPatch<void>(endpoint, data);
}

// ============================================
// ASSIGN ITEM TRACKING
// ============================================

export interface AssignItemTrackingParams {
  itemNo: string;
  locationCode: string;
  quantity: number;
  sourceProdOrderLine: number; // Prod_Order_Line_No
  sourceID: string; // Prod_Order_No
  sourcerefNo: number; // Component Line_No
  lotNo: string;
  expirationDate?: string;
}

/**
 * Assign item tracking (lot number) to a production order component
 * @param params - Item tracking parameters
 */
export async function assignItemTracking(
  params: AssignItemTrackingParams
): Promise<unknown> {
  const endpoint = `/API_TrackingAssign?company='${encodeURIComponent(COMPANY)}'`;
  
  const payload = {
    itemNo: params.itemNo,
    locationCode: params.locationCode,
    qyantity: params.quantity, // Note: API has typo "qyantity"
    sourceProdOrderLine: params.sourceProdOrderLine,
    sourceType: 5407, // Fixed value for production order components
    sourceSubType: 3, // Fixed value for Released status
    sourceID: params.sourceID,
    sourceBatch: "",
    sourcerefNo: params.sourcerefNo,
    lotNo: params.lotNo,
    expirationdate: params.expirationDate || "0001-01-01",
    manufacuringdate: "0001-01-01",
    newExpirationdate: "0001-01-01",
    newManufacuringdate: "0001-01-01",
  };
  
  return apiPost<unknown>(endpoint, payload);
}
