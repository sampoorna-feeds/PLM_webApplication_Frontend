/**
 * Form Registry
 * Maps form type identifiers to React components
 */

import type { FormComponent } from "./types";

// Lazy imports to avoid circular dependencies
let SalesOrderForm: FormComponent | null = null;
let SalesInvoiceForm: FormComponent | null = null;
let SalesReturnOrderForm: FormComponent | null = null;
let SalesCreditMemoForm: FormComponent | null = null;
let AddPincodeForm: FormComponent | null = null;
let AddShipToForm: FormComponent | null = null;
let ProductionOrderForm: FormComponent | null = null;
let ItemSelectorForm: FormComponent | null = null;
let LineItemTabForm: FormComponent | null = null;

/**
 * Form registry mapping form types to components
 */
export const formRegistry: Record<
  string,
  () => Promise<{ default: FormComponent }>
> = {
  "sales-order": async () => {
    if (!SalesOrderForm) {
      const module = await import("@/components/forms/sales/sales-order-form");
      SalesOrderForm = module.SalesOrderForm;
    }
    return { default: SalesOrderForm! };
  },
  "sales-invoice": async () => {
    if (!SalesInvoiceForm) {
      const module =
        await import("@/components/forms/sales/sales-invoice-form");
      SalesInvoiceForm = module.SalesInvoiceForm;
    }
    return { default: SalesInvoiceForm! };
  },
  "sales-return-order": async () => {
    if (!SalesReturnOrderForm) {
      const module =
        await import("@/components/forms/sales/sales-return-order-form");
      SalesReturnOrderForm = module.SalesReturnOrderForm;
    }
    return { default: SalesReturnOrderForm! };
  },
  "sales-credit-memo": async () => {
    if (!SalesCreditMemoForm) {
      const module =
        await import("@/components/forms/sales/sales-credit-memo-form");
      SalesCreditMemoForm = module.SalesCreditMemoForm;
    }
    return { default: SalesCreditMemoForm! };
  },
  "add-pincode": async () => {
    if (!AddPincodeForm) {
      const module = await import("@/components/forms/nested/add-pincode-form");
      AddPincodeForm = module.AddPincodeForm;
    }
    return { default: AddPincodeForm! };
  },
  "add-shipto": async () => {
    if (!AddShipToForm) {
      const module = await import("@/components/forms/sales/add-shipto-form");
      AddShipToForm = module.AddShipToForm;
    }
    return { default: AddShipToForm! };
  },
  "production-order": async () => {
    if (!ProductionOrderForm) {
      const module =
        await import("@/components/forms/production-orders/production-order-form");
      ProductionOrderForm = module.ProductionOrderForm;
    }
    return { default: ProductionOrderForm! };
  },
  "item-selector": async () => {
    if (!ItemSelectorForm) {
      const module =
        await import("@/components/forms/sales/item-selector-form");
      ItemSelectorForm = module.ItemSelectorForm;
    }
    return { default: ItemSelectorForm! };
  },
  "line-item": async () => {
    if (!LineItemTabForm) {
      const module =
        await import("@/components/forms/sales/line-item-tab-form");
      LineItemTabForm = module.LineItemTabForm;
    }
    return { default: LineItemTabForm! };
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
    const module = await loader();
    return module.default;
  } catch (error) {
    console.error(`Error loading form component for "${formType}":`, error);
    return null;
  }
}
