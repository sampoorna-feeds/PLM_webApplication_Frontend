/**
 * Vendor API Service
 * Handles fetching vendors from ERP OData V4 API
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface Vendor {
  No: string;
  Name: string;
  P_A_N_No: string;
  GST_Registration_No: string;
  Name_2?: string;
  Privacy_Blocked?: boolean;
  BalanceAsCustomer?: number;
  Balance_Due_LCY?: number;
  Document_Sending_Profile?: string;
  Search_Name?: string;
  Balance_LCY?: number;
  Purchaser_Code?: string;
  Responsibility_Center?: string;
  Blocked?: string;
  Last_Date_Modified?: string;
  Transporter?: boolean;
  Farmer?: boolean;
  Broker?: boolean;
  MSME?: string;
  Created_From_Web?: boolean;
  Type_of_Enterprise?: string;
  Constitution_of_Business?: string;
  Status?: string;
  Creditors_Type?: string;
  TDS_194Q?: boolean;
  Old_Vendor_No?: string;
  Old_No_Series?: string;
  Disable_Search_by_Name?: boolean;
  Company_Size_Code?: string;
  State_Code?: string;
  Address?: string;
  Address_2?: string;
  Country_Region_Code?: string;
  City?: string;
  County?: string;
  Post_Code?: string;
  ShowMap?: string;
  Phone_No?: string;
  MobilePhoneNo?: string;
  Fax_No?: string;
  E_Mail?: string;
  Home_Page?: string;
  IC_Partner_Code?: string;
  Language_Code?: string;
  Format_Region?: string;
  Primary_Contact_No?: string;
  Control16?: string;
  Pay_to_Vendor_No?: string;
  VAT_Registration_No?: string;
  EORI_Number?: string;
  GLN?: string;
  Tax_Liable?: boolean;
  Tax_Area_Code?: string;
  Price_Calculation_Method?: string;
  Registration_Number?: string;
  Gen_Bus_Posting_Group?: string;
  VAT_Bus_Posting_Group?: string;
  Vendor_Posting_Group?: string;
  Invoice_Disc_Code?: string;
  Prices_Including_VAT?: boolean;
  Prepayment_Percent?: number;
  Allow_Multiple_Posting_Groups?: boolean;
  Currency_Code?: string;
  Application_Method?: string;
  Partner_Type?: string;
  Payment_Terms_Code?: string;
  Payment_Method_Code?: string;
  Priority?: number;
  Cash_Flow_Payment_Terms_Code?: string;
  Our_Account_No?: string;
  Block_Payment_Tolerance?: boolean;
  Creditor_No?: string;
  Preferred_Bank_Account_Code?: string;
  Intrastat_Partner_Type?: string;
  Exclude_from_Pmt_Practices?: boolean;
  Location_Code?: string;
  Shipment_Method_Code?: string;
  Lead_Time_Calculation?: string;
  Base_Calendar_Code?: string;
  Customized_Calendar?: string;
  Over_Receipt_Code?: string;
  Assessee_Code?: string;
  P_A_N_Status?: string;
  P_A_N_Reference_No?: string;
  Aadhar_No?: string;
  TAN_No?: string;
  API_aadhaar_Seeding_Status?: string;
  API_Pan_Type?: string;
  API_Full_Name?: string;
  API_DOB?: string;
  SubcontractorVendor?: boolean;
  Vendor_Location?: string;
  Commissioner_x0027_s_Permission_No?: string;
  Govt_Undertaking?: boolean;
  GST_vendor_Type?: string;
  Associated_Enterprises?: boolean;
  Aggregate_Turnover?: string;
  ARN_No?: string;
  PAN_Link_Status?: string;
  GST_Name?: string;
  GST_Address?: string;
  GST_Address_2?: string;
  GST_Post_Code?: string;
  GST_State_Code?: string;
  GST_Status?: string;
  Last_Updated_Date?: string;
  SFPL_POS_as_Vendor_State?: boolean;
  Date_Filter?: string;
  Global_Dimension_1_Filter?: string;
  Global_Dimension_2_Filter?: string;
  Currency_Filter?: string;
}

/**
 * Fetch vendors for the dialog picker.
 * Returns No, Name, GST_Registration_No, P_A_N_No.
 * When search is provided, queries all 4 fields in parallel and merges results.
 */
export async function getVendorsForDialog(opts: {
  skip?: number;
  top?: number;
  search?: string;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc" | null;
  filters?: Record<string, string>;
  visibleColumns?: string[];
  brokerOnly?: boolean;
}): Promise<{ value: Vendor[]; count: number }> {
  const top = opts.top ?? 30;
  const skip = opts.skip ?? 0;

  const defaultCols = ["No", "Name", "GST_Registration_No", "P_A_N_No"];
  const selectCols = opts.visibleColumns
    ? Array.from(new Set([...defaultCols, ...opts.visibleColumns]))
    : defaultCols;
  const sel = selectCols.join(",");

  const baseFilterParts: string[] = [getBaseFilter(opts.brokerOnly)];
  if (opts.filters) {
    Object.entries(opts.filters).forEach(([col, val]) => {
      if (!val) return;
      baseFilterParts.push(`contains(${col},'${escapeODataValue(val.trim())}')`);
    });
  }
  const baseFilter = baseFilterParts.join(" and ");

  let orderbyClause = "No";
  if (opts.sortColumn && opts.sortDirection) {
    orderbyClause = `${opts.sortColumn} ${opts.sortDirection === "asc" ? "asc" : "desc"}`;
  }

  const fetchPage = async (filter: string, pageSkip: number): Promise<{ value: Vendor[]; count: number }> => {
    const query = buildODataQuery({
      $select: sel,
      $filter: filter,
      $orderby: orderbyClause,
      $top: top,
      $skip: pageSkip,
      $count: true,
    });
    const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const res = await apiGet<ODataResponse<Vendor>>(endpoint);
    return {
      value: res.value || [],
      count: (res as any)["@odata.count"] ?? res.value?.length ?? 0,
    };
  };

  // No search — single paginated call
  if (!opts.search || opts.search.trim().length < 2) {
    try {
      return await fetchPage(baseFilter, skip);
    } catch {
      return { value: [], count: 0 };
    }
  }

  // Search — BC OData does not support OR across distinct fields,
  // so make one call per field and merge unique results client-side.
  const s = escapeODataValue(opts.search.trim());
  const searchFields = ["No", "Name", "GST_Registration_No", "P_A_N_No", "Responsibility_Center"];
  try {
    const results = await Promise.all(
      searchFields.map((field) =>
        fetchPage(`${baseFilter} and contains(${field},'${s}')`, 0).then((r) => r.value),
      ),
    );
    const map: Record<string, Vendor> = {};
    results.forEach((list) => list.forEach((v) => { map[v.No] = v; }));
    const merged = Object.values(map);
    return { value: merged.slice(skip, skip + top), count: merged.length };
  } catch {
    return { value: [], count: 0 };
  }
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// Cache for search results
const searchCache = new Map<string, Vendor[]>();

/**
 * Builds the base filter for Vendors
 */
function getBaseFilter(brokerOnly?: boolean): string {
  let base = `(Responsibility_Center eq '' or Responsibility_Center eq 'FEED' or Responsibility_Center eq 'CATTLE' or Responsibility_Center eq 'SWINE') and Blocked eq ' '`;
  if (brokerOnly) {
    base += ` and Broker eq true`;
  }
  return base;
}

/**
 * Helper to escape single quotes in OData filter values
 */
function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Initial load - Get first 20 vendors (no search)
 */
export async function getVendors(): Promise<Vendor[]> {
  const query = buildODataQuery({
    $select: "No,Name",
    $filter: getBaseFilter(),
    $orderby: "No",
    $top: 20,
  });

  const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Vendor>>(endpoint);
  return response.value;
}

/**
 * Search vendors with query string
 * Makes 2 separate API calls (one for No, one for Name) and combines unique results
 * Requires 2 characters minimum
 */
export async function searchVendors(query: string): Promise<Vendor[]> {
  if (query.length < 2) {
    return [];
  }

  // Check cache first
  const cacheKey = `search_${query.toLowerCase()}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const baseFilter = getBaseFilter();
  const escapedQuery = escapeODataValue(query);

  // Make 2 parallel API calls: one for No, one for Name
  const [resultsByNo, resultsByName] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Vendor>();
  combined.forEach((vendor) => {
    if (!uniqueMap.has(vendor.No)) {
      uniqueMap.set(vendor.No, vendor);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );

  // Cache results
  searchCache.set(cacheKey, uniqueResults);

  return uniqueResults;
}

/**
 * Get paginated vendors
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getVendorsPage(
  skip: number,
  search?: string,
): Promise<Vendor[]> {
  const baseFilter = getBaseFilter();

  if (!search || search.length < 2) {
    // No search - return paginated results
    const query = buildODataQuery({
      $select: "No,Name",
      $filter: baseFilter,
      $orderby: "No",
      $top: 30,
      $skip: skip,
    });
    const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<Vendor>>(endpoint);
    return response.value;
  }

  // With search - use dual-call approach
  const escapedQuery = escapeODataValue(search);

  // Make 2 parallel API calls: one for No, one for Name
  const [resultsByNo, resultsByName] = await Promise.all([
    // Search by No field
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
        $skip: skip,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
    // Search by Name field
    (async () => {
      const filterByName = `(${baseFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
        $skip: skip,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
  ]);

  // Combine results and deduplicate by No field
  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Vendor>();
  combined.forEach((vendor) => {
    if (!uniqueMap.has(vendor.No)) {
      uniqueMap.set(vendor.No, vendor);
    }
  });
  const uniqueResults = Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );

  return uniqueResults;
}

/**
 * Clear search cache
 */
export function clearVendorCache(): void {
  searchCache.clear();
}

// ---- Extended vendor types & functions for Purchase Order form ----

export interface VendorDetail extends Vendor {
  GST_Registration_No: string;
  P_A_N_No: string;
  [key: string]: any;
}

export interface Broker {
  No: string;
  Name: string;
}

/**
 * Get vendor details including GST and PAN fields
 */
export async function getVendorDetails(
  vendorNo: string,
): Promise<VendorDetail | null> {
  try {
    const escapedNo = escapeODataValue(vendorNo);
    const endpoint = `/VendorCard(No='${escapedNo}')?company='${encodeURIComponent(COMPANY)}'&$select=No,Name,GST_Registration_No,P_A_N_No`;
    const response = await apiGet<VendorDetail>(endpoint);
    return response;
  } catch (error) {
    console.error("Error fetching vendor details:", error);
    return null;
  }
}

/**
 * Get initial brokers (Vendors with Broker eq true)
 */
export async function getBrokers(): Promise<Broker[]> {
  const brokerFilter = `(Responsibility_Center eq '' or Responsibility_Center eq 'FEED' or Responsibility_Center eq 'CATTLE' or Responsibility_Center eq 'SWINE') and Blocked eq ' ' and Broker eq true`;
  const query = buildODataQuery({
    $select: "No,Name",
    $filter: brokerFilter,
    $orderby: "No",
    $top: 30,
  });

  const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Broker>>(endpoint);
  return response.value;
}

/**
 * Search brokers by No or Name
 */
export async function searchBrokers(query: string): Promise<Broker[]> {
  if (query.length < 2) return [];

  const brokerFilter = `(Responsibility_Center eq '' or Responsibility_Center eq 'FEED' or Responsibility_Center eq 'CATTLE' or Responsibility_Center eq 'SWINE') and Blocked eq ' ' and Broker eq true`;
  const escapedQuery = escapeODataValue(query);

  const [resultsByNo, resultsByName] = await Promise.all([
    (async () => {
      const filterByNo = `(${brokerFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Broker>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const filterByName = `(${brokerFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Broker>>(endpoint);
      return response.value;
    })(),
  ]);

  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Broker>();
  combined.forEach((broker) => {
    if (!uniqueMap.has(broker.No)) {
      uniqueMap.set(broker.No, broker);
    }
  });
  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );
}

/**
 * Get initial transporters (Vendors with Transporter eq true)
 */
export async function getTransporters(): Promise<Vendor[]> {
  const transporterFilter = `${getBaseFilter()} and Transporter eq true`;
  const query = buildODataQuery({
    $select: "No,Name",
    $filter: transporterFilter,
    $orderby: "No",
    $top: 50, // Increased top for better initial selection
  });

  const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Vendor>>(endpoint);
  return response.value;
}

/**
 * Search transporters by No or Name
 */
export async function searchTransporters(query: string): Promise<Vendor[]> {
  if (query.length < 2) return [];

  const transporterFilter = `${getBaseFilter()} and Transporter eq true`;
  const escapedQuery = escapeODataValue(query);

  const [resultsByNo, resultsByName] = await Promise.all([
    (async () => {
      const filterByNo = `(${transporterFilter}) and contains(No,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const filterByName = `(${transporterFilter}) and contains(Name,'${escapedQuery}')`;
      const odataQuery = buildODataQuery({
        $select: "No,Name",
        $filter: filterByName,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/VendorCard?company='${encodeURIComponent(COMPANY)}'&${odataQuery}`;
      const response = await apiGet<ODataResponse<Vendor>>(endpoint);
      return response.value;
    })(),
  ]);

  const combined = [...resultsByNo, ...resultsByName];
  const uniqueMap = new Map<string, Vendor>();
  combined.forEach((transporter) => {
    if (!uniqueMap.has(transporter.No)) {
      uniqueMap.set(transporter.No, transporter);
    }
  });
  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );
}
