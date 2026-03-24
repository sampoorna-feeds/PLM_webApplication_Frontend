/**
 * Purchaser API Service
 * Endpoint: SalesPerson?Company={{company}}&$select=Code,Name
 * (BC standard often uses the same table for both)
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface Purchaser {
  Code: string;
  Name: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Get initial purchasers (no search)
 */
export async function getPurchasers(
  top: number = 20,
  skip: number = 0,
): Promise<Purchaser[]> {
  const query = buildODataQuery({
    $select: "Code,Name",
    $orderby: "Code",
    $top: top,
    $skip: skip,
  });

  const endpoint = `/SalesPerson?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Purchaser>>(endpoint);
  return response.value || [];
}

/**
 * Search purchasers by Code or Name
 */
export async function searchPurchasers(
  searchQuery: string,
  top: number = 30,
  skip: number = 0,
): Promise<Purchaser[]> {
  const escapedQuery = escapeODataValue(searchQuery);
  const filter = `(contains(Code,'${escapedQuery}') or contains(Name,'${escapedQuery}'))`;

  const query = buildODataQuery({
    $select: "Code,Name",
    $filter: filter,
    $orderby: "Code",
    $top: top,
    $skip: skip,
  });

  const endpoint = `/SalesPerson?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<Purchaser>>(endpoint);
  return response.value || [];
}
