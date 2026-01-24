/**
 * Production Order Related API Services
 * Handles fetching items, families, sales headers, and BOM data
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// ============================================
// INTERFACES
// ============================================

export interface Item {
  No: string;
  Description: string;
  Production_BOM_No?: string;
  Base_Unit_of_Measure?: string;
  [key: string]: unknown;
}

export interface Family {
  No: string;
  Description: string;
  [key: string]: unknown;
}

export interface SalesHeader {
  No: string;
  Sell_to_Customer_Name?: string;
  Document_Type?: string;
  [key: string]: unknown;
}

export interface ProdOrderBOM {
  No: string;
  Description?: string;
  [key: string]: unknown;
}

export interface ProdOrderBOMVersion {
  Production_BOM_No: string;
  Version_Code: string;
  Description?: string;
  [key: string]: unknown;
}

export interface LocationCode {
  Code: string;
  Name?: string;
  [key: string]: unknown;
}

// ============================================
// ITEM LIST API
// ============================================

/**
 * Get items list with optional search
 * @param search - Optional search query
 * @param lobCode - LOB dimension code for filtering
 */
export async function getItems(
  search?: string,
  lobCode?: string,
): Promise<Item[]> {
  let filter = "";
  const filters: string[] = [];

  if (search && search.length >= 2) {
    filters.push(
      `(contains(No,'${search}') or contains(Description,'${search}'))`,
    );
  }

  if (lobCode) {
    filters.push(`Global_Dimension_1_Code eq '${lobCode}'`);
  }

  if (filters.length > 0) {
    filter = filters.join(" and ");
  }

  const queryParams: Record<string, any> = {
    $select: "No,Description,Production_BOM_No,Base_Unit_of_Measure",
    $orderby: "No",
    $top: 50,
  };

  if (filter) {
    queryParams.$filter = filter;
  }

  const query = buildODataQuery(queryParams);
  const endpoint = `/ItemList?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<Item>>(endpoint);
  return response.value || [];
}

/**
 * Get a single item by No
 */
export async function getItemByNo(itemNo: string): Promise<Item | null> {
  const filter = `No eq '${itemNo}'`;
  const query = buildODataQuery({
    $filter: filter,
    $select: "No,Description,Production_BOM_No,Base_Unit_of_Measure",
  });
  const endpoint = `/ItemList?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<Item>>(endpoint);
  return response.value?.[0] || null;
}

// ============================================
// FAMILY LIST API
// ============================================

/**
 * Get family list with optional search
 * @param search - Optional search query
 */
export async function getFamilies(search?: string): Promise<Family[]> {
  let filter = "";

  if (search && search.length >= 2) {
    filter = `contains(No,'${search}') or contains(Description,'${search}')`;
  }

  const queryParams: Record<string, any> = {
    $select: "No,Description",
    $orderby: "No",
    $top: 50,
  };

  if (filter) {
    queryParams.$filter = filter;
  }

  const query = buildODataQuery(queryParams);
  const endpoint = `/FamilyList?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<Family>>(endpoint);
  return response.value || [];
}

// ============================================
// SALES HEADER API
// ============================================

/**
 * Get sales headers (orders) with optional search
 * @param search - Optional search query
 */
export async function getSalesHeaders(search?: string): Promise<SalesHeader[]> {
  let filter = "Document_Type eq 'Order'"; // Only fetch sales orders

  if (search && search.length >= 2) {
    filter += ` and (contains(No,'${search}') or contains(Sell_to_Customer_Name,'${search}'))`;
  }

  const query = buildODataQuery({
    $filter: filter,
    $select: "No,Sell_to_Customer_Name,Document_Type",
    $orderby: "No desc",
    $top: 50,
  });

  const endpoint = `/SalesHeader?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<SalesHeader>>(endpoint);
  return response.value || [];
}

// ============================================
// PRODUCTION BOM API
// ============================================

/**
 * Get production BOM list with optional search
 * @param search - Optional search query
 */
export async function getProdOrderBOMs(
  search?: string,
): Promise<ProdOrderBOM[]> {
  let filter = "";

  if (search && search.length >= 2) {
    filter = `contains(No,'${search}') or contains(Description,'${search}')`;
  }

  const queryParams: Record<string, any> = {
    $select: "No,Description",
    $orderby: "No",
    $top: 50,
  };

  if (filter) {
    queryParams.$filter = filter;
  }

  const query = buildODataQuery(queryParams);
  const endpoint = `/ProdOrderBOM?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<ProdOrderBOM>>(endpoint);
  return response.value || [];
}

// ============================================
// PRODUCTION BOM VERSION API
// ============================================

/**
 * Get BOM versions for a specific production BOM
 * @param bomNo - Production BOM No
 */
export async function getProdOrderBOMVersions(
  bomNo: string,
): Promise<ProdOrderBOMVersion[]> {
  const filter = `Production_BOM_No eq '${bomNo}'`;

  const query = buildODataQuery({
    $filter: filter,
    $select: "Production_BOM_No,Version_Code,Description",
    $orderby: "Version_Code",
    $top: 50,
  });

  const endpoint = `/ProdOrderBOMVersion?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<ProdOrderBOMVersion>>(endpoint);
  return response.value || [];
}

// ============================================
// LOCATION CODE API
// ============================================

/**
 * Get location codes with optional search and LOC filter
 * @param search - Optional search query
 * @param locCode - LOC dimension code for filtering (same filter as dimension LOC)
 */
export async function getLocationCodes(
  search?: string,
  locCode?: string,
): Promise<LocationCode[]> {
  const filters: string[] = [];

  if (search && search.length >= 2) {
    filters.push(`(contains(Code,'${search}') or contains(Name,'${search}'))`);
  }

  // If LOC code is provided, filter by it
  if (locCode) {
    filters.push(`Code eq '${locCode}'`);
  }

  const queryParams: Record<string, any> = {
    $select: "Code,Name",
    $orderby: "Code",
    $top: 50,
  };

  if (filters.length > 0) {
    queryParams.$filter = filters.join(" and ");
  }

  const query = buildODataQuery(queryParams);
  const endpoint = `/Location?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<LocationCode>>(endpoint);
  return response.value || [];
}

/**
 * Get all location codes for dropdown (with optional dimension-based filtering)
 */
export async function getAllLocationCodes(): Promise<LocationCode[]> {
  const query = buildODataQuery({
    $select: "Code,Name",
    $orderby: "Code",
    $top: 100,
  });

  const endpoint = `/Location?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<LocationCode>>(endpoint);
  return response.value || [];
}
