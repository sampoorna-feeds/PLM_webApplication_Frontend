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
  // ── Core Financial Fields (Default Visible) ──
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
    id: "Document_No",
    label: "Doc No.",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "G_L_Account_No",
    label: "Account No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "G_L_Account_Name",
    label: "Account Name",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Description",
    label: "Description",
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

  // ── Document Metadata ──
  {
    id: "Document_Type",
    label: "Doc Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Document_Date",
    label: "Doc Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "External_Document_No",
    label: "Ext. Doc No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Line_Narration",
    label: "Narration",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Comment",
    label: "Comment",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Dimensions & Classification ──
  {
    id: "Global_Dimension_1_Code",
    label: "Global Dim 1",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Global_Dimension_2_Code",
    label: "Global Dim 2",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_3_Code",
    label: "Dim 3",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_4_Code",
    label: "Dim 4",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_5_Code",
    label: "Dim 5",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_6_Code",
    label: "Dim 6",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_7_Code",
    label: "Dim 7",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_8_Code",
    label: "Dim 8",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Dimension_Set_ID",
    label: "Dim Set ID",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Business_Unit_Code",
    label: "Business Unit",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Detailed Financials ──
  {
    id: "RunningBalance",
    label: "Running Balance",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "VAT_Amount",
    label: "VAT Amount",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Quantity",
    label: "Quantity",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Additional_Currency_Amount",
    label: "Add. Curr. Amt",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "RunningBalanceACY",
    label: "Running Bal (ACY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "NonDeductibleVATAmount",
    label: "Non-Deduct. VAT",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },

  // ── Balancing Posting ──
  {
    id: "Bal_Account_Type",
    label: "Bal. Acc Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Bal_Account_No",
    label: "Bal. Acc No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Bal_Account_Name",
    label: "Bal. Acc Name",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Audit & Tracking ──
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
    id: "Source_Type",
    label: "Source Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Source_No",
    label: "Source No.",
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
    id: "Entry_Date",
    label: "Entry Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "VAT_Reporting_Date",
    label: "VAT Report Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Reversed",
    label: "Reversed",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },

  // ── Advanced / Operational ──
  {
    id: "Job_No",
    label: "Job No.",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "IC_Partner_Code",
    label: "IC Partner",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Flock_Code",
    label: "Flock Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "FEED_Freight_Charge",
    label: "Freight Charge",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
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
