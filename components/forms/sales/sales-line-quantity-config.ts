import type { SalesDocumentType } from "./sales-document-config";

export interface SalesLineQuantityConfig {
  firstPendingLabel: string;
  firstCompletedLabel: string;
  secondPendingLabel: string;
  secondCompletedLabel: string;
  /** BC OData field name for the first pending qty (used in PATCH payloads) */
  firstPendingBcField: string;
  /** BC OData field name for the first completed qty (read-only display) */
  firstCompletedBcField: string;
  /** BC OData field name for the second pending qty (used in PATCH payloads) */
  secondPendingBcField: string;
  /** BC OData field name for the second completed qty (read-only display) */
  secondCompletedBcField: string;
}

const ORDER_CONFIG: SalesLineQuantityConfig = {
  firstPendingLabel: "Qty to Ship",
  firstCompletedLabel: "Qty Shipped",
  secondPendingLabel: "Qty to Invoice",
  secondCompletedLabel: "Qty Invoiced",
  firstPendingBcField: "Qty_to_Ship",
  firstCompletedBcField: "Quantity_Shipped",
  secondPendingBcField: "Qty_to_Invoice",
  secondCompletedBcField: "Quantity_Invoiced",
};

const RETURN_ORDER_CONFIG: SalesLineQuantityConfig = {
  firstPendingLabel: "Qty to Return",
  firstCompletedLabel: "Qty Returned",
  secondPendingLabel: "Qty to Invoice",
  secondCompletedLabel: "Qty Invoiced",
  firstPendingBcField: "Return_Qty_to_Receive",
  firstCompletedBcField: "Return_Qty_Received",
  secondPendingBcField: "Qty_to_Invoice",
  secondCompletedBcField: "Quantity_Invoiced",
};

const SALES_LINE_QUANTITY_CONFIG: Partial<
  Record<SalesDocumentType, SalesLineQuantityConfig>
> = {
  order: ORDER_CONFIG,
  "return-order": RETURN_ORDER_CONFIG,
};

export function getSalesLineQuantityConfig(
  documentType: SalesDocumentType,
): SalesLineQuantityConfig | undefined {
  return SALES_LINE_QUANTITY_CONFIG[documentType];
}
