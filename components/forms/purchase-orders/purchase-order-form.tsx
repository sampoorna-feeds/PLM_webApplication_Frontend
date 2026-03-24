"use client";

import {
  PurchaseOrderFormContent,
  type UnifiedPurchaseOrderMode,
} from "./purchase-order-form-content";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

export type PurchaseOrderFormMode = UnifiedPurchaseOrderMode;

interface PurchaseOrderFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

function getMode(context?: Record<string, unknown>): PurchaseOrderFormMode {
  const mode = context?.mode;
  if (mode === "create" || mode === "view" || mode === "edit") {
    return mode;
  }
  return context?.orderNo ? "view" : "create";
}

export function PurchaseOrderForm({
  tabId,
  formData,
  context,
}: PurchaseOrderFormProps) {
  const { markAsSaved, closeTab, updateFormData } = useFormStack(tabId);
  const { updateTab } = useFormStackContext();

  const mode = getMode(context);
  const orderNo = typeof context?.orderNo === "string" ? context.orderNo : "";

  const handleCancelEdit = () => {
    if (!orderNo) return;
    updateTab(tabId, {
      title: `Order ${orderNo}`,
      context: {
        ...context,
        mode: "view",
        orderNo,
      },
    });
  };

  const handleSuccess = (savedOrderNo: string) => {
    const onOrderPlaced = context?.onOrderPlaced as (() => void) | undefined;
    const onUpdated =
      (context?.onUpdated as (() => void) | undefined) ||
      (context?.refetch as (() => void) | undefined);

    markAsSaved();

    if (mode === "view") {
      // If onSuccess is called in view mode, it means a deletion occurred
      onUpdated?.();
      closeTab();
      return;
    }

    if (mode === "edit") {
      onUpdated?.();
    } else {
      // This was a "create" mode success
      onOrderPlaced?.();
    }

    // Transition to view mode for the created/updated order
    updateTab(tabId, {
      title: `Order ${savedOrderNo}`,
      context: {
        ...context,
        mode: "view",
        orderNo: savedOrderNo,
        refetch: onUpdated,
      },
    });
  };

  const handleRequestEdit = () => {
    if (!orderNo) return;
    updateTab(tabId, {
      title: `Edit Order ${orderNo}`,
      context: {
        ...context,
        mode: "edit",
        orderNo,
        onUpdated:
          (context?.onUpdated as (() => void) | undefined) ||
          (context?.refetch as (() => void) | undefined),
      },
    });
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <PurchaseOrderFormContent
        onSuccess={handleSuccess}
        onRequestEdit={handleRequestEdit}
        onCancelEdit={handleCancelEdit}
        mode={mode}
        orderNo={orderNo || undefined}
        initialFormData={formData}
        persistFormData={updateFormData}
      />
    </div>
  );
}
