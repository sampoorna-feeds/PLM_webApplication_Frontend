import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface PostedSalesInvoiceHeader {
  No: string;
  Sell_to_Customer_No: string;
  Sell_to_Customer_Name: string;
  Order_No?: string;
  Order_Date?: string;
  Posting_Date?: string;
  Document_Date?: string;
  Shipment_Date?: string;
  External_Document_No?: string;
  Invoice_Type?: string;
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
  Due_Date?: string;
  Remaining_Amount?: number;
  Amount?: number;
  Amount_Including_VAT?: number;
  E_Invoice_Status?: string;
  E_Invoice_No?: string;
  E_Way_Bill_No?: string;
  Closed?: boolean;
  Cancelled?: boolean;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  "@odata.etag"?: string;
  [key: string]: unknown;
}

export interface PostedSalesInvoiceLine {
  Document_No: string;
  Line_No: number;
  Type?: string;
  No?: string;
  Description?: string;
  Quantity?: number;
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

export interface GetPostedInvoicesParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
}

export interface PaginatedPostedInvoicesResponse {
  orders: PostedSalesInvoiceHeader[];
  totalCount: number;
}

export async function getPostedInvoicesWithCount(
  params: GetPostedInvoicesParams = {},
): Promise<PaginatedPostedInvoicesResponse> {
  const { $select, $filter, $orderby = "No desc", $top = 10, $skip } = params;
  const queryParams: Record<string, unknown> = { $top, $count: true };
  if ($select) queryParams.$select = $select;
  if ($filter) queryParams.$filter = $filter;
  if ($orderby) queryParams.$orderby = $orderby;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(
    queryParams as Parameters<typeof buildODataQuery>[0],
  );
  const endpoint = `/PostedSalesInvoice?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PostedSalesInvoiceHeader>>(endpoint);
  return {
    orders: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

export async function searchPostedInvoices(
  params: GetPostedInvoicesParams & { searchTerm?: string },
): Promise<PaginatedPostedInvoicesResponse> {
  const { searchTerm, $top, $skip, ...rest } = params;
  if (!searchTerm?.trim()) return getPostedInvoicesWithCount(rest);

  const escaped = searchTerm.replace(/'/g, "''");
  const fields = ["No", "Sell_to_Customer_No", "Sell_to_Customer_Name", "Order_No"];
  const responses = await Promise.all(
    fields.map((field) => {
      const filterPart = `contains(${field},'${escaped}')`;
      const filter = rest.$filter
        ? `${rest.$filter} and ${filterPart}`
        : filterPart;
      return getPostedInvoicesWithCount({ ...rest, $filter: filter });
    }),
  );

  const map: Record<string, PostedSalesInvoiceHeader> = {};
  responses.forEach((res) => res.orders.forEach((o) => { map[o.No] = o; }));
  const all = Object.values(map);
  const start = $skip || 0;
  const end = $top != null ? start + $top : undefined;
  return { orders: all.slice(start, end), totalCount: all.length };
}

export async function getPostedInvoiceByNo(
  no: string,
): Promise<PostedSalesInvoiceHeader | null> {
  const filter = `No eq '${no.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PostedSalesInvoice?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PostedSalesInvoiceHeader>>(endpoint);
  return response.value?.[0] ?? null;
}

export async function getPostedInvoiceLines(
  documentNo: string,
): Promise<PostedSalesInvoiceLine[]> {
  const filter = `Document_No eq '${documentNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/PostedSalesInvoiceLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<PostedSalesInvoiceLine>>(endpoint);
  return response.value || [];
}
