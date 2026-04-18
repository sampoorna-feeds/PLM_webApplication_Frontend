import { apiGet, apiPost, apiPatch } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface QCReceiptHeader {
  No: string;
  Item_No: string;
  Vehicle_No: string;
  Item_Name: string;
  Unit_of_Measure: string;
  Item_Tracking: string;
  QC_Date: string;
  Receipt_Date: string;
  Location_Code: string;
  Inspection_Quantity: number;
  Sample_Quantity: number;
  Quantity_to_Accept: number;
  Qty_to_Accept_with_Deviation: number;
  Quantity_to_Reject: number;
  Quantity_to_Rework: number;
  Checked_By: string;
  Approve: boolean;
  Accepted_With_Approval: boolean;
  Rabete_Percent: number;
  Approved_By: string;
  Approval_Status: string;
  Create_Bardana: boolean;
  Comment: string;
  Item_Description: string;
  Remaining_Quantity: number;
  Exp_Date: string;
  Mfg_Date: string;
  No_of_Container: number;
  QC_Location: string;
  QC_Bin_Code: string;
  Store_Location_Code: string;
  Store_Bin_Code: string;
  Rejection_Location: string;
  Reject_Bin_Code: string;
  Rework_Location: string;
  Rework_Bin_Code: string;
  Purchase_Order_No: string;
  Order_Date: string;
  Document_Type: string;
  Document_No: string;
  Document_Line_No: number;
  Purchase_Receipt_No: string;
  Buy_from_Vendor_No: string;
  Buy_from_Vendor_Name: string;
  Vendor_Shipment_No: string;
  Vendor_Lot_No: string;
  Item_Journal_Template_Name: string;
  Item_General_Batch_Name: string;
  Item_Journal_Line_No: number;
  Center_Type: string;
  Center_No: string;
  Operation_No: string;
  Operation_Name: string;
  Sell_to_Customer_No: string;
  Sell_to_Customer_Name: string;
  Party_Type: string;
  Party_No: string;
  Party_Name: string;
  Address: string;
  Phone_no: string;
  Sample_QC: boolean;
  Total_Accepted_Quantity: number;
  Total_Under_Deviation_Acc_Qty: number;
  Total_Rejected_Quantity: number;
  "@odata.etag"?: string;
}

export interface QCReceiptLine {
  No: string;
  Line_No: number;
  Quality_Parameter_Code: string;
  Method_Description: string;
  Description: string;
  Unit_of_Measure_Code: string;
  Type: string;
  Min_Value: number;
  Max_Value: number;
  Text_Value: string;
  Actual_Value: number;
  Max_Deviation_Allowed: number;
  Deviation_Percent: number;
  Actual_Text: string;
  Rejection: boolean;
  Rejected_Qty: number;
  Mandatory: boolean;
  Result: string;
  "@odata.etag"?: string;
}

export interface GetQCReceiptsParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface PaginatedQCReceiptsResponse {
  receipts: QCReceiptHeader[];
  totalCount: number;
}

export async function getQCReceiptsWithCount(
  params: GetQCReceiptsParams = {},
): Promise<PaginatedQCReceiptsResponse> {
  const {
    $select,
    $filter,
    $orderby = "No desc",
    $top = 10,
    $skip,
  } = params;

  const queryParams: Record<string, unknown> = {
    $top,
    $count: true,
  };

  if ($select) queryParams.$select = $select;
  if ($filter) queryParams.$filter = $filter;
  if ($orderby) queryParams.$orderby = $orderby;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(queryParams as any);
  const endpoint = `/QCReceiptH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<QCReceiptHeader>>(endpoint);

  return {
    receipts: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

export async function getQCReceiptLines(
  receiptNo: string,
): Promise<QCReceiptLine[]> {
  const escaped = receiptNo.replace(/'/g, "''");
  const filter = `No eq '${escaped}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/QCreceiptLine?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<QCReceiptLine>>(endpoint);
  return response.value || [];
}

/**
 * Post a QC receipt by creating records in QCReceiptPostedH and QCReceiptPostedLine.
 * @param header The QC receipt header to post.
 * @param lines The QC receipt lines to post.
 */
export async function postQCReceipt(
  header: QCReceiptHeader,
  lines: QCReceiptLine[],
): Promise<void> {
  const headerEndpoint = `/QCReceiptPostedH?company='${encodeURIComponent(COMPANY)}'`;
  const lineEndpoint = `/QCReceiptPostedLine?company='${encodeURIComponent(COMPANY)}'`;

  // Helper to remove metadata and empty/calculated fields
  const cleanData = (data: any) => {
    const { "@odata.etag": _, ...rest } = data;
    return Object.entries(rest).reduce(
      (acc, [key, value]) => {
        // Remove empty strings, nulls, and potentially read-only calculated fields (start with Total_)
        if (
          value !== undefined &&
          value !== null &&
          !(typeof value === "string" && value.trim() === "") &&
          !key.startsWith("Total_")
        ) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>,
    );
  };

  const headerData = cleanData(header);

  try {
    console.log("Posting QC Header:", headerData);
    await apiPost(headerEndpoint, headerData);
  } catch (error: any) {
    console.error("Error posting QC receipt header:", {
      message: error.message,
      details: error.details,
      status: error.status,
      error,
    });
    const detail = error.details || error.message || JSON.stringify(error);
    throw new Error(`Failed to post header: ${detail}`);
  }

  // Then post each line
  try {
    for (const line of lines) {
      const lineData = cleanData(line);
      console.log(`Posting QC Line ${line.Line_No}:`, lineData);
      await apiPost(lineEndpoint, lineData);
    }
  } catch (error: any) {
    console.error("Error posting QC receipt lines:", {
      message: error.message,
      details: error.details,
      status: error.status,
      error,
    });
    const detail = error.details || error.message || JSON.stringify(error);
    throw new Error(`Failed to post lines: ${detail}`);
  }
}

/**
 * Get posted QC receipts with count for pagination.
 */
export async function getPostedQCReceiptsWithCount(
  params: GetQCReceiptsParams = {},
): Promise<PaginatedQCReceiptsResponse> {
  const {
    $select,
    $filter,
    $orderby = "No desc",
    $top = 10,
    $skip,
  } = params;

  const queryParams: Record<string, unknown> = {
    $top,
    $count: true,
  };

  if ($select) queryParams.$select = $select;
  if ($filter) queryParams.$filter = $filter;
  if ($orderby) queryParams.$orderby = $orderby;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(queryParams as any);
  const endpoint = `/QCReceiptPostedH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<QCReceiptHeader>>(endpoint);

  return {
    receipts: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

/**
 * Get posted QC receipt lines for a specific receipt.
 */
export async function getPostedQCReceiptLines(
  receiptNo: string,
): Promise<QCReceiptLine[]> {
  const escaped = receiptNo.replace(/'/g, "''");
  const filter = `No eq '${escaped}'`;
  const query = buildODataQuery({ $filter: filter, $orderby: "Line_No asc" });
  const endpoint = `/QCReceiptPostedLine?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<QCReceiptLine>>(endpoint);
  return response.value || [];
}
export async function updateQCReceiptLine(
  receiptNo: string,
  lineNo: number,
  etag: string,
  updatedFields: Partial<QCReceiptLine>,
): Promise<QCReceiptLine> {
  const escaped = receiptNo.replace(/'/g, "''");
  const endpoint = `/QCreceiptLine(No='${escaped}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;

  // Filter out read-only or empty fields
  const data = Object.entries(updatedFields).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !["No", "Line_No", "@odata.etag"].includes(key)
      ) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  return await apiPatch<QCReceiptLine>(endpoint, data, {
    headers: { "If-Match": etag },
  });
}

export async function updateQCReceiptHeader(
  receiptNo: string,
  etag: string,
  updatedFields: Partial<QCReceiptHeader>,
): Promise<QCReceiptHeader> {
  const escaped = receiptNo.replace(/'/g, "''");
  const endpoint = `/QCReceiptH('${escaped}')?company='${encodeURIComponent(COMPANY)}'`;

  // Filter out read-only or empty fields
  const data = Object.entries(updatedFields).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !["No", "@odata.etag"].includes(key)
      ) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  return await apiPatch<QCReceiptHeader>(endpoint, data, {
    headers: { "If-Match": etag },
  });
}
