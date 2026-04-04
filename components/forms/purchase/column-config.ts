/**
 * Column Configuration for Purchase Orders Table
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
    id: "Buy_from_Vendor_No",
    label: "Vendor No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Buy_from_Vendor_Name",
    label: "Vendor Name",
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
    id: "Status",
    label: "Status",
    sortable: true,
    defaultVisible: true,
    filterType: "enum",
  },
];

// Optional columns - can be toggled by user
export const OPTIONAL_COLUMNS: ColumnConfig[] = [
  {
    id: "Order_Address_Code",
    label: "Order Address Code",
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
    id: "Purchaseperson_Code",
    label: "Salesperson",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "PO_Type",
    label: "PO Type",
    sortable: true,
    defaultVisible: false,
    filterType: "enum",
  },
  {
    id: "Service_Type",
    label: "Service Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Vendor_GST_Reg_No",
    label: "Vendor GST",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "P_A_N_No",
    label: "Vendor PAN",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Broker_Name",
    label: "Broker",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Brokerage_Rate",
    label: "Brokerage Rate",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Rate_Basis",
    label: "Rate Basis",
    sortable: true,
    defaultVisible: false,
    filterType: "enum",
  },
  {
    id: "Term_Code",
    label: "Term Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Payment_Term_Code",
    label: "Payment Term",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Due_Date_Calculation",
    label: "Due Date Calc",
    sortable: true,
    defaultVisible: false,
    filterType: "enum",
  },
  {
    id: "Creditor_Type",
    label: "Creditor Type",
    sortable: true,
    defaultVisible: false,
    filterType: "enum",
  },
  {
    id: "QC_Type",
    label: "QC Type",
    sortable: true,
    defaultVisible: false,
    filterType: "enum",
  },
  {
    id: "Due_Date",
    label: "Due Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
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
export const COLUMN_VISIBILITY_STORAGE_KEY = "purchaseOrdersVisibleColumns_v1";

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
