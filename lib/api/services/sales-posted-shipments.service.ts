import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface PostedSalesShipment {
  No: string;
  Sell_to_Customer_No: string;
  Sell_to_Customer_Name: string;
  Order_No?: string;
  Posting_Date?: string;
  Document_Date?: string;
  Shipment_Date?: string;
  External_Document_No?: string;
  Location_Code?: string;
  Salesperson_Code?: string;
  Ship_to_Code?: string;
  Ship_to_Name?: string;
  Bill_to_Customer_No?: string;
  Bill_to_Name?: string;
  Currency_Code?: string;
  Transporter_Code?: string;
  Vehicle_No?: string;
  LR_RR_No?: string;
  LR_RR_Date?: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  "@odata.etag"?: string;
  [key: string]: unknown;
}

export interface PostedSalesShipmentLine {
  Document_No: string;
  Line_No: number;
  Type?: string;
  No?: string;
  Description?: string;
  Quantity?: number;
  Qty_Invoiced?: number;
  Unit_of_Measure_Code?: string;
  Unit_of_Measure?: string;
  Unit_Price?: number;
  Line_Amount?: number;
  Line_Discount_Percent?: number;
  GST_Group_Code?: string;
  HSN_SAC_Code?: string;
  Location_Code?: string;
  [key: string]: unknown;
}

export interface GetPostedShipmentsParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
}

export interface PaginatedPostedShipmentsResponse {
  orders: PostedSalesShipment[];
  totalCount: number;
}

export async function getPostedShipmentsWithCount(
  params: GetPostedShipmentsParams = {},
): Promise<PaginatedPostedShipmentsResponse> {
  const { $select, $filter, $orderby = "No desc", $top = 10, $skip } = params;
  const queryParams: Record<string, unknown> = { $top, $count: true };
  if ($select) queryParams.$select = $select;
  if ($filter) queryParams.$filter = $filter;
  if ($orderby) queryParams.$orderby = $orderby;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(
    queryParams as Parameters<typeof buildODataQuery>[0],
  );
  const endpoint = `/SalesShipment_?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PostedSalesShipment>>(endpoint);
  return {
    orders: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

export async function searchPostedShipments(
  params: GetPostedShipmentsParams & { searchTerm?: string },
): Promise<PaginatedPostedShipmentsResponse> {
  const { searchTerm, $top, $skip, ...rest } = params;
  if (!searchTerm?.trim()) return getPostedShipmentsWithCount({ ...rest, $top, $skip });

  const escaped = searchTerm.replace(/'/g, "''");
  const fields = ["No", "Sell_to_Customer_No", "Sell_to_Customer_Name", "Order_No"];
  const responses = await Promise.all(
    fields.map((field) => {
      const filterPart = `contains(${field},'${escaped}')`;
      const filter = rest.$filter
        ? `${rest.$filter} and ${filterPart}`
        : filterPart;
      return getPostedShipmentsWithCount({ ...rest, $filter: filter });
    }),
  );

  const map: Record<string, PostedSalesShipment> = {};
  responses.forEach((res) => res.orders.forEach((o) => { map[o.No] = o; }));
  const all = Object.values(map);
  const start = $skip || 0;
  const end = $top != null ? start + $top : undefined;
  return { orders: all.slice(start, end), totalCount: all.length };
}

export async function getPostedShipmentByNo(
  no: string,
): Promise<PostedSalesShipment | null> {
  const filter = `No eq '${no.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/SalesShipment_?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PostedSalesShipment>>(endpoint);
  return response.value?.[0] ?? null;
}

export async function getPostedShipmentLines(
  documentNo: string,
): Promise<PostedSalesShipmentLine[]> {
  const filter = `Document_No eq '${documentNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/SalesShipmentLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PostedSalesShipmentLine>>(endpoint);
  return response.value || [];
}
