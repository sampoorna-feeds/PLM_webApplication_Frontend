/**
 * Item API Service
 * Handles fetching Items (ItemList for listing, ItemCard for details) and Item Unit of Measures from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface Item {
  No: string;
  Description: string;
  /** From ItemCard (detail) */
  GST_Group_Code?: string;
  HSN_SAC_Code?: string;
  Exempted?: boolean;
  /** From ItemList (list) */
  Unit_Price?: number;
  Sales_Unit_of_Measure?: string;
  /** For tracking lookup */
  Item_Tracking_Code?: string;
}

export interface ItemUnitOfMeasure {
  Code: string;
  Qty_per_Unit_of_Measure: number;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// Cache for search results
const searchCache = new Map<string, Item[]>();

/**
 * Helper to escape single quotes in OData filter values
 */
function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Builds the base filter for Items.
 * For ItemList: (Item_Location eq 'LOCATION_CODE') and (Blocked eq false)
 * For ItemCard / no location: Blocked eq false
 */
function getBaseFilter(locationCode?: string): string {
  const blockedFilter = `Blocked eq false`;
  if (!locationCode) {
    return blockedFilter;
  }
  const escapedLocation = escapeODataValue(locationCode);
  return `(Item_Location eq '${escapedLocation}') and (${blockedFilter})`;
}

const ITEM_LIST_SELECT = 'No,Description,Unit_Price,Sales_Unit_of_Measure';

/**
 * Builds the ItemList endpoint URL with Company and $filter (and optional OData params)
 */
function buildItemListEndpoint(
  filter: string,
  options?: { top?: number; skip?: number; orderby?: string; select?: string }
): string {
  const params = new URLSearchParams();
  params.set('$filter', filter);
  if (options?.select) params.set('$select', options.select);
  if (options?.orderby) params.set('$orderby', options.orderby);
  if (options?.top != null) params.set('$top', String(options.top));
  if (options?.skip != null) params.set('$skip', String(options.skip));
  return `/ItemCard?Company=${encodeURIComponent(COMPANY)}&${params.toString()}`;
}

/**
 * Initial load - Get first batch of items from ItemList (optionally filtered by location)
 */
export async function getItems(top: number = 20, locationCode?: string): Promise<Item[]> {
  const filter = getBaseFilter(locationCode);
  const endpoint = buildItemListEndpoint(filter, {
    top,
    orderby: 'No',
    select: ITEM_LIST_SELECT,
  });
  const response = await apiGet<ODataResponse<Item>>(endpoint);
  return response.value;
}

/**
 * Search items with query string (ItemList).
 * Makes 2 separate API calls (one for No, one for Description) and combines unique results.
 */
export async function searchItems(query: string, locationCode?: string): Promise<Item[]> {
  if (query.length < 2) {
    return [];
  }

  const cacheKey = `search_${locationCode ?? 'none'}_${query.toLowerCase()}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const baseFilter = getBaseFilter(locationCode);
  const escapedQuery = escapeODataValue(query);
  const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
  const filterByDescription = `(${baseFilter}) and contains(Description,'${escapedQuery}')`;

  const [resultsByNo, resultsByDescription] = await Promise.all([
    (async () => {
      const endpoint = buildItemListEndpoint(filterByNo, {
        top: 30,
        orderby: 'No',
        select: ITEM_LIST_SELECT,
      });
      const response = await apiGet<ODataResponse<Item>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const endpoint = buildItemListEndpoint(filterByDescription, {
        top: 30,
        orderby: 'No',
        select: ITEM_LIST_SELECT,
      });
      const response = await apiGet<ODataResponse<Item>>(endpoint);
      return response.value;
    })(),
  ]);

  const combined = [...resultsByNo, ...resultsByDescription];
  const uniqueMap = new Map<string, Item>();
  combined.forEach((item) => {
    if (!uniqueMap.has(item.No)) {
      uniqueMap.set(item.No, item);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );
  searchCache.set(cacheKey, uniqueResults);
  return uniqueResults;
}

/**
 * Search items by specific field (ItemList, for dual search support)
 */
export async function searchItemsByField(
  query: string,
  field: 'No' | 'Name',
  locationCode?: string
): Promise<Item[]> {
  if (query.length < 2) {
    return [];
  }

  const baseFilter = getBaseFilter(locationCode);
  const escapedQuery = escapeODataValue(query);
  const searchField = field === 'Name' ? 'Description' : field;
  const filter = `(${baseFilter}) and contains(${searchField},'${escapedQuery}')`;

  const endpoint = buildItemListEndpoint(filter, {
    top: 30,
    orderby: 'No',
    select: ITEM_LIST_SELECT,
  });
  const response = await apiGet<ODataResponse<Item>>(endpoint);
  return response.value;
}

/**
 * Get paginated items from ItemList (with optional search and location filter)
 */
export async function getItemsPage(
  skip: number,
  search?: string,
  top: number = 30,
  locationCode?: string
): Promise<Item[]> {
  const baseFilter = getBaseFilter(locationCode);

  if (!search || search.length < 2) {
    const endpoint = buildItemListEndpoint(baseFilter, {
      top,
      skip,
      orderby: 'No',
      select: ITEM_LIST_SELECT,
    });
    const response = await apiGet<ODataResponse<Item>>(endpoint);
    return response.value;
  }

  const escapedQuery = escapeODataValue(search);
  const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
  const filterByDescription = `(${baseFilter}) and contains(Description,'${escapedQuery}')`;

  const [resultsByNo, resultsByDescription] = await Promise.all([
    (async () => {
      const endpoint = buildItemListEndpoint(filterByNo, {
        top,
        skip,
        orderby: 'No',
        select: ITEM_LIST_SELECT,
      });
      const response = await apiGet<ODataResponse<Item>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const endpoint = buildItemListEndpoint(filterByDescription, {
        top,
        skip,
        orderby: 'No',
        select: ITEM_LIST_SELECT,
      });
      const response = await apiGet<ODataResponse<Item>>(endpoint);
      return response.value;
    })(),
  ]);

  const combined = [...resultsByNo, ...resultsByDescription];
  const uniqueMap = new Map<string, Item>();
  combined.forEach((item) => {
    if (!uniqueMap.has(item.No)) {
      uniqueMap.set(item.No, item);
    }
  });
  return Array.from(uniqueMap.values()).sort((a, b) => a.No.localeCompare(b.No));
}

/**
 * Get Item Unit of Measures for a specific item
 */
export async function getItemUnitOfMeasures(
  itemNo: string,
): Promise<ItemUnitOfMeasure[]> {
  if (!itemNo) return [];

  const escapedItemNo = escapeODataValue(itemNo);
  const query = buildODataQuery({
    $select: "Code,Qty_per_Unit_of_Measure",
    $filter: `Item_No eq '${escapedItemNo}'`,
    $orderby: "Code",
  });

  const endpoint = `/ItemUnitofMeasure?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemUnitOfMeasure>>(endpoint);
  return response.value;
}

/**
 * Get a single item by number (ItemCard - for details like Exempted, GST, HSN)
 */
export async function getItemByNo(itemNo: string): Promise<Item | null> {
  if (!itemNo) return null;

  const baseFilter = getBaseFilter();
  const query = buildODataQuery({
    $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted,Sales_Unit_of_Measure',
    $filter: `No eq '${itemNo.replace(/'/g, "''")}' and ${baseFilter}`,
  });

  const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Item>>(endpoint);


  return response.value.length > 0 ? response.value[0] : null;
}

/**
 * Get multiple Items by their No values in a single batch call
 * Returns items with Item_Tracking_Code for highlighting purposes
 *
 * Note: Uses multiple 'eq' conditions with 'or' instead of 'in' operator
 * because Business Central OData API doesn't properly support 'in'
 */
export async function getItemsByNos(itemNos: string[]): Promise<Item[]> {
  if (itemNos.length === 0) return [];

  // Build filter: Blocked eq false and (No eq 'ITEM1' or No eq 'ITEM2' or ...)
  const filterConditions = itemNos.map(
    (no) => `No eq '${escapeODataValue(no)}'`,
  );
  const filter = `(Blocked eq false) and (${filterConditions.join(" or ")})`;

  const query = buildODataQuery({
    $select: "No,Description,Item_Tracking_Code",
    $filter: filter,
    $top: itemNos.length,
  });

  const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Item>>(endpoint);
  return response.value;
}

/**
 * Clear search cache
 */
export function clearItemCache(): void {
  searchCache.clear();
}
