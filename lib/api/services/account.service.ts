/**
 * G/L Account API Service
 * Handles fetching G/L accounts from ERP OData V4 API
 */

import { apiGet } from '../client';
import { buildODataQuery } from '../endpoints';
import type { ODataResponse } from '../types';

export interface GLAccount {
  No: string;
  Name: string;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

// Cache for search results
const searchCache = new Map<string, GLAccount[]>();

/**
 * Builds the base filter for G/L Accounts
 */
function getBaseFilter(): string {
  return `Account_Type eq 'Posting' and Direct_Posting eq true`;
}

/**
 * Builds search filter based on query content
 * BC OData doesn't support OR, so we choose filter based on query type:
 * - Numeric query → use contains(No) (search anywhere in No field)
 * - Alphanumeric query → use contains(Name)
 */
function getSearchFilter(query: string, baseFilter: string): string {
  // Check if query contains only digits
  const isNumeric = /^\d+$/.test(query.trim());
  
  if (isNumeric) {
    return `(${baseFilter}) and contains(No,'${query}')`;
  } else {
    return `(${baseFilter}) and contains(Name,'${query}')`;
  }
}

/**
 * Initial load - Get first 20 G/L accounts (no search)
 */
export async function getGLAccounts(): Promise<GLAccount[]> {
  const query = buildODataQuery({
    $select: 'No,Name',
    $filter: getBaseFilter(),
    $orderby: 'No',
    $top: 20,
  });

  const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<GLAccount>>(endpoint);
  return response.value;
}

/**
 * Search G/L accounts with query string
 * Uses startswith for No (fast) and contains for Name
 * Requires 2-3 characters minimum
 */
export async function searchGLAccounts(query: string): Promise<GLAccount[]> {
  if (query.length < 2) {
    return [];
  }

  // Check cache first
  const cacheKey = `search_${query.toLowerCase()}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  // Build search filter - conditional based on query type (BC OData doesn't support OR)
  const baseFilter = getBaseFilter();
  const searchFilter = getSearchFilter(query, baseFilter);

  const odataQuery = buildODataQuery({
    $select: 'No,Name',
    $filter: searchFilter,
    $orderby: 'No',
    $top: 30,
  });

  const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
  const response = await apiGet<ODataResponse<GLAccount>>(endpoint);
  
  // Cache results
  searchCache.set(cacheKey, response.value);
  
  return response.value;
}

/**
 * Get paginated G/L accounts
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getGLAccountsPage(
  skip: number,
  search?: string
): Promise<GLAccount[]> {
  const baseFilter = getBaseFilter();
  let filter = baseFilter;
  
  if (search && search.length >= 2) {
    filter = getSearchFilter(search, baseFilter);
  }

  const query = buildODataQuery({
    $select: 'No,Name',
    $filter: filter,
    $orderby: 'No',
    $top: 30,
    $skip: skip,
  });

  const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<GLAccount>>(endpoint);
  return response.value;
}

/**
 * Clear search cache
 */
export function clearGLAccountCache(): void {
  searchCache.clear();
}

