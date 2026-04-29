import { apiGet } from "../client";
import { buildODataQuery } from "../endpoints";
import type { ODataResponse } from "../types";

export interface WebUser {
  User_Name: string;
  Full_Name: string;
  Status: string;
  Allow_Posting_From: string;
  Allow_Posting_To: string;
  Location_Code: string;
}

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

/**
 * Get WebUser profile details including posting date ranges
 * @param userName - The User_Name to filter by
 */
export async function getWebUser(userName: string): Promise<WebUser | null> {
  const query = buildODataQuery({
    $select: "User_Name,Full_Name,Status,Allow_Posting_From,Allow_Posting_To,Location_Code",
    $filter: `User_Name eq '${userName}'`,
  });

  const endpoint = `/Webuser?company='${encodeURIComponent(COMPANY)}'&${query}`;
  try {
    const response = await apiGet<ODataResponse<WebUser>>(endpoint);
    return response.value?.[0] || null;
  } catch (error) {
    console.error("Error fetching WebUser profile:", error);
    return null;
  }
}
