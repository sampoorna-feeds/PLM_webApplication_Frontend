/**
 * Voucher 2 Form page
 * Protected route for Voucher 2 (Excel-style) form
 */

import type { Metadata } from 'next';
import { Voucher2Form } from '@/components/forms/voucher2-form';

export const metadata: Metadata = {
  title: 'Voucher 2 Form',
};

export default function Voucher2FormPage() {
  return <Voucher2Form />;
}


