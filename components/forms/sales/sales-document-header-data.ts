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
  appliesToDocType?: string;
  appliesToDocNo?: string;
  appliesToID?: string;
  copyFromDocType?: string;
  copyFromDocNo?: string;
  SFPL_User_ID?: string;
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
  Applies_to_Doc_Type?: string;
  Applies_to_Doc_No?: string;
  Applies_to_ID?: string;
  SFPL_User_ID?: string;
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
    Applies_to_Doc_Type: formData.appliesToDocType || "",
    Applies_to_Doc_No: formData.appliesToDocNo || "",
    Applies_to_ID: formData.appliesToID || "",
    SFPL_User_ID: formData.SFPL_User_ID || "",
  };
}

/**
 * Builds a PATCH payload from form state.
 * If 'original' is provided, it returns only the changed fields (diff).
 * Otherwise, it returns the full payload.
 */
export function buildSalesHeaderPatchPayload(
  formData: SalesDocumentHeaderFormState,
  supportsOrderDate: boolean,
  original?: Record<string, any> | null,
): Record<string, unknown> {
  const getFullPayload = () => {
    const invoiceType = (formData.invoiceType || "").trim();
    const finalInvoiceType = invoiceType;

    const payload: Record<string, unknown> = {
      sell_to_Customer_No: formData.customerNo || "",
      ship_to_Code: formData.shipToCode || "",
      salesperson_Code: formData.salesPersonCode || "",
      location_Code: formData.locationCode || "",
      posting_Date: formData.postingDate,
      document_Date: formData.documentDate,
      external_Document_No: formData.externalDocumentNo || "",
      invoice_Type: finalInvoiceType,
      shortcut_Dimension_1_Code: formData.lob || "",
      shortcut_Dimension_2_Code: formData.branch || "",
      shortcut_Dimension_3_Code: formData.locationCode || "",
      responsibility_Center: formData.lob || "",
      applies_to_Doc_Type: formData.appliesToDocType || "",
      applies_to_Doc_No: formData.appliesToDocNo || "",
      applies_to_ID: formData.appliesToID || "",
    };

    if (supportsOrderDate) {
      payload.order_Date = formData.orderDate || formData.postingDate;
    }

    return payload;
  };

  if (!original) {
    return getFullPayload();
  }

  const invoiceType = (formData.invoiceType || "").trim();
  const finalInvoiceType = invoiceType;

  // If customer is changed, send only specific fields to prevent ERP errors
  const oldCustomer = (original.Sell_to_Customer_No as string) || "";
  const newCustomer = formData.customerNo || "";
  if (oldCustomer !== newCustomer) {
    return {
      sell_to_Customer_No: formData.customerNo || "",
      ship_to_Code: formData.shipToCode || "",
      salesperson_Code: formData.salesPersonCode || "",
      location_Code: formData.locationCode || "",
      invoice_Type: finalInvoiceType,
      shortcut_Dimension_1_Code: formData.lob || "",
      shortcut_Dimension_2_Code: formData.branch || "",
      shortcut_Dimension_3_Code: formData.locationCode || "",
      responsibility_Center: formData.lob || "",
    };
  }

  const patch: Record<string, unknown> = {};

  const compareString = (bcField: string, val: string) => {
    let finalVal = val.trim();

    const orig = (original[bcField] as string) || "";
    if (finalVal !== orig.trim()) {
      const payloadField = bcField.charAt(0).toLowerCase() + bcField.slice(1);
      patch[payloadField] = finalVal;
    }
  };

  const compareDate = (bcField: string, val: string) => {
    const origRaw = original[bcField] as string | undefined;
    const orig = origRaw?.split("T")[0] || "";
    const cur = val || "";
    if (cur !== orig && cur !== "") {
      const payloadField = bcField.charAt(0).toLowerCase() + bcField.slice(1);
      patch[payloadField] = cur;
    }
  };

  compareString("Sell_to_Customer_No", formData.customerNo || "");
  compareString("Ship_to_Code", formData.shipToCode || "");
  compareString("Salesperson_Code", formData.salesPersonCode || "");
  compareString("Location_Code", formData.locationCode || "");
  compareDate("Posting_Date", formData.postingDate);
  compareDate("Document_Date", formData.documentDate);
  compareString("External_Document_No", formData.externalDocumentNo || "");
  compareString("Invoice_Type", formData.invoiceType || "");
  compareString("Shortcut_Dimension_1_Code", formData.lob || "");
  compareString("Shortcut_Dimension_2_Code", formData.branch || "");
  compareString("Shortcut_Dimension_3_Code", formData.locationCode || "");
  compareString("Responsibility_Center", formData.lob || "");
  compareString("Applies_to_Doc_Type", formData.appliesToDocType || "");
  compareString("Applies_to_Doc_No", formData.appliesToDocNo || "");
  compareString("Applies_to_ID", formData.appliesToID || "");

  if (supportsOrderDate) {
    compareDate("Order_Date", formData.orderDate || formData.postingDate);
  }

  return patch;
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
      if (
        current.transporterCode !== origTransCode ||
        current.transporterName !== origTransName
      ) {
        patch.Transporter_Code = current.transporterCode;
        patch.Transporter_Name = current.transporterName;
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
