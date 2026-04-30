export type SortDirection = "asc" | "desc" | null;

export type FilterType = "text" | "date" | "number" | "select";

export interface ColumnConfig {
  id: string;
  label: string;
  sortable: boolean;
  filterType?: FilterType;
  options?: { label: string; value: string }[];
}

export const OUTWARD_GATE_ENTRY_COLUMNS: ColumnConfig[] = [
  { id: "Entry_Type", label: "Entry Type", sortable: true, filterType: "select", options: [{ label: "Outward", value: "Outward" }] },
  { id: "No", label: "No.", sortable: true, filterType: "text" },
  { id: "Vehicle_No", label: "Vehicle No.", sortable: true, filterType: "text" },
  { id: "Document_Date", label: "Document Date", sortable: true, filterType: "date" },
  { id: "Document_Time", label: "Document Time", sortable: true, filterType: "text" },
  { id: "Location_Code", label: "Location Code", sortable: true, filterType: "text" },
  { id: "Description", label: "Description", sortable: true, filterType: "text" },
  { id: "Transporter_Name", label: "Transporter Name", sortable: true, filterType: "text" },
  { id: "Gross_Weight", label: "Gross Weight", sortable: true, filterType: "number" },
  { id: "Tier_Weight", label: "Tier Weight", sortable: true, filterType: "number" },
  { id: "Net_Weight", label: "Net Weight", sortable: true, filterType: "number" },
  { id: "Per_Bag_Freight_Charges", label: "Per Bag Freight Charges", sortable: true, filterType: "number" },
  { id: "Total_Freight_Amount", label: "Total Freight Amount", sortable: true, filterType: "number" },
  { id: "No_of_Bags", label: "No. of Bags", sortable: true, filterType: "number" },
  { id: "Item_Description", label: "Item Description", sortable: true, filterType: "text" },
  { id: "Station_From_To", label: "Station From/To", sortable: true, filterType: "text" },
  { id: "LR_RR_No", label: "LR/RR No.", sortable: true, filterType: "text" },
];

export const DEFAULT_VISIBLE_COLUMNS = [
  "Entry_Type",
  "No",
  "Vehicle_No",
  "Document_Date",
  "Document_Time",
  "Location_Code",
  "Description",
];
