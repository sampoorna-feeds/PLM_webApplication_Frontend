/**
 * Sales Item Charge Assignment Service
 * Uses ItemChargeAssignmentSales (vs ItemChargeAssignmentPurch for purchase).
 * The POST/Suggest endpoints are shared but assignmentType is "Sale".
 */

import { apiGet, apiDelete, apiPost } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export type {
  ItemChargeSourceLine,
  PostItemChargeAssignmentPayload,
  SuggestAssignmentPayload,
  PagedResult,
} from "./item-charge-assignment.service";

import type {
  ItemChargeSourceLine,
  PagedResult,
  PostItemChargeAssignmentPayload,
  SuggestAssignmentPayload,
} from "./item-charge-assignment.service";

export interface SalesItemChargeAssignment {
  "@odata.etag"?: string;
  Document_Type: string;
  Document_No: string;
  Document_Line_No: number;
  Line_No: number;
  ItemChargeNo: string;
  Applies_to_Doc_Type: string;
  Applies_to_Doc_No_: string;
  Applies_to_Doc_Line_No_: number;
  Item_No_: string;
  Description: string;
  Qty_to_Assign: number;
  Qty_to_Handle: number;
  Qty_Assigned: number;
  Amount_to_Assign: number;
  Amount_to_Handle: number;
  GrossWeight: number;
  UnitVolume: number;
  QtyToShipBase: number;
  QtyShippedBase: number;
  QtyToRetReceiveBase: number;
  QtyRetReceivedBase: number;
}

export type SalesChargeSourceType =
  | "SalesShipment"
  | "ReturnShipment"
  | "Transfer";

const SALES_ENDPOINTS: Record<SalesChargeSourceType, string> = {
  SalesShipment: "PostedSalesShipmentLine",
  ReturnShipment: "ReturnShipmentLine",
  Transfer: "PostedTransferReceiptLine",
};

const SALES_GET_TYPE_MAP: Record<SalesChargeSourceType, string> = {
  SalesShipment: "GetShipmentLine",
  ReturnShipment: "GetReturnShipmentLine",
  Transfer: "GetTransferReceiptLine",
};

const ITEM_NO_FIELD_MAP: Record<SalesChargeSourceType, string> = {
  SalesShipment: "No",
  ReturnShipment: "No",
  Transfer: "Item_No",
};

const escapeODataString = (value: string) => value.replace(/'/g, "''");

export const salesItemChargeAssignmentService = {
  async getAssignments(filters: {
    docType: string;
    docNo: string;
    docLineNo: number;
    itemChargeNo: string;
    skip?: number;
    top?: number;
  }): Promise<PagedResult<SalesItemChargeAssignment>> {
    const { skip = 0, top = 200 } = filters;
    const filter = `Document_Type eq '${filters.docType}' and Document_No eq '${filters.docNo}' and Document_Line_No eq ${filters.docLineNo} and ItemChargeNo eq '${filters.itemChargeNo}'`;
    const endpoint =
      `/ItemChargeAssignmentSales?company='${encodeURIComponent(COMPANY)}'` +
      `&$count=true` +
      `&$filter=${encodeURIComponent(filter)}` +
      `&$top=${top}` +
      `&$skip=${skip}`;
    const response = await apiGet<{
      value: SalesItemChargeAssignment[];
      "@odata.count"?: number;
    }>(endpoint);
    return {
      value: response.value || [],
      count: response["@odata.count"] ?? 0,
    };
  },

  async getSourceLines(
    type: SalesChargeSourceType,
    options: {
      docNo?: string;
      search?: string;
      skip?: number;
      top?: number;
      extraFilters?: string[];
      sellToCustomerNo?: string;
      postingDateFrom?: string;
    } = {},
  ): Promise<PagedResult<ItemChargeSourceLine>> {
    const {
      docNo,
      search,
      skip = 0,
      top = 200,
      extraFilters,
      sellToCustomerNo,
      postingDateFrom,
    } = options;
    const endpointName = SALES_ENDPOINTS[type];
    const itemNoField = ITEM_NO_FIELD_MAP[type];
    const filters: string[] = [];

    if (docNo) filters.push(`Document_No eq '${escapeODataString(docNo)}'`);
    if (type === "SalesShipment") {
      filters.push("Type eq 'Item'");
      filters.push("Quantity ne 0");
      filters.push("Job_No eq ''");
      filters.push("Correction eq false");
      if (sellToCustomerNo) {
        filters.push(
          `Sell_to_Customer_No eq '${escapeODataString(sellToCustomerNo)}'`,
        );
      }
      if (postingDateFrom) {
        filters.push(`Posting_Date ge ${escapeODataString(postingDateFrom)}`);
      }
    }
    if (extraFilters?.length) filters.push(...extraFilters);
    if (search) {
      const s = escapeODataString(search);
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
    payload: Omit<PostItemChargeAssignmentPayload, "assignmentType">,
  ): Promise<void> {
    const endpoint = `/API_PostItemChargeAssignment?company='${encodeURIComponent(COMPANY)}'`;
    await apiPost(endpoint, { ...payload, assignmentType: "Sale" });
  },

  getApiGetType(type: SalesChargeSourceType): string {
    return SALES_GET_TYPE_MAP[type];
  },

  async suggestAssignment(payload: SuggestAssignmentPayload): Promise<void> {
    const endpoint = `/API_SuggestAssgmentSales?company='${encodeURIComponent(COMPANY)}'`;
    await apiPost(endpoint, payload);
  },

  async deleteAssignment(assignment: SalesItemChargeAssignment): Promise<void> {
    const filter = `Document_Type='${assignment.Document_Type}',Document_No='${assignment.Document_No}',Document_Line_No=${assignment.Document_Line_No},Line_No=${assignment.Line_No}`;
    const endpoint = `/ItemChargeAssignmentSales(${filter})?company='${encodeURIComponent(COMPANY)}'`;
    await apiDelete(endpoint);
  },
};
