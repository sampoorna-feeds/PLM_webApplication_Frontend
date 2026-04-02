/**
 * Unified Purchase Create Document Form
 * Handles create flows for invoice, return-order, and credit-memo documents.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { VendorSelect, type PurchaseVendor } from "./vendor-select";
import { BrokerSelect } from "./broker-select";
import { OrderAddressSelect } from "./order-address-select";
import { PurchaserSelect } from "./purchaser-select";
import {
  CREDITOR_TYPE_OPTIONS,
  MASTER_DROPDOWN_PAGE_SIZE,
} from "./purchase-form-options";
import { PurchaseSearchableSelect } from "./purchase-searchable-select";
import {
  resolvePurchaseDocumentMode,
  useCreateOnlyPurchaseFormStack,
  type PurchaseDocumentFormMode,
} from "./purchase-form-stack";
import { getPurchaseDocumentCapabilities } from "./purchase-document-config";
import { buildPurchaseCommonHeaderData } from "./purchase-document-header-data";
import {
  mapPurchaseHeaderToFormData,
  mapPurchaseLineToLineItem,
  toStringValue,
} from "./purchase-document-hydration";
import {
  buildPurchaseCommonLineItemsData,
  resolvePurchaseLocationCode,
} from "./purchase-document-line-items-data";
import { getAuthCredentials } from "@/lib/auth/storage";
import { getErrorMessage } from "@/lib/errors";
import type { LineItem } from "@/components/forms/purchase/purchase-line-item.type";
import { PurchaseLineItemsTable } from "./purchase-line-items-table";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClearableField } from "@/components/ui/clearable-field";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { PurchaseOrderLineDialog as PurchaseLineDialog } from "./purchase-order-line-dialog";
import { PurchaseCopyDocumentDialog } from "./purchase-copy-document-dialog";
import {
  createPurchaseCreditMemo,
  createPurchaseCreditMemoCopyHeader,
  addPurchaseCreditMemoLineItems,
  getPurchaseCreditMemoByNo,
  getPurchaseCreditMemoLines,
  patchPurchaseCreditMemoHeader,
  deletePurchaseCreditMemoHeader,
  deleteSinglePurchaseCreditMemoLine,
} from "@/lib/api/services/purchase-credit-memo.service";
import {
  createPurchaseInvoice,
  createPurchaseInvoiceCopyHeader,
  addPurchaseInvoiceLineItems,
  getPurchaseInvoiceByNo,
  getPurchaseInvoiceLines,
  patchPurchaseInvoiceHeader,
  deletePurchaseInvoiceHeader,
  deleteSinglePurchaseInvoiceLine,
} from "@/lib/api/services/purchase-invoice.service";
import {
  createPurchaseReturnOrder,
  createPurchaseReturnOrderCopyHeader,
  addPurchaseReturnOrderLineItems,
  getPurchaseReturnOrderByNo,
  getPurchaseReturnOrderLines,
  patchPurchaseReturnOrderHeader,
  deletePurchaseReturnOrderHeader,
  deleteSinglePurchaseReturnOrderLine,
} from "@/lib/api/services/purchase-return-order.service";
import type {
  PurchaseOrderData,
  PurchaseOrderLineItem,
} from "@/lib/api/services/purchase-order.service";
import { buildPurchaseHeaderPayload } from "@/lib/api/services/purchase-header-payload";
import {
  cancelApprovalRequest,
  reopenPurchaseOrder,
  sendApprovalRequest,
  type PurchaseLine,
  type PurchaseOrder,
} from "@/lib/api/services/purchase-orders.service";
import type { PurchaseCopyToDocType } from "@/lib/api/services/purchase-copy-document.service";
import { getVendorDetails } from "@/lib/api/services/vendor.service";
import {
  purchaseDropdownsService,
  type TermAndCondition,
  type MandiMaster,
  type PaymentTerm,
} from "@/lib/api/services/purchase-dropdowns.service";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export type PurchaseCreateDocumentType =
  | "invoice"
  | "return-order"
  | "credit-memo";

interface PurchaseCreateDocumentConfig {
  documentType: PurchaseCreateDocumentType;
  createHeaderButtonLabel: string;
  toDocType: PurchaseCopyToDocType;
  displayTitle: string;
  primaryVendorRefLabel: string;
  primaryVendorRefField: "vendorInvoiceNo" | "vendorCrMemoNo";
  orderAddressGridClass: string;
  buildHeaderData: (
    formData: PurchaseCreateDocumentFormState,
  ) => PurchaseOrderData;
  createHeader: (
    data: PurchaseOrderData,
  ) => Promise<{ orderId: string; orderNo: string }>;
  createCopyHeader: (
    locationCode: string,
    lobCode: string,
  ) => Promise<{ orderId: string; orderNo: string }>;
  addLineItems: (
    documentNo: string,
    lineItems: PurchaseOrderLineItem[],
    locationCode: string,
  ) => Promise<void>;
  updateHeader: (
    documentNo: string,
    body: Record<string, unknown>,
  ) => Promise<unknown>;
  deleteHeader: (documentNo: string) => Promise<unknown>;
  deleteLine: (documentNo: string, lineNo: number) => Promise<void>;
  statusActions: {
    open: string[];
    pending: string[];
    released: string[];
  };
  fetchHeader: (documentNo: string) => Promise<PurchaseOrder | null>;
  fetchLines: (documentNo: string) => Promise<PurchaseLine[]>;
}

interface PurchaseCreateDocumentFormState {
  vendorNo: string;
  vendorName: string;
  purchasePersonCode: string;
  purchasePersonName: string;
  locationCode: string;
  postingDate: string;
  documentDate: string;
  orderDate: string;
  vendorInvoiceNo: string;
  vendorCrMemoNo: string;
  vendorAuthorizationNo: string;
  appliesToDocType: string;
  appliesToDocNo: string;
  invoiceType: string;
  lob: string;
  branch: string;
  loc: string;
  poType: string;
  serviceType: string;
  vendorGstRegNo: string;
  vendorPanNo: string;
  brokerNo: string;
  brokerName: string;
  brokerageRate: string;
  orderAddressCode: string;
  orderAddressName?: string;
  rateBasis: string;
  termCode: string;
  mandiName: string;
  paymentTermCode: string;
  dueDateCalculation: string;
  creditorType: string;
  qcType: string;
  dueDate: string;
}

const PURCHASE_CREATE_DOCUMENT_CONFIG: Record<
  PurchaseCreateDocumentType,
  PurchaseCreateDocumentConfig
> = {
  invoice: {
    documentType: "invoice",
    createHeaderButtonLabel: "Create Purchase Invoice",
    toDocType: "Invoice",
    displayTitle: "Invoice",
    primaryVendorRefLabel: "Vendor Invoice No.",
    primaryVendorRefField: "vendorInvoiceNo",
    orderAddressGridClass: "sm:col-span-2 lg:col-span-2",
    buildHeaderData: (formData) => ({
      ...buildPurchaseCommonHeaderData(formData),
      vendorInvoiceNo: formData.vendorInvoiceNo,
    }),
    createHeader: createPurchaseInvoice,
    createCopyHeader: createPurchaseInvoiceCopyHeader,
    addLineItems: addPurchaseInvoiceLineItems,
    updateHeader: patchPurchaseInvoiceHeader,
    deleteHeader: deletePurchaseInvoiceHeader,
    deleteLine: deleteSinglePurchaseInvoiceLine,
    statusActions: {
      open: ["Send For Approval"],
      pending: ["Cancel Approval"],
      released: ["Post", "Reopen"],
    },
    fetchHeader: getPurchaseInvoiceByNo,
    fetchLines: getPurchaseInvoiceLines,
  },
  "return-order": {
    documentType: "return-order",
    createHeaderButtonLabel: "Create Return Order",
    toDocType: "Return Order",
    displayTitle: "Return Order",
    primaryVendorRefLabel: "Vendor Cr. Memo No.",
    primaryVendorRefField: "vendorCrMemoNo",
    orderAddressGridClass: "sm:col-span-2 lg:col-span-1",
    buildHeaderData: (formData) => ({
      ...buildPurchaseCommonHeaderData(formData),
      vendorCrMemoNo: formData.vendorCrMemoNo,
      vendorAuthorizationNo: formData.vendorAuthorizationNo,
      appliesToDocType: formData.appliesToDocType,
      appliesToDocNo: formData.appliesToDocNo,
    }),
    createHeader: createPurchaseReturnOrder,
    createCopyHeader: createPurchaseReturnOrderCopyHeader,
    addLineItems: addPurchaseReturnOrderLineItems,
    updateHeader: patchPurchaseReturnOrderHeader,
    deleteHeader: deletePurchaseReturnOrderHeader,
    deleteLine: deleteSinglePurchaseReturnOrderLine,
    statusActions: {
      open: ["Send For Approval"],
      pending: ["Cancel Approval"],
      released: ["Post", "Reopen"],
    },
    fetchHeader: getPurchaseReturnOrderByNo,
    fetchLines: getPurchaseReturnOrderLines,
  },
  "credit-memo": {
    documentType: "credit-memo",
    createHeaderButtonLabel: "Create Credit Memo",
    toDocType: "Credit Memo",
    displayTitle: "Credit Memo",
    primaryVendorRefLabel: "Vendor Cr. Memo No.",
    primaryVendorRefField: "vendorCrMemoNo",
    orderAddressGridClass: "sm:col-span-2 lg:col-span-1",
    buildHeaderData: (formData) => ({
      ...buildPurchaseCommonHeaderData(formData),
      vendorCrMemoNo: formData.vendorCrMemoNo,
      appliesToDocType: formData.appliesToDocType,
      appliesToDocNo: formData.appliesToDocNo,
    }),
    createHeader: createPurchaseCreditMemo,
    createCopyHeader: createPurchaseCreditMemoCopyHeader,
    addLineItems: addPurchaseCreditMemoLineItems,
    updateHeader: patchPurchaseCreditMemoHeader,
    deleteHeader: deletePurchaseCreditMemoHeader,
    deleteLine: deleteSinglePurchaseCreditMemoLine,
    statusActions: {
      open: ["Send For Approval"],
      pending: ["Cancel Approval"],
      released: ["Post", "Reopen"],
    },
    fetchHeader: getPurchaseCreditMemoByNo,
    fetchLines: getPurchaseCreditMemoLines,
  },
};

export interface PurchaseCreateDocumentFormContentProps {
  documentType: PurchaseCreateDocumentType;
  mode?: PurchaseDocumentFormMode;
  orderNo?: string;
  onRequestEdit?: () => void;
  onCancelEdit?: () => void;
  /** Called when order is successfully placed */
  onSuccess: (orderNo: string) => void;
  /** Initial form data (for restore on page load/tab reopen) */
  initialFormData?: Record<string, any>;
  /** Optional: persist form data (e.g. to FormStack tab). Omit for standalone page. */
  persistFormData?: (data: Record<string, any>) => void;
}

export function PurchaseCreateDocumentFormContent({
  documentType,
  mode = "create",
  orderNo,
  onRequestEdit,
  onCancelEdit,
  onSuccess,
  initialFormData = {},
  persistFormData,
}: PurchaseCreateDocumentFormContentProps) {
  const config = PURCHASE_CREATE_DOCUMENT_CONFIG[documentType];
  const capabilities = getPurchaseDocumentCapabilities(documentType);
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";
  const isViewMode = mode === "view";
  const isReadOnlyMode = isViewMode;
  const [formData, setFormData] = useState({
    vendorNo: "",
    vendorName: "",
    purchasePersonCode: "",
    purchasePersonName: "",
    locationCode: "",
    postingDate: "",
    documentDate: "",
    orderDate: "",
    vendorInvoiceNo: "",
    vendorCrMemoNo: "",
    vendorAuthorizationNo: "",
    appliesToDocType: "Invoice",
    appliesToDocNo: "",
    invoiceType: "",
    lob: "",
    branch: "",
    loc: "",
    // New fields
    poType: "Goods",
    serviceType: "",
    vendorGstRegNo: "",
    vendorPanNo: "",
    brokerNo: "",
    brokerName: "",
    brokerageRate: "",
    orderAddressCode: "",
    rateBasis: "",
    termCode: "",
    mandiName: "",
    paymentTermCode: "",
    dueDateCalculation: "Posting Date",
    creditorType: "",
    qcType: "",
    dueDate: "",
    ...initialFormData,
  });

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    Array.isArray(initialFormData?.lineItems) ? initialFormData.lineItems : [],
  );
  const [createdOrderNo, setCreatedOrderNo] = useState<string>(
    typeof initialFormData?.createdOrderNo === "string"
      ? initialFormData.createdOrderNo
      : "",
  );
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(
    null,
  );
  const [isCreatingHeader, setIsCreatingHeader] = useState(false);
  const [isBootstrappingCopyHeader, setIsBootstrappingCopyHeader] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isUpdatingHeader, setIsUpdatingHeader] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<string>(
    typeof initialFormData?.status === "string" ? initialFormData.status : "",
  );
  const [isHydratingDocument, setIsHydratingDocument] = useState(
    !isCreateMode && Boolean(orderNo),
  );
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);
  const [isCopyDocOpen, setIsCopyDocOpen] = useState(false);

  const [termList, setTermList] = useState<TermAndCondition[]>([]);
  const [mandiList, setMandiList] = useState<MandiMaster[]>([]);
  const [paymentTermList, setPaymentTermList] = useState<PaymentTerm[]>([]);

  useEffect(() => {
    purchaseDropdownsService
      .getTermsAndConditionsPage(0, "", MASTER_DROPDOWN_PAGE_SIZE)
      .then(setTermList)
      .catch((err) => console.error("Error fetching terms:", err));
    purchaseDropdownsService
      .getMandiMastersPage(0, "", MASTER_DROPDOWN_PAGE_SIZE)
      .then(setMandiList)
      .catch((err) => console.error("Error fetching mandis:", err));
    purchaseDropdownsService
      .getPaymentTermsPage(0, "", MASTER_DROPDOWN_PAGE_SIZE)
      .then(setPaymentTermList)
      .catch((err) => console.error("Error fetching payment terms:", err));
  }, []);

  const persist = (data: Record<string, any>) => {
    if (persistFormData) persistFormData(data);
  };

  // Get logged-in user ID
  useEffect(() => {
    const credentials = getAuthCredentials();
    if (credentials) {
      setUserId(credentials.userID);
    }
  }, []);

  // Set all dates to today on load when form is not filled
  useEffect(() => {
    if (!isCreateMode) return;

    const today = new Date().toISOString().split("T")[0];
    setFormData((prev) => {
      const updates: Record<string, string> = {};
      if (!prev.postingDate) updates.postingDate = today;
      if (!prev.documentDate) updates.documentDate = today;
      if (!prev.orderDate) updates.orderDate = today;
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [isCreateMode]);

  // Initialize form data from props and restore persisted header/line state.
  useEffect(() => {
    if (!isCreateMode) return;

    if (initialFormData && Object.keys(initialFormData).length > 0) {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => {
        const next = { ...prev, ...initialFormData };
        if (!next.postingDate) next.postingDate = today;
        if (!next.documentDate) next.documentDate = today;
        if (!next.orderDate) next.orderDate = today;
        return next;
      });
      if (Array.isArray(initialFormData.lineItems)) {
        setLineItems(initialFormData.lineItems);
      }

      const restoredOrderNo =
        typeof initialFormData.createdOrderNo === "string"
          ? initialFormData.createdOrderNo
          : "";
      setCreatedOrderNo(restoredOrderNo);
    }
  }, [initialFormData, isCreateMode]);

  useEffect(() => {
    if (isCreateMode) {
      setIsHydratingDocument(false);
      return;
    }

    if (!orderNo) {
      setIsHydratingDocument(false);
      setPlaceOrderError("Missing document number for selected mode.");
      return;
    }

    let cancelled = false;
    setIsHydratingDocument(true);
    setPlaceOrderError(null);

    Promise.all([config.fetchHeader(orderNo), config.fetchLines(orderNo)])
      .then(([header, lines]) => {
        if (cancelled) return;
        if (!header) {
          throw new Error("Document not found.");
        }

        const mappedFormData = mapPurchaseHeaderToFormData(header);
        const mappedLineItems = lines.map(mapPurchaseLineToLineItem);

        setFormData((prev) => ({ ...prev, ...mappedFormData }));
        setLineItems(mappedLineItems);

        const hydratedDocumentNo = header.No || orderNo;
        setCreatedOrderNo(hydratedDocumentNo);
        setDocumentStatus(toStringValue(header.Status));

        persist({
          ...mappedFormData,
          lineItems: mappedLineItems,
          createdOrderNo: hydratedDocumentNo,
          status: toStringValue(header.Status),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setPlaceOrderError(
          getErrorMessage(error, "Failed to load purchase document."),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsHydratingDocument(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config, isCreateMode, orderNo]);

  // Sync Location Code with LOC value
  useEffect(() => {
    setFormData((prev) => {
      if (prev.loc !== prev.locationCode) {
        return { ...prev, locationCode: prev.loc || "" };
      }
      return prev;
    });
  }, [formData.loc]);

  // Simple input change handler
  const handleInputChange = (field: string, value: string) => {
    if (isReadOnlyMode) return;

    const newData = { ...formData, [field]: value };
    setFormData(newData);
  };

  // Vendor change handler — also fetches GST / PAN and resets order address
  const handleVendorChange = async (
    vendorNo: string,
    vendor?: PurchaseVendor,
  ) => {
    if (isReadOnlyMode) return;

    const newData = {
      ...formData,
      vendorNo,
      vendorName: vendor?.Name || "",
      locationCode: "",
      vendorGstRegNo: "",
      vendorPanNo: "",
      orderAddressCode: "",
    };
    setFormData(newData);

    // Fetch vendor details (GST, PAN)
    if (vendorNo) {
      const details = await getVendorDetails(vendorNo);
      if (details) {
        setFormData((prev) => ({
          ...prev,
          vendorGstRegNo: details.GST_Registration_No || "",
          vendorPanNo: details.P_A_N_No || "",
        }));
      }
    }
  };

  // Step 1 validation for required header fields.
  const isStep1Valid = (): boolean => {
    return !!(
      formData.lob &&
      formData.branch &&
      formData.loc &&
      formData.vendorNo &&
      formData.purchasePersonCode &&
      (formData.locationCode || formData.loc) &&
      formData.postingDate &&
      formData.documentDate &&
      (!capabilities.supportsOrderDate || formData.orderDate) &&
      (!capabilities.supportsPoType || formData.poType)
    );
  };

  const buildOrderData = (): PurchaseOrderData => {
    const data = { ...config.buildHeaderData(formData) };

    if (!capabilities.supportsPoType) {
      delete data.poType;
    }

    if (!capabilities.supportsServiceType) {
      delete data.serviceType;
    }

    if (!capabilities.supportsOrderDate) {
      data.orderDate = "";
    }

    if (!capabilities.supportsInvoiceType) {
      delete data.invoiceType;
    }

    if (!capabilities.supportsAppliesToFields) {
      delete data.appliesToDocType;
      delete data.appliesToDocNo;
    }

    if (!capabilities.supportsVendorAuthorizationNo) {
      delete data.vendorAuthorizationNo;
    }

    return data;
  };

  const handleCreateOrderHeader = async () => {
    if (!isCreateMode) return;

    if (!isStep1Valid()) {
      return;
    }

    setIsCreatingHeader(true);
    try {
      const orderResponse = await config.createHeader(buildOrderData());
      const orderNo = orderResponse.orderNo || orderResponse.orderId;

      if (!orderNo) {
        throw new Error("Failed to create order: No order number returned");
      }

      setCreatedOrderNo(orderNo);
      setDocumentStatus("Open");
      persist({
        ...formData,
        lineItems,
        createdOrderNo: orderNo,
        status: "Open",
      });
    } catch (error) {
      console.error(
        "Error creating purchase document header:",
        JSON.stringify(error, null, 2),
      );
      setPlaceOrderError(
        getErrorMessage(
          error,
          "Failed to create purchase document header. Please try again.",
        ),
      );
    } finally {
      setIsCreatingHeader(false);
    }
  };

  const handleOpenCopyDialog = async () => {
    if (!isCreateMode) return;

    if (createdOrderNo) {
      setIsCopyDocOpen(true);
      return;
    }

    const locationCode = resolvePurchaseLocationCode(
      formData.locationCode,
      formData.loc,
    );

    if (!locationCode) {
      setPlaceOrderError(
        "Select LOC / Location first. Copy flow requires location to create a document header.",
      );
      return;
    }

    const lobCode = formData.lob?.trim() || "";
    if (!lobCode) {
      setPlaceOrderError(
        "Select LOB first. Copy flow requires LOB and Location to create a document header.",
      );
      return;
    }

    setIsBootstrappingCopyHeader(true);
    setPlaceOrderError(null);
    try {
      const orderResponse = await config.createCopyHeader(
        locationCode,
        lobCode,
      );
      const orderNo = orderResponse.orderNo || orderResponse.orderId;

      if (!orderNo) {
        throw new Error(
          "Failed to create copy header: No document number returned",
        );
      }

      setFormData((previous) => ({
        ...previous,
        locationCode,
      }));
      setCreatedOrderNo(orderNo);
      setDocumentStatus("Open");

      persist({
        ...formData,
        locationCode,
        lineItems,
        createdOrderNo: orderNo,
        status: "Open",
      });

      setIsCopyDocOpen(true);
    } catch (error) {
      setPlaceOrderError(
        getErrorMessage(
          error,
          "Failed to create document for copy. Please try again.",
        ),
      );
    } finally {
      setIsBootstrappingCopyHeader(false);
    }
  };

  // Line Items management
  const handleAddLineItem = () => {
    if (!isCreateMode) return;

    if (!createdOrderNo) {
      setPlaceOrderError(
        "Create the document header first, then add line items.",
      );
      return;
    }

    setSelectedLineItem(null);
    setIsLineDialogOpen(true);
  };

  const handleEditLineItem = (lineItem: LineItem) => {
    if (!isCreateMode) return;

    setSelectedLineItem(lineItem);
    setIsLineDialogOpen(true);
  };

  const handleLineItemSave = (lineItem: LineItem) => {
    if (!isCreateMode) return;

    const updated = selectedLineItem
      ? lineItems.map((item) =>
          item.id === selectedLineItem.id ? lineItem : item,
        )
      : [...lineItems, lineItem];

    setLineItems(updated);
    setSelectedLineItem(null);
    setIsLineDialogOpen(false);
    persist({
      ...formData,
      lineItems: updated,
      createdOrderNo,
    });
  };

  const handleRemoveLineItem = (lineItemId: string) => {
    if (!isCreateMode) return;

    const updated = lineItems.filter((item) => item.id !== lineItemId);
    setLineItems(updated);
    persist({ ...formData, lineItems: updated, createdOrderNo });
  };

  const handleUpdateLineItem = (lineItem: LineItem) => {
    if (!isCreateMode) return;

    const updated = lineItems.map((item) =>
      item.id === lineItem.id ? lineItem : item,
    );
    setLineItems(updated);
    persist({ ...formData, lineItems: updated, createdOrderNo });
  };

  // Final submission (line-item creation after header creation)
  const handlePlaceOrder = async () => {
    if (!isCreateMode) return;

    if (!createdOrderNo) {
      setPlaceOrderError(
        "Create the document header before submitting line items.",
      );
      return;
    }

    if (lineItems.length === 0) {
      setPlaceOrderError("Add at least one line item before completing order.");
      return;
    }

    setIsSubmitting(true);
    try {
      const lineItemsData =
        buildPurchaseCommonLineItemsData<PurchaseOrderLineItem>(lineItems);
      const locationCode = resolvePurchaseLocationCode(
        formData.locationCode,
        formData.loc,
      );
      await config.addLineItems(createdOrderNo, lineItemsData, locationCode);
      onSuccess(createdOrderNo);
    } catch (error) {
      console.error(
        "Error submitting purchase document lines:",
        JSON.stringify(error, null, 2),
      );
      setPlaceOrderError(
        getErrorMessage(
          error,
          "Failed to submit line items. Please try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildHeaderPatchPayload = (): Record<string, unknown> => {
    return buildPurchaseHeaderPayload(formData, {
      includePoType: capabilities.supportsPoType,
      includeServiceType: capabilities.supportsServiceType,
      includeOrderDate: capabilities.supportsOrderDate,
      includeInvoiceType: capabilities.supportsInvoiceType,
      includeVendorAuthorizationNo: capabilities.supportsVendorAuthorizationNo,
      includeAppliesToFields: capabilities.supportsAppliesToFields,
      primaryVendorRefField: config.primaryVendorRefField,
    });
  };

  const refreshHydratedDocument = async () => {
    if (!createdOrderNo) return;

    const [header, lines] = await Promise.all([
      config.fetchHeader(createdOrderNo),
      config.fetchLines(createdOrderNo),
    ]);

    if (!header) {
      throw new Error("Document not found.");
    }

    const mappedFormData = mapPurchaseHeaderToFormData(header);
    const mappedLineItems = lines.map(mapPurchaseLineToLineItem);
    const status = toStringValue(header.Status);

    setFormData((prev) => ({ ...prev, ...mappedFormData }));
    setLineItems(mappedLineItems);
    setDocumentStatus(status);

    persist({
      ...mappedFormData,
      lineItems: mappedLineItems,
      createdOrderNo,
      status,
    });
  };

  const handleCopyDocumentSuccess = async () => {
    try {
      await refreshHydratedDocument();
      toast.success(`${config.displayTitle} copied successfully.`);
    } catch (error) {
      const message = getErrorMessage(
        error,
        `Copied data loaded, but refreshing ${config.displayTitle} failed.`,
      );
      setPlaceOrderError(message);
      throw new Error(message);
    }
  };

  const handleUpdateDocument = async () => {
    if (!isEditMode || !createdOrderNo) return;

    if (!isStep1Valid()) {
      setPlaceOrderError("Please fill all mandatory fields before updating.");
      return;
    }

    setIsUpdatingHeader(true);
    setPlaceOrderError(null);
    try {
      await config.updateHeader(createdOrderNo, buildHeaderPatchPayload());
      await refreshHydratedDocument();
      toast.success(`${config.displayTitle} updated successfully.`);
      onSuccess(createdOrderNo);
    } catch (error) {
      setPlaceOrderError(
        getErrorMessage(error, `Failed to update ${config.displayTitle}.`),
      );
    } finally {
      setIsUpdatingHeader(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!isViewMode || !createdOrderNo) return;

    const confirmed = window.confirm(
      `Delete ${config.displayTitle} ${createdOrderNo} and all of its lines?`,
    );
    if (!confirmed) return;

    setIsActionLoading(true);
    setPlaceOrderError(null);
    try {
      const persistedLineNos = lineItems
        .map((line) => line.lineNo)
        .filter((lineNo): lineNo is number => typeof lineNo === "number");

      for (const lineNo of persistedLineNos) {
        await config.deleteLine(createdOrderNo, lineNo);
      }

      await config.deleteHeader(createdOrderNo);
      toast.success(`${config.displayTitle} deleted successfully.`);
      onSuccess(createdOrderNo);
    } catch (error) {
      setPlaceOrderError(
        getErrorMessage(error, `Failed to delete ${config.displayTitle}.`),
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendForApproval = async () => {
    if (!createdOrderNo) return;

    setIsActionLoading(true);
    setPlaceOrderError(null);
    try {
      await sendApprovalRequest(createdOrderNo);
      await refreshHydratedDocument();
      toast.success("Sent for approval.");
    } catch (error) {
      setPlaceOrderError(getErrorMessage(error, "Send for approval failed."));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelApproval = async () => {
    if (!createdOrderNo) return;

    setIsActionLoading(true);
    setPlaceOrderError(null);
    try {
      await cancelApprovalRequest(createdOrderNo);
      await refreshHydratedDocument();
      toast.success("Approval cancelled.");
    } catch (error) {
      setPlaceOrderError(getErrorMessage(error, "Cancel approval failed."));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReopenDocument = async () => {
    if (!createdOrderNo) return;

    setIsActionLoading(true);
    setPlaceOrderError(null);
    try {
      await reopenPurchaseOrder(createdOrderNo);
      await refreshHydratedDocument();
      toast.success("Document reopened.");
    } catch (error) {
      setPlaceOrderError(getErrorMessage(error, "Reopen failed."));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStatusAction = async (action: string) => {
    if (action === "Send For Approval") {
      await handleSendForApproval();
      return;
    }
    if (action === "Cancel Approval") {
      await handleCancelApproval();
      return;
    }
    if (action === "Reopen") {
      await handleReopenDocument();
      return;
    }
    if (action === "Post") {
      toast.info(`Post flow for ${config.displayTitle} will be wired next.`);
      return;
    }
  };

  // Step 1: Order Information
  const fieldClass = "min-w-0 space-y-0.5";
  const labelClass = "text-muted-foreground block text-[11px] font-medium";
  const renderStep1 = () => {
    const isOpenStatus = documentStatus === "Open";
    const isPendingApprovalStatus = documentStatus === "Pending Approval";
    const isReleasedStatus = documentStatus === "Released";
    const statusActions = isOpenStatus
      ? config.statusActions.open
      : isPendingApprovalStatus
        ? config.statusActions.pending
        : isReleasedStatus
          ? config.statusActions.released
          : [];
    const defaultAccordionValue =
      isCreateMode || isEditMode
        ? ["general", "tax-information", "vendor-statistics"]
        : ["general"];
    const areFieldsReadOnly =
      isViewMode || (isCreateMode && Boolean(createdOrderNo));

    return (
      <div className="space-y-3">
        {createdOrderNo && !isCreateMode && (
          <div className="mb-1 flex flex-wrap items-center justify-end gap-2 pb-1">
            {documentStatus && (
              <div className="mr-auto flex items-center gap-2">
                <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Status:
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 px-3 text-[10px] font-bold tracking-wider uppercase",
                    documentStatus === "Released" &&
                      "border-green-200 bg-green-500/10 text-green-600",
                    documentStatus === "Pending Approval" &&
                      "border-yellow-200 bg-yellow-500/10 text-yellow-600",
                    documentStatus === "Open" &&
                      "border-blue-200 bg-blue-500/10 text-blue-600",
                  )}
                >
                  {documentStatus}
                </Badge>
              </div>
            )}

            {isViewMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={onRequestEdit}
                disabled={isActionLoading || !onRequestEdit}
              >
                Edit
              </Button>
            )}

            {isViewMode && !isPendingApprovalStatus && !isReleasedStatus && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={handleDeleteDocument}
                disabled={isActionLoading}
              >
                Delete
              </Button>
            )}

            {isViewMode &&
              statusActions.map((action) => (
                <Button
                  key={action}
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => handleStatusAction(action)}
                  disabled={isActionLoading}
                >
                  {action}
                </Button>
              ))}

            {isEditMode && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={onCancelEdit}
                  disabled={isUpdatingHeader || !onCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleUpdateDocument}
                  disabled={isUpdatingHeader}
                >
                  {isUpdatingHeader ? "Updating..." : "Update"}
                </Button>
              </>
            )}
          </div>
        )}

        {createdOrderNo && isCreateMode && (
          <div className="bg-primary/5 text-primary rounded-md border px-3 py-1.5 text-xs font-medium">
            {`Header created: ${createdOrderNo}. Continue to Line Items.`}
          </div>
        )}

        <div className="space-y-4">
          <Accordion
            key={mode}
            type="multiple"
            defaultValue={defaultAccordionValue}
            className="w-full space-y-2"
          >
            <AccordionItem value="general" className="border-none">
              <AccordionTrigger className="data-[state=open]:border-b-border py-0 hover:no-underline data-[state=open]:border-b data-[state=open]:pb-2 [&>svg]:size-4">
                <h3 className="px-2 py-1 text-left text-[10px] font-bold tracking-wider uppercase">
                  General
                </h3>
              </AccordionTrigger>
              <AccordionContent
                className={cn(
                  "pb-2",
                  areFieldsReadOnly && "pointer-events-none opacity-70",
                )}
              >
                <section className="space-y-2 pt-2">
                  <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
                    {capabilities.supportsPoType && (
                      <div className={fieldClass}>
                        <label className={labelClass}>PO Type</label>
                        <Select
                          value={formData.poType}
                          onValueChange={(value) =>
                            handleInputChange("poType", value)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Goods">Goods</SelectItem>
                            <SelectItem value="Service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {capabilities.supportsServiceType &&
                      formData.poType === "Service" && (
                        <div className={fieldClass}>
                          <label className={labelClass}>Service Type</label>
                          <ClearableField
                            value={formData.serviceType}
                            onClear={() => handleInputChange("serviceType", "")}
                          >
                            <Select
                              value={formData.serviceType || ""}
                              onValueChange={(value) =>
                                handleInputChange(
                                  "serviceType",
                                  value === "none" ? "" : value,
                                )
                              }
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="Logistics">
                                  Logistics
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </ClearableField>
                        </div>
                      )}
                    {capabilities.supportsInvoiceType && (
                      <div className={fieldClass}>
                        <label className={labelClass}>Invoice Type</label>
                        <ClearableField
                          value={formData.invoiceType}
                          onClear={() => handleInputChange("invoiceType", "")}
                        >
                          <Select
                            value={formData.invoiceType || ""}
                            onValueChange={(value) =>
                              handleInputChange("invoiceType", value)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Select / None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bill of supply">
                                Bill of supply
                              </SelectItem>
                              <SelectItem value="Export">Export</SelectItem>
                              <SelectItem value="Supplementary">
                                Supplementary
                              </SelectItem>
                              <SelectItem value="Debit Note">
                                Debit Note
                              </SelectItem>
                              <SelectItem value="Non-GST">Non-GST</SelectItem>
                              <SelectItem value="Taxable">Taxable</SelectItem>
                            </SelectContent>
                          </Select>
                        </ClearableField>
                      </div>
                    )}
                    <div className={fieldClass}>
                      <label className={labelClass}>Purchaser Code</label>
                      <ClearableField
                        value={formData.purchasePersonCode}
                        onClear={() =>
                          handleInputChange("purchasePersonCode", "")
                        }
                      >
                        <PurchaserSelect
                          value={formData.purchasePersonCode || ""}
                          onChange={(val, sp) => {
                            setFormData((prev) => ({
                              ...prev,
                              purchasePersonCode: val,
                              purchasePersonName: sp?.Name || "",
                            }));
                          }}
                          placeholder="Select Purchaser"
                        />
                      </ClearableField>
                      {formData.purchasePersonName && (
                        <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                          {formData.purchasePersonName}
                        </p>
                      )}
                    </div>

                    {/* Dimensions */}
                    <div className={fieldClass}>
                      <label className={labelClass}>LOB</label>
                      <ClearableField
                        value={formData.lob}
                        onClear={() => handleInputChange("lob", "")}
                      >
                        <CascadingDimensionSelect
                          dimensionType="LOB"
                          value={formData.lob}
                          onChange={(value) => handleInputChange("lob", value)}
                          placeholder="Select LOB"
                          userId={userId}
                          compactWhenSingle
                        />
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Branch</label>
                      <ClearableField
                        value={formData.branch}
                        onClear={() => handleInputChange("branch", "")}
                      >
                        <CascadingDimensionSelect
                          dimensionType="BRANCH"
                          value={formData.branch}
                          onChange={(value) =>
                            handleInputChange("branch", value)
                          }
                          placeholder="Select Branch"
                          lobValue={formData.lob}
                          userId={userId}
                          compactWhenSingle
                        />
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>LOC</label>
                      <ClearableField
                        value={formData.loc}
                        onClear={() => handleInputChange("loc", "")}
                      >
                        <CascadingDimensionSelect
                          dimensionType="LOC"
                          value={formData.loc}
                          onChange={(value) => handleInputChange("loc", value)}
                          placeholder="Select LOC"
                          lobValue={formData.lob}
                          branchValue={formData.branch}
                          userId={userId}
                          compactWhenSingle
                        />
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Location</label>
                      <Input
                        value={formData.locationCode || formData.loc || ""}
                        disabled
                        className="bg-muted h-7 text-xs"
                        readOnly
                      />
                      {formData.locationCode && (
                        <p className="text-muted-foreground mt-0.5 overflow-hidden pl-1 text-[9px] text-ellipsis whitespace-nowrap">
                          {formData.locationCode} Location
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </AccordionContent>
            </AccordionItem>

            <Separator />

            <AccordionItem value="tax-information" className="border-none">
              <AccordionTrigger className="data-[state=open]:border-b-border py-0 hover:no-underline data-[state=open]:border-b data-[state=open]:pb-2 [&>svg]:size-4">
                <h3 className="px-2 py-1 text-left text-[10px] font-bold tracking-wider uppercase">
                  Tax Information
                </h3>
              </AccordionTrigger>
              <AccordionContent
                className={cn(
                  "pb-2",
                  areFieldsReadOnly && "pointer-events-none opacity-70",
                )}
              >
                <section className="space-y-2 pt-2">
                  <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
                    <div className={fieldClass}>
                      <label className={labelClass}>Vendor</label>
                      <ClearableField
                        value={formData.vendorNo}
                        onClear={() => handleVendorChange("", undefined)}
                      >
                        <VendorSelect
                          value={formData.vendorNo}
                          onChange={handleVendorChange}
                          placeholder="Select Vendor"
                        />
                      </ClearableField>
                      {formData.vendorName && (
                        <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                          {formData.vendorName}
                        </p>
                      )}
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Vendor GST No.</label>
                      <Input
                        value={formData.vendorGstRegNo}
                        disabled
                        className="bg-muted h-7 text-xs"
                        placeholder="Auto"
                        readOnly
                      />
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Vendor PAN</label>
                      <Input
                        value={formData.vendorPanNo}
                        disabled
                        className="bg-muted h-7 text-xs"
                        placeholder="Auto"
                        readOnly
                      />
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>
                        {config.primaryVendorRefLabel}
                      </label>
                      <ClearableField
                        value={formData[config.primaryVendorRefField]}
                        onClear={() =>
                          handleInputChange(config.primaryVendorRefField, "")
                        }
                      >
                        <Input
                          value={formData[config.primaryVendorRefField]}
                          onChange={(e) =>
                            handleInputChange(
                              config.primaryVendorRefField,
                              e.target.value,
                            )
                          }
                          placeholder="Optional"
                          className="h-7 text-xs"
                        />
                      </ClearableField>
                    </div>
                    {capabilities.supportsVendorAuthorizationNo && (
                      <div className={fieldClass}>
                        <label className={labelClass}>Vendor Auth. No.</label>
                        <ClearableField
                          value={formData.vendorAuthorizationNo}
                          onClear={() =>
                            handleInputChange("vendorAuthorizationNo", "")
                          }
                        >
                          <Input
                            value={formData.vendorAuthorizationNo}
                            onChange={(e) =>
                              handleInputChange(
                                "vendorAuthorizationNo",
                                e.target.value,
                              )
                            }
                            placeholder="Optional"
                            className="h-7 text-xs"
                          />
                        </ClearableField>
                      </div>
                    )}
                    {capabilities.supportsAppliesToFields && (
                      <div className={fieldClass}>
                        <label className={labelClass}>
                          Applies-to Doc. Type
                        </label>
                        <Select
                          value={formData.appliesToDocType}
                          onValueChange={(val) =>
                            handleInputChange("appliesToDocType", val)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs font-semibold">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Invoice">Invoice</SelectItem>
                            <SelectItem value="Receipt">Receipt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {capabilities.supportsAppliesToFields && (
                      <div className={fieldClass}>
                        <label className={labelClass}>
                          Applies-to Doc. No.
                        </label>
                        <ClearableField
                          value={formData.appliesToDocNo}
                          onClear={() =>
                            handleInputChange("appliesToDocNo", "")
                          }
                        >
                          <Input
                            value={formData.appliesToDocNo}
                            onChange={(e) =>
                              handleInputChange(
                                "appliesToDocNo",
                                e.target.value,
                              )
                            }
                            placeholder="Optional"
                            className="h-7 text-xs"
                          />
                        </ClearableField>
                      </div>
                    )}
                    <div
                      className={`${fieldClass} ${config.orderAddressGridClass}`}
                    >
                      <label className={labelClass}>Order Address Select</label>
                      <OrderAddressSelect
                        vendorNo={formData.vendorNo}
                        value={formData.orderAddressCode}
                        onChange={(code, addr) =>
                          setFormData((prev) => ({
                            ...prev,
                            orderAddressCode: code,
                            orderAddressName: addr?.Name || "",
                          }))
                        }
                        disabled={!formData.vendorNo}
                      />
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Brokerage Code</label>
                      <ClearableField
                        value={formData.brokerNo}
                        onClear={() =>
                          setFormData((prev) => ({
                            ...prev,
                            brokerNo: "",
                            brokerName: "",
                          }))
                        }
                      >
                        <BrokerSelect
                          value={formData.brokerNo}
                          onChange={(code, broker) =>
                            setFormData((prev) => ({
                              ...prev,
                              brokerNo: code,
                              brokerName: broker?.Name || "",
                            }))
                          }
                        />
                      </ClearableField>
                      {formData.brokerName && (
                        <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                          {formData.brokerName}
                        </p>
                      )}
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Brokerage Rate</label>
                      <ClearableField
                        value={formData.brokerageRate}
                        onClear={() => handleInputChange("brokerageRate", "")}
                      >
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={formData.brokerageRate}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              handleInputChange("brokerageRate", val);
                            }
                          }}
                          className="h-7 text-xs"
                          placeholder="0.00"
                        />
                      </ClearableField>
                    </div>
                  </div>
                </section>
              </AccordionContent>
            </AccordionItem>

            <Separator />

            <AccordionItem value="vendor-statistics" className="border-none">
              <AccordionTrigger className="data-[state=open]:border-b-border py-0 hover:no-underline data-[state=open]:border-b data-[state=open]:pb-2 [&>svg]:size-4">
                <h3 className="px-2 py-1 text-left text-[10px] font-bold tracking-wider uppercase">
                  Vendor Statistics
                </h3>
              </AccordionTrigger>
              <AccordionContent
                className={cn(
                  "pb-2",
                  areFieldsReadOnly && "pointer-events-none opacity-70",
                )}
              >
                <section className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4 lg:grid-cols-6">
                    <div className={fieldClass}>
                      <label className={labelClass}>Posting Date</label>
                      <ClearableField
                        value={formData.postingDate}
                        onClear={() => handleInputChange("postingDate", "")}
                      >
                        <Input
                          type="date"
                          value={formData.postingDate}
                          onChange={(e) =>
                            handleInputChange("postingDate", e.target.value)
                          }
                          className="h-7 text-xs"
                        />
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Document Date</label>
                      <ClearableField
                        value={formData.documentDate}
                        onClear={() => handleInputChange("documentDate", "")}
                      >
                        <Input
                          type="date"
                          value={formData.documentDate}
                          onChange={(e) =>
                            handleInputChange("documentDate", e.target.value)
                          }
                          className="h-7 text-xs"
                        />
                      </ClearableField>
                    </div>
                    {capabilities.supportsOrderDate && (
                      <div className={fieldClass}>
                        <label className={labelClass}>Order Date</label>
                        <Input
                          type="date"
                          value={formData.orderDate}
                          onChange={(e) =>
                            handleInputChange("orderDate", e.target.value)
                          }
                          disabled
                          className="bg-muted h-7 text-xs"
                        />
                      </div>
                    )}
                    <div className={fieldClass}>
                      <label className={labelClass}>Due Date</label>
                      <ClearableField
                        value={formData.dueDate}
                        onClear={() => handleInputChange("dueDate", "")}
                      >
                        <Input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) =>
                            handleInputChange("dueDate", e.target.value)
                          }
                          className="h-7 text-xs"
                        />
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Due Date Calc</label>
                      <Select
                        value={formData.dueDateCalculation}
                        onValueChange={(value) =>
                          handleInputChange("dueDateCalculation", value)
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Posting Date">
                            Posting Date
                          </SelectItem>
                          <SelectItem value="Document Date">
                            Document Date
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Rate Basis</label>
                      <Select
                        value={formData.rateBasis}
                        onValueChange={(value) =>
                          handleInputChange("rateBasis", value)
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EX">EX</SelectItem>
                          <SelectItem value="FOR">FOR</SelectItem>
                          <SelectItem value="CIF">CIF</SelectItem>
                          <SelectItem value="FOB">FOB</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Creditor Type</label>
                      <PurchaseSearchableSelect
                        value={formData.creditorType}
                        onChange={(value) =>
                          handleInputChange("creditorType", value)
                        }
                        options={CREDITOR_TYPE_OPTIONS}
                        placeholder="Select creditor"
                      />
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>QC Type</label>
                      <Select
                        value={formData.qcType}
                        onValueChange={(value) =>
                          handleInputChange("qcType", value)
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          <SelectItem value="Ex Passing">Ex Passing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Term Code</label>
                      <PurchaseSearchableSelect
                        value={formData.termCode}
                        onChange={(value) =>
                          handleInputChange("termCode", value)
                        }
                        options={termList.map((t) => ({
                          value: t.Terms,
                          label: `${t.Terms} - ${t.Conditions}`,
                        }))}
                        placeholder="Select term"
                        loadMore={async (skip, searchValue) => {
                          const rows =
                            await purchaseDropdownsService.getTermsAndConditionsPage(
                              skip,
                              searchValue,
                              MASTER_DROPDOWN_PAGE_SIZE,
                            );
                          return rows.map((t) => ({
                            value: t.Terms,
                            label: `${t.Terms} - ${t.Conditions}`,
                          }));
                        }}
                      />
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Payment Term</label>
                      <PurchaseSearchableSelect
                        value={formData.paymentTermCode}
                        onChange={(value) =>
                          handleInputChange("paymentTermCode", value)
                        }
                        options={paymentTermList.map((p) => ({
                          value: p.Code,
                          label: `${p.Code} - ${p.Description}`,
                        }))}
                        placeholder="Select pmt term"
                        loadMore={async (skip, searchValue) => {
                          const rows =
                            await purchaseDropdownsService.getPaymentTermsPage(
                              skip,
                              searchValue,
                              MASTER_DROPDOWN_PAGE_SIZE,
                            );
                          return rows.map((p) => ({
                            value: p.Code,
                            label: `${p.Code} - ${p.Description}`,
                          }));
                        }}
                      />
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Mandi Name</label>
                      <PurchaseSearchableSelect
                        value={formData.mandiName}
                        onChange={(value) =>
                          handleInputChange("mandiName", value)
                        }
                        options={mandiList.map((m) => ({
                          value: m.Code,
                          label: `${m.Code} - ${m.Description}`,
                        }))}
                        placeholder="Select mandi"
                        loadMore={async (skip, searchValue) => {
                          const rows =
                            await purchaseDropdownsService.getMandiMastersPage(
                              skip,
                              searchValue,
                              MASTER_DROPDOWN_PAGE_SIZE,
                            );
                          return rows.map((m) => ({
                            value: m.Code,
                            label: `${m.Code} - ${m.Description}`,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </section>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    );
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <RequestFailedDialog
        open={!!placeOrderError}
        message={placeOrderError}
        onOpenChange={(open) => !open && setPlaceOrderError(null)}
      />
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isHydratingDocument && (
            <div className="text-muted-foreground mb-4 text-sm">
              Loading document...
            </div>
          )}

          {renderStep1()}

          {createdOrderNo && (
            <section className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Line Items</h3>
                  <p className="text-muted-foreground text-xs">
                    Document No: {createdOrderNo}
                  </p>
                </div>
                {isCreateMode && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={handleOpenCopyDialog}
                    >
                      Copy Document
                    </Button>
                    <Button
                      onClick={handleAddLineItem}
                      size="sm"
                      className="h-8"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>
                )}
              </div>

              <PurchaseLineItemsTable
                lineItems={lineItems}
                onEdit={isCreateMode ? handleEditLineItem : undefined}
                onRemove={isCreateMode ? handleRemoveLineItem : undefined}
                onRowClick={isCreateMode ? handleEditLineItem : undefined}
                showRowActions={isCreateMode}
                documentType={documentType}
              />

              <div className="bg-muted/20 flex justify-end rounded-lg border px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground text-sm">
                    Total Amount
                  </span>
                  <span className="text-base font-semibold">
                    {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        {isCreateMode && (
          <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-3">
            <div className="text-muted-foreground text-xs">
              {createdOrderNo
                ? `Order ${createdOrderNo} ready for completion`
                : "Create header to add lines, or copy from another document (location required)."}
            </div>

            {!createdOrderNo ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenCopyDialog}
                  disabled={isBootstrappingCopyHeader || isCreatingHeader}
                >
                  {isBootstrappingCopyHeader
                    ? "Preparing Copy..."
                    : "Copy Document"}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateOrderHeader}
                  disabled={
                    !isStep1Valid() ||
                    isCreatingHeader ||
                    isBootstrappingCopyHeader
                  }
                >
                  {isCreatingHeader
                    ? "Creating..."
                    : config.createHeaderButtonLabel}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || lineItems.length === 0}
              >
                {isSubmitting ? "Saving Line Items..." : "Complete Document"}
              </Button>
            )}
          </div>
        )}
      </div>

      {isCreateMode && isLineDialogOpen && (
        <PurchaseLineDialog
          isOpen={isLineDialogOpen}
          onOpenChange={(open) => {
            setIsLineDialogOpen(open);
            if (!open) {
              setSelectedLineItem(null);
            }
          }}
          lineItem={selectedLineItem}
          documentType={documentType}
          vendorNo={formData.vendorNo}
          locationCode={formData.locationCode || formData.loc || ""}
          onSave={handleLineItemSave}
        />
      )}

      {isCreateMode && createdOrderNo && (
        <PurchaseCopyDocumentDialog
          open={isCopyDocOpen}
          toDocNo={createdOrderNo}
          toDocType={config.toDocType}
          onOpenChange={setIsCopyDocOpen}
          onSuccess={handleCopyDocumentSuccess}
        />
      )}
    </>
  );
}

/** FormStack tab wrapper for create-only purchase documents. */
interface PurchaseCreateDocumentFormProps {
  documentType: PurchaseCreateDocumentType;
  tabId: string;
  mode?: PurchaseDocumentFormMode;
  orderNo?: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
  onSuccess?: (orderNo: string) => void;
  persistFormData?: (data: Record<string, any>) => void;
  onRequestEdit?: () => void;
  onCancelEdit?: () => void;
}

export function PurchaseCreateDocumentForm({
  documentType,
  tabId,
  mode,
  orderNo,
  formData: initialFormData,
  context,
  onSuccess: onSuccessOverride,
  persistFormData: persistFormDataOverride,
  onRequestEdit,
  onCancelEdit,
}: PurchaseCreateDocumentFormProps) {
  const createOnlyFormStack = useCreateOnlyPurchaseFormStack(tabId, context);
  const resolvedOnSuccess = onSuccessOverride ?? createOnlyFormStack.onSuccess;
  const resolvedPersistFormData =
    persistFormDataOverride ?? createOnlyFormStack.persistFormData;
  const resolvedMode = mode ?? resolvePurchaseDocumentMode(context);
  const resolvedOrderNo =
    orderNo ??
    (typeof context?.orderNo === "string" ? context.orderNo : undefined);

  return (
    <PurchaseCreateDocumentFormContent
      documentType={documentType}
      mode={resolvedMode}
      orderNo={resolvedOrderNo}
      onRequestEdit={onRequestEdit}
      onCancelEdit={onCancelEdit}
      onSuccess={resolvedOnSuccess}
      initialFormData={initialFormData}
      persistFormData={resolvedPersistFormData}
    />
  );
}
