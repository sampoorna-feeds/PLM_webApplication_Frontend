"use client";

import { PurchaseDocumentForm } from "./purchase-document-form";

interface PurchaseReturnOrderFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function PurchaseReturnOrderForm({
  tabId,
  formData,
  context,
}: PurchaseReturnOrderFormProps) {
  return (
    <PurchaseDocumentForm
      documentType="return-order"
      tabId={tabId}
      formData={formData}
      context={context}
    />
  );
}
