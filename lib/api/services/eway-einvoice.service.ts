import { apiPost } from "../client";

const COMPANY =
  process.env.NEXT_PUBLIC_API_COMPANY || "Sampoorna Feeds Pvt. Ltd";

export type DocType = "Transfer" | "SalesInvoice" | "SalesCredit" | "PurCredit";

export async function generateEInvoice(
  doctype: DocType,
  docno: string,
): Promise<void> {
  const endpoint = `/API_GenerateEinvoice?company='${encodeURIComponent(COMPANY)}'`;
  await apiPost(endpoint, { doctype, docno });
}

export async function cancelEInvoice(
  doctype: DocType,
  docno: string,
): Promise<void> {
  const endpoint = `/API_CancelEinvoice?company='${encodeURIComponent(COMPANY)}'`;
  await apiPost(endpoint, { doctype, docno });
}

export async function generateEWayBill(
  doctype: DocType,
  docno: string,
): Promise<void> {
  const endpoint = `/API_GenerateEWayBill?company='${encodeURIComponent(COMPANY)}'`;
  await apiPost(endpoint, { doctype, docno });
}

export async function cancelEWayBill(
  doctype: DocType,
  docno: string,
): Promise<void> {
  const endpoint = `/API_CancelEWayBill?company='${encodeURIComponent(COMPANY)}'`;
  await apiPost(endpoint, { doctype, docno });
}

export async function updateVehicle(
  docno: string,
  ewaybillno: string,
): Promise<void> {
  const endpoint = `/API_UpdateVehicle?company='${encodeURIComponent(COMPANY)}'`;
  await apiPost(endpoint, { docno, ewaybillno });
}

export async function updateTransporter(
  docno: string,
  ewaybillno: string,
): Promise<void> {
  const endpoint = `/API_UpdateTransporter?company='${encodeURIComponent(COMPANY)}'`;
  await apiPost(endpoint, { docno, ewaybillno });
}
