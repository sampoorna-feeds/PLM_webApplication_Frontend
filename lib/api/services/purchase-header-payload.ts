/**
 * Shared purchase header payload mapping helpers used by services and forms.
 */

export type PurchaseDocumentHeaderType =
  | "Order"
  | "Invoice"
  | "Return Order"
  | "Credit Memo";

export type RequiredPurchaseHeaderField =
  | "Vendor_Invoice_No"
  | "Vendor_Cr_Memo_No"
  | "Vendor_Authorization_No"
  | "Applies_to_Doc_Type"
  | "Applies_to_Doc_No";

export interface PurchaseHeaderPayloadSource {
  vendorNo?: string;
  postingDate?: string;
  documentDate?: string;
  orderDate?: string;
  purchasePersonCode?: string;
  dueDateCalculation?: string;
  brokerNo?: string;
  brokerageRate?: string | number | null;
  rateBasis?: string;
  qcType?: string;
  termCode?: string;
  mandiName?: string;
  paymentTermCode?: string;
  locationCode?: string;
  creditorType?: string;
  loc?: string;
  lob?: string;
  branch?: string;
  orderAddressCode?: string;
  orderAddressState?: string;
  dueDate?: string;
  poType?: string;
  serviceType?: string;
  invoiceType?: string;
  vendorInvoiceNo?: string;
  vendorCrMemoNo?: string;
  vendorAuthorizationNo?: string;
  appliesToDocType?: string;
  appliesToDocNo?: string;
}

export interface BuildPurchaseHeaderPayloadOptions {
  documentType?: PurchaseDocumentHeaderType;
  includePoType?: boolean;
  includeServiceType?: boolean;
  includeOrderDate?: boolean;
  includeInvoiceType?: boolean;
  includeVendorInvoiceNo?: boolean;
  includeVendorCrMemoNo?: boolean;
  includeVendorAuthorizationNo?: boolean;
  includeAppliesToFields?: boolean;
  primaryVendorRefField?: "vendorInvoiceNo" | "vendorCrMemoNo";
  includeOrderAddressState?: boolean;
  stripEmpty?: boolean;
  requiredFields?: RequiredPurchaseHeaderField[];
}

function toNumberOrZero(value: string | number | undefined | null): number {
  if (value === "" || value === undefined || value === null) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQcType(value: string | undefined): string | undefined {
  if (value === "_none") {
    return "";
  }

  return value;
}

function getRequiredFieldValue(
  source: PurchaseHeaderPayloadSource,
  field: RequiredPurchaseHeaderField,
): string {
  if (field === "Vendor_Invoice_No") {
    return source.vendorInvoiceNo || "";
  }

  if (field === "Vendor_Cr_Memo_No") {
    return source.vendorCrMemoNo || "";
  }

  if (field === "Vendor_Authorization_No") {
    return source.vendorAuthorizationNo || "";
  }

  if (field === "Applies_to_Doc_Type") {
    return source.appliesToDocType || "Invoice";
  }

  return source.appliesToDocNo || "";
}

export function stripEmptyValues(
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

export function buildPurchaseHeaderPayload(
  source: PurchaseHeaderPayloadSource,
  options: BuildPurchaseHeaderPayloadOptions = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    Buy_from_Vendor_No: source.vendorNo,
    Posting_Date: source.postingDate,
    Document_Date: source.documentDate,
    Purchaser_Code: source.purchasePersonCode,
    Due_Date_calculation: source.dueDateCalculation,
    Brokerage_Code: source.brokerNo,
    Brokerage_Rate: toNumberOrZero(source.brokerageRate),
    Rate_Basis: source.rateBasis,
    QCType: normalizeQcType(source.qcType),
    Terms_Code: source.termCode,
    Mandi_Name: source.mandiName,
    Payment_Terms_Code: source.paymentTermCode,
    Location_Code: source.locationCode || source.loc,
    Creditors_Type: source.creditorType,
    Shortcut_Dimension_3_Code: source.loc,
    Responsibility_Center: source.lob,
    Shortcut_Dimension_1_Code: source.lob || "",
    Shortcut_Dimension_2_Code: source.branch || "",
    Order_Address_Code: source.orderAddressCode,
    Due_Date: source.dueDate,
  };

  if (options.documentType) {
    payload.Document_Type = options.documentType;
  }

  if (options.includePoType) {
    payload.PO_Type = source.poType;
  }

  if (options.includeServiceType) {
    payload.Service_Type = source.serviceType;
  }

  if (options.includeOrderDate) {
    payload.Order_Date = source.orderDate;
  }

  if (options.includeInvoiceType) {
    payload.Invoice_Type = source.invoiceType;
  }

  if (options.includeVendorInvoiceNo) {
    payload.Vendor_Invoice_No = source.vendorInvoiceNo || "";
  }

  if (options.includeVendorCrMemoNo) {
    payload.Vendor_Cr_Memo_No = source.vendorCrMemoNo || "";
  }

  if (options.includeVendorAuthorizationNo) {
    payload.Vendor_Authorization_No = source.vendorAuthorizationNo || "";
  }

  if (options.includeAppliesToFields) {
    payload.Applies_to_Doc_Type = source.appliesToDocType || "Invoice";
    payload.Applies_to_Doc_No = source.appliesToDocNo || "";
  }

  if (options.primaryVendorRefField === "vendorInvoiceNo") {
    payload.Vendor_Invoice_No = source.vendorInvoiceNo || "";
  }

  if (options.primaryVendorRefField === "vendorCrMemoNo") {
    payload.Vendor_Cr_Memo_No = source.vendorCrMemoNo || "";
  }

  if (options.includeOrderAddressState) {
    payload.GST_Order_Address_State = source.orderAddressState;
  }

  const result = options.stripEmpty ? stripEmptyValues(payload) : payload;

  if (options.requiredFields && options.requiredFields.length > 0) {
    for (const field of options.requiredFields) {
      result[field] = getRequiredFieldValue(source, field);
    }
  }

  return result;
}
