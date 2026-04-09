import type { LineItem } from "@/components/forms/purchase/purchase-line-item.type";
import type {
  PurchaseLine,
  PurchaseOrder,
} from "@/lib/api/services/purchase-orders.service";

export function toStringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

export function toNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function mapPurchaseHeaderToFormData(
  header: PurchaseOrder,
): Record<string, string> {
  const rawHeader = header as unknown as Record<string, unknown>;

  return {
    vendorNo: toStringValue(header.Buy_from_Vendor_No),
    vendorName: toStringValue(header.Buy_from_Vendor_Name),
    purchasePersonCode: toStringValue(header.Purchaser_Code),
    purchasePersonName: "",
    locationCode: toStringValue(header.Location_Code),
    postingDate: toStringValue(header.Posting_Date),
    documentDate: toStringValue(header.Document_Date),
    orderDate: toStringValue(header.Order_Date || header.Posting_Date),
    vendorInvoiceNo: toStringValue(header.Vendor_Invoice_No),
    vendorCrMemoNo: toStringValue(rawHeader["Vendor_Cr_Memo_No"]),
    vendorAuthorizationNo: toStringValue(rawHeader["Vendor_Authorization_No"]),
    appliesToDocType:
      toStringValue(rawHeader["Applies_to_Doc_Type"]).trim(),
    appliesToDocNo: toStringValue(rawHeader["Applies_to_Doc_No"]),
    invoiceType: toStringValue(header.Invoice_Type),
    lob: toStringValue(header.Shortcut_Dimension_1_Code),
    branch: toStringValue(header.Shortcut_Dimension_2_Code),
    loc: toStringValue(header.Shortcut_Dimension_3_Code),
    poType: toStringValue(header.PO_Type) || "Goods",
    serviceType: toStringValue(header.Service_Type),
    vendorGstRegNo: toStringValue(header.Vendor_GST_Reg_No),
    vendorPanNo: toStringValue(header.P_A_N_No),
    brokerNo: toStringValue(header.Brokerage_Code),
    brokerName: "",
    brokerageRate:
      header.Brokerage_Rate !== undefined && header.Brokerage_Rate !== null
        ? String(header.Brokerage_Rate)
        : "",
    orderAddressCode: toStringValue(header.Order_Address_Code),
    orderAddressState: toStringValue(rawHeader["GST_Order_Address_State"]),
    rateBasis: toStringValue(header.Rate_Basis),
    termCode: toStringValue(header.Terms_Code),
    mandiName: toStringValue(header.Mandi_Name),
    paymentTermCode: toStringValue(header.Payment_Terms_Code),
    dueDateCalculation:
      toStringValue(header.Due_Date_calculation) || "Posting Date",
    creditorType: toStringValue(header.Creditors_Type),
    qcType: toStringValue(header.QCType),
    dueDate: toStringValue(header.Due_Date),
    poExpirationDate: (() => {
      const v = toStringValue(rawHeader["PO_Expiration_Date"]);
      return v === "0001-01-01" ? "" : v;
    })(),
  };
}

export function mapPurchaseLineToLineItem(line: PurchaseLine): LineItem {
  const rawLine = line as unknown as Record<string, unknown>;
  const lineNo = toNumberValue(line.Line_No) ?? 0;

  const qtyToReceive = toNumberValue(line.Qty_to_Receive);
  const qtyReceived = toNumberValue(line.Quantity_Received);
  const qtyToInvoice = toNumberValue(line.Qty_to_Invoice);
  const qtyInvoiced = toNumberValue(line.Quantity_Invoiced);
  const returnQtyToShip =
    toNumberValue(rawLine["Return_Qty_to_Ship"]) ??
    toNumberValue(rawLine["Qty_to_Ship"]);
  const returnQtyShipped =
    toNumberValue(rawLine["Return_Qty_Shipped"]) ??
    toNumberValue(rawLine["Qty_Shipped"]);

  return {
    id: lineNo > 0 ? `line-${lineNo}` : `line-${crypto.randomUUID()}`,
    lineNo: lineNo > 0 ? lineNo : undefined,
    type:
      (line.Type as "Item" | "G/L Account" | "Fixed Asset" | "Charge (Item)") ||
      "Item",
    no: toStringValue(line.No),
    description: [
      toStringValue(line.Description),
      toStringValue(line.Description_2),
    ]
      .filter(Boolean)
      .join(" "),
    uom: toStringValue(line.Unit_of_Measure_Code || line.Unit_of_Measure),
    quantity: toNumberValue(line.Quantity) ?? 0,
    qtyToReceive,
    qtyReceived,
    returnQtyToShip,
    returnQtyShipped,
    qtyToInvoice,
    qtyInvoiced,
    price: toNumberValue(line.Direct_Unit_Cost),
    unitPrice: toNumberValue(line.Direct_Unit_Cost) ?? 0,
    discount:
      toNumberValue(line.Line_Discount_Percent) ??
      toNumberValue(line.Line_Discount_Amount) ??
      0,
    amount: toNumberValue(line.Line_Amount) ?? 0,
    exempted: Boolean(line.Exempted),
    gstGroupCode: toStringValue(line.GST_Group_Code),
    hsnSacCode: toStringValue(line.HSN_SAC_Code),
    tdsSectionCode: toStringValue(line.TDS_Section_Code),
    faPostingType: toStringValue(line.FA_Posting_Type) || undefined,
    salvageValue: toNumberValue(line.Salvage_Value),
    noOfBags: toNumberValue(line.No_of_Bags),
    challanQty: toNumberValue(line.Challan_Qty),
    weightQty: toNumberValue(line.Weight_Qty),
    gstCredit: toStringValue(line.GST_Credit),
  };
}
