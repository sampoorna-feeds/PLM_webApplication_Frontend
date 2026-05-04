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

export interface ColumnFilterValue {
  value: string;
  valueTo?: string;
}

export type ColumnFilters = Record<string, ColumnFilterValue>;

export const itemChargeAssignmentService = {
  async getAssignments(filters: {
    docType: string;
    docNo: string;
    docLineNo: number;
    itemChargeNo: string;
    skip?: number;
    top?: number;
    sortColumn?: string | null;
    sortDirection?: "asc" | "desc" | null;
    columnFilters?: ColumnFilters;
    search?: string;
  }): Promise<PagedResult<ItemChargeAssignment>> {
    const { skip = 0, top = 200, sortColumn, sortDirection, columnFilters, search } = filters;
    const filterParts = [`Document_Type eq '${filters.docType}'`, `Document_No eq '${filters.docNo}'`, `Document_Line_No eq ${filters.docLineNo}`, `ItemChargeNo eq '${filters.itemChargeNo}'`];

    if (search) {
      const s = search.replace(/'/g, "''");
      filterParts.push(`(contains(Applies_toDocNo,'${s}') or contains(Description,'${s}') or contains(ItemNo,'${s}') or contains(Applies_toDocType,'${s}'))`);
    }

    if (columnFilters) {
      Object.entries(columnFilters).forEach(([colId, filter]) => {
        if (!filter.value && !filter.valueTo) return;
        const s = filter.value.replace(/'/g, "''");
        filterParts.push(`contains(${colId},'${s}')`);
      });
    }

    const filterStr = filterParts.join(" and ");

    let orderStr = "";
    if (sortColumn && sortDirection) {
      orderStr = `&$orderby=${sortColumn} ${sortDirection}`;
    }

    const endpoint =
      `/ItemChargeAssignmentPurch?company='${encodeURIComponent(COMPANY)}'` +
      `&$count=true` +
      `&$filter=${encodeURIComponent(filterStr)}` +
      orderStr +
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
      columnFilters?: ColumnFilters;
      sortColumn?: string | null;
      sortDirection?: "asc" | "desc" | null;
      _isInternal?: boolean;
    } = {},
  ): Promise<PagedResult<ItemChargeSourceLine>> {
    const {
      docNo,
      search,
      skip = 0,
      top = 200,
      extraFilters,
      columnFilters,
      sortColumn,
      sortDirection,
      _isInternal,
    } = options;
    const endpointName = ENDPOINTS[type];
    const itemNoField = ITEM_NO_FIELD_MAP[type];
    // Handle search by splitting into multiple requests if the server doesn't support OR.
    // This is a common workaround for BC OData V4 limitations.
    if (search && !_isInternal) {
      const s = search.replace(/'/g, "''");
      const searchFields = ["Document_No", itemNoField];

      const responses = await Promise.all(
        searchFields.map((field) =>
          this.getSourceLines(type, {
            ...options,
            search: undefined,
            _isInternal: true,
            extraFilters: [
              ...(extraFilters || []),
              `contains(${field},'${s}')`,
            ],
          }),
        ),
      );

      // Merge results and de-duplicate by Document_No + Line_No
      const map = new Map<string, ItemChargeSourceLine>();
      responses.forEach((res) => {
        res.value.forEach((line) => {
          map.set(`${line.Document_No}-${line.Line_No}`, line);
        });
      });

      const allResults = Array.from(map.values());

      // If we have a sort, apply it client-side to the merged set
      if (sortColumn && sortDirection) {
        allResults.sort((a, b) => {
          const valA = (a as any)[sortColumn] ?? "";
          const valB = (b as any)[sortColumn] ?? "";
          if (valA < valB) return sortDirection === "asc" ? -1 : 1;
          if (valA > valB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        });
      }

      return {
        value: allResults.slice(skip, skip + top),
        count: allResults.length,
      };
    }

    const filters: string[] = [];

    if (docNo) {
      filters.push(`Document_No eq '${docNo.replace(/'/g, "''")}'`);
    }

    if (extraFilters?.length) {
      filters.push(...extraFilters);
    }

    if (search) {
      const s = search.replace(/'/g, "''");
      filters.push(`contains(Document_No,'${s}')`);
    }

    // Column Filters
    if (columnFilters) {
      Object.entries(columnFilters).forEach(([colId, filter]) => {
        if (!filter.value && !filter.valueTo) return;

        let field = colId;
        // Map Item_No to the correct field for this endpoint if needed
        if (colId === "Item_No") field = itemNoField;
        
        // Handle Date fields which might use different names
        if (colId === "Posting_Date" && type === "GetShipmentLine") {
          field = "Shipment_Date";
        }

        if (filter.valueTo || colId === "Posting_Date") {
          // Date range or explicit range
          if (filter.value) filters.push(`${field} ge ${filter.value}`);
          if (filter.valueTo) filters.push(`${field} le ${filter.valueTo}`);
        } else {
          const s = filter.value.replace(/'/g, "''");
          if (colId === "Location_Code" || colId === "Document_No") {
             // Exact match for codes usually better, but user might want partial. 
             // Let's use contains for general searchability as per existing pattern.
             filters.push(`contains(${field},'${s}')`);
          } else {
             filters.push(`contains(${field},'${s}')`);
          }
        }
      });
    }

    const filterStr =
      filters.length > 0
        ? `&$filter=${encodeURIComponent(filters.join(" and "))}`
        : "";

    let orderStr = "";
    if (sortColumn && sortDirection) {
      // Map sort column to endpoint field
      let field = sortColumn;
      if (sortColumn === "Item_No") field = itemNoField;
      if (sortColumn === "Posting_Date" && type === "GetShipmentLine") {
        field = "Shipment_Date";
      }
      orderStr = `&$orderby=${field} ${sortDirection}`;
    }

    const endpoint =
      `/${endpointName}?company='${encodeURIComponent(COMPANY)}'` +
      `&$count=true` +
      `${filterStr}` +
      orderStr +
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
