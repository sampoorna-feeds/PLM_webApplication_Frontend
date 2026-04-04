/**
 * GL Entry API Service
 * Handles fetching general ledger entries from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

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

  // Add universal search filter
  if (filters.search) {
    const s = filters.search.replace(/'/g, "''");
    const searchParts = [
      `contains(AccNo,'${s}')`,
      `contains(AccName,'${s}')`,
      `contains(Descr,'${s}')`,
    ];
    
    if (!isNaN(Number(s))) {
      searchParts.push(`Entry_No eq ${s}`);
    }
    
    filterParts.push(`(${searchParts.join(" or ")})`);
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
  } = {}
): Promise<ODataResponse<GLEntry>> {
  const query = buildODataQuery(params);
  const endpoint = `/GLEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return await apiGet<ODataResponse<GLEntry>>(endpoint);
}
