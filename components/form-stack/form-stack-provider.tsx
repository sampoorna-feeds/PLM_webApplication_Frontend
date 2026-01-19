/**
 * FormStack Provider
 * Wrapper component that provides FormStack context
 */

'use client';

import { FormStackProvider as BaseFormStackProvider } from '@/lib/form-stack/form-stack-context';

interface FormStackProviderProps {
  children: React.ReactNode;
  formScope: string;
}

export function FormStackProvider({ children, formScope }: FormStackProviderProps) {
  return <BaseFormStackProvider formScope={formScope}>{children}</BaseFormStackProvider>;
}
