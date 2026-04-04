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
  AccNo: string;
  AccName: string;
  Descr: string;
  Amt: number;
  DebAmt: number;
  CredAmt: number;
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
 * Builds OData filter string from GLEntryFilters
 */
export function buildGLFilterString(filters: GLEntryFilters): string {
  const filterParts: string[] = [];

  // Universal search filter
  // IMPORTANT: For G/L Entry, 'AccName' is a FlowField while 'Descr' is a real field.
  // Business Central OData V4 does not support 'OR' between real fields and FlowFields
  // on distinct fields. To ensure search works for account names (like 'Ingredients'),
  // we target AccName primarily. For multi-field searches, users should use the 
  // Analytical Filter Builder or Column Filters.
  if (filters.search) {
    const s = filters.search.replace(/'/g, "''");
    filterParts.push(`contains(AccName,'${s}')`);
  }

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
      if (!isNaN(Number(s)) && s.trim() !== "" && !field.toLowerCase().includes("no")) {
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
