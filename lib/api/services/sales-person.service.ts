/**
 * Sales Person API Service
 * Phone App API / Sales Person / Get Sales Persons
 * Endpoint: SalesPerson?Company={{company}}&$select=Code,Name
 */

import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface SalesPerson {
  Code: string;
  Name: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Get initial sales persons (no search)
 */
export async function getSalesPersons(
  top: number = 20,
  skip: number = 0,
): Promise<SalesPerson[]> {
  const query = buildODataQuery({
    $select: "Code,Name",
    $orderby: "Code",
    $top: top,
    $skip: skip,
  });

  const endpoint = `/SalesPerson?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<SalesPerson>>(endpoint);
  return response.value || [];
}

/**
 * Search sales persons by Code or Name
 */
export async function searchSalesPersons(
  searchQuery: string,
  top: number = 30,
  skip: number = 0,
): Promise<SalesPerson[]> {
  const escapedQuery = escapeODataValue(searchQuery);

  const fetchByField = async (field: string): Promise<SalesPerson[]> => {
    const query = buildODataQuery({
      $select: "Code,Name",
      $filter: `contains(${field},'${escapedQuery}')`,
      $orderby: "Code",
      $top: top,
      $skip: 0,
    });
    const endpoint = `/SalesPerson?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<SalesPerson>>(endpoint);
    return response.value || [];
  };

  const [byCode, byName] = await Promise.all([
    fetchByField("Code"),
    fetchByField("Name"),
  ]);

  const map = new Map<string, SalesPerson>();
  [...byCode, ...byName].forEach((p) => { if (!map.has(p.Code)) map.set(p.Code, p); });
  return Array.from(map.values()).slice(skip, skip + top);
}
