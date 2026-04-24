import { apiGet, apiPost } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface DistanceResponse {
  "@odata.context": string;
  value: number;
}

export async function getDistance(
  fromPIN: string,
  toPIN: string,
): Promise<number> {
  const endpoint = `/API_GetDistance?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<DistanceResponse>(endpoint, { fromPIN, toPIN });
  return response.value;
}

interface LocationPostCodeRecord {
  Code: string;
  Post_Code?: string;
}

export async function getLocationPostCode(
  locationCode: string,
): Promise<string | null> {
  const escapedCode = locationCode.replace(/'/g, "''");
  const query = buildODataQuery({
    $filter: `Code eq '${escapedCode}'`,
    $select: "Code,Post_Code",
    $top: 1,
  });
  const endpoint = `/LocationList?company='${encodeURIComponent(COMPANY)}'&${query}`;
  const response = await apiGet<ODataResponse<LocationPostCodeRecord>>(endpoint);
  return response.value?.[0]?.Post_Code || null;
}
