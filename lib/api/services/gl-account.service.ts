/**
 * GL Account API Service
 * Handles fetching GL Accounts from ERP OData V4 API
 */

import { apiGet } from '../client';
import { buildODataQuery } from '../endpoints';
import type { ODataResponse } from '../types';

export interface GLPostingAccount {
  No: string;
  Name: string;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

// Cache for search results
const searchCache = new Map<string, GLPostingAccount[]>();

/**
 * Helper to escape single quotes in OData filter values
 */
function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Builds the base filter for GL Accounts
 */
function getBaseFilter(): string {
  return `Account_Type eq 'Posting' and Direct_Posting eq true`;
}

/**
 * Initial load - Get first batch of GL accounts (no search)
 */
export async function getGLAccounts(top: number = 20): Promise<GLPostingAccount[]> {
  const query = buildODataQuery({
    $select: 'No,Name',
    $filter: getBaseFilter(),
    $orderby: 'No',
    $top: top,
  });

  const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<GLPostingAccount>>(endpoint);
  return response.value;
}

/**
 * Search GL accounts with query string
 * Makes 2 separate API calls (one for No, one for Name) and combines unique results
 */
export async function searchGLAccounts(query: string): Promise<GLPostingAccount[]> {
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

  // Make 2 parallel API calls: one for No, one for Name
  const [resultsByNo, resultsByName] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name',
        $filter: filterByNo,
        $orderby: 'No',
        $top: 30,
      });
      const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<GLPostingAccount>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name',
        $filter: filterByName,
        $orderby: 'No',
        $top: 30,
      });
      const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<GLPostingAccount>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, GLPostingAccount>();
  combined.forEach((account) => {
    if (!uniqueMap.has(account.No)) {
      uniqueMap.set(account.No, account);
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
 * Get paginated GL accounts
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getGLAccountsPage(
  skip: number,
  search?: string,
  top: number = 30
): Promise<GLPostingAccount[]> {
  const baseFilter = getBaseFilter();

  if (!search || search.length < 2) {
    // No search - return paginated results
    const query = buildODataQuery({
      $select: 'No,Name',
      $filter: baseFilter,
      $orderby: 'No',
      $top: top,
      $skip: skip,
    });
    const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<GLPostingAccount>>(endpoint);
    return response.value;
  }

  // With search - use dual-call approach
  const escapedQuery = escapeODataValue(search);

  // Make 2 parallel API calls: one for No, one for Name
  const [resultsByNo, resultsByName] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name',
        $filter: filterByNo,
        $orderby: 'No',
        $top: top,
        $skip: skip,
      });
      const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<GLPostingAccount>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name',
        $filter: filterByName,
        $orderby: 'No',
        $top: top,
        $skip: skip,
      });
      const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<GLPostingAccount>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, GLPostingAccount>();
  combined.forEach((account) => {
    if (!uniqueMap.has(account.No)) {
      uniqueMap.set(account.No, account);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No)
  );

  return uniqueResults;
}

/**
 * Get a single GL account by number
 */
export async function getGLAccountByNo(accountNo: string): Promise<GLPostingAccount | null> {
  if (!accountNo) return null;
  
  const query = buildODataQuery({
    $select: 'No,Name',
    $filter: `No eq '${accountNo.replace(/'/g, "''")}' and ${getBaseFilter()}`,
  });

  const endpoint = `/GLAccount?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<GLPostingAccount>>(endpoint);
  
  return response.value.length > 0 ? response.value[0] : null;
}

/**
 * Clear search cache
 */
export function clearGLAccountCache(): void {
  searchCache.clear();
}
