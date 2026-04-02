/**
 * Vendor Ledger API Service
 * Handles fetching vendor ledger entries from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

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
  columnFilters?: Record<string, string>;
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

  // Add column filters
  if (filters.columnFilters) {
    Object.entries(filters.columnFilters).forEach(([field, value]) => {
      if (value) {
        // Simple contains for strings, eq for numbers/booleans if needed
        // For now, let's assume most are strings or we use contains for flexibility
        if (field === "Entry_No" || field === "Amount" || field === "Debit_Amount" || field === "Credit_Amount" || field === "Remaining_Amount") {
          filterParts.push(`${field} eq ${value}`);
        } else if (field === "Open") {
          filterParts.push(`${field} eq ${value === "true"}`);
        } else {
          filterParts.push(`contains(${field},'${value.replace(/'/g, "''")}')`);
        }
      }
    });
  }

  const orderby = filters.sortField 
    ? `${filters.sortField} ${filters.sortOrder || "asc"}`
    : "Posting_Date desc, Entry_No desc";

  const query = buildODataQuery({
    $filter: filterParts.length > 0 ? filterParts.join(" and ") : undefined,
    $orderby: orderby,
    $top: top,
    $skip: skip,
    $count: true,
  });

  const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return await apiGet<ODataResponse<VendorLedgerEntry>>(endpoint);
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
    $select: "Amount",
    $apply: "aggregate(Amount with sum as TotalAmount)",
  });

  // OData aggregate might not be supported by all BC versions without customization, 
  // so we might need to fetch all and sum if aggregation fails. 
  // However, buildODataQuery might not handle $apply.
  
  // Alternative: fetch with $select=Amount and sum on client side if only few entries, 
  // but for balance we want the total.
  
  // Let's try a simpler approach if $apply is not supported:
  // Fetch all amounts... wait, that's slow.
  
  // Actually, many BC OData V4 endpoints support $apply. 
  // If not, we'll have to use a different strategy.
  
  try {
    const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<any>(endpoint);
    return response.value?.[0]?.TotalAmount || 0;
  } catch (error) {
    console.error("Aggregation failed, falling back to manual sum", error);
    // Fallback: This is not ideal for large ledgers but works as a last resort
    const simpleQuery = buildODataQuery({
      $filter: filterParts.join(" and "),
      $select: "Amount",
    });
    const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${simpleQuery}`;
    const response = await apiGet<ODataResponse<{ Amount: number }>>(endpoint);
    return response.value.reduce((sum, entry) => sum + (entry.Amount || 0), 0);
  }
}

