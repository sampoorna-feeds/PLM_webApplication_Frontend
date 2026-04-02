/**
 * Purchase Order Form - Single Layout
 * Header section is created first, then line items are managed below in the same form.
 *
 * PurchaseOrderFormContent: Shared form logic for both FormStack tab and full-page modes.
 * PurchaseOrderForm: FormStack tab wrapper (for form registry).
 */

"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { VendorSelect, type PurchaseVendor } from "./vendor-select";
import { BrokerSelect } from "./broker-select";
import { OrderAddressSelect } from "./order-address-select";
import { PurchaserSelect } from "./purchaser-select";
import { buildPurchaseCommonHeaderData } from "./purchase-document-header-data";
import {
  mapPurchaseHeaderToFormData,
  mapPurchaseLineToLineItem,
} from "./purchase-document-hydration";
import {
  CREDITOR_TYPE_OPTIONS,
  MASTER_DROPDOWN_PAGE_SIZE,
} from "./purchase-form-options";
import { PurchaseSearchableSelect } from "./purchase-searchable-select";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { getAuthCredentials } from "@/lib/auth/storage";
import { getErrorMessage } from "@/lib/errors";
import type { LineItem } from "@/components/forms/purchase/purchase-line-item.type";
import {
  Plus,
  Paperclip,
  FileText,
  PackagePlus,
  Loader2,
  LoaderCircleIcon,
} from "lucide-react";
import { PurchaseLineItemsTable } from "./purchase-line-items-table";
import { POAttachmentDialog } from "./po-attachment-dialog";
import { PurchaseItemTrackingDialog } from "./purchase-item-tracking-dialog";
import { cn } from "@/lib/utils";
import { ClearableField } from "@/components/ui/clearable-field";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { PurchaseOrderLineDialog as PurchaseLineDialog } from "./purchase-order-line-dialog";
import {
  createPurchaseOrder,
  addSinglePurchaseOrderLine,
  updateSinglePurchaseOrderLine,
  deleteSinglePurchaseOrderLine,
  type PurchaseOrderData,
  type PurchaseOrderLineItem,
} from "@/lib/api/services/purchase-order.service";
import { buildPurchaseHeaderPayload } from "@/lib/api/services/purchase-header-payload";
import {
  getPurchaseOrderByNo,
  getPurchaseOrderLines,
  patchPurchaseOrderHeader,
  sendApprovalRequest,
  cancelApprovalRequest,
  reopenPurchaseOrder,
  deletePurchaseOrderHeader,
  deletePurchaseOrderLine,
  postPurchaseOrder,
  getPurchaseShipmentsByOrder,
  type PurchaseLine,
  type PurchaseOrder,
  type PurchaseReceipt,
  getPurchasereceipts,
  getPurchaseOrderReport,
  getPurchasereceiptReport,
} from "@/lib/api/services/purchase-orders.service";
import { ItemChargeMultiSelectDialog } from "@/components/forms/purchase/item-charge-multi-select-dialog";
import { getVendorDetails } from "@/lib/api/services/vendor.service";
import type { ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { PostGateEntryDialog } from "./post-gate-entry-dialog";
import { PurchaseOrderLineEditDialog as PurchaseLineEditDialog } from "./purchase-order-line-edit-dialog";
import { ItemChargeAssignmentDialog } from "./item-charge-assignment-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  purchaseDropdownsService,
  type TermAndCondition,
  type MandiMaster,
  type PaymentTerm,
} from "@/lib/api/services/purchase-dropdowns.service";
import { Separator } from "@/components/ui/separator";
import { getTransferAllLocationCodes } from "@/lib/api/services/transfer-orders.service";

const FIELD_CLASS = "min-w-0 space-y-0.5";
const LABEL_CLASS = "text-muted-foreground block text-[11px] font-medium";
const FIELD_INPUT_CLASS =
  "disabled:opacity-100 disabled:text-foreground font-medium text-xs disabled:pointer-events-none disabled:bg-muted/30";

export type UnifiedPurchaseOrderMode = "create" | "edit" | "view";

export interface PurchaseOrderFormContentProps {
  /** Called when order is successfully placed */
  onSuccess: (orderNo: string) => void;
  /** Switch to edit mode from view mode */
  onRequestEdit?: () => void;
  /** Discard changes in edit mode */
  onCancelEdit?: () => void;
  /** Current form mode */
  mode: UnifiedPurchaseOrderMode;
  /** Existing order number for edit/view */
  orderNo?: string;
  /** Initial form data (for restore on page load/tab reopen) */
  initialFormData?: Record<string, any>;
  /** Optional: persist form data (e.g. to FormStack tab). Omit for standalone page. */
  persistFormData?: (data: Record<string, any>) => void;
  /** Optional tab ID for FormStack integration */
  tabId?: string;
}

export function PurchaseOrderFormContent({
  onSuccess,
  onRequestEdit,
  onCancelEdit,
  mode,
  orderNo,
  initialFormData = {},
  persistFormData,
  tabId,
}: PurchaseOrderFormContentProps) {
  const { closeTab } = useFormStack(tabId ?? "");
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isCreateMode = mode === "create";
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
    orderAddressState: "",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydratingOrder, setIsHydratingOrder] = useState(
    !isCreateMode && Boolean(orderNo),
  );
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>("");
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);
  const [initialHeaderState, setInitialHeaderState] = useState<
    Record<string, any>
  >({});
  const [initialLineItemsState, setInitialLineItemsState] = useState<
    LineItem[]
  >([]);
  const [selectedLine, setSelectedLine] = useState<PurchaseLine | null>(null);
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postOption, setPostOption] = useState<
    "receive" | "invoice" | "receive-invoice" | null
  >(null);
  const [isPostDetailsOpen, setIsPostDetailsOpen] = useState(false);
  const [postDetails, setPostDetails] = useState({
    postingDate: "",
    documentDate: "",
    vehicleNo: "",
    vendorInvoiceNo: "",
    dueDateCalculation: "Posting Date",
    freight: "",
    lineNarration: "",
  });
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [printingMRN, startPrintMRN] = useTransition();
  // Receipt list state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [receiptShipments, setReceiptShipments] = useState<PurchaseReceipt[]>(
    [],
  );
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  // Item Charge Assignment State
  const [itemChargeDialogOpen, setItemChargeDialogOpen] = useState(false);
  const [selectedMrnNo, setSelectedMrnNo] = useState("");
  const [selectedMrnLineNo, setSelectedMrnLineNo] = useState<
    number | undefined
  >();
  const [isGateEntryOpen, setIsGateEntryOpen] = useState(false);

  // Item Tracking state
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingLine, setTrackingLine] = useState<PurchaseLine | null>(null);
  const [selectedItemChargeLine, setSelectedItemChargeLine] =
    useState<PurchaseLine | null>(null);
  const [isItemChargeOpen, setIsItemChargeOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    actionLabel: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    action: () => {},
    actionLabel: "Confirm",
  });

  // Change detection
  const isDirty = useMemo(() => {
    if (isCreateMode) return true;

    // Compare header fields
    const headerChanged = Object.keys(initialHeaderState).some((key) => {
      const current = formData[key as keyof typeof formData];
      const initial = initialHeaderState[key];
      // Normalize empty strings vs null/undefined for comparison
      return (current || "") !== (initial || "");
    });

    if (headerChanged) return true;

    // Compare line items
    if (lineItems.length !== initialLineItemsState.length) return true;

    return lineItems.some((item, index) => {
      const initial = initialLineItemsState[index];
      if (!initial) return true;
      return (
        item.no !== initial.no ||
        item.quantity !== initial.quantity ||
        item.unitPrice !== initial.unitPrice ||
        item.discount !== initial.discount ||
        item.gstGroupCode !== initial.gstGroupCode ||
        item.hsnSacCode !== initial.hsnSacCode
      );
    });
  }, [
    formData,
    lineItems,
    initialHeaderState,
    initialLineItemsState,
    isCreateMode,
  ]);

  // Attachment dialog state
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);

  const [termList, setTermList] = useState<TermAndCondition[]>([]);
  const [mandiList, setMandiList] = useState<MandiMaster[]>([]);
  const [paymentTermList, setPaymentTermList] = useState<PaymentTerm[]>([]);
  const [locationName, setLocationName] = useState<string>("");

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

  const fetchLines = useCallback(async (no: string) => {
    try {
      const lines = await getPurchaseOrderLines(no);
      setPurchaseLines(lines);
      const mapped = lines.map(mapPurchaseLineToLineItem);
      setLineItems(mapped);
      return mapped;
    } catch (error) {
      console.error("Error fetching lines:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (isCreateMode) {
      setIsHydratingOrder(false);
      return;
    }

    if (!orderNo) {
      setPlaceOrderError("Missing order number for selected mode.");
      setIsHydratingOrder(false);
      return;
    }

    let cancelled = false;
    setIsHydratingOrder(true);
    setPlaceOrderError(null);

    Promise.all([getPurchaseOrderByNo(orderNo), fetchLines(orderNo)])
      .then(([order, mappedLines]) => {
        if (cancelled) return;
        if (!order) {
          throw new Error("Order not found.");
        }

        const mappedFormData = mapPurchaseHeaderToFormData(order);
        setFormData((prev) => ({ ...prev, ...mappedFormData }));
        setInitialHeaderState(mappedFormData);
        setInitialLineItemsState(mappedLines);
        setCreatedOrderNo(order.No);
        setOrderStatus(order.Status ?? "");
        persist({
          ...mappedFormData,
          lineItems: mappedLines,
          createdOrderNo: order.No,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load purchase order.";
        setPlaceOrderError(message);
      })
      .finally(() => {
        if (!cancelled) setIsHydratingOrder(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isCreateMode, orderNo]);

  // Sync Location Code with LOC value
  useEffect(() => {
    setFormData((prev) => {
      if (prev.loc !== prev.locationCode) {
        return { ...prev, locationCode: prev.loc || "" };
      }
      return prev;
    });
  }, [formData.loc]);

  // Fetch location name whenever locationCode changes
  useEffect(() => {
    const code = formData.locationCode || formData.loc;
    if (!code) {
      setLocationName("");
      return;
    }
    getTransferAllLocationCodes([code])
      .then((results) => {
        const match = results.find((r) => r.Code === code);
        setLocationName(match?.Name || "");
      })
      .catch(() => setLocationName(""));
  }, [formData.locationCode, formData.loc]);

  // Simple input change handler
  const handleInputChange = (field: string, value: string) => {
    if (isViewMode) return;
    const newData = { ...formData, [field]: value };
    setFormData(newData);
  };

  // Vendor change handler — also fetches GST / PAN and resets order address
  const handleVendorChange = async (
    vendorNo: string,
    vendor?: PurchaseVendor,
  ) => {
    if (isViewMode) return;
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

  // Step 1 validation - all key fields mandatory except External Document No. and Vendor Invoice No. (optional). Invoice Type is now optional.
  const isStep1Valid = (): boolean => {
    return !!(
      formData.lob &&
      formData.branch &&
      formData.loc &&
      formData.vendorNo &&
      (formData.locationCode || formData.loc) &&
      formData.postingDate &&
      formData.documentDate &&
      formData.orderDate &&
      formData.poType
    );
  };

  const buildOrderData = (): PurchaseOrderData => ({
    ...buildPurchaseCommonHeaderData(formData),
    vendorInvoiceNo: formData.vendorInvoiceNo,
    orderAddressCode: formData.orderAddressCode,
    orderAddressState: formData.orderAddressState,
  });

  const buildHeaderPatchPayload = (): Record<string, unknown> =>
    buildPurchaseHeaderPayload(formData, {
      includePoType: true,
      includeServiceType: true,
      includeOrderDate: true,
      includeInvoiceType: true,
      includeVendorInvoiceNo: true,
      includeOrderAddressState: true,
    });

  const handleCreateOrderHeader = async () => {
    if (!isCreateMode) return;
    if (!isStep1Valid()) {
      return;
    }

    setIsCreatingHeader(true);
    try {
      const orderResponse = await createPurchaseOrder(buildOrderData());
      const orderNo = orderResponse.orderNo || orderResponse.orderId;

      if (!orderNo) {
        throw new Error("Failed to create order: No order number returned");
      }

      setCreatedOrderNo(orderNo);
      setOrderStatus("Open");
      persist({
        ...formData,
        lineItems,
        createdOrderNo: orderNo,
      });
      toast.success(`Purchase Order ${orderNo} created successfully.`);
      onSuccess(orderNo);
    } catch (error) {
      console.error(
        "Error creating purchase order header:",
        JSON.stringify(error, null, 2),
      );
      setPlaceOrderError(
        getErrorMessage(
          error,
          "Failed to create purchase order header. Please try again.",
        ),
      );
    } finally {
      setIsCreatingHeader(false);
    }
  };

  // Line Items management
  const [isSavingLine, setIsSavingLine] = useState(false);

  const handleAddLineItem = () => {
    if (!createdOrderNo) {
      setPlaceOrderError(
        "Create the purchase order header first, then add line items.",
      );
      return;
    }

    setSelectedLineItem(null);
    setIsLineDialogOpen(true);
  };

  const handleEditLineItem = (lineItem: LineItem) => {
    // Find the original purchase line if it exists
    if (lineItem.lineNo) {
      const existing = purchaseLines.find((l) => l.Line_No === lineItem.lineNo);
      if (existing) {
        setSelectedLine(existing);
        return;
      }
    }

    // Fallback to unified dialog for local-only lines or if not found
    setSelectedLineItem(lineItem);
    setIsLineDialogOpen(true);
  };

  const handleLineItemSave = async (lineItem: LineItem) => {
    if (!createdOrderNo) return;
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

    const locationCode = formData.locationCode || formData.loc || "";

    try {
      if (lineItem.lineNo) {
        // Update existing line using Line_No
        await updateSinglePurchaseOrderLine(
          createdOrderNo,
          lineItem.lineNo,
          apiItem,
        );
        const updated = lineItems.map((item) =>
          item.id === lineItem.id ? lineItem : item,
        );
        setLineItems(updated);
        persist({ ...formData, lineItems: updated, createdOrderNo });
      } else {
        // Create new line
        const response = await addSinglePurchaseOrderLine(
          createdOrderNo,
          apiItem,
          locationCode,
        );
        // Ensure we preserve the local id and add the server lineNo
        const newLineItem = { ...lineItem, lineNo: response.Line_No };
        const updated = [...lineItems, newLineItem];
        setLineItems(updated);
        persist({ ...formData, lineItems: updated, createdOrderNo });
      }

      toast.success(
        lineItem.lineNo ? "Line item updated." : "Line item added.",
      );

      // Refresh purchase lines from server to ensure full sync
      await fetchLines(createdOrderNo);

      setSelectedLineItem(null);
      setIsLineDialogOpen(false);
    } catch (error) {
      console.error("Error saving line item:", error);
      setPlaceOrderError(
        getErrorMessage(error, "Failed to save line item. Please try again."),
      );
    } finally {
      setIsSavingLine(false);
    }
  };

  const handleRemoveLineItem = async (lineItemId: string) => {
    if (!createdOrderNo) return;
    const itemToRemove = lineItems.find((item) => item.id === lineItemId);
    if (!itemToRemove) return;

    try {
      if (itemToRemove.lineNo) {
        await deleteSinglePurchaseOrderLine(
          createdOrderNo,
          itemToRemove.lineNo,
        );
      }
      const updated = lineItems.filter((item) => item.id !== lineItemId);
      setLineItems(updated);
      setPurchaseLines((prev) =>
        prev.filter((l) => l.Line_No !== itemToRemove.lineNo),
      );
      persist({ ...formData, lineItems: updated, createdOrderNo });
      toast.success("Line item removed.");
    } catch (error) {
      console.error("Error deleting line item:", error);
      setPlaceOrderError("Failed to delete line item. Please try again.");
    }
  };

  const handleUpdateLineItem = (lineItem: LineItem) => {
    const updated = lineItems.map((item) =>
      item.id === lineItem.id ? lineItem : item,
    );
    setLineItems(updated);
    persist({ ...formData, lineItems: updated, createdOrderNo });
  };

  const handleUpdateOrder = async () => {
    if (!createdOrderNo) {
      setPlaceOrderError("Missing order number.");
      return;
    }

    if (!isStep1Valid()) {
      setPlaceOrderError("Please fill all mandatory fields before updating.");
      return;
    }

    setIsSubmitting(true);
    try {
      await patchPurchaseOrderHeader(createdOrderNo, buildHeaderPatchPayload());
      persist({
        ...formData,
        lineItems,
        createdOrderNo,
      });
      onSuccess(createdOrderNo);
    } catch (error) {
      setPlaceOrderError(
        getErrorMessage(error, "Failed to update purchase order."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    const cancelAction = () => {
      setFormData((prev) => ({ ...prev, ...initialHeaderState }));
      setLineItems(initialLineItemsState);
      if (onCancelEdit) {
        onCancelEdit();
      }
      toast.info("Changes discarded");
    };

    if (isDirty) {
      setConfirmDialog({
        open: true,
        title: "Discard changes?",
        description:
          "Are you sure you want to discard your changes? This action cannot be undone.",
        action: cancelAction,
        actionLabel: "Discard",
        variant: "destructive",
      });
    } else {
      cancelAction();
    }
  };

  // --- Posting Handlers ---
  const handleOpenPostDialog = () => {
    if (!createdOrderNo) return;
    setPostOption(null);
    setIsPostDialogOpen(true);
  };

  const handlePostOptionContinue = () => {
    if (!postOption) return;
    const today = new Date().toISOString().split("T")[0];
    setPostDetails({
      postingDate: today,
      documentDate: formData.documentDate || today,
      vehicleNo: "",
      vendorInvoiceNo: formData.vendorInvoiceNo || "",
      dueDateCalculation: "Posting Date",
      freight: "",
      lineNarration: "",
    });
    setIsPostDialogOpen(false);
    setIsPostDetailsOpen(true);
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

    setIsPostLoading(true);
    setActionError(null);

    try {
      const isInvoiceOption =
        postOption === "invoice" || postOption === "receive-invoice";

      // 1. Patch header with metadata
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
        patchPayload.Freight = postDetails.freight || "0";
      }

      await patchPurchaseOrderHeader(createdOrderNo, patchPayload);

      // 2. Call Post API with string option
      const optionMap: Record<string, "1" | "2" | "3"> = {
        receive: "1",
        invoice: "2",
        "receive-invoice": "3",
      };

      await postPurchaseOrder(createdOrderNo, optionMap[postOption]);

      toast.success("Order posted successfully.");
      setIsPostDetailsOpen(false);

      // Refresh order status
      const updatedOrder = await getPurchaseOrderByNo(createdOrderNo);
      if (updatedOrder) setOrderStatus(updatedOrder.Status ?? "");

      if (onSuccess) onSuccess(createdOrderNo);

      // Close the tab if in FormStack
      if (tabId) {
        closeTab();
      }
    } catch (err) {
      setActionError((err as any).message ?? "Post failed.");
    } finally {
      setIsPostLoading(false);
    }
  };

  // --- Receipt Handlers ---
  const handleOpenReceipt = () => {
    setIsReceiptOpen(true);
    loadReceipt(receiptDate);
  };

  const loadReceipt = async (date: string) => {
    if (!createdOrderNo) return;
    setIsReceiptLoading(true);
    try {
      const receipts = await getPurchasereceipts(createdOrderNo);
      // If date filtering is needed client-side, we can add it here,
      // but usually we show all receipts for the order.
      setReceiptShipments(receipts);
    } catch (error) {
      console.error("Failed to load receipts", error);
      toast.error("Failed to load receipts");
    } finally {
      setIsReceiptLoading(false);
    }
  };

  const base64ToPdfBlob = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: "application/pdf" });
  };

  const handlePrintPOReport = async () => {
    if (!createdOrderNo) return;
    setIsActionLoading(true);
    try {
      const base64 = await getPurchaseOrderReport(createdOrderNo);
      if (!base64) {
        toast.error("No report data found.");
        return;
      }
      const blob = base64ToPdfBlob(base64);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Print PO failed", error);
      toast.error("Failed to generate report.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePrintMRN = async (mrnNo: string) => {
    startPrintMRN(async () => {
      try {
        const base64 = await getPurchasereceiptReport(mrnNo);
        if (!base64) {
          toast.error("No report data found.");
          return;
        }
        const blob = base64ToPdfBlob(base64);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } catch (error) {
        console.error("Print MRN failed", error);
        toast.error("Failed to generate MRN report.");
      }
    });
  };

  const handleOpenItemChargeForMrn = (mrnNo: string) => {
    setSelectedMrnNo(mrnNo);
    setItemChargeDialogOpen(true);
  };

  const refreshOrder = async () => {
    if (!createdOrderNo) return;
    const [order, lines] = await Promise.all([
      getPurchaseOrderByNo(createdOrderNo),
      getPurchaseOrderLines(createdOrderNo),
    ]);
    if (order) {
      const mappedFormData = mapPurchaseHeaderToFormData(order);
      const mappedLines = lines.map(mapPurchaseLineToLineItem);
      setFormData((prev) => ({ ...prev, ...mappedFormData }));
      setLineItems(mappedLines);
      setOrderStatus(order.Status ?? "");
      persist({
        ...mappedFormData,
        lineItems: mappedLines,
        createdOrderNo: order.No,
      });
    }
  };

  const handleSendForApproval = async () => {
    if (!createdOrderNo) return;
    setIsActionLoading(true);
    setPlaceOrderError(null);
    try {
      await sendApprovalRequest(createdOrderNo);
      await refreshOrder();
      toast.success("Sent for approval.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Send for approval failed.";
      setPlaceOrderError(message);
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
      await refreshOrder();
      toast.success("Approval cancelled.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cancel approval failed.";
      setPlaceOrderError(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!createdOrderNo) return;
    setIsActionLoading(true);
    setPlaceOrderError(null);
    try {
      await reopenPurchaseOrder(createdOrderNo);
      await refreshOrder();
      toast.success("Order reopened.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reopen failed.";
      setPlaceOrderError(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!createdOrderNo) return;

    setConfirmDialog({
      open: true,
      title: "Delete Purchase Order?",
      description:
        "Are you sure you want to delete this purchase order and all of its line items? This action cannot be undone.",
      action: async () => {
        setIsActionLoading(true);
        setPlaceOrderError(null);
        try {
          const lines = await getPurchaseOrderLines(createdOrderNo);
          for (const line of lines) {
            if (typeof line.Line_No === "number") {
              await deletePurchaseOrderLine(createdOrderNo, line.Line_No);
            }
          }
          await deletePurchaseOrderHeader(createdOrderNo);
          toast.success("Order deleted successfully.");
          onSuccess(createdOrderNo);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Delete failed.";
          setPlaceOrderError(message);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        } finally {
          setIsActionLoading(false);
        }
      },
      actionLabel: "Delete",
      variant: "destructive",
    });
  };

  const handlePendingAction = (label: string) => {
    if (label === "Post") {
      handleOpenPostDialog();
    } else if (label === "Purchase Receipts") {
      handleOpenReceipt();
    } else if (label === "Gate Entry") {
      setIsGateEntryOpen(true);
    } else {
      toast.info(`${label} will be wired in unified mode next.`);
    }
  };

  // Step 1: Order Information
  const isOpen = orderStatus === "Open";
  const isPendingApproval = orderStatus === "Pending Approval";
  const isReleased = orderStatus === "Released";
  const noop = () => {};
  const renderStep1 = () => {
    const defaultAccordionValue =
      isCreateMode || isEditMode ? ["core", "party", "dates"] : ["core"];

    const fieldsetDisabled =
      isViewMode || (isCreateMode && Boolean(createdOrderNo));

    return (
      <div className="space-y-3">
        <div className="mb-2 flex flex-wrap items-center justify-end gap-2 pb-3">
          {orderStatus && (
            <div className="mr-auto flex items-center gap-2">
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Status:
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "h-6 px-3 text-[10px] font-bold tracking-wider uppercase",
                  orderStatus === "Released" &&
                    "border-green-200 bg-green-500/10 text-green-600",
                  orderStatus === "Pending Approval" &&
                    "border-yellow-200 bg-yellow-500/10 text-yellow-600",
                  orderStatus === "Open" &&
                    "border-blue-200 bg-blue-500/10 text-blue-600",
                )}
              >
                {orderStatus}
              </Badge>
            </div>
          )}
          {isCreateMode && !createdOrderNo && (
            <Button
              type="button"
              onClick={handleCreateOrderHeader}
              disabled={!isStep1Valid() || isCreatingHeader || isHydratingOrder}
            >
              {isCreatingHeader ? "Creating Order..." : "Create Purchase Order"}
            </Button>
          )}

          {isViewMode && createdOrderNo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onRequestEdit ?? noop}
              disabled={isActionLoading}
            >
              Edit
            </Button>
          )}

          {isViewMode &&
            createdOrderNo &&
            !isPendingApproval &&
            !isReleased && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={handleDeleteOrder}
                disabled={isActionLoading}
              >
                Delete
              </Button>
            )}

          {isViewMode && createdOrderNo && isOpen && (
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleSendForApproval}
              disabled={isActionLoading}
            >
              Send For Approval
            </Button>
          )}

          {isViewMode && createdOrderNo && isPendingApproval && (
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleCancelApproval}
              disabled={isActionLoading}
            >
              Cancel Approval
            </Button>
          )}

          {isViewMode && createdOrderNo && isReleased && (
            <PostGateEntryDialog
              sourceNo={createdOrderNo}
              disabled={isActionLoading}
            />
          )}

          {isViewMode && createdOrderNo && isReleased && (
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={() => handlePendingAction("Purchase Receipts")}
              disabled={isActionLoading}
            >
              Purchase Receipts
            </Button>
          )}

          {isViewMode && createdOrderNo && isReleased && (
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={() => handlePendingAction("Post")}
              disabled={isActionLoading}
            >
              Post
            </Button>
          )}

          {isViewMode && createdOrderNo && isReleased && (
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleReopen}
              disabled={isActionLoading}
            >
              Reopen
            </Button>
          )}

          {isEditMode && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={handleUpdateOrder}
                disabled={!isDirty || isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Update"}
              </Button>
            </>
          )}

          {!isEditMode && createdOrderNo && (
            <>
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
            </>
          )}
        </div>

        <Separator />

        <Accordion
          key={mode}
          type="multiple"
          defaultValue={defaultAccordionValue}
          className="w-full space-y-2"
        >
          {/* 1. Core Order Info */}
          <AccordionItem value="core" className="border-none">
            <AccordionTrigger className="data-[state=open]:border-b-border py-0 hover:no-underline data-[state=open]:border-b data-[state=open]:pb-2 [&>svg]:size-4">
              <h3 className="px-2 py-1 text-left text-[10px] font-bold tracking-wider uppercase">
                General
              </h3>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <fieldset
                disabled={fieldsetDisabled}
                className={cn(
                  "pt-2",
                  isCreateMode && Boolean(createdOrderNo) && "opacity-70",
                )}
              >
                <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>
                      PO Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      disabled={isViewMode}
                      value={formData.poType}
                      onValueChange={(value) =>
                        handleInputChange("poType", value)
                      }
                    >
                      <SelectTrigger
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                      >
                        <SelectValue
                          placeholder={isViewMode ? "None" : "Select"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Goods">Goods</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.poType === "Service" && (
                    <div className={FIELD_CLASS}>
                      <label className={LABEL_CLASS}>Service Type</label>
                      <ClearableField
                        value={formData.serviceType}
                        onClear={() => handleInputChange("serviceType", "")}
                        disabled={isViewMode}
                      >
                        <Select
                          disabled={isViewMode}
                          value={
                            isViewMode &&
                            formData.serviceType &&
                            !["none", "Logistics"].includes(
                              formData.serviceType,
                            )
                              ? ""
                              : formData.serviceType || ""
                          }
                          onValueChange={(value) =>
                            handleInputChange(
                              "serviceType",
                              value === "none" ? "" : value,
                            )
                          }
                        >
                          <SelectTrigger
                            className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                          >
                            <SelectValue
                              placeholder={isViewMode ? "None" : "Select"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="Logistics">Logistics</SelectItem>
                          </SelectContent>
                        </Select>
                      </ClearableField>
                    </div>
                  )}
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Invoice Type</label>
                    <ClearableField
                      value={formData.invoiceType}
                      onClear={() => handleInputChange("invoiceType", "")}
                      disabled={isViewMode}
                    >
                      <Select
                        disabled={isViewMode}
                        value={
                          isViewMode &&
                          formData.invoiceType &&
                          ![
                            "none",
                            "Self Invoice",
                            "Debit Note",
                            "Supplementary",
                            "Non-GST",
                          ].includes(formData.invoiceType)
                            ? ""
                            : formData.invoiceType || ""
                        }
                        onValueChange={(value) =>
                          handleInputChange("invoiceType", value)
                        }
                      >
                        <SelectTrigger
                          className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                        >
                          <SelectValue
                            placeholder={isViewMode ? "None" : "Select / None"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="Self Invoice">
                            Self Invoice
                          </SelectItem>
                          <SelectItem value="Debit Note">Debit Note</SelectItem>
                          <SelectItem value="Supplementary">
                            Supplementary
                          </SelectItem>
                          <SelectItem value="Non-GST">Non-GST</SelectItem>
                        </SelectContent>
                      </Select>
                    </ClearableField>
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Purchaser Code</label>
                    <ClearableField
                      value={formData.purchasePersonCode}
                      onClear={() =>
                        handleInputChange("purchasePersonCode", "")
                      }
                      disabled={isViewMode}
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
                        placeholder={isViewMode ? "None" : "Select Purchaser"}
                        className={FIELD_INPUT_CLASS}
                      />
                    </ClearableField>
                    {formData.purchasePersonName && (
                      <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                        {formData.purchasePersonName}
                      </p>
                    )}
                  </div>

                  {/* Dimensions */}
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>
                      LOB <span className="text-red-500">*</span>
                    </label>
                    <ClearableField
                      value={formData.lob}
                      onClear={() => handleInputChange("lob", "")}
                      disabled={isViewMode}
                    >
                      <CascadingDimensionSelect
                        dimensionType="LOB"
                        value={formData.lob}
                        onChange={(value) => handleInputChange("lob", value)}
                        placeholder={isViewMode ? "None" : "Select LOB"}
                        userId={userId}
                        compactWhenSingle
                        className={FIELD_INPUT_CLASS}
                      />
                    </ClearableField>
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>
                      Branch <span className="text-red-500">*</span>
                    </label>
                    <ClearableField
                      value={formData.branch}
                      onClear={() => handleInputChange("branch", "")}
                      disabled={isViewMode}
                    >
                      <CascadingDimensionSelect
                        dimensionType="BRANCH"
                        value={formData.branch}
                        onChange={(value) => handleInputChange("branch", value)}
                        placeholder={isViewMode ? "None" : "Select Branch"}
                        lobValue={formData.lob}
                        userId={userId}
                        compactWhenSingle
                        className={FIELD_INPUT_CLASS}
                      />
                    </ClearableField>
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>
                      LOC <span className="text-red-500">*</span>
                    </label>
                    <ClearableField
                      value={formData.loc}
                      onClear={() => handleInputChange("loc", "")}
                      disabled={isViewMode}
                    >
                      <CascadingDimensionSelect
                        dimensionType="LOC"
                        value={formData.loc}
                        onChange={(value) => handleInputChange("loc", value)}
                        placeholder={isViewMode ? "None" : "Select LOC"}
                        lobValue={formData.lob}
                        branchValue={formData.branch}
                        userId={userId}
                        compactWhenSingle
                        className={FIELD_INPUT_CLASS}
                      />
                    </ClearableField>
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Location</label>
                    <Input
                      value={
                        formData.locationCode ||
                        formData.loc ||
                        (isViewMode ? "None" : "")
                      }
                      disabled
                      className={cn("bg-muted h-7 text-xs", FIELD_INPUT_CLASS)}
                      readOnly
                    />
                    {locationName && (
                      <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                        {locationName}
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>
            </AccordionContent>
          </AccordionItem>

          <Separator />

          {/* 2. Vendor, Broker & Address */}
          <AccordionItem value="party" className="border-none">
            <AccordionTrigger className="data-[state=open]:border-b-border py-0 hover:no-underline data-[state=open]:border-b data-[state=open]:pb-2 [&>svg]:size-4">
              <h3 className="px-2 py-1 text-left text-[10px] font-bold tracking-wider uppercase">
                Tax Information
              </h3>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <fieldset
                disabled={fieldsetDisabled}
                className={cn(
                  "pt-2",
                  isCreateMode && Boolean(createdOrderNo) && "opacity-70",
                )}
              >
                <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-5">
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>
                      Vendor <span className="text-red-500">*</span>
                    </label>
                    <ClearableField
                      value={formData.vendorNo}
                      onClear={() => handleVendorChange("", undefined)}
                      disabled={isViewMode}
                    >
                      <VendorSelect
                        value={formData.vendorNo}
                        onChange={handleVendorChange}
                        placeholder={isViewMode ? "None" : "Select Vendor"}
                        className={FIELD_INPUT_CLASS}
                      />
                    </ClearableField>
                    {formData.vendorName && (
                      <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                        {formData.vendorName}
                      </p>
                    )}
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Vendor GST No.</label>
                    <Input
                      value={
                        formData.vendorGstRegNo || (isViewMode ? "None" : "")
                      }
                      disabled
                      className={cn("bg-muted h-7 text-xs", FIELD_INPUT_CLASS)}
                      placeholder="Auto"
                      readOnly
                    />
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Vendor PAN</label>
                    <Input
                      value={formData.vendorPanNo || (isViewMode ? "None" : "")}
                      disabled
                      className={cn("bg-muted h-7 text-xs", FIELD_INPUT_CLASS)}
                      placeholder="Auto"
                      readOnly
                    />
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Vendor Invoice No.</label>
                    <ClearableField
                      value={formData.vendorInvoiceNo}
                      onClear={() => handleInputChange("vendorInvoiceNo", "")}
                      disabled={isViewMode}
                    >
                      <Input
                        value={
                          formData.vendorInvoiceNo || (isViewMode ? "None" : "")
                        }
                        onChange={(e) =>
                          handleInputChange("vendorInvoiceNo", e.target.value)
                        }
                        placeholder={isViewMode ? "None" : "Optional"}
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                      />
                    </ClearableField>
                  </div>
                  <div className={`${FIELD_CLASS} sm:col-span-2 lg:col-span-2`}>
                    <label className={LABEL_CLASS}>Order Address Select</label>
                    <OrderAddressSelect
                      vendorNo={formData.vendorNo}
                      value={formData.orderAddressCode}
                      onChange={(code, addr) =>
                        setFormData((prev) => ({
                          ...prev,
                          orderAddressCode: code,
                          orderAddressName: addr?.Name || "",
                          orderAddressState: addr?.State || "",
                        }))
                      }
                      placeholder={isViewMode ? "None" : "Select Address"}
                      disabled={!formData.vendorNo || isViewMode}
                      className={FIELD_INPUT_CLASS}
                    />
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Brokerage Code</label>
                    <ClearableField
                      value={formData.brokerNo}
                      onClear={() =>
                        setFormData((prev) => ({
                          ...prev,
                          brokerNo: "",
                          brokerName: "",
                        }))
                      }
                      disabled={isViewMode}
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
                        placeholder={isViewMode ? "None" : "Select Broker"}
                        disabled={isViewMode}
                        className={FIELD_INPUT_CLASS}
                      />
                    </ClearableField>
                    {formData.brokerName && (
                      <p className="mt-0.5 truncate pl-1 text-[9px] font-medium text-green-600">
                        {formData.brokerName}
                      </p>
                    )}
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Brokerage Rate</label>
                    <ClearableField
                      value={formData.brokerageRate}
                      onClear={() => handleInputChange("brokerageRate", "")}
                      disabled={isViewMode}
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
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                        placeholder={isViewMode ? "None" : "0.00"}
                        disabled={isViewMode}
                      />
                    </ClearableField>
                  </div>
                </div>
              </fieldset>
            </AccordionContent>
          </AccordionItem>

          <Separator />

          {/* 3. Dates & Configurations */}
          <AccordionItem value="dates" className="border-none">
            <AccordionTrigger className="data-[state=open]:border-b-border py-0 hover:no-underline data-[state=open]:border-b data-[state=open]:pb-2 [&>svg]:size-4">
              <h3 className="px-2 py-1 text-left text-[10px] font-bold tracking-wider uppercase">
                Vendor Statistics
              </h3>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <fieldset
                disabled={fieldsetDisabled}
                className={cn(
                  "pt-2",
                  isCreateMode && Boolean(createdOrderNo) && "opacity-70",
                )}
              >
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4 lg:grid-cols-6">
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>
                      Posting Date <span className="text-red-500">*</span>
                    </label>
                    <ClearableField
                      value={formData.postingDate}
                      onClear={() => handleInputChange("postingDate", "")}
                      disabled={isViewMode}
                    >
                      <Input
                        type="date"
                        value={formData.postingDate}
                        onChange={(e) =>
                          handleInputChange("postingDate", e.target.value)
                        }
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                      />
                    </ClearableField>
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>
                      Document Date <span className="text-red-500">*</span>
                    </label>
                    <ClearableField
                      value={formData.documentDate}
                      onClear={() => handleInputChange("documentDate", "")}
                      disabled={isViewMode}
                    >
                      <Input
                        type="date"
                        value={formData.documentDate}
                        onChange={(e) =>
                          handleInputChange("documentDate", e.target.value)
                        }
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                      />
                    </ClearableField>
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Order Date</label>
                    <Input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) =>
                        handleInputChange("orderDate", e.target.value)
                      }
                      disabled
                      className={cn("bg-muted h-7 text-xs", FIELD_INPUT_CLASS)}
                    />
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Due Date</label>
                    <ClearableField
                      value={formData.dueDate}
                      onClear={() => handleInputChange("dueDate", "")}
                      disabled={isViewMode}
                    >
                      <Input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          handleInputChange("dueDate", e.target.value)
                        }
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                        disabled={isViewMode}
                      />
                    </ClearableField>
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Due Date Calc</label>
                    <Select
                      value={formData.dueDateCalculation}
                      onValueChange={(value) =>
                        handleInputChange("dueDateCalculation", value)
                      }
                      disabled={isViewMode}
                    >
                      <SelectTrigger
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                      >
                        <SelectValue
                          placeholder={isViewMode ? "None" : "Select"}
                        />
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
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Rate Basis</label>
                    <Select
                      value={formData.rateBasis}
                      onValueChange={(value) =>
                        handleInputChange("rateBasis", value)
                      }
                      disabled={isViewMode}
                    >
                      <SelectTrigger
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                      >
                        <SelectValue
                          placeholder={isViewMode ? "None" : "Select"}
                        />
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
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Creditor Type</label>
                    <PurchaseSearchableSelect
                      value={formData.creditorType}
                      onChange={(value) =>
                        handleInputChange("creditorType", value)
                      }
                      options={CREDITOR_TYPE_OPTIONS}
                      placeholder={isViewMode ? "None" : "Select creditor"}
                      disabled={isViewMode}
                      className={FIELD_INPUT_CLASS}
                      searchInputClassName={FIELD_INPUT_CLASS}
                    />
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>QC Type</label>
                    <Select
                      value={formData.qcType}
                      onValueChange={(value) =>
                        handleInputChange("qcType", value)
                      }
                      disabled={isViewMode}
                    >
                      <SelectTrigger
                        className={cn("h-7 text-xs", FIELD_INPUT_CLASS)}
                      >
                        <SelectValue
                          placeholder={isViewMode ? "None" : "Select"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        <SelectItem value="Ex Passing">Ex Passing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Term Code</label>
                    <PurchaseSearchableSelect
                      value={formData.termCode}
                      onChange={(value) => handleInputChange("termCode", value)}
                      options={termList.map((t) => ({
                        value: t.Terms,
                        label: `${t.Terms} - ${t.Conditions}`,
                      }))}
                      placeholder={isViewMode ? "None" : "Select term"}
                      disabled={isViewMode}
                      className={FIELD_INPUT_CLASS}
                      searchInputClassName={FIELD_INPUT_CLASS}
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
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Payment Term</label>
                    <PurchaseSearchableSelect
                      value={formData.paymentTermCode}
                      onChange={(value) =>
                        handleInputChange("paymentTermCode", value)
                      }
                      options={paymentTermList.map((p) => ({
                        value: p.Code,
                        label: `${p.Code} - ${p.Description}`,
                      }))}
                      placeholder={isViewMode ? "None" : "Select pmt term"}
                      disabled={isViewMode}
                      className={FIELD_INPUT_CLASS}
                      searchInputClassName={FIELD_INPUT_CLASS}
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
                  <div className={FIELD_CLASS}>
                    <label className={LABEL_CLASS}>Mandi Name</label>
                    <PurchaseSearchableSelect
                      value={formData.mandiName}
                      onChange={(value) =>
                        handleInputChange("mandiName", value)
                      }
                      options={mandiList.map((m) => ({
                        value: m.Code,
                        label: `${m.Code} - ${m.Description}`,
                      }))}
                      placeholder={isViewMode ? "None" : "Select mandi"}
                      disabled={isViewMode}
                      className={FIELD_INPUT_CLASS}
                      searchInputClassName={FIELD_INPUT_CLASS}
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
              </fieldset>
            </AccordionContent>
          </AccordionItem>

          <Separator />
        </Accordion>
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
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {isHydratingOrder && (
            <div className="text-muted-foreground mb-4 text-sm">
              Loading order...
            </div>
          )}

          {renderStep1()}

          <section className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="bg-primary/5 border-primary/20 text-primary rounded-sm border px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
                  Line Items
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddLineItem}
                  size="sm"
                  className="h-8"
                  disabled={isCreateMode && !createdOrderNo}
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
                documentType="order"
              />
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-xs">
                Create the header first to enable line items.
              </div>
            )}

            <div className="bg-primary/5 border-primary/20 flex justify-end rounded-md border px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-primary text-[10px] font-bold tracking-wider uppercase">
                  Total Amount
                </span>
                <span className="text-primary text-base font-bold">
                  {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </section>
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
          documentType="order"
          vendorNo={formData.vendorNo}
          locationCode={formData.locationCode || formData.loc || ""}
          onSave={handleLineItemSave}
          onRemove={(line) => handleRemoveLineItem(line.id)}
          isSaving={isSavingLine}
        />
      )}

      {selectedLine && (
        <PurchaseLineEditDialog
          open={!!selectedLine}
          onOpenChange={(open) => !open && setSelectedLine(null)}
          line={selectedLine}
          documentType="order"
          orderNo={createdOrderNo}
          vendorNo={formData.vendorNo}
          onAssignTracking={(line: PurchaseLine) => {
            setTrackingLine(line);
            setIsTrackingOpen(true);
          }}
          onOpenItemCharge={(line: PurchaseLine) => {
            setSelectedItemChargeLine(line);
            setIsItemChargeOpen(true);
          }}
          onDelete={async (line) => {
            if (line.Line_No) {
              await handleRemoveLineItem(`synced-${line.Line_No}`);
            }
          }}
          onSave={async () => {
            if (createdOrderNo) {
              const lines = await getPurchaseOrderLines(createdOrderNo);
              setPurchaseLines(lines);
              setLineItems(lines.map(mapPurchaseLineToLineItem));
            }
            setSelectedLine(null);
          }}
        />
      )}

      {createdOrderNo && (
        <POAttachmentDialog
          isOpen={isAttachmentDialogOpen}
          onOpenChange={setIsAttachmentDialogOpen}
          orderNo={createdOrderNo}
        />
      )}

      {isTrackingOpen && trackingLine && (
        <PurchaseItemTrackingDialog
          open={isTrackingOpen}
          onOpenChange={setIsTrackingOpen}
          line={trackingLine}
          orderNo={createdOrderNo}
          locationCode={formData.locationCode || formData.loc || ""}
          onSave={() => {
            if (createdOrderNo) {
              fetchLines(createdOrderNo);
            }
          }}
        />
      )}

      {/* Post Option Dialog */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post Purchase Order</DialogTitle>
            <DialogHeader>
              <span className="text-muted-foreground text-sm">
                Choose how you want to post this released order.
              </span>
            </DialogHeader>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="post-mode"
                checked={postOption === "receive"}
                onChange={() => setPostOption("receive")}
              />
              <span>Receive</span>
            </Label>
            <Label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="post-mode"
                checked={postOption === "invoice"}
                onChange={() => setPostOption("invoice")}
              />
              <span>Invoice</span>
            </Label>
            <Label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="post-mode"
                checked={postOption === "receive-invoice"}
                onChange={() => setPostOption("receive-invoice")}
              />
              <span>Receive & Invoice</span>
            </Label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPostDialogOpen(false)}
              disabled={isPostLoading}
            >
              Cancel
            </Button>
            <Button onClick={handlePostOptionContinue} disabled={!postOption}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Details Dialog */}
      <Dialog open={isPostDetailsOpen} onOpenChange={setIsPostDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogHeader>
              <span className="text-muted-foreground text-sm">
                Fill in the posting details before confirming.
              </span>
            </DialogHeader>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Posting Date *</Label>
              <Input
                type="date"
                value={postDetails.postingDate}
                onChange={(e) =>
                  setPostDetails((prev) => ({
                    ...prev,
                    postingDate: e.target.value,
                  }))
                }
                className={cn("h-8", FIELD_INPUT_CLASS)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Document Date *</Label>
              <Input
                type="date"
                value={postDetails.documentDate}
                onChange={(e) =>
                  setPostDetails((prev) => ({
                    ...prev,
                    documentDate: e.target.value,
                  }))
                }
                className={cn("h-8", FIELD_INPUT_CLASS)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Vehicle No</Label>
              <Input
                value={postDetails.vehicleNo}
                onChange={(e) =>
                  setPostDetails((prev) => ({
                    ...prev,
                    vehicleNo: e.target.value,
                  }))
                }
                className={cn("h-8", FIELD_INPUT_CLASS)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Vendor Invoice No</Label>
              <Input
                value={postDetails.vendorInvoiceNo}
                onChange={(e) =>
                  setPostDetails((prev) => ({
                    ...prev,
                    vendorInvoiceNo: e.target.value,
                  }))
                }
                className={cn("h-8", FIELD_INPUT_CLASS)}
              />
            </div>

            {/* Invoice-only fields */}
            {(postOption === "invoice" || postOption === "receive-invoice") && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Due Date Calculation
                  </Label>
                  <Select
                    value={postDetails.dueDateCalculation}
                    onValueChange={(val) =>
                      setPostDetails((prev) => ({
                        ...prev,
                        dueDateCalculation: val,
                      }))
                    }
                  >
                    <SelectTrigger className={cn("h-8", FIELD_INPUT_CLASS)}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Posting Date">Posting Date</SelectItem>
                      <SelectItem value="Document Date">
                        Document Date
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Freight</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={postDetails.freight}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        setPostDetails((prev) => ({ ...prev, freight: val }));
                      }
                    }}
                    className={cn("h-8", FIELD_INPUT_CLASS)}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">
                    Line Narration
                  </Label>
                  <Input
                    value={postDetails.lineNarration}
                    onChange={(e) =>
                      setPostDetails((prev) => ({
                        ...prev,
                        lineNarration: e.target.value,
                      }))
                    }
                    className={cn("h-8", FIELD_INPUT_CLASS)}
                  />
                </div>
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
              {isPostLoading ? "Posting..." : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipts Lookup Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Purchase Receipts - {createdOrderNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Receipt Date:</Label>
              <Input
                type="date"
                value={receiptDate}
                onChange={(e) => {
                  setReceiptDate(e.target.value);
                  loadReceipt(e.target.value);
                }}
                className={cn("h-8 w-40", FIELD_INPUT_CLASS)}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => loadReceipt(receiptDate)}
              >
                Refresh
              </Button>
            </div>

            <div className="max-h-100 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">No.</TableHead>
                    <TableHead className="text-xs">Vendor No.</TableHead>
                    <TableHead className="text-xs">Posting Date</TableHead>
                    <TableHead className="text-xs">Vehicle No.</TableHead>
                    <TableHead className="text-xs">Gate Entry No.</TableHead>
                    <TableHead className="text-right text-xs">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isReceiptLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : receiptShipments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground py-10 text-center"
                      >
                        No receipts found for this date.
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
                        <TableCell className="text-xs">
                          {String(s.Gate_Entry_No || "-")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-primary hover:bg-primary/10 h-7 w-7"
                              title="Print MRN"
                              onClick={() => handlePrintMRN(s.No)}
                            >
                              {printingMRN ? (
                                <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {/* <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:bg-green-50"
                              title="Item Charge"
                              onClick={() => handleOpenItemChargeForMrn(s.No)}
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                            </Button> */}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsReceiptOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
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
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
            >
              {confirmDialog.cancelLabel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmDialog.variant || "default"}
              onClick={() => {
                confirmDialog.action();
              }}
            >
              {confirmDialog.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {selectedMrnNo && (
        <ItemChargeMultiSelectDialog
          open={itemChargeDialogOpen}
          onOpenChange={setItemChargeDialogOpen}
          mrnNo={selectedMrnNo}
        />
      )}
    </>
  );
}

export { PurchaseOrderFormContent as PurchaseDocumentFormContent };
export type PurchaseDocumentFormMode = UnifiedPurchaseOrderMode;
