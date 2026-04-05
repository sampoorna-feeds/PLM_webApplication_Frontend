/**
 * Column Configuration for Purchase Documents
 * Per-document-type column definitions matching actual BC OData field names.
 */

export type SortDirection = "asc" | "desc" | null;

export type FilterType = "text" | "enum" | "date" | "number";

export interface ColumnConfig {
  id: string;
  label: string;
  sortable: boolean;
  defaultVisible: boolean;
  width?: string;
  filterType?: FilterType;
  filterOptions?: readonly { value: string; label: string }[];
}

export type PurchaseDocColumnType =
  | "order"
  | "invoice"
  | "return-order"
  | "credit-memo";

// ---------------------------------------------------------------------------
// PurchaseOrder columns
// ---------------------------------------------------------------------------

const ORDER_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Order No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Buy_from_Vendor_No", label: "Vendor No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Buy_from_Vendor_Name", label: "Vendor Name", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Order_Date", label: "Order Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Status", label: "Status", sortable: true, defaultVisible: true, filterType: "enum" },
];

const ORDER_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Order_Address_Code", label: "Order Address Code", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_3_Code", label: "LOC", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "PO_Type", label: "PO Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Service_Type", label: "Service Type", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Vendor_GST_Reg_No", label: "Vendor GST", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "P_A_N_No", label: "Vendor PAN", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Brokerage_Code", label: "Broker", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Brokerage_Rate", label: "Brokerage Rate", sortable: true, defaultVisible: false, filterType: "number" },
  { id: "Rate_Basis", label: "Rate Basis", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Terms_Code", label: "Term Code", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Payment_Terms_Code", label: "Payment Term", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Due_Date_calculation", label: "Due Date Calc", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Creditors_Type", label: "Creditor Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "QCType", label: "QC Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Due_Date", label: "Due Date", sortable: true, defaultVisible: false, filterType: "date" },
];

// ---------------------------------------------------------------------------
// PurchaseInvoiceHeader columns
// ---------------------------------------------------------------------------

const INVOICE_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Invoice No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Buy_from_Vendor_No", label: "Vendor No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Buy_from_Vendor_Name", label: "Vendor Name", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Status", label: "Status", sortable: true, defaultVisible: true, filterType: "enum" },
];

const INVOICE_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Order_Address_Code", label: "Order Address Code", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_3_Code", label: "LOC", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Vendor_GST_Reg_No", label: "Vendor GST", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "P_A_N_No", label: "Vendor PAN", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Brokerage_Code", label: "Broker", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Brokerage_Rate", label: "Brokerage Rate", sortable: true, defaultVisible: false, filterType: "number" },
  { id: "Rate_Basis", label: "Rate Basis", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Payment_Terms_Code", label: "Payment Term", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Due_Date_calculation", label: "Due Date Calc", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Creditors_Type", label: "Creditor Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Due_Date", label: "Due Date", sortable: true, defaultVisible: false, filterType: "date" },
];

// ---------------------------------------------------------------------------
// PurchaseReturnOrderHeader columns
// ---------------------------------------------------------------------------

const RETURN_ORDER_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Return No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Buy_from_Vendor_No", label: "Vendor No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Buy_from_Vendor_Name", label: "Vendor Name", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Order_Date", label: "Order Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Status", label: "Status", sortable: true, defaultVisible: true, filterType: "enum" },
];

const RETURN_ORDER_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Order_Address_Code", label: "Order Address Code", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_3_Code", label: "LOC", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Vendor_GST_Reg_No", label: "Vendor GST", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Brokerage_Code", label: "Broker", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Brokerage_Rate", label: "Brokerage Rate", sortable: true, defaultVisible: false, filterType: "number" },
  { id: "Payment_Terms_Code", label: "Payment Term", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Creditors_Type", label: "Creditor Type", sortable: true, defaultVisible: false, filterType: "enum" },
];

// ---------------------------------------------------------------------------
// PurchaseCreditMemoHeader columns
// ---------------------------------------------------------------------------

const CREDIT_MEMO_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Credit Memo No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Buy_from_Vendor_No", label: "Vendor No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Buy_from_Vendor_Name", label: "Vendor Name", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "Status", label: "Status", sortable: true, defaultVisible: true, filterType: "enum" },
];

const CREDIT_MEMO_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Order_Address_Code", label: "Order Address Code", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_3_Code", label: "LOC", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Vendor_GST_Reg_No", label: "Vendor GST", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "P_A_N_No", label: "Vendor PAN", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Brokerage_Code", label: "Broker", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Brokerage_Rate", label: "Brokerage Rate", sortable: true, defaultVisible: false, filterType: "number" },
  { id: "Payment_Terms_Code", label: "Payment Term", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Due_Date_calculation", label: "Due Date Calc", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Creditors_Type", label: "Creditor Type", sortable: true, defaultVisible: false, filterType: "enum" },
  { id: "Due_Date", label: "Due Date", sortable: true, defaultVisible: false, filterType: "date" },
];

// ---------------------------------------------------------------------------
// Per-doc-type config registry
// ---------------------------------------------------------------------------

interface DocTypeColumnRegistry {
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  storageKey: string;
}

const COLUMN_CONFIG_REGISTRY: Record<PurchaseDocColumnType, DocTypeColumnRegistry> = {
  order: {
    defaultColumns: ORDER_DEFAULT_COLUMNS,
    optionalColumns: ORDER_OPTIONAL_COLUMNS,
    storageKey: "purchaseOrdersVisibleColumns_v2",
  },
  invoice: {
    defaultColumns: INVOICE_DEFAULT_COLUMNS,
    optionalColumns: INVOICE_OPTIONAL_COLUMNS,
    storageKey: "purchaseInvoicesVisibleColumns_v2",
  },
  "return-order": {
    defaultColumns: RETURN_ORDER_DEFAULT_COLUMNS,
    optionalColumns: RETURN_ORDER_OPTIONAL_COLUMNS,
    storageKey: "purchaseReturnOrdersVisibleColumns_v2",
  },
  "credit-memo": {
    defaultColumns: CREDIT_MEMO_DEFAULT_COLUMNS,
    optionalColumns: CREDIT_MEMO_OPTIONAL_COLUMNS,
    storageKey: "purchaseCreditMemosVisibleColumns_v2",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getColumnConfig(docType: PurchaseDocColumnType) {
  const { defaultColumns, optionalColumns, storageKey } =
    COLUMN_CONFIG_REGISTRY[docType];
  const allColumns = [...defaultColumns, ...optionalColumns];

  function getDefaultVisibleColumns(): string[] {
    return allColumns.filter((col) => col.defaultVisible).map((col) => col.id);
  }

  function loadVisibleColumns(): string[] {
    if (typeof window === "undefined") return getDefaultVisibleColumns();
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
      }
    } catch {
      // ignore
    }
    return getDefaultVisibleColumns();
  }

  function saveVisibleColumns(columns: string[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(columns));
    } catch {
      // ignore
    }
  }

  function buildSelectQuery(visibleColumns: string[]): string {
    const defaultIds = defaultColumns.map((col) => col.id);
    const allNeeded = [...new Set([...defaultIds, ...visibleColumns])];
    return allNeeded.join(",");
  }

  return {
    defaultColumns,
    optionalColumns,
    allColumns,
    storageKey,
    getDefaultVisibleColumns,
    loadVisibleColumns,
    saveVisibleColumns,
    buildSelectQuery,
  };
}

// ---------------------------------------------------------------------------
// Legacy exports (kept for backward compat — prefer getColumnConfig)
// ---------------------------------------------------------------------------

/** @deprecated Use getColumnConfig("order") */
export const DEFAULT_COLUMNS = ORDER_DEFAULT_COLUMNS;
/** @deprecated Use getColumnConfig("order") */
export const OPTIONAL_COLUMNS = ORDER_OPTIONAL_COLUMNS;
/** @deprecated Use getColumnConfig("order") */
export const ALL_COLUMNS = [...ORDER_DEFAULT_COLUMNS, ...ORDER_OPTIONAL_COLUMNS];
/** @deprecated Use getColumnConfig(docType).storageKey */
export const COLUMN_VISIBILITY_STORAGE_KEY = COLUMN_CONFIG_REGISTRY.order.storageKey;

/** @deprecated Use getColumnConfig(docType).getDefaultVisibleColumns() */
export function getDefaultVisibleColumns(): string[] {
  return ALL_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id);
}

/** @deprecated Use getColumnConfig(docType).loadVisibleColumns() */
export function loadVisibleColumns(): string[] {
  return getColumnConfig("order").loadVisibleColumns();
}

/** @deprecated Use getColumnConfig(docType).saveVisibleColumns() */
export function saveVisibleColumns(columns: string[]): void {
  getColumnConfig("order").saveVisibleColumns(columns);
}

/** @deprecated Use getColumnConfig(docType).buildSelectQuery() */
export function buildSelectQuery(visibleColumns: string[]): string {
  return getColumnConfig("order").buildSelectQuery(visibleColumns);
}

export function getColumnById(id: string): ColumnConfig | undefined {
  return ALL_COLUMNS.find((col) => col.id === id);
}
