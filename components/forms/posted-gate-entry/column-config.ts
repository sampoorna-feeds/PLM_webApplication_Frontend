export interface Column {
  id: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: "text" | "date" | "number" | "enum";
}

export type SortDirection = "asc" | "desc" | null;

export const POSTED_GATE_ENTRY_COLUMNS: Column[] = [
  { id: "No", label: "No.", sortable: true, filterable: true, type: "text" },
  { id: "Entry_Type", label: "Entry Type", sortable: true, filterable: true, type: "text" },
  { id: "Location_Code", label: "Location", sortable: true, filterable: true, type: "text" },
  { id: "Station_From_To", label: "Station From/To", sortable: true, filterable: true, type: "text" },
  { id: "Description", label: "Description", sortable: true, filterable: true, type: "text" },
  { id: "Item_Description", label: "Item Description", sortable: true, filterable: true, type: "text" },
  { id: "Document_Date", label: "Doc. Date", sortable: true, filterable: true, type: "date" },
  { id: "Vehicle_No", label: "Vehicle No.", sortable: true, filterable: true, type: "text" },
  { id: "LR_RR_No", label: "LR/RR No.", sortable: true, filterable: true, type: "text" },
  { id: "Transporter_Name", label: "Transporter", sortable: true, filterable: true, type: "text" },
];

export const DEFAULT_VISIBLE_COLUMNS = [
  "No",
  "Document_Date",
  "Vehicle_No",
  "Transporter_Name",
  "Description",
  "Location_Code",
];
