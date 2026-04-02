"use client";

import {
  PurchaseDocumentFormContent,
  type PurchaseDocumentFormMode,
} from "./purchase-document-form-content";
import {
  PurchaseCreateDocumentForm,
  type PurchaseCreateDocumentType,
} from "./purchase-create-document-form";
import {
  getPurchaseDocumentConfig,
  type PurchaseDocumentType,
} from "./purchase-document-config";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { resolvePurchaseDocumentMode } from "./purchase-form-stack";

interface PurchaseDocumentFormProps {
  documentType: PurchaseDocumentType;
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function PurchaseDocumentForm({
  documentType,
  tabId,
  formData,
  context,
}: PurchaseDocumentFormProps) {
  const mode = resolvePurchaseDocumentMode(context) as PurchaseDocumentFormMode;
  const orderNo = typeof context?.orderNo === "string" ? context.orderNo : "";
  const config = getPurchaseDocumentConfig(documentType);

  const { markAsSaved, closeTab, updateFormData } = useFormStack(tabId);
  const { updateTab } = useFormStackContext();

  const handleCancelEdit = () => {
    if (!orderNo) return;
    updateTab(tabId, {
      title: `${config.detailTitlePrefix} ${orderNo}`,
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
      onUpdated?.();
      closeTab();
      return;
    }

    if (mode === "edit") {
      onUpdated?.();
    } else {
      onOrderPlaced?.();
    }

    updateTab(tabId, {
      title: `${config.detailTitlePrefix} ${savedOrderNo}`,
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
      title: `Edit ${config.detailTitlePrefix} ${orderNo}`,
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

  if (documentType !== "order") {
    return (
      <PurchaseCreateDocumentForm
        documentType={documentType as PurchaseCreateDocumentType}
        tabId={tabId}
        mode={mode}
        orderNo={orderNo || undefined}
        formData={formData}
        context={context}
        onSuccess={handleSuccess}
        persistFormData={updateFormData}
        onRequestEdit={handleRequestEdit}
        onCancelEdit={handleCancelEdit}
      />
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <PurchaseDocumentFormContent
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
