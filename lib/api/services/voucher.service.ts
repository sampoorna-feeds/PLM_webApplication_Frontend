/**
 * Voucher API Service
 * Handles voucher creation, TDS/TCS section fetching, and attachment uploads
 */

import { apiGet, apiPost, apiDelete } from '../client';
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
  Account_No: string;
  Description?: string;
  Amount: number;
  Bal_Account_Type: string;
  Bal_Account_No?: string;
  External_Document_No?: string;
  Line_Narration1?: string;
  User_ID?: string;
  Shortcut_Dimension_3_Code?: string;
  Document_Date: string;
  Document_No: string;
  Party_Type?: string;
  Party_Code?: string;
  TDS_Section_Code?: string;
  TCS_Nature_of_Collection?: string;
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
 * Get voucher endpoint based on voucher type
 * @param voucherType - Voucher type (General Journal, Cash Receipt, Cash Payment)
 * @returns Endpoint path for the voucher type
 */
function getVoucherEndpoint(voucherType: string): string {
  switch (voucherType) {
    case 'General Journal':
      return '/GJ';
    case 'Cash Receipt':
      return '/CR';
    case 'Cash Payment':
      return '/CP';
    default:
      return '/GJ'; // Default to GJ for now (all use same endpoint)
  }
}

/**
 * Get voucher type from journal template name
 * @param journalTemplateName - Journal template name (e.g., 'GENERAL', 'CASH RECE', 'CASH PAYM')
 * @returns Voucher type string
 */
function getVoucherTypeFromTemplate(journalTemplateName: string): string {
  const template = journalTemplateName.toUpperCase();
  if (template === 'GENERAL') {
    return 'General Journal';
  } else if (template === 'CASH RECE' || template === 'CASH RECEIPT') {
    return 'Cash Receipt';
  } else if (template === 'CASH PAYM' || template === 'CASH PAYMENT') {
    return 'Cash Payment';
  }
  return 'General Journal'; // Default
}

/**
 * Get upload endpoint based on voucher type
 * @param voucherType - Voucher type (General Journal, Cash Receipt, Cash Payment)
 * @returns Endpoint path for the upload type
 */
function getUploadEndpoint(voucherType: string): string {
  // For now, all use the same endpoint (easy to change later)
  return '/API_InitiateUploadFileGJ';
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
 * Voucher entry from GET API
 */
export interface VoucherEntryResponse {
  Document_No: string;
  Journal_Template_Name: string;
  Journal_Batch_Name: string;
  Line_No: number;
  Posting_Date: string;
  Document_Type: string;
  Account_Type: string;
  Account_No: string;
  Description?: string;
  Amount: number;
  Bal_Account_Type: string;
  Bal_Account_No: string;
  External_Document_No?: string;
  Line_Narration1?: string;
  User_ID: string;
  Document_Date: string;
  Shortcut_Dimension_1_Code?: string; // LOB
  Shortcut_Dimension_2_Code?: string; // Branch
  ShortcutDimCode3?: string; // LOC
  ShortcutDimCode4?: string; // Employee
  ShortcutDimCode5?: string; // Assignment
  TDS_Section_Code?: string;
  TCS_Nature_of_Collection?: string;
  Party_Type?: string;
  Party_Code?: string;
  [key: string]: unknown;
}

/**
 * Create document number series for vouchers
 * @param voucherType - Voucher type (General Journal, Cash Receipt, Cash Payment)
 * @returns Document number string
 */
export async function createNoSeriesForVouchers(voucherType: string): Promise<string> {
  // Hardcoded series code for now
  const seriesCode = 'GJTEST';
  
  const endpoint = `/API_CreateNoSeriesForVouchers?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<{ value: string }>(endpoint, { seriesCode });
  return response.value;
}

/**
 * Get voucher entries from API
 * @param voucherType - Voucher type (General Journal, Cash Receipt, Cash Payment)
 * @returns Array of voucher entries
 */
export async function getVoucherEntries(voucherType: string, userID: string): Promise<VoucherEntryResponse[]> {
  const endpointPath = getVoucherEndpoint(voucherType);
  
  // Map voucher type to template name for filter
  let templateName: string;
  switch (voucherType) {
    case 'General Journal':
      templateName = 'GENERAL';
      break;
    case 'Cash Receipt':
      templateName = 'CASH RECE';
      break;
    case 'Cash Payment':
      templateName = 'CASH PAYM';
      break;
    default:
      templateName = 'GENERAL';
  }
  
  // Build filter with actual userID
  const filter = `Journal_Template_Name eq '${templateName}' and Journal_Batch_Name eq 'DEFAULT' and User_ID eq '${userID}'`;
  const endpoint = `${endpointPath}?company='${encodeURIComponent(COMPANY)}'&$top=10&$Filter=${encodeURIComponent(filter)}`;
  
  const response = await apiGet<ODataResponse<VoucherEntryResponse>>(endpoint);
  return response.value;
}

/**
 * Create a voucher entry
 * @param payload - Voucher creation payload
 * @param voucherType - Voucher type (General Journal, Cash Receipt, Cash Payment)
 */
export async function createVoucher(
  payload: CreateVoucherPayload,
  voucherType: string
): Promise<CreateVoucherResponse> {
  const endpointPath = getVoucherEndpoint(voucherType);
  const endpoint = `${endpointPath}?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<CreateVoucherResponse>(endpoint, payload);
  return response;
}

/**
 * Upload an attachment
 * @param payload - Attachment upload payload
 * @param voucherType - Voucher type (General Journal, Cash Receipt, Cash Payment)
 */
export async function uploadAttachment(
  payload: UploadAttachmentPayload,
  voucherType: string
): Promise<{ success: boolean; message?: string }> {
  const endpointPath = getUploadEndpoint(voucherType);
  const endpoint = `${endpointPath}?company='${encodeURIComponent(COMPANY)}'`;
  
  try {
    await apiPost<unknown>(endpoint, payload);
    // If response is successful (including 204), return success
    return { success: true, message: 'File uploaded' };
  } catch (error) {
    // Re-throw the error to be handled by caller
    throw error;
  }
}

/**
 * Post vouchers
 * @param userID - User ID (default: 'temp')
 */
export async function postVouchers(userID: string = 'temp'): Promise<unknown> {
  const endpoint = `/API_PostVouchers?company='${encodeURIComponent(COMPANY)}'`;
  const response = await apiPost<unknown>(endpoint, { userID });
  return response;
}

/**
 * Delete a voucher
 * @param journalTemplateName - Journal template name (e.g., 'GENERAL', 'CASH RECE', 'CASH PAYM')
 * @param journalBatchName - Journal batch name (default: 'DEFAULT')
 * @param lineNo - Line number of the voucher
 */
export async function deleteVoucher(
  journalTemplateName: string,
  journalBatchName: string,
  lineNo: number
): Promise<void> {
  // Determine voucher type from template name
  const voucherType = getVoucherTypeFromTemplate(journalTemplateName);
  const endpointPath = getVoucherEndpoint(voucherType);
  // Format: /CR(Journal_Template_Name='GENERAL', Journal_Batch_Name='DEFAULT', Line_No=20000)
  const endpoint = `${endpointPath}(Journal_Template_Name='${encodeURIComponent(journalTemplateName)}', Journal_Batch_Name='${encodeURIComponent(journalBatchName)}', Line_No=${lineNo})?company='${encodeURIComponent(COMPANY)}'`;
  
  // Use apiDelete from client
  await apiDelete<void>(endpoint);
}

/**
 * Default Dimension type
 */
export interface DefaultDimension {
  Table_ID: number;
  No: string;
  Dimension_Code: string;
  Dimension_Value_Code: string;
  Value_Posting: string;
  AllowedValuesFilter: string;
}

/**
 * Get default dimensions for an account number
 * @param accountNo - Account number or Balance Account number
 */
export async function getDefaultDimensions(accountNo: string): Promise<DefaultDimension[]> {
  if (!accountNo) return [];
  
  const tableIds = ['15', '18', '23']; // Hardcoded Table_IDs
  const filter = `Table_ID in(${tableIds.map(id => `'${id}'`).join(',')}) and No eq '${accountNo}'`;
  const query = `$filter=${encodeURIComponent(filter)}`;
  const endpoint = `/DefaultDimensions?company='${encodeURIComponent(COMPANY)}'&${query}`;
  
  const response = await apiGet<ODataResponse<DefaultDimension>>(endpoint);
  return response.value || [];
}

/**
 * Get Tax Components in JSON format
 * @param documentNo - Document number
 * @param tableID - Table ID (hardcoded to "81")
 */
export async function getTaxComponentsInJson(documentNo: string, tableID: string = '81'): Promise<unknown[]> {
  const endpoint = `/API_GetTaxComponentsInJson?company='${encodeURIComponent(COMPANY)}'`;
  const payload = {
    tableID,
    documentNo,
  };
  
  const response = await apiPost<{ value?: string }>(endpoint, payload);
  
  // Response contains base64 encoded JSON
  if (!response.value) {
    return [];
  }
  
  try {
    // Decode base64 to string
    const decodedString = atob(response.value);
    // Parse JSON
    const taxData = JSON.parse(decodedString);
    // Return as array (assuming it's an array or can be converted to one)
    return Array.isArray(taxData) ? taxData : [taxData];
  } catch (error) {
    console.error('Error decoding tax components:', error);
    return [];
  }
}


