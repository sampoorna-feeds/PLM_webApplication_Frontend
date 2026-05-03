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

export interface PaymentMethod {
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
    if (!search.trim()) {
      const query = buildODataQuery({
        $select: "Terms,Conditions",
        $orderby: "Terms",
        $top: top,
        $skip: skip,
      });
      const endpoint = `/TermandCondition?company='${encodeURIComponent(COMPANY)}'&${query}`;
      const response = await apiGet<ODataResponse<TermAndCondition>>(endpoint);
      return response.value || [];
    }

    const s = escapeODataValue(search.trim());
    const sLower = s.toLowerCase();
    const sUpper = s.toUpperCase();
    
    const [res1, res2] = await Promise.all([
      apiGet<ODataResponse<TermAndCondition>>(`/TermandCondition?company='${encodeURIComponent(COMPANY)}'&${buildODataQuery({
        $select: "Terms,Conditions",
        $orderby: "Terms",
        $top: 100,
        $skip: 0,
        $filter: `contains(Terms,'${s}') or contains(Terms,'${sLower}') or contains(Terms,'${sUpper}')`
      })}`).catch(() => ({ value: [] })),
      apiGet<ODataResponse<TermAndCondition>>(`/TermandCondition?company='${encodeURIComponent(COMPANY)}'&${buildODataQuery({
        $select: "Terms,Conditions",
        $orderby: "Terms",
        $top: 100,
        $skip: 0,
        $filter: `contains(Conditions,'${s}') or contains(Conditions,'${sLower}') or contains(Conditions,'${sUpper}')`
      })}`).catch(() => ({ value: [] }))
    ]);

    const combined = [...(res1.value || []), ...(res2.value || [])];
    const uniqueMap = new Map<string, TermAndCondition>();
    combined.forEach(item => uniqueMap.set(item.Terms, item));
    return Array.from(uniqueMap.values()).slice(skip, skip + top);
  },

  async getTermsAndConditions(): Promise<TermAndCondition[]> {
    return this.getTermsAndConditionsPage(0, "", 500);
  },

  async getMandiMastersPage(
    skip: number = 0,
    search: string = "",
    top: number = DEFAULT_PAGE_SIZE,
  ): Promise<MandiMaster[]> {
    const baseFilter = "Blocked eq false";
    if (!search.trim()) {
      const query = buildODataQuery({
        $filter: baseFilter,
        $select: "Code,Description",
        $orderby: "Code",
        $top: top,
        $skip: skip,
      });
      const endpoint = `/MandiMaster?company='${encodeURIComponent(COMPANY)}'&${query}`;
      const response = await apiGet<ODataResponse<MandiMaster>>(endpoint);
      return response.value || [];
    }

    const s = escapeODataValue(search.trim());
    const sLower = s.toLowerCase();
    const sUpper = s.toUpperCase();
    
    const [res1, res2] = await Promise.all([
      apiGet<ODataResponse<MandiMaster>>(`/MandiMaster?company='${encodeURIComponent(COMPANY)}'&${buildODataQuery({
        $select: "Code,Description",
        $orderby: "Code",
        $top: 100,
        $skip: 0,
        $filter: `${baseFilter} and (contains(Code,'${s}') or contains(Code,'${sLower}') or contains(Code,'${sUpper}'))`
      })}`).catch(() => ({ value: [] })),
      apiGet<ODataResponse<MandiMaster>>(`/MandiMaster?company='${encodeURIComponent(COMPANY)}'&${buildODataQuery({
        $select: "Code,Description",
        $orderby: "Code",
        $top: 100,
        $skip: 0,
        $filter: `${baseFilter} and (contains(Description,'${s}') or contains(Description,'${sLower}') or contains(Description,'${sUpper}'))`
      })}`).catch(() => ({ value: [] }))
    ]);

    const combined = [...(res1.value || []), ...(res2.value || [])];
    const uniqueMap = new Map<string, MandiMaster>();
    combined.forEach(item => uniqueMap.set(item.Code, item));
    return Array.from(uniqueMap.values()).slice(skip, skip + top);
  },

  async getMandiMasters(): Promise<MandiMaster[]> {
    return this.getMandiMastersPage(0, "", 500);
  },

  async getPaymentTermsPage(
    skip: number = 0,
    search: string = "",
    top: number = DEFAULT_PAGE_SIZE,
  ): Promise<PaymentTerm[]> {
    if (!search.trim()) {
      const query = buildODataQuery({
        $select: "Code,Description",
        $orderby: "Code",
        $top: top,
        $skip: skip,
      });
      const endpoint = `/PaymentTerm?company='${encodeURIComponent(COMPANY)}'&${query}`;
      const response = await apiGet<ODataResponse<PaymentTerm>>(endpoint);
      return response.value || [];
    }

    const s = escapeODataValue(search.trim());
    const sLower = s.toLowerCase();
    const sUpper = s.toUpperCase();
    
    const [res1, res2] = await Promise.all([
      apiGet<ODataResponse<PaymentTerm>>(`/PaymentTerm?company='${encodeURIComponent(COMPANY)}'&${buildODataQuery({
        $select: "Code,Description",
        $orderby: "Code",
        $top: 100,
        $skip: 0,
        $filter: `contains(Code,'${s}') or contains(Code,'${sLower}') or contains(Code,'${sUpper}')`
      })}`).catch(() => ({ value: [] })),
      apiGet<ODataResponse<PaymentTerm>>(`/PaymentTerm?company='${encodeURIComponent(COMPANY)}'&${buildODataQuery({
        $select: "Code,Description",
        $orderby: "Code",
        $top: 100,
        $skip: 0,
        $filter: `contains(Description,'${s}') or contains(Description,'${sLower}') or contains(Description,'${sUpper}')`
      })}`).catch(() => ({ value: [] }))
    ]);

    const combined = [...(res1.value || []), ...(res2.value || [])];
    const uniqueMap = new Map<string, PaymentTerm>();
    combined.forEach(item => uniqueMap.set(item.Code, item));
    return Array.from(uniqueMap.values()).slice(skip, skip + top);
  },

  async getPaymentTerms(): Promise<PaymentTerm[]> {
    return this.getPaymentTermsPage(0, "", 500);
  },

  async getPaymentMethodsPage(
    skip: number = 0,
    search: string = "",
    top: number = DEFAULT_PAGE_SIZE,
  ): Promise<PaymentMethod[]> {
    if (!search.trim()) {
      const query = buildODataQuery({
        $select: "Code,Description",
        $orderby: "Code",
        $top: top,
        $skip: skip,
      });
      const endpoint = `/PaymentMethod?company='${encodeURIComponent(COMPANY)}'&${query}`;
      const response = await apiGet<ODataResponse<PaymentMethod>>(endpoint);
      return response.value || [];
    }

    const s = escapeODataValue(search.trim());
    const sLower = s.toLowerCase();
    const sUpper = s.toUpperCase();
    
    const [res1, res2] = await Promise.all([
      apiGet<ODataResponse<PaymentMethod>>(`/PaymentMethod?company='${encodeURIComponent(COMPANY)}'&${buildODataQuery({
        $select: "Code,Description",
        $orderby: "Code",
        $top: 100,
        $skip: 0,
        $filter: `contains(Code,'${s}') or contains(Code,'${sLower}') or contains(Code,'${sUpper}')`
      })}`).catch(() => ({ value: [] })),
      apiGet<ODataResponse<PaymentMethod>>(`/PaymentMethod?company='${encodeURIComponent(COMPANY)}'&${buildODataQuery({
        $select: "Code,Description",
        $orderby: "Code",
        $top: 100,
        $skip: 0,
        $filter: `contains(Description,'${s}') or contains(Description,'${sLower}') or contains(Description,'${sUpper}')`
      })}`).catch(() => ({ value: [] }))
    ]);

    const combined = [...(res1.value || []), ...(res2.value || [])];
    const uniqueMap = new Map<string, PaymentMethod>();
    combined.forEach(item => uniqueMap.set(item.Code, item));
    return Array.from(uniqueMap.values()).slice(skip, skip + top);
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.getPaymentMethodsPage(0, "", 500);
  },
};
