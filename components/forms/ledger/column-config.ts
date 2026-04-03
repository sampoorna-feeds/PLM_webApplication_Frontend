export interface ColumnConfig {
  id: string;
  label: string;
  filterType: "text" | "number" | "boolean" | "date";
}

export const VENDOR_LEDGER_COLUMNS: ColumnConfig[] = [
  // ── Core Identification ──
  { id: "Entry_No", label: "Entry No.", filterType: "number" },
  { id: "Posting_Date", label: "Posting Date", filterType: "date" },
  { id: "Document_Type", label: "Doc Type", filterType: "text" },
  { id: "Document_No", label: "Doc No.", filterType: "text" },
  { id: "External_Document_No", label: "Ext. Doc No.", filterType: "text" },
  { id: "Vendor_No", label: "Vendor No.", filterType: "text" },
  { id: "VendorName", label: "Vendor Name", filterType: "text" },

  // ── Financials ──
  { id: "Debit_Amount", label: "Debit", filterType: "number" },
  { id: "Credit_Amount", label: "Credit", filterType: "number" },
  { id: "Amount", label: "Amount", filterType: "number" },
  { id: "Remaining_Amount", label: "Remaining", filterType: "number" },
  { id: "Amount_LCY", label: "Amount (LCY)", filterType: "number" },
  { id: "Debit_Amount_LCY", label: "Debit (LCY)", filterType: "number" },
  { id: "Credit_Amount_LCY", label: "Credit (LCY)", filterType: "number" },
  { id: "Original_Amount", label: "Original Amount", filterType: "number" },
  { id: "Closed_by_Amount", label: "Closed by Amt.", filterType: "number" },

  // ── Dates ──
  { id: "Due_Date", label: "Due Date", filterType: "date" },
  { id: "Document_Date", label: "Doc Date", filterType: "date" },
  { id: "Closed_at_Date", label: "Closed Date", filterType: "date" },
  { id: "Invoice_Received_Date", label: "Inv. Rec. Date", filterType: "date" },

  // ── Payment & Compliance ──
  { id: "Payment_Method_Code", label: "Payment Method", filterType: "text" },
  { id: "Payment_Reference", label: "Payment Ref.", filterType: "text" },
  { id: "TDS_Section_Code", label: "TDS Section", filterType: "text" },
  { id: "GST_Vendor_Type", label: "GST Vendor Type", filterType: "text" },
  { id: "GST_Jurisdiction_Type", label: "GST Jurisdiction", filterType: "text" },
  { id: "GST_Reverse_Charge", label: "GST Rev. Charge", filterType: "boolean" },
  { id: "Open", label: "Status (Open)", filterType: "boolean" },
  { id: "On_Hold", label: "On Hold", filterType: "text" },

  // ── Dimensions & Location ──
  { id: "Global_Dimension_1_Code", label: "Global Dimension 1 Code", filterType: "text" },
  { id: "Global_Dimension_2_Code", label: "Global Dimension 2 Code", filterType: "text" },
  { id: "Shortcut_Dimension_3_Code", label: "Shortcut Dim 3 Code", filterType: "text" },
  { id: "Location_Code", label: "Location Code", filterType: "text" },
  { id: "Location_State_Code", label: "Location State", filterType: "text" },
  { id: "Buyer_State_Code", label: "Buyer State", filterType: "text" },

  // ── Tracking ──
  { id: "User_ID", label: "User ID", filterType: "text" },
  { id: "Source_Code", label: "Source Code", filterType: "text" },
  { id: "Reason_Code", label: "Reason Code", filterType: "text" },
  { id: "IC_Partner_Code", label: "IC Partner", filterType: "text" },
  { id: "Purchaser_Code", label: "Purchaser Code", filterType: "text" },
  { id: "Creditors_Type", label: "Creditors Type", filterType: "text" },
  { id: "Mandi_Name", label: "Mandi Name", filterType: "text" },
];
