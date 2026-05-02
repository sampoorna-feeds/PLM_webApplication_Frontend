import { type PurchaseDocumentHeaderType } from "./purchase-header-payload";
import { toUpperCaseValues } from "./payload-utils";

export interface PurchaseLinePayloadSource {
  type?: string;
  no?: string;
  description?: string;
  quantity?: number;
  uom?: string;
  unitPrice?: number;
  discount?: number;
  gstGroupCode?: string;
  hsnSacCode?: string;
  tdsSectionCode?: string;
  faPostingType?: string;
  salvageValue?: number;
  exempted?: boolean;
  noOfBags?: number;
  gstCredit?: string;
}

export function buildCreatePurchaseLinePayload(
  documentType: PurchaseDocumentHeaderType,
  documentNo: string,
  lineItem: PurchaseLinePayloadSource,
): Record<string, unknown> {
  const isNoneType = !lineItem.type || lineItem.type === "";

  const payload: Record<string, unknown> = {
    Document_Type: documentType,
    Document_No: documentNo,
    Type: isNoneType ? "" : lineItem.type,
  };

  if (isNoneType) {
    // For type "none": only Description is relevant
    if (lineItem.description) payload.Description = lineItem.description;
    return payload;
  }

  // Non-none types: include all standard fields
  payload.No = lineItem.no;
  payload.Quantity = lineItem.quantity;

  if (lineItem.uom) payload.Unit_of_Measure_Code = lineItem.uom;
  if (lineItem.unitPrice !== undefined && lineItem.unitPrice !== null && lineItem.unitPrice !== 0)
    payload.Direct_Unit_Cost = lineItem.unitPrice;
  if (lineItem.discount !== undefined && lineItem.discount !== null && lineItem.discount !== 0)
    payload.Line_Discount_Percent = lineItem.discount;
  if (lineItem.gstGroupCode) payload.GST_Group_Code = lineItem.gstGroupCode;
  if (lineItem.hsnSacCode) payload.HSN_SAC_Code = lineItem.hsnSacCode;
  if (lineItem.tdsSectionCode)
    payload.TDS_Section_Code = lineItem.tdsSectionCode;
  if (lineItem.faPostingType) payload.FA_Posting_Type = lineItem.faPostingType;
  if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null && lineItem.salvageValue !== 0)
    payload.Salvage_Value = lineItem.salvageValue;
  if (lineItem.exempted !== undefined) payload.Exempted = lineItem.exempted;
  if (lineItem.noOfBags !== undefined && lineItem.noOfBags !== null && lineItem.noOfBags !== 0)
    payload.No_of_Bags = lineItem.noOfBags;
  if (lineItem.gstCredit) payload.GST_Credit = lineItem.gstCredit;

  return toUpperCaseValues(payload, ["Document_Type", "Type"]);
}

export function buildUpdatePurchaseLinePayload(
  lineItem: Partial<PurchaseLinePayloadSource>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (lineItem.type !== undefined) payload.Type = lineItem.type;
  if (lineItem.no !== undefined) payload.No = lineItem.no;
  if (lineItem.quantity !== undefined) payload.Quantity = lineItem.quantity;
  if (lineItem.uom !== undefined) payload.Unit_of_Measure_Code = lineItem.uom;
  if (lineItem.unitPrice !== undefined && lineItem.unitPrice !== null)
    payload.Direct_Unit_Cost = lineItem.unitPrice;
  if (lineItem.discount !== undefined && lineItem.discount !== null)
    payload.Line_Discount_Percent = lineItem.discount;
  if (lineItem.gstGroupCode !== undefined)
    payload.GST_Group_Code = lineItem.gstGroupCode;
  if (lineItem.hsnSacCode !== undefined)
    payload.HSN_SAC_Code = lineItem.hsnSacCode;
  if (lineItem.tdsSectionCode !== undefined)
    payload.TDS_Section_Code = lineItem.tdsSectionCode;
  if (lineItem.faPostingType !== undefined)
    payload.FA_Posting_Type = lineItem.faPostingType;
  if (lineItem.salvageValue !== undefined && lineItem.salvageValue !== null)
    payload.Salvage_Value = lineItem.salvageValue;
  if (lineItem.exempted !== undefined) payload.Exempted = lineItem.exempted;
  if (lineItem.noOfBags !== undefined && lineItem.noOfBags !== null)
    payload.No_of_Bags = lineItem.noOfBags;
  if (lineItem.gstCredit !== undefined) payload.GST_Credit = lineItem.gstCredit;

  return toUpperCaseValues(payload, ["Document_Type", "Type"]);
}
