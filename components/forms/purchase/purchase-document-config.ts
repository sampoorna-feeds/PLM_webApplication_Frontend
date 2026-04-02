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

export interface PurchaseDocumentCapabilities {
  supportsPoType: boolean;
  supportsServiceType: boolean;
  supportsInvoiceType: boolean;
  supportsVendorInvoiceNo: boolean;
  supportsVendorCrMemoNo: boolean;
  supportsVendorAuthorizationNo: boolean;
  supportsAppliesToFields: boolean;
  supportsOrderDate: boolean;
  supportsAdvancedOperations: boolean;
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
      supportsInvoiceType: true,
      supportsVendorInvoiceNo: true,
      supportsVendorCrMemoNo: false,
      supportsVendorAuthorizationNo: false,
      supportsAppliesToFields: false,
      supportsOrderDate: true,
      supportsAdvancedOperations: true,
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
      supportsVendorInvoiceNo: true,
      supportsVendorCrMemoNo: false,
      supportsVendorAuthorizationNo: false,
      supportsAppliesToFields: false,
      supportsOrderDate: false,
      supportsAdvancedOperations: false,
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
      supportsVendorInvoiceNo: false,
      supportsVendorCrMemoNo: true,
      supportsVendorAuthorizationNo: true,
      supportsAppliesToFields: true,
      supportsOrderDate: false,
      supportsAdvancedOperations: false,
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
      supportsVendorInvoiceNo: false,
      supportsVendorCrMemoNo: true,
      supportsVendorAuthorizationNo: false,
      supportsAppliesToFields: true,
      supportsOrderDate: false,
      supportsAdvancedOperations: false,
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
