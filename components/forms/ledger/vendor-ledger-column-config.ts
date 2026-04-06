/**
 * Column Configuration for Vendor Ledger Table
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

// Default columns for Ledger
export const LEDGER_DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "Entry_No",
    label: "Entry No",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Posting_Date",
    label: "Posting Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
  {
    id: "Document_Type",
    label: "Doc Type",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Document_No",
    label: "Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "External_Document_No",
    label: "Ext. Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "VendorName",
    label: "Vendor Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Debit_Amount",
    label: "Debit",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Credit_Amount",
    label: "Credit",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Amount",
    label: "Amount",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Remaining_Amount",
    label: "Remaining",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Open",
    label: "Status",
    sortable: true,
    defaultVisible: true,
    filterType: "boolean",
  },
];

// Default columns for Outstanding
export const OUTSTANDING_DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: "Entry_No",
    label: "Entry No",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Posting_Date",
    label: "Posting Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
  {
    id: "Document_Type",
    label: "Doc Type",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Document_No",
    label: "Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "External_Document_No",
    label: "Ext. Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "VendorName",
    label: "Vendor Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Amount",
    label: "Amount",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Remaining_Amount",
    label: "Remaining",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
  {
    id: "Due_Date",
    label: "Due Date",
    sortable: true,
    defaultVisible: true,
    filterType: "date",
  },
];

export const OPTIONAL_COLUMNS: ColumnConfig[] = [
  // ── Financial Balance & Advanced ──
  {
    id: "Amount_LCY",
    label: "Amount (LCY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Debit_Amount_LCY",
    label: "Debit (LCY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Credit_Amount_LCY",
    label: "Credit (LCY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Original_Amount",
    label: "Original Amount",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Original_Amt_LCY",
    label: "Original Amount (LCY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Remaining_Amt_LCY",
    label: "Remaining Amount (LCY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "RunningBalanceLCY",
    label: "Running Balance (LCY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Closed_by_Amount",
    label: "Closed by Amount",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },

  // ── Payment & Compliance ──
  {
    id: "Payment_Method_Code",
    label: "Payment Method",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Payment_Reference",
    label: "Payment Reference",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "RecipientBankAcc",
    label: "Recipient Bank Acc.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Message_to_Recipient",
    label: "Message to Recipient",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "TDS_Section_Code",
    label: "TDS Section",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "GST_Vendor_Type",
    label: "GST Vendor Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "GST_Jurisdiction_Type",
    label: "GST Jurisdiction",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "GST_Group_Code",
    label: "GST Group Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "HSN_SAC_Code",
    label: "HSN/SAC Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "GST_Reverse_Charge",
    label: "GST Reverse Charge",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "GST_on_Advance_Payment",
    label: "GST on Advance",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },

  // ── Location & State ──
  {
    id: "Location_Code",
    label: "Location Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Location_GST_Reg_No",
    label: "Location GST No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Location_State_Code",
    label: "Location State",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Buyer_State_Code",
    label: "Buyer State",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Buyer_GST_Reg_No",
    label: "Buyer GST No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Document Metadata ──
  {
    id: "Description",
    label: "Description",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Document_Date",
    label: "Document Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Closed_at_Date",
    label: "Closed at Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Invoice_Received_Date",
    label: "Invoice Received Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Vendor_No",
    label: "Vendor No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Vendor_Posting_Group",
    label: "Vendor Posting Group",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Currency_Code",
    label: "Currency Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "On_Hold",
    label: "On Hold",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Entity & Tracking ──
  {
    id: "IC_Partner_Code",
    label: "IC Partner Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Purchaser_Code",
    label: "Purchaser Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Creditor_No",
    label: "Creditor No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Remit_to_Code",
    label: "Remit to Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Bal_Account_Type",
    label: "Bal. Account Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Bal_Account_No",
    label: "Bal. Account No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Dimensions ──
  {
    id: "Global_Dimension_1_Code",
    label: "Global Dimension 1 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Global_Dimension_2_Code",
    label: "Global Dimension 2 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_3_Code",
    label: "Shortcut Dimension 3 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_4_Code",
    label: "Shortcut Dimension 4 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_5_Code",
    label: "Shortcut Dimension 5 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_6_Code",
    label: "Shortcut Dimension 6 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_7_Code",
    label: "Shortcut Dimension 7 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_8_Code",
    label: "Shortcut Dimension 8 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Dimension_Set_ID",
    label: "Dimension Set ID",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },

  // ── Compliance & Tracking ──
  {
    id: "Creditors_Type",
    label: "Creditors Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Mandi_Name",
    label: "Mandi Name",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Line_Narration1",
    label: "Line Narration",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "User_ID",
    label: "User ID",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Source_Code",
    label: "Source Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Reason_Code",
    label: "Reason Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Reversed",
    label: "Reversed",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "SystemCreatedAt",
    label: "System Created At",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
];

export const ALL_COLUMNS: ColumnConfig[] = [
  ...LEDGER_DEFAULT_COLUMNS,
  ...OUTSTANDING_DEFAULT_COLUMNS.filter(oc => !LEDGER_DEFAULT_COLUMNS.some(lc => lc.id === oc.id)),
  ...OPTIONAL_COLUMNS,
];

export function getDefaultVisibleColumns(isOutstanding: boolean = false): string[] {
  const columns = isOutstanding ? OUTSTANDING_DEFAULT_COLUMNS : LEDGER_DEFAULT_COLUMNS;
  return columns.map((col) => col.id);
}

export function getColumnById(id: string): ColumnConfig | undefined {
  return ALL_COLUMNS.find((col) => col.id === id);
}

const STORAGE_KEY_LEDGER = "vendorLedger_visibleColumns_v2";
const STORAGE_KEY_OUTSTANDING = "vendorOutstanding_visibleColumns_v2";

export function loadVisibleColumns(isOutstanding: boolean = false): string[] {
  try {
    const key = isOutstanding ? STORAGE_KEY_OUTSTANDING : STORAGE_KEY_LEDGER;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading visible columns:", error);
  }
  return getDefaultVisibleColumns(isOutstanding);
}

export function saveVisibleColumns(columns: string[], isOutstanding: boolean = false): void {
  try {
    const key = isOutstanding ? STORAGE_KEY_OUTSTANDING : STORAGE_KEY_LEDGER;
    localStorage.setItem(key, JSON.stringify(columns));
  } catch (error) {
    console.error("Error saving visible columns:", error);
  }
}

const WIDTHS_KEY = "vendorLedger_columnWidths";
const ORDER_KEY = "vendorLedger_columnOrder";

export function loadColumnWidths(): Record<string, number> {
  try {
    const stored = localStorage.getItem(WIDTHS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

export function saveColumnWidths(widths: Record<string, number>): void {
  try {
    localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths));
  } catch (error) {}
}

export function loadColumnOrder(): string[] {
  try {
    const stored = localStorage.getItem(ORDER_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

export function saveColumnOrder(order: string[]): void {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch (error) {}
}

export function resetVendorTableUI(): void {
  try {
    localStorage.removeItem(WIDTHS_KEY);
    localStorage.removeItem(ORDER_KEY);
  } catch (error) {}
}

