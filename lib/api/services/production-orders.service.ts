/**
 * Production Order API Service
 * Handles fetching production orders from ERP OData V4 API
 */

import { apiGet, apiPost } from "../client";
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
 * Get production order components for a specific production order
 */
export async function getProductionOrderComponents(
  prodOrderNo: string,
  top: number = 100,
): Promise<ProductionOrderComponent[]> {
  const filter = `Prod_Order_No eq '${prodOrderNo}'`;
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
 */
export async function changeProductionOrderStatus(
  orderNo: string,
  newStatus: string,
): Promise<unknown> {
  const endpoint = `/API_ChangeProdOrderStatus?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    orderNo,
    status: newStatus,
  };

  return apiPost<unknown>(endpoint, payload);
}

/**
 * Refresh production order data
 */
export async function refreshProductionOrder(
  orderNo: string,
): Promise<unknown> {
  const endpoint = `/API_RefressProductionOrder?company='${encodeURIComponent(COMPANY)}'`;
  const payload = { orderNo };

  return apiPost<unknown>(endpoint, payload);
}
