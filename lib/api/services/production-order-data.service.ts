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
  ActiveVersionCode?: string;
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

export interface ItemStock {
  No: string;
  Net_Change: number;
}

// ============================================
// ITEM AVAILABLE STOCK API
// ============================================

/**
 * Get available stock (Net_Change) for a list of items at a specific location
 * @param itemNos - Item numbers to fetch stock for
 * @param locationCode - Location filter code
 * @param dateFilter - Date filter (YYYY-MM-DD), stock calculated up to this date
 */
export async function getItemsAvailableStock(
  itemNos: string[],
  locationCode: string,
  dateFilter: string,
): Promise<ItemStock[]> {
  if (itemNos.length === 0) return [];

  const itemFilter = itemNos.map((no) => `No eq '${no}'`).join(" or ");
  const filter = `(${itemFilter}) and Location_Filter eq '${locationCode}' and Date_Filter le '${dateFilter}'`;
  const query = buildODataQuery({ $filter: filter, $select: "No,Net_Change" });
  const endpoint = `/ItemList?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemStock>>(endpoint);
  return response.value || [];
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
  const queryParams: Record<string, any> = {
    $select:
      "No,Description,Production_BOM_No,Base_Unit_of_Measure,GST_Group_Code,HSN_SAC_Code,Exempted",
    $orderby: "No",
    $top: top,
    $skip: skip,
  };

  // If no search query, return basic list
  if (!search || search.length < 2) {
    const query = buildODataQuery(queryParams);
    const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<Item>>(endpoint);
    return response.value || [];
  }

  const escapedSearch = search.replace(/'/g, "''");

  try {
    // Make 2 parallel API calls (No vs Description) for robust searching
    const [resultsByNo, resultsByDesc] = await Promise.all([
      // Search by No (Item ID)
      (async () => {
        const qp = {
          ...queryParams,
          $filter: `contains(No,'${escapedSearch}')`,
        };
        const query = buildODataQuery(qp);
        const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
        const response = await apiGet<ODataResponse<Item>>(endpoint);
        return response.value || [];
      })(),
      // Search by Description (Name)
      (async () => {
        const qp = {
          ...queryParams,
          $filter: `contains(Description,'${escapedSearch}')`,
        };
        const query = buildODataQuery(qp);
        const endpoint = `/ItemCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
        const response = await apiGet<ODataResponse<Item>>(endpoint);
        return response.value || [];
      })(),
    ]);

    // Combine results and deduplicate by No field
    const combined = [...resultsByNo, ...resultsByDesc];
    const uniqueMap = new Map<string, Item>();
    combined.forEach((item) => {
      if (!uniqueMap.has(item.No)) {
        uniqueMap.set(item.No, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) =>
      a.No.localeCompare(b.No),
    );
  } catch (error) {
    console.error("Error searching items:", error);
    return [];
  }
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
      "No,Description,Status,Location_Code_1,Item_No,Unit_of_Measure_Code,ActiveVersionCode",
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
      "No,Description,Status,Location_Code_1,Item_No,Unit_of_Measure_Code,ActiveVersionCode",
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

/**
 * Get a single production BOM by No
 * @param bomNo - Production BOM No
 */
export async function getProdOrderBOMByNo(
  bomNo: string,
): Promise<ProdOrderBOM | null> {
  const filter = `No eq '${bomNo}'`;

  const queryParams: Record<string, any> = {
    $filter: filter,
    $select:
      "No,Description,Status,Location_Code_1,Item_No,Unit_of_Measure_Code,ActiveVersionCode",
  };

  const query = buildODataQuery(queryParams);
  const endpoint = `/ProductionBOMList?company='${encodeURIComponent(COMPANY)}'&${query}`;

  const response = await apiGet<ODataResponse<ProdOrderBOM>>(endpoint);
  return response.value?.[0] || null;
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
 * Get location codes with optional search and multiple specific codes
 * @param search - Optional search query
 * @param authorizedCodes - Optional array of authorized location codes to filter by
 */
export async function getLocationCodes(
  search?: string,
  authorizedCodes?: string[],
): Promise<LocationCode[]> {
  const commonFilter: string[] = [];

  // If authorized codes are provided, restrict to those only
  if (authorizedCodes && authorizedCodes.length > 0) {
    const codeFilter = authorizedCodes
      .map((c) => `Code eq '${c.replace(/'/g, "''")}'`)
      .join(" or ");
    commonFilter.push(`(${codeFilter})`);
  } else if (authorizedCodes && authorizedCodes.length === 0) {
    return [];
  }

  // No search query - return initial list
  if (!search || search.length < 2) {
    const queryParams: Record<string, any> = {
      $select: "Code,Name",
      $orderby: "Code",
      $top: 50,
    };
    if (commonFilter.length > 0) {
      queryParams.$filter = commonFilter.join(" and ");
    }
    const query = buildODataQuery(queryParams);
    const endpoint = `/LocationList?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<LocationCode>>(endpoint);
    return response.value || [];
  }

  // With search - make 2 parallel calls (Code vs Name) since 'OR' is not supported
  try {
    const escapedSearch = search.replace(/'/g, "''");
    const [resultsByCode, resultsByName] = await Promise.all([
      // Search by Code
      (async () => {
        const filter = [
          ...commonFilter,
          `contains(Code,'${escapedSearch}')`,
        ].join(" and ");
        const query = buildODataQuery({
          $select: "Code,Name",
          $filter: filter,
          $orderby: "Code",
          $top: 30,
        });
        const endpoint = `/LocationList?company='${encodeURIComponent(COMPANY)}'&${query}`;
        const response = await apiGet<ODataResponse<LocationCode>>(endpoint);
        return response.value || [];
      })(),
      // Search by Name
      (async () => {
        const filter = [
          ...commonFilter,
          `contains(Name,'${escapedSearch}')`,
        ].join(" and ");
        const query = buildODataQuery({
          $select: "Code,Name",
          $filter: filter,
          $orderby: "Code",
          $top: 30,
        });
        const endpoint = `/LocationList?company='${encodeURIComponent(COMPANY)}'&${query}`;
        const response = await apiGet<ODataResponse<LocationCode>>(endpoint);
        return response.value || [];
      })(),
    ]);

    // Combine and deduplicate
    const combined = [...resultsByCode, ...resultsByName];
    const uniqueMap = new Map<string, LocationCode>();
    combined.forEach((loc) => {
      if (!uniqueMap.has(loc.Code)) {
        uniqueMap.set(loc.Code, loc);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) =>
      a.Code.localeCompare(b.Code),
    );
  } catch (error) {
    console.error("Error searching location codes:", error);
    return [];
  }
}

/**
 * Get all location codes for dropdown (with optional dimension-based filtering)
 */
export async function getAllLocationCodes(
  codes?: string[],
): Promise<LocationCode[]> {
  const queryParams: Record<string, any> = {
    $select: "Code,Name",
    $orderby: "Code",
    $top: 1000, // Increase top to avoid clipping
  };

  if (codes && codes.length > 0) {
    const codeFilter = codes
      .map((c) => `Code eq '${c.replace(/'/g, "''")}'`)
      .join(" or ");
    queryParams.$filter = `(${codeFilter})`;
  } else if (codes && codes.length === 0) {
    // If explicitly empty array passed, return nothing
    return [];
  }

  const query = buildODataQuery(queryParams);
  const endpoint = `/LocationList?company='${encodeURIComponent(COMPANY)}'&${query}`;

  try {
    const response = await apiGet<ODataResponse<LocationCode>>(endpoint);
    return response.value || [];
  } catch (error) {
    console.error("Error fetching location codes:", error);
    return [];
  }
}
export interface ItemLedgerEntry {
  Entry_No: number;
  Item_No: string;
  Location_Code: string;
  Lot_No?: string;
  Item_Tracking?: string;
  Open: boolean;
  Positive: boolean;
  [key: string]: unknown;
}

/**
 * Check if an item has tracking enabled (Lot No.) at a specific location
 */
export async function checkItemTracking(
  itemNo: string,
  locationCode: string,
): Promise<boolean> {
  const filter = `Item_No eq '${itemNo}' and Location_Code eq '${locationCode}' and Open eq true and Positive eq true`;
  const query = buildODataQuery({
    $filter: filter,
    $top: 500, // User suggested $Top=500
    $select: "Item_Tracking",
  });
  const endpoint = `/Itemledger_entry?company='${encodeURIComponent(COMPANY)}'&${query}`;

  try {
    const response = await apiGet<ODataResponse<ItemLedgerEntry>>(endpoint);
    // "Item_Tracking" if it is equal to "Lot No." then the tracking is enabled
    return (
      response.value?.some((entry) => entry.Item_Tracking === "Lot No.") ||
      false
    );
  } catch (error) {
    console.error("Error checking item tracking:", error);
    return false;
  }
}

export async function getSourcesForDialog(opts: {
  sourceType: string;
  skip?: number;
  top?: number;
  search?: string;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc" | null;
  filters?: Record<string, string>;
}): Promise<{ value: any[]; count: number }> {
  const top = opts.top ?? 30;
  const skip = opts.skip ?? 0;

  let endpointPath = "";
  let selectCols = "";
  // Second field to search by (in addition to No)
  let searchField2 = "";

  if (opts.sourceType === "Item") {
    endpointPath = "/ItemCard";
    selectCols = "No,Description,Base_Unit_of_Measure,Inventory";
    searchField2 = "Description";
  } else if (opts.sourceType === "Family") {
    endpointPath = "/FamilyList";
    selectCols = "No,Description";
    searchField2 = "Description";
  } else if (opts.sourceType === "Sales Header") {
    endpointPath = "/SalesOrderEntity";
    selectCols = "No,Sell_to_Customer_Name,Document_Type";
    searchField2 = "Sell_to_Customer_Name";
  } else {
    return { value: [], count: 0 };
  }

  const baseFilterParts: string[] = [];
  if (opts.filters) {
    Object.entries(opts.filters).forEach(([col, val]) => {
      if (!val) return;
      baseFilterParts.push(
        `contains(${col},'${val.replace(/'/g, "''").trim()}')`,
      );
    });
  }

  let orderbyClause = "No";
  if (opts.sortColumn && opts.sortDirection) {
    orderbyClause = `${opts.sortColumn} ${opts.sortDirection === "asc" ? "asc" : "desc"}`;
  }

  const buildEndpoint = (extraFilter?: string) => {
    const parts = [...baseFilterParts];
    if (extraFilter) parts.push(extraFilter);
    const query = buildODataQuery({
      $select: selectCols,
      $filter: parts.length > 0 ? parts.join(" and ") : undefined,
      $orderby: orderbyClause,
      $top: top,
      $skip: skip,
      $count: true,
    });
    return `${endpointPath}?company='${encodeURIComponent(COMPANY)}'&${query}`;
  };

  // BC OData does not support OR across distinct fields — use two parallel calls
  if (opts.search && opts.search.trim().length > 0) {
    const escaped = opts.search.replace(/'/g, "''").trim();
    const [byNo, byField2] = await Promise.all([
      apiGet<ODataResponse<any>>(
        buildEndpoint(`contains(No,'${escaped}')`),
      ),
      apiGet<ODataResponse<any>>(
        buildEndpoint(`contains(${searchField2},'${escaped}')`),
      ),
    ]);

    const combined = [...(byNo.value || []), ...(byField2.value || [])];
    const uniqueMap = new Map<string, any>();
    combined.forEach((item) => {
      if (!uniqueMap.has(item.No)) uniqueMap.set(item.No, item);
    });
    const value = Array.from(uniqueMap.values());

    const count1 = byNo["@odata.count"] ?? byNo.value?.length ?? 0;
    const count2 = byField2["@odata.count"] ?? byField2.value?.length ?? 0;

    return { value, count: count1 + count2 };
  }

  const endpoint = buildEndpoint();
  const res = await apiGet<ODataResponse<any>>(endpoint);
  return {
    value: res.value || [],
    count: res["@odata.count"] ?? res.value?.length ?? 0,
  };
}
