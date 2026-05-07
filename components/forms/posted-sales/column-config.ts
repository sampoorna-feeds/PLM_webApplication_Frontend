export type FilterType = "text" | "number" | "date" | "select" | "boolean";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  filterType?: FilterType;
  options?: { label: string; value: string }[];
}

export type SortDirection = "asc" | "desc" | null;

export const POSTED_SALES_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "No.", visible: true, filterType: "text" },
  { id: "Sell_to_Customer_No", label: "Customer No.", visible: true, filterType: "text" },
  { id: "Sell_to_Customer_Name", label: "Customer Name", visible: true, filterType: "text" },
  { id: "Posting_Date", label: "Posting Date", visible: true, filterType: "date" },
  { id: "Document_Date", label: "Doc. Date", visible: true, filterType: "date" },
  { id: "Location_Code", label: "Location", visible: true, filterType: "text" },
  { id: "Shortcut_Dimension_1_Code", label: "Dim 1", visible: false, filterType: "text" },
  { id: "Shortcut_Dimension_2_Code", label: "Dim 2", visible: false, filterType: "text" },
  { id: "Bill_to_Customer_No", label: "Bill-to Customer No.", visible: false, filterType: "text" },
  { id: "Bill_to_Name", label: "Bill-to Name", visible: false, filterType: "text" },
  { id: "Salesperson_Code", label: "Salesperson", visible: false, filterType: "text" },
];
