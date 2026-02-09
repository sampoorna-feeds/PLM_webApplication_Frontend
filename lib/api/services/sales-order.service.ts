/**
 * Sales Order API Service
 * Handles creating sales orders and adding line items
 */

import { apiPost } from "../client";
import type { ApiError } from "../client";

export interface SalesOrderData {
  customerNo: string;
  customerName?: string;
  shipToCode?: string;
  salesPersonCode?: string;
  locationCode?: string;
  postingDate: string;
  documentDate: string;
  orderDate: string;
  externalDocumentNo?: string;
  invoiceType?: string;
  lob?: string;
  branch?: string;
  loc?: string;
}

export interface SalesOrderLineItem {
  type: "G/L Account" | "Item";
  no: string;
  description: string;
  uom?: string;
  quantity: number;
  mrp?: number;
  price?: number;
  unitPrice: number;
  totalMRP: number;
  discount: number;
  amount: number;
  exempted?: boolean;
  gstGroupCode?: string;
  hsnSacCode?: string;
  tcsGroupCode?: string;
}

export interface CreateSalesOrderResponse {
  orderId: string;
  orderNo: string;
  // Add other response fields as needed
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Create a new sales order
 * Returns the order ID and order number
 */
export async function createSalesOrder(
  orderData: SalesOrderData,
): Promise<CreateSalesOrderResponse> {
  try {
    const endpoint = `/SalesOrder?company='${encodeURIComponent(COMPANY)}'`;

    const payload = {
      Document_Type: "Order",
      Sell_to_Customer_No: orderData.customerNo,
      Ship_to_Code: orderData.shipToCode || "",
      Salesperson_Code: orderData.salesPersonCode || "",
      Location_Code: orderData.locationCode || orderData.loc || "",
      Posting_Date: orderData.postingDate,
      Document_Date: orderData.documentDate,
      Order_Date: orderData.orderDate,
      External_Document_No: orderData.externalDocumentNo || "",
      Invoice_Type: orderData.invoiceType || "Bill of supply",
      Shortcut_Dimension_1_Code: orderData.lob || "",
      Shortcut_Dimension_2_Code: orderData.branch || "",
      Shortcut_Dimension_3_Code: orderData.loc || "",
    };

    const response = await apiPost<CreateSalesOrderResponse>(endpoint, payload);

    return response || { orderId: '', orderNo: '' };
  } catch (error) {
    console.error("Error creating sales order:", error);
    throw error as ApiError;
  }
}

/**
 * Add line items to an existing sales order
 */
export async function addSalesOrderLineItems(
  orderId: string,
  lineItems: SalesOrderLineItem[],
): Promise<void> {
  if (!orderId || lineItems.length === 0) {
    return;
  }

  // TODO: Replace with actual API endpoint once confirmed
  // The endpoint might be something like:
  // POST /SalesOrderHeader('...')/SalesOrderLines
  // or
  // POST /SalesOrderLine with orderId in payload

  try {
    // Add line items one by one or in batch, depending on API support
    for (const lineItem of lineItems) {
      // Example structure (needs to be updated based on actual API):
      const payload = {
        Company: COMPANY,
        OrderId: orderId,
        Type: lineItem.type,
        No: lineItem.no,
        Description: lineItem.description,
        Unit_of_Measure_Code: lineItem.uom,
        Quantity: lineItem.quantity,
        Unit_Price: lineItem.unitPrice,
        Line_Discount_Amount: lineItem.discount,
        Line_Amount: lineItem.amount,
        // Add other fields as needed
      };

      // Placeholder endpoint - needs to be updated
      const endpoint = `/SalesOrderLine`; // or whatever the actual endpoint is

      await apiPost(endpoint, payload);
    }
  } catch (error) {
    console.error("Error adding sales order line items:", error);
    throw error as ApiError;
  }
}
