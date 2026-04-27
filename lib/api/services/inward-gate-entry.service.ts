import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export type InwardGateEntrySourceType = "Purchase Order" | "Sales Return Order" | "Transfer Receipt";

export interface InwardGateEntryHeader {
  id?: string;
  Entry_Type: string;
  No: string;
  Location_Code: string;
  Station_From_To: string;
  Description: string;
  Item_Description: string;
  Document_Date: string;
  Document_Time: string;
  Posting_Date: string;
  Posting_Time: string;
  LR_RR_No: string;
  LR_RR_Date: string;
  Vehicle_No: string;
  Posting_No_Series: string;
  Gross_Weight: number;
  Tier_Weight: number;
  Net_Weight: number;
  Per_Bag_Freight_Charges: number;
  Total_Freight_Amount: number;
  Transporter_Name: string;
  No_of_Bags: number;
  Source_Type: InwardGateEntrySourceType;
  Source_No: string;
  Status: string;
  [key: string]: unknown;
}

export interface InwardGateEntryLine {
  id?: string;
  Entry_Type: string;
  Gate_Entry_No: string;
  Line_No: number;
  Challan_No: string;
  Challan_Date: string;
  Source_Type: string;
  Source_No: string;
  Source_Name: string;
  Description: string;
  [key: string]: unknown;
}

export async function getInwardGateEntries(): Promise<InwardGateEntryHeader[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntry?company='${encodedCompany}'`;
  const response = await apiGet<ODataResponse<InwardGateEntryHeader>>(endpoint);
  return response.value || [];
}

export async function getInwardGateEntryLines(gateEntryNo: string, entryType: string): Promise<InwardGateEntryLine[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const filter = `Gate_Entry_No eq '${gateEntryNo.replace(/'/g, "''")}' and Entry_Type eq '${entryType}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/InwardGateEntrySubForm?company='${encodedCompany}'&${query}`;
  const response = await apiGet<ODataResponse<InwardGateEntryLine>>(endpoint);
  return response.value || [];
}

export async function createInwardGateEntryHeader(data: Partial<InwardGateEntryHeader>): Promise<InwardGateEntryHeader> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntry?company='${encodedCompany}'`;
  return apiPost<InwardGateEntryHeader>(endpoint, data);
}

export async function updateInwardGateEntryHeader(gateEntryNo: string, entryType: string, data: Partial<InwardGateEntryHeader>): Promise<InwardGateEntryHeader> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/Company('${encodedCompany}')/InwardGateEntry(Entry_Type='${entryType}',No='${gateEntryNo.replace(/'/g, "''")}')`;
  return apiPatch<InwardGateEntryHeader>(endpoint, data);
}

export async function createInwardGateEntryLine(data: Partial<InwardGateEntryLine>): Promise<InwardGateEntryLine> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntrySubForm?company='${encodedCompany}'`;
  return apiPost<InwardGateEntryLine>(endpoint, data);
}

export async function updateInwardGateEntryLine(gateEntryNo: string, entryType: string, lineNo: number, data: Partial<InwardGateEntryLine>): Promise<InwardGateEntryLine> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntrySubForm(Entry_Type='${entryType}',Gate_Entry_No='${gateEntryNo.replace(/'/g, "''")}',Line_No=${lineNo})?company='${encodedCompany}'`;
  return apiPatch<InwardGateEntryLine>(endpoint, data);
}

export async function deleteInwardGateEntryLine(gateEntryNo: string, entryType: string, lineNo: number): Promise<void> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntrySubForm(Entry_Type='${entryType}',Gate_Entry_No='${gateEntryNo.replace(/'/g, "''")}',Line_No=${lineNo})?company='${encodedCompany}'`;
  await apiDelete(endpoint);
}

export async function deleteInwardGateEntryHeader(id: string): Promise<void> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntry(id='${id}')?company='${encodedCompany}'`;
  await apiDelete(endpoint);
}

export async function postInwardGateEntry(docNo: string): Promise<string> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/API_PostGateEntry?company='${encodedCompany}'`;
  const response = await apiPost<{ value: string }>(endpoint, { docNo });
  return response.value;
}

// Source Lists
export async function getPurchaseOrders(): Promise<any[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/PurchaseOrder?company='${encodedCompany}'`;
  const response = await apiGet<ODataResponse<any>>(endpoint);
  return response.value || [];
}

export async function getSalesReturnOrders(): Promise<any[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/SalesReturnOrderHeader?company='${encodedCompany}'`;
  const response = await apiGet<ODataResponse<any>>(endpoint);
  return response.value || [];
}

export async function getTransferOrders(): Promise<any[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/TransferHeader?company='${encodedCompany}'`;
  const response = await apiGet<ODataResponse<any>>(endpoint);
  return response.value || [];
}
