import { apiGet, apiDelete, apiPost } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

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
  totalAmtToAssign: number;
  totalQtyToHandle: number;
  totalAmtToHandle: number;
  selectionTxt: string; // Equally,By Amount,By Weight,By Volume
}

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
  QtyToReceiveBase: number;
  QtyReceivedBase: number;
  QtyToShipBase: number;
  QtyShippedBase: number;
}

export interface ItemChargeSourceLine {
  "@odata.etag"?: string;
  Document_No: string;
  Line_No: number;
  No?: string; // For PurchReceipt, SalesShipment, ReturnReceipt, ReturnShipment
  Item_No?: string; // For PostedTransferReceipt
  Buy_from_Vendor_No?: string;
  Description: string;
  Quantity: number;
  Unit_of_Measure?: string;
  Posting_Date?: string;
  Shipment_Date?: string; // GetShipmentLine uses Shipment_Date instead of Posting_Date
  Location_Code?: string;
}

export type SourceType =
  | "Receipt"
  | "SalesShipment"
  | "GetShipmentLine"
  | "Transfer"
  | "ReturnReceipt"
  | "ReturnShipment";

const ENDPOINTS: Record<SourceType, string> = {
  Receipt: "PurchreceiptLine",
  SalesShipment: "SalesShipmentLine",
  GetShipmentLine: "GetShipmentLine",
  Transfer: "PostedTransferReceiptLine",
  ReturnReceipt: "ReturnReceiptLine",
  ReturnShipment: "ReturnShipmentLine",
};

const GET_TYPE_MAP: Record<SourceType, string> = {
  Receipt: "GetreceiptLine",
  SalesShipment: "GetShipmentLine",
  GetShipmentLine: "GetShipmentLine",
  Transfer: "GetTransferReceiptLine",
  ReturnReceipt: "GetReturnReceiptLine",
  ReturnShipment: "GetReturnShipmentLine",
};

// Maps each source type to the field name used for its item number.
// Different BC endpoints expose the item number under different OData field names.
const ITEM_NO_FIELD_MAP: Record<SourceType, string> = {
  Receipt: "No",           // PurchreceiptLine uses 'No'
  SalesShipment: "No",     // SalesShipmentLine uses 'No'
  GetShipmentLine: "No",   // GetShipmentLine uses 'No'
  Transfer: "Item_No",     // PostedTransferReceiptLine uses 'Item_No'
  ReturnReceipt: "No",     // ReturnReceiptLine uses 'No'
  ReturnShipment: "No",    // ReturnShipmentLine uses 'No'
};

export interface PagedResult<T> {
  value: T[];
  /** Total count from OData @odata.count (requires $count=true) */
  count: number;
}

export const itemChargeAssignmentService = {
  async getAssignments(filters: {
    docType: string;
    docNo: string;
    docLineNo: number;
    itemChargeNo: string;
    skip?: number;
    top?: number;
  }): Promise<PagedResult<ItemChargeAssignment>> {
    const { skip = 0, top = 200 } = filters;
    const filter = `Document_Type eq '${filters.docType}' and Document_No eq '${filters.docNo}' and Document_Line_No eq ${filters.docLineNo} and ItemChargeNo eq '${filters.itemChargeNo}'`;
    const endpoint =
      `/ItemChargeAssignmentPurch?company='${encodeURIComponent(COMPANY)}'` +
      `&$count=true` +
      `&$filter=${encodeURIComponent(filter)}` +
      `&$top=${top}` +
      `&$skip=${skip}`;
    const response = await apiGet<{
      value: ItemChargeAssignment[];
      "@odata.count"?: number;
    }>(endpoint);
    return {
      value: response.value || [],
      count: response["@odata.count"] ?? 0,
    };
  },

  async getSourceLines(
    type: SourceType,
    options: {
      docNo?: string;
      search?: string;
      skip?: number;
      top?: number;
      extraFilters?: string[];
    } = {},
  ): Promise<PagedResult<ItemChargeSourceLine>> {
    const { docNo, search, skip = 0, top = 200, extraFilters } = options;
    const endpointName = ENDPOINTS[type];
    const itemNoField = ITEM_NO_FIELD_MAP[type];
    const filters: string[] = [];

    if (docNo) {
      filters.push(`Document_No eq '${docNo}'`);
    }

    if (extraFilters?.length) {
      filters.push(...extraFilters);
    }

    if (search) {
      const s = search.replace(/'/g, "''"); // Escape single quotes for OData
      // Only search fields that exist on this specific endpoint.
      filters.push(
        `(contains(Document_No,'${s}') or contains(${itemNoField},'${s}'))`,
      );
    }

    const filterStr =
      filters.length > 0
        ? `&$filter=${encodeURIComponent(filters.join(" and "))}`
        : "";

    const endpoint =
      `/${endpointName}?company='${encodeURIComponent(COMPANY)}'` +
      `&$count=true` +
      `${filterStr}` +
      `&$top=${top}` +
      `&$skip=${skip}`;

    const response = await apiGet<{
      value: ItemChargeSourceLine[];
      "@odata.count"?: number;
    }>(endpoint);

    return {
      value: response.value || [],
      count: response["@odata.count"] ?? 0,
    };
  },

  async postAssignment(
    payload: PostItemChargeAssignmentPayload,
  ): Promise<void> {
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
  },

  async prepareChargeItemLines(purchDoc: string, lineNo: number): Promise<void> {
    const endpoint = `/API_GetChargeItemLinePurchase?company='${encodeURIComponent(COMPANY)}'`;
    await apiPost(endpoint, { purchDoc, lineNo });
  },
};
