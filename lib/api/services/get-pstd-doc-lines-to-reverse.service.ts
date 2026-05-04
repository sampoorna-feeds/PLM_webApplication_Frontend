/**
 * Get Posted Document Lines To Reverse Service
 *
 * Used by: Purchase Credit Memo, Purchase Return Order,
 *          Sales Credit Memo, Sales Return Order
 *
 * Flow:
 * 1. Fetch lines from one of the 4 OData endpoints depending on the
 *    selected document type (currentMenuType).
 * 2. User selects one or more rows in the dialog.
 * 3. Call API_GetPstdDocLinesToReverse once per selected row.
 */

import { apiGet, apiPost } from "../client";
import type { ApiError } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// ─── Menu / document type options ───────────────────────────────────────────

/** One entry in the document-type selector shown at the top of the dialog. */
export interface PstdDocMenuOption {
  /** Label shown in the dropdown (e.g. "Posted Invoice") */
  label: string;
  /** Integer passed to API_GetPstdDocLinesToReverse as currentMenuType */
  currentMenuType: number;
  /** OData endpoint name (without leading slash) used to list rows */
  endpoint: string;
}

/** Options for the Purchase module */
export const PURCHASE_MENU_OPTIONS: PstdDocMenuOption[] = [
  {
    label: "Posted Invoice",
    currentMenuType: 1,
    endpoint: "GetPurchInvoiceLine",
  },
  {
    label: "Posted Receipt",
    currentMenuType: 0,
    endpoint: "GetPurchReceiptLine",
  },
  {
    label: "Posted Return Shipments",
    currentMenuType: 2,
    endpoint: "GetPurchReturnShipmentLine",
  },
  {
    label: "Posted Cr. Memos",
    currentMenuType: 3,
    endpoint: "GetPurchCrMemoLine",
  },
];

/** Options for the Sales module */
export const SALES_MENU_OPTIONS: PstdDocMenuOption[] = [
  {
    label: "Posted Shipment",
    currentMenuType: 0,
    endpoint: "GetPostedSalesHipmentLine",
  },
  {
    label: "Posted Invoice",
    currentMenuType: 1,
    endpoint: "GetPostedSalesInvoiceLine",
  },
];

// ─── Row shape returned by the OData list endpoints ─────────────────────────

export interface PstdDocLineRow {
  "@odata.etag"?: string;
  Document_No: string;
  Line_No: number;
  Description?: string;
  Description_2?: string;
  No?: string;
  Type?: string;
  Quantity?: number;
  Unit_of_Measure?: string;
  Unit_of_Measure_Code?: string;
  Direct_Unit_Cost?: number;
  Amount?: number;
  Amount_Including_VAT?: number;
  Posting_Date?: string;
  Location_Code?: string;
  Buy_from_Vendor_No?: string;
  Sell_to_Customer_No?: string;
  VenName?: string;
  [key: string]: unknown;
}

export interface PstdDocPagedResult {
  value: PstdDocLineRow[];
  count: number;
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

/**
 * Fetch a page of lines from the chosen OData endpoint.
 *
 * @param endpoint  The OData entity name (e.g. "GetPurchInvoiceLine")
 * @param options   Pagination + optional search query
 */
export async function fetchPstdDocLines(
  endpoint: string,
  options: {
    search?: string;
    skip?: number;
    top?: number;
    vendorNo?: string;
    customerNo?: string;
    sortColumn?: string | null;
    sortDirection?: "asc" | "desc" | null;
    columnFilters?: Record<string, string>;
  } = {},
): Promise<PstdDocPagedResult> {
  const { search, skip = 0, top = 200, vendorNo, customerNo, sortColumn, sortDirection, columnFilters } = options;

  const filters: string[] = [];

  // Exclude empty types
  filters.push("Type ne ''");
  filters.push("Type ne ' '");

  if (vendorNo) {
    filters.push(`Buy_from_Vendor_No eq '${vendorNo.replace(/'/g, "''")}'`);
  }

  if (customerNo) {
    filters.push(`Sell_to_Customer_No eq '${customerNo.replace(/'/g, "''")}'`);
  }

  if (search) {
    const s = search.replace(/'/g, "''");
    filters.push(
      `(contains(Document_No,'${s}') or contains(Description,'${s}'))`,
    );
  }

  if (columnFilters) {
    Object.entries(columnFilters).forEach(([colId, filterVal]) => {
      if (!filterVal) return;
      const s = filterVal.replace(/'/g, "''");
      filters.push(`contains(${colId},'${s}')`);
    });
  }

  const filterStr =
    filters.length > 0
      ? `&$filter=${encodeURIComponent(filters.join(" and "))}`
      : "";

  let orderStr = "";
  if (sortColumn && sortDirection) {
    orderStr = `&$orderby=${sortColumn} ${sortDirection}`;
  }

  const url =
    `/${endpoint}?company='${encodeURIComponent(COMPANY)}'` +
    `&$count=true` +
    `${filterStr}` +
    orderStr +
    `&$top=${top}` +
    `&$skip=${skip}`;

  try {
    const response = await apiGet<{
      value: PstdDocLineRow[];
      "@odata.count"?: number;
    }>(url);

    return {
      value: response.value ?? [],
      count: response["@odata.count"] ?? 0,
    };
  } catch (error) {
    console.error(
      `Error fetching ${endpoint}:`,
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}

// ─── Submit helper ───────────────────────────────────────────────────────────

/**
 * Call API_GetPstdDocLinesToReverse for a single selected row.
 *
 * @param module           "Purchase" or "Sales"
 * @param sourceDocNo      Document No. of the current (target) document
 * @param currentMenuType  Integer matching the chosen option in the selector
 * @param copyDocNo        Document_No of the selected source row
 * @param copyDocLine      Line_No of the selected source row
 */
export async function submitPstdDocLineToReverse(
  module: "Purchase" | "Sales",
  sourceDocNo: string,
  currentMenuType: number,
  copyDocNo: string,
  copyDocLine: number,
): Promise<void> {
  const baseEndpoint =
    module === "Sales"
      ? "/API_GetPstdDocLinesToReverseSales"
      : "/API_GetPstdDocLinesToReverse";
  const endpoint = `${baseEndpoint}?company='${encodeURIComponent(COMPANY)}'`;

  const payload = {
    sourceDocNo,
    currentMenuType,
    copyDocNo,
    copyDocLine,
  };

  try {
    await apiPost(endpoint, payload);
  } catch (error) {
    console.error(
      "Error submitting posted line to reverse:",
      JSON.stringify(error, null, 2),
    );
    throw error as ApiError;
  }
}
