/**
 * Type definitions for Report Ledger components
 */

export type PageSize = 10 | 20 | 30 | 40 | 50;

export interface DateRange {
  from: string;
  to: string;
}

export interface ReportLedgerFilters {
  locationCode: string;
  itemNo: string;
  postingDateFrom: string;
  postingDateTo: string;
}

export const EMPTY_FILTERS: ReportLedgerFilters = {
  locationCode: "",
  itemNo: "",
  postingDateFrom: "",
  postingDateTo: "",
};
