/**
 * Sales Price API Service
 * Handles fetching final sales prices for items via Barcode_Web_Services_SalesPriceAPI
 */

import { apiPost } from '../client';

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

export interface SalesPriceResponse {
  Unit_Price?: number;
  MRP?: number;
  // Allow any additional fields the API might return
  [key: string]: unknown;
}

interface RawSalesPriceOuter {
  value?: string;
  [key: string]: unknown;
}

export interface GetSalesPriceParams {
  salesType?: string; // defaults to '1'
  salesCode: string; // Customer_Price_Group
  itemNo: string;
  location: string;
  unitofmeasure: string;
  orderDate?: string; // ISO yyyy-MM-dd, defaults to today
}

/**
 * Get sales price for an item + UOM + location + customer price group.
 *
 * POST {{baseUrl}}/Barcode_Web_Services_SalesPriceAPI?Company={{company}}
 * Body (all values as strings):
 * {
 *   "salesType": "1",
 *   "salesCode": "<Customer_Price_Group>",
 *   "itemNo": "<itemNo>",
 *   "location": "<locationCode>",
 *   "unitofmeasure": "<UOM>",
 *   "orderDate": "YYYY-MM-DD"
 * }
 *
 * Expected response structure:
 * {
 *   "value": "{\"Response\": { \"Unit_Price\": 123.45, \"MRP\": 150.0, ... }}"
 * }
 */
export async function getSalesPrice(
  params: GetSalesPriceParams
): Promise<SalesPriceResponse | null> {
  const {
    salesType = '1',
    salesCode,
    itemNo,
    location,
    unitofmeasure,
    orderDate,
  } = params;

  if (!salesCode || !itemNo || !location || !unitofmeasure) {
    return null;
  }

  const today = new Date();
  const defaultOrderDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

  const body = {
    salesType: String(salesType),
    salesCode: String(salesCode),
    itemNo: String(itemNo),
    location: String(location),
    unitofmeasure: String(unitofmeasure),
    orderDate: String(orderDate || defaultOrderDate),
  };

  const endpoint = `/Barcode_Web_Services_SalesPriceAPI?Company=${encodeURIComponent(
    COMPANY
  )}`;

  const outer = await apiPost<RawSalesPriceOuter>(endpoint, body);

  if (!outer || typeof outer.value !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(outer.value);
    if (parsed && typeof parsed === 'object' && parsed.Response) {
      return parsed.Response as SalesPriceResponse;
    }
  } catch (error) {
    console.error('Error parsing sales price response:', error);
  }

  return null;
}

