"use client";

import { useCallback } from "react";
import { useFormStack } from "@/lib/form-stack/use-form-stack";

export type PurchaseDocumentFormMode = "create" | "edit" | "view";

export interface PurchaseFormContext extends Record<string, unknown> {
  mode?: PurchaseDocumentFormMode;
  orderNo?: string;
  onOrderPlaced?: () => void;
  onUpdated?: () => void;
  refetch?: () => void;
}

export function resolvePurchaseDocumentMode(
  context?: Record<string, unknown>,
): PurchaseDocumentFormMode {
  const mode = context?.mode;
  if (mode === "create" || mode === "view" || mode === "edit") {
    return mode;
  }

  return context?.orderNo ? "view" : "create";
}

export function useCreateOnlyPurchaseFormStack(
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
