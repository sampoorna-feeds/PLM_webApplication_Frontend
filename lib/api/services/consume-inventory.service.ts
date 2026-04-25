import { apiGet, apiPost } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface ConsumeInventoryEntry {
  id?: string;
  "Posting Date": string;
  "Entry Type": string;
  "Document No.": string;
  "Item No.": string;
  Description?: string;
  "Consumption Posting"?: string;
  "Location Code": string;
  Quantity: number;
  "Unit of Measure Code": string;
  "Applies-to Entry"?: number;
  "Applies-from Entry"?: number;
  "Lob Code"?: string;
  "Branch Code"?: string;
  "Employee Code"?: string;
  "Assignment Code"?: string;
  [key: string]: unknown;
}

export async function getConsumeInventoryEntries(userId: string): Promise<ConsumeInventoryEntry[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const filter = `UserID eq '${userId.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/ConsumeInventory?company='${encodedCompany}'&${query}`;
  
  const response = await apiGet<ODataResponse<ConsumeInventoryEntry>>(endpoint);
  return response.value || [];
}

export async function createConsumeInventoryEntry(data: Partial<ConsumeInventoryEntry>): Promise<ConsumeInventoryEntry> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/ConsumeInventory?company='${encodedCompany}'`;
  return apiPost<ConsumeInventoryEntry>(endpoint, data);
}

export async function postConsumeInventory(userId: string): Promise<string> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/API_PostConsumeInventory?company='${encodedCompany}'`;
  // The API signature provided was API_PostConsumeInventory(UserID: Code[10]): Text
  const response = await apiPost<{ value: string }>(endpoint, { UserID: userId });
  return response.value;
}
