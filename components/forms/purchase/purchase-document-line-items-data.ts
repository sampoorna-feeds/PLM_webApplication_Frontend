import type { LineItem } from "@/components/forms/purchase/purchase-line-item.type";

export interface PurchaseCommonLineItemData {
  type?: string;
  no?: string;
  description?: string;
  uom?: string;
  quantity?: number;
  price?: number;
  unitPrice?: number;
  discount?: number;
  amount?: number;
  exempted?: boolean;
  gstGroupCode?: string;
  hsnSacCode?: string;
  tdsSectionCode?: string;
}

export function buildPurchaseCommonLineItemsData<
  T extends PurchaseCommonLineItemData,
>(lineItems: LineItem[]): T[] {
  return lineItems.map((item) => ({
    type: item.type,
    no: item.no,
    description: item.description,
    uom: item.uom,
    quantity: item.quantity,
    price: item.price,
    unitPrice: item.unitPrice,
    discount: item.discount,
    amount: item.amount,
    exempted: item.exempted,
    gstGroupCode: item.gstGroupCode,
    hsnSacCode: item.hsnSacCode,
    tdsSectionCode: item.tdsSectionCode,
  })) as T[];
}

export function resolvePurchaseLocationCode(locationCode: string): string {
  return locationCode || "";
}
