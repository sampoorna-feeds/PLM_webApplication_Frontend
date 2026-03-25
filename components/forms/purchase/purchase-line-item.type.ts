export type PurchaseLineType =
  | "G/L Account"
  | "Item"
  | "Fixed Asset"
  | "Charge (Item)";

export interface LineItem {
  id: string;
  /** API Line_No for existing lines; absent or <= 0 for new lines */
  lineNo?: number;
  type: PurchaseLineType;
  no: string;
  description: string;
  uom?: string;
  quantity: number;
  qtyToReceive?: number;
  qtyReceived?: number;
  qtyToInvoice?: number;
  qtyInvoiced?: number;
  price?: number;
  unitPrice: number;
  discount: number;
  amount: number;
  exempted: boolean;
  gstGroupCode: string;
  hsnSacCode: string;
  tdsSectionCode: string;
  faPostingType?: string;
  salvageValue?: number;
  noOfBags?: number;
  challanQty?: number;
  weightQty?: number;
}
