/**
 * TCS (Tax Collected at Source) API Service
 * Handles fetching TCS Group Codes for customers
 */

import { apiGet } from '../client';
import { buildODataQuery } from '../endpoints';
import type { ODataResponse } from '../types';

export interface TCSGroupCode {
  Code: string;
  Description?: string;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

/**
 * Get TCS Group Codes for a customer
 * Note: The exact API endpoint needs to be confirmed based on ERP structure
 * This is a placeholder implementation
 */
export async function getTCSGroupCodes(customerNo: string): Promise<TCSGroupCode[]> {
  if (!customerNo) return [];

  // TODO: Replace with actual API endpoint once confirmed
  // The endpoint might be something like:
  // /CustomerCard('...')/TCSGroupCodes
  // or
  // /TCSGroupCode?$filter=Customer_No eq '...'
  
  // For now, return empty array
  // This will need to be updated based on the actual API structure
  return [];
}

/**
 * Get all available TCS Group Codes
 */
export async function getAllTCSGroupCodes(): Promise<TCSGroupCode[]> {
  // TODO: Replace with actual API endpoint once confirmed
  // This might be a simple list endpoint
  return [];
}
