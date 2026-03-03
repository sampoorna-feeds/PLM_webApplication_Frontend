/**
 * Column Configuration for Report Ledger (Item Ledger Entries) Table
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

// Default columns - visible by default
export const DEFAULT_COLUMNS: ColumnConfig[] = [
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
    id: "Entry_Type",
    label: "Entry Type",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Document_No",
    label: "Document No",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Item_No",
    label: "Item No",
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
    id: "Location_Code",
    label: "Location",
    sortable: true,
    defaultVisible: true,
    filterType: "text",
  },
  {
    id: "Quantity",
    label: "Quantity",
    sortable: true,
    defaultVisible: true,
    filterType: "number",
  },
];

// Optional columns - can be toggled by user
// Ordered: commonly used fields first, then document/order, dimensions, booleans, niche
export const OPTIONAL_COLUMNS: ColumnConfig[] = [
  // ── Commonly used ──
  {
    id: "Item_Name",
    label: "Item Name",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Location_Name",
    label: "Location Name",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Item_Type",
    label: "Item Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Item_Category_Code",
    label: "Item Category Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Unit_of_Measure_Code",
    label: "UOM",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Variant_Code",
    label: "Variant Code",
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
    label: "Source No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Quantities ──
  {
    id: "Invoiced_Quantity",
    label: "Invoiced Qty",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Remaining_Quantity",
    label: "Remaining Qty",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Shipped_Qty_Not_Returned",
    label: "Shipped Qty Not Returned",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Reserved_Quantity",
    label: "Reserved Qty",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Qty_per_Unit_of_Measure",
    label: "Qty per UOM",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Alternate_Quantity",
    label: "Alternate Qty",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Alternate_UOM",
    label: "Alternate UOM",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Financial ──
  {
    id: "Cost_Amount_Actual",
    label: "Cost Amount Actual",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Cost_Amount_Expected",
    label: "Cost Amount Expected",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Cost_Amount_Non_Invtbl",
    label: "Cost Amount Non-Invtbl",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Sales_Amount_Actual",
    label: "Sales Amount Actual",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Sales_Amount_Expected",
    label: "Sales Amount Expected",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Purchase_Amount_Actual",
    label: "Purchase Amount Actual",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Purchase_Amount_Expected",
    label: "Purchase Amount Expected",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "MRP_Price",
    label: "MRP Price",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Cost_Amount_Expected_ACY",
    label: "Cost Expected (ACY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Cost_Amount_Actual_ACY",
    label: "Cost Actual (ACY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Cost_Amount_Non_Invtbl_ACY",
    label: "Cost Non-Invtbl (ACY)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },

  // ── Document / Order ──
  {
    id: "Document_Type",
    label: "Document Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Document_Line_No",
    label: "Document Line No",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Document_Date",
    label: "Document Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "External_Document_No",
    label: "External Doc No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Invoice_No",
    label: "Invoice No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "No_Series",
    label: "No. Series",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Return_Reason_Code",
    label: "Return Reason Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Order_Type",
    label: "Order Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Order_No",
    label: "Order No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Order_Line_No",
    label: "Order Line No",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Purchasing_Code",
    label: "Purchasing Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Subcon_Order_No",
    label: "Subcon Order No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Tracking / Lot / Serial ──
  {
    id: "Lot_No",
    label: "Lot No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Serial_No",
    label: "Serial No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Package_No",
    label: "Package No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Item_Tracking",
    label: "Item Tracking",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Item_Reference_No",
    label: "Item Reference No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Dates ──
  {
    id: "Manufacturing_Date",
    label: "Manufacturing Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Expiration_Date",
    label: "Expiration Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },
  {
    id: "Last_Invoice_Date",
    label: "Last Invoice Date",
    sortable: true,
    defaultVisible: false,
    filterType: "date",
  },

  // ── Dimensions ──
  {
    id: "Global_Dimension_1_Code",
    label: "LOB Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Global_Dimension_2_Code",
    label: "Branch Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_3_Code",
    label: "Dimension 3 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_4_Code",
    label: "Dimension 4 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_5_Code",
    label: "Dimension 5 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_6_Code",
    label: "Dimension 6 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_7_Code",
    label: "Dimension 7 Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Shortcut_Dimension_8_Code",
    label: "Dimension 8 Code",
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

  // ── Shipping / Transport ──
  {
    id: "Shpt_Method_Code",
    label: "Shipment Method",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Country_Region_Code",
    label: "Country/Region",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Area",
    label: "Area",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Entry_Exit_Point",
    label: "Entry/Exit Point",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Transaction_Type",
    label: "Transaction Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Transaction_Specification",
    label: "Transaction Specification",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Transport_Method",
    label: "Transport Method",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },

  // ── Running Balances ──
  {
    id: "RunningBalance",
    label: "Running Balance",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "RunningBalanceLoc",
    label: "Running Balance (Location)",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },

  // ── Boolean Flags ──
  {
    id: "Positive",
    label: "Positive",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Open",
    label: "Open",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Completely_Invoiced",
    label: "Completely Invoiced",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Correction",
    label: "Correction",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Reject",
    label: "Reject",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Consumption",
    label: "Consumption",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "In_transit_Mortality",
    label: "In-transit Mortality",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Bardana_Generation_Entry",
    label: "Bardana Generation Entry",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Drop_Shipment",
    label: "Drop Shipment",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Assemble_to_Order",
    label: "Assemble to Order",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Applied_Entry_to_Adjust",
    label: "Applied Entry to Adjust",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Derived_from_Blanket_Order",
    label: "Derived from Blanket Order",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Nonstock",
    label: "Nonstock",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Out_of_Stock_Substitution",
    label: "Out of Stock Substitution",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },
  {
    id: "Job_Purchase",
    label: "Job Purchase",
    sortable: true,
    defaultVisible: false,
    filterType: "boolean",
  },

  // ── Miscellaneous ──
  {
    id: "Applies_to_Entry",
    label: "Applies-to Entry",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Flock_No",
    label: "Flock No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Originally_Ordered_No",
    label: "Originally Ordered No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Originally_Ordered_Var_Code",
    label: "Originally Ordered Var Code",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Prod_Order_Comp_Line_No",
    label: "Prod Order Comp Line No",
    sortable: true,
    defaultVisible: false,
    filterType: "number",
  },
  {
    id: "Job_No",
    label: "Job No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Job_Task_No",
    label: "Job Task No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Data_Entry_Type",
    label: "Data Entry Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Laying_Entry_Type",
    label: "Laying Entry Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Hatching_Entry_Type",
    label: "Hatching Entry Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Descriptive_Entry_Type",
    label: "Descriptive Entry Type",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
  {
    id: "Data_Entry_Sheet_No",
    label: "Data Entry Sheet No",
    sortable: true,
    defaultVisible: false,
    filterType: "text",
  },
];

// All columns combined
export const ALL_COLUMNS: ColumnConfig[] = [
  ...DEFAULT_COLUMNS,
  ...OPTIONAL_COLUMNS,
];

// Get default visible columns
export function getDefaultVisibleColumns(): string[] {
  return ALL_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id);
}

// Get column config by ID
export function getColumnById(id: string): ColumnConfig | undefined {
  return ALL_COLUMNS.find((col) => col.id === id);
}

// Build $select query string from visible columns
export function buildSelectQuery(visibleColumns: string[]): string {
  // Always include Entry_No as a unique identifier even if not visible
  const columns = new Set(["Entry_No", ...visibleColumns]);
  return Array.from(columns).join(",");
}

// Storage key for persisting visible columns
const STORAGE_KEY = "reportLedger_visibleColumns";

// Load visible columns from localStorage
export function loadVisibleColumns(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading visible columns:", error);
  }
  return getDefaultVisibleColumns();
}

// Save visible columns to localStorage
export function saveVisibleColumns(columns: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch (error) {
    console.error("Error saving visible columns:", error);
  }
}
