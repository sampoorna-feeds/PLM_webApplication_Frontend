"use client";

import { useCallback } from "react";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import type { SalesDocumentType } from "./sales-document-config";

export type SalesDocumentFormMode = "create" | "edit" | "view";

export interface SalesFormContext extends Record<string, unknown> {
  documentType?: SalesDocumentType;
  mode?: SalesDocumentFormMode;
  orderNo?: string;
  onOrderPlaced?: () => void;
  onUpdated?: () => void;
  refetch?: () => void;
}

const SALES_DOCUMENT_TYPES: ReadonlyArray<SalesDocumentType> = [
  "order",
  "invoice",
  "return-order",
  "credit-memo",
];

export function resolveSalesDocumentType(
  context?: Record<string, unknown>,
): SalesDocumentType | undefined {
  const documentType = context?.documentType;
  if (
    typeof documentType === "string" &&
    SALES_DOCUMENT_TYPES.includes(documentType as SalesDocumentType)
  ) {
    return documentType as SalesDocumentType;
  }
  return undefined;
}

export function resolveSalesDocumentMode(
  context?: Record<string, unknown>,
): SalesDocumentFormMode {
  const mode = context?.mode;
  if (mode === "create" || mode === "view" || mode === "edit") {
    return mode;
  }
  return context?.orderNo ? "view" : "create";
}

export function useCreateOnlySalesFormStack(
  tabId: string,
  context?: Record<string, unknown>,
) {
  const { markAsSaved, closeTab, updateFormData } = useFormStack(tabId);

  const onSuccess = useCallback(
    (_orderNo: string) => {
      const onOrderPlaced = context?.onOrderPlaced as (() => void) | undefined;
      markAsSaved();
      onOrderPlaced?.();
      closeTab();
    },
    [closeTab, context, markAsSaved],
  );

  return {
    onSuccess,
    persistFormData: updateFormData,
  };
}
