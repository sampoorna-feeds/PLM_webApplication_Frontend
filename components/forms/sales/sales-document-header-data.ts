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
  gstRegistrationNo?: string;
  panNo?: string;
  copyFromDocType?: string;
  copyFromDocNo?: string;
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
}

export function buildSalesCommonHeaderData(
  formData: SalesDocumentHeaderFormState,
): SalesDocumentHeaderData {
  return {
    customerNo: formData.customerNo,
    customerName: formData.customerName,
    shipToCode: formData.shipToCode || "",
    salesPersonCode: formData.salesPersonCode || "",
    locationCode: formData.locationCode || "",
    postingDate: formData.postingDate,
    documentDate: formData.documentDate,
    orderDate: formData.orderDate || formData.postingDate,
    externalDocumentNo: formData.externalDocumentNo || "",
    invoiceType: formData.invoiceType || "Bill of Supply",
    lob: formData.lob || "",
    branch: formData.branch || "",
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
    Location_Code: formData.locationCode || "",
    Posting_Date: formData.postingDate,
    Document_Date: formData.documentDate,
    External_Document_No: formData.externalDocumentNo || "",
    Invoice_Type: formData.invoiceType || "",
    Shortcut_Dimension_1_Code: formData.lob || "",
    Shortcut_Dimension_2_Code: formData.branch || "",
  };

  if (supportsOrderDate) {
    payload.Order_Date = formData.orderDate || formData.postingDate;
  }

  return payload;
}

export interface SalesPostDetails {
  transporterCode: string;
  transporterName: string;
  vehicleNumber: string;
  driverPhone: string;
  lrRrNumber: string;
  lrRrDate: string;
  postingDate: string;
  externalDocumentNo: string;
  lineNarration: string;
  distanceKm: string;
  grossWeight: string;
  tareWeight: string;
  freightValue: string;
}

/**
 * Builds a minimal PATCH payload for the posting dialog by comparing current 
 * post details against the original document header.
 */
export function buildSalesPostPatchPayload(
  original: Record<string, any> | null,
  current: SalesPostDetails,
  isCreditOrReturn: boolean,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (!original) return patch;

  const compareString = (bcField: string, val: string) => {
    const orig = (original[bcField] as string) || "";
    if (val.trim() !== orig.trim()) {
      patch[bcField] = val.trim();
    }
  };

  const compareNumber = (bcField: string, val: string) => {
    const orig = Number(original[bcField]) || 0;
    const cur = Number(val) || 0;
    if (cur !== orig) {
      patch[bcField] = cur;
    }
  };

  const compareDate = (bcField: string, val: string) => {
    const origRaw = original[bcField] as string | undefined;
    const orig = origRaw?.split("T")[0] || "";
    const cur = val || "";
    if (cur !== orig && cur !== "") {
      patch[bcField] = cur;
    }
  };

  compareString("Vehicle_No", current.vehicleNumber);
  compareDate("Posting_Date", current.postingDate);
  compareString("External_Document_No", current.externalDocumentNo);

  if (isCreditOrReturn) {
    compareString("Line_Narration", current.lineNarration);
  }

  // Fields to remove for Credit Memo / Return Order
  if (!isCreditOrReturn) {
    compareString("LR_RR_No", current.lrRrNumber);
    compareDate("LR_RR_Date", current.lrRrDate);
    compareNumber("Distance_km", current.distanceKm);
    compareString("Driver_Mobile_No", current.driverPhone);
    compareNumber("Freight_Value", current.freightValue);
    compareNumber("Gross_Weight", current.grossWeight);
    compareNumber("Tier_Weight", current.tareWeight);

    // Transporter logic (only for non-credit/return)
    const origTransCode = (original.Transporter_Code as string) || "";
    const origTransName = (original.Transporter_Name as string) || "";

    if (current.transporterCode) {
      if (current.transporterCode !== origTransCode) {
        patch.Transporter_Code = current.transporterCode;
        patch.Transporter_Name = "";
      }
    } else if (current.transporterName) {
      if (current.transporterName !== origTransName || origTransCode !== "") {
        patch.Transporter_Code = "";
        patch.Transporter_Name = current.transporterName;
      }
    } else if (origTransCode !== "" || origTransName !== "") {
      patch.Transporter_Code = "";
      patch.Transporter_Name = "";
    }
  }

  return patch;
}
