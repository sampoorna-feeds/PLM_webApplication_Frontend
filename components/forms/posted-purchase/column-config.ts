export type FilterType = "text" | "number" | "date" | "select" | "boolean";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  filterType?: FilterType;
  options?: { label: string; value: string }[];
}

export type SortDirection = "asc" | "desc" | null;

export const POSTED_PURCHASE_COLUMNS: ColumnConfig[] = [
  { id: "No", label: "No.", visible: true, filterType: "text" },
  { id: "Buy_from_Vendor_No", label: "Vendor No.", visible: true, filterType: "text" },
  { id: "Buy_from_Vendor_Name", label: "Vendor Name", visible: true, filterType: "text" },
  { id: "Posting_Date", label: "Posting Date", visible: true, filterType: "date" },
  { id: "Document_Date", label: "Doc. Date", visible: true, filterType: "date" },
  { id: "Location_Code", label: "Location", visible: true, filterType: "text" },
  { id: "Shortcut_Dimension_1_Code", label: "Dim 1", visible: false, filterType: "text" },
  { id: "Shortcut_Dimension_2_Code", label: "Dim 2", visible: false, filterType: "text" },
  { id: "Pay_to_Vendor_No", label: "Pay-to Vendor No.", visible: false, filterType: "text" },
  { id: "Pay_to_Name", label: "Pay-to Name", visible: false, filterType: "text" },
  { id: "Purchaser_Code", label: "Purchaser", visible: false, filterType: "text" },
];
