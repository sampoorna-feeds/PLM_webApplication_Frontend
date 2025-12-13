/**
 * Voucher Form page
 * Protected route for voucher form
 */

import type { Metadata } from 'next';
import { VoucherForm } from '@/components/forms/voucher-form';

export const metadata: Metadata = {
  title: 'Voucher Form',
};

export default function VoucherFormPage() {
  return <VoucherForm />;
}

