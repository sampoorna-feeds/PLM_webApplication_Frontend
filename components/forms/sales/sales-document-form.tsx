"use client";

import { useEffect } from "react";
import {
  SalesCreateDocumentFormContent,
} from "./sales-create-document-form";
import {
  getSalesDocumentConfig,
  type SalesDocumentType,
} from "./sales-document-config";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  resolveSalesDocumentMode,
  resolveSalesDocumentType,
  type SalesDocumentFormMode,
} from "./sales-form-stack";

interface SalesDocumentFormProps {
  documentType?: SalesDocumentType;
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function SalesDocumentForm({
  documentType,
  tabId,
  formData,
  context,
}: SalesDocumentFormProps) {
  const resolvedDocumentType =
    documentType ?? resolveSalesDocumentType(context) ?? "order";
  const mode = resolveSalesDocumentMode(context) as SalesDocumentFormMode;
  const orderNo = typeof context?.orderNo === "string" ? context.orderNo : "";
  const config = getSalesDocumentConfig(resolvedDocumentType);

  const { markAsSaved, closeTab, updateFormData } = useFormStack(tabId);
  const { updateTab } = useFormStackContext();

  // View-mode tabs have no unsaved changes — mark saved on mount and whenever mode reverts to view
  useEffect(() => {
    if (mode === "view") {
      markAsSaved();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelEdit = () => {
    if (!orderNo) return;
    updateTab(tabId, {
      title: `${config.detailTitlePrefix} ${orderNo}`,
      context: {
        ...context,
        documentType: resolvedDocumentType,
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
        documentType: resolvedDocumentType,
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
        documentType: resolvedDocumentType,
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
      <SalesCreateDocumentFormContent
        documentType={resolvedDocumentType}
        onSuccess={handleSuccess}
        onRequestEdit={handleRequestEdit}
        onCancelEdit={handleCancelEdit}
        mode={mode}
        orderNo={orderNo || undefined}
        initialFormData={formData as Record<string, unknown> | undefined}
        persistFormData={
          updateFormData as (data: Record<string, unknown>) => void
        }
      />
    </div>
  );
}
