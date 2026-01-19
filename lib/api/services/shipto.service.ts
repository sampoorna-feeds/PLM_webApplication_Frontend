/**
 * Ship-to Address API Service
 * Handles fetching ship-to addresses from ERP OData V4 API
 */

import { apiGet, apiPost, apiPatch } from '../client';
import { buildODataQuery } from '../endpoints';
import type { ODataResponse } from '../types';

export interface ShipToAddress {
  '@odata.etag'?: string;
  Customer_No: string;
  Code: string;
  Name: string;
  Address?: string;
  Address_2?: string;
  Landmark?: string;
  State?: string;
  City?: string;
  Post_Code?: string;
  Country_Region_Code?: string;
  Phone_No?: string;
  Contact?: string;
  Fax_No?: string;
  E_Mail?: string;
  Home_Page?: string;
  Location_Code?: string;
  Shipment_Method_Code?: string;
  Shipping_Agent_Code?: string;
  Shipping_Agent_Service_Code?: string;
  Service_Zone_Code?: string;
  Last_Date_Modified?: string;
  GST_Registration_No?: string;
  ARN_No?: string;
  Consignee?: boolean;
  Ship_to_GST_Customer_Type?: string;
  GLN?: string;
  County?: string;
  ShowMap?: string;
}

export interface ShipToAddressCreatePayload {
  Customer_No: string;
  Code: string;
  Name: string;
  Address?: string;
  Address_2?: string;
  Landmark?: string;
  State?: string;
  City?: string;
  Post_Code?: string;
  Country_Region_Code?: string;
  Phone_No?: string;
  Contact?: string;
  Fax_No?: string;
  E_Mail?: string;
  Home_Page?: string;
  Location_Code?: string;
  Shipment_Method_Code?: string;
  Shipping_Agent_Code?: string;
  Shipping_Agent_Service_Code?: string;
  Service_Zone_Code?: string;
  GST_Registration_No?: string;
  ARN_No?: string;
  Consignee?: boolean;
  Ship_to_GST_Customer_Type?: string;
}

export interface ShipToAddressUpdatePayload {
  Customer_No: string;
  Code: string;
  Name?: string;
  Address?: string;
  Address_2?: string;
  Landmark?: string;
  State?: string;
  City?: string;
  Post_Code?: string;
  Country_Region_Code?: string;
  Phone_No?: string;
  Contact?: string;
  Fax_No?: string;
  E_Mail?: string;
  Home_Page?: string;
  Location_Code?: string;
  Shipment_Method_Code?: string;
  Shipping_Agent_Code?: string;
  Shipping_Agent_Service_Code?: string;
  Service_Zone_Code?: string;
  GST_Registration_No?: string;
  ARN_No?: string;
  Consignee?: boolean;
  Ship_to_GST_Customer_Type?: string;
}

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

/**
 * Get ship-to addresses for a specific customer
 * @param customerNo - Customer number to filter by
 */
export async function getShipToAddresses(customerNo: string): Promise<ShipToAddress[]> {
  if (!customerNo) {
    return [];
  }

  const filter = `Customer_No eq '${customerNo.replace(/'/g, "''")}'`;
  const query = buildODataQuery({
    $select: 'Code,Name,Location_Code',
    $filter: filter,
    $orderby: 'Code',
  });

  const endpoint = `/ShiptoAddress?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ShipToAddress>>(endpoint);
  return response.value || [];
}

/**
 * Get a single ship-to address by customer number and code
 * @param customerNo - Customer number
 * @param code - Ship-to address code
 */
export async function getShipToAddress(customerNo: string, code: string): Promise<ShipToAddress | null> {
  if (!customerNo || !code) {
    return null;
  }

  const encodedCompany = encodeURIComponent(COMPANY);
  const encodedCustomerNo = encodeURIComponent(customerNo.replace(/'/g, "''"));
  const encodedCode = encodeURIComponent(code.replace(/'/g, "''"));
  
  const endpoint = `/Company('${encodedCompany}')/ShiptoAddress(Customer_No='${encodedCustomerNo}',Code='${encodedCode}')`;
  
  try {
    const response = await apiGet<ShipToAddress>(endpoint);
    return response;
  } catch (error) {
    console.error('Error fetching ship-to address:', error);
    return null;
  }
}

/**
 * Create a new ship-to address
 * @param data - Ship-to address data in PascalCase format
 */
export async function createShipToAddress(data: ShipToAddressCreatePayload): Promise<ShipToAddress> {
  const endpoint = `/ShiptoAddress?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<ShipToAddress>(endpoint, data);
  return response;
}

/**
 * Update an existing ship-to address
 * @param customerNo - Customer number
 * @param code - Ship-to address code
 * @param data - Updated ship-to address data in PascalCase format
 */
export async function updateShipToAddress(
  customerNo: string,
  code: string,
  data: ShipToAddressUpdatePayload
): Promise<ShipToAddress> {
  const encodedCompany = encodeURIComponent(COMPANY);
  const encodedCustomerNo = encodeURIComponent(customerNo.replace(/'/g, "''"));
  const encodedCode = encodeURIComponent(code.replace(/'/g, "''"));
  
  const endpoint = `/Company('${encodedCompany}')/ShiptoAddress(Customer_No='${encodedCustomerNo}',Code='${encodedCode}')`;
  
  const response = await apiPatch<ShipToAddress>(endpoint, data);
  return response;
}

/**
 * Create a pincode entry (fire-and-forget)
 * @param code - Pincode
 * @param city - City name
 * @returns Promise that resolves even on error (fire-and-forget)
 */
export async function createPinCode(code: string, city: string): Promise<void> {
  if (!code || !city) {
    return;
  }

  const endpoint = `/PinCode?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    Code: code,
    City: city,
    Country_Region_Code: 'IN',
  };

  try {
    await apiPost(endpoint, payload);
    // Success - silently continue
  } catch (error: any) {
    // Fire-and-forget: Log but don't throw
    // Common errors like "City already exists" are expected and ignored
    if (error?.message?.includes('already exists')) {
      // This is fine - pincode/city combination already exists
      return;
    }
    // Other errors are also ignored for fire-and-forget
    console.log('Pincode creation failed (non-blocking, expected):', error?.message || error);
  }
}
