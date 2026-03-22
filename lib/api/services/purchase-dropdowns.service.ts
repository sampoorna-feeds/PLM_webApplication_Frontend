import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface TermAndCondition {
  Terms: string;
  Conditions: string;
  Conditions2?: string;
}

export interface MandiMaster {
  Code: string;
  Description: string;
}

export interface PaymentTerm {
  Code: string;
  Description: string;
}

const DEFAULT_PAGE_SIZE = 30;

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

export const purchaseDropdownsService = {
  async getTermsAndConditionsPage(
    skip: number = 0,
    search: string = "",
    top: number = DEFAULT_PAGE_SIZE,
  ): Promise<TermAndCondition[]> {
    const query = buildODataQuery({
      $select: "Terms,Conditions",
      $orderby: "Terms",
      $top: top,
      $skip: skip,
      ...(search.trim()
        ? {
            $filter: `contains(Terms,'${escapeODataValue(search.trim())}') or contains(Conditions,'${escapeODataValue(search.trim())}')`,
          }
        : {}),
    });
    const endpoint = `/TermandCondition?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<TermAndCondition>>(endpoint);
    return response.value;
  },

  async getTermsAndConditions(): Promise<TermAndCondition[]> {
    return this.getTermsAndConditionsPage(0, "", 500);
  },

  async getMandiMastersPage(
    skip: number = 0,
    search: string = "",
    top: number = DEFAULT_PAGE_SIZE,
  ): Promise<MandiMaster[]> {
    const query = buildODataQuery({
      $filter: search.trim()
        ? `Blocked eq false and (contains(Code,'${escapeODataValue(search.trim())}') or contains(Description,'${escapeODataValue(search.trim())}'))`
        : "Blocked eq false",
      $select: "Code,Description",
      $orderby: "Code",
      $top: top,
      $skip: skip,
    });
    const endpoint = `/MandiMaster?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<MandiMaster>>(endpoint);
    return response.value;
  },

  async getMandiMasters(): Promise<MandiMaster[]> {
    return this.getMandiMastersPage(0, "", 500);
  },

  async getPaymentTermsPage(
    skip: number = 0,
    search: string = "",
    top: number = DEFAULT_PAGE_SIZE,
  ): Promise<PaymentTerm[]> {
    const query = buildODataQuery({
      $select: "Code,Description",
      $orderby: "Code",
      $top: top,
      $skip: skip,
      ...(search.trim()
        ? {
            $filter: `contains(Code,'${escapeODataValue(search.trim())}') or contains(Description,'${escapeODataValue(search.trim())}')`,
          }
        : {}),
    });
    const endpoint = `/PaymentTerm?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<PaymentTerm>>(endpoint);
    return response.value;
  },

  async getPaymentTerms(): Promise<PaymentTerm[]> {
    return this.getPaymentTermsPage(0, "", 500);
  },
};
