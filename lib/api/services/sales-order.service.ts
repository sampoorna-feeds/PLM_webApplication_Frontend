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
}

/** API may return the created entity with No (document number) */
interface CreateSalesOrderApiResponse {
  No?: string;
  orderId?: string;
  orderNo?: string;
  [key: string]: unknown;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Create a new sales order
 * Returns the order ID and order number. API returns document number as "No".
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

    const response = await apiPost<CreateSalesOrderApiResponse>(
      endpoint,
      payload,
    );

    if (!response) {
      return { orderId: "", orderNo: "" };
    }

    // API returns document number as "No" (e.g. "SO/2526/080184")
    const orderNo = response.No ?? response.orderNo ?? "";
    const orderId = response.orderId ?? orderNo;

    return { orderId, orderNo };
  } catch (error) {
    console.error("Error creating sales order:", error);
    throw error as ApiError;
  }
}

/**
 * Add line items to an existing sales order.
 * Company is passed as query parameter; body only includes required fields.
 */
export async function addSalesOrderLineItems(
  documentNo: string,
  lineItems: SalesOrderLineItem[],
  locationCode: string,
): Promise<void> {
  if (!documentNo || lineItems.length === 0) {
    return;
  }

  const endpoint = `/SalesLine?company='${encodeURIComponent(COMPANY)}'`;

  try {
    for (const lineItem of lineItems) {
      const payload = {
        Document_No: documentNo,
        Type: lineItem.type,
        No: lineItem.no,
        Location_Code: locationCode || "",
        Quantity: lineItem.quantity,
        Unit_of_Measure_Code: lineItem.uom || "",
      };

      await apiPost(endpoint, payload);
    }
  } catch (error) {
    console.error("Error adding sales order line items:", error);
    throw error as ApiError;
  }
}
