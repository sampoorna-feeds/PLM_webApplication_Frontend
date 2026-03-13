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

export const purchaseDropdownsService = {
  async getTermsAndConditions(): Promise<TermAndCondition[]> {
    const query = buildODataQuery({
      $select: "Terms,Conditions",
    });
    const endpoint = `/TermandCondition?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<TermAndCondition>>(endpoint);
    return response.value;
  },

  async getMandiMasters(): Promise<MandiMaster[]> {
    const query = buildODataQuery({
      $filter: "Blocked eq false",
      $select: "Code,Description",
    });
    const endpoint = `/MandiMaster?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<MandiMaster>>(endpoint);
    return response.value;
  },

  async getPaymentTerms(): Promise<PaymentTerm[]> {
    const query = buildODataQuery({
      $select: "Code,Description",
    });
    const endpoint = `/PaymentTerm?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<PaymentTerm>>(endpoint);
    return response.value;
  },
};
