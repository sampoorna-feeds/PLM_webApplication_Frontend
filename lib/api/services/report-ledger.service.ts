/**
 * Report Ledger API Service
 * Handles fetching report ledger entries from ERP OData V4 API
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface GetItemLedgerEntriesParams {
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $count?: boolean;
}

export interface ItemLedgerEntry {
  Entry_No?: number;
  Posting_Date?: string;
  Entry_Type?: string;
  Document_Type?: string;
  Document_No?: string;
  Item_Type?: string;
  Flock_No?: string;
  Document_Line_No?: number;
  Item_No?: string;
  Item_Name?: string;
  MRP_Price?: number;
  Bardana_Generation_Entry?: boolean;
  Variant_Code?: string;
  Description?: string;
  Unit_of_Measure_Code?: string;
  Return_Reason_Code?: string;
  Global_Dimension_1_Code?: string;
  Global_Dimension_2_Code?: string;
  Manufacturing_Date?: string;
  Expiration_Date?: string;
  Serial_No?: string;
  Lot_No?: string;
  Package_No?: string;
  Location_Code?: string;
  Quantity?: number;
  RunningBalance?: number;
  RunningBalanceLoc?: number;
  Invoiced_Quantity?: number;
  Remaining_Quantity?: number;
  Applies_to_Entry?: number;
  Area?: string;
  Correction?: boolean;
  Country_Region_Code?: string;
  Derived_from_Blanket_Order?: boolean;
  Document_Date?: string;
  Entry_Exit_Point?: string;
  External_Document_No?: string;
  Item_Category_Code?: string;
  Item_Reference_No?: string;
  Item_Tracking?: string;
  Job_Purchase?: boolean;
  Last_Invoice_Date?: string;
  Reject?: boolean;
  No_Series?: string;
  Nonstock?: boolean;
  Originally_Ordered_No?: string;
  Originally_Ordered_Var_Code?: string;
  Out_of_Stock_Substitution?: boolean;
  Positive?: boolean;
  Purchase_Amount_Actual?: number;
  Purchase_Amount_Expected?: number;
  Purchasing_Code?: string;
  Shpt_Method_Code?: string;
  Source_No?: string;
  Source_Type?: string;
  Subcon_Order_No?: string;
  SystemCreatedAt?: string;
  SystemCreatedBy?: string;
  SystemId?: string;
  SystemModifiedAt?: string;
  SystemModifiedBy?: string;
  Transaction_Specification?: string;
  Transaction_Type?: string;
  Transport_Method?: string;
  Invoice_No?: string;
  Shipped_Qty_Not_Returned?: number;
  Reserved_Quantity?: number;
  Qty_per_Unit_of_Measure?: number;
  Sales_Amount_Expected?: number;
  Sales_Amount_Actual?: number;
  Cost_Amount_Expected?: number;
  Cost_Amount_Actual?: number;
  Cost_Amount_Non_Invtbl?: number;
  Cost_Amount_Expected_ACY?: number;
  Cost_Amount_Actual_ACY?: number;
  Cost_Amount_Non_Invtbl_ACY?: number;
  Completely_Invoiced?: boolean;
  Open?: boolean;
  Drop_Shipment?: boolean;
  Assemble_to_Order?: boolean;
  Applied_Entry_to_Adjust?: boolean;
  Order_Type?: string;
  Order_No?: string;
  Order_Line_No?: number;
  Prod_Order_Comp_Line_No?: number;
  In_transit_Mortality?: boolean;
  Location_Name?: string;
  Data_Entry_Type?: string;
  Laying_Entry_Type?: string;
  Hatching_Entry_Type?: string;
  Descriptive_Entry_Type?: string;
  Data_Entry_Sheet_No?: string;
  Alternate_UOM?: string;
  Alternate_Quantity?: number;
  Dimension_Set_ID?: number;
  Consumption?: boolean;
  Job_No?: string;
  Job_Task_No?: string;
  Shortcut_Dimension_3_Code?: string;
  Shortcut_Dimension_4_Code?: string;
  Shortcut_Dimension_5_Code?: string;
  Shortcut_Dimension_6_Code?: string;
  Shortcut_Dimension_7_Code?: string;
  Shortcut_Dimension_8_Code?: string;
  [key: string]: unknown;
}

export async function getItemLedgerEntries(
  params: GetItemLedgerEntriesParams = {},
) {
  const query = buildODataQuery(params);
  const endpoint = `/Itemledger_entry?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemLedgerEntry>>(endpoint);

  return {
    entries: response.value || [],
    totalCount: response["@odata.count"] ?? 0,
  };
}
