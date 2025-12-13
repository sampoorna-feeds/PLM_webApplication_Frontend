/**
 * Voucher form validation schema
 */

import { z } from 'zod';

export const voucherSchema = z.object({
  voucherType: z.enum(['General Journal', 'Cash Payment', 'Cash Receipt'], {
    required_error: 'Voucher Type is required',
  }),
  documentType: z.enum(['Payment', 'Invoice', 'Credit Memo', 'Refund'], {
    required_error: 'Document Type is required',
  }),
  postingDate: z.string().min(1, 'Posting Date is required'),
  documentDate: z.string().min(1, 'Document Date is required'),
  accountType: z.enum(['G/L Account', 'Customer', 'Vendor'], {
    required_error: 'Account Type is required',
  }),
  accountNo: z.string().min(1, 'Account No. is required'),
  externalDocumentNo: z.string().min(1, 'External Document No. is required'),
  // TDS Section - required when Account Type is Vendor
  // TDS Section - required when Account Type is Vendor
  tdsSection: z.object({
    tdsType: z.string().min(1, 'TDS Type is required'),
    tdsAmount: z.number().min(0, 'TDS Amount must be greater than or equal to 0'),
  }).optional(),
  // TCS Section - required when Account Type is Customer
  tcsSection: z.object({
    tcsType: z.string().min(1, 'TCS Type is required'),
    tcsAmount: z.number().min(0, 'TCS Amount must be greater than or equal to 0'),
  }).optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  balanceAccountType: z.enum(['G/L Account', 'Customer', 'Vendor'], {
    required_error: 'Balance Account Type is required',
  }),
  balanceAccountNo: z.string().min(1, 'Balance Account No. is required'),
  lineNarration: z.string().min(1, 'Line Narration is required'),
  lob: z.string().min(1, 'LOB is required'),
  branch: z.string().min(1, 'Branch is required'),
  loc: z.string().min(1, 'LOC is required'),
  employee: z.string().min(1, 'Employee is required'),
  assignment: z.string().min(1, 'Assignment is required'),
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
});

export type VoucherFormData = z.infer<typeof voucherSchema>;

