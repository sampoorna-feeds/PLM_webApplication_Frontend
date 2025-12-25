/**
 * Voucher API Service
 * Handles voucher creation, TDS/TCS section fetching, and attachment uploads
 */

import { apiGet, apiPost } from '../client';
import type { ODataResponse } from '../types';

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

/**
 * TDS Section type
 */
export interface TDSSection {
  TDS_Section: string;
}

/**
 * TCS Section type
 */
export interface TCSSection {
  TCS_Nature_of_Collection: string;
}

/**
 * Voucher creation payload
 */
export interface CreateVoucherPayload {
  Journal_Template_Name: string;
  Journal_Batch_Name: string;
  Posting_Date: string;
  Document_Type: string;
  Account_Type: string;
  Description?: string;
  Amount: number;
  Bal_Account_Type: string;
  Bal_Account_No: string;
  External_Document_No?: string;
  Line_Narration1?: string;
  User_ID: string;
  Shortcut_Dimension_3_Code?: string;
  Document_Date: string;
  Party_Type: string;
  Party_Code: string;
  TDS_Section_Code?: string;
  Shortcut_Dimension_1_Code?: string;
  Shortcut_Dimension_2_Code?: string;
  ShortcutDimCode3?: string;
  ShortcutDimCode4?: string;
  ShortcutDimCode5?: string;
}

/**
 * Voucher creation response
 */
export interface CreateVoucherResponse {
  Document_No: string;
  [key: string]: unknown;
}

/**
 * Attachment upload payload
 */
export interface UploadAttachmentPayload {
  recNo: string;
  fileName: string;
  fileEncodedTextDialog: string;
}

/**
 * Get TDS Section for a vendor
 * @param vendorNo - Vendor number
 */
export async function getTDSSection(vendorNo: string): Promise<TDSSection[]> {
  const endpoint = `/TDSSection?company='${encodeURIComponent(COMPANY)}'&$select=TDS_Section&$Filter=Vendor_No eq '${encodeURIComponent(vendorNo)}'`;
  const response = await apiGet<ODataResponse<TDSSection>>(endpoint);
  return response.value;
}

/**
 * Get TCS Section for a customer
 * @param customerNo - Customer number
 */
export async function getTCSSection(customerNo: string): Promise<TCSSection[]> {
  const endpoint = `/TCSSection?company='${encodeURIComponent(COMPANY)}'&$select=TCS_Nature_of_Collection&$Filter=Customer_No eq '${encodeURIComponent(customerNo)}'`;
  const response = await apiGet<ODataResponse<TCSSection>>(endpoint);
  return response.value;
}

/**
 * Create a voucher entry
 * @param payload - Voucher creation payload
 */
export async function createVoucher(payload: CreateVoucherPayload): Promise<CreateVoucherResponse> {
  const endpoint = `/GJ?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<CreateVoucherResponse>(endpoint, payload);
  return response;
}

/**
 * Upload an attachment
 * @param payload - Attachment upload payload
 */
export async function uploadAttachment(payload: UploadAttachmentPayload): Promise<unknown> {
  const endpoint = `/API_InitiateUploadFileGJ?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<unknown>(endpoint, payload);
  return response;
}

