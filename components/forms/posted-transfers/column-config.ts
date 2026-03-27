import { type ColumnConfig, type SortDirection } from "../production-orders/column-config";
export type { ColumnConfig, SortDirection };

export const POSTED_TRANSFER_COLUMNS: ColumnConfig[] = [
  {
    id: "No",
    label: "No.",
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
    id: "Transfer_from_Code",
    label: "From Location",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Transfer_to_Code",
    label: "To Location",
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
    id: "External_Document_No",
    label: "External Doc No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
];

export const DEFAULT_COLUMNS = POSTED_TRANSFER_COLUMNS.filter(c => c.defaultVisible);
export const OPTIONAL_COLUMNS = POSTED_TRANSFER_COLUMNS.filter(c => !c.defaultVisible);

const STORAGE_KEY = "posted-transfer-columns";

export function getDefaultVisibleColumns(): string[] {
  return POSTED_TRANSFER_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id);
}

export function saveVisibleColumns(columns: string[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }
}

export function loadVisibleColumns(): string[] {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultVisibleColumns();
      }
    }
  }
  return getDefaultVisibleColumns();
}
