/**
 * Column Configuration for Sales Documents
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

export type SalesDocColumnType =
  | "order"
  | "invoice"
  | "return-order"
  | "credit-memo";

// ---------------------------------------------------------------------------
// SalesOrder columns
// ---------------------------------------------------------------------------

const ORDER_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Order No", sortable: true, defaultVisible: true, filterType: "text", width: "w-24" },
  { id: "Sell_to_Customer_No", label: "Customer No", sortable: true, defaultVisible: true, filterType: "text", width: "w-28" },
  { id: "Sell_to_Customer_Name", label: "Customer Name", sortable: true, defaultVisible: true, filterType: "text", width: "w-48" },
  { id: "Order_Date", label: "Order Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "External_Document_No", label: "External Doc No", sortable: true, defaultVisible: true, filterType: "text", width: "w-32" },
  { id: "Status", label: "Status", sortable: true, defaultVisible: true, filterType: "enum", width: "w-24" },
  { id: "Amt_to_Customer", label: "Amount", sortable: true, defaultVisible: true, filterType: "number", width: "w-28" },
];

const ORDER_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Ship_to_Code", label: "Ship-to Code", sortable: true, defaultVisible: false, filterType: "text", width: "w-28" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text", width: "w-40" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text", width: "w-24" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "enum", width: "w-28" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text", width: "w-20" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text", width: "w-24" },
  { id: "Shortcut_Dimension_3_Code", label: "LOC", sortable: true, defaultVisible: false, filterType: "text", width: "w-20" },
  { id: "Salesperson_Code", label: "Salesperson", sortable: true, defaultVisible: false, filterType: "text", width: "w-28" },
];

// ---------------------------------------------------------------------------
// SalesInvoiceHeader columns
// ---------------------------------------------------------------------------

const INVOICE_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Invoice No", sortable: true, defaultVisible: true, filterType: "text", width: "w-28" },
  { id: "Sell_to_Customer_No", label: "Customer No", sortable: true, defaultVisible: true, filterType: "text", width: "w-28" },
  { id: "Sell_to_Customer_Name", label: "Customer Name", sortable: true, defaultVisible: true, filterType: "text", width: "w-48" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "External_Document_No", label: "External Doc No", sortable: true, defaultVisible: true, filterType: "text", width: "w-32" },
  { id: "Status", label: "Status", sortable: true, defaultVisible: true, filterType: "enum", width: "w-24" },
  { id: "Amt_to_Customer", label: "Amount", sortable: true, defaultVisible: true, filterType: "number", width: "w-28" },
];

const INVOICE_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Ship_to_Code", label: "Ship-to Code", sortable: true, defaultVisible: false, filterType: "text", width: "w-28" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text", width: "w-40" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text", width: "w-24" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "enum", width: "w-28" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text", width: "w-20" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text", width: "w-24" },
  { id: "Shortcut_Dimension_3_Code", label: "LOC", sortable: true, defaultVisible: false, filterType: "text", width: "w-20" },
  { id: "Salesperson_Code", label: "Salesperson", sortable: true, defaultVisible: false, filterType: "text", width: "w-28" },
];

// ---------------------------------------------------------------------------
// SalesReturnOrderHeader columns
// ---------------------------------------------------------------------------

const RETURN_ORDER_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Return No", sortable: true, defaultVisible: true, filterType: "text", width: "w-28" },
  { id: "Sell_to_Customer_No", label: "Customer No", sortable: true, defaultVisible: true, filterType: "text", width: "w-28" },
  { id: "Sell_to_Customer_Name", label: "Customer Name", sortable: true, defaultVisible: true, filterType: "text", width: "w-48" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "External_Document_No", label: "External Doc No", sortable: true, defaultVisible: true, filterType: "text", width: "w-32" },
  { id: "Status", label: "Status", sortable: true, defaultVisible: true, filterType: "enum", width: "w-24" },
  { id: "Amt_to_Customer", label: "Amount", sortable: true, defaultVisible: true, filterType: "number", width: "w-28" },
];

const RETURN_ORDER_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Ship_to_Code", label: "Ship-to Code", sortable: true, defaultVisible: false, filterType: "text", width: "w-28" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text", width: "w-40" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text", width: "w-24" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "enum", width: "w-28" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text", width: "w-20" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text", width: "w-24" },
  { id: "Shortcut_Dimension_3_Code", label: "LOC", sortable: true, defaultVisible: false, filterType: "text", width: "w-20" },
  { id: "Salesperson_Code", label: "Salesperson", sortable: true, defaultVisible: false, filterType: "text", width: "w-28" },
];

// ---------------------------------------------------------------------------
// SalesCreditMemoHeader columns
// ---------------------------------------------------------------------------

const CREDIT_MEMO_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Credit Memo No", sortable: true, defaultVisible: true, filterType: "text", width: "w-32" },
  { id: "Sell_to_Customer_No", label: "Customer No", sortable: true, defaultVisible: true, filterType: "text", width: "w-28" },
  { id: "Sell_to_Customer_Name", label: "Customer Name", sortable: true, defaultVisible: true, filterType: "text", width: "w-48" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: true, filterType: "date", width: "w-28" },
  { id: "External_Document_No", label: "External Doc No", sortable: true, defaultVisible: true, filterType: "text", width: "w-32" },
  { id: "Status", label: "Status", sortable: true, defaultVisible: true, filterType: "enum", width: "w-24" },
  { id: "Amt_to_Customer", label: "Amount", sortable: true, defaultVisible: true, filterType: "number", width: "w-28" },
];

const CREDIT_MEMO_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Ship_to_Code", label: "Ship-to Code", sortable: true, defaultVisible: false, filterType: "text", width: "w-28" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text", width: "w-40" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text", width: "w-24" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "enum", width: "w-28" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text", width: "w-20" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text", width: "w-24" },
  { id: "Shortcut_Dimension_3_Code", label: "LOC", sortable: true, defaultVisible: false, filterType: "text", width: "w-20" },
  { id: "Salesperson_Code", label: "Salesperson", sortable: true, defaultVisible: false, filterType: "text", width: "w-28" },
];

// ---------------------------------------------------------------------------
// Per-doc-type config registry
// ---------------------------------------------------------------------------

interface DocTypeColumnRegistry {
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  storageKey: string;
}

const COLUMN_CONFIG_REGISTRY: Record<SalesDocColumnType, DocTypeColumnRegistry> = {
  order: {
    defaultColumns: ORDER_DEFAULT_COLUMNS,
    optionalColumns: ORDER_OPTIONAL_COLUMNS,
    storageKey: "salesOrdersVisibleColumns_v2",
  },
  invoice: {
    defaultColumns: INVOICE_DEFAULT_COLUMNS,
    optionalColumns: INVOICE_OPTIONAL_COLUMNS,
    storageKey: "salesInvoicesVisibleColumns_v2",
  },
  "return-order": {
    defaultColumns: RETURN_ORDER_DEFAULT_COLUMNS,
    optionalColumns: RETURN_ORDER_OPTIONAL_COLUMNS,
    storageKey: "salesReturnOrdersVisibleColumns_v2",
  },
  "credit-memo": {
    defaultColumns: CREDIT_MEMO_DEFAULT_COLUMNS,
    optionalColumns: CREDIT_MEMO_OPTIONAL_COLUMNS,
    storageKey: "salesCreditMemosVisibleColumns_v2",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getColumnConfig(docType: SalesDocColumnType) {
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
