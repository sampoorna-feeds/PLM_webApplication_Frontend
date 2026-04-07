/**
 * Unified Purchase Create Document Form
 * Handles create flows for invoice, return-order, and credit-memo documents.
 */

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { getVendorTDSGroupCodes } from "@/lib/api/services/tds.service";
import type { LineItem } from "@/components/forms/purchase/purchase-line-item.type";
import { PurchaseLineItemsTable } from "./purchase-line-items-table";
import {
  Plus,
  FileText,
  Paperclip,
  LoaderCircleIcon,
  Copy,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ClearableField } from "@/components/ui/clearable-field";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { PurchaseOrderLineDialog as PurchaseLineDialog } from "./purchase-order-line-dialog";
import { PurchaseOrderLineEditDialog as PurchaseLineEditDialog } from "./purchase-order-line-edit-dialog";
import { POAttachmentDialog } from "./po-attachment-dialog";
import { PurchaseCommentsDialog } from "./purchase-comments-dialog";
import type { PurchaseCommentDocumentType } from "@/lib/api/services/purchase-comment.service";
import { PurchaseItemTrackingDialog } from "./purchase-item-tracking-dialog";
import { ItemChargeAssignmentDialog } from "./item-charge-assignment-dialog";
import { ItemChargeMultiSelectDialog } from "./item-charge-multi-select-dialog";
import { PostGateEntryDialog } from "./post-gate-entry-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { PurchaseCopyDocumentDialog } from "./purchase-copy-document-dialog";
import { PurchaseGetPostedLineDialog } from "./purchase-get-posted-line-dialog";
import {
  createPurchaseCreditMemo,
  createPurchaseCreditMemoCopyHeader,
  addSinglePurchaseCreditMemoLine,
  addPurchaseCreditMemoLineItems,
  getPurchaseCreditMemoByNo,
  getPurchaseCreditMemoLines,
  patchPurchaseCreditMemoHeader,
  updateSinglePurchaseCreditMemoLine,
  deletePurchaseCreditMemoHeader,
  deleteSinglePurchaseCreditMemoLine,
} from "@/lib/api/services/purchase-credit-memo.service";
import {
  createPurchaseInvoice,
  createPurchaseInvoiceCopyHeader,
  addSinglePurchaseInvoiceLine,
  addPurchaseInvoiceLineItems,
  getPurchaseInvoiceByNo,
  getPurchaseInvoiceLines,
  patchPurchaseInvoiceHeader,
  updateSinglePurchaseInvoiceLine,
  deletePurchaseInvoiceHeader,
  deleteSinglePurchaseInvoiceLine,
} from "@/lib/api/services/purchase-invoice.service";
import {
  createPurchaseReturnOrder,
  createPurchaseReturnOrderCopyHeader,
  addSinglePurchaseReturnOrderLine,
  addPurchaseReturnOrderLineItems,
  getPurchaseReturnOrderByNo,
  getPurchaseReturnOrderLines,
  patchPurchaseReturnOrderHeader,
  updateSinglePurchaseReturnOrderLine,
  deletePurchaseReturnOrderHeader,
  deleteSinglePurchaseReturnOrderLine,
} from "@/lib/api/services/purchase-return-order.service";
import { patchPurchaseDocumentLineByKey } from "@/lib/api/services/purchase-document.service";
import {
  createPurchaseOrder,
  addPurchaseOrderLineItems,
  addSinglePurchaseOrderLine,
  updateSinglePurchaseOrderLine,
  deleteSinglePurchaseOrderLine,
  type PurchaseOrderData,
  type PurchaseOrderLineItem,
} from "@/lib/api/services/purchase-order.service";
import {
  getPurchaseOrderByNo,
  getPurchaseOrderLines,
  patchPurchaseOrderHeader,
  deletePurchaseOrderHeader,
  deletePurchaseOrderLine,
  postPurchaseOrder,
  getPurchasereceipts,
  getPurchaseOrderReport,
  getPurchasereceiptReport,
  type PurchaseReceipt,
} from "@/lib/api/services/purchase-orders.service";
import { getDimensionValueName } from "@/lib/api/services/dimension.service";
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
import { SearchableSelect } from "@/components/ui/searchable-select";

export type PurchaseCreateDocumentType =
  | "order"
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
  /** When true, onSuccess is called immediately after header creation (no line staging). Used for 'order' type. */
  immediateSuccess?: boolean;
  buildHeaderData: (
    formData: PurchaseCreateDocumentFormState,
  ) => PurchaseOrderData;
  createHeader: (
    data: PurchaseOrderData,
  ) => Promise<{ orderId: string; orderNo: string }>;
  createCopyHeader: (
    locationCode: string,
  ) => Promise<{ orderId: string; orderNo: string }>;
  addLineItems: (
    documentNo: string,
    lineItems: PurchaseOrderLineItem[],
    locationCode: string,
  ) => Promise<void>;
  addSingleLine: (
    documentNo: string,
    lineItem: PurchaseOrderLineItem,
    locationCode: string,
  ) => Promise<{ Line_No: number; [key: string]: unknown }>;
  updateSingleLine: (
    documentNo: string,
    lineNo: number,
    lineItem: Partial<PurchaseOrderLineItem>,
  ) => Promise<{ Line_No: number; [key: string]: unknown }>;
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
    addSingleLine: addSinglePurchaseInvoiceLine,
    updateSingleLine: updateSinglePurchaseInvoiceLine,
    updateHeader: patchPurchaseInvoiceHeader,
    deleteHeader: deletePurchaseInvoiceHeader,
    deleteLine: deleteSinglePurchaseInvoiceLine,
    statusActions: {
      open: [],
      pending: [],
      released: [],
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
    addSingleLine: addSinglePurchaseReturnOrderLine,
    updateSingleLine: updateSinglePurchaseReturnOrderLine,
    updateHeader: patchPurchaseReturnOrderHeader,
    deleteHeader: deletePurchaseReturnOrderHeader,
    deleteLine: deleteSinglePurchaseReturnOrderLine,
    statusActions: {
      open: [],
      pending: [],
      released: [],
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
    addSingleLine: addSinglePurchaseCreditMemoLine,
    updateSingleLine: updateSinglePurchaseCreditMemoLine,
    updateHeader: patchPurchaseCreditMemoHeader,
    deleteHeader: deletePurchaseCreditMemoHeader,
    deleteLine: deleteSinglePurchaseCreditMemoLine,
    statusActions: {
      open: [],
      pending: [],
      released: [],
    },
    fetchHeader: getPurchaseCreditMemoByNo,
    fetchLines: getPurchaseCreditMemoLines,
  },
  order: {
    documentType: "order",
    createHeaderButtonLabel: "Create Purchase Order",
    toDocType: "Order",
    displayTitle: "Purchase Order",
    primaryVendorRefLabel: "Vendor Invoice No.",
    primaryVendorRefField: "vendorInvoiceNo",
    orderAddressGridClass: "sm:col-span-2 lg:col-span-2",
    immediateSuccess: true,
    buildHeaderData: (formData) => ({
      ...buildPurchaseCommonHeaderData(formData),
      vendorInvoiceNo: formData.vendorInvoiceNo,
      poType: formData.poType,
      serviceType: formData.serviceType,
      orderDate: formData.orderDate,
    }),
    createHeader: createPurchaseOrder,
    createCopyHeader: async (_locationCode: string) => {
      throw new Error("Copy document not supported for purchase orders");
    },
    addLineItems: addPurchaseOrderLineItems,
    addSingleLine: addSinglePurchaseOrderLine,
    updateSingleLine: updateSinglePurchaseOrderLine,
    updateHeader: patchPurchaseOrderHeader,
    deleteHeader: deletePurchaseOrderHeader,
    deleteLine: async (documentNo: string, lineNo: number) => {
      await deletePurchaseOrderLine(documentNo, lineNo);
    },
    statusActions: {
      open: ["Send For Approval"],
      pending: ["Cancel Approval"],
      released: ["Gate Entry", "Purchase Receipts", "Post", "Reopen"],
    },
    fetchHeader: getPurchaseOrderByNo,
    fetchLines: getPurchaseOrderLines,
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
  const [isSavingLine, setIsSavingLine] = useState(false);
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

  // Stores the raw hydrated header so we can read BC field names directly
  const hydratedHeaderRef = useRef<PurchaseOrder | null>(null);

  // ── PO Advanced State (used only when documentType === 'order') ────────────
  const [locationName, setLocationName] = useState("");
  const [selectedLine, setSelectedLine] = useState<PurchaseLine | null>(null);
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isPostDetailsOpen, setIsPostDetailsOpen] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [postOption, setPostOption] = useState<
    "receive" | "invoice" | "receive-invoice" | "ship" | "ship-invoice" | null
  >(null);
  const [postDetails, setPostDetails] = useState({
    postingDate: "",
    documentDate: "",
    vehicleNo: "",
    vendorInvoiceNo: "",
    dueDateCalculation: "Posting Date",
    lineNarration: "",
  });
  const [postTdsOptions, setPostTdsOptions] = useState<
    import("@/components/ui/searchable-select").SearchableSelectOption[]
  >([]);
  const [postTdsLoading, setPostTdsLoading] = useState(false);
  const [postTdsSection, setPostTdsSection] = useState("");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [receiptShipments, setReceiptShipments] = useState<PurchaseReceipt[]>(
    [],
  );
  const [receiptDate, setReceiptDate] = useState("");
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingLine, setTrackingLine] = useState<PurchaseLine | null>(null);
  const [isItemChargeOpen, setIsItemChargeOpen] = useState(false);
  const [isGetPostedLineOpen, setIsGetPostedLineOpen] = useState(false);
  const [selectedItemChargeLine, setSelectedItemChargeLine] =
    useState<PurchaseLine | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    action: async () => {},
    actionLabel: "",
    cancelLabel: "",
    variant: "default" as "default" | "destructive",
  });
  const [, startPrintMRN] = useTransition();
  const [printingMRN] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────

  const [termList, setTermList] = useState<TermAndCondition[]>([]);
  const [mandiList, setMandiList] = useState<MandiMaster[]>([]);
  const [paymentTermList, setPaymentTermList] = useState<PaymentTerm[]>([]);

  // Fetch LOC dimension name whenever the LOC field changes (on load and on user select)
  useEffect(() => {
    const loc = formData.loc;
    if (!loc) {
      setLocationName("");
      return;
    }
    getDimensionValueName("LOC", loc)
      .then(setLocationName)
      .catch(() => setLocationName(""));
  }, [formData.loc]);

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

        hydratedHeaderRef.current = header;
        setFormData((prev) => ({ ...prev, ...mappedFormData }));
        setLineItems(mappedLineItems);
        setPurchaseLines(lines);

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

      // For purchase orders, navigate to view mode immediately (no line staging)
      if (config.immediateSuccess) {
        onSuccess(orderNo);
      }
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

  const handleOpenCopyDialog = () => {
    if (!isCreateMode) return;

    setPlaceOrderError(null);
    setIsCopyDocOpen(true);
  };

  // Line Items management
  const handleAddLineItem = () => {
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
    // If this line is persisted on the server (has a lineNo), open the
    // richer PurchaseLineEditDialog. Otherwise use the standard dialog.
    if (lineItem.lineNo && createdOrderNo) {
      const serverLine = purchaseLines.find(
        (l) => l.Line_No === lineItem.lineNo,
      );
      if (serverLine) {
        setSelectedLine(serverLine);
        return;
      }
    }
    setSelectedLineItem(lineItem);
    setIsLineDialogOpen(true);
  };

  const handleLineItemSave = async (lineItem: LineItem) => {
    if (!createdOrderNo) return;

    if (isCreateMode) {
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
      return;
    }

    setIsSavingLine(true);
    setPlaceOrderError(null);

    const apiItem: PurchaseOrderLineItem = {
      type: lineItem.type,
      no: lineItem.no,
      description: lineItem.description,
      uom: lineItem.uom,
      quantity: lineItem.quantity,
      price: lineItem.price,
      unitPrice: lineItem.unitPrice,
      discount: lineItem.discount,
      amount: lineItem.amount,
      exempted: lineItem.exempted,
      gstGroupCode: lineItem.gstGroupCode,
      hsnSacCode: lineItem.hsnSacCode,
      tdsSectionCode: lineItem.tdsSectionCode,
      faPostingType: lineItem.faPostingType,
      salvageValue: lineItem.salvageValue,
      noOfBags: lineItem.noOfBags,
    };

    const locationCode = resolvePurchaseLocationCode(
      formData.locationCode,
      formData.loc,
    );

    try {
      if (lineItem.lineNo) {
        await config.updateSingleLine(createdOrderNo, lineItem.lineNo, apiItem);
        toast.success("Line item updated.");
      } else {
        await config.addSingleLine(createdOrderNo, apiItem, locationCode);
        toast.success("Line item added.");
      }

      await refreshHydratedDocument();
      setSelectedLineItem(null);
      setIsLineDialogOpen(false);
    } catch (error) {
      setPlaceOrderError(
        getErrorMessage(error, "Failed to save line item. Please try again."),
      );
    } finally {
      setIsSavingLine(false);
    }
  };

  const handleRemoveLineItem = async (lineItemId: string) => {
    const itemToRemove = lineItems.find((item) => item.id === lineItemId);
    if (!itemToRemove) return;

    if (isCreateMode) {
      const updated = lineItems.filter((item) => item.id !== lineItemId);
      setLineItems(updated);
      persist({ ...formData, lineItems: updated, createdOrderNo });
      return;
    }

    if (!createdOrderNo || !itemToRemove.lineNo) {
      return;
    }

    setIsSavingLine(true);
    setPlaceOrderError(null);

    try {
      await config.deleteLine(createdOrderNo, itemToRemove.lineNo);
      await refreshHydratedDocument();
      toast.success("Line item removed.");
    } catch (error) {
      setPlaceOrderError(
        getErrorMessage(error, "Failed to delete line item. Please try again."),
      );
    } finally {
      setIsSavingLine(false);
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

  const refreshHydratedDocument = async (overrideDocNo?: string) => {
    const docNo = overrideDocNo || createdOrderNo;
    if (!docNo) return;

    const [header, lines] = await Promise.all([
      config.fetchHeader(docNo),
      config.fetchLines(docNo),
    ]);

    if (!header) {
      throw new Error("Document not found.");
    }

    const mappedFormData = mapPurchaseHeaderToFormData(header);
    const mappedLineItems = lines.map(mapPurchaseLineToLineItem);
    const status = toStringValue(header.Status);

    hydratedHeaderRef.current = header;
    setFormData((prev) => ({ ...prev, ...mappedFormData }));
    setLineItems(mappedLineItems);
    setDocumentStatus(status);
    if (!createdOrderNo && docNo) setCreatedOrderNo(docNo);

    persist({
      ...mappedFormData,
      lineItems: mappedLineItems,
      createdOrderNo: docNo,
      status,
    });
  };

  const handleCopyDocumentSuccess = (docNo?: string) => {
    toast.success(`${config.displayTitle} copied successfully.`);
    if (docNo) {
      onSuccess(docNo);
    } else if (createdOrderNo) {
      onSuccess(createdOrderNo);
    } else {
      const message = "Copy succeeded but document number is missing.";
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
      const today = new Date().toISOString().split("T")[0];
      if (documentType === "invoice" || documentType === "credit-memo") {
        // Single option: Invoice — skip options dialog, go straight to details
        setPostOption("invoice");
        setPostDetails({
          postingDate: today,
          documentDate: formData.documentDate || today,
          vehicleNo: "",
          vendorInvoiceNo: formData.vendorInvoiceNo || "",
          dueDateCalculation: "Posting Date",
          lineNarration: "",
        });
        // Pre-populate TDS section from existing lines (use first non-empty value found)
        const existingTds = purchaseLines
          .filter((l) => (l.Type || "").trim() !== "")
          .map((l) => l.TDS_Section_Code || "")
          .find((v) => v !== "") || "";
        setPostTdsSection(existingTds);
        // Fetch TDS options for this vendor
        if (formData.vendorNo) {
          setPostTdsLoading(true);
          getVendorTDSGroupCodes(formData.vendorNo)
            .then((res) =>
              setPostTdsOptions(
                res.map((r) => ({
                  value: r.TDS_Section || "",
                  label: `${r.TDS_Section} - ${r.TDS_Section_Description || ""}`,
                })),
              ),
            )
            .catch(() => setPostTdsOptions([]))
            .finally(() => setPostTdsLoading(false));
        }
        setIsPostDetailsOpen(true);
      } else {
        setPostOption(null);
        setIsPostDialogOpen(true);
      }
      return;
    }
    if (action === "Gate Entry") {
      return;
    } // handled inline via PostGateEntryDialog
    if (action === "Purchase Receipts") {
      setIsReceiptOpen(true);
      if (createdOrderNo) {
        setIsReceiptLoading(true);
        getPurchasereceipts(createdOrderNo)
          .then(setReceiptShipments)
          .catch(() => toast.error("Failed to load receipts"))
          .finally(() => setIsReceiptLoading(false));
      }
    }
  };

  // ── PO-only Handlers ─────────────────────────────────────────────────
  const fetchLines = useCallback(
    async (docNo: string) => {
      const lines = await config.fetchLines(docNo);
      setPurchaseLines(lines);
      setLineItems(lines.map(mapPurchaseLineToLineItem));
    },
    [config],
  );

  const base64ToPdfBlob = (b64: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: "application/pdf" });
  };

  const handlePrintPOReport = async () => {
    if (!createdOrderNo) return;
    setIsActionLoading(true);
    try {
      const b64 = await getPurchaseOrderReport(createdOrderNo);
      if (!b64) {
        toast.error("No report data found.");
        return;
      }
      window.open(URL.createObjectURL(base64ToPdfBlob(b64)), "_blank");
    } catch {
      toast.error("Failed to generate report.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePrintMRN = async (mrnNo: string) => {
    startPrintMRN(async () => {
      try {
        const b64 = await getPurchasereceiptReport(mrnNo);
        if (!b64) {
          toast.error("No report data found.");
          return;
        }
        window.open(URL.createObjectURL(base64ToPdfBlob(b64)), "_blank");
      } catch {
        toast.error("Failed to generate MRN report.");
      }
    });
  };

  const handlePostDetailsSubmit = async () => {
    if (!createdOrderNo || !postOption) return;
    if (!postDetails.postingDate) {
      toast.error("Posting Date is required.");
      return;
    }
    if (!postDetails.documentDate) {
      toast.error("Document Date is required.");
      return;
    }
    const isInvoiceOption =
      postOption === "invoice" ||
      postOption === "receive-invoice" ||
      postOption === "ship-invoice" ||
      documentType === "invoice" ||
      documentType === "credit-memo";

    // Validate TDS section for invoice-type posts
    const typedLines = purchaseLines.filter((l) => (l.Type || "").trim() !== "");
    if (isInvoiceOption && typedLines.length > 0 && !postTdsSection) {
      toast.error("TDS Section is required before posting.");
      return;
    }

    setIsPostLoading(true);
    try {
      const patchPayload: Record<string, unknown> = {
        Posting_Date: postDetails.postingDate,
        Document_Date: postDetails.documentDate,
        Vehicle_No: postDetails.vehicleNo || "",
        Vendor_Invoice_No: postDetails.vendorInvoiceNo || "",
      };
      if (isInvoiceOption) {
        patchPayload.Due_Date_calculation =
          postDetails.dueDateCalculation || "Posting Date";
        patchPayload.Line_Narration1 = postDetails.lineNarration || "";
      }
      await config.updateHeader(createdOrderNo, patchPayload);
      // Patch TDS section on all typed lines
      if (isInvoiceOption && postTdsSection && typedLines.length > 0) {
        const docTypeKey =
          documentType as import("@/lib/api/services/purchase-document.service").PurchaseDocumentAdapterType;
        for (const l of typedLines) {
          await patchPurchaseDocumentLineByKey(docTypeKey, createdOrderNo, l.Line_No!, {
            TDS_Section_Code: postTdsSection,
          });
        }
      }
      const optMap: Record<string, "1" | "2" | "3"> = {
        receive: "1",
        invoice: "2",
        "receive-invoice": "3",
        ship: "1",
        "ship-invoice": "3",
      };
      await postPurchaseOrder(createdOrderNo, optMap[postOption]);
      toast.success(`${config.displayTitle} posted successfully.`);
      setIsPostDetailsOpen(false);
      await refreshHydratedDocument();
      onSuccess(createdOrderNo);
    } catch (err) {
      setPlaceOrderError((err as Error).message ?? "Post failed.");
    } finally {
      setIsPostLoading(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  // Status helpers (used in action bar and renderStep1)
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

  // Step 1: Order Information
  const fieldClass = "min-w-0 space-y-1";
  const labelClass = "text-muted-foreground block text-xs font-medium";
  const renderStep1 = () => {
    const defaultAccordionValue =
      isCreateMode || isEditMode
        ? ["general", "tax-information", "vendor-statistics"]
        : ["general"];
    const areFieldsReadOnly =
      isViewMode || (isCreateMode && Boolean(createdOrderNo));

    return (
      <div className="space-y-3">
        <div className="space-y-4">
          <Accordion
            key={mode}
            type="multiple"
            defaultValue={defaultAccordionValue}
            className="w-full space-y-2"
          >
            <AccordionItem value="general" className="border-none">
              <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
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
                <Separator className="mb-3" />
                <section className="space-y-2">
                  <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {capabilities.supportsPoType && (
                      <div className={fieldClass}>
                        <label className={labelClass}>PO Type</label>
                        <ClearableField
                          readOnly={areFieldsReadOnly}
                          value={formData.poType}
                          onClear={() => handleInputChange("poType", "")}
                        >
                          <Select
                            value={formData.poType}
                            onValueChange={(value) =>
                              handleInputChange("poType", value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Goods">Goods</SelectItem>
                              <SelectItem value="Service">Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </ClearableField>
                      </div>
                    )}
                    {capabilities.supportsServiceType &&
                      formData.poType === "Service" && (
                        <div className={fieldClass}>
                          <label className={labelClass}>Service Type</label>
                          <ClearableField
                            readOnly={areFieldsReadOnly}
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
                              <SelectTrigger className="h-8 text-xs">
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
                    {/* Dimensions */}
                    <div className={fieldClass}>
                      <label className={labelClass}>LOB</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
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
                        readOnly={areFieldsReadOnly}
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
                        readOnly={areFieldsReadOnly}
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
                      {formData.loc && locationName && (
                        <p className="mt-0.5 truncate pl-1 text-[10px] font-medium text-green-600">
                          {locationName}
                        </p>
                      )}
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Location Code</label>
                      <Input
                        value={formData.locationCode || formData.loc || ""}
                        disabled
                        className="bg-muted h-8 text-xs"
                        readOnly
                      />
                      {locationName &&
                        (formData.locationCode || formData.loc) && (
                          <p className="mt-0.5 truncate pl-1 text-[10px] font-medium text-green-600">
                            {locationName}
                          </p>
                        )}
                    </div>
                  </div>
                </section>
              </AccordionContent>
            </AccordionItem>

            <Separator />

            <AccordionItem value="tax-information" className="border-none">
              <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
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
                <Separator className="mb-3" />
                <section className="space-y-2">
                  <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {capabilities.supportsInvoiceType && (
                      <div className={fieldClass}>
                        <label className={labelClass}>Invoice Type</label>
                        <ClearableField
                          readOnly={areFieldsReadOnly}
                          value={formData.invoiceType}
                          onClear={() => handleInputChange("invoiceType", "")}
                        >
                          <Select
                            value={formData.invoiceType || ""}
                            onValueChange={(value) =>
                              handleInputChange("invoiceType", value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select / None" />
                            </SelectTrigger>
                            <SelectContent>
                              {capabilities.invoiceTypeOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </ClearableField>
                      </div>
                    )}
                    <div className={fieldClass}>
                      <label className={labelClass}>Vendor</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
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
                        className="bg-muted h-8 text-xs"
                        placeholder="Auto"
                        readOnly
                      />
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Vendor PAN</label>
                      <Input
                        value={formData.vendorPanNo}
                        disabled
                        className="bg-muted h-8 text-xs"
                        placeholder="Auto"
                        readOnly
                      />
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>
                        {config.primaryVendorRefLabel}
                      </label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
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
                          className="h-8 text-xs"
                        />
                      </ClearableField>
                    </div>
                    {capabilities.supportsVendorAuthorizationNo && (
                      <div className={fieldClass}>
                        <label className={labelClass}>Vendor Auth. No.</label>
                        <ClearableField
                          readOnly={areFieldsReadOnly}
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
                            className="h-8 text-xs"
                          />
                        </ClearableField>
                      </div>
                    )}
                    {capabilities.supportsAppliesToFields && (
                      <div className={fieldClass}>
                        <label className={labelClass}>
                          Applies-to Doc. Type
                        </label>
                        <ClearableField
                          readOnly={areFieldsReadOnly}
                          value={formData.appliesToDocType}
                          onClear={() =>
                            handleInputChange("appliesToDocType", "")
                          }
                        >
                          <Select
                            value={formData.appliesToDocType}
                            onValueChange={(val) =>
                              handleInputChange("appliesToDocType", val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Invoice">Invoice</SelectItem>
                              <SelectItem value="Receipt">Receipt</SelectItem>
                            </SelectContent>
                          </Select>
                        </ClearableField>
                      </div>
                    )}
                    {capabilities.supportsAppliesToFields && (
                      <div className={fieldClass}>
                        <label className={labelClass}>
                          Applies-to Doc. No.
                        </label>
                        <ClearableField
                          readOnly={areFieldsReadOnly}
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
                            className="h-8 text-xs"
                          />
                        </ClearableField>
                      </div>
                    )}
                    <div
                      className={`${fieldClass} ${config.orderAddressGridClass}`}
                    >
                      <label className={labelClass}>Order Address Select</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.orderAddressCode}
                        onClear={() =>
                          setFormData((prev) => ({
                            ...prev,
                            orderAddressCode: "",
                            orderAddressName: "",
                          }))
                        }
                      >
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
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Brokerage Code</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
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
                        readOnly={areFieldsReadOnly}
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
                          className="h-8 text-xs"
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
              <AccordionTrigger className="py-0 hover:no-underline [&>svg]:size-4">
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
                <Separator className="mb-3" />
                <section className="space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    <div className={fieldClass}>
                      <label className={labelClass}>Purchaser Code</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
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
                    <div className={fieldClass}>
                      <label className={labelClass}>Posting Date</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.postingDate}
                        onClear={() => handleInputChange("postingDate", "")}
                      >
                        <Input
                          type="date"
                          value={formData.postingDate}
                          onChange={(e) =>
                            handleInputChange("postingDate", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Document Date</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.documentDate}
                        onClear={() => handleInputChange("documentDate", "")}
                      >
                        <Input
                          type="date"
                          value={formData.documentDate}
                          onChange={(e) =>
                            handleInputChange("documentDate", e.target.value)
                          }
                          className="h-8 text-xs"
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
                          className="bg-muted h-8 text-xs"
                        />
                      </div>
                    )}
                    <div className={fieldClass}>
                      <label className={labelClass}>Due Date</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.dueDate}
                        onClear={() => handleInputChange("dueDate", "")}
                      >
                        <Input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) =>
                            handleInputChange("dueDate", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Due Date Calc</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.dueDateCalculation}
                        onClear={() =>
                          handleInputChange("dueDateCalculation", "")
                        }
                      >
                        <Select
                          value={formData.dueDateCalculation}
                          onValueChange={(value) =>
                            handleInputChange("dueDateCalculation", value)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
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
                      </ClearableField>
                    </div>
                    {capabilities.supportsRateBasis && (
                      <div className={fieldClass}>
                        <label className={labelClass}>Rate Basis</label>
                        <ClearableField
                          readOnly={areFieldsReadOnly}
                          value={formData.rateBasis}
                          onClear={() => handleInputChange("rateBasis", "")}
                        >
                          <Select
                            value={formData.rateBasis}
                            onValueChange={(value) =>
                              handleInputChange("rateBasis", value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
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
                        </ClearableField>
                      </div>
                    )}
                    <div className={fieldClass}>
                      <label className={labelClass}>Creditor Type</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.creditorType}
                        onClear={() => handleInputChange("creditorType", "")}
                      >
                        <PurchaseSearchableSelect
                          value={formData.creditorType}
                          onChange={(value) =>
                            handleInputChange("creditorType", value)
                          }
                          options={CREDITOR_TYPE_OPTIONS}
                          placeholder="Select creditor"
                        />
                      </ClearableField>
                    </div>
                    {capabilities.supportsQcType && (
                      <div className={fieldClass}>
                        <label className={labelClass}>QC Type</label>
                        <ClearableField
                          readOnly={areFieldsReadOnly}
                          value={formData.qcType}
                          onClear={() => handleInputChange("qcType", "")}
                        >
                          <Select
                            value={formData.qcType}
                            onValueChange={(value) =>
                              handleInputChange("qcType", value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">None</SelectItem>
                              <SelectItem value="Ex Passing">
                                Ex Passing
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </ClearableField>
                      </div>
                    )}
                    <div className={fieldClass}>
                      <label className={labelClass}>Term Code</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.termCode}
                        onClear={() => handleInputChange("termCode", "")}
                      >
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
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Payment Term</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.paymentTermCode}
                        onClear={() => handleInputChange("paymentTermCode", "")}
                      >
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
                      </ClearableField>
                    </div>
                    <div className={fieldClass}>
                      <label className={labelClass}>Mandi Name</label>
                      <ClearableField
                        readOnly={areFieldsReadOnly}
                        value={formData.mandiName}
                        onClear={() => handleInputChange("mandiName", "")}
                      >
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
                      </ClearableField>
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
        {/* ── Action Bar ── */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-b px-4 py-2">
          {/* Loading state — placeholder buttons while document hydrates */}
          {isHydratingDocument ? (
            <>
              <div className="mr-auto flex items-center gap-2">
                <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Status:
                </span>
                <div className="bg-muted text-muted-foreground flex h-6 animate-pulse items-center rounded-full px-3 text-[10px] font-bold tracking-wider uppercase">
                  Loading…
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled
              >
                <LoaderCircleIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled
              >
                <LoaderCircleIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Delete
              </Button>
              <Button type="button" size="sm" className="h-8" disabled>
                <LoaderCircleIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Loading…
              </Button>
            </>
          ) : (
            <>
              {/* Left: status badge (view/edit) or contextual info (create) */}
              {documentStatus && createdOrderNo && !isCreateMode && (
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
              {isCreateMode && (
                <div className="mr-auto">
                  {createdOrderNo ? (
                    <span className="text-primary text-xs font-medium">
                      {config.displayTitle} {createdOrderNo} — Add line items to
                      complete
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Fill in header fields to create the document.
                    </span>
                  )}
                </div>
              )}

              {/* View mode */}
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
                statusActions.map((action) =>
                  action === "Gate Entry" && documentType === "order" ? (
                    <PostGateEntryDialog
                      key={action}
                      sourceNo={createdOrderNo!}
                      disabled={isActionLoading}
                    />
                  ) : (
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
                  ),
                )}
              {isViewMode && documentType !== "order" && createdOrderNo && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => handleStatusAction("Post")}
                  disabled={isActionLoading}
                >
                  Post
                </Button>
              )}
              {isViewMode && documentType === "order" && createdOrderNo && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handlePrintPOReport}
                  disabled={isActionLoading}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
              )}
              {isViewMode &&
                documentType !== "return-order" &&
                createdOrderNo && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setIsAttachmentDialogOpen(true)}
                    disabled={isActionLoading}
                  >
                    <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                    Attachments
                  </Button>
                )}
              {isViewMode && createdOrderNo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsCommentsDialogOpen(true)}
                  disabled={isActionLoading}
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Comments
                </Button>
              )}

              {/* Edit mode */}
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

              {/* Create mode */}
              {isCreateMode && documentType !== "order" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleOpenCopyDialog}
                  disabled={isCreatingHeader}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Document
                </Button>
              )}
              {isCreateMode && !createdOrderNo && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleCreateOrderHeader}
                  disabled={!isStep1Valid() || isCreatingHeader}
                >
                  {isCreatingHeader ? (
                    <>
                      <LoaderCircleIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    config.createHeaderButtonLabel
                  )}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isHydratingDocument ? (
            <div className="space-y-4">
              {/* Header skeleton — mimics the accordion sections */}
              {Array.from({ length: 3 }).map((_, sectionIdx) => (
                <div
                  key={sectionIdx}
                  className="space-y-3 rounded-md border p-4"
                >
                  <Skeleton className="h-4 w-32" />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {renderStep1()}

              <section className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground text-[10px] font-bold tracking-wider uppercase">
                      Line Items
                    </h3>
                    {createdOrderNo && (
                      <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
                        {createdOrderNo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {capabilities.supportsGetPostedLine && createdOrderNo && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => setIsGetPostedLineOpen(true)}
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Get Posted Line
                      </Button>
                    )}
                    <Button
                      onClick={handleAddLineItem}
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={!createdOrderNo}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Line
                    </Button>
                  </div>
                </div>

                {createdOrderNo ? (
                  <PurchaseLineItemsTable
                    lineItems={lineItems}
                    onEdit={handleEditLineItem}
                    onRemove={handleRemoveLineItem}
                    onRowClick={handleEditLineItem}
                    showRowActions={Boolean(createdOrderNo)}
                    documentNo={createdOrderNo}
                    documentType={documentType}
                    isLoading={isHydratingDocument}
                  />
                ) : (
                  <div className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-xs">
                    Create the document header first to enable line items.
                  </div>
                )}

                {createdOrderNo && (
                  <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-4 py-2.5">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      {lineItems.length} Line{lineItems.length !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground text-xs">
                        Total Amount
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {isLineDialogOpen && (
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
          onRemove={(line) => handleRemoveLineItem(line.id)}
          isSaving={isSavingLine}
        />
      )}

      {isCreateMode && documentType !== "order" && (
        <PurchaseCopyDocumentDialog
          open={isCopyDocOpen}
          toDocNo={createdOrderNo || undefined}
          toDocType={config.toDocType}
          onOpenChange={setIsCopyDocOpen}
          onSuccess={handleCopyDocumentSuccess}
          userId={userId}
          lobValue={formData.lob}
          branchValue={formData.branch}
          onCreateHeader={async (locCode, lobCode, branchCode) => {
            const resp = await config.createCopyHeader(locCode);
            const returnedNo = resp.orderNo || resp.orderId;
            if (returnedNo) {
              setFormData((prev) => ({
                ...prev,
                lob: lobCode,
                branch: branchCode,
                locationCode: locCode,
                loc: locCode,
              }));
              setCreatedOrderNo(returnedNo);
              setDocumentStatus("Open");
              persist({
                ...formData,
                lob: lobCode,
                branch: branchCode,
                locationCode: locCode,
                loc: locCode,
                lineItems,
                createdOrderNo: returnedNo,
                status: "Open",
              });
            }
            return returnedNo;
          }}
        />
      )}

      {/* ── Get Posted Line Dialog ─────────────────────────────────────── */}
      {capabilities.supportsGetPostedLine && createdOrderNo && (
        <PurchaseGetPostedLineDialog
          open={isGetPostedLineOpen}
          onOpenChange={setIsGetPostedLineOpen}
          documentNo={createdOrderNo}
          docType={documentType === "invoice" ? "Invoice" : "CreditMemo"}
          vendorNo={hydratedHeaderRef.current?.Buy_from_Vendor_No || undefined}
          payToVendorNo={
            hydratedHeaderRef.current?.Pay_to_Vendor_No || undefined
          }
          currencyCode={hydratedHeaderRef.current?.Currency_Code || undefined}
          onSuccess={() => {
            void refreshHydratedDocument();
          }}
        />
      )}

      {/* ── Edit Line Dialog ────────────────────────────────────────────── */}
      {selectedLine && (
        <PurchaseLineEditDialog
          open={!!selectedLine}
          onOpenChange={(open) => !open && setSelectedLine(null)}
          line={selectedLine}
          documentType={documentType}
          orderNo={createdOrderNo}
          vendorNo={formData.vendorNo}
          onAssignTracking={
            documentType === "order"
              ? (line) => {
                  setTrackingLine(line);
                  setIsTrackingOpen(true);
                }
              : undefined
          }
          onOpenItemCharge={(line) => {
            setSelectedItemChargeLine(line);
            setIsItemChargeOpen(true);
          }}
          updateLine={
            documentType !== "order"
              ? (docNo, lineNo, payload) =>
                  patchPurchaseDocumentLineByKey(
                    documentType as "invoice" | "return-order" | "credit-memo",
                    docNo,
                    lineNo,
                    payload,
                  )
              : undefined
          }
          onDelete={async (line) => {
            if (line.Line_No && createdOrderNo) {
              await config.deleteLine(createdOrderNo, line.Line_No);
              await fetchLines(createdOrderNo);
            }
          }}
          onSave={async () => {
            if (createdOrderNo) await fetchLines(createdOrderNo);
            setSelectedLine(null);
          }}
        />
      )}

      {documentType !== "return-order" && createdOrderNo && (
        <POAttachmentDialog
          isOpen={isAttachmentDialogOpen}
          onOpenChange={setIsAttachmentDialogOpen}
          orderNo={createdOrderNo}
        />
      )}

      {createdOrderNo && (
        <PurchaseCommentsDialog
          isOpen={isCommentsDialogOpen}
          onOpenChange={setIsCommentsDialogOpen}
          documentType={
            (
              {
                order: "Order",
                invoice: "Invoice",
                "return-order": "Return Order",
                "credit-memo": "Credit Memo",
              } as Record<string, PurchaseCommentDocumentType>
            )[documentType]
          }
          documentNo={createdOrderNo}
        />
      )}

      {documentType === "order" && isTrackingOpen && trackingLine && (
        <PurchaseItemTrackingDialog
          open={isTrackingOpen}
          onOpenChange={setIsTrackingOpen}
          line={trackingLine}
          orderNo={createdOrderNo}
          locationCode={formData.locationCode || formData.loc || ""}
          onSave={() => {
            if (createdOrderNo) fetchLines(createdOrderNo);
          }}
        />
      )}

      {isItemChargeOpen && selectedItemChargeLine && (
        <ItemChargeAssignmentDialog
          open={isItemChargeOpen}
          onOpenChange={setIsItemChargeOpen}
          docType={selectedItemChargeLine.Document_Type || "Order"}
          docNo={createdOrderNo || ""}
          docLineNo={selectedItemChargeLine.Line_No!}
          itemChargeNo={selectedItemChargeLine.No || ""}
          itemChargeDescription={selectedItemChargeLine.Description || ""}
          totalAmount={selectedItemChargeLine.Line_Amount || 0}
          totalQuantity={selectedItemChargeLine.Quantity || 0}
        />
      )}

      {/* Post Option Dialog */}
      {(documentType === "order" || documentType === "return-order") && (
        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Post {config.displayTitle}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              {(documentType === "return-order"
                ? (["ship", "invoice", "ship-invoice"] as const)
                : (["receive", "invoice", "receive-invoice"] as const)
              ).map((opt) => (
                <Label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="post-mode"
                    checked={postOption === opt}
                    onChange={() => setPostOption(opt)}
                  />
                  <span>
                    {opt === "receive"
                      ? "Receive"
                      : opt === "invoice"
                        ? "Invoice"
                        : opt === "receive-invoice"
                          ? "Receive & Invoice"
                          : opt === "ship"
                            ? "Ship"
                            : "Ship & Invoice"}
                  </span>
                </Label>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPostDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!postOption}
                onClick={() => {
                  if (!postOption) return;
                  const today = new Date().toISOString().split("T")[0];
                  setPostDetails({
                    postingDate: today,
                    documentDate: formData.documentDate || today,
                    vehicleNo: "",
                    vendorInvoiceNo: formData.vendorInvoiceNo || "",
                    dueDateCalculation: "Posting Date",
                    lineNarration: "",
                  });
                  // Initialize TDS section for invoice-type post options
                  const isInvoicePost =
                    postOption === "invoice" ||
                    postOption === "receive-invoice" ||
                    postOption === "ship-invoice";
                  if (isInvoicePost) {
                    const existingTds = purchaseLines
                      .filter((l) => (l.Type || "").trim() !== "")
                      .map((l) => l.TDS_Section_Code || "")
                      .find((v) => v !== "") || "";
                    setPostTdsSection(existingTds);
                    if (formData.vendorNo) {
                      setPostTdsLoading(true);
                      getVendorTDSGroupCodes(formData.vendorNo)
                        .then((res) =>
                          setPostTdsOptions(
                            res.map((r) => ({
                              value: r.TDS_Section || "",
                              label: `${r.TDS_Section} - ${r.TDS_Section_Description || ""}`,
                            })),
                          ),
                        )
                        .catch(() => setPostTdsOptions([]))
                        .finally(() => setPostTdsLoading(false));
                    }
                  }
                  setIsPostDialogOpen(false);
                  setIsPostDetailsOpen(true);
                }}
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Post Details Dialog */}
      <Dialog open={isPostDetailsOpen} onOpenChange={setIsPostDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Posting Date *</Label>
              <Input
                type="date"
                value={postDetails.postingDate}
                onChange={(e) =>
                  setPostDetails((p) => ({
                    ...p,
                    postingDate: e.target.value,
                  }))
                }
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Document Date *</Label>
              <Input
                type="date"
                value={postDetails.documentDate}
                onChange={(e) =>
                  setPostDetails((p) => ({
                    ...p,
                    documentDate: e.target.value,
                  }))
                }
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Vehicle No</Label>
              <Input
                value={postDetails.vehicleNo}
                onChange={(e) =>
                  setPostDetails((p) => ({ ...p, vehicleNo: e.target.value }))
                }
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Vendor Invoice No</Label>
              <Input
                value={postDetails.vendorInvoiceNo}
                onChange={(e) =>
                  setPostDetails((p) => ({
                    ...p,
                    vendorInvoiceNo: e.target.value,
                  }))
                }
                className="h-8"
              />
            </div>
            {(postOption === "invoice" ||
              postOption === "receive-invoice" ||
              postOption === "ship-invoice" ||
              documentType === "invoice" ||
              documentType === "credit-memo") && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Due Date Calculation
                  </Label>
                  <Select
                    value={postDetails.dueDateCalculation}
                    onValueChange={(v) =>
                      setPostDetails((p) => ({ ...p, dueDateCalculation: v }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Posting Date">Posting Date</SelectItem>
                      <SelectItem value="Document Date">
                        Document Date
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">
                    Line Narration
                  </Label>
                  <Input
                    value={postDetails.lineNarration}
                    onChange={(e) =>
                      setPostDetails((p) => ({
                        ...p,
                        lineNarration: e.target.value,
                      }))
                    }
                    className="h-8"
                  />
                </div>
                {/* TDS Section */}
                {purchaseLines.filter((l) => (l.Type || "").trim() !== "")
                  .length > 0 && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">TDS Section</Label>
                    <ClearableField
                      value={postTdsSection}
                      onClear={() => setPostTdsSection("")}
                    >
                      <SearchableSelect
                        value={postTdsSection}
                        onValueChange={setPostTdsSection}
                        options={postTdsOptions}
                        isLoading={postTdsLoading}
                        placeholder="Select TDS Section..."
                        searchPlaceholder="Search TDS Section..."
                        allowCustomValue={true}
                      />
                    </ClearableField>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPostDetailsOpen(false)}
              disabled={isPostLoading}
            >
              Cancel
            </Button>
            <Button onClick={handlePostDetailsSubmit} disabled={isPostLoading}>
              {isPostLoading ? (
                <>
                  <LoaderCircleIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipts Dialog */}

      {documentType === "order" && (
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Purchase Receipts – {createdOrderNo}</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">No.</TableHead>
                    <TableHead className="text-xs">Vendor No.</TableHead>
                    <TableHead className="text-xs">Posting Date</TableHead>
                    <TableHead className="text-xs">Vehicle No.</TableHead>
                    <TableHead className="text-right text-xs">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isReceiptLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : receiptShipments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground py-10 text-center"
                      >
                        No receipts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    receiptShipments.map((s) => (
                      <TableRow key={s.No}>
                        <TableCell className="text-xs font-medium">
                          {s.No}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.Buy_from_Vendor_No}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.Posting_Date}
                        </TableCell>
                        <TableCell className="text-xs">
                          {String(s.Vehicle_No || "-")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Print MRN"
                            onClick={() => handlePrintMRN(s.No)}
                          >
                            {printingMRN ? (
                              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsReceiptOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm / AlertDialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setConfirmDialog((p) => ({ ...p, open: false }))}
            >
              {confirmDialog.cancelLabel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmDialog.variant || "default"}
              onClick={() => confirmDialog.action()}
            >
              {confirmDialog.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
