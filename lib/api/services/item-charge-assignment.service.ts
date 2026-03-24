import { apiGet, apiDelete } from "../client";

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface ItemChargeAssignment {
  "@odata.etag"?: string;
  Document_Type: string;
  Document_No: string;
  Document_Line_No: number;
  Line_No: number;
  ItemChargeNo: string;
  Applies_toDocType: string;
  Applies_toDocNo: string;
  Applies_toDocLineNo: number;
  ItemNo: string;
  Description: string;
  QtytoAssign: number;
  QtytoHandle: number;
  QtyAssigned: number;
  AmounttoAssign: number;
  AmounttoHandle: number;
  GrossWeight: number;
  UnitVolume: number;
}

export interface ItemChargeSourceLine {
  "@odata.etag"?: string;
  Document_No: string;
  Line_No: number;
  No?: string;        // For PurchReceipt, SalesShipment, ReturnReceipt, ReturnShipment
  Item_No?: string;   // For PostedTransferReceipt
  Buy_from_Vendor_No?: string;
  Description: string;
  Quantity: number;
  Unit_of_Measure?: string;
  Posting_Date?: string;
}

export type SourceType = "Receipt" | "SalesShipment" | "Transfer" | "ReturnReceipt" | "ReturnShipment";

const ENDPOINTS: Record<SourceType, string> = {
  Receipt: "PurchreceiptLine",
  SalesShipment: "SalesShipmentLine",
  Transfer: "PostedTransferReceiptLine",
  ReturnReceipt: "ReturnReceiptLine",
  ReturnShipment: "ReturnShipmentLine",
};

export const itemChargeAssignmentService = {
  async getAssignments(filters: {
    docType: string;
    docNo: string;
    docLineNo: number;
    itemChargeNo: string;
  }): Promise<ItemChargeAssignment[]> {
    // Exact match filter based on the curl example
    const filter = `Document_Type eq '${filters.docType}' and Document_No eq '${filters.docNo}' and Document_Line_No eq ${filters.docLineNo} and ItemChargeNo eq '${filters.itemChargeNo}'`;
    const endpoint = `/ItemChargeAssignmentPurch?company='${encodeURIComponent(COMPANY)}'&$filter=${encodeURIComponent(filter)}`;
    const response = await apiGet<{ value: ItemChargeAssignment[] }>(endpoint);
    return response.value || [];
  },

  async getSourceLines(type: SourceType, docNo?: string): Promise<ItemChargeSourceLine[]> {
    const endpointName = ENDPOINTS[type];
    let filter = "";
    if (docNo) {
      filter = `&$filter=Document_No eq '${docNo}'`;
    }
    const endpoint = `/${endpointName}?company='${encodeURIComponent(COMPANY)}'${filter}&$top=50`;
    const response = await apiGet<{ value: ItemChargeSourceLine[] }>(endpoint);
    return response.value || [];
  },

  async suggestAssignment(params: {
    docType: string;
    docNo: string;
    docLineNo: number;
    itemChargeNo: string;
  }): Promise<void> {
    console.log("Suggesting assignments for:", params);
  },

  async deleteAssignment(assignment: ItemChargeAssignment): Promise<void> {
    const filter = `Document_Type='${assignment.Document_Type}',Document_No='${assignment.Document_No}',Document_Line_No=${assignment.Document_Line_No},Line_No=${assignment.Line_No}`;
    const endpoint = `/ItemChargeAssignmentPurch(${filter})?company='${encodeURIComponent(COMPANY)}'`;
    await apiDelete(endpoint);
  }
};
