"use client";

import { PurchaseDocumentForm } from "./purchase-document-form";
export type { PurchaseDocumentFormMode as PurchaseOrderFormMode } from "./purchase-document-form-content";

interface PurchaseOrderFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function PurchaseOrderForm({
  tabId,
  formData,
  context,
}: PurchaseOrderFormProps) {
  return (
    <PurchaseDocumentForm
      documentType="order"
      tabId={tabId}
      formData={formData}
      context={context}
    />
  );
}
