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
  poExpirationDate?: string;
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
  includeQcType?: boolean;
  /** Whether to include Rate_Basis. Present in Invoice and Order, not in Return Order or Credit Memo. */
  includeRateBasis?: boolean;
  /** Whether to include Terms_Code. Present in Order only. */
  includeTermsCode?: boolean;
  /** Whether to include Due_Date_calculation. Present in Invoice, Order, Credit Memo. Not in Return Order. */
  includeDueDateCalculation?: boolean;
  /** Whether to include Due_Date. Present in Invoice, Order, Credit Memo. Not in Return Order. */
  includeDueDate?: boolean;
  /** Whether to include PO_Expiration_Date. Order only. */
  includePoExpirationDate?: boolean;
  stripEmpty?: boolean;
  requiredFields?: RequiredPurchaseHeaderField[];
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
        !(typeof value === "string" && value.trim() === "") &&
        !(typeof value === "number" && value === 0)
      ) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

/** For PATCH requests: strips only undefined/null, preserving empty strings so cleared fields are sent to the API. */
export function stripNullish(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null) {
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
  // Base fields present in all 4 document types
  const payload: Record<string, unknown> = {
    Buy_from_Vendor_No: source.vendorNo,
    Posting_Date: source.postingDate,
    Document_Date: source.documentDate,
    Purchaser_Code: source.purchasePersonCode,
    Brokerage_Code: source.brokerNo,
    Mandi_Name: source.mandiName,
    Payment_Terms_Code: source.paymentTermCode,
    Location_Code: source.locationCode || "",
    Creditors_Type: source.creditorType,
    Responsibility_Center: source.lob,
    Shortcut_Dimension_1_Code: source.lob || "",
    Shortcut_Dimension_2_Code: source.branch || "",
    Shortcut_Dimension_3_Code: source.locationCode || "",
    Order_Address_Code: source.orderAddressCode,
  };

  // Invoice + Order + Credit Memo only (not Return Order)
  if (options.includeDueDateCalculation) {
    payload.Due_Date_calculation = source.dueDateCalculation;
  }

  // Invoice + Order + Credit Memo only (not Return Order)
  if (options.includeDueDate) {
    payload.Due_Date = source.dueDate;
  }

  // Invoice + Order only (not Return Order or Credit Memo)
  if (options.includeRateBasis) {
    payload.Rate_Basis = source.rateBasis;
  }

  // Order only
  if (options.includeTermsCode) {
    payload.Terms_Code = source.termCode;
  }

  // Only include Brokerage_Rate when it is a meaningful non-zero value
  const rawRate = source.brokerageRate;
  if (rawRate !== "" && rawRate !== undefined && rawRate !== null) {
    const numRate = Number(rawRate);
    if (Number.isFinite(numRate) && numRate !== 0) {
      payload.Brokerage_Rate = numRate;
    }
  }

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

  if (options.includePoExpirationDate) {
    payload.PO_Expiration_Date = source.poExpirationDate || "";
  }

  if (options.includeQcType) {
    payload.QCType = normalizeQcType(source.qcType);
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
    if (options.stripEmpty) {
      // POST: only include if a doc no is specified (avoid sending empty applies-to)
      if (source.appliesToDocNo) {
        payload.Applies_to_Doc_Type = source.appliesToDocType || "Invoice";
        payload.Applies_to_Doc_No = source.appliesToDocNo;
      }
    } else {
      // PATCH: always include so the user can clear the value
      payload.Applies_to_Doc_Type = source.appliesToDocType || "";
      payload.Applies_to_Doc_No = source.appliesToDocNo || "";
    }
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
      const value = getRequiredFieldValue(source, field);
      if (value !== "") {
        result[field] = value;
      }
    }
  }

  return result;
}
