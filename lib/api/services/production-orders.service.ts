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
  branchCodes: string[] = [],
): string {
  const lobFilter =
    lobCodes.length > 0
      ? `(${lobCodes.map((code) => `'${code}'`).join(",")})`
      : "('CATTLE','CBF','FEED')"; // Fallback to default

  let filter = `Status eq '${status}' and Shortcut_Dimension_1_Code in ${lobFilter}`;

  if (branchCodes.length > 0) {
    const branchFilter = `(${branchCodes.map((code) => `'${code}'`).join(",")})`;
    filter += ` and Shortcut_Dimension_2_Code in ${branchFilter}`;
  }

  return filter;
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
  branchCodes: string[] = [],
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
    $filter || buildProductionOrderFilter("Released", lobCodes, branchCodes);

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
  branchCodes: string[] = [],
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
    totalCount: response["@odata.count"] ?? 0,
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
 * @param data - Data to update
 */
export async function updateProductionOrderLine(
  prodOrderNo: string,
  lineNo: number,
  data: {
    Quantity?: number;
    Description?: string;
    Location_Code?: string;
  },
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
 * @param data - Data to update
 */
export async function updateProductionOrderComponent(
  prodOrderNo: string,
  prodOrderLineNo: number,
  lineNo: number,
  data: {
    Quantity_per?: number;
    Description?: string;
    Location_Code?: string;
    Item_No?: string;
  },
): Promise<void> {
  const encodedProdOrderNo = encodeURIComponent(prodOrderNo);
  const encodedCompany = encodeURIComponent(COMPANY);

  const endpoint = `/Company('${encodedCompany}')/ReleaseprodOrderComponenet('Released','${encodedProdOrderNo}',${prodOrderLineNo},${lineNo})`;

  await apiPatch<void>(endpoint, data);
}

// ============================================
// GET COMPONENT SUBSTITUTES
// ============================================

export interface LotAvailability {
  Location_Code: string;
  ItemNo: string;
  LotNo: string;
  RemainingQty: number;
  Expiration_Date: string;
  ReservedQty: number;
}

/**
 * Get item availability by lot (used for finding available inventory)
 * Uses endpoint: ItemAvailabilitybyLot?$filter=ItemNo eq 'X' and Location_Code eq 'Y'
 */
export async function getItemAvailability(
  itemNo: string,
  locationCode: string,
): Promise<LotAvailability[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const filter = `ItemNo eq '${itemNo}' and Location_Code eq '${locationCode}'`;
  const endpoint = `/Company('${encodedCompany}')/ItemAvailabilitybyLot?$filter=${encodeURIComponent(filter)}`;

  const response = await apiGet<ODataResponse<LotAvailability>>(endpoint);
  return response?.value || [];
}

/**
 * @deprecated Use getItemAvailability instead - this is an alias for backward compatibility
 */
export async function getComponentSubstitutes(
  itemNo: string,
  locationCode: string,
): Promise<LotAvailability[]> {
  return getItemAvailability(itemNo, locationCode);
}

export interface SubstituteItem {
  Item_No: string;
  Description: string;
  Quantity: number;
  [key: string]: unknown;
}

/**
 * Get component substitutes using API_GetCompSubst endpoint
 * This endpoint returns substitute items for a specific component
 * @param prodOrderNo - Production Order No
 * @param prodOrderLineNo - Production Order Line No
 * @param componentLineNo - Component Line No
 */
export async function getSubstituteItems(
  prodOrderNo: string,
  prodOrderLineNo: number,
  componentLineNo: number,
): Promise<SubstituteItem[]> {
  const endpoint = `/API_GetCompSubst?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    prodorderNo: prodOrderNo,
    prodOrderLine: prodOrderLineNo,
    lineno: componentLineNo,
  };

  try {
    const response = await apiPost<any>(endpoint, payload);
    // The response structure may vary - handle different cases
    if (Array.isArray(response)) return response;
    if (response?.value && Array.isArray(response.value)) return response.value;
    return [];
  } catch (error) {
    console.error("Error fetching substitute items:", error);
    return [];
  }
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
  sourcerefNo: number; // Component Line_No (0 for lines)
  lotNo: string;
  expirationDate?: string;
  /** 'line' for production order lines, 'component' for components. Defaults to 'component' */
  trackingType?: "line" | "component";
}

/**
 * Assign item tracking (lot number) to a production order line or component
 * @param params - Item tracking parameters
 * - For lines: sourceType = 5406, sourcerefNo = 0
 * - For components: sourceType = 5407, sourcerefNo = component Line_No
 */
export async function assignItemTracking(
  params: AssignItemTrackingParams,
): Promise<unknown> {
  const endpoint = `/API_TrackingAssign?company='${encodeURIComponent(COMPANY)}'`;

  // Determine sourceType based on tracking type
  // 5406 = Production Order Line, 5407 = Production Order Component
  const sourceType = params.trackingType === "line" ? 5406 : 5407;

  const payload = {
    itemNo: params.itemNo,
    locationCode: params.locationCode,
    qyantity: params.quantity, // Note: API has typo "qyantity"
    sourceProdOrderLine: params.sourceProdOrderLine,
    sourceType: sourceType,
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

// ============================================
// GET ITEM AVAILABILITY BY LOT
// ============================================

export async function getItemAvailabilityByLot(
  itemNo: string,
  locationCode?: string,
): Promise<LotAvailability[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  let filter = `ItemNo eq '${itemNo}'`;

  if (locationCode) {
    filter += ` and Location_Code eq '${locationCode}'`;
  }

  // Update to correct endpoint structure provided by user
  const endpoint = `/Company('${encodedCompany}')/ItemAvailabilitybyLot?$filter=${encodeURIComponent(filter)}`;

  const response = await apiGet<ODataResponse<LotAvailability>>(endpoint);
  return response.value || [];
}

// ============================================
// PRINT QR CODE
// ============================================

export interface QRCodeResponse {
  value: string; // Assuming the base64 is returned in a 'value' property or similar.
  // If it's a raw string, we might need to adjust.
}

/**
 * Get QR Code PDF Base64
 * @param prodOrderNo - Production Order No
 */
export async function printQRCode(prodOrderNo: string): Promise<string> {
  const endpoint = `/API_QRCodePrint?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    prodOrderNo,
  };

  // The response structure from OData actions can vary.
  // Often it returns the result directly or wrapped in `value`.
  // We'll cast to any for flexibility first, but ideally we'd know the shape.
  const response = await apiPost<any>(endpoint, payload);

  // Check if response itself is the string, or inside value
  if (typeof response === "string") return response;
  if (response && response.value) return response.value;

  // Fallback: return response if it looks like a string, or empty
  return (response as string) || "";
}

// ============================================
// PRODUCTION JOURNAL
// ============================================

export interface ProductionJournalEntry {
  Line_No: number;
  Entry_Type: string;
  Item_No_: string;
  Quantity: number;
  Output_Quantity: number;
  [key: string]: unknown;
}

/**
 * Create production journal entries for a production order
 * @param prodOrderNo - Production Order No
 * @param lineNo - Production Order Line No
 * @param userId - User ID
 */
export async function createProductionJournal(
  prodOrderNo: string,
  lineNo: number,
  userId: string,
): Promise<unknown> {
  const endpoint = `/API_CreateProductionJn?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    prodOrderN: prodOrderNo,
    actualLineNo: lineNo,
    userID: userId,
  };

  return apiPost<unknown>(endpoint, payload);
}

/**
 * Get production journal entries for a production order
 * @param orderNo - Production Order No (e.g., 'RPO/2526/041517')
 */
export async function getProductionJournal(
  orderNo: string,
): Promise<ProductionJournalEntry[]> {
  const filter = `Order_No_ eq '${orderNo}' and Journal_Template_Name eq 'PROD.ORDEA'`;
  const select = "Line_No,Entry_Type,Item_No_,Quantity,Output_Quantity";
  const query = buildODataQuery({
    $filter: filter,
    $select: select,
  });
  const endpoint = `/ProductionJn?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response =
    await apiGet<ODataResponse<ProductionJournalEntry>>(endpoint);
  return response.value || [];
}
