import { apiPost } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export async function undoReceipt(docNo: string, lineNo: number) {
  const endpoint = `/API_UndoReceipt?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost(endpoint, {
    docNo,
    lineNo,
  });
}

export async function undoShipment(docNo: string, lineNo: number) {
  const endpoint = `/API_UndoShipment?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost(endpoint, {
    dOCNo: docNo, // Matches user's specific casing dOCNo
    lineNo,
  });
}

export async function undoReturnShipment(docNo: string, lineNo: number) {
  const endpoint = `/API_UndoReturnShipment?company='${encodeURIComponent(COMPANY)}'`;
  return apiPost(endpoint, {
    dOCNo: docNo, // Matches user's specific casing dOCNo
    lineNo,
  });
}
