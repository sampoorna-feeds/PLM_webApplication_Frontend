/**
 * Customer API Service
 * Handles fetching customers from ERP OData V4 API
 */

import { apiGet } from '../client';
import { buildODataQuery } from '../endpoints';
import type { ODataResponse } from '../types';

export interface Customer {
  No: string;
  Name: string;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

// Cache for search results
const searchCache = new Map<string, Customer[]>();

/**
 * Builds the base filter for Customers
 */
function getBaseFilter(): string {
  return `Responsibility_Center in ('','FEED','CATTLE','SWINE') and Blocked eq ' '`;
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
 * Initial load - Get first 20 customers (no search)
 */
export async function getCustomers(): Promise<Customer[]> {
  const query = buildODataQuery({
    $select: 'No,Name',
    $filter: getBaseFilter(),
    $orderby: 'No',
    $top: 20,
  });

  const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Customer>>(endpoint);
  return response.value;
}

/**
 * Search customers with query string
 * Uses startswith for No (fast) and contains for Name
 * Requires 2-3 characters minimum
 */
export async function searchCustomers(query: string): Promise<Customer[]> {
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

  const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
  const response = await apiGet<ODataResponse<Customer>>(endpoint);
  
  // Cache results
  searchCache.set(cacheKey, response.value);
  
  return response.value;
}

/**
 * Get paginated customers
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getCustomersPage(
  skip: number,
  search?: string
): Promise<Customer[]> {
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

  const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Customer>>(endpoint);
  return response.value;
}

/**
 * Clear search cache
 */
export function clearCustomerCache(): void {
  searchCache.clear();
}

