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

  const query = buildODataQuery({
    $filter: filterParts.length > 0 ? filterParts.join(" and ") : undefined,
    $orderby: "Posting_Date desc, Entry_No desc",
    $top: top,
    $skip: skip,
    $count: true,
  });

  const endpoint = `/VendorLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  return await apiGet<ODataResponse<VendorLedgerEntry>>(endpoint);
}
