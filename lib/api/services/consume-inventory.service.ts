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
  const endpoint = `/company('${encodedCompany}')/ConsumeInventory?${query}`;
  
  const response = await apiGet<ODataResponse<ConsumeInventoryEntry>>(endpoint);
  return response.value || [];
}

/**
 * Transforms an entry according to specific rules:
 * 1. Remove empty fields
 * 2. Remove "Description"
 * 3. Ensure "Quantity" field is after "Item No." field
 */
function transformConsumeEntry(entry: Partial<ConsumeInventoryEntry>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  // 1. Filter out empty fields and Description
  const validEntries = Object.entries(entry).filter(([key, value]) => 
    key !== "Description" && 
    value !== undefined && 
    value !== null && 
    value !== ""
  );

  // 2. Identify Item No. and Quantity for specific placement
  const itemNo = entry["Item No."];
  const quantity = entry["Quantity"];

  // 3. Add fields in order: [others..., Item No., Quantity, others...]
  // We'll add all fields except Quantity first, then insert Quantity after Item No.
  validEntries.forEach(([key, value]) => {
    if (key !== "Quantity") {
      result[key] = value;
      
      // If we just added Item No., add Quantity immediately after it
      if (key === "Item No." && quantity !== undefined && quantity !== null) {
        result["Quantity"] = quantity;
      }
    }
  });

  // 4. If Quantity wasn't added (because Item No. was missing or filtered), add it at the end
  if (result["Quantity"] === undefined && quantity !== undefined && quantity !== null) {
    result["Quantity"] = quantity;
  }

  return result;
}

export async function createConsumeInventoryEntry(data: Partial<ConsumeInventoryEntry>): Promise<ConsumeInventoryEntry> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/company('${encodedCompany}')/ConsumeInventory`;
  const transformedData = transformConsumeEntry(data);
  return apiPost<ConsumeInventoryEntry>(endpoint, transformedData);
}

/**
 * Bulk insert entries by calling the create API for each entry.
 */
export async function bulkInsertConsumeInventoryEntries(entries: Partial<ConsumeInventoryEntry>[]): Promise<void> {
  for (const entry of entries) {
    await createConsumeInventoryEntry(entry);
  }
}

export async function postConsumeInventory(userId: string): Promise<string> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/company('${encodedCompany}')/API_PostConsumeInventory`;
  const response = await apiPost<{ value: string }>(endpoint, { UserID: userId });
  return response.value;
}
