"use client";

import {
  PurchaseCreateDocumentFormContent,
  type PurchaseCreateDocumentType,
} from "./purchase-create-document-form";
import {
  getPurchaseDocumentConfig,
  type PurchaseDocumentType,
} from "./purchase-document-config";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { useEffect, useState } from "react";
import {
  resolvePurchaseDocumentMode,
  resolvePurchaseDocumentType,
} from "./purchase-form-stack";
import type { PurchaseDocumentFormMode } from "./purchase-form-stack";

interface PurchaseDocumentFormProps {
  documentType?: PurchaseDocumentType;
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
  const resolvedDocumentType =
    documentType ?? resolvePurchaseDocumentType(context) ?? "order";
  const mode = resolvePurchaseDocumentMode(context) as PurchaseDocumentFormMode;
  const orderNo = typeof context?.orderNo === "string" ? context.orderNo : "";
  const [vendorName, setVendorName] = useState(
    typeof context?.vendorName === "string" ? context.vendorName : ""
  );
  const config = getPurchaseDocumentConfig(resolvedDocumentType);

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
    const titleSuffix = vendorName ? ` - ${vendorName}` : "";
    updateTab(tabId, {
      title: `${config.detailTitlePrefix} ${orderNo}${titleSuffix}`,
      context: {
        ...context,
        documentType: resolvedDocumentType,
        mode: "view",
        orderNo,
        vendorName,
      },
    });
  };

  const handleSuccess = (savedOrderNo: string, isPosted?: boolean) => {
    const onOrderPlaced = context?.onOrderPlaced as (() => void) | undefined;
    const onUpdated =
      (context?.onUpdated as (() => void) | undefined) ||
      (context?.refetch as (() => void) | undefined);

    markAsSaved();

    if (isPosted || mode === "view") {
      onUpdated?.();
      closeTab();
      return;
    }

    if (mode === "edit") {
      onUpdated?.();
    } else {
      onOrderPlaced?.();
    }

    const titleSuffix = vendorName ? ` - ${vendorName}` : "";
    updateTab(tabId, {
      title: `${config.detailTitlePrefix} ${savedOrderNo}${titleSuffix}`,
      context: {
        ...context,
        documentType: resolvedDocumentType,
        mode: "view",
        orderNo: savedOrderNo,
        refetch: onUpdated,
        vendorName,
      },
    });
  };

  const handleRequestEdit = () => {
    if (!orderNo) return;
    const titleSuffix = vendorName ? ` - ${vendorName}` : "";
    updateTab(tabId, {
      title: `Edit ${config.detailTitlePrefix} ${orderNo}${titleSuffix}`,
      context: {
        ...context,
        documentType: resolvedDocumentType,
        mode: "edit",
        orderNo,
        onUpdated:
          (context?.onUpdated as (() => void) | undefined) ||
          (context?.refetch as (() => void) | undefined),
        vendorName,
      },
    });
  };

  const handleHeaderLoaded = (header: any) => {
    const vName = header.Buy_from_Vendor_Name || "";
    setVendorName(vName);
    const titleSuffix = vName ? ` - ${vName}` : "";
    updateTab(tabId, {
      title: `${mode === "edit" ? "Edit " : ""}${config.detailTitlePrefix} ${orderNo}${titleSuffix}`,
      context: {
        ...context,
        vendorName: vName,
      },
    });
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <PurchaseCreateDocumentFormContent
        documentType={resolvedDocumentType as PurchaseCreateDocumentType}
        onSuccess={handleSuccess}
        onRequestEdit={handleRequestEdit}
        onCancelEdit={handleCancelEdit}
        onHeaderLoaded={handleHeaderLoaded}
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
