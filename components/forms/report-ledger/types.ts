/**
 * Type definitions for Report Ledger components
 */

export type PageSize = 10 | 20 | 30 | 40 | 50;

export type ReportMode = "summary" | "ledger";

export interface DateRange {
  from: string;
  to: string;
}

export interface FilterCondition {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "ge"
    | "lt"
    | "le"
    | "contains"
    | "startswith"
    | "endswith";
  value: string;
  type: "text" | "number" | "boolean" | "date" | "enum";
}

export interface ReportLedgerFilters {
  mode: ReportMode;
  locationCodes: string[];
  itemNo: string;
  postingDateFrom: string;
  postingDateTo: string;
  additionalFilters: FilterCondition[];
}

export const EMPTY_FILTERS: ReportLedgerFilters = {
  mode: "ledger",
  locationCodes: [],
  itemNo: "",
  postingDateFrom: "",
  postingDateTo: "",
  additionalFilters: [],
};
