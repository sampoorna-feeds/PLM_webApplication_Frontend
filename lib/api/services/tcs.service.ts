/**
 * TCS (Tax Collected at Source) API Service
 * Handles fetching TCS Group Codes for customers
 */

import { apiGet } from '../client';
import type { ODataResponse } from '../types';

export interface TCSGroupCode {
  TCS_Nature_of_Collection: string;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

/**
 * Get TCS Group Codes (TCS_Nature_of_Collection) for a customer
 * Uses the TCSSection API endpoint
 */
export async function getTCSGroupCodes(customerNo: string): Promise<TCSGroupCode[]> {
  if (!customerNo) return [];

  try {
    const escapedCustomerNo = customerNo.replace(/'/g, "''");
    const endpoint = `/TCSSection?company='${encodeURIComponent(COMPANY)}'&$select=TCS_Nature_of_Collection&$filter=Customer_No eq '${encodeURIComponent(escapedCustomerNo)}'`;
    const response = await apiGet<ODataResponse<TCSGroupCode>>(endpoint);
    return response.value || [];
  } catch (error) {
    console.error('Error fetching TCS Group Codes:', error);
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
      if (item.TCS_Nature_of_Collection && !uniqueMap.has(item.TCS_Nature_of_Collection)) {
        uniqueMap.set(item.TCS_Nature_of_Collection, item);
      }
    });
    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error('Error fetching all TCS Group Codes:', error);
    return [];
  }
}
