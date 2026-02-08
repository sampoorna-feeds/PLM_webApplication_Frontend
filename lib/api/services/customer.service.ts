/**
 * Customer API Service
 * Handles fetching customers from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface Customer {
  No: string;
  Name: string;
  Assessee_Code?: string;
  Customer_Price_Group?: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// Cache for search results
const searchCache = new Map<string, Customer[]>();

/**
 * Builds the base filter for Customers
 */
function getBaseFilter(): string {
  return `Responsibility_Center in ('','feed','cattle','swime') and Blocked eq ' '`;
}

/**
 * Helper to escape single quotes in OData filter values
 */
function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Initial load - Get first 20 customers (no search)
 */
export async function getCustomers(): Promise<Customer[]> {
  const query = buildODataQuery({
    $select: 'No,Name,Assessee_Code,Customer_Price_Group',
    $filter: getBaseFilter(),
    $orderby: "No",
    $top: 20,
  });

  const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Customer>>(endpoint);
  return response.value;
}

/**
 * Search customers with query string
 * Makes 2 separate API calls (one for No, one for Name) and combines unique results
 * Requires 2 characters minimum
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

  const baseFilter = getBaseFilter();
  const escapedQuery = escapeODataValue(query);

  // Make 2 parallel API calls: one for No, one for Name
  const [resultsByNo, resultsByName] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name,Assessee_Code,Customer_Price_Group',
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Customer>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name,Assessee_Code,Customer_Price_Group',
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Customer>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Customer>();
  combined.forEach((customer) => {
    if (!uniqueMap.has(customer.No)) {
      uniqueMap.set(customer.No, customer);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );

  // Cache results
  searchCache.set(cacheKey, uniqueResults);

  return uniqueResults;
}

/**
 * Get paginated customers
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getCustomersPage(
  skip: number,
  search?: string,
): Promise<Customer[]> {
  const baseFilter = getBaseFilter();

  if (!search || search.length < 2) {
    // No search - return paginated results
    const query = buildODataQuery({
      $select: 'No,Name,Assessee_Code,Customer_Price_Group',
      $filter: baseFilter,
      $orderby: "No",
      $top: 30,
      $skip: skip,
    });
    const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<Customer>>(endpoint);
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
        $select: 'No,Name,Assessee_Code,Customer_Price_Group',
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
        $skip: skip,
      });
      const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Customer>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: 'No,Name,Assessee_Code,Customer_Price_Group',
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
        $skip: skip,
      });
      const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Customer>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Customer>();
  combined.forEach((customer) => {
    if (!uniqueMap.has(customer.No)) {
      uniqueMap.set(customer.No, customer);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );

  return uniqueResults;
}

/**
 * Get a single customer by customer number
 * @param customerNo - Customer number
 */
export async function getCustomerByNo(
  customerNo: string,
): Promise<Customer | null> {
  if (!customerNo) return null;

  const query = buildODataQuery({
    $select: 'No,Name,Assessee_Code,Customer_Price_Group',
    $filter: `No eq '${customerNo.replace(/'/g, "''")}'`,
  });

  const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Customer>>(endpoint);

  return response.value.length > 0 ? response.value[0] : null;
}

/**
 * Clear search cache
 */
export function clearCustomerCache(): void {
  searchCache.clear();
}
