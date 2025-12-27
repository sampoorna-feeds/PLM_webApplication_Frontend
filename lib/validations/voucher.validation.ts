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
  accountTdsSection: z.object({
    tdsType: z.string().min(1, 'Required'),
  }).optional(),
  accountTcsSection: z.object({
    tcsType: z.string().min(1, 'Required'),
  }).optional(),
  externalDocumentNo: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().refine((val) => val !== 0, {
    message: 'Amount cannot be zero',
  }),
  balanceAccountType: z.enum(['G/L Account', 'Customer', 'Vendor']),
  balanceAccountNo: z.string().min(1, 'Required'),
  balanceTdsSection: z.object({
    tdsType: z.string().min(1, 'Required'),
  }).optional(),
  balanceTcsSection: z.object({
    tcsType: z.string().min(1, 'Required'),
  }).optional(),
  lineNarration: z.string().optional(),
  lob: z.string().min(1, 'Required'),
  branch: z.string().min(1, 'Required'),
  loc: z.string().min(1, 'Required'),
  employee: z.string().optional(),
  assignment: z.string().optional(),
}).refine((data) => {
  // External Document No. is required when Voucher Type is 'General Journal'
  // (since both Invoice and Credit Memo require it)
  if (data.voucherType === 'General Journal') {
    return data.externalDocumentNo !== undefined && 
           data.externalDocumentNo !== null && 
           data.externalDocumentNo.trim() !== '';
  }
  return true;
}, {
  message: 'External Document No. is required when Voucher Type is General Journal',
  path: ['externalDocumentNo'],
}).refine((data) => {
  // Account Type and Balance Account Type cannot be the same
  return data.accountType !== data.balanceAccountType;
}, {
  message: 'Account Type and Balance Account Type cannot be the same',
  path: ['balanceAccountType'],
}).refine((data) => {
  // Account No. and Bal. Acc No. cannot be the same
  return data.accountNo !== data.balanceAccountNo;
}, {
  message: 'Account No. and Bal. Acc No. cannot be the same',
  path: ['balanceAccountNo'],
});

export type VoucherFormData = z.infer<typeof voucherSchema>;

