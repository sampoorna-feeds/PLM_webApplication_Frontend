/**
 * GL Entry API Service
 * Handles fetching general ledger entries from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";
import type { FilterCondition } from "@/components/forms/report-ledger/types";

export interface GLEntry {
  "@odata.etag": string;
  Entry_No: number;
  Posting_Date: string;
  Document_Type: string;
  Document_No: string;
  G_L_Account_No: string;
  G_L_Account_Name: string;
  Description: string;
  Job_No: string;
  Global_Dimension_1_Code: string;
  Global_Dimension_2_Code: string;
  IC_Partner_Code: string;
  Gen_Posting_Type: string;
  Gen_Bus_Posting_Group: string;
  Gen_Prod_Posting_Group: string;
  VAT_Bus_Posting_Group: string;
  VAT_Prod_Posting_Group: string;
  Quantity: number;
  Amount: number;
  Document_Date: string;
  Comment: string;
  Bal_Account_Name: string;
  Line_Narration: string;
  Flock_Code: string;
  FEED_Freight_Charge: boolean;
  Entry_Date: string;
  Group_By: string;
  Group_by_Shorting: number;
  Debit_Amount: number;
  Credit_Amount: number;
  RunningBalance: number;
  Additional_Currency_Amount: number;
  RunningBalanceACY: number;
  VAT_Amount: number;
  NonDeductibleVATAmount: number;
  Bal_Account_Type: string;
  Bal_Account_No: string;
  VAT_Reporting_Date: string;
  User_ID: string;
  Source_Code: string;
  Source_Type: string;
  Source_No: string;
  Reason_Code: string;
  Reversed: boolean;
  Reversed_by_Entry_No: number;
  Reversed_Entry_No: number;
  FA_Entry_Type: string;
  FA_Entry_No: number;
  Dimension_Set_ID: number;
  External_Document_No: string;
  Business_Unit_Code: string;
  Shortcut_Dimension_3_Code: string;
  Shortcut_Dimension_4_Code: string;
  Shortcut_Dimension_5_Code: string;
  Shortcut_Dimension_6_Code: string;
  Shortcut_Dimension_7_Code: string;
  Shortcut_Dimension_8_Code: string;
  [key: string]: any;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface GLEntryFilters {
  search?: string;
  columnFilters?: Record<string, string>;
  additionalFilters?: FilterCondition[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Get GL entries with optional filters
 */
export async function getGLEntries(
  filters: GLEntryFilters,
  top: number = 50,
  skip: number = 0
): Promise<ODataResponse<GLEntry>> {
  // If search is present, we use the parallel search strategy to avoid "OR" restrictions
  if (filters.search && filters.search.trim() !== "") {
    return await searchGLEntries(filters, top, skip);
  }

  const filterString = buildGLFilterString(filters);
  const orderby = filters.sortField 
    ? `${filters.sortField} ${filters.sortOrder || "asc"}`
    : "Entry_No desc";

  const query = buildODataQuery({
    $filter: filterString || undefined,
    $orderby: orderby,
    $top: top,
    $skip: skip,
    $count: true,
  });

  const endpoint = `/GLEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return await apiGet<ODataResponse<GLEntry>>(endpoint);
}

/**
 * Parallel search strategy to overcome "OR on distinct fields" limitation.
 * Executes concurrent queries for different fields and merges results.
 */
async function searchGLEntries(
  filters: GLEntryFilters,
  top: number,
  skip: number
): Promise<ODataResponse<GLEntry>> {
  const { search, ...rest } = filters;
  const escaped = (search || "").replace(/'/g, "''");
  
  // Fields that we want to search across
  const fieldsToSearch = [
    "G_L_Account_No", 
    "G_L_Account_Name", 
    "Description", 
    "Document_No", 
    "External_Document_No",
    "Line_Narration",
    "Comment"
  ];
  
  // Perform OData queries in parallel
  const responses = await Promise.all(
    fieldsToSearch.map(async (field) => {
      // Build filter for this specific field
      const fieldFilter = `contains(${field},'${escaped}')`;
      const baseFilter = buildGLFilterString(rest);
      const combinedFilter = baseFilter 
        ? `(${baseFilter}) and (${fieldFilter})` 
        : fieldFilter;

      const orderby = filters.sortField 
        ? `${filters.sortField} ${filters.sortOrder || "asc"}`
        : "Entry_No desc";

      const query = buildODataQuery({
        $filter: combinedFilter,
        $orderby: orderby,
        $top: top + skip, // Fetch enough to handle merging
        $count: false,
      });

      const endpoint = `/GLEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
      try {
        const res = await apiGet<ODataResponse<GLEntry>>(endpoint);
        return res.value || [];
      } catch (err) {
        console.warn(`Search failed for field ${field}:`, err);
        return [];
      }
    })
  );

  // Merge and deduplicate results
  const entryMap = new Map<number, GLEntry>();
  responses.forEach((entries) => {
    entries.forEach((entry) => {
      entryMap.set(entry.Entry_No, entry);
    });
  });

  // Convert map to array and sort (since we lost order during merging)
  const allResults = Array.from(entryMap.values());
  
  // Apply sorting
  const field = filters.sortField || "Entry_No";
  const order = filters.sortOrder || "desc";
  allResults.sort((a, b) => {
    const valA = a[field];
    const valB = b[field];
    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });

  // Apply pagination
  const pagedResults = allResults.slice(skip, skip + top);

  return {
    value: pagedResults,
    "@odata.count": allResults.length, // Approximate count for pagination
    "@odata.context": "",
  };
}

/**
 * Builds OData filter string from GLEntryFilters
 */
export function buildGLFilterString(filters: GLEntryFilters): string {
  const filterParts: string[] = [];

  // Universal search is now handled in searchGLEntries / getGLEntries
  // using a parallel query strategy to avoid OR restrictions.

  // Add additional structured filters (Dynamic Filter Builder)
  if (filters.additionalFilters && filters.additionalFilters.length > 0) {
    filters.additionalFilters.forEach((f) => {
      if (!f.value) return;
      const v = f.value.replace(/'/g, "''");
      if (f.operator === "contains") {
        filterParts.push(`contains(${f.field},'${v}')`);
      } else if (f.operator === "startswith") {
        filterParts.push(`startswith(${f.field},'${v}')`);
      } else if (f.operator === "endswith") {
        filterParts.push(`endswith(${f.field},'${v}')`);
      } else {
        // eq, ne, gt, ge, lt, le
        if (f.type === "number" || f.type === "boolean") {
          filterParts.push(`${f.field} ${f.operator} ${f.value}`);
        } else {
          filterParts.push(`${f.field} ${f.operator} '${v}'`);
        }
      }
    });
  }

  // Add column-specific filters
  if (filters.columnFilters && Object.keys(filters.columnFilters).length > 0) {
    Object.entries(filters.columnFilters).forEach(([field, value]) => {
      if (!value) return;
      
      const s = value.toString().replace(/'/g, "''");
      
      // Handle numeric operators/ranges similar to vendor ledger
      if (s.includes(":") && !s.includes("/")) { 
        const [op, val] = s.split(":");
        const validOps = ["eq", "ne", "gt", "ge", "lt", "le"];
        if (validOps.includes(op) && val) {
          filterParts.push(`${field} ${op} ${val}`);
          return;
        }
      }

      if (s.includes(",")) {
        const parts = s.split(",");
        if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
            const [min, max] = parts;
            if (min) filterParts.push(`${field} ge ${min}`);
            if (max) filterParts.push(`${field} le ${max}`);
            return;
        }
      }

      // Default type inference
      const isNumericValue = !isNaN(Number(s)) && s.trim() !== "";
      const isEntryNo = field === "Entry_No";
      const isCodeField = field.toLowerCase().includes("no") && !isEntryNo;

      if (isNumericValue && !isCodeField) {
        filterParts.push(`${field} eq ${s}`);
      } else {
        filterParts.push(`contains(${field},'${s}')`);
      }
    });
  }


  return filterParts.join(" and ");
}

/**
 * Get GL entries with custom OData params (used for exports)
 */
export async function getGLEntriesRaw(
  params: {
    $filter?: string;
    $select?: string;
    $orderby?: string;
    $top?: number;
    $skip?: number;
    $count?: boolean;
    $apply?: string;
    $search?: string;
  } = {}
): Promise<ODataResponse<GLEntry>> {
  const query = buildODataQuery(params);
  const endpoint = `/GLEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return await apiGet<ODataResponse<GLEntry>>(endpoint);
}
