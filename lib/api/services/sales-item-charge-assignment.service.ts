/**
 * Sales Item Charge Assignment Service
 * Uses ItemChargeAssignmentSales (vs ItemChargeAssignmentPurch for purchase).
 * The POST/Suggest endpoints are shared but assignmentType is "Sale".
 */

import { apiGet, apiDelete, apiPost } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

// Re-export shared types from the purchase service (same data shape)
export type {
  ItemChargeAssignment,
  ItemChargeSourceLine,
  PostItemChargeAssignmentPayload,
  SuggestAssignmentPayload,
  PagedResult,
} from "./item-charge-assignment.service";

import type {
  ItemChargeAssignment,
  ItemChargeSourceLine,
  PagedResult,
  PostItemChargeAssignmentPayload,
  SuggestAssignmentPayload,
} from "./item-charge-assignment.service";

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

// Field used for item number varies by endpoint
const ITEM_NO_FIELD_MAP: Record<SalesChargeSourceType, string> = {
  SalesShipment: "No",
  ReturnShipment: "No",
  Transfer: "Item_No",
};

export const salesItemChargeAssignmentService = {
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
      `/ItemChargeAssignmentSales?company='${encodeURIComponent(COMPANY)}'` +
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
    type: SalesChargeSourceType,
    options: {
      docNo?: string;
      search?: string;
      skip?: number;
      top?: number;
      extraFilters?: string[];
    } = {},
  ): Promise<PagedResult<ItemChargeSourceLine>> {
    const { docNo, search, skip = 0, top = 200, extraFilters } = options;
    const endpointName = SALES_ENDPOINTS[type];
    const itemNoField = ITEM_NO_FIELD_MAP[type];
    const filters: string[] = [];

    if (docNo) filters.push(`Document_No eq '${docNo}'`);
    if (extraFilters?.length) filters.push(...extraFilters);
    if (search) {
      const s = search.replace(/'/g, "''");
      filters.push(`contains(Document_No,'${s}')`);
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
    // Same endpoint, but assignmentType should be "Sale"
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

  async deleteAssignment(assignment: ItemChargeAssignment): Promise<void> {
    const filter = `Document_Type='${assignment.Document_Type}',Document_No='${assignment.Document_No}',Document_Line_No=${assignment.Document_Line_No},Line_No=${assignment.Line_No}`;
    const endpoint = `/ItemChargeAssignmentSales(${filter})?company='${encodeURIComponent(COMPANY)}'`;
    await apiDelete(endpoint);
  },
};
