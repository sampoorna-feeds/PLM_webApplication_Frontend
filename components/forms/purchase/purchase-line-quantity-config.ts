import type { PurchaseDocumentType } from "./purchase-document-config";
import type { LineItem } from "./purchase-line-item.type";

export type PurchaseLineDocumentType = PurchaseDocumentType;

export type PurchaseLineQuantityKey =
  | "qtyToReceive"
  | "qtyReceived"
  | "returnQtyToShip"
  | "returnQtyShipped"
  | "qtyToInvoice"
  | "qtyInvoiced";

export interface PurchaseLineQuantityConfig {
  firstPendingLabel: string;
  firstCompletedLabel: string;
  secondPendingLabel: string;
  secondCompletedLabel: string;
  firstPendingKey: PurchaseLineQuantityKey;
  firstCompletedKey: PurchaseLineQuantityKey;
  secondPendingKey: PurchaseLineQuantityKey;
  secondCompletedKey: PurchaseLineQuantityKey;
}

const ORDER_LIKE_CONFIG: PurchaseLineQuantityConfig = {
  firstPendingLabel: "Qty Receive",
  firstCompletedLabel: "Qty Recd",
  secondPendingLabel: "Qty Invce",
  secondCompletedLabel: "Qty Invd",
  firstPendingKey: "qtyToReceive",
  firstCompletedKey: "qtyReceived",
  secondPendingKey: "qtyToInvoice",
  secondCompletedKey: "qtyInvoiced",
};

const RETURN_LIKE_CONFIG: PurchaseLineQuantityConfig = {
  firstPendingLabel: "Qty Ship",
  firstCompletedLabel: "Qty Shipped",
  secondPendingLabel: "Qty Invce",
  secondCompletedLabel: "Qty Invd",
  firstPendingKey: "returnQtyToShip",
  firstCompletedKey: "returnQtyShipped",
  secondPendingKey: "qtyToInvoice",
  secondCompletedKey: "qtyInvoiced",
};

const PURCHASE_LINE_QUANTITY_CONFIG: Record<
  PurchaseLineDocumentType,
  PurchaseLineQuantityConfig
> = {
  order: ORDER_LIKE_CONFIG,
  invoice: ORDER_LIKE_CONFIG,
  "return-order": RETURN_LIKE_CONFIG,
  "credit-memo": RETURN_LIKE_CONFIG,
};

export function getPurchaseLineQuantityConfig(
  documentType: PurchaseLineDocumentType,
): PurchaseLineQuantityConfig {
  return PURCHASE_LINE_QUANTITY_CONFIG[documentType];
}

export function getPurchaseLineQuantityValue(
  item: LineItem,
  key: PurchaseLineQuantityKey,
): number | undefined {
  const value = item[key];
  if (typeof value === "number") return value;
  return undefined;
}
