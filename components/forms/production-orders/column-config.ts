/**
 * Column Configuration for Production Orders Table
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

// Default columns - always fetched and visible by default
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "No",
    label: "Order No",
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
    id: "Source_No",
    label: "Source No",
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
  {
    id: "Location_Code",
    label: "Location",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Last_Date_Modified",
    label: "Last Modified",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
];

// Optional columns - can be toggled by user
export const OPTIONAL_COLUMNS: ColumnConfig[] = [
  {
    id: "Status",
    label: "Status",
    sortable: true,
    defaultVisible: false,
    filterType: "enum",
  },
  {
    id: "Source_Type",
    label: "Source Type",
    sortable: true,
    defaultVisible: false,
    filterType: "enum",
  },
  {
    id: "Description_2",
    label: "Description 2",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Search_Description",
    label: "Search Description",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Supervisor_Name",
    label: "Supervisor",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Due_Date",
    label: "Due Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Blocked",
    label: "Blocked",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Hatching_Date",
    label: "Hatching Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Prod_Bom_No",
    label: "Prod BOM No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "BOM_Version_No",
    label: "BOM Version",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Batch_Size",
    label: "Batch Size",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Starting_Date",
    label: "Starting Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Ending_Date",
    label: "Ending Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
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
    filterType: "enum",
  },
  {
    id: "Shortcut_Dimension_3_Code",
    label: "LOC",
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
export const COLUMN_VISIBILITY_STORAGE_KEY =
  "productionOrdersVisibleColumns_v2";

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
  // Always include default columns for data fetching
  const defaultIds = DEFAULT_COLUMNS.map((col) => col.id);
  // Always include Search_Description for search filtering (even if not displayed)
  const requiredForSearch = ["Search_Description"];
  const allNeeded = [
    ...new Set([...defaultIds, ...requiredForSearch, ...visibleColumns]),
  ];
  return allNeeded.join(",");
}
