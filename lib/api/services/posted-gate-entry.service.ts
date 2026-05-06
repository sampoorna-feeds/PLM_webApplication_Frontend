import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface PostedGateEntryHeader {
  No: string;
  Entry_Type: string;
  Location_Code?: string;
  Station_From_To?: string;
  Description?: string;
  Item_Description?: string;
  Document_Date?: string;
  Vehicle_No?: string;
  LR_RR_No?: string;
  [key: string]: unknown;
}

export interface PostedGateEntryLine {
  Gate_Entry_No: string;
  Line_No: number;
  Source_No?: string;
  Source_Name?: string;
  Description?: string;
  [key: string]: unknown;
}

// Inward Gate Entry
export async function getPostedInwardGateEntries(params: any = {}) {
  const query = buildODataQuery({ ...params, $count: true });
  const endpoint = `/PostedInwardGateEntryH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedGateEntryHeader>>(endpoint);
}

export async function getPostedInwardGateEntryLines(gateEntryNo: string) {
  const filter = `Gate_Entry_No eq '${gateEntryNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PostedInwardGateEntryLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedGateEntryLine>>(endpoint);
}

// Outward Gate Entry
export async function getPostedOutwardGateEntries(params: any = {}) {
  const query = buildODataQuery({ ...params, $count: true });
  const endpoint = `/PostedGateENtryOutwardH?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedGateEntryHeader>>(endpoint);
}

export async function getPostedOutwardGateEntryLines(gateEntryNo: string) {
  const filter = `Gate_Entry_No eq '${gateEntryNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/PostedGateentryOutwardLine?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return apiGet<ODataResponse<PostedGateEntryLine>>(endpoint);
}
