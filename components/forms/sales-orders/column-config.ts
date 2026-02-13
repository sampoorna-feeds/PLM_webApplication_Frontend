/**
 * Column Configuration for Sales Orders Table
 * Defines all available columns, their metadata, default visibility, and filter types
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

// Default columns - visible by default
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "No",
    label: "Order No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Sell_to_Customer_No",
    label: "Customer No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Sell_to_Customer_Name",
    label: "Customer Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Order_Date",
    label: "Order Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
  {
    id: "Posting_Date",
    label: "Posting Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
  {
    id: "Document_Date",
    label: "Document Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
  {
    id: "External_Document_No",
    label: "External Doc No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Status",
    label: "Status",
    sortable: true,
    defaultVisible: true,
    filterType: "enum",
  },
  {
    id: "Amt_to_Customer",
    label: "Amount",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
];

// Optional columns - can be toggled by user
export const OPTIONAL_COLUMNS: ColumnConfig[] = [
  {
    id: "Ship_to_Code",
    label: "Ship-to Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Ship_to_Name",
    label: "Ship-to Name",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Location_Code",
    label: "Location",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Invoice_Type",
    label: "Invoice Type",
    sortable: true,
    defaultVisible: false,
    filterType: "enum",
  },
  {
    id: "Shortcut_Dimension_1_Code",
    label: "LOB",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_2_Code",
    label: "Branch",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_3_Code",
    label: "LOC",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Salesperson_Code",
    label: "Salesperson",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
];

// All columns combined
export const ALL_COLUMNS: ColumnConfig[] = [
  ...DEFAULT_COLUMNS,
  ...OPTIONAL_COLUMNS,
];

// Get default visible column IDs
export function getDefaultVisibleColumns(): string[] {
  return ALL_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id);
}

// Get column config by ID
export function getColumnById(id: string): ColumnConfig | undefined {
  return ALL_COLUMNS.find((col) => col.id === id);
}

// Storage key for persisting column preferences
export const COLUMN_VISIBILITY_STORAGE_KEY = "salesOrdersVisibleColumns_v1";

// Load visible columns from localStorage
export function loadVisibleColumns(): string[] {
  if (typeof window === "undefined") {
    return getDefaultVisibleColumns();
  }

  try {
    const stored = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error loading column visibility:", error);
  }

  return getDefaultVisibleColumns();
}

// Save visible columns to localStorage
export function saveVisibleColumns(columns: string[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      COLUMN_VISIBILITY_STORAGE_KEY,
      JSON.stringify(columns),
    );
  } catch (error) {
    console.error("Error saving column visibility:", error);
  }
}

// Build $select query parameter from visible columns
export function buildSelectQuery(visibleColumns: string[]): string {
  const defaultIds = DEFAULT_COLUMNS.map((col) => col.id);
  const allNeeded = [...new Set([...defaultIds, ...visibleColumns])];
  return allNeeded.join(",");
}
