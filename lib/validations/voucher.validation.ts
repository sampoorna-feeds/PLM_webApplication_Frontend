/**
 * Voucher form validation schema
 */

import { z } from 'zod';

export const voucherSchema = z.object({
  voucherType: z.enum(['General Journal', 'Cash Payment', 'Cash Receipt']),

  documentType: z.enum(['Payment', 'Invoice', 'Credit Memo', 'Refund', 'NA']).nullable(),

  postingDate: z.string().min(1, 'Required'),
  documentDate: z.string().min(1, 'Required'),
  accountType: z.enum(['G/L Account', 'Customer', 'Vendor']),
  accountNo: z.string().min(1, 'Required'),
  externalDocumentNo: z.string().optional(),
  // TDS Section - required when Account Type is Vendor
  // TDS Section - required when Account Type is Vendor
  tdsSection: z.object({
    tdsType: z.string().min(1, 'Required'),
    tdsAmount: z.number().min(0, 'Required'),
  }).optional(),
  // TCS Section - required when Account Type is Customer
  tcsSection: z.object({
    tcsType: z.string().min(1, 'Required'),
    tcsAmount: z.number().min(0, 'Required'),
  }).optional(),
  description: z.string().min(1, 'Required'),
  amount: z.number().min(0.01, 'Required'),
  balanceAccountType: z.enum(['G/L Account', 'Customer', 'Vendor']),
  balanceAccountNo: z.string().min(1, 'Required'),
  lineNarration: z.string().optional(),
  lob: z.string().min(1, 'Required'),
  branch: z.string().min(1, 'Required'),
  loc: z.string().min(1, 'Required'),
  employee: z.string().optional(),
  assignment: z.string().optional(),
}).refine((data) => {
  // If Account Type is Vendor, TDS Section is required
  if (data.accountType === 'Vendor') {
    return data.tdsSection !== undefined && 
           data.tdsSection.tdsType !== '' && 
           data.tdsSection.tdsAmount !== undefined;
  }
  return true;
}, {
  message: 'TDS Section is required when Account Type is Vendor',
  path: ['tdsSection'],
}).refine((data) => {
  // If Account Type is Customer, TCS Section is required
  if (data.accountType === 'Customer') {
    return data.tcsSection !== undefined && 
           data.tcsSection.tcsType !== '' && 
           data.tcsSection.tcsAmount !== undefined;
  }
  return true;
}, {
  message: 'TCS Section is required when Account Type is Customer',
  path: ['tcsSection'],
}).refine((data) => {
  // External Document No. is required when:
  // Voucher Type is 'General Journal' AND Document Type is 'Invoice' or 'Credit Memo'
  if (data.voucherType === 'General Journal' && 
      (data.documentType === 'Invoice' || data.documentType === 'Credit Memo')) {
    return data.externalDocumentNo !== undefined && 
           data.externalDocumentNo !== null && 
           data.externalDocumentNo.trim() !== '';
  }
  return true;
}, {
  message: 'External Document No. is required when Voucher Type is General Journal and Document Type is Invoice or Credit Memo',
  path: ['externalDocumentNo'],
}).refine((data) => {
  // Account No. and Bal. Acc No. cannot be the same
  return data.accountNo !== data.balanceAccountNo;
}, {
  message: 'Account No. and Bal. Acc No. cannot be the same',
  path: ['balanceAccountNo'],
});

export type VoucherFormData = z.infer<typeof voucherSchema>;

