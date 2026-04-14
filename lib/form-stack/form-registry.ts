/**
 * Form Registry
 * Maps form type identifiers to React components
 */

import type { FormComponent } from "./types";

// Lazy imports to avoid circular dependencies
let SalesOrderForm: FormComponent | null = null;
let SalesOrderDetailForm: FormComponent | null = null;
let SalesOrderEditForm: FormComponent | null = null;
let SalesInvoiceForm: FormComponent | null = null;
let SalesInvoiceDetailForm: FormComponent | null = null;
let SalesReturnOrderForm: FormComponent | null = null;
let SalesReturnOrderDetailForm: FormComponent | null = null;
let SalesCreditMemoForm: FormComponent | null = null;
let SalesCreditMemoDetailForm: FormComponent | null = null;
let AddPincodeForm: FormComponent | null = null;
let AddShipToForm: FormComponent | null = null;
let ProductionOrderForm: FormComponent | null = null;
let FinishedProductionOrderDetailForm: FormComponent | null = null;
let ItemSelectorForm: FormComponent | null = null;
let LineItemTabForm: FormComponent | null = null;

let PurchaseDocumentForm: FormComponent | null = null;

let TransferOrderDetailForm: FormComponent | null = null;
let PostedTransferDetailForm: FormComponent | null = null;

/**
 * Form registry mapping form types to components
 */
export const formRegistry: Record<
  string,
  () => Promise<{ default: FormComponent }>
> = {
  "sales-order": async () => {
    if (!SalesOrderForm) {
      const formModule =
        await import("@/components/forms/sales/sales-order-form");
      SalesOrderForm = formModule.SalesOrderForm;
    }
    return { default: SalesOrderForm! };
  },
  "sales-order-detail": async () => {
    if (!SalesOrderDetailForm) {
      const formModule =
        await import("@/components/forms/sales/sales-order-detail-form");
      SalesOrderDetailForm = formModule.SalesOrderDetailForm;
    }
    return { default: SalesOrderDetailForm! };
  },
  "sales-order-edit": async () => {
    if (!SalesOrderEditForm) {
      const formModule =
        await import("@/components/forms/sales/sales-order-edit-form");
      SalesOrderEditForm = formModule.SalesOrderEditForm;
    }
    return { default: SalesOrderEditForm! };
  },
  "sales-invoice": async () => {
    if (!SalesInvoiceForm) {
      const formModule =
        await import("@/components/forms/sales/sales-invoice-form");
      SalesInvoiceForm = formModule.SalesInvoiceForm;
    }
    return { default: SalesInvoiceForm! };
  },
  "sales-invoice-detail": async () => {
    if (!SalesInvoiceDetailForm) {
      const formModule =
        await import("@/components/forms/sales/sales-invoice-detail-form");
      SalesInvoiceDetailForm = formModule.SalesInvoiceDetailForm;
    }
    return { default: SalesInvoiceDetailForm! };
  },
  "sales-return-order": async () => {
    if (!SalesReturnOrderForm) {
      const formModule =
        await import("@/components/forms/sales/sales-return-order-form");
      SalesReturnOrderForm = formModule.SalesReturnOrderForm;
    }
    return { default: SalesReturnOrderForm! };
  },
  "sales-return-order-detail": async () => {
    if (!SalesReturnOrderDetailForm) {
      const formModule =
        await import("@/components/forms/sales/sales-return-order-detail-form");
      SalesReturnOrderDetailForm = formModule.SalesReturnOrderDetailForm;
    }
    return { default: SalesReturnOrderDetailForm! };
  },
  "sales-credit-memo": async () => {
    if (!SalesCreditMemoForm) {
      const formModule =
        await import("@/components/forms/sales/sales-credit-memo-form");
      SalesCreditMemoForm = formModule.SalesCreditMemoForm;
    }
    return { default: SalesCreditMemoForm! };
  },
  "sales-credit-memo-detail": async () => {
    if (!SalesCreditMemoDetailForm) {
      const formModule =
        await import("@/components/forms/sales/sales-credit-memo-detail-form");
      SalesCreditMemoDetailForm = formModule.SalesCreditMemoDetailForm;
    }
    return { default: SalesCreditMemoDetailForm! };
  },
  "add-pincode": async () => {
    if (!AddPincodeForm) {
      const formModule =
        await import("@/components/forms/nested/add-pincode-form");
      AddPincodeForm = formModule.AddPincodeForm;
    }
    return { default: AddPincodeForm! };
  },
  "add-shipto": async () => {
    if (!AddShipToForm) {
      const formModule =
        await import("@/components/forms/sales/add-shipto-form");
      AddShipToForm = formModule.AddShipToForm;
    }
    return { default: AddShipToForm! };
  },
  "production-order": async () => {
    if (!ProductionOrderForm) {
      const formModule =
        await import("@/components/forms/production-orders/production-order-form");
      ProductionOrderForm = formModule.ProductionOrderForm;
    }
    return { default: ProductionOrderForm! };
  },
  "finished-production-order-detail": async () => {
    if (!FinishedProductionOrderDetailForm) {
      const formModule =
        await import("@/components/forms/production-orders/finished-production-order-detail-form");
      FinishedProductionOrderDetailForm =
        formModule.FinishedProductionOrderDetailForm;
    }
    return { default: FinishedProductionOrderDetailForm! };
  },
  "item-selector": async () => {
    if (!ItemSelectorForm) {
      const formModule =
        await import("@/components/forms/sales/item-selector-form");
      ItemSelectorForm = formModule.ItemSelectorForm;
    }
    return { default: ItemSelectorForm! };
  },
  "line-item": async () => {
    if (!LineItemTabForm) {
      const formModule =
        await import("@/components/forms/sales/line-item-tab-form");
      LineItemTabForm = formModule.LineItemTabForm;
    }
    return { default: LineItemTabForm! };
  },
  "purchase-document": async () => {
    if (!PurchaseDocumentForm) {
      const formModule =
        await import("@/components/forms/purchase/purchase-document-form");
      PurchaseDocumentForm = formModule.PurchaseDocumentForm;
    }
    return { default: PurchaseDocumentForm! };
  },
  "transfer-order-detail": async () => {
    if (!TransferOrderDetailForm) {
      const formModule =
        await import("@/components/forms/transfer-orders/transfer-order-detail-form");
      TransferOrderDetailForm = formModule.TransferOrderDetailForm;
    }
    return { default: TransferOrderDetailForm! };
  },
  "transfer-order": async () => {
    const formModule =
      await import("@/components/forms/transfer-orders/transfer-order-form");
    return { default: formModule.TransferOrderForm };
  },
  "posted-transfer-shipment-detail": async () => {
    if (!PostedTransferDetailForm) {
      const formModule =
        await import("@/components/forms/posted-transfers/posted-transfer-detail-form");
      PostedTransferDetailForm = formModule.PostedTransferDetailForm;
    }
    return { default: PostedTransferDetailForm! };
  },
  "posted-transfer-receipt-detail": async () => {
    if (!PostedTransferDetailForm) {
      const formModule =
        await import("@/components/forms/posted-transfers/posted-transfer-detail-form");
      PostedTransferDetailForm = formModule.PostedTransferDetailForm;
    }
    return { default: PostedTransferDetailForm! };
  },
  "qc-receipt-detail": async () => {
    const formModule = await import(
      "@/components/forms/qc-receipt/qc-receipt-detail-form"
    );
    return { default: formModule.QCReceiptDetailForm };
  },
};

/**
 * Get form component for a form type
 */
export async function getFormComponent(
  formType: string,
): Promise<FormComponent | null> {
  const loader = formRegistry[formType];
  if (!loader) {
    console.warn(`Form type "${formType}" not found in registry`);
    return null;
  }

  try {
    const formModule = await loader();
    return formModule.default;
  } catch (error) {
    console.error(`Error loading form component for "${formType}":`, error);
    return null;
  }
}
