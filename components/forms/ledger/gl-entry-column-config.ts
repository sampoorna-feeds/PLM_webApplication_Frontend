/**
 * Column Configuration for GL Entry Table
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

export const GL_ENTRY_COLUMNS: ColumnConfig[] = [
  {
    id: "Entry_No",
    label: "Entry No",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "AccNo",
    label: "Account No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "AccName",
    label: "Account Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Descr",
    label: "Description",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "DebAmt",
    label: "Debit",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "CredAmt",
    label: "Credit",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Amt",
    label: "Amount",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
];

export const ALL_COLUMNS: ColumnConfig[] = GL_ENTRY_COLUMNS;

const STORAGE_KEY = "glEntry_visibleColumns_v1";

export function loadVisibleColumns(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading visible columns:", error);
  }
  return GL_ENTRY_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
}

export function saveVisibleColumns(columns: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch (error) {
    console.error("Error saving visible columns:", error);
  }
}
