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
    tdsAmount: z.number().min(0, 'Required'),
  }).optional(),
  accountTcsSection: z.object({
    tcsType: z.string().min(1, 'Required'),
    tcsAmount: z.number().min(0, 'Required'),
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
    tdsAmount: z.number().min(0, 'Required'),
  }).optional(),
  balanceTcsSection: z.object({
    tcsType: z.string().min(1, 'Required'),
    tcsAmount: z.number().min(0, 'Required'),
  }).optional(),
  lineNarration: z.string().optional(),
  lob: z.string().min(1, 'Required'),
  branch: z.string().min(1, 'Required'),
  loc: z.string().min(1, 'Required'),
  employee: z.string().optional(),
  assignment: z.string().optional(),
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
}).refine((data) => {
  // If Account Type is Vendor and accountTdsSection.tdsType is provided, accountTdsSection.tdsAmount is required
  if (data.accountType === 'Vendor' && data.accountTdsSection?.tdsType && data.accountTdsSection.tdsType !== 'NA') {
    return data.accountTdsSection.tdsAmount !== undefined && data.accountTdsSection.tdsAmount >= 0;
  }
  return true;
}, {
  message: 'TDS Amount is required when TDS Type is selected for Account Type Vendor',
  path: ['accountTdsSection.tdsAmount'],
}).refine((data) => {
  // If Account Type is Customer and accountTcsSection.tcsType is provided, accountTcsSection.tcsAmount is required
  if (data.accountType === 'Customer' && data.accountTcsSection?.tcsType && data.accountTcsSection.tcsType !== 'NA') {
    return data.accountTcsSection.tcsAmount !== undefined && data.accountTcsSection.tcsAmount >= 0;
  }
  return true;
}, {
  message: 'TCS Amount is required when TCS Type is selected for Account Type Customer',
  path: ['accountTcsSection.tcsAmount'],
}).refine((data) => {
  // If Balance Account Type is Vendor and balanceTdsSection.tdsType is provided, balanceTdsSection.tdsAmount is required
  if (data.balanceAccountType === 'Vendor' && data.balanceTdsSection?.tdsType && data.balanceTdsSection.tdsType !== 'NA') {
    return data.balanceTdsSection.tdsAmount !== undefined && data.balanceTdsSection.tdsAmount >= 0;
  }
  return true;
}, {
  message: 'TDS Amount is required when TDS Type is selected for Balance Account Type Vendor',
  path: ['balanceTdsSection.tdsAmount'],
}).refine((data) => {
  // If Balance Account Type is Customer and balanceTcsSection.tcsType is provided, balanceTcsSection.tcsAmount is required
  if (data.balanceAccountType === 'Customer' && data.balanceTcsSection?.tcsType && data.balanceTcsSection.tcsType !== 'NA') {
    return data.balanceTcsSection.tcsAmount !== undefined && data.balanceTcsSection.tcsAmount >= 0;
  }
  return true;
}, {
  message: 'TCS Amount is required when TCS Type is selected for Balance Account Type Customer',
  path: ['balanceTcsSection.tcsAmount'],
});

export type VoucherFormData = z.infer<typeof voucherSchema>;

