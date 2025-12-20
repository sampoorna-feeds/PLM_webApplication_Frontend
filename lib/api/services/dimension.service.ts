/**
 * Dimension Value API Service
 * Handles fetching dimension values (Branch, LOB, LOC) from ERP OData V4 API
 */

import { apiGet } from '../client';
import { buildODataQuery } from '../endpoints';
import type { ODataResponse } from '../types';

export interface DimensionValue {
  Code: string;
  Name?: string;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

// Cache for search results
const searchCache = new Map<string, DimensionValue[]>();

/**
 * Builds the base filter for Dimension Values
 */
function getBaseFilter(dimensionCode: 'BRANCH' | 'LOB' | 'LOC'): string {
  return `Dimension_Code eq '${dimensionCode}' and Dimension_Value_Type eq 'Standard'`;
}

/**
 * Builds search filter based on query content
 * BC OData doesn't support OR, so we choose filter based on query type:
 * - Numeric query → use contains(Code) (search anywhere in Code field)
 * - Alphanumeric query → use contains(Name) (if Name exists) or contains(Code)
 */
function getSearchFilter(
  query: string,
  baseFilter: string,
  hasName: boolean
): string {
  // Check if query contains only digits
  const isNumeric = /^\d+$/.test(query.trim());

  if (isNumeric) {
    return `(${baseFilter}) and contains(Code,'${query}')`;
  } else {
    if (hasName) {
      return `(${baseFilter}) and contains(Name,'${query}')`;
    } else {
      return `(${baseFilter}) and contains(Code,'${query}')`;
    }
  }
}

/**
 * Get Branch values
 * @param search - Optional search query (3+ chars)
 */
export async function getBranches(search?: string): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('BRANCH');
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $select: 'Code,Name',
    $filter: filter,
    $orderby: 'Code',
    $top: search ? 30 : 20,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get paginated Branch values
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getBranchesPage(
  skip: number,
  search?: string
): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('BRANCH');
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $select: 'Code,Name',
    $filter: filter,
    $orderby: 'Code',
    $top: 30,
    $skip: skip,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get LOB values (Code only, no search)
 */
export async function getLOBs(): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('LOB');

  const query = buildODataQuery({
    $select: 'Code',
    $filter: baseFilter,
    $orderby: 'Code',
    $top: 20,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get LOC values
 * @param search - Optional search query (3+ chars)
 */
export async function getLOCs(search?: string): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('LOC');
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $select: 'Code,Name',
    $filter: filter,
    $orderby: 'Code',
    $top: search ? 30 : 20,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get paginated LOC values
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getLOCsPage(
  skip: number,
  search?: string
): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('LOC');
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $select: 'Code,Name',
    $filter: filter,
    $orderby: 'Code',
    $top: 30,
    $skip: skip,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Clear search cache
 */
export function clearDimensionCache(): void {
  searchCache.clear();
}

