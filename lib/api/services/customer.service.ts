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
  City?: string;
  P_A_N_No?: string;
  GST_Registration_No?: string;
  Address?: string;
  Address_2?: string;
  State_Code?: string;
  Salesperson_Code?: string;
  Responsibility_Center?: string;
  Phone_No?: string;
  MobilePhoneNo?: string;
  E_Mail?: string;
  Post_Code?: string;
  Country_Region_Code?: string;
  Customer_Posting_Group?: string;
  Gen_Bus_Posting_Group?: string;
  Payment_Terms_Code?: string;
  Currency_Code?: string;
  Blocked?: string;
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
    $select: "No,Name,Assessee_Code,Customer_Price_Group",
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
        $select: "No,Name,Assessee_Code,Customer_Price_Group",
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
        $select: "No,Name,Assessee_Code,Customer_Price_Group",
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
      $select: "No,Name,Assessee_Code,Customer_Price_Group",
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
        $select: "No,Name,Assessee_Code,Customer_Price_Group",
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
        $select: "No,Name,Assessee_Code,Customer_Price_Group",
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
    $select: "No,Name,Assessee_Code,Customer_Price_Group",
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

/**
 * Fetch customers for the dialog picker.
 * Supports server-side search (across No, Name, P_A_N_No, GST_Registration_No),
 * sort, per-column filters, pagination, and $count for the total.
 */
export async function getCustomersForDialog(opts: {
  skip?: number;
  top?: number;
  search?: string;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc" | null;
  filters?: Record<string, string>;
  visibleColumns?: string[];
}): Promise<{ value: Customer[]; count: number }> {
  const top = opts.top ?? 30;
  const skip = opts.skip ?? 0;

  const defaultCols = [
    "No",
    "Name",
    "City",
    "P_A_N_No",
    "GST_Registration_No",
    "Address",
    "State_Code",
    "Salesperson_Code",
    "Customer_Price_Group",
    "Responsibility_Center",
    "Assessee_Code",
  ];
  const selectCols = opts.visibleColumns
    ? Array.from(new Set([...defaultCols, ...opts.visibleColumns]))
    : defaultCols;
  const sel = selectCols.join(",");

  const filterParts: string[] = [getBaseFilter()];

  if (opts.search && opts.search.trim().length >= 2) {
    const s = escapeODataValue(opts.search.trim());
    filterParts.push(
      `(contains(No,'${s}') or contains(Name,'${s}') or contains(P_A_N_No,'${s}') or contains(GST_Registration_No,'${s}'))`,
    );
  }

  if (opts.filters) {
    Object.entries(opts.filters).forEach(([col, val]) => {
      if (!val) return;
      filterParts.push(`contains(${col},'${escapeODataValue(val.trim())}')`);
    });
  }

  const filterStr = filterParts.join(" and ");

  let orderbyClause = "No";
  if (opts.sortColumn && opts.sortDirection) {
    orderbyClause = `${opts.sortColumn} ${opts.sortDirection === "asc" ? "asc" : "desc"}`;
  }

  const query = buildODataQuery({
    $select: sel,
    $filter: filterStr,
    $orderby: orderbyClause,
    $top: top,
    $skip: skip,
    $count: true,
  });

  const endpoint = `/CustomerCard?company='${encodeURIComponent(COMPANY)}'&${query}`;

  try {
    const res = await apiGet<ODataResponse<Customer>>(endpoint);
    return {
      value: res.value || [],
      count: (res as unknown as Record<string, number>)["@odata.count"] ?? res.value?.length ?? 0,
    };
  } catch (error) {
    console.error("Error fetching customers for dialog:", error);
    return { value: [], count: 0 };
  }
}
