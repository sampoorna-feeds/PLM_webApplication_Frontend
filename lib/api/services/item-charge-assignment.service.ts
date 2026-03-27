import { apiGet, apiDelete, apiPost } from "../client";

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface PostItemChargeAssignmentPayload {
  sourceDoc: string; // Purchase Order and Invoice No.
  sourceLine: number; // Purchase Line No.
  getType: string; // GetreceiptLine, GetReturnReceiptLine, GetShipmentLine, GetTransferReceiptLine, GetReturnShipmentLine
  chargeDocNo: string;
  chargeLineNo: number;
  assignmentType: string; // Purchase, Sale
}

export interface SuggestAssignmentPayload {
  docNo: string;
  lineNo: number;
  totalQtyToAssign: number;
  tTotalAmtToAssign: number;
  totalQtyToHandle: number;
  totalAmtToHandle: number;
  selectionTxt: string; // Equally,By Amount,By Weight,By Volume
}

export interface ItemChargeAssignment {
// ... existing fields ...
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
  QtyToReceiveBase: number;
  QtyReceivedBase: number;
  QtyToShipBase: number;
  QtyShippedBase: number;
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

const GET_TYPE_MAP: Record<SourceType, string> = {
  Receipt: "GetreceiptLine",
  SalesShipment: "GetShipmentLine",
  Transfer: "GetTransferReceiptLine",
  ReturnReceipt: "GetReturnReceiptLine",
  ReturnShipment: "GetReturnShipmentLine",
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

  async getSourceLines(type: SourceType, docNo?: string, search?: string): Promise<ItemChargeSourceLine[]> {
    const endpointName = ENDPOINTS[type];
    const filters: string[] = [];

    if (docNo) {
      filters.push(`Document_No eq '${docNo}'`);
    }

    if (search) {
      const s = search.replace(/'/g, "''"); // Escape single quotes for OData
      // Try to search across multiple common fields. 
      // Note: Some BC environments might require different syntax for 'or', 
      // but 'contains' with 'or' is standard OData V4.
      filters.push(`(contains(Document_No, '${s}') or contains(No, '${s}') or contains(Item_No, '${s}'))`);
    }

    const filterStr = filters.length > 0 ? `&$filter=${encodeURIComponent(filters.join(" and "))}` : "";
    const endpoint = `/${endpointName}?company='${encodeURIComponent(COMPANY)}'${filterStr}&$top=50`;
    const response = await apiGet<{ value: ItemChargeSourceLine[] }>(endpoint);
    return response.value || [];
  },

  async postAssignment(payload: PostItemChargeAssignmentPayload): Promise<void> {
    const endpoint = `/API_PostItemChargeAssignment?company='${encodeURIComponent(COMPANY)}'`;
    await apiPost(endpoint, payload);
  },

  getApiGetType(type: SourceType): string {
    return GET_TYPE_MAP[type];
  },

  async suggestAssignment(payload: SuggestAssignmentPayload): Promise<void> {
    const endpoint = `/API_SuggestAssgnmt?company='${encodeURIComponent(COMPANY)}'`;
    await apiPost(endpoint, payload);
  },

  async deleteAssignment(assignment: ItemChargeAssignment): Promise<void> {
    const filter = `Document_Type='${assignment.Document_Type}',Document_No='${assignment.Document_No}',Document_Line_No=${assignment.Document_Line_No},Line_No=${assignment.Line_No}`;
    const endpoint = `/ItemChargeAssignmentPurch(${filter})?company='${encodeURIComponent(COMPANY)}'`;
    await apiDelete(endpoint);
  }
};
