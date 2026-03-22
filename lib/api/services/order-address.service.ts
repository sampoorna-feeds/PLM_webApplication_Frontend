/**
 * Order Address API Service
 * Handles fetching, creating, and updating order addresses from ERP OData V4 API
 */

import { apiGet, apiPost, apiPatch } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface OrderAddress {
  Vendor_No: string;
  Code: string;
  Name: string;
  Address: string;
  Address_2: string;
  City: string;
  County: string;
  Post_Code: string;
  Country_Region_Code: string;
  State: string;
  Contact: string;
  Phone_No: string;
}

export interface CreateOrderAddressInput {
  Vendor_No: string;
  Code: string;
  Name?: string;
  Address?: string;
  Address_2?: string;
  City?: string;
  County?: string;
  Post_Code?: string;
  Country_Region_Code?: string;
  State?: string;
  Contact?: string;
  Phone_No?: string;
}

export interface UpdateOrderAddressInput {
  Name?: string;
  Address?: string;
  Address_2?: string;
  City?: string;
  County?: string;
  Post_Code?: string;
  Country_Region_Code?: string;
  State?: string;
  Contact?: string;
  Phone_No?: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Get all order addresses for a vendor
 */
export async function getOrderAddresses(
  vendorNo: string,
): Promise<OrderAddress[]> {
  const query = buildODataQuery({
    $filter: `Vendor_No eq '${vendorNo.replace(/'/g, "''")}'`,
  });

  const endpoint = `/OrderAddress?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<OrderAddress>>(endpoint);
  return response.value;
}

/**
 * Create a new order address
 */
export async function createOrderAddress(
  data: CreateOrderAddressInput,
): Promise<OrderAddress> {
  const endpoint = `/OrderAddress?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<OrderAddress>(endpoint, data);
  return response;
}

/**
 * Update an existing order address
 */
export async function updateOrderAddress(
  vendorNo: string,
  code: string,
  data: UpdateOrderAddressInput,
): Promise<OrderAddress> {
  const escapedVendorNo = vendorNo.replace(/'/g, "''");
  const escapedCode = code.replace(/'/g, "''");
  const endpoint = `/OrderAddress(Vendor_No='${escapedVendorNo}',Code='${escapedCode}')?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPatch<OrderAddress>(endpoint, data);
  return response;
}
