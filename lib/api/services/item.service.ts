/**
 * Item API Service
 * Handles fetching Items and Item Unit of Measures from ERP OData V4 API
 */

import { apiGet } from '../client';
import { buildODataQuery } from '../endpoints';
import type { ODataResponse } from '../types';

export interface Item {
  No: string;
  Description: string;
  GST_Group_Code?: string;
  HSN_SAC_Code?: string;
  Exempted?: boolean;
}

export interface ItemUnitOfMeasure {
  Code: string;
  Qty_per_Unit_of_Measure: number;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

// Cache for search results
const searchCache = new Map<string, Item[]>();

/**
 * Helper to escape single quotes in OData filter values
 */
function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Builds the base filter for Items
 */
function getBaseFilter(): string {
  return `Blocked eq false`;
}

/**
 * Initial load - Get first batch of items (no search)
 */
export async function getItems(top: number = 20): Promise<Item[]> {
  const query = buildODataQuery({
    $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted',
    $filter: getBaseFilter(),
    $orderby: 'No',
    $top: top,
  });

  const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Item>>(endpoint);
  return response.value;
}

/**
 * Search items with query string
 * Makes 2 separate API calls (one for No, one for Description) and combines unique results
 */
export async function searchItems(query: string): Promise<Item[]> {
  if (query.length < 2) {
    return [];
  }

  // Check cache first
  const cacheKey = `search_${query.toLowerCase()}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const baseFilter = getBaseFilter();
  const escapedQuery = escapeODataValue(query);

  // Make 2 parallel API calls: one for No, one for Description
  const [resultsByNo, resultsByDescription] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted',
        $filter: filterByNo,
        $orderby: 'No',
        $top: 30,
      });
      const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Item>>(endpoint);
      return response.value;
    })(),
    // Search by Description field
    (async () => {
      const filterByDescription = `(${baseFilter}) and contains(Description,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted',
        $filter: filterByDescription,
        $orderby: 'No',
        $top: 30,
      });
      const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Item>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByDescription];
  const uniqueMap = new Map<string, Item>();
  combined.forEach((item) => {
    if (!uniqueMap.has(item.No)) {
      uniqueMap.set(item.No, item);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No)
  );

  // Cache results
  searchCache.set(cacheKey, uniqueResults);

  return uniqueResults;
}

/**
 * Search items by specific field (for dual search support)
 */
export async function searchItemsByField(
  query: string,
  field: 'No' | 'Name'
): Promise<Item[]> {
  if (query.length < 2) {
    return [];
  }

  const baseFilter = getBaseFilter();
  const escapedQuery = escapeODataValue(query);
  
  // Map 'Name' to 'Description' for items
  const searchField = field === 'Name' ? 'Description' : field;
  const filter = `(${baseFilter}) and contains(${searchField},'${escapedQuery}')`;
  
  const odataQuery = buildODataQuery({
    $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted',
    $filter: filter,
    $orderby: 'No',
    $top: 30,
  });
  
  const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
  const response = await apiGet<ODataResponse<Item>>(endpoint);
  return response.value;
}

/**
 * Get paginated items
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getItemsPage(
  skip: number,
  search?: string,
  top: number = 30
): Promise<Item[]> {
  const baseFilter = getBaseFilter();

  if (!search || search.length < 2) {
    // No search - return paginated results
    const query = buildODataQuery({
      $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted',
      $filter: baseFilter,
      $orderby: 'No',
      $top: top,
      $skip: skip,
    });
    const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<Item>>(endpoint);
    return response.value;
  }

  // With search - use dual-call approach
  const escapedQuery = escapeODataValue(search);

  // Make 2 parallel API calls: one for No, one for Description
  const [resultsByNo, resultsByDescription] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted',
        $filter: filterByNo,
        $orderby: 'No',
        $top: top,
        $skip: skip,
      });
      const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Item>>(endpoint);
      return response.value;
    })(),
    // Search by Description field
    (async () => {
      const filterByDescription = `(${baseFilter}) and contains(Description,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted',
        $filter: filterByDescription,
        $orderby: 'No',
        $top: top,
        $skip: skip,
      });
      const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Item>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByDescription];
  const uniqueMap = new Map<string, Item>();
  combined.forEach((item) => {
    if (!uniqueMap.has(item.No)) {
      uniqueMap.set(item.No, item);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No)
  );

  return uniqueResults;
}

/**
 * Get Item Unit of Measures for a specific item
 */
export async function getItemUnitOfMeasures(itemNo: string): Promise<ItemUnitOfMeasure[]> {
  if (!itemNo) return [];

  const escapedItemNo = escapeODataValue(itemNo);
  const query = buildODataQuery({
    $select: 'Code,Qty_per_Unit_of_Measure',
    $filter: `Item_No eq '${escapedItemNo}'`,
    $orderby: 'Code',
  });

  const endpoint = `/ItemUnitofMeasure?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemUnitOfMeasure>>(endpoint);
  return response.value;
}

/**
 * Get a single item by number
 */
export async function getItemByNo(itemNo: string): Promise<Item | null> {
  if (!itemNo) return null;
  
  const query = buildODataQuery({
    $select: 'No,Description,GST_Group_Code,HSN_SAC_Code,Exempted',
    $filter: `No eq '${itemNo.replace(/'/g, "''")}' and ${getBaseFilter()}`,
  });

  const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Item>>(endpoint);
  
  return response.value.length > 0 ? response.value[0] : null;
}

/**
 * Clear search cache
 */
export function clearItemCache(): void {
  searchCache.clear();
}
