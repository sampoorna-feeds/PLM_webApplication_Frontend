/**
 * Inventory API Service
 * Handles fetching inventory stock and summary data from ERP OData V4 API
 *
 * APIs used:
 * - ItemLOCWiseSummary: For Opening/Closing balance (cumulates Quantity + CostAmount)
 * - Itemwisestock: For Incoming (Positive=true) / Outgoing (Positive=false)
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// ─── Types ───

export interface ItemLocWiseSummary {
  ItemNo?: string;
  LocationCode?: string;
  Posting_Date?: string;
  Quantity?: number;
  CostAmount?: number;
  [key: string]: unknown;
}

export interface ItemWiseStock {
  ItemNo?: string;
  LocationCode?: string;
  Posting_Date?: string;
  Positive?: boolean;
  Quantity?: number;
  CostAmount?: number;
  [key: string]: unknown;
}

// ─── Generic fetch helpers ───

interface ODataQueryParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

async function getItemLocWiseSummary(params: ODataQueryParams = {}) {
  const query = buildODataQuery(params);
  const endpoint = `/ItemLOCWiseSummary?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemLocWiseSummary>>(endpoint);
  return {
    entries: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

async function getItemWiseStock(params: ODataQueryParams = {}) {
  const query = buildODataQuery(params);
  const endpoint = `/Itemwisestock?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemWiseStock>>(endpoint);
  return {
    entries: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

// ─── Filter helpers ───

/**
 * Build location filter for multi-location support.
 * Field name varies by API:
 *   - ItemLOCWiseSummary uses "LocationCode"
 *   - Itemwisestock uses "LocationCode"
 */
function buildLocationFilter(
  locationCodes: string[],
  fieldName = "LocationCode",
): string {
  if (locationCodes.length === 0) return "";
  if (locationCodes.length === 1) {
    return `${fieldName} eq '${locationCodes[0]}'`;
  }
  const parts = locationCodes.map((code) => `${fieldName} eq '${code}'`);
  return `(${parts.join(" or ")})`;
}

/**
 * Build item filter (optional).
 * Field name:
 *   - ItemLOCWiseSummary uses "ItemNo"
 *   - Itemwisestock uses "ItemNo"
 */
function buildItemFilter(
  itemNo: string | undefined,
  fieldName = "ItemNo",
): string {
  if (!itemNo) return "";
  return `${fieldName} eq '${itemNo}'`;
}

/**
 * Join non-empty filter parts with "and"
 */
function joinFilters(...parts: string[]): string {
  return parts.filter(Boolean).join(" and ");
}

// ─── Cumulation helper ───

/**
 * Paginate through all results and cumulate Quantity + CostAmount.
 */
async function cumulateFromAPI<
  T extends { Quantity?: number; CostAmount?: number },
>(
  fetcher: (params: ODataQueryParams) => Promise<{ entries: T[] }>,
  filter: string,
): Promise<{ qty: number; amount: number }> {
  let totalQuantity = 0;
  let totalAmount = 0;
  let skip = 0;
  const TOP = 5000;

  while (true) {
    const { entries } = await fetcher({
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

// ─── Public API: Metric Functions ───

/**
 * Opening Balance: Cumulate all entries from ItemLOCWiseSummary
 * where Posting_Date lt {fromDate} (strictly before the period starts).
 *
 * This gives the stock position at the START of the reporting period.
 *
 * @param locationCodes - Location codes to filter (always required, supports multi)
 * @param fromDate - The start date of the period (opening = everything strictly before this date)
 * @param itemNo - Optional item number filter
 */
export async function getOpeningBalance({
  locationCodes,
  fromDate,
  toDate,
  itemNo,
}: {
  locationCodes: string[];
  fromDate: Date;
  toDate: Date;
  itemNo?: string;
}): Promise<{ qty: number; amount: number }> {
  const dateStr = fromDate.toISOString().split("T")[0];

  const filter = joinFilters(
    buildLocationFilter(locationCodes),
    buildItemFilter(itemNo),
    `Posting_Date le ${dateStr}`,
  );

  return cumulateFromAPI(getItemLocWiseSummary, filter);
}

/**
 * Closing Balance: Cumulate all entries from ItemLOCWiseSummary
 * where Posting_Date le {toDate} (everything up to end of period).
 *
 * This gives the stock position at the END of the reporting period.
 * Satisfies: Closing = Opening + Incoming + Outgoing
 *
 * @param locationCodes - Location codes to filter (always required, supports multi)
 * @param toDate - The end date of the period
 * @param itemNo - Optional item number filter
 */
export async function getClosingBalance({
  locationCodes,
  fromDate,
  toDate,
  itemNo,
}: {
  locationCodes: string[];
  fromDate: Date;
  toDate: Date;
  itemNo?: string;
}): Promise<{ qty: number; amount: number }> {
  const dateStr = toDate.toISOString().split("T")[0];

  const filter = joinFilters(
    buildLocationFilter(locationCodes),
    buildItemFilter(itemNo),
    `Posting_Date le ${dateStr}`,
  );

  return cumulateFromAPI(getItemLocWiseSummary, filter);
}

/**
 * Incoming (Increase) Metrics: Cumulate from Itemwisestock
 * where Positive eq true, within date range.
 *
 * @param locationCodes - Location codes to filter
 * @param fromDate - Start of reporting period
 * @param toDate - End of reporting period
 * @param itemNo - Optional item number filter
 */
export async function getIncomingMetrics(
  locationCodes: string[],
  fromDate: Date,
  toDate: Date,
  itemNo?: string,
): Promise<{ qty: number; amount: number }> {
  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];

  const filter = joinFilters(
    "Positive eq true",
    buildLocationFilter(locationCodes),
    buildItemFilter(itemNo),
    `Posting_Date ge ${fromStr}`,
    `Posting_Date le ${toStr}`,
  );

  return cumulateFromAPI(getItemWiseStock, filter);
}

/**
 * Outgoing (Decrease) Metrics: Cumulate from Itemwisestock
 * where Positive eq false, within date range.
 *
 * @param locationCodes - Location codes to filter
 * @param fromDate - Start of reporting period
 * @param toDate - End of reporting period
 * @param itemNo - Optional item number filter
 */
export async function getOutgoingMetrics(
  locationCodes: string[],
  fromDate: Date,
  toDate: Date,
  itemNo?: string,
): Promise<{ qty: number; amount: number }> {
  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];

  const filter = joinFilters(
    "Positive eq false",
    buildLocationFilter(locationCodes),
    buildItemFilter(itemNo),
    `Posting_Date ge ${fromStr}`,
    `Posting_Date le ${toStr}`,
  );

  return cumulateFromAPI(getItemWiseStock, filter);
}
