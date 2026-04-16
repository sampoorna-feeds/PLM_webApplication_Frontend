/**
 * Builds the common header data payload sent to the API when creating or
 * updating a sales document header.  All four document types share these
 * fields; type-specific fields are handled in the per-document config inside
 * sales-create-document-form.tsx.
 */

export interface SalesDocumentHeaderFormState {
  customerNo: string;
  customerName?: string;
  customerPriceGroup?: string;
  shipToCode: string;
  salesPersonCode: string;
  salesPersonName?: string;
  locationCode: string;
  postingDate: string;
  documentDate: string;
  orderDate: string;
  externalDocumentNo: string;
  invoiceType: string;
  lob: string;
  branch: string;
  loc: string;
}

export interface SalesDocumentHeaderData {
  customerNo: string;
  customerName?: string;
  shipToCode?: string;
  salesPersonCode?: string;
  locationCode?: string;
  postingDate: string;
  documentDate: string;
  orderDate?: string;
  externalDocumentNo?: string;
  invoiceType?: string;
  lob?: string;
  branch?: string;
  loc?: string;
}

export function buildSalesCommonHeaderData(
  formData: SalesDocumentHeaderFormState,
): SalesDocumentHeaderData {
  return {
    customerNo: formData.customerNo,
    customerName: formData.customerName,
    shipToCode: formData.shipToCode || "",
    salesPersonCode: formData.salesPersonCode || "",
    locationCode: formData.locationCode || formData.loc || "",
    postingDate: formData.postingDate,
    documentDate: formData.documentDate,
    orderDate: formData.orderDate || formData.postingDate,
    externalDocumentNo: formData.externalDocumentNo || "",
    invoiceType: formData.invoiceType || "Bill of supply",
    lob: formData.lob || "",
    branch: formData.branch || "",
    loc: formData.loc || "",
  };
}

/** Builds a PATCH payload from form state — only includes non-empty values. */
export function buildSalesHeaderPatchPayload(
  formData: SalesDocumentHeaderFormState,
  supportsOrderDate: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    Ship_to_Code: formData.shipToCode || "",
    Salesperson_Code: formData.salesPersonCode || "",
    Location_Code: formData.locationCode || formData.loc || "",
    Posting_Date: formData.postingDate,
    Document_Date: formData.documentDate,
    External_Document_No: formData.externalDocumentNo || "",
    Invoice_Type: formData.invoiceType || "",
    Shortcut_Dimension_1_Code: formData.lob || "",
    Shortcut_Dimension_2_Code: formData.branch || "",
    Shortcut_Dimension_3_Code: formData.loc || "",
  };

  if (supportsOrderDate) {
    payload.Order_Date = formData.orderDate || formData.postingDate;
  }

  return payload;
}
