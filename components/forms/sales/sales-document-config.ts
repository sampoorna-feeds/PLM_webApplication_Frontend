export type SalesDocumentType =
  | "order"
  | "invoice"
  | "return-order"
  | "credit-memo";

export type SalesDocumentFormType = "sales-document";

export type SalesDocumentStatusTab =
  | "Open"
  | "Pending Approval"
  | "Released"
  | "";

export interface InvoiceTypeOption {
  value: string;
  label: string;
}

const STANDARD_INVOICE_TYPE_OPTIONS: InvoiceTypeOption[] = [
  { value: "", label: "None" },
  { value: "Bill of Supply", label: "Bill of Supply" },
  { value: "Export", label: "Export" },
  { value: "Supplementary", label: "Supplementary" },
  { value: "Debit Note", label: "Debit Note" },
  { value: "Non-GST", label: "Non-GST" },
  { value: "Taxable", label: "Taxable" },
];

export interface SalesDocumentCapabilities {
  supportsOrderDate: boolean;
  supportsInvoiceType: boolean;
  invoiceTypeOptions: InvoiceTypeOption[];
  /** Whether Transporter / Post Details dialog applies (order only) */
  supportsTransporter: boolean;
  /** Whether Delivery Challan / shipment PDF applies (order only) */
  supportsDeliveryReport: boolean;
  /** Whether a Post action is available */
  supportsPost: boolean;
  /** Post option labels shown in the post dialog */
  postOptions: { value: "1" | "2" | "3"; label: string }[];
  /** Whether the Copy Document action is available (invoice, credit-memo, return-order) */
  supportsCopyDocument: boolean;
  /** Whether Get Posted Line is available (invoice + credit-memo) */
  supportsGetPostedLine: boolean;
  /** Whether Get Posted Line To Reverse is available (return-order + credit-memo) */
  supportsGetPostedLineToReverse: boolean;
  /**
   * When true (Invoice, Credit Memo), the post details dialog shows every payload
   * field in a single unified form — no ship-specific required validation, all
   * transporter / weight fields visible regardless of post mode.
   */
  supportsUnifiedPostForm: boolean;
}

export interface SalesDocumentConfig {
  type: SalesDocumentType;
  formType: SalesDocumentFormType;
  listTitle: string;
  listDescription: string;
  createButtonLabel: string;
  createTabTitle: string;
  createHeaderButtonLabel: string;
  detailTitlePrefix: string;
  documentLabel: string;
  capabilities: SalesDocumentCapabilities;
}

const SALES_DOCUMENT_CONFIG: Record<SalesDocumentType, SalesDocumentConfig> = {
  order: {
    type: "order",
    formType: "sales-document",
    listTitle: "Sales Orders",
    listDescription: "Manage and track sales orders",
    createButtonLabel: "Place Order",
    createTabTitle: "New Order",
    createHeaderButtonLabel: "Create Sales Order",
    detailTitlePrefix: "Order",
    documentLabel: "Order",
    capabilities: {
      supportsOrderDate: true,
      supportsInvoiceType: true,
      invoiceTypeOptions: STANDARD_INVOICE_TYPE_OPTIONS,
      supportsTransporter: true,
      supportsDeliveryReport: true,
      supportsPost: true,
      postOptions: [
        { value: "1", label: "Ship" },
        { value: "2", label: "Invoice" },
        { value: "3", label: "Ship & Invoice" },
      ],
      supportsCopyDocument: false,
      supportsGetPostedLine: false,
      supportsGetPostedLineToReverse: false,
      supportsUnifiedPostForm: false,
    },
  },
  invoice: {
    type: "invoice",
    formType: "sales-document",
    listTitle: "Sales Invoices",
    listDescription: "Manage and track sales invoices",
    createButtonLabel: "New Invoice",
    createTabTitle: "New Invoice",
    createHeaderButtonLabel: "Create Sales Invoice",
    detailTitlePrefix: "Invoice",
    documentLabel: "Invoice",
    capabilities: {
      supportsOrderDate: false,
      supportsInvoiceType: true,
      invoiceTypeOptions: STANDARD_INVOICE_TYPE_OPTIONS,
      supportsTransporter: true,
      supportsDeliveryReport: false,
      supportsPost: true,
      postOptions: [{ value: "3", label: "Ship & Invoice" }],
      supportsCopyDocument: true,
      supportsGetPostedLine: true,
      supportsGetPostedLineToReverse: false,
      supportsUnifiedPostForm: true,
    },
  },
  "return-order": {
    type: "return-order",
    formType: "sales-document",
    listTitle: "Sales Return Orders",
    listDescription: "Manage and track sales return orders",
    createButtonLabel: "New Return Order",
    createTabTitle: "New Return Order",
    createHeaderButtonLabel: "Create Return Order",
    detailTitlePrefix: "Return Order",
    documentLabel: "Return Order",
    capabilities: {
      supportsOrderDate: false,
      supportsInvoiceType: true,
      invoiceTypeOptions: STANDARD_INVOICE_TYPE_OPTIONS,
      supportsTransporter: false,
      supportsDeliveryReport: false,
      supportsPost: true,
      postOptions: [
        { value: "1", label: "Receive" },
        { value: "2", label: "Invoice" },
        { value: "3", label: "Receive and Invoice" },
      ],
      supportsCopyDocument: true,
      supportsGetPostedLine: false,
      supportsGetPostedLineToReverse: true,
      supportsUnifiedPostForm: false,
    },
  },
  "credit-memo": {
    type: "credit-memo",
    formType: "sales-document",
    listTitle: "Sales Credit Memos",
    listDescription: "Manage and track sales credit memos",
    createButtonLabel: "New Credit Memo",
    createTabTitle: "New Credit Memo",
    createHeaderButtonLabel: "Create Credit Memo",
    detailTitlePrefix: "Credit Memo",
    documentLabel: "Credit Memo",
    capabilities: {
      supportsOrderDate: false,
      supportsInvoiceType: true,
      invoiceTypeOptions: STANDARD_INVOICE_TYPE_OPTIONS,
      supportsTransporter: false,
      supportsDeliveryReport: false,
      supportsPost: true,
      postOptions: [{ value: "2", label: "Credit Memo" }],
      supportsCopyDocument: true,
      supportsGetPostedLine: true,
      supportsGetPostedLineToReverse: true,
      supportsUnifiedPostForm: true,
    },
  },
};

export function getSalesDocumentConfig(
  type: SalesDocumentType,
): SalesDocumentConfig {
  return SALES_DOCUMENT_CONFIG[type];
}

export function getSalesDocumentCapabilities(
  type: SalesDocumentType,
): SalesDocumentCapabilities {
  return SALES_DOCUMENT_CONFIG[type].capabilities;
}
