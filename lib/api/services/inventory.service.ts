/**
 * Inventory API Service
 * Handles fetching inventory stock and summary data from ERP OData V4 API
 *
 * Uses Itemledger_entry (raw BC Item Ledger Entries) for accurate
 * Quantity and Cost_Amount_Actual values.
 */

import { getItemLedgerEntries } from "./report-ledger.service";

// ─── Types ───

export interface ItemMetrics {
  qty: number;
  amount: number;
}

// ─── Filter helpers ───

/**
 * Build a location filter for Item Ledger Entry (uses Location_Code).
 */
function buildILELocationFilter(locationCodes: string[]): string {
  if (!locationCodes.length) return "";
  if (locationCodes.length === 1)
    return `Location_Code eq '${locationCodes[0]}'`;
  return locationCodes.map((c) => `Location_Code eq '${c}'`).join(" or ");
}

/**
 * Build an OData filter string from non-empty parts.
 */
function buildFilter(...parts: string[]): string {
  return parts.filter(Boolean).join(" and ");
}

/**
 * Wrap a multi-location filter with parentheses if it uses OR.
 */
function wrapLocFilter(locFilter: string): string {
  if (!locFilter) return "";
  return locFilter.includes(" or ") ? `(${locFilter})` : locFilter;
}

// ─── Core aggregation ───

/**
 * Paginate through all Itemledger_entry results and group
 * Quantity + Cost_Amount_Actual by Item_No.
 */
async function groupByItemFromILE(
  filter: string,
): Promise<Map<string, ItemMetrics>> {
  const map = new Map<string, ItemMetrics>();
  let skip = 0;
  const TOP = 5000;

  while (true) {
    const { entries } = await getItemLedgerEntries({
      $filter: filter,
      $top: TOP,
      $skip: skip,
      $select: "Item_No,Quantity,Cost_Amount_Actual",
    });

    for (const entry of entries) {
      const itemNo = entry.Item_No || "";
      if (!itemNo) continue;

      const existing = map.get(itemNo) || { qty: 0, amount: 0 };
      existing.qty += entry.Quantity || 0;
      existing.amount += entry.Cost_Amount_Actual || 0;
      map.set(itemNo, existing);
    }

    if (entries.length < TOP) break;
    skip += TOP;
  }

  return map;
}

// ─── Public API: Per-Item Aggregation (for Summary Table) ───

/**
 * Opening Balance per item: Itemledger_entry where Posting_Date le fromDate.
 * fromDate IS the opening date (e.g. 31/03/2025 → "As of 31/03/25").
 */
export async function getOpeningBalancePerItem({
  locationCodes,
  fromDate,
}: {
  locationCodes: string[];
  fromDate: Date;
}): Promise<Map<string, ItemMetrics>> {
  const dateStr = fromDate.toISOString().split("T")[0];
  const filter = buildFilter(
    wrapLocFilter(buildILELocationFilter(locationCodes)),
    `Posting_Date le ${dateStr}`,
  );
  return groupByItemFromILE(filter);
}

/**
 * Increases per item: Itemledger_entry where Positive=true, within (fromDate+1) to toDate.
 * Movements happen in the period AFTER the opening date.
 */
export async function getIncreasesPerItem({
  locationCodes,
  fromDate,
  toDate,
}: {
  locationCodes: string[];
  fromDate: Date;
  toDate: Date;
}): Promise<Map<string, ItemMetrics>> {
  const dayAfterFrom = new Date(fromDate);
  dayAfterFrom.setDate(dayAfterFrom.getDate() + 1);
  const fromStr = dayAfterFrom.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];
  const filter = buildFilter(
    "Positive eq true",
    wrapLocFilter(buildILELocationFilter(locationCodes)),
    `Posting_Date ge ${fromStr}`,
    `Posting_Date le ${toStr}`,
  );
  return groupByItemFromILE(filter);
}

/**
 * Decreases per item: Itemledger_entry where Positive=false, within (fromDate+1) to toDate.
 * Movements happen in the period AFTER the opening date.
 * The API returns negative Quantity/Cost_Amount_Actual for outgoing stock,
 * so we take absolute values to display positive numbers.
 */
export async function getDecreasesPerItem({
  locationCodes,
  fromDate,
  toDate,
}: {
  locationCodes: string[];
  fromDate: Date;
  toDate: Date;
}): Promise<Map<string, ItemMetrics>> {
  const dayAfterFrom = new Date(fromDate);
  dayAfterFrom.setDate(dayAfterFrom.getDate() + 1);
  const fromStr = dayAfterFrom.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];
  const filter = buildFilter(
    "Positive eq false",
    wrapLocFilter(buildILELocationFilter(locationCodes)),
    `Posting_Date ge ${fromStr}`,
    `Posting_Date le ${toStr}`,
  );
  const map = await groupByItemFromILE(filter);
  // Convert negative values to positive for display
  for (const [key, metrics] of map) {
    map.set(key, {
      qty: Math.abs(metrics.qty),
      amount: Math.abs(metrics.amount),
    });
  }
  return map;
}
