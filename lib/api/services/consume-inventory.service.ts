import { apiDelete, apiGet, apiPost } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

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

export async function getConsumeInventoryEntries(
  userId: string,
): Promise<ConsumeInventoryEntry[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const filter = `UserID eq '${userId.replace(/'/g, "''")}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/ConsumeInventory?company='${encodedCompany}'&${query}`;

  const response = await apiGet<ODataResponse<ConsumeInventoryEntry>>(endpoint);
  return response.value || [];
}

export interface ConsumptionPostingSetup {
  Item_No: string;
  Posting_Group: string;
  Name: string;
}

export async function getConsumptionPostingSetup(
  itemNo: string,
): Promise<ConsumptionPostingSetup[]> {
  if (!itemNo) return [];
  const encodedCompany = encodeURIComponent(COMPANY);
  const filter = `Item_No eq '${itemNo.replace(/'/g, "''")}'`;
  // Using exact format from curl command for reliability
  const endpoint = `/ConsuPostingSetup?company='${encodedCompany}'&$filter=${encodeURIComponent(filter)}`;

  const response =
    await apiGet<ODataResponse<ConsumptionPostingSetup>>(endpoint);
  return response.value || [];
}

export async function getNextDocumentNo(postingDate: string): Promise<string> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/API_CreateNoSeriesForVouchers?company='${encodedCompany}'`;

  const payload = {
    seriesCode: "WEBCONSU",
    postingDate: postingDate,
  };

  const response = await apiPost<{ value: string }>(endpoint, payload);
  return response.value;
}

function transformConsumeEntry(
  entry: Partial<ConsumeInventoryEntry>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    Journal_Template_Name: "ITEM",
    Journal_Batch_Name: "WEBAPP",
    Posting_Date: entry["Posting Date"] || "",
    EntryType: entry["Entry Type"] || "Issue",
    Document_No: entry["Document No."] || "",
    Item_No: entry["Item No."] || "",
    Location_Code: entry["Location Code"] || "",
    Quantity: entry.Quantity || 0,
    Applies_to_Entry: entry["Applies-to Entry"] || 0,
    Applies_from_Entry: entry["Applies-from Entry"] || 0,
    Shortcut_Dimension_1_Code: entry["Lob Code"] || "",
    Shortcut_Dimension_2_Code: entry["Branch Code"] || "",
    ShortcutDimCode3: entry["Location Code"] || "",
    ShortcutDimCode4: entry["Employee Code"] || "",
    ShortcutDimCode5: entry["Assignment Code"] || "",
    ShortcutDimCode6: "",
    ShortcutDimCode7: "",
    ShortcutDimCode8: "",
    Consumption: true,
    Consumption_Posting: entry["Consumption Posting"] || "",
    userID: ((entry.UserID as string) || "JOBQUEUE").toUpperCase(),
  };

  // Remove any fields that are undefined, null, or empty string (except for required fixed ones)
  return Object.fromEntries(
    Object.entries(result).filter(([key, value]) => {
      // Keep required fixed values even if empty-ish
      const required = [
        "Consumption",
        "Quantity",
        "Applies_to_Entry",
        "Applies_from_Entry",
      ];
      if (required.includes(key)) return true;
      return value !== undefined && value !== null && value !== "";
    }),
  );
}

export async function createConsumeInventoryEntry(
  data: Partial<ConsumeInventoryEntry>,
): Promise<ConsumeInventoryEntry> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/ConsumeInventory?company='${encodedCompany}'`;
  const transformedData = transformConsumeEntry(data);
  return apiPost<ConsumeInventoryEntry>(endpoint, transformedData);
}

/**
 * Bulk insert entries by calling the create API for each entry.
 */
export async function bulkInsertConsumeInventoryEntries(
  entries: Partial<ConsumeInventoryEntry>[],
): Promise<ConsumeInventoryEntry[]> {
  const created: ConsumeInventoryEntry[] = [];
  for (const entry of entries) {
    created.push(await createConsumeInventoryEntry(entry));
  }
  return created;
}

export async function deleteConsumeInventoryEntry(
  entry: ConsumeInventoryEntry,
): Promise<void> {
  const encodedCompany = encodeURIComponent(COMPANY);
  // Using the path-based format from the user's curl request for DELETE
  const endpoint = `/company('${encodedCompany}')/ConsumeInventory(Journal_Template_Name='${entry.Journal_Template_Name}',Journal_Batch_Name='${entry.Journal_Batch_Name}',Line_No=${entry.Line_No})`;
  await apiDelete(endpoint);
}

export async function postConsumeInventory(userId: string): Promise<string> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/API_PostConsumeInventory?company='${encodedCompany}'`;
  const response = await apiPost<{ value: string }>(endpoint, {
    userID: userId.toUpperCase(),
  });
  return response.value;
}
