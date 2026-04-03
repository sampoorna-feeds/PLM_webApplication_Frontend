export interface ColumnConfig {
  id: string;
  label: string;
  filterType: "text" | "number" | "boolean" | "date";
}

export const VENDOR_LEDGER_COLUMNS: ColumnConfig[] = [
  { id: "Entry_No", label: "Entry No.", filterType: "number" },
  { id: "Posting_Date", label: "Posting Date", filterType: "date" },
  { id: "Document_Type", label: "Doc Type", filterType: "text" },
  { id: "Document_No", label: "Doc No.", filterType: "text" },
  { id: "External_Document_No", label: "Ext. Doc No.", filterType: "text" },
  { id: "Vendor_No", label: "Vendor No", filterType: "text" },
  { id: "VendorName", label: "Vendor Name", filterType: "text" },
  { id: "Description", label: "Description", filterType: "text" },
  { id: "Debit_Amount", label: "Debit", filterType: "number" },
  { id: "Credit_Amount", label: "Credit", filterType: "number" },
  { id: "Amount", label: "Amount", filterType: "number" },
  { id: "Remaining_Amount", label: "Remaining", filterType: "number" },
  { id: "Due_Date", label: "Due Date", filterType: "date" },
  { id: "Document_Date", label: "Doc Date", filterType: "date" },
  { id: "Closed_at_Date", label: "Closed Date", filterType: "date" },
  { id: "Open", label: "Open", filterType: "boolean" },
  { id: "Invoice_Received_Date", label: "Inv. Rec. Date", filterType: "date" },
];
