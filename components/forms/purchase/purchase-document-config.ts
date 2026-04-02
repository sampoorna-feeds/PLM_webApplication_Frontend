export type PurchaseDocumentType =
  | "order"
  | "invoice"
  | "return-order"
  | "credit-memo";

export type PurchaseDocumentFormType =
  | "purchase-order"
  | "purchase-invoice"
  | "purchase-return-order"
  | "purchase-credit-memo";

export type PurchaseDocumentStatusTab =
  | "Open"
  | "Pending Approval"
  | "Released"
  | "";

export interface PurchaseDocumentConfig {
  type: PurchaseDocumentType;
  formType: PurchaseDocumentFormType;
  listTitle: string;
  listDescription: string;
  createButtonLabel: string;
  createTabTitle: string;
  detailTitlePrefix: string;
  supportsPoTypeFilter: boolean;
}

const PURCHASE_DOCUMENT_CONFIG: Record<PurchaseDocumentType, PurchaseDocumentConfig> = {
  order: {
    type: "order",
    formType: "purchase-order",
    listTitle: "Purchase Orders",
    listDescription: "Manage and track purchase orders",
    createButtonLabel: "Place Order",
    createTabTitle: "New Order",
    detailTitlePrefix: "Order",
    supportsPoTypeFilter: true,
  },
  invoice: {
    type: "invoice",
    formType: "purchase-invoice",
    listTitle: "Purchase Invoices",
    listDescription: "Manage and track purchase invoices",
    createButtonLabel: "New Invoice",
    createTabTitle: "New Invoice",
    detailTitlePrefix: "Invoice",
    supportsPoTypeFilter: false,
  },
  "return-order": {
    type: "return-order",
    formType: "purchase-return-order",
    listTitle: "Purchase Return Orders",
    listDescription: "Manage and track purchase return orders",
    createButtonLabel: "New Return Order",
    createTabTitle: "New Return Order",
    detailTitlePrefix: "Return Order",
    supportsPoTypeFilter: false,
  },
  "credit-memo": {
    type: "credit-memo",
    formType: "purchase-credit-memo",
    listTitle: "Purchase Credit Memos",
    listDescription: "Manage and track credit memos",
    createButtonLabel: "New Credit Memo",
    createTabTitle: "New Credit Memo",
    detailTitlePrefix: "Credit Memo",
    supportsPoTypeFilter: false,
  },
};

export function getPurchaseDocumentConfig(
  type: PurchaseDocumentType,
): PurchaseDocumentConfig {
  return PURCHASE_DOCUMENT_CONFIG[type];
}
