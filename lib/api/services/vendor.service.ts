/**
 * Vendor API Service
 * Handles fetching vendors from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface Vendor {
  No: string;
  Name: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// Cache for search results
const searchCache = new Map<string, Vendor[]>();

/**
 * Builds the base filter for Vendors
 */
function getBaseFilter(): string {
  return `Responsibility_Center in ('','FEED','CATTLE','SWINE') and Blocked eq ' '`;
}

/**
 * Helper to escape single quotes in OData filter values
 */
function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Initial load - Get first 20 vendors (no search)
 */
export async function getVendors(): Promise<Vendor[]> {
  const query = buildODataQuery({
    $select: "No,Name",
    $filter: getBaseFilter(),
    $orderby: "No",
    $top: 20,
  });

  const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Vendor>>(endpoint);
  return response.value;
}

/**
 * Search vendors with query string
 * Makes 2 separate API calls (one for No, one for Name) and combines unique results
 * Requires 2 characters minimum
 */
export async function searchVendors(query: string): Promise<Vendor[]> {
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
        $select: "No,Name",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Vendor>();
  combined.forEach((vendor) => {
    if (!uniqueMap.has(vendor.No)) {
      uniqueMap.set(vendor.No, vendor);
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
 * Get paginated vendors
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getVendorsPage(
  skip: number,
  search?: string,
): Promise<Vendor[]> {
  const baseFilter = getBaseFilter();

  if (!search || search.length < 2) {
    // No search - return paginated results
    const query = buildODataQuery({
      $select: "No,Name",
      $filter: baseFilter,
      $orderby: "No",
      $top: 30,
      $skip: skip,
    });
    const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<Vendor>>(endpoint);
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
        $select: "No,Name",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
        $skip: skip,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
        $skip: skip,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Vendor>();
  combined.forEach((vendor) => {
    if (!uniqueMap.has(vendor.No)) {
      uniqueMap.set(vendor.No, vendor);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );

  return uniqueResults;
}

/**
 * Clear search cache
 */
export function clearVendorCache(): void {
  searchCache.clear();
}

// ---- Extended vendor types & functions for Purchase Order form ----

export interface VendorDetail extends Vendor {
  GST_Registration_No: string;
  P_A_N_No: string;
  [key: string]: any;
}

export interface Broker {
  No: string;
  Name: string;
}

/**
 * Get vendor details including GST and PAN fields
 */
export async function getVendorDetails(
  vendorNo: string,
): Promise<VendorDetail | null> {
  try {
    const escapedNo = escapeODataValue(vendorNo);
    const endpoint = `/VendorCard(No='${escapedNo}')?company='${encodeURIComponent(COMPANY)}'&$select=No,Name,GST_Registration_No,P_A_N_No`;
    const response = await apiGet<VendorDetail>(endpoint);
    return response;
  } catch (error) {
    console.error("Error fetching vendor details:", error);
    return null;
  }
}

/**
 * Get initial brokers (Vendors with Broker eq true)
 */
export async function getBrokers(): Promise<Broker[]> {
  const brokerFilter = `Responsibility_Center in ('','FEED','CATTLE','SWINE') and Blocked eq ' ' and Broker eq true`;
  const query = buildODataQuery({
    $select: "No,Name",
    $filter: brokerFilter,
    $orderby: "No",
    $top: 30,
  });

  const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Broker>>(endpoint);
  return response.value;
}

/**
 * Search brokers by No or Name
 */
export async function searchBrokers(query: string): Promise<Broker[]> {
  if (query.length < 2) return [];

  const brokerFilter = `Responsibility_Center in ('','FEED','CATTLE','SWINE') and Blocked eq ' ' and Broker eq true`;
  const escapedQuery = escapeODataValue(query);

  const [resultsByNo, resultsByName] = await Promise.all([
    (async () => {
      const filterByNo = `(${brokerFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Broker>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const filterByName = `(${brokerFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Broker>>(endpoint);
      return response.value;
    })(),
  ]);

  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Broker>();
  combined.forEach((broker) => {
    if (!uniqueMap.has(broker.No)) {
      uniqueMap.set(broker.No, broker);
    }
  });
  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );
}
