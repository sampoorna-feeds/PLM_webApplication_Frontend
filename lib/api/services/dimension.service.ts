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
function getBaseFilter(dimensionCode: 'BRANCH' | 'LOB' | 'LOC' | 'EMPLOYEE' | 'ASSIGNMENT'): string {
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
 * Get Employee values
 * @param search - Optional search query (3+ chars)
 */
export async function getEmployees(search?: string): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('EMPLOYEE');
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
 * Get paginated Employee values
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getEmployeesPage(
  skip: number,
  search?: string
): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('EMPLOYEE');
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
 * Get Assignment values
 * @param search - Optional search query (3+ chars)
 */
export async function getAssignments(search?: string): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('ASSIGNMENT');
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
 * Get paginated Assignment values
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getAssignmentsPage(
  skip: number,
  search?: string
): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter('ASSIGNMENT');
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

/**
 * WebUserSetup type
 */
export interface WebUserSetup {
  User_Name: string;
  LOB: string;
  Branch_Code: string;
  LOC_Code: string;
}

/**
 * Get WebUserSetup data for a specific user
 * @param userId - User ID (required)
 */
export async function getWebUserSetup(userId: string): Promise<WebUserSetup[]> {
  const filter = `User_name eq '${userId}'`;
  const query = `$filter=${encodeURIComponent(filter)}`;
  const endpoint = `/WebUserSetup?company='${encodeURIComponent(COMPANY)}'&${query}`;
  
  const response = await apiGet<ODataResponse<WebUserSetup>>(endpoint);
  return response.value || [];
}

/**
 * Get unique LOB values from WebUserSetup
 * @param userId - User ID (required)
 */
export async function getLOBsFromUserSetup(userId: string): Promise<DimensionValue[]> {
  const setupData = await getWebUserSetup(userId);
  const uniqueLOBs = Array.from(new Set(setupData.map(item => item.LOB).filter(Boolean)));
  return uniqueLOBs.map(lob => ({ Code: lob }));
}

/**
 * Get unique Branch values from WebUserSetup filtered by LOB
 * @param lob - Selected LOB value
 * @param userId - User ID (required)
 */
export async function getBranchesFromUserSetup(lob: string, userId: string): Promise<DimensionValue[]> {
  const setupData = await getWebUserSetup(userId);
  const filtered = setupData.filter(item => item.LOB === lob);
  const uniqueBranches = Array.from(new Set(filtered.map(item => item.Branch_Code).filter(Boolean)));
  return uniqueBranches.map(branch => ({ Code: branch }));
}

/**
 * Get unique LOC values from WebUserSetup filtered by LOB and Branch
 * @param lob - Selected LOB value
 * @param branch - Selected Branch value
 * @param userId - User ID (required)
 */
export async function getLOCsFromUserSetup(lob: string, branch: string, userId: string): Promise<DimensionValue[]> {
  const setupData = await getWebUserSetup(userId);
  const filtered = setupData.filter(item => item.LOB === lob && item.Branch_Code === branch);
  const uniqueLOCs = Array.from(new Set(filtered.map(item => item.LOC_Code).filter(Boolean)));
  return uniqueLOCs.map(loc => ({ Code: loc }));
}

