import { apiGet, apiPost, apiPatch, apiDelete } from "../client";
import type { ODataResponse } from "../types";

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export interface BardanaLine {
  id?: string;
  Document_Type: string;
  Document_No: string;
  Document_Line_No: number;
  Line_No: number;
  Item_No: string;
  Description: string;
  UOM: string;
  Weight_Per: number;
  Quantity: number;
  Total_Weight: number;
  Posted_Document_No?: string;
  "@odata.etag"?: string;
  [key: string]: unknown;
}

/**
 * Generate QC Form / Bardana lines for a posted document line.
 */
export async function generateQCForm(docNo: string, lineNo: number): Promise<void> {
  const endpoint = `/QCCode_GenerateQCForm?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    docNo: docNo,
    lineno: lineNo,
  };

  try {
    await apiPost(endpoint, payload);
  } catch (error: any) {
    console.error("Error generating QC form:", error);
    throw error;
  }
}

/**
 * Get bardana lines for a posted receipt document.
 */
export async function getPostedBardanaLines(
  postedDocNo: string,
  lineNo: number,
): Promise<BardanaLine[]> {
  const escapedNo = postedDocNo.replace(/'/g, "''");
  const filter = `Posted_Document_No eq '${escapedNo}' and Document_Line_No eq ${lineNo}`;
  const query = `?company='${encodeURIComponent(COMPANY)}'&$filter=${encodeURIComponent(filter)}`;
  const endpoint = `/QCPurchaseBardanaList${query}`;

  const response = await apiGet<ODataResponse<BardanaLine>>(endpoint);
  return response.value || [];
}

/**
 * Delete a bardana line.
 */
export async function deleteBardanaLine(line: BardanaLine, etag: string): Promise<void> {
  const escapedNo = line.Document_No.replace(/'/g, "''");
  const endpoint = `/QCPurchaseBardanaList(Document_Type='${line.Document_Type}',Document_No='${escapedNo}',Document_Line_No=${line.Document_Line_No},Line_No=${line.Line_No})?company='${encodeURIComponent(COMPANY)}'`;
  try {
    await apiDelete(endpoint, {
      headers: { "If-Match": etag },
    });
  } catch (error: any) {
    console.error("Error deleting bardana line:", error);
    throw error;
  }
}

/**
 * Update a bardana line.
 */
export async function updateBardanaLine(
  line: BardanaLine,
  etag: string,
  data: Partial<BardanaLine>
): Promise<void> {
  const escapedNo = line.Document_No.replace(/'/g, "''");
  const endpoint = `/QCPurchaseBardanaList(Document_Type='${line.Document_Type}',Document_No='${escapedNo}',Document_Line_No=${line.Document_Line_No},Line_No=${line.Line_No})?company='${encodeURIComponent(COMPANY)}'`;
  
  // Transform keys to lowercase first letter for OData PATCH
  const transformedData = Object.entries(data).reduce((acc, [key, value]) => {
    const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
    acc[lowerKey] = value;
    return acc;
  }, {} as Record<string, any>);

  try {
    await apiPatch(endpoint, transformedData, {
      headers: { "If-Match": etag },
    });
  } catch (error: any) {
    console.error("Error updating bardana line:", error);
    throw error;
  }
}
