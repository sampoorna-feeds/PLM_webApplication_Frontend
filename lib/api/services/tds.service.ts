/**
 * TDS (Tax Deducted at Source) API Service
 * Handles fetching TDS Group Codes for customers
 */

import { apiGet } from "../client";
import type { ODataResponse } from "../types";

export interface TDSGroupCode {
  TDS_Nature_of_Collection?: string;
  TDS_Section?: string;
  TDS_Section_Description?: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Get TDS Group Codes (TDS_Nature_of_Collection) for the logged-in user
 * Uses the TDSSection API endpoint with Customer_No filter (logged-in user's username)
 *
 * API: /TDSSection?company='...'&$select=TDS_Nature_of_Collection&$Filter=Customer_No eq '...'
 * Note: The API uses Customer_No field but we pass the logged-in user's username as the value
 *
 * @param username - Logged-in user's username
 * @returns Array of TDS Group Codes
 */
export async function getTDSGroupCodes(
  username: string,
): Promise<TDSGroupCode[]> {
  if (!username) return [];

  try {
    // Escape single quotes in username for OData filter
    const escapedUsername = username.replace(/'/g, "''");
    const endpoint = `/TDSSection?company='${encodeURIComponent(COMPANY)}'&$select=TDS_Nature_of_Collection&$Filter=Customer_No eq '${encodeURIComponent(escapedUsername)}'`;
    const response = await apiGet<ODataResponse<TDSGroupCode>>(endpoint);
    const items = response.value || [];

    // Filter out items where TDS_Nature_of_Collection is missing, null, or empty
    return items.filter(
      (item) =>
        item.TDS_Nature_of_Collection &&
        item.TDS_Nature_of_Collection.trim() !== "",
    );
  } catch (error) {
    console.error("Error fetching TDS Group Codes:", error);
    return [];
  }
}

/**
 * Get TDS Group Codes (TDS_Section) for a Vendor
 * Uses the TDSSection API endpoint with Vendor_No filter
 */
export async function getVendorTDSGroupCodes(
  vendorNo: string,
): Promise<TDSGroupCode[]> {
  if (!vendorNo) return [];

  try {
    const escapedVendor = vendorNo.replace(/'/g, "''");
    const endpoint = `/TDSSection?company='${encodeURIComponent(COMPANY)}'&$select=TDS_Section,TDS_Section_Description&$filter=Vendor_No eq '${encodeURIComponent(escapedVendor)}'`;
    const response = await apiGet<ODataResponse<TDSGroupCode>>(endpoint);
    const items = response.value || [];

    return items.filter(
      (item) =>
        item.TDS_Section &&
        item.TDS_Section.trim() !== "",
    );
  } catch (error) {
    console.error("Error fetching Vendor TDS Group Codes:", error);
    return [];
  }
}

/**
 * Get all available TDS Group Codes
 * Note: This might need a different endpoint if available
 */
export async function getAllTDSGroupCodes(): Promise<TDSGroupCode[]> {
  try {
    const endpoint = `/TDSSection?company='${encodeURIComponent(COMPANY)}'&$select=TDS_Nature_of_Collection`;
    const response = await apiGet<ODataResponse<TDSGroupCode>>(endpoint);
    // Deduplicate by TDS_Nature_of_Collection
    const uniqueMap = new Map<string, TDSGroupCode>();
    (response.value || []).forEach((item) => {
      if (
        item.TDS_Nature_of_Collection &&
        !uniqueMap.has(item.TDS_Nature_of_Collection)
      ) {
        uniqueMap.set(item.TDS_Nature_of_Collection, item);
      }
    });
    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error("Error fetching all TDS Group Codes:", error);
    return [];
  }
}
