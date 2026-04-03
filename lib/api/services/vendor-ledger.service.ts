/**
 * Vendor Ledger API Service
 * Handles fetching vendor ledger entries from ERP OData V4 API
 */

import { apiGet, apiPost } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";
import type { FilterCondition } from "@/components/forms/report-ledger/types";

export interface VendorLedgerEntry {
  "@odata.etag": string;
  Entry_No: number;
  Posting_Date: string;
  Invoice_Received_Date: string;
  Document_Type: string;
  Document_No: string;
  External_Document_No: string;
  Vendor_No: string;
  VendorName: string;
  Description: string;
  Debit_Amount: number;
  Credit_Amount: number;
  Amount: number;
  Remaining_Amount: number;
  Document_Date: string;
  Due_Date: string;
  Open: boolean;
  Closed_at_Date: string;
  RunningBalanceLCY: number;
  [key: string]: any;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface VendorLedgerFilters {
  fromDate?: string;
  toDate?: string;
  vendorNo?: string;
  isOutstanding?: boolean;
  search?: string;
  columnFilters?: Record<string, string>;
  additionalFilters?: FilterCondition[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Get vendor ledger entries with optional filters
 */
export async function getVendorLedgerEntries(
  filters: VendorLedgerFilters,
  top: number = 50,
  skip: number = 0
): Promise<ODataResponse<VendorLedgerEntry>> {
  const filterString = buildVendorFilterString(filters);
  const orderby = filters.sortField 
    ? `${filters.sortField} ${filters.sortOrder || "asc"}`
    : "Posting_Date desc, Entry_No desc";

  const query = buildODataQuery({
    $filter: filterString || undefined,
    $orderby: orderby,
    $top: top,
    $skip: skip,
    $count: true,
  });

  const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return await apiGet<ODataResponse<VendorLedgerEntry>>(endpoint);
}

/**
 * Builds OData filter string from VendorLedgerFilters
 */
export function buildVendorFilterString(filters: VendorLedgerFilters): string {
  const filterParts: string[] = [];

  if (filters.vendorNo) {
    filterParts.push(`Vendor_No eq '${filters.vendorNo}'`);
  }

  if (filters.fromDate && filters.toDate) {
    filterParts.push(`Posting_Date ge ${filters.fromDate} and Posting_Date le ${filters.toDate}`);
  } else if (filters.fromDate) {
    filterParts.push(`Posting_Date ge ${filters.fromDate}`);
  } else if (filters.toDate) {
    filterParts.push(`Posting_Date le ${filters.toDate}`);
  }

  if (filters.isOutstanding) {
    filterParts.push(`Remaining_Amount ne 0`);
  }

  // Add universal search filter
  if (filters.search) {
    const s = filters.search.replace(/'/g, "''");
    const searchParts = [
      `contains(Document_No,'${s}')`,
      `contains(External_Document_No,'${s}')`,
      `contains(VendorName,'${s}')`,
      `contains(Description,'${s}')`,
    ];
    
    // For numeric fields, we use eq if the search looks like a number
    if (!isNaN(Number(s))) {
      searchParts.push(`Entry_No eq ${s}`);
    }
    
    filterParts.push(`(${searchParts.join(" or ")})`);
  }

  // Add additional structured filters
  if (filters.additionalFilters && filters.additionalFilters.length > 0) {
    filters.additionalFilters.forEach((f) => {
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

  return filterParts.join(" and ");
}

/**
 * Builds human readable filter descriptions
 */
export function buildHumanReadableVendorFilters(filters: VendorLedgerFilters): string[] {
  const lines: string[] = [];

  if (filters.vendorNo) {
    lines.push(`Vendor No: ${filters.vendorNo}`);
  }

  if (filters.fromDate && filters.toDate) {
    lines.push(`Date Range: ${filters.fromDate} to ${filters.toDate}`);
  } else if (filters.fromDate) {
    lines.push(`Date From: ${filters.fromDate}`);
  } else if (filters.toDate) {
    lines.push(`Date To: ${filters.toDate}`);
  }

  if (filters.isOutstanding) {
    lines.push(`Outstanding Only`);
  }

  if (filters.search) {
    lines.push(`Search: "${filters.search}"`);
  }

  if (filters.additionalFilters) {
    filters.additionalFilters.forEach(f => {
      lines.push(`${f.field.replace(/_/g, ' ')} ${f.operator} ${f.value}`);
    });
  }

  return lines;
}

/**
 * Get opening or closing balance for a vendor
 */
export async function getVendorBalance(
  vendorNo: string,
  date?: string, // If provided, balance up to this date (inclusive). If omitted, total balance.
  isOpening: boolean = false
): Promise<number> {
  if (!vendorNo) return 0;

  const filterParts: string[] = [`Vendor_No eq '${vendorNo}'`];
  if (date) {
    filterParts.push(`Posting_Date ${isOpening ? "lt" : "le"} ${date}`);
  }

  const query = buildODataQuery({
    $filter: filterParts.join(" and "),
    $apply: "aggregate(Amount with sum as TotalAmount)",
  });

  try {
    const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<any>(endpoint);
    // OData aggregate results are typically returned in a 'value' array
    return response.value?.[0]?.TotalAmount || 0;
  } catch (error) {
    console.error("Aggregation failed, falling back to manual sum", error);
    // Fallback: This is limited to the first 1000 entries if aggregation fails
    const simpleQuery = buildODataQuery({
      $filter: filterParts.join(" and "),
      $select: "Amount",
      $top: 10000,
    });
    const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&$count=true&${simpleQuery}`;
    const response = await apiGet<ODataResponse<{ Amount: number }>>(endpoint);
    return response.value?.reduce((sum, entry) => sum + (Number(entry.Amount) || 0), 0) || 0;
  }
}

/**
 * Create a new vendor ledger entry (direct POST)
 * Note: Check ERP documentation if direct creation is allowed or if it should go through journals.
 */
export async function createVendorLedgerEntry(
  payload: Partial<VendorLedgerEntry>
): Promise<VendorLedgerEntry> {
  const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'`;
  return await apiPost<VendorLedgerEntry>(endpoint, payload);
}

/**
 * Get vendor ledger entries with custom OData params
 */
export async function getVendorLedgerEntriesRaw(
  params: {
    $filter?: string;
    $select?: string;
    $orderby?: string;
    $top?: number;
    $skip?: number;
    $count?: boolean;
    $apply?: string;
  } = {}
): Promise<ODataResponse<VendorLedgerEntry>> {
  const query = buildODataQuery(params);
  const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return await apiGet<ODataResponse<VendorLedgerEntry>>(endpoint);
}

