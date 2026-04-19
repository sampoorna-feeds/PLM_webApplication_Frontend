import type { ColumnConfig, SortDirection } from "./column-config";

export type SalesPostedDocumentType = "posted-shipment" | "posted-invoice";

// ---------------------------------------------------------------------------
// Posted Shipment (SalesShipment_) columns
// ---------------------------------------------------------------------------

const POSTED_SHIPMENT_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Shipment No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Sell_to_Customer_No", label: "Customer No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Sell_to_Customer_Name", label: "Customer Name", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Order_No", label: "Order No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "External_Document_No", label: "External Doc No", sortable: true, defaultVisible: true, filterType: "text" },
];

const POSTED_SHIPMENT_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: false, filterType: "date" },
  { id: "Shipment_Date", label: "Shipment Date", sortable: true, defaultVisible: false, filterType: "date" },
  { id: "Vehicle_No", label: "Vehicle No.", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "LR_RR_No", label: "LR/RR No.", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Ship_to_Code", label: "Ship-to Code", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Salesperson_Code", label: "Salesperson", sortable: true, defaultVisible: false, filterType: "text" },
];

// ---------------------------------------------------------------------------
// Posted Invoice (PostedSalesInvoice) columns
// ---------------------------------------------------------------------------

const POSTED_INVOICE_DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "Invoice No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Sell_to_Customer_No", label: "Customer No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Sell_to_Customer_Name", label: "Customer Name", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Order_No", label: "Order No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Posting_Date", label: "Posting Date", sortable: true, defaultVisible: true, filterType: "date" },
  { id: "External_Document_No", label: "External Doc No", sortable: true, defaultVisible: true, filterType: "text" },
  { id: "Amount_Including_VAT", label: "Amount (incl. VAT)", sortable: true, defaultVisible: true, filterType: "number" },
];

const POSTED_INVOICE_OPTIONAL_COLUMNS: ColumnConfig[] = [
  { id: "Document_Date", label: "Document Date", sortable: true, defaultVisible: false, filterType: "date" },
  { id: "Order_Date", label: "Order Date", sortable: true, defaultVisible: false, filterType: "date" },
  { id: "Invoice_Type", label: "Invoice Type", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "E_Invoice_Status", label: "E-Invoice Status", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "E_Way_Bill_No", label: "E-Way Bill No.", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Remaining_Amount", label: "Remaining Amount", sortable: true, defaultVisible: false, filterType: "number" },
  { id: "Ship_to_Code", label: "Ship-to Code", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Ship_to_Name", label: "Ship-to Name", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Location_Code", label: "Location", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_1_Code", label: "LOB", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Shortcut_Dimension_2_Code", label: "Branch", sortable: true, defaultVisible: false, filterType: "text" },
  { id: "Salesperson_Code", label: "Salesperson", sortable: true, defaultVisible: false, filterType: "text" },
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

interface DocTypeRegistry {
  defaultColumns: ColumnConfig[];
  optionalColumns: ColumnConfig[];
  storageKey: string;
}

const REGISTRY: Record<SalesPostedDocumentType, DocTypeRegistry> = {
  "posted-shipment": {
    defaultColumns: POSTED_SHIPMENT_DEFAULT_COLUMNS,
    optionalColumns: POSTED_SHIPMENT_OPTIONAL_COLUMNS,
    storageKey: "salesPostedShipmentsVisibleColumns_v1",
  },
  "posted-invoice": {
    defaultColumns: POSTED_INVOICE_DEFAULT_COLUMNS,
    optionalColumns: POSTED_INVOICE_OPTIONAL_COLUMNS,
    storageKey: "salesPostedInvoicesVisibleColumns_v1",
  },
};

export function getPostedDocumentColumnConfig(type: SalesPostedDocumentType) {
  const { defaultColumns, optionalColumns, storageKey } = REGISTRY[type];
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

  function buildSelectQuery(visible: string[]): string {
    const defaultIds = defaultColumns.map((c) => c.id);
    return [...new Set([...defaultIds, ...visible])].join(",");
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
// Page config (title, labels, etc.)
// ---------------------------------------------------------------------------

export interface SalesPostedDocumentConfig {
  type: SalesPostedDocumentType;
  listTitle: string;
  listDescription: string;
  detailTitlePrefix: string;
  formType: string;
  documentLabel: string;
}

export const POSTED_DOCUMENT_CONFIGS: Record<
  SalesPostedDocumentType,
  SalesPostedDocumentConfig
> = {
  "posted-shipment": {
    type: "posted-shipment",
    listTitle: "Posted Sales Shipments",
    listDescription: "View posted sales shipment documents",
    detailTitlePrefix: "Shipment",
    formType: "sales-posted-shipment-detail",
    documentLabel: "Shipment",
  },
  "posted-invoice": {
    type: "posted-invoice",
    listTitle: "Posted Sales Invoices",
    listDescription: "View posted sales invoice documents",
    detailTitlePrefix: "Invoice",
    formType: "sales-posted-invoice-detail",
    documentLabel: "Invoice",
  },
};

export { type SortDirection };
