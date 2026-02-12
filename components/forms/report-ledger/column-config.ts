/**
 * Column Configuration for Report Ledger (Item Ledger Entries) Table
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

// Default columns - visible by default
export const DEFAULT_COLUMNS: ColumnConfig[] = [
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
    id: "Entry_Type",
    label: "Entry Type",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Document_No",
    label: "Document No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Item_No",
    label: "Item No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Description",
    label: "Description",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Location_Code",
    label: "Location",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Quantity",
    label: "Quantity",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
];

// Optional columns - can be toggled by user
export const OPTIONAL_COLUMNS: ColumnConfig[] = [
  {
    id: "Document_Type",
    label: "Document Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Document_Line_No",
    label: "Document Line No",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Item_Type",
    label: "Item Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Lot_No",
    label: "Lot No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Serial_No",
    label: "Serial No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Unit_of_Measure_Code",
    label: "UOM",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Remaining_Quantity",
    label: "Remaining Qty",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Invoiced_Quantity",
    label: "Invoiced Qty",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Global_Dimension_1_Code",
    label: "LOB Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Global_Dimension_2_Code",
    label: "Branch Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Source_Type",
    label: "Source Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Source_No",
    label: "Source No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "External_Document_No",
    label: "External Doc No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Manufacturing_Date",
    label: "Manufacturing Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Expiration_Date",
    label: "Expiration Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Open",
    label: "Open",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Positive",
    label: "Positive",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
];

// All columns combined
export const ALL_COLUMNS: ColumnConfig[] = [
  ...DEFAULT_COLUMNS,
  ...OPTIONAL_COLUMNS,
];

// Get default visible columns
export function getDefaultVisibleColumns(): string[] {
  return ALL_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id);
}

// Get column config by ID
export function getColumnById(id: string): ColumnConfig | undefined {
  return ALL_COLUMNS.find((col) => col.id === id);
}

// Build $select query string from visible columns
export function buildSelectQuery(visibleColumns: string[]): string {
  // Always include Entry_No as a unique identifier even if not visible
  const columns = new Set(["Entry_No", ...visibleColumns]);
  return Array.from(columns).join(",");
}

// Storage key for persisting visible columns
const STORAGE_KEY = "reportLedger_visibleColumns";

// Load visible columns from localStorage
export function loadVisibleColumns(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading visible columns:", error);
  }
  return getDefaultVisibleColumns();
}

// Save visible columns to localStorage
export function saveVisibleColumns(columns: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch (error) {
    console.error("Error saving visible columns:", error);
  }
}
