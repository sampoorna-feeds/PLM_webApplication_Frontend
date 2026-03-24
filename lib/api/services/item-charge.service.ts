import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface ItemCharge {
  No: string;
  Description: string;
  Block?: boolean;
  GST_Group_Code?: string;
  HSN_SAC_Code?: string;
  Exempted?: boolean;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function getBaseFilter(): string {
  return "Block eq false";
}

export async function getItemCharges(top: number = 20): Promise<ItemCharge[]> {
  const query = buildODataQuery({
    $select: "No,Description,Block,GST_Group_Code,HSN_SAC_Code,Exempted",
    $filter: getBaseFilter(),
    $orderby: "No",
    $top: top,
  });

  const endpoint = `/ItemCharge?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<ItemCharge>>(endpoint);
  return response.value;
}

export async function searchItemCharges(query: string): Promise<ItemCharge[]> {
  if (query.length < 2) return [];

  const escapedQuery = escapeODataValue(query);
  const baseFilter = getBaseFilter();

  const [resultsByNo, resultsByDescription] = await Promise.all([
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const q = buildODataQuery({
        $select: "No,Description,Block,GST_Group_Code,HSN_SAC_Code,Exempted",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/ItemCharge?company='${encodeURIComponent(COMPANY)}'&${q}`;
      const response = await apiGet<ODataResponse<ItemCharge>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const filterByDescription = `(${baseFilter}) and contains(Description,'${escapedQuery}')`;
      const q = buildODataQuery({
        $select: "No,Description,Block,GST_Group_Code,HSN_SAC_Code,Exempted",
        $filter: filterByDescription,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/ItemCharge?company='${encodeURIComponent(COMPANY)}'&${q}`;
      const response = await apiGet<ODataResponse<ItemCharge>>(endpoint);
      return response.value;
    })(),
  ]);

  const uniqueMap = new Map<string, ItemCharge>();
  [...resultsByNo, ...resultsByDescription].forEach((charge) => {
    if (!uniqueMap.has(charge.No)) uniqueMap.set(charge.No, charge);
  });

  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );
}

export async function getItemChargesPage(
  skip: number,
  search?: string,
  top: number = 30,
): Promise<ItemCharge[]> {
  const baseFilter = getBaseFilter();

  if (!search || search.length < 2) {
    const query = buildODataQuery({
      $select: "No,Description,Block,GST_Group_Code,HSN_SAC_Code,Exempted",
      $filter: baseFilter,
      $orderby: "No",
      $top: top,
      $skip: skip,
    });
    const endpoint = `/ItemCharge?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<ItemCharge>>(endpoint);
    return response.value;
  }

  const escapedQuery = escapeODataValue(search);
  const [resultsByNo, resultsByDescription] = await Promise.all([
    (async () => {
      const filterByNo = `(${baseFilter}) and contains(No,'${escapedQuery}')`;
      const q = buildODataQuery({
        $select: "No,Description,Block,GST_Group_Code,HSN_SAC_Code,Exempted",
        $filter: filterByNo,
        $orderby: "No",
        $top: top,
        $skip: skip,
      });
      const endpoint = `/ItemCharge?company='${encodeURIComponent(COMPANY)}'&${q}`;
      const response = await apiGet<ODataResponse<ItemCharge>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const filterByDescription = `(${baseFilter}) and contains(Description,'${escapedQuery}')`;
      const q = buildODataQuery({
        $select: "No,Description,Block,GST_Group_Code,HSN_SAC_Code,Exempted",
        $filter: filterByDescription,
        $orderby: "No",
        $top: top,
        $skip: skip,
      });
      const endpoint = `/ItemCharge?company='${encodeURIComponent(COMPANY)}'&${q}`;
      const response = await apiGet<ODataResponse<ItemCharge>>(endpoint);
      return response.value;
    })(),
  ]);

  const uniqueMap = new Map<string, ItemCharge>();
  [...resultsByNo, ...resultsByDescription].forEach((charge) => {
    if (!uniqueMap.has(charge.No)) uniqueMap.set(charge.No, charge);
  });

  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );
}

export async function searchItemChargesByField(
  query: string,
  field: "No" | "Description",
): Promise<ItemCharge[]> {
  if (query.length < 2) return [];

  const baseFilter = getBaseFilter();
  const escapedQuery = escapeODataValue(query);
  const filter = `(${baseFilter}) and contains(${field},'${escapedQuery}')`;
  const q = buildODataQuery({
    $select: "No,Description,Block,GST_Group_Code,HSN_SAC_Code,Exempted",
    $filter: filter,
    $orderby: "No",
    $top: 30,
  });
  const endpoint = `/ItemCharge?company='${encodeURIComponent(COMPANY)}'&${q}`;
  const response = await apiGet<ODataResponse<ItemCharge>>(endpoint);
  return response.value;
}
