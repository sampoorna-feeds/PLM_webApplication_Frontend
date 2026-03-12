/**
 * Purchase Order API Service
 * Handles creating purchase orders and adding line items
 */

import { apiPost } from "../client";
import type { ApiError } from "../client";

export interface PurchaseOrderData {
  vendorNo: string;
  vendorName?: string;
  shipToCode?: string;
  purchasePersonCode?: string;
  locationCode?: string;
  postingDate: string;
  documentDate: string;
  orderDate: string;
  externalDocumentNo?: string;
  vendorInvoiceNo?: string;
  invoiceType?: string;
  lob?: string;
  branch?: string;
  loc?: string;
  // New fields
  poType?: string;
  serviceType?: string;
  vendorGstRegNo?: string;
  vendorPanNo?: string;
  brokerNo?: string;
  brokerName?: string;
  brokerageRate?: string | number;
  orderAddressCode?: string;
  rateBasis?: string;
  termCode?: string;
  mandiName?: string;
  paymentTermCode?: string;
  dueDateCalculation?: string;
  creditorType?: string;
  qcType?: string;
  dueDate?: string;
}

export interface PurchaseOrderLineItem {
  type: "G/L Account" | "Item";
  no: string;
  description: string;
  uom?: string;
  quantity: number;
  price?: number;
  unitPrice: number;
  discount: number;
  amount: number;
  exempted?: boolean;
  gstGroupCode?: string;
  hsnSacCode?: string;
  tdsGroupCode?: string;
}

export interface CreatePurchaseOrderResponse {
  orderId: string;
  orderNo: string;
}

/** API may return the created entity with No (document number) */
interface CreatePurchaseOrderApiResponse {
  No?: string;
  orderId?: string;
  orderNo?: string;
  [key: string]: unknown;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Create a new purchase order
 * Returns the order ID and order number. API returns document number as "No".
 */
export async function createPurchaseOrder(
  orderData: PurchaseOrderData,
): Promise<CreatePurchaseOrderResponse> {
  try {
    const endpoint = `/PurchaseOrder?company='${encodeURIComponent(COMPANY)}'`;

    const payload: Record<string, unknown> = {
      Document_Type: "Order",
      Buy_from_Vendor_No: orderData.vendorNo,
      Ship_to_Code: orderData.shipToCode || "",
      Purchaseperson_Code: orderData.purchasePersonCode || "",
      Location_Code: orderData.locationCode || orderData.loc || "",
      Posting_Date: orderData.postingDate,
      Document_Date: orderData.documentDate,
      Order_Date: orderData.orderDate,
      External_Document_No: orderData.externalDocumentNo || "",
      Vendor_Invoice_No: orderData.vendorInvoiceNo || "",
      Invoice_Type: orderData.invoiceType || "",
      Shortcut_Dimension_1_Code: orderData.lob || "",
      Shortcut_Dimension_2_Code: orderData.branch || "",
      Shortcut_Dimension_3_Code: orderData.loc || "",
      PO_Type: orderData.poType || "",
      Service_Type: orderData.serviceType || "",
      Vendor_GST_Reg_No: orderData.vendorGstRegNo || "",
      Vendor_PAN_No: orderData.vendorPanNo || "",
      Broker_No: orderData.brokerNo || "",
      Broker_Name: orderData.brokerName || "",
      Brokerage_Rate: orderData.brokerageRate
        ? Number(orderData.brokerageRate)
        : 0,
      Order_Address_Code: orderData.orderAddressCode || "",
      Rate_Basis: orderData.rateBasis || "",
      Term_Code: orderData.termCode || "",
      Mandi_Name: orderData.mandiName || "",
      Payment_Term_Code: orderData.paymentTermCode || "",
      Due_Date_Calculation: orderData.dueDateCalculation || "",
      Creditor_Type: orderData.creditorType || "",
      QC_Type: orderData.qcType || "",
      Due_Date: orderData.dueDate || "",
    };

    console.log("[PO Create] Endpoint:", endpoint);
    console.log("[PO Create] Payload:", JSON.stringify(payload, null, 2));

    const response = await apiPost<CreatePurchaseOrderApiResponse>(
      endpoint,
      payload,
    );

    if (!response) {
      return { orderId: "", orderNo: "" };
    }

    // API returns document number as "No" (e.g. "PO/2526/080184")
    const orderNo = response.No ?? response.orderNo ?? "";
    const orderId = response.orderId ?? orderNo;

    return { orderId, orderNo };
  } catch (error) {
    console.error("Error creating purchase order:", error);
    throw error as ApiError;
  }
}

/**
 * Add line items to an existing purchase order.
 * Company is passed as query parameter; body only includes required fields.
 */
export async function addPurchaseOrderLineItems(
  documentNo: string,
  lineItems: PurchaseOrderLineItem[],
  locationCode: string,
): Promise<void> {
  if (!documentNo || lineItems.length === 0) {
    return;
  }

  const endpoint = `/PurchaseLine?company='${encodeURIComponent(COMPANY)}'`;

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
    console.error("Error adding purchase order line items:", error);
    throw error as ApiError;
  }
}
