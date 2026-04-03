/**
 * Column Configuration for Vendor Ledger Table
 * Defines all available columns, their metadata, and default visibility
 */

export type SortDirection = "asc" | "desc" | null;

export type FilterType = "text" | "enum" | "boolean" | "date" | "number";

export interface ColumnConfig {
  id: string;
  label: string;
  sortable: boolean;
  defaultVisible: boolean;
  width?: string;
  filterType?: FilterType;
  filterOptions?: readonly { value: string; label: string }[];
}

// Default columns for Ledger
export const LEDGER_DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "Entry_No",
    label: "Entry No",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Posting_Date",
    label: "Posting Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
  {
    id: "Document_Type",
    label: "Doc Type",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Document_No",
    label: "Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "External_Document_No",
    label: "Ext. Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "VendorName",
    label: "Vendor Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Debit_Amount",
    label: "Debit",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Credit_Amount",
    label: "Credit",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Amount",
    label: "Amount",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Remaining_Amount",
    label: "Remaining",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Open",
    label: "Status",
    sortable: true,
    defaultVisible: true,
    filterType: "boolean",
  },
];

// Default columns for Outstanding
export const OUTSTANDING_DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "Entry_No",
    label: "Entry No",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Posting_Date",
    label: "Posting Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
  {
    id: "Document_Type",
    label: "Doc Type",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Document_No",
    label: "Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "External_Document_No",
    label: "Ext. Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "VendorName",
    label: "Vendor Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Amount",
    label: "Amount",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Remaining_Amount",
    label: "Remaining",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Due_Date",
    label: "Due Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
];

export const OPTIONAL_COLUMNS: ColumnConfig[] = [
  {
    id: "Description",
    label: "Description",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Document_Date",
    label: "Document Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Closed_at_Date",
    label: "Closed at Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Vendor_No",
    label: "Vendor No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Invoice_Received_Date",
    label: "Invoice Received Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
];

export const ALL_COLUMNS: ColumnConfig[] = [
  ...LEDGER_DEFAULT_COLUMNS,
  ...OUTSTANDING_DEFAULT_COLUMNS.filter(oc => !LEDGER_DEFAULT_COLUMNS.some(lc => lc.id === oc.id)),
  ...OPTIONAL_COLUMNS,
];

export function getDefaultVisibleColumns(isOutstanding: boolean = false): string[] {
  const columns = isOutstanding ? OUTSTANDING_DEFAULT_COLUMNS : LEDGER_DEFAULT_COLUMNS;
  return columns.map((col) => col.id);
}

export function getColumnById(id: string): ColumnConfig | undefined {
  return ALL_COLUMNS.find((col) => col.id === id);
}

const STORAGE_KEY_LEDGER = "vendorLedger_visibleColumns";
const STORAGE_KEY_OUTSTANDING = "vendorOutstanding_visibleColumns";

export function loadVisibleColumns(isOutstanding: boolean = false): string[] {
  try {
    const key = isOutstanding ? STORAGE_KEY_OUTSTANDING : STORAGE_KEY_LEDGER;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading visible columns:", error);
  }
  return getDefaultVisibleColumns(isOutstanding);
}

export function saveVisibleColumns(columns: string[], isOutstanding: boolean = false): void {
  try {
    const key = isOutstanding ? STORAGE_KEY_OUTSTANDING : STORAGE_KEY_LEDGER;
    localStorage.setItem(key, JSON.stringify(columns));
  } catch (error) {
    console.error("Error saving visible columns:", error);
  }
}
