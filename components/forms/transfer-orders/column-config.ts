/**
 * Column Configuration for Transfer Orders Table
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

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "No",
    label: "Transfer order No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Transfer_from_Code",
    label: "Transfer-from Code",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Transfer_from_Name",
    label: "Transfer-from Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Transfer_to_Code",
    label: "Transfer-to Code",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Transfer_to_Name",
    label: "Transfer-to Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Posting_Date",
    label: "Posting Date",
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
    id: "External_Document_No",
    label: "External Document No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "In_Transit_Code",
    label: "In-Transit Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Vehicle_No",
    label: "Vehicle No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "LR_RR_No",
    label: "LR/RR No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "LR_RR_Date",
    label: "LR/RR Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Distance_Km",
    label: "Distance (Km)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Freight_Value",
    label: "Freight Value",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Transporter_Code",
    label: "Transporter Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Transporter_Name",
    label: "Transporter Name",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Mode_of_Transport",
    label: "Mode of Transport",
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
export const COLUMN_VISIBILITY_STORAGE_KEY = "transferOrdersVisibleColumns_v1";

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
