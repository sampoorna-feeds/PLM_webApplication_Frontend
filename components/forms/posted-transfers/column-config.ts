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
];

export function getDefaultVisibleColumns(): string[] {
  return POSTED_TRANSFER_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id);
}
