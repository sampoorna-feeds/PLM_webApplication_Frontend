import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export type InwardGateEntrySourceType = "Purchase Order" | "Sales Return Order" | "Transfer Receipt";

export interface InwardGateEntryHeader {
  id?: string;
  Entry_Type: string;
  No: string;
  Location_Code: string;
  Station_From_To: string;
  Description: string;
  Item_Description: string;
  Document_Date: string;
  Document_Time: string;
  Posting_Date: string;
  Posting_Time: string;
  LR_RR_No: string;
  LR_RR_Date: string;
  Vehicle_No: string;
  Posting_No_Series: string;
  Gross_Weight: number;
  Tier_Weight: number;
  Net_Weight: number;
  Per_Bag_Freight_Charges: number;
  Total_Freight_Amount: number;
  Transporter_Name: string;
  No_of_Bags: number;
  Source_Type: InwardGateEntrySourceType;
  Source_No: string;
  Status: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  [key: string]: unknown;
}

export interface InwardGateEntryLine {
  id?: string;
  Entry_Type: string;
  Gate_Entry_No: string;
  Line_No: number;
  Challan_No: string;
  Challan_Date: string;
  Source_Type: string;
  Source_No: string;
  Source_Name: string;
  Description: string;
  [key: string]: unknown;
}

export interface GetInwardGateEntriesParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface SearchInwardGateEntriesParams extends GetInwardGateEntriesParams {
  searchTerm?: string;
}

export interface PaginatedInwardGateEntriesResponse {
  entries: InwardGateEntryHeader[];
  totalCount: number;
}

export async function getInwardGateEntries(): Promise<InwardGateEntryHeader[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntry?company='${encodedCompany}'`;
  const response = await apiGet<ODataResponse<InwardGateEntryHeader>>(endpoint);
  return response.value || [];
}

/**
 * Get inward gate entries with pagination and optional count
 */
export async function getInwardGateEntriesWithCount(
  params: GetInwardGateEntriesParams = {},
): Promise<PaginatedInwardGateEntriesResponse> {
  const {
    $select,
    $filter,
    $orderby = "No desc",
    $top = 20,
    $skip,
  } = params;

  const queryParams: Record<string, unknown> = {
    $top,
    $count: true,
  };

  if ($select) queryParams.$select = $select;
  if ($filter) queryParams.$filter = $filter;
  if ($orderby) queryParams.$orderby = $orderby;
  if ($skip !== undefined) queryParams.$skip = $skip;

  const query = buildODataQuery(queryParams as any);
  const endpoint = `/InwardGateEntry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<InwardGateEntryHeader>>(endpoint);

  return {
    entries: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}

/**
 * Search inward gate entries across multiple fields
 */
export async function searchInwardGateEntries(
  params: SearchInwardGateEntriesParams = {},
): Promise<PaginatedInwardGateEntriesResponse> {
  const { searchTerm, $top, $skip, ...rest } = params;
  if (!searchTerm || searchTerm.trim() === "") {
    return getInwardGateEntriesWithCount(rest as GetInwardGateEntriesParams);
  }

  const escaped = searchTerm.replace(/'/g, "''");
  // Fields to search: No, Transporter_Name, Vehicle_No, Description
  const fieldsToSearch = ["No", "Transporter_Name", "Vehicle_No", "Description"];

  const responses = await Promise.all(
    fieldsToSearch.map((field) => {
      const filterPart = `contains(${field},'${escaped}')`;
      const filter = rest.$filter
        ? `${rest.$filter} and ${filterPart}`
        : filterPart;
      return getInwardGateEntriesWithCount({ ...rest, $filter: filter });
    }),
  );

  const map: Record<string, InwardGateEntryHeader> = {};
  responses.forEach((res) => {
    res.entries.forEach((entry) => {
      if (entry.No) map[entry.No] = entry;
    });
  });

  const allEntries = Object.values(map);
  // Sort by No desc as default
  allEntries.sort((a, b) => (b.No || "").localeCompare(a.No || ""));

  const total = allEntries.length;

  let paged = allEntries;
  if ($skip !== undefined || $top !== undefined) {
    const start = $skip || 0;
    const end = $top != null ? start + $top : undefined;
    paged = allEntries.slice(start, end);
  }

  return { entries: paged, totalCount: total };
}


export async function getInwardGateEntryLines(gateEntryNo: string, entryType: string): Promise<InwardGateEntryLine[]> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const filter = `Gate_Entry_No eq '${gateEntryNo.replace(/'/g, "''")}' and Entry_Type eq '${entryType}'`;
  const query = buildODataQuery({ $filter: filter });
  const endpoint = `/InwardGateEntrySubForm?company='${encodedCompany}'&${query}`;
  const response = await apiGet<ODataResponse<InwardGateEntryLine>>(endpoint);
  return response.value || [];
}

export async function createInwardGateEntryHeader(data: Partial<InwardGateEntryHeader>): Promise<InwardGateEntryHeader> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntry?company='${encodedCompany}'`;
  return apiPost<InwardGateEntryHeader>(endpoint, data);
}

export async function updateInwardGateEntryHeader(gateEntryNo: string, entryType: string, data: Partial<InwardGateEntryHeader>): Promise<InwardGateEntryHeader> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/Company('${encodedCompany}')/InwardGateEntry(Entry_Type='${entryType}',No='${gateEntryNo.replace(/'/g, "''")}')`;
  return apiPatch<InwardGateEntryHeader>(endpoint, data);
}

export async function createInwardGateEntryLine(data: Partial<InwardGateEntryLine>): Promise<InwardGateEntryLine> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntrySubForm?company='${encodedCompany}'`;
  return apiPost<InwardGateEntryLine>(endpoint, data);
}

export async function updateInwardGateEntryLine(gateEntryNo: string, entryType: string, lineNo: number, data: Partial<InwardGateEntryLine>): Promise<InwardGateEntryLine> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntrySubForm(Entry_Type='${entryType}',Gate_Entry_No='${gateEntryNo.replace(/'/g, "''")}',Line_No=${lineNo})?company='${encodedCompany}'`;
  return apiPatch<InwardGateEntryLine>(endpoint, data);
}

export async function deleteInwardGateEntryLine(gateEntryNo: string, entryType: string, lineNo: number): Promise<void> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntrySubForm(Entry_Type='${entryType}',Gate_Entry_No='${gateEntryNo.replace(/'/g, "''")}',Line_No=${lineNo})?company='${encodedCompany}'`;
  await apiDelete(endpoint);
}

export async function deleteInwardGateEntryHeader(id: string): Promise<void> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/InwardGateEntry(id='${id}')?company='${encodedCompany}'`;
  await apiDelete(endpoint);
}

export async function postInwardGateEntry(docNo: string): Promise<string> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const endpoint = `/API_PostGateEntry?company='${encodedCompany}'`;
  const response = await apiPost<{ value: string }>(endpoint, { docNo });
  return response.value;
}

// Source Lists
export interface GetSourceDocsParams {
  $top?: number;
  $skip?: number;
  searchTerm?: string;
  branchCode?: string;
  locationCode?: string;
  filters?: Record<string, { value: string; valueTo?: string }>;
}

export interface PaginatedSourceDocsResponse {
  data: any[];
  totalCount: number;
}

async function getPaginatedSourceDocs(
  entity: string,
  searchFields: string[],
  params: GetSourceDocsParams = {},
  extraFilter?: string,
  locationFieldName: string = "Location_Code"
): Promise<PaginatedSourceDocsResponse> {
  const { $top = 10, $skip = 0, searchTerm, branchCode, locationCode } = params;
  const encodedCompany = encodeURIComponent(COMPANY);

  // Build base filter
  const filterParts: string[] = [];
  if (branchCode) {
    filterParts.push(`Shortcut_Dimension_2_Code eq '${branchCode.replace(/'/g, "''")}'`);
  }
  if (locationCode) {
    filterParts.push(`${locationFieldName} eq '${locationCode.replace(/'/g, "''")}'`);
  }
  if (extraFilter) {
    filterParts.push(extraFilter);
  }

  const baseFilter = filterParts.length > 0 ? filterParts.join(" and ") : "";

  // Add column filters
  const colFilterParts: string[] = [];
  if (params.filters) {
    for (const [col, filterObj] of Object.entries(params.filters)) {
      if (!filterObj.value && !filterObj.valueTo) continue;

      if (col.includes("Date")) {
        if (filterObj.value && filterObj.valueTo) {
          colFilterParts.push(`(${col} ge ${filterObj.value} and ${col} le ${filterObj.valueTo})`);
        } else if (filterObj.value) {
          colFilterParts.push(`${col} ge ${filterObj.value}`);
        } else if (filterObj.valueTo) {
          colFilterParts.push(`${col} le ${filterObj.valueTo}`);
        }
      } else if (filterObj.value.includes(":")) {
        const [op, val] = filterObj.value.split(":");
        if (["eq", "gt", "lt", "ge", "le"].includes(op) && !isNaN(Number(val))) {
          colFilterParts.push(`${col} ${op} ${val}`);
        }
      } else if (filterObj.value) {
        const values = filterObj.value.split(",").map(v => v.trim()).filter(Boolean);
        if (values.length > 0) {
          const textFilters = values.map(v => {
            const s = v.replace(/'/g, "''");
            const sLower = s.toLowerCase();
            const sUpper = s.toUpperCase();
            return `(contains(${col},'${s}') or contains(${col},'${sLower}') or contains(${col},'${sUpper}'))`;
          });
          colFilterParts.push(`(${textFilters.join(" or ")})`);
        }
      }
    }
  }

  const finalBaseFilter = [baseFilter, ...colFilterParts].filter(Boolean).join(" and ");

  // Case 1: No search term, standard paginated fetch
  if (!searchTerm || searchTerm.trim() === "") {
    const query = buildODataQuery({
      $top,
      $skip,
      $filter: finalBaseFilter || undefined,
      $count: true,
      $orderby: "No desc",
    });
    const endpoint = `/${entity}?company='${encodedCompany}'&${query}`;
    const response = await apiGet<ODataResponse<any>>(endpoint);
    return {
      data: response.value || [],
      totalCount: response["@odata.count"] ?? (response.value?.length || 0),
    };
  }

  // Case 2: Search term provided. 
  // We perform parallel requests per field, using multi-case OR to bypass server limitations.
  const s = searchTerm.replace(/'/g, "''");
  const sLower = s.toLowerCase();
  const sUpper = s.toUpperCase();
  
  const results = await Promise.all(
    searchFields.map(async (field) => {
      const filterPart = `(contains(${field},'${s}') or contains(${field},'${sLower}') or contains(${field},'${sUpper}'))`;
      const fullFilter = finalBaseFilter ? `(${finalBaseFilter}) and ${filterPart}` : filterPart;
      
      const query = buildODataQuery({
        $filter: fullFilter,
        $top: 500,
        $count: true,
      });
      const endpoint = `/${entity}?company='${encodedCompany}'&${query}`;
      try {
        const res = await apiGet<ODataResponse<any>>(endpoint);
        return res.value || [];
      } catch (err) {
        console.error(`Error searching ${entity} on field ${field}:`, err);
        return [];
      }
    })
  );

  const mergedMap = new Map<string, any>();
  results.flat().forEach((item) => {
    const key = item.No || item["No."] || item.id || JSON.stringify(item);
    mergedMap.set(key, item);
  });

  const allResults = Array.from(mergedMap.values());
  allResults.sort((a, b) => {
    const noA = a.No || a["No."] || "";
    const noB = b.No || b["No."] || "";
    return noB.localeCompare(noA);
  });

  const pagedData = allResults.slice($skip, $skip + $top);

  return {
    data: pagedData,
    totalCount: allResults.length,
  };
}

export async function getPurchaseOrders(params?: GetSourceDocsParams): Promise<PaginatedSourceDocsResponse> {
  return getPaginatedSourceDocs("PurchaseOrder", ["No", "Buy_from_Vendor_No", "Buy_from_Vendor_Name"], params, "Status eq 'Released'");
}

export async function getSalesReturnOrders(params?: GetSourceDocsParams): Promise<PaginatedSourceDocsResponse> {
  const { branchCode, locationCode, ...rest } = params || {};
  return getPaginatedSourceDocs("SalesReturnOrderHeader", ["No", "Sell_to_Customer_No", "Sell_to_Customer_Name"], rest);
}

export async function getTransferOrders(params?: GetSourceDocsParams): Promise<PaginatedSourceDocsResponse> {
  const { branchCode, locationCode, ...rest } = params || {};
  return getPaginatedSourceDocs("TransferHeader", ["No", "Transfer_from_Code", "Transfer_from_Name", "Transfer_to_Code", "Transfer_to_Name"], rest);
}
