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
  Status?: string;
  Location_Code_1?: string;
  Item_No?: string;
  Unit_of_Measure_Code?: string;
  [key: string]: unknown;
}

export interface ProdOrderBOMVersion {
  Production_BOM_No: string;
  Version_Code: string;
  Starting_Date?: string;
  Status?: string;
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
 * @param _lobCode - LOB dimension code (not used - ItemCard doesn't support dimension filtering)
 */
export async function getItems(
  search?: string,
  _lobCode?: string,
  skip: number = 0,
  top: number = 50,
): Promise<Item[]> {
  const filters: string[] = [];

  if (search && search.length >= 2) {
    filters.push(`contains(Search_Description,'${search}')`);
  }

  // Note: ItemCard endpoint doesn't support Global_Dimension_1_Code filtering
  // Items are not filtered by LOB

  const queryParams: Record<string, any> = {
    $select:
      "No,Description,Production_BOM_No,Base_Unit_of_Measure,GST_Group_Code,HSN_SAC_Code,Exempted",
    $orderby: "No",
    $top: top,
    $skip: skip,
  };

  if (filters.length > 0) {
    queryParams.$filter = filters.join(" and ");
  }

  const query = buildODataQuery(queryParams);
  const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<Item>>(endpoint);
  return response.value || [];
}

/**
 * Get a single item by No
 */
export async function getItemByNo(itemNo: string): Promise<Item | null> {
  // Note: We don't filter by Blocked here since we're fetching a specific item
  // that was already selected from the items list
  const filter = `No eq '${itemNo}'`;
  const query = buildODataQuery({
    $filter: filter,
    $select:
      "No,Description,Production_BOM_No,Base_Unit_of_Measure,GST_Group_Code,HSN_SAC_Code,Exempted",
  });
  const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;

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
    filter = `contains(Search_Description,'${search}')`;
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
  let filter = "";

  if (search && search.length >= 2) {
    filter = `contains(Search_Description,'${search}')`;
  }

  const queryParams: Record<string, any> = {
    $select: "No,Sell_to_Customer_Name,Document_Type",
    $orderby: "No desc",
    $top: 50,
  };

  if (filter) {
    queryParams.$filter = filter;
  }

  const query = buildODataQuery(queryParams);
  const endpoint = `/SalesOrder?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<SalesHeader>>(endpoint);
  return response.value || [];
}

// ============================================
// PRODUCTION BOM API
// ============================================

/**
 * Get production BOM list filtered by Item_No and Location_Code_1
 * Per Postman: $filter=Item_No eq 'FDP002P' and Location_Code_1 eq 'SFPL0021'
 * @param itemNo - Item No to filter by (required)
 * @param locationCode - Location Code to filter by (required)
 */
export async function getProdOrderBOMs(
  itemNo: string,
  locationCode: string,
): Promise<ProdOrderBOM[]> {
  // Both Item_No and Location_Code_1 are required per Postman collection
  const filter = `Item_No eq '${itemNo}' and Location_Code_1 eq '${locationCode}'`;

  const queryParams: Record<string, any> = {
    $filter: filter,
    $select:
      "No,Description,Status,Location_Code_1,Item_No,Unit_of_Measure_Code",
    $orderby: "No",
    $top: 50,
  };

  const query = buildODataQuery(queryParams);
  const endpoint = `/ProductionBOMList?company='${encodeURIComponent(COMPANY)}'&${query}`;

  console.log("Fetching BOMs from:", endpoint);
  const response = await apiGet<ODataResponse<ProdOrderBOM>>(endpoint);
  console.log("BOM API response - count:", response.value?.length, "BOMs");
  return response.value || [];
}

/**
 * Get production BOM list by Item_No only (alternative source - no location filter)
 * Use this when location-specific BOMs are not found
 * @param itemNo - Item No to filter by (required)
 */
export async function getProdOrderBOMsByItemOnly(
  itemNo: string,
): Promise<ProdOrderBOM[]> {
  const filter = `Item_No eq '${itemNo}'`;

  const queryParams: Record<string, any> = {
    $filter: filter,
    $select:
      "No,Description,Status,Location_Code_1,Item_No,Unit_of_Measure_Code",
    $orderby: "No",
    $top: 50,
  };

  const query = buildODataQuery(queryParams);
  const endpoint = `/ProductionBOMList?company='${encodeURIComponent(COMPANY)}'&${query}`;

  console.log("Fetching BOMs (item-only filter) from:", endpoint);
  const response = await apiGet<ODataResponse<ProdOrderBOM>>(endpoint);
  console.log(
    "BOM API response (item-only) - count:",
    response.value?.length,
    "BOMs",
  );
  return response.value || [];
}

// ============================================
// PRODUCTION BOM VERSION API
// ============================================

/**
 * Get BOM versions for a specific production BOM
 * Per Postman: $filter=Production_BOM_No eq 'FDP001' and Status eq 'Certified'
 * @param bomNo - Production BOM No
 */
export async function getProdOrderBOMVersions(
  bomNo: string,
): Promise<ProdOrderBOMVersion[]> {
  // Filter by Production_BOM_No AND Status eq 'Certified' per Postman collection
  const filter = `Production_BOM_No eq '${bomNo}' and Status eq 'Certified'`;

  const query = buildODataQuery({
    $filter: filter,
    $select: "Production_BOM_No,Version_Code,Starting_Date,Status",
    $orderby: "Version_Code",
    $top: 50,
  });

  const endpoint = `/ProdBOMVersionList?company='${encodeURIComponent(COMPANY)}'&${query}`;

  console.log("Fetching BOM versions from:", endpoint);
  const response = await apiGet<ODataResponse<ProdOrderBOMVersion>>(endpoint);
  console.log("BOM versions response:", response);
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
