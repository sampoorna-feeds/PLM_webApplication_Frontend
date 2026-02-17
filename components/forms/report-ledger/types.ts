/**
 * Type definitions for Report Ledger components
 */

export type PageSize = 10 | 20 | 30 | 40 | 50;

export type ReportMode = "summary" | "ledger";

export interface DateRange {
  from: string;
  to: string;
}

export interface ReportLedgerFilters {
  mode: ReportMode;
  locationCode: string;
  itemNo: string;
  postingDateFrom: string;
  postingDateTo: string;
}

export const EMPTY_FILTERS: ReportLedgerFilters = {
  mode: "ledger",
  locationCode: "",
  itemNo: "",
  postingDateFrom: "",
  postingDateTo: "",
};
