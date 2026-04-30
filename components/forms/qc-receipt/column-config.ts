/**
 * Column Configuration for QC Receipt Table
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
    label: "QC No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Item_No",
    label: "Item No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Item_Name",
    label: "Item Name",
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
    id: "Vehicle_No",
    label: "Vehicle No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "QC_Date",
    label: "QC Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
  {
    id: "Approval_Status",
    label: "Status",
    sortable: true,
    defaultVisible: true,
    filterType: "enum",
  },
  {
    id: "Inspection_Quantity",
    label: "Insp. Qty",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
];

export const OPTIONAL_COLUMNS: ColumnConfig[] = [
  {
    id: "Purchase_Order_No",
    label: "PO No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Receipt_Date",
    label: "Receipt Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Location_Code",
    label: "Location",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
];

export const ALL_COLUMNS: ColumnConfig[] = [
  ...DEFAULT_COLUMNS,
  ...OPTIONAL_COLUMNS,
];

export function getDefaultVisibleColumns(): string[] {
  return ALL_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id);
}

export function getColumnById(id: string): ColumnConfig | undefined {
  return ALL_COLUMNS.find((col) => col.id === id);
}

export const COLUMN_VISIBILITY_STORAGE_KEY = "qcReceiptsVisibleColumns_v1";

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

export const REQUIRED_DETAIL_FIELDS = [
  "Unit_of_Measure",
  "Quantity_to_Accept",
  "Qty_to_Accept_with_Deviation",
  "Quantity_to_Reject",
  "Approve",
  "Accepted_With_Approval",
  "Create_Bardana",
  "Rabete_Percent",
  "Store_Location_Code",
  "Comment",
  "Receipt_Date",
  "Location_Code",
  "Buy_from_Vendor_No",
  "Buy_from_Vendor_Name",
  "Purchase_Order_No",
  "Purchase_Receipt_No",
  "Item_Tracking",
];

export function buildSelectQuery(visibleColumns: string[]): string {
  const defaultIds = DEFAULT_COLUMNS.map((col) => col.id);
  const allNeeded = [...new Set([...defaultIds, ...visibleColumns, ...REQUIRED_DETAIL_FIELDS])];
  return allNeeded.join(",");
}
