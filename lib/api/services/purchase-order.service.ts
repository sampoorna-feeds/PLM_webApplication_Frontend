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
  PO_No?: string;
  Document_No?: string;
  docNo?: string;
  orderId?: string;
  orderNo?: string;
  [key: string]: unknown;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Remove properties whose value is undefined, null, or blank string.
 * Backend rejects payloads containing empty optional values.
 */
function stripEmptyValues(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && value.trim() === "")
      ) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

/**
 * Create a new purchase order
 * Returns the order ID and order number. API returns document number as "No".
 */
export async function createPurchaseOrder(
  orderData: PurchaseOrderData,
): Promise<CreatePurchaseOrderResponse> {
  try {
    const endpoint = `/API_PostPurchase?company='${encodeURIComponent(COMPANY)}'`;

    const payload: Record<string, unknown> = {
      PO_Type: orderData.poType,
      Buy_from_Vendor_No: orderData.vendorNo,
      Posting_Date: orderData.postingDate,
      Order_Date: orderData.orderDate,
      Document_Date: orderData.documentDate,
      Purchaser_Code: orderData.purchasePersonCode,
      Due_Date_calculation: orderData.dueDateCalculation,
      Brokerage_Code: orderData.brokerNo,
      Brokerage_Rate:
        orderData.brokerageRate === "" ||
        orderData.brokerageRate === null ||
        orderData.brokerageRate === undefined
          ? 0
          : Number(orderData.brokerageRate),
      Rate_Basis: orderData.rateBasis,
      QCType: orderData.qcType,
      Terms_Code: orderData.termCode,
      Mandi_Name: orderData.mandiName,
      Payment_Terms_Code: orderData.paymentTermCode,
      Location_Code: orderData.locationCode || orderData.loc,
      Creditors_Type: orderData.creditorType,
      Shortcut_Dimension_3_Code: orderData.loc,
      Responsibility_Center: orderData.lob,
      Shortcut_Dimension_1_Code: orderData.lob || "",
      Shortcut_Dimension_2_Code: orderData.branch || "",
      Order_Address_Code: orderData.orderAddressCode,
    };

    // Remove empty/null/undefined/blank fields before sending to backend
    const filteredPayload = stripEmptyValues(payload);

    console.log("[PO Create] Endpoint:", endpoint);
    console.log(
      "[PO Create] Payload:",
      JSON.stringify(filteredPayload, null, 2),
    );

    const response = await apiPost<CreatePurchaseOrderApiResponse>(
      endpoint,
      filteredPayload,
    );

    if (!response) {
      return { orderId: "", orderNo: "" };
    }

    // API may return document number under different key names
    const orderNo =
      response.No ??
      response.PO_No ??
      response.Document_No ??
      response.docNo ??
      response.orderNo ??
      "";
    const orderId = response.orderId ?? orderNo;

    return { orderId, orderNo };
  } catch (error) {
    console.error(
      "Error creating purchase order:",
      JSON.stringify(error, null, 2),
    );
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
