/**
 * Form Registry
 * Maps form type identifiers to React components
 */

import type { FormComponent } from "./types";

// Lazy imports to avoid circular dependencies
let SalesDocumentForm: FormComponent | null = null;
let AddPincodeForm: FormComponent | null = null;
let AddShipToForm: FormComponent | null = null;
let ProductionOrderForm: FormComponent | null = null;
let FinishedProductionOrderDetailForm: FormComponent | null = null;
let PurchaseDocumentForm: FormComponent | null = null;

let TransferOrderDetailForm: FormComponent | null = null;
let PostedTransferDetailForm: FormComponent | null = null;
let SalesPostedDocumentDetailForm: FormComponent | null = null;

/**
 * Form registry mapping form types to components
 */
export const formRegistry: Record<
  string,
  () => Promise<{ default: FormComponent }>
> = {
  "sales-document": async () => {
    if (!SalesDocumentForm) {
      const formModule =
        await import("@/components/forms/sales/sales-document-form");
      SalesDocumentForm = formModule.SalesDocumentForm;
    }
    return { default: SalesDocumentForm! };
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
  "sales-posted-shipment-detail": async () => {
    if (!SalesPostedDocumentDetailForm) {
      const m = await import(
        "@/components/forms/sales/sales-posted-document-detail-form"
      );
      SalesPostedDocumentDetailForm = m.SalesPostedDocumentDetailForm;
    }
    return { default: SalesPostedDocumentDetailForm! };
  },
  "sales-posted-invoice-detail": async () => {
    if (!SalesPostedDocumentDetailForm) {
      const m = await import(
        "@/components/forms/sales/sales-posted-document-detail-form"
      );
      SalesPostedDocumentDetailForm = m.SalesPostedDocumentDetailForm;
    }
    return { default: SalesPostedDocumentDetailForm! };
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
