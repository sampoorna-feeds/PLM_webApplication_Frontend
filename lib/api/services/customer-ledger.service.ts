import { apiGet, apiPost } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface CustomerLedgerEntry {
  "@odata.etag"?: string;
  Entry_No: number;
  Posting_Date: string;
  Document_Type: string;
  Document_No: string;
  External_Document_No: string;
  Customer_No: string;
  CustomerName?: string;
  Description: string;
  Debit_Amount: number;
  Credit_Amount: number;
  Amount: number;
  Remaining_Amount: number;
  Original_Amount: number;
  Document_Date: string;
  Due_Date: string;
  Open: boolean;
  [key: string]: unknown;
}

export async function getCustomerLedgerEntriesForDialog(opts: {
  customerNo?: string;
  skip?: number;
  top?: number;
  search?: string;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc" | null;
  filters?: Record<string, string>;
  visibleColumns?: string[];
}): Promise<{ value: CustomerLedgerEntry[]; count: number }> {
  const top = opts.top ?? 30;
  const skip = opts.skip ?? 0;

  const defaultCols = [
    "Entry_No",
    "Document_No",
    "External_Document_No",
    "Document_Type",
    "Posting_Date",
    "Original_Amount",
    "Remaining_Amount",
  ];
  const selectCols = opts.visibleColumns
    ? Array.from(new Set([...defaultCols, ...opts.visibleColumns]))
    : defaultCols;
  const sel = selectCols.join(",");

  const filterParts: string[] = ["Open eq true"];
  if (opts.customerNo) {
    const esc = opts.customerNo.replace(/'/g, "''");
    filterParts.push(`Customer_No eq '${esc}'`);
  }
  if (opts.search && opts.search.trim().length >= 2) {
    const s = opts.search.trim().replace(/'/g, "''");
    filterParts.push(`(contains(Document_No,'${s}') or contains(External_Document_No,'${s}'))`);
  }
  if (opts.filters) {
    Object.entries(opts.filters).forEach(([col, val]) => {
      if (!val) return;
      const esc = val.trim().replace(/'/g, "''");
      filterParts.push(`contains(${col},'${esc}')`);
    });
  }

  const filterStr = filterParts.join(" and ");
  let orderbyClause = "Posting_Date desc, Entry_No desc";
  if (opts.sortColumn && opts.sortDirection) {
    orderbyClause = `${opts.sortColumn} ${opts.sortDirection === "asc" ? "asc" : "desc"}`;
  }

  const query = buildODataQuery({
    $select: sel,
    $filter: filterStr,
    $orderby: orderbyClause,
    $top: top,
    $skip: skip,
    $count: true,
  });

  const endpoint = `/CustomerLedgerEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  try {
    const res = await apiGet<ODataResponse<CustomerLedgerEntry>>(endpoint);
    return {
      value: res.value || [],
      count: (res as unknown as Record<string, unknown>)["@odata.count"] as number ?? res.value?.length ?? 0,
    };
  } catch {
    return { value: [], count: 0 };
  }
}

export async function applyCustomerLedgerEntry(
  salesDocNo: string,
  custLedEntry: number,
): Promise<unknown> {
  const endpoint = `/API_SetCustApplId?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost<unknown>(endpoint, { salesDocNo, custLedEntry, currentRec: false });
}
