/**
 * TCS (Tax Collected at Source) API Service
 * Handles fetching TCS Group Codes for customers
 */

import { apiGet } from "../client";
import type { ODataResponse } from "../types";

export interface TCSGroupCode {
  TCS_Nature_of_Collection: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Get TCS Group Codes (TCS_Nature_of_Collection) for the logged-in user
 * Uses the TCSSection API endpoint with Customer_No filter (logged-in user's username)
 *
 * API: /TCSSection?company='...'&$select=TCS_Nature_of_Collection&$Filter=Customer_No eq '...'
 * Note: The API uses Customer_No field but we pass the logged-in user's username as the value
 *
 * @param username - Logged-in user's username
 * @returns Array of TCS Group Codes
 */
export async function getTCSGroupCodes(
  username: string,
): Promise<TCSGroupCode[]> {
  if (!username) return [];

  try {
    // Escape single quotes in username for OData filter
    const escapedUsername = username.replace(/'/g, "''");
    const endpoint = `/TCSSection?company='${encodeURIComponent(COMPANY)}'&$select=TCS_Nature_of_Collection&$Filter=Customer_No eq '${encodeURIComponent(escapedUsername)}'`;
    const response = await apiGet<ODataResponse<TCSGroupCode>>(endpoint);
    const items = response.value || [];

    // Filter out items where TCS_Nature_of_Collection is missing, null, or empty
    return items.filter(
      (item) =>
        item.TCS_Nature_of_Collection &&
        item.TCS_Nature_of_Collection.trim() !== "",
    );
  } catch (error) {
    console.error("Error fetching TCS Group Codes:", error);
    return [];
  }
}

/**
 * Get all available TCS Group Codes
 * Note: This might need a different endpoint if available
 */
export async function getAllTCSGroupCodes(): Promise<TCSGroupCode[]> {
  try {
    const endpoint = `/TCSSection?company='${encodeURIComponent(COMPANY)}'&$select=TCS_Nature_of_Collection`;
    const response = await apiGet<ODataResponse<TCSGroupCode>>(endpoint);
    // Deduplicate by TCS_Nature_of_Collection
    const uniqueMap = new Map<string, TCSGroupCode>();
    (response.value || []).forEach((item) => {
      if (
        item.TCS_Nature_of_Collection &&
        !uniqueMap.has(item.TCS_Nature_of_Collection)
      ) {
        uniqueMap.set(item.TCS_Nature_of_Collection, item);
      }
    });
    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error("Error fetching all TCS Group Codes:", error);
    return [];
  }
}
