"use client";

import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface DimensionValue {
  Dimension_Code: string;
  Code: string;
  Name: string;
  Dimension_Value_Type?: string;
  Totaling?: string;
  Blocked?: boolean;
  Map_to_IC_Dimension_Value_Code?: string;
  Consolidation_Code?: string;
  Email?: string;
  Mobile_No?: string;
  Address?: string;
  City?: string;
  Post_Code?: string;
  Country_Region_Code?: string;
  County?: string;
  Phone_No?: string;
  LOB_Code?: string;
  Branch_Code?: string;
  [key: string]: unknown;
}

interface UserSetup {
  User_ID: string;
  LOB_Code: string;
  Branch_Code: string;
  Branch_Name: string;
  Location_Code: string;
}

function getBaseFilter(dimensionType: string): string {
  return `Dimension_Code eq '${dimensionType}'`;
}

function getSearchFilter(
  search: string,
  baseFilter: string,
  includeName = false,
): string {
  const s = search.replace(/'/g, "''");
  if (includeName) {
    return `${baseFilter} and (contains(Code, '${s}') or contains(Name, '${s}'))`;
  }
  return `${baseFilter} and contains(Code, '${s}')`;
}

/**
 * Generic search for dimension values
 */
export async function searchDimensionValues(
  dimensionType: string,
  skip: number,
  search?: string,
): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter(dimensionType);
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $select: "Code,Name",
    $filter: filter,
    $orderby: "Code",
    $top: 30,
    $skip: skip,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get LOB values (Code only, no search)
 */
export async function getLOBs(): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter("LOB");

  const query = buildODataQuery({
    $select: "Code",
    $filter: baseFilter,
    $orderby: "Code",
    $top: 20,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get LOC values
 * @param search - Optional search query (3+ chars)
 */
export async function getLOCs(search?: string): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter("LOC");
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $select: "Code,Name",
    $filter: filter,
    $orderby: "Code",
    $top: search ? 30 : 20,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get paginated LOC values
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getLOCsPage(
  skip: number,
  search?: string,
): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter("LOC");
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $select: "Code,Name",
    $filter: filter,
    $orderby: "Code",
    $top: 30,
    $skip: skip,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get Employee values
 * @param search - Optional search query (3+ chars)
 */
export async function getEmployees(search?: string): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter("EMPLOYEE");
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $select: "Code,Name",
    $filter: filter,
    $orderby: "Code",
    $top: search ? 30 : 20,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get paginated Employee values
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getEmployeesPage(
  skip: number,
  search?: string,
): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter("EMPLOYEE");
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $filter: filter,
    $orderby: "Code",
    $top: 30,
    $skip: skip,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get paginated Assignment values
 * @param skip - Number of records to skip
 * @param search - Optional search query
 */
export async function getAssignmentsPage(
  skip: number,
  search?: string,
): Promise<DimensionValue[]> {
  const baseFilter = getBaseFilter("ASSIGNMENT");
  let filter = baseFilter;

  if (search && search.length >= 3) {
    filter = getSearchFilter(search, baseFilter, true);
  }

  const query = buildODataQuery({
    $filter: filter,
    $orderby: "Code",
    $top: 30,
    $skip: skip,
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get Web User Setup for LOB/Branch filtering
 */
export async function getWebUserSetup(userId: string): Promise<UserSetup[]> {
  const query = buildODataQuery({
    $filter: `User_ID eq '${userId.replace(/'/g, "''")}'`,
  });

  const endpoint = `/Webuser?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<UserSetup>>(endpoint);
  return response.value;
}

/**
 * Get LOC values filtered by branch from Webuser setup
 */
export async function getLOCsFromUserSetup(
  userId: string,
  branchCode: string,
): Promise<DimensionValue[]> {
  const setup = await getWebUserSetup(userId);
  const locs = setup
    .filter((s) => s.Branch_Code === branchCode)
    .map((s) => s.Location_Code);

  if (locs.length === 0) return [];

  const filter = `Dimension_Code eq 'LOC' and (${locs
    .map((code) => `Code eq '${code}'`)
    .join(" or ")})`;

  const query = buildODataQuery({
    $select: "Code,Name",
    $filter: filter,
    $orderby: "Code",
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get ALL LOC values from Webuser setup (across all branches)
 */
export async function getAllLOCsFromUserSetup(
  userId: string,
): Promise<DimensionValue[]> {
  const setup = await getWebUserSetup(userId);
  const locs = Array.from(new Set(setup.map((s) => s.Location_Code)));

  if (locs.length === 0) return [];

  const filter = `Dimension_Code eq 'LOC' and (${locs
    .map((code) => `Code eq '${code}'`)
    .join(" or ")})`;

  const query = buildODataQuery({
    $select: "Code,Name",
    $filter: filter,
    $orderby: "Code",
  });

  const endpoint = `/DimensionValue?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<DimensionValue>>(endpoint);
  return response.value;
}

/**
 * Get LOC values for a specific branch from Webuser setup
 */
export async function getLOCsForBranchFromUserSetup(
  userId: string,
  branchCode: string,
): Promise<DimensionValue[]> {
  return getLOCsFromUserSetup(userId, branchCode);
}
