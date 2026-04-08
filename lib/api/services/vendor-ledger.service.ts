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
  // Use parallel search strategy if search term is present to avoid "OR" restrictions
  if (filters.search && filters.search.trim() !== "") {
    return await searchVendorLedgerEntries(filters, top, skip);
  }

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
 * Parallel search strategy for Vendor Ledger.
 * Combines results from multiple single-field queries to avoid OData "OR" limitations.
 */
async function searchVendorLedgerEntries(
  filters: VendorLedgerFilters,
  top: number,
  skip: number
): Promise<ODataResponse<VendorLedgerEntry>> {
  const { search, ...rest } = filters;
  const escaped = (search || "").replace(/'/g, "''");
  
  // Fields to search (mix of real and flow fields)
  const fieldsToSearch = ["Document_No", "External_Document_No", "VendorName", "Description"];
  
  const responses = await Promise.all(
    fieldsToSearch.map(async (field) => {
      const fieldFilter = `contains(${field},'${escaped}')`;
      const baseFilter = buildVendorFilterString(rest);
      const combinedFilter = baseFilter 
        ? `(${baseFilter}) and (${fieldFilter})` 
        : fieldFilter;

      const orderby = filters.sortField 
        ? `${filters.sortField} ${filters.sortOrder || "asc"}`
        : "Posting_Date desc, Entry_No desc";

      const query = buildODataQuery({
        $filter: combinedFilter,
        $orderby: orderby,
        $top: top + skip, 
        $count: false,
      });

      const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
      try {
        const res = await apiGet<ODataResponse<VendorLedgerEntry>>(endpoint);
        return res.value || [];
      } catch (err) {
        console.warn(`Search failed for ${field}:`, err);
        return [];
      }
    })
  );

  // Merge and de-dupe
  const entryMap = new Map<number, VendorLedgerEntry>();
  responses.forEach(entries => {
    entries.forEach(e => entryMap.set(e.Entry_No, e));
  });

  const allResults = Array.from(entryMap.values());
  
  // Sort
  const field = filters.sortField || "Posting_Date";
  const order = filters.sortOrder || "desc";
  allResults.sort((a, b) => {
    const valA = a[field];
    const valB = b[field];
    if (valA < valB) return order === "asc" ? -1 : 1;
    if (valA > valB) return order === "asc" ? 1 : -1;
    return 0;
  });

  const paged = allResults.slice(skip, skip + top);

  return {
    value: paged,
    "@odata.count": allResults.length,
    "@odata.context": "",
  };
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
    // For OData V4, date literals should be yyyy-mm-dd
    filterParts.push(`Posting_Date ge ${filters.fromDate} and Posting_Date le ${filters.toDate}`);
  } else if (filters.fromDate) {
    filterParts.push(`Posting_Date ge ${filters.fromDate}`);
  } else if (filters.toDate) {
    filterParts.push(`Posting_Date le ${filters.toDate}`);
  }

  if (filters.isOutstanding) {
    filterParts.push(`Remaining_Amount ne 0`);
  }

  // Universal search filter is now handled in searchVendorLedgerEntries

  // Add additional structured filters (Dynamic Filter Builder)
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

  // Add column-specific filters
  if (filters.columnFilters && Object.keys(filters.columnFilters).length > 0) {
    Object.entries(filters.columnFilters).forEach(([field, value]) => {
      if (!value) return;
      
      const s = value.toString().replace(/'/g, "''");
      
      // Handle prefixed numeric operators (from ColumnFilter eq:100, gt:50, lt:200)
      if (s.includes(":") && !s.includes("/")) { 
        const [op, val] = s.split(":");
        const validOps = ["eq", "ne", "gt", "ge", "lt", "le"];
        if (validOps.includes(op)) {
          if (!val) return;
          filterParts.push(`${field} ${op} ${val}`);
          return;
        }
      }

      // Handle comma-separated ranges (min,max) or multi-select
      if (s.includes(",")) {
        const parts = s.split(",");
        if (parts.length === 2 && field.toLowerCase().includes('date')) {
            const [start, end] = parts;
            if (start) filterParts.push(`${field} ge ${start}`);
            if (end) filterParts.push(`${field} le ${end}`);
            return;
        } else if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
            const [min, max] = parts;
            if (min) filterParts.push(`${field} ge ${min}`);
            if (max) filterParts.push(`${field} le ${max}`);
            return;
        } else {
          // Multi-select (OR) for text/enum
          const orParts = parts.filter(Boolean).map(p => `contains(${field},'${p}')`);
          if (orParts.length > 0) {
            filterParts.push(`(${orParts.join(" or ")})`);
          }
          return;
        }
      }

      // Default: infer type and use appropriate operator
      const isNumericValue = !isNaN(Number(s)) && s.trim() !== "";
      const isEntryNo = field === "Entry_No";
      const isDateField = field.toLowerCase().includes("date");
      const isCodeField = field.toLowerCase().includes("no") && !isEntryNo;

      if (isNumericValue && !isDateField && !isCodeField) {
        filterParts.push(`${field} eq ${s}`);
      } else if (s.toLowerCase() === "true" || s.toLowerCase() === "false") {
        filterParts.push(`${field} eq ${s.toLowerCase()}`);
      } else {
        // Default to contains for text
        filterParts.push(`contains(${field},'${s}')`);
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
  date?: string, // If provided, balance up to this date (lt/le). If omitted, total balance.
  isOpening: boolean = false
): Promise<number> {
  if (!vendorNo) return 0;

  const filterParts: string[] = [`Vendor_No eq '${vendorNo.replace(/'/g, "''")}'`];
  if (date) {
    // For OData V4, date literals should be yyyy-mm-dd
    filterParts.push(`Posting_Date ${isOpening ? "lt" : "le"} ${date}`);
  }

  const queryParams: any = {
    $filter: filterParts.join(" and "),
  };

  try {
    // Try aggregation first - it's more efficient
    const aggregationQuery = buildODataQuery({
      ...queryParams,
      $apply: "aggregate(Amount with sum as TotalAmount)",
    });
    
    const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${aggregationQuery}`;
    const response = await apiGet<any>(endpoint);
    
    // OData V4 aggregation results are in value[0].Property
    if (response?.value?.[0] && typeof response.value[0].TotalAmount !== 'undefined') {
      return Number(response.value[0].TotalAmount) || 0;
    }
    
    // If we reach here, aggregation returned an unexpected structure, fall back
    throw new Error("Unexpected aggregation response structure");
  } catch (error) {
    console.warn("Aggregation failed or unsupported, falling back to manual sum", error);
    
    // Fallback: Fetch only necessary fields for efficiency
    const fallbackQuery = buildODataQuery({
      ...queryParams,
      $select: "Amount,Debit_Amount,Credit_Amount,Amount_LCY",
      $top: 10000, // Reasonable limit
    });
    
    const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${fallbackQuery}`;
    const response = await apiGet<ODataResponse<VendorLedgerEntry>>(endpoint);
    
    if (!response?.value) return 0;
    
    return response.value.reduce((sum, entry) => {
      // Use Amount_LCY if available, then Amount, finally calculate from Debit/Credit
      let amount = 0;
      if (typeof entry.Amount_LCY !== 'undefined') {
        amount = Number(entry.Amount_LCY) || 0;
      } else if (typeof entry.Amount !== 'undefined') {
        amount = Number(entry.Amount) || 0;
      } else {
        amount = (Number(entry.Debit_Amount) || 0) - (Number(entry.Credit_Amount) || 0);
      }
      return sum + amount;
    }, 0);
  }
}

/**
 * Get total debit and credit sums for a vendor based on current filters
 */
export async function getVendorLedgerSums(
  filters: VendorLedgerFilters
): Promise<{ debitSum: number; creditSum: number }> {
  if (!filters.vendorNo) return { debitSum: 0, creditSum: 0 };

  const filterString = buildVendorFilterString(filters);
  const queryParams: any = {
    $filter: filterString || undefined,
  };

  try {
    // Try aggregation first
    const aggregationQuery = buildODataQuery({
      ...queryParams,
      $apply: "aggregate(Debit_Amount with sum as TotalDebit, Credit_Amount with sum as TotalCredit)",
    });
    
    const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${aggregationQuery}`;
    const response = await apiGet<any>(endpoint);
    
    // Validate that we actually got numeric results back from aggregation
    if (response?.value?.[0] && 
        (typeof response.value[0].TotalDebit !== 'undefined' || 
         typeof response.value[0].TotalCredit !== 'undefined')) {
      
      const d = Number(response.value[0].TotalDebit) || 0;
      const c = Number(response.value[0].TotalCredit) || 0;
      
      // If we got exactly 0 for both but have filters, it's suspicious enough to verify via fallback
      // but only if we really want to be 100% sure. For now, just return if not undefined.
      return { debitSum: d, creditSum: c };
    }
    
    throw new Error("Invalid or empty aggregation response");
  } catch (error) {
    console.warn("Aggregation failed for Vendor Ledger Sums, falling back to manual sum", error);
    
    // Fallback: Fetch necessary fields for manual calculation
    const fallbackQuery = buildODataQuery({
      ...queryParams,
      $select: "Debit_Amount,Credit_Amount,Amount",
      $top: 50000, 
    });
    
    const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${fallbackQuery}`;
    const response = await apiGet<ODataResponse<VendorLedgerEntry>>(endpoint);
    
    if (!response?.value || response.value.length === 0) {
      return { debitSum: 0, creditSum: 0 };
    }

    // Determine the correct field names from the response
    const firstEntry = response.value[0];
    const keys = Object.keys(firstEntry);
    
    // Priority: Debit_Amount -> Debit -> debitAmount -> debit_amount
    const dKey = keys.find(k => ['Debit_Amount', 'Debit', 'debit_amount', 'debitAmount'].includes(k));
    const cKey = keys.find(k => ['Credit_Amount', 'Credit', 'credit_amount', 'creditAmount'].includes(k));

    return response.value.reduce((acc, entry) => {
      let d = 0;
      let c = 0;

      if (dKey) {
        d = Number(entry[dKey]?.toString().replace(/,/g, '')) || 0;
      }
      
      if (cKey) {
        c = Number(entry[cKey]?.toString().replace(/,/g, '')) || 0;
      }
      
      // Secondary fallback: If debit/credit fields are missing but Amount exists
      if (!dKey && !cKey && typeof entry.Amount !== 'undefined') {
        const amt = Number(entry.Amount) || 0;
        if (amt > 0) d = amt;
        else c = Math.abs(amt);
      }

      return {
        debitSum: acc.debitSum + d,
        creditSum: acc.creditSum + c
      };
    }, { debitSum: 0, creditSum: 0 });
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

