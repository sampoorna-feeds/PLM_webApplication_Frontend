"use client";

import { PurchaseDocumentForm } from "./purchase-document-form";

interface PurchaseInvoiceFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function PurchaseInvoiceForm({
  tabId,
  formData,
  context,
}: PurchaseInvoiceFormProps) {
  return (
    <PurchaseDocumentForm
      documentType="invoice"
      tabId={tabId}
      formData={formData}
      context={context}
    />
  );
}
