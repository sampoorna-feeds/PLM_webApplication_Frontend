/**
 * UOM API Service
 * Handles fetching Unit of Measures from ERP OData V4 API
 */

import { apiGet } from "../client";
import type { ODataResponse } from "../types";

export interface UOM {
  Code: string;
  Description: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Fetch all Unit of Measures from the ERP API
 */
export async function getUOMs(): Promise<UOM[]> {
  const query = `$select=Code,Description`;
  const endpoint = `/UOM?company='${encodeURIComponent(COMPANY)}'&${query}`;
  
  try {
    const response = await apiGet<ODataResponse<UOM>>(endpoint);
    return response.value || [];
  } catch (error) {
    console.error("Error fetching UOMs:", error);
    return [];
  }
}
