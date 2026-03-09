import { apiGet } from "../client";
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
  Posting_Date?: string;
  Status?: string;
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
    $select = "No,Transfer_from_Code,Transfer_from_Name,Transfer_to_Code,Transfer_to_Name,Posting_Date,Status",
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
  // Assuming the entity is named TransferHeader
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
    "Transfer_from_Name",
    "Transfer_to_Code",
    "Transfer_to_Name",
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

export interface TransferLine {
  Document_No: string;
  Line_No: number;
  Item_No?: string;
  Description?: string;
  Appl_to_Item_Entry?: string;
  Quantity?: number;
  Transfer_Price?: number;
  Amount?: number;
  Qty_to_Ship?: number;
  Quantity_Shipped?: number;
  Qty_to_Receive?: number;
  Quantity_Received?: number;
  GST_Group_Code?: string;
  HSN_SAC_Code?: string;
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
