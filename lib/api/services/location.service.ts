/**
 * Location API Service
 * Fetches locations from the LocationList ERP endpoint filtered by branch code.
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocationItem {
  Code: string;
  Name: string;
  Address: string;
  City: string;
  // Optional fields (shown via column control in dialog)
  Post_Code?: string;
  State_Code?: string;
  GST_Registration_No?: string;
  Phone_No?: string;
  Responsibility_Center?: string;
  Region_Code?: string;
  Farm_Type?: string;
  Shed_Type?: string;
  Grade?: string;
  Block?: boolean;
  Farmer?: boolean;
  Global_Dimension_1_Code?: string;
  Global_Dimension_2_Code?: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: LocationItem[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const locationCache = new Map<string, CacheEntry>();

function getCached(branchCode: string): LocationItem[] | null {
  const entry = locationCache.get(branchCode);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    locationCache.delete(branchCode);
    return null;
  }
  return entry.data;
}

function setCache(branchCode: string, data: LocationItem[]): void {
  locationCache.set(branchCode, { data, timestamp: Date.now() });
}

// ── Service ───────────────────────────────────────────────────────────────────

const SELECT_FIELDS = [
  "Code",
  "Name",
  "Address",
  "City",
  "Post_Code",
  "State_Code",
  "GST_Registration_No",
  "Phone_No",
  "Responsibility_Center",
  "Region_Code",
  "Farm_Type",
  "Shed_Type",
  "Grade",
  "Block",
  "Farmer",
  "Global_Dimension_1_Code",
  "Global_Dimension_2_Code",
].join(",");

/**
 * Fetch all locations for a given branch code from the LocationList API.
 * Results are cached per branchCode for 5 minutes.
 */
export async function getLocationsByBranch(
  branchCode: string,
): Promise<LocationItem[]> {
  if (!branchCode) return [];

  const cached = getCached(branchCode);
  if (cached) return cached;

  const escapedBranch = branchCode.replace(/'/g, "''");
  const query = buildODataQuery({
    $filter: `Global_Dimension_2_Code eq '${escapedBranch}'`,
    $select: SELECT_FIELDS,
    $orderby: "Code asc",
  });

  const endpoint = `/LocationList?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<LocationItem>>(endpoint);
  const data = response.value ?? [];

  setCache(branchCode, data);
  return data;
}

/**
 * Paginated location fetcher with search and dimension filters.
 */
export async function getLocationsPage(
  skip: number,
  search?: string,
  lob?: string,
  branch?: string,
): Promise<LocationItem[]> {
  const filters: string[] = [];

  if (lob) {
    filters.push(`Global_Dimension_1_Code eq '${lob.replace(/'/g, "''")}'`);
  }
  if (branch) {
    filters.push(`Global_Dimension_2_Code eq '${branch.replace(/'/g, "''")}'`);
  }
  if (search && search.length >= 3) {
    const s = search.replace(/'/g, "''");
    filters.push(
      `(contains(Code, '${s}') or contains(Name, '${s}') or contains(City, '${s}'))`,
    );
  }

  const query = buildODataQuery({
    $select: SELECT_FIELDS,
    $filter: filters.length > 0 ? filters.join(" and ") : undefined,
    $orderby: "Code asc",
    $top: 30,
    $skip: skip,
  });

  const endpoint = `/LocationList?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<LocationItem>>(endpoint);
  return response.value ?? [];
}

/**
 * Invalidate the cache for a branch code (useful after mutations).
 */
export function invalidateLocationCache(branchCode?: string): void {
  if (branchCode) {
    locationCache.delete(branchCode);
  } else {
    locationCache.clear();
  }
}
