export type PurchaseDocumentType =
  | "order"
  | "invoice"
  | "return-order"
  | "credit-memo";

export type PurchaseDocumentFormType = "purchase-document";

export type PurchaseDocumentStatusTab =
  | "Open"
  | "Pending Approval"
  | "Released"
  | "";

export interface InvoiceTypeOption {
  value: string;
  label: string;
}

const STANDARD_INVOICE_TYPE_OPTIONS: InvoiceTypeOption[] = [
  { value: "Bill of supply", label: "Bill of supply" },
  { value: "Export", label: "Export" },
  { value: "Supplementary", label: "Supplementary" },
  { value: "Debit Note", label: "Debit Note" },
  { value: "Non-GST", label: "Non-GST" },
  { value: "Taxable", label: "Taxable" },
];

const INVOICE_INVOICE_TYPE_OPTIONS: InvoiceTypeOption[] = [
  { value: "Self Invoice", label: "Self Invoice" },
  { value: "Debit Note", label: "Debit Note" },
  { value: "Supplementary", label: "Supplementary" },
  { value: "Non-GST", label: "Non-GST" },
];

export interface PurchaseDocumentCapabilities {
  supportsPoType: boolean;
  supportsServiceType: boolean;
  supportsInvoiceType: boolean;
  invoiceTypeOptions: InvoiceTypeOption[];
  supportsVendorInvoiceNo: boolean;
  supportsVendorCrMemoNo: boolean;
  supportsVendorAuthorizationNo: boolean;
  supportsAppliesToFields: boolean;
  supportsOrderDate: boolean;
  supportsAdvancedOperations: boolean;
  supportsQcType: boolean;
  supportsRateBasis: boolean;
  supportsGetPostedLine: boolean;
}

export interface PurchaseDocumentConfig {
  type: PurchaseDocumentType;
  formType: PurchaseDocumentFormType;
  listTitle: string;
  listDescription: string;
  createButtonLabel: string;
  createTabTitle: string;
  detailTitlePrefix: string;
  supportsPoTypeFilter: boolean;
  capabilities: PurchaseDocumentCapabilities;
}

const PURCHASE_DOCUMENT_CONFIG: Record<
  PurchaseDocumentType,
  PurchaseDocumentConfig
> = {
  order: {
    type: "order",
    formType: "purchase-document",
    listTitle: "Purchase Orders",
    listDescription: "Manage and track purchase orders",
    createButtonLabel: "Place Order",
    createTabTitle: "New Order",
    detailTitlePrefix: "Order",
    supportsPoTypeFilter: true,
    capabilities: {
      supportsPoType: true,
      supportsServiceType: true,
      supportsInvoiceType: false,
      invoiceTypeOptions: STANDARD_INVOICE_TYPE_OPTIONS,
      supportsVendorInvoiceNo: true,
      supportsVendorCrMemoNo: false,
      supportsVendorAuthorizationNo: false,
      supportsAppliesToFields: true,
      supportsOrderDate: true,
      supportsAdvancedOperations: true,
      supportsQcType: true,
      supportsRateBasis: true,
      supportsGetPostedLine: false,
    },
  },
  invoice: {
    type: "invoice",
    formType: "purchase-document",
    listTitle: "Purchase Invoices",
    listDescription: "Manage and track purchase invoices",
    createButtonLabel: "New Invoice",
    createTabTitle: "New Invoice",
    detailTitlePrefix: "Invoice",
    supportsPoTypeFilter: false,
    capabilities: {
      supportsPoType: false,
      supportsServiceType: false,
      supportsInvoiceType: false,
      invoiceTypeOptions: INVOICE_INVOICE_TYPE_OPTIONS,
      supportsVendorInvoiceNo: true,
      supportsVendorCrMemoNo: false,
      supportsVendorAuthorizationNo: false,
      supportsAppliesToFields: true,
      supportsOrderDate: false,
      supportsAdvancedOperations: false,
      supportsQcType: false,
      supportsRateBasis: false,
      supportsGetPostedLine: true,
    },
  },
  "return-order": {
    type: "return-order",
    formType: "purchase-document",
    listTitle: "Purchase Return Orders",
    listDescription: "Manage and track purchase return orders",
    createButtonLabel: "New Return Order",
    createTabTitle: "New Return Order",
    detailTitlePrefix: "Return Order",
    supportsPoTypeFilter: false,
    capabilities: {
      supportsPoType: false,
      supportsServiceType: false,
      supportsInvoiceType: false,
      invoiceTypeOptions: [],
      supportsVendorInvoiceNo: false,
      supportsVendorCrMemoNo: true,
      supportsVendorAuthorizationNo: true,
      supportsAppliesToFields: true,
      supportsOrderDate: false,
      supportsAdvancedOperations: false,
      supportsQcType: false,
      supportsRateBasis: true,
      supportsGetPostedLine: false,
    },
  },
  "credit-memo": {
    type: "credit-memo",
    formType: "purchase-document",
    listTitle: "Purchase Credit Memos",
    listDescription: "Manage and track credit memos",
    createButtonLabel: "New Credit Memo",
    createTabTitle: "New Credit Memo",
    detailTitlePrefix: "Credit Memo",
    supportsPoTypeFilter: false,
    capabilities: {
      supportsPoType: false,
      supportsServiceType: false,
      supportsInvoiceType: true,
      invoiceTypeOptions: STANDARD_INVOICE_TYPE_OPTIONS,
      supportsVendorInvoiceNo: false,
      supportsVendorCrMemoNo: true,
      supportsVendorAuthorizationNo: false,
      supportsAppliesToFields: true,
      supportsOrderDate: false,
      supportsAdvancedOperations: false,
      supportsQcType: true,
      supportsRateBasis: true,
      supportsGetPostedLine: true,
    },
  },
};

export function getPurchaseDocumentConfig(
  type: PurchaseDocumentType,
): PurchaseDocumentConfig {
  return PURCHASE_DOCUMENT_CONFIG[type];
}

export function getPurchaseDocumentCapabilities(
  type: PurchaseDocumentType,
): PurchaseDocumentCapabilities {
  return PURCHASE_DOCUMENT_CONFIG[type].capabilities;
}
