/**
 * Sales Form page
 * Protected route for sales form
 */

import type { Metadata } from 'next';
import { SalesForm } from '@/components/forms/sales-form';

export const metadata: Metadata = {
  title: 'Sales Form',
};

export default function SalesFormPage() {
  return <SalesForm />;
}
