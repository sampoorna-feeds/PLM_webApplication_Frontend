import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface TransferOrder {
  No: string;
  Transfer_from_Code?: string;
  Transfer_from_Name?: string;
  Transfer_to_Code?: string;
  Transfer_to_Name?: string;
  External_Document_No?: string;
  In_Transit_Code?: string;
  Status?: string;
  Assigned_User_ID?: string;
  Direct_Transfer?: boolean;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  Posting_Date?: string;
  Shipment_Date?: string;
  Shipment_Method_Code?: string;
  Shipping_Agent_Code?: string;
  Shipping_Advice?: string;
  Receipt_Date?: string;
  Vehicle_No?: string;
  LR_RR_No?: string;
  LR_RR_Date?: string;
  Distance_Km?: number;
  Freight_Value?: number;
  Transporter_Code?: string;
  Transporter_Name?: string;
  Mode_of_Transport?: string;
  "@odata.etag"?: string;
  [key: string]: unknown;
}

export interface GetTransferOrdersParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface SearchTransferOrdersParams extends GetTransferOrdersParams {
  searchTerm?: string;
}

export interface PaginatedTransferOrdersResponse {
  orders: TransferOrder[];
  totalCount: number;
}

export async function getTransferOrdersWithCount(
  params: GetTransferOrdersParams = {},
): Promise<PaginatedTransferOrdersResponse> {
  const {
    $select = "No,Transfer_from_Code,Transfer_to_Code,In_Transit_Code,Status,Shipment_Date,Receipt_Date,Shortcut_Dimension_1_Code,Shortcut_Dimension_2_Code",
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

  const query = buildODataQuery(queryParams as any);
  // Using TransferHeader for GET as it exists.
  const endpoint = `/TransferHeader?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<TransferOrder>>(endpoint);

  return {
    orders: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

export async function searchTransferOrders(
  params: SearchTransferOrdersParams = {},
): Promise<PaginatedTransferOrdersResponse> {
  const { searchTerm, $top, $skip, ...rest } = params;
  if (!searchTerm || searchTerm.trim() === "") {
    return getTransferOrdersWithCount(rest as GetTransferOrdersParams);
  }

  const escaped = searchTerm.replace(/'/g, "''");
  const fieldsToSearch = [
    "No",
    "Transfer_from_Code",
    "Transfer_to_Code",
    "Shortcut_Dimension_1_Code",
    "Shortcut_Dimension_2_Code",
  ];

  const responses = await Promise.all(
    fieldsToSearch.map((field) => {
      const filterPart = `contains(${field},'${escaped}')`;
      const filter = rest.$filter
        ? `${rest.$filter} and ${filterPart}`
        : filterPart;
      return getTransferOrdersWithCount({ ...rest, $filter: filter });
    }),
  );

  const map: Record<string, TransferOrder> = {};
  responses.forEach((res) => {
    res.orders.forEach((o) => {
      map[o.No] = o;
    });
  });

  const allOrders = Object.values(map);
  const total = allOrders.length;

  let paged = allOrders;
  if ($skip !== undefined || $top !== undefined) {
    const start = $skip || 0;
    const end = $top != null ? start + $top : undefined;
    paged = allOrders.slice(start, end);
  }

  return { orders: paged, totalCount: total };
}

export async function getTransferOrderByNo(
  orderNo: string,
): Promise<TransferOrder | null> {
  const filter = `No eq '${orderNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/TransferHeader?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<TransferOrder>>(endpoint);
  const value = response.value;
  return value && value.length > 0 ? value[0] : null;
}

/**
 * Create a new transfer order (header)
 */
/**
 * Create a new transfer order (header)
 */
export async function createTransferOrder(
  data: Partial<TransferOrder>,
): Promise<TransferOrder> {
  // Using the path-based company format as requested by user
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/company('${encodedCompany}')/TransferHeader`;
  return apiPost<TransferOrder>(endpoint, data);
}

/**
 * Update an existing transfer order header
 */
export async function patchTransferOrder(
  orderNo: string,
  data: Partial<TransferOrder>,
): Promise<void> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const encodedNo = encodeURIComponent(orderNo);
  const endpoint = `/company('${encodedCompany}')/TransferHeader(No='${encodedNo}')`;

  const payload = stripEmptyValues(data as Record<string, unknown>);
  // Remove Business Central system fields if present
  delete payload["@odata.etag"];
  delete payload.No; // Primary key cannot be patched

  return apiPatch<void>(endpoint, payload);
}

export interface TransferLine {
  Document_No: string;
  Line_No: number;
  Item_No?: string;
  Exempted?: boolean;
  Breed_Code?: string;
  RPO_Created?: boolean;
  Chicks_Item?: boolean;
  Alternate_Quantity?: number;
  Alternate_UOM?: string;
  Weak_Bird_Quantity?: number;
  Transit_Mortality_Quantity?: number;
  Flock_No?: string;
  Item_Type?: string;
  Flock_Description?: string;
  Location_State_code?: string;
  Total_Taxable_Value?: number;
  New_LOB?: string;
  New_Branch?: string;
  New_Dimension_Set_ID?: number;
  Shortcut_Dimension_3_Code?: string;
  Variant_Code?: string;
  Planning_Flexibility?: string;
  Description?: string;
  Description_2?: string;
  Transfer_From_Bin_Code?: string;
  Transfer_To_Bin_Code?: string;
  Quantity?: number;
  Amount?: number;
  Transfer_Price?: number;
  GST_Credit?: string;
  Reserved_Quantity_Inbnd?: number;
  Reserved_Quantity_Shipped?: number;
  Reserved_Quantity_Outbnd?: number;
  Unit_of_Measure_Code?: string;
  Unit_of_Measure?: string;
  Qty_to_Ship?: number;
  Quantity_Shipped?: number;
  Qty_to_Receive?: number;
  Quantity_Received?: number;
  Shipment_Date?: string;
  Receipt_Date?: string;
  Custom_Duty_Amount?: number;
  GST_Assessable_Value?: number;
  GST_Group_Code?: string;
  HSN_SAC_Code?: string;
  GST_Add_on_Inventory?: string;
  Shipping_Agent_Code?: string;
  Shipping_Agent_Service_Code?: string;
  Shipping_Time?: string;
  Outbound_Whse_Handling_Time?: string;
  Inbound_Whse_Handling_Time?: string;
  Appl_to_Item_Entry?: number;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  [key: string]: unknown;
}

export async function getTransferOrderLines(
  documentNo: string,
): Promise<TransferLine[]> {
  const escaped = documentNo.replace(/'/g, "''");
  const filter = `Document_No eq '${escaped}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/TransferLine?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<TransferLine>>(endpoint);
  return response.value || [];
}

/**
 * Create a new transfer order line
 */
export async function createTransferLine(
  data: Partial<TransferLine>,
): Promise<TransferLine> {
  const endpoint = `/TransferLine?company='${encodeURIComponent(COMPANY)}'`;

  const payload = stripEmptyValues(data as Record<string, unknown>);

  return apiPost<TransferLine>(endpoint, payload);
}

/**
 * Update an existing transfer line
 */
export async function updateTransferLine(
  documentNo: string,
  lineNo: number,
  data: Partial<TransferLine>,
): Promise<TransferLine> {
  const endpoint = `/TransferLine(Document_No='${encodeURIComponent(documentNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  const payload = stripEmptyValues(data as Record<string, unknown>);
  return apiPatch<TransferLine>(endpoint, payload);
}

/**
 * Remove properties whose value is `undefined`, `null` or an empty string.
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

/**
 * Delete a transfer line
 */
export async function deleteTransferLine(
  documentNo: string,
  lineNo: number,
): Promise<void> {
  const endpoint = `/TransferLine(Document_No='${encodeURIComponent(documentNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  return apiDelete(endpoint);
}
