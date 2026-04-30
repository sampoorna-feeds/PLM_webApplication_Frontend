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
  const endpoint = `/qcReceiptH?company='${encodeURIComponent(COMPANY)}'&${query}`;
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
  const endpoint = `/qcreceiptLine?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<QCReceiptLine>>(endpoint);
  return response.value || [];
}

/**
 * Post a QC receipt using the backend action.
 * @param receiptNo The QC receipt number to post.
 */
export async function postQCReceipt(receiptNo: string): Promise<void> {
  const endpoint = `/QCcode_postQC?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    docNo: receiptNo,
  };

  try {
    await apiPost(endpoint, payload);
  } catch (error: any) {
    console.error("Error posting QC receipt:", error);
    const detail = error.details || error.message || JSON.stringify(error);
    throw new Error(`Failed to post QC receipt: ${detail}`);
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
  const endpoint = `/qcReceiptPostedH?company='${encodeURIComponent(COMPANY)}'&${query}`;
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
  const endpoint = `/qcReceiptPostedLine?company='${encodeURIComponent(COMPANY)}'&${query}`;

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
  const endpoint = `/qcreceiptLine(No='${escaped}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;

  // Filter out read-only or empty fields and lowercase first letter
  const data = Object.entries(updatedFields).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !["No", "Line_No", "@odata.etag"].includes(key)
      ) {
        const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
        // Ensure numeric values are sent as numbers
        const numFields = ["Actual_Value", "Rejected_Qty", "Min_Value", "Max_Value", "Max_Deviation_Allowed"];
        if (numFields.includes(key) && typeof value === "string") {
          acc[lowerKey] = parseFloat(value) || 0;
        } else {
          acc[lowerKey] = value;
        }
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
  const endpoint = `/qcReceiptH('${escaped}')?company='${encodeURIComponent(COMPANY)}'`;

  // Filter out read-only or empty fields and lowercase first letter
  const data = Object.entries(updatedFields).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !["No", "@odata.etag"].includes(key)
      ) {
        const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
        
        // Ensure numeric values are sent as numbers
        const numFields = [
          "Inspection_Quantity", "Sample_Quantity", "Quantity_to_Accept", 
          "Qty_to_Accept_with_Deviation", "Quantity_to_Reject", "Quantity_to_Rework",
          "Rabete_Percent", "No_of_Container", "Remaining_Quantity"
        ];
        
        if (numFields.includes(key) && typeof value === "string") {
          acc[lowerKey] = parseFloat(value) || 0;
        } else {
          acc[lowerKey] = value;
        }
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  return await apiPatch<QCReceiptHeader>(endpoint, data, {
    headers: { "If-Match": etag },
  });
}
