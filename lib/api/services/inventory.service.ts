/**
 * Inventory API Service
 * Handles fetching inventory stock and summary data from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// ─── Current Stock (ItemWiseStock) ───

export interface GetItemWiseStockParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface ItemWiseStock {
  ItemNo?: string;
  Item_Name?: string;
  LocationCode?: string;
  Location_Name?: string;
  Quantity?: number;
  CostAmount?: number;
  Unit_of_Measure_Code?: string;
  // Additional fields as per typical inventory snapshots
  Variant_Code?: string;
  Lot_No?: string;
  Serial_No?: string;
  [key: string]: unknown;
}

export async function getItemWiseStock(params: GetItemWiseStockParams = {}) {
  const query = buildODataQuery(params);
  const endpoint = `/Itemwisestock?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemWiseStock>>(endpoint);

  return {
    entries: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

// ─── Location-wise Summary (ItemLOCWiseSummary) ───

export interface GetItemLocWiseSummaryParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface ItemLocWiseSummary {
  ItemNo?: string;
  LocationCode?: string;
  Posting_Date?: string;
  Quantity?: number;
  CostAmount?: number;
  // Additional fields for reporting
  Entry_Type?: string;
  Document_No?: string;
  Description?: string;
  Global_Dimension_1_Code?: string;
  Global_Dimension_2_Code?: string;
  [key: string]: unknown;
}

export async function getItemLocWiseSummary(
  params: GetItemLocWiseSummaryParams = {},
) {
  const query = buildODataQuery(params);
  const endpoint = `/ItemLOCWiseSummary?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemLocWiseSummary>>(endpoint);

  return {
    entries: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

/**
 * Calculates opening balance for a specific item and location before a given date.
 * Returns both quantity and amount.
 */
export async function getCalculatedOpeningBalance(
  itemNo: string,
  locationCode: string,
  beforeDate: Date,
): Promise<{ qty: number; amount: number }> {
  const dateStr = beforeDate.toISOString().split("T")[0];
  const filter = `ItemNo eq '${itemNo}' and LocationCode eq '${locationCode}' and Posting_Date lt ${dateStr}`;

  let totalQuantity = 0;
  let totalAmount = 0;
  let skip = 0;
  const TOP = 5000; // Fetch in chunks

  while (true) {
    const { entries } = await getItemLocWiseSummary({
      $filter: filter,
      $top: TOP,
      $skip: skip,
      $select: "Quantity,CostAmount",
    });

    for (const entry of entries) {
      totalQuantity += entry.Quantity || 0;
      totalAmount += entry.CostAmount || 0;
    }

    if (entries.length < TOP) break;
    skip += TOP;
  }

  return { qty: totalQuantity, amount: totalAmount };
}

/**
 * Calculates increase metrics (Positive=true transactions) for a specific item and location.
 * Returns both quantity and amount for the specified date range.
 */
export async function getIncreaseMetrics(
  itemNo: string,
  locationCode: string,
  fromDate: Date,
  toDate: Date,
): Promise<{ qty: number; amount: number }> {
  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];
  const filter = `Item_No eq '${itemNo}' and Location_Code eq '${locationCode}' and Posting_Date ge ${fromStr} and Posting_Date le ${toStr} and Positive eq true`;

  let totalQuantity = 0;
  let totalAmount = 0;
  let skip = 0;
  const TOP = 5000;

  // Import ItemLedgerEntry type dynamically to avoid circular dependency
  const { getItemLedgerEntries } = await import("./report-ledger.service");

  while (true) {
    const { entries } = await getItemLedgerEntries({
      $filter: filter,
      $top: TOP,
      $skip: skip,
      $select: "Quantity,Cost_Amount_Actual",
    });

    for (const entry of entries) {
      totalQuantity += entry.Quantity || 0;
      totalAmount += entry.Cost_Amount_Actual || 0;
    }

    if (entries.length < TOP) break;
    skip += TOP;
  }

  return { qty: totalQuantity, amount: totalAmount };
}

/**
 * Calculates decrease metrics (Positive=false transactions) for a specific item and location.
 * Returns both quantity and amount for the specified date range.
 */
export async function getDecreaseMetrics(
  itemNo: string,
  locationCode: string,
  fromDate: Date,
  toDate: Date,
): Promise<{ qty: number; amount: number }> {
  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];
  const filter = `Item_No eq '${itemNo}' and Location_Code eq '${locationCode}' and Posting_Date ge ${fromStr} and Posting_Date le ${toStr} and Positive eq false`;

  let totalQuantity = 0;
  let totalAmount = 0;
  let skip = 0;
  const TOP = 5000;

  const { getItemLedgerEntries } = await import("./report-ledger.service");

  while (true) {
    const { entries } = await getItemLedgerEntries({
      $filter: filter,
      $top: TOP,
      $skip: skip,
      $select: "Quantity,Cost_Amount_Actual",
    });

    for (const entry of entries) {
      // Note: Decrease quantities might be stored as positive values with Positive=false flag
      // So we take absolute value to ensure positive decrease amounts
      totalQuantity += Math.abs(entry.Quantity || 0);
      totalAmount += Math.abs(entry.Cost_Amount_Actual || 0);
    }

    if (entries.length < TOP) break;
    skip += TOP;
  }

  return { qty: totalQuantity, amount: totalAmount };
}
