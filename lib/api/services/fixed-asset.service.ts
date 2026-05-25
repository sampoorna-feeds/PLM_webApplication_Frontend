import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface FixedAsset {
  No: string;
  Description: string;
  FA_Location_Code?: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

export async function getFixedAssets(top: number = 50): Promise<FixedAsset[]> {
  const query = buildODataQuery({
    $select: "No,Description,FA_Location_Code",
    $orderby: "No",
    $top: top,
  });

  const endpoint = `/FixedAssets?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<FixedAsset>>(endpoint);
  return response.value;
}

export async function searchFixedAssets(query: string): Promise<FixedAsset[]> {
  if (!query || !query.trim()) return getFixedAssets(50);

  const escapedQuery = escapeODataValue(query);

  const [resultsByNo, resultsByDescription] = await Promise.all([
    (async () => {
      const filterByNo = `contains(No,'${escapedQuery}')`;
      const q = buildODataQuery({
        $select: "No,Description,FA_Location_Code",
        $filter: filterByNo,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/FixedAssets?company='${encodeURIComponent(COMPANY)}'&${q}`;
      const response = await apiGet<ODataResponse<FixedAsset>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const filterByDescription = `contains(Description,'${escapedQuery}')`;
      const q = buildODataQuery({
        $select: "No,Description,FA_Location_Code",
        $filter: filterByDescription,
        $orderby: "No",
        $top: 30,
      });
      const endpoint = `/FixedAssets?company='${encodeURIComponent(COMPANY)}'&${q}`;
      const response = await apiGet<ODataResponse<FixedAsset>>(endpoint);
      return response.value;
    })(),
  ]);

  const uniqueMap = new Map<string, FixedAsset>();
  [...resultsByNo, ...resultsByDescription].forEach((asset) => {
    if (!uniqueMap.has(asset.No)) uniqueMap.set(asset.No, asset);
  });

  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );
}

export async function getFixedAssetsPage(
  skip: number,
  search?: string,
  top: number = 50,
): Promise<FixedAsset[]> {
  if (!search || !search.trim()) {
    const query = buildODataQuery({
      $select: "No,Description,FA_Location_Code",
      $orderby: "No",
      $top: top,
      $skip: skip,
    });
    const endpoint = `/FixedAssets?company='${encodeURIComponent(COMPANY)}'&${query}`;
    const response = await apiGet<ODataResponse<FixedAsset>>(endpoint);
    return response.value;
  }

  const escapedQuery = escapeODataValue(search);
  const [resultsByNo, resultsByDescription] = await Promise.all([
    (async () => {
      const filterByNo = `contains(No,'${escapedQuery}')`;
      const q = buildODataQuery({
        $select: "No,Description,FA_Location_Code",
        $filter: filterByNo,
        $orderby: "No",
        $top: top,
        $skip: skip,
      });
      const endpoint = `/FixedAssets?company='${encodeURIComponent(COMPANY)}'&${q}`;
      const response = await apiGet<ODataResponse<FixedAsset>>(endpoint);
      return response.value;
    })(),
    (async () => {
      const filterByDescription = `contains(Description,'${escapedQuery}')`;
      const q = buildODataQuery({
        $select: "No,Description,FA_Location_Code",
        $filter: filterByDescription,
        $orderby: "No",
        $top: top,
        $skip: skip,
      });
      const endpoint = `/FixedAssets?company='${encodeURIComponent(COMPANY)}'&${q}`;
      const response = await apiGet<ODataResponse<FixedAsset>>(endpoint);
      return response.value;
    })(),
  ]);

  const uniqueMap = new Map<string, FixedAsset>();
  [...resultsByNo, ...resultsByDescription].forEach((asset) => {
    if (!uniqueMap.has(asset.No)) uniqueMap.set(asset.No, asset);
  });

  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.No.localeCompare(b.No),
  );
}

export async function searchFixedAssetsByField(
  query: string,
  field: "No" | "Description",
): Promise<FixedAsset[]> {
  if (!query || !query.trim()) return getFixedAssets(50);

  const escapedQuery = escapeODataValue(query);
  const filter = `contains(${field},'${escapedQuery}')`;
  const q = buildODataQuery({
    $select: "No,Description,FA_Location_Code",
    $filter: filter,
    $orderby: "No",
    $top: 30,
  });
  const endpoint = `/FixedAssets?company='${encodeURIComponent(COMPANY)}'&${q}`;
  const response = await apiGet<ODataResponse<FixedAsset>>(endpoint);
  return response.value;
}
