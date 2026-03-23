/**
 * Purchase Order API Service
 * Handles creating purchase orders and adding line items
 */

import { apiPost, apiPatch } from "../client";
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
  orderAddressState?: string;
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
  type: "G/L Account" | "Item" | "Fixed Asset";
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
  faPostingType?: string;
  salvageValue?: number;
  noOfBags?: number;
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
    const endpoint = `/PurchaseOrder?company='${encodeURIComponent(COMPANY)}'`;

    const payload: Record<string, unknown> = {
      Document_Type: "Order",
      PO_Type: orderData.poType,
      Service_Type: orderData.serviceType,
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
      Location_Code: orderData.locationCode,
      Creditors_Type: orderData.creditorType,
      Shortcut_Dimension_3_Code: orderData.loc,
      Responsibility_Center: orderData.lob,
      Shortcut_Dimension_1_Code: orderData.lob || "",
      Shortcut_Dimension_2_Code: orderData.branch || "",
      Order_Address_Code: orderData.orderAddressCode,
      GST_Order_Address_State: orderData.orderAddressState,
      Due_Date: orderData.dueDate,
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
      const payload: Record<string, unknown> = {
        Document_Type: "Order",
        Document_No: documentNo,
        Type: lineItem.type,
        No: lineItem.no,
        Quantity: lineItem.quantity,
        Unit_of_Measure_Code: lineItem.uom || "",
      };

      if (lineItem.unitPrice !== undefined && lineItem.unitPrice !== null) {
        payload.Direct_Unit_Cost = lineItem.unitPrice;
      }
      if (lineItem.discount !== undefined && lineItem.discount !== null) {
        payload.Line_Discount_Percent = lineItem.discount;
      }
      if (lineItem.gstGroupCode) {
        payload.GST_Group_Code = lineItem.gstGroupCode;
      }
      if (lineItem.hsnSacCode) {
        payload.HSN_SAC_Code = lineItem.hsnSacCode;
      }
      if (lineItem.tdsGroupCode) {
        payload.TDS_Group_Code = lineItem.tdsGroupCode;
      }
      if (lineItem.faPostingType) {
        payload.FA_Posting_Type = lineItem.faPostingType;
      }
      if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null) {
        payload.Salvage_Value = lineItem.salvageValue;
      }
      if (lineItem.exempted !== undefined) {
        payload.Exempted = lineItem.exempted;
      }

      await apiPost(endpoint, payload);
    }
  } catch (error) {
    console.error("Error adding purchase order line items:", error);
    throw error as ApiError;
  }
}

/**
 * Add a single line item to an existing purchase order.
 * Returns the line record with the Line_No populated from BC.
 */
export async function addSinglePurchaseOrderLine(
  documentNo: string,
  lineItem: PurchaseOrderLineItem,
  locationCode: string,
): Promise<{ Line_No: number; [key: string]: any }> {
  const endpoint = `/PurchaseLine?company='${encodeURIComponent(COMPANY)}'`;
  const payload: Record<string, unknown> = {
    Document_Type: "Order",
    Document_No: documentNo,
    Type: lineItem.type,
    No: lineItem.no,
    Quantity: lineItem.quantity,
    Unit_of_Measure_Code: lineItem.uom || "",
  };

  if (lineItem.unitPrice !== undefined && lineItem.unitPrice !== null) {
    payload.Direct_Unit_Cost = lineItem.unitPrice;
  }
  if (lineItem.discount !== undefined && lineItem.discount !== null) {
    payload.Line_Discount_Percent = lineItem.discount;
  }
  if (lineItem.gstGroupCode) {
    payload.GST_Group_Code = lineItem.gstGroupCode;
  }
  if (lineItem.hsnSacCode) {
    payload.HSN_SAC_Code = lineItem.hsnSacCode;
  }
  if (lineItem.tdsGroupCode) {
    payload.TDS_Group_Code = lineItem.tdsGroupCode;
  }
  if (lineItem.faPostingType) {
    payload.FA_Posting_Type = lineItem.faPostingType;
  }
  if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null) {
    payload.Salvage_Value = lineItem.salvageValue;
  }
  if (lineItem.exempted !== undefined) {
    payload.Exempted = lineItem.exempted;
  }
  if (lineItem.noOfBags !== undefined && lineItem.noOfBags !== null) {
    payload.No_of_Bags = lineItem.noOfBags;
  }

  try {
    const response = await apiPost<{ Line_No: number; [key: string]: any }>(
      endpoint,
      payload,
    );
    return response;
  } catch (error) {
    console.error("Error adding single purchase order line:", error);
    throw error as ApiError;
  }
}

/**
 * Update a single line item on an existing purchase order.
 */
export async function updateSinglePurchaseOrderLine(
  documentNo: string,
  lineNo: number,
  lineItem: Partial<PurchaseOrderLineItem>,
): Promise<{ Line_No: number; [key: string]: any }> {
  const escapedNo = documentNo.replace(/'/g, "''");
  const endpoint = `/PurchaseLine(Document_Type='Order',Document_No='${encodeURIComponent(escapedNo)}',Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;

  const payload: Record<string, unknown> = {};
  if (lineItem.type !== undefined) payload.Type = lineItem.type;
  if (lineItem.no !== undefined) payload.No = lineItem.no;
  if (lineItem.quantity !== undefined) payload.Quantity = lineItem.quantity;
  if (lineItem.uom !== undefined) payload.Unit_of_Measure_Code = lineItem.uom;
  if (lineItem.unitPrice !== undefined && lineItem.unitPrice !== null)
    payload.Direct_Unit_Cost = lineItem.unitPrice;
  if (lineItem.discount !== undefined && lineItem.discount !== null)
    payload.Line_Discount_Percent = lineItem.discount;
  if (lineItem.gstGroupCode !== undefined)
    payload.GST_Group_Code = lineItem.gstGroupCode;
  if (lineItem.hsnSacCode !== undefined)
    payload.HSN_SAC_Code = lineItem.hsnSacCode;
  if (lineItem.tdsGroupCode !== undefined)
    payload.TDS_Group_Code = lineItem.tdsGroupCode;
  if (lineItem.faPostingType !== undefined)
    payload.FA_Posting_Type = lineItem.faPostingType;
  if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null)
    payload.Salvage_Value = lineItem.salvageValue;
  if (lineItem.exempted !== undefined) payload.Exempted = lineItem.exempted;
  if (lineItem.noOfBags !== undefined && lineItem.noOfBags !== null)
    payload.No_of_Bags = lineItem.noOfBags;

  try {
    const response = await apiPatch<{ Line_No: number; [key: string]: any }>(
      endpoint,
      payload,
    );
    return response;
  } catch (error) {
    console.error("Error updating single purchase order line:", error);
    throw error as ApiError;
  }
}

/**
 * Delete a single line item from an existing purchase order.
 */
export async function deleteSinglePurchaseOrderLine(
  orderNo: string,
  lineNo: number,
): Promise<void> {
  const endpoint = `/API_PurchaseOrderLine?company='${encodeURIComponent(COMPANY)}'`;
  try {
    await apiPost(endpoint, { orderNo, lineNo });
  } catch (error) {
    console.error("Error deleting single purchase order line:", error);
    throw error as ApiError;
  }
}

/**
 * Upload a PDF attachment to an existing purchase order.
 * The file must be base64-encoded.
 */
export async function uploadPurchaseAttachment(
  orderNo: string,
  fileName: string,
  fileBase64: string,
): Promise<void> {
  const endpoint = `/API_InitiateUploadFilePurchase?company='${encodeURIComponent(COMPANY)}'`;
  try {
    await apiPost(endpoint, {
      recNo: orderNo,
      fileName,
      fileEncodedTextDialog: fileBase64,
    });
  } catch (error) {
    console.error("Error uploading purchase attachment:", error);
    throw error as ApiError;
  }
}

/**
 * Add a bardana line for a purchase order line item.
 */
export async function addBardanaLine(
  documentNo: string,
  documentLineNo: number,
  itemNo: string,
  uom: string,
  quantity: number,
): Promise<void> {
  const endpoint = `/QCPurchaseBardanaList?company='${encodeURIComponent(COMPANY)}'`;
  try {
    await apiPost(endpoint, {
      Document_Type: "Order",
      Document_No: documentNo,
      Document_Line_No: documentLineNo,
      Item_No: itemNo,
      UOM: uom,
      Quantity: quantity,
    });
  } catch (error) {
    console.error("Error adding bardana line:", error);
    throw error as ApiError;
  }
}
