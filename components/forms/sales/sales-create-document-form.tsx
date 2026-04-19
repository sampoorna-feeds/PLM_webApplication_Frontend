/**
 * Unified Sales Create Document Form
 * Handles create / edit / view flows for all 4 sales document types:
 *   order | invoice | return-order | credit-memo
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { CustomerSelect, type SalesCustomer } from "./customer-select";
import { ShipToSelect } from "./shipto-select";
import { SalesPersonSelect } from "./sales-person-select";
import type { ShipToAddress } from "@/lib/api/services/shipto.service";
import { getAuthCredentials } from "@/lib/auth/storage";
import { getErrorMessage } from "@/lib/errors";
import { ClearableField } from "@/components/ui/clearable-field";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/forms/shared/searchable-select";
import { SalesAddLineDialog } from "./sales-add-line-dialog";
import { SalesCopyDocumentDialog } from "./sales-copy-document-dialog";
import type { SalesCopyToDocType } from "@/lib/api/services/sales-copy-document.service";
import { SalesGetPostedLineDialog } from "./sales-get-posted-line-dialog";
import type { SalesGetPostedLineDocType } from "@/lib/api/services/sales-get-posted-line.service";
import { SalesItemTrackingDialog } from "./sales-item-tracking-dialog";
import { SalesLineItemsTable } from "./sales-line-items-table";
import { SalesOrderLineEditDialog } from "./sales-order-line-edit-dialog";
import { SalesItemChargeAssignmentDialog } from "./sales-item-charge-assignment-dialog";

// ── Services ──────────────────────────────────────────────────────────────────
import {
  createSalesOrder,
  addSalesOrderLineItems,
  addSingleSalesOrderLine,
  type SalesDocumentLineItem,
} from "@/lib/api/services/sales-order.service";
import {
  createSalesInvoice,
  createSalesInvoiceCopyHeader,
  addSalesInvoiceLineItems,
  addSingleSalesInvoiceLine,
} from "@/lib/api/services/sales-invoice.service";
import {
  createSalesReturnOrder,
  createSalesReturnOrderCopyHeader,
  addSalesReturnOrderLineItems,
  addSingleSalesReturnOrderLine,
} from "@/lib/api/services/sales-return-order.service";
import {
  createSalesCreditMemo,
  createSalesCreditMemoCopyHeader,
  addSalesCreditMemoLineItems,
  addSingleSalesCreditMemoLine,
} from "@/lib/api/services/sales-credit-memo.service";
import {
  getSalesOrderByNo,
  getSalesOrderLines,
  sendApprovalRequest as sendApproval_order,
  cancelApprovalRequest as cancelApproval_order,
  reopenSalesOrder as reopen_order,
  patchSalesOrderHeader as patch_order,
  deleteSalesOrderHeader as deleteHeader_order,
  deleteSalesOrderLine as deleteLine_order,
  postSalesOrder as post_order,
  getSalesShipmentsByOrder,
  getDeliveryReportPdf,
  updateSalesLine as updateLine_order,
  getTransporters,
  getTransportersPage,
  searchTransportersByField,
  type SalesOrder,
  type SalesLine,
  type Transporter,
  type SalesShipment,
} from "@/lib/api/services/sales-orders.service";
import {
  getSalesOrderByNo as getInvoiceByNo,
  getSalesOrderLines as getInvoiceLines,
  sendApprovalRequest as sendApproval_invoice,
  cancelApprovalRequest as cancelApproval_invoice,
  reopenSalesOrder as reopen_invoice,
  patchSalesOrderHeader as patch_invoice,
  deleteSalesOrderHeader as deleteHeader_invoice,
  deleteSalesOrderLine as deleteLine_invoice,
  postSalesOrder as post_invoice,
  updateSalesLine as updateLine_invoice,
} from "@/lib/api/services/sales-invoices.service";
import {
  getSalesOrderByNo as getReturnByNo,
  getSalesOrderLines as getReturnLines,
  sendApprovalRequest as sendApproval_return,
  cancelApprovalRequest as cancelApproval_return,
  reopenSalesOrder as reopen_return,
  patchSalesOrderHeader as patch_return,
  deleteSalesOrderHeader as deleteHeader_return,
  deleteSalesOrderLine as deleteLine_return,
  postSalesOrder as post_return,
  updateSalesLine as updateLine_return,
} from "@/lib/api/services/sales-return-orders.service";
import {
  getSalesOrderByNo as getCreditMemoByNo,
  getSalesOrderLines as getCreditMemoLines,
  sendApprovalRequest as sendApproval_cm,
  cancelApprovalRequest as cancelApproval_cm,
  reopenSalesOrder as reopen_cm,
  patchSalesOrderHeader as patch_cm,
  deleteSalesOrderHeader as deleteHeader_cm,
  deleteSalesOrderLine as deleteLine_cm,
  postSalesOrder as post_cm,
  updateSalesLine as updateLine_cm,
} from "@/lib/api/services/sales-credit-memos.service";
import { getItemsByNos, getItemStock } from "@/lib/api/services/item.service";

// ── Config + utilities ────────────────────────────────────────────────────────
import {
  getSalesDocumentConfig,
  getSalesDocumentCapabilities,
  type SalesDocumentType,
} from "./sales-document-config";
import {
  buildSalesCommonHeaderData,
  buildSalesHeaderPatchPayload,
  type SalesDocumentHeaderFormState,
} from "./sales-document-header-data";
import { mapSalesHeaderToFormData } from "./sales-document-hydration";
import type { SalesDocumentFormMode } from "./sales-form-stack";
import { validatePhone } from "@/lib/validations/shipto.validation";
import type { SalesDocumentHeaderData } from "./sales-document-header-data";

// ── Per-document-type config object ──────────────────────────────────────────

interface SalesDocumentOps {
  createHeader: (
    data: SalesDocumentHeaderData,
  ) => Promise<{ orderId: string; orderNo: string }>;
  fetchHeader: (no: string) => Promise<SalesOrder | null>;
  fetchLines: (no: string) => Promise<SalesLine[]>;
  addLineItems: (
    docNo: string,
    items: {
      type: "G/L Account" | "Item";
      no: string;
      uom?: string;
      quantity: number;
    }[],
    locationCode: string,
  ) => Promise<void>;
  addSingleLine: (
    docNo: string,
    line: {
      type: "G/L Account" | "Item";
      no: string;
      uom?: string;
      quantity: number;
    },
    locationCode: string,
  ) => Promise<{ Line_No: number; [key: string]: unknown }>;
  updateLine: (
    docNo: string,
    lineNo: number,
    body: Record<string, unknown>,
  ) => Promise<unknown>;
  patchHeader: (
    docNo: string,
    body: Record<string, unknown>,
  ) => Promise<unknown>;
  deleteHeader: (docNo: string) => Promise<unknown>;
  deleteLine: (docNo: string, lineNo: number) => Promise<unknown>;
  sendApproval: (docNo: string) => Promise<unknown>;
  cancelApproval: (docNo: string) => Promise<unknown>;
  reopen: (docNo: string) => Promise<unknown>;
  post: (docNo: string, option: "1" | "2" | "3") => Promise<unknown>;
}

const SALES_DOCUMENT_OPS: Record<SalesDocumentType, SalesDocumentOps> = {
  order: {
    createHeader: createSalesOrder,
    fetchHeader: getSalesOrderByNo,
    fetchLines: getSalesOrderLines,
    addLineItems: addSalesOrderLineItems,
    addSingleLine: addSingleSalesOrderLine,
    updateLine: updateLine_order,
    patchHeader: patch_order,
    deleteHeader: deleteHeader_order,
    deleteLine: deleteLine_order,
    sendApproval: sendApproval_order,
    cancelApproval: cancelApproval_order,
    reopen: reopen_order,
    post: post_order,
  },
  invoice: {
    createHeader: createSalesInvoice,
    fetchHeader: getInvoiceByNo,
    fetchLines: getInvoiceLines,
    addLineItems: addSalesInvoiceLineItems,
    addSingleLine: addSingleSalesInvoiceLine,
    updateLine: updateLine_invoice,
    patchHeader: patch_invoice,
    deleteHeader: deleteHeader_invoice,
    deleteLine: deleteLine_invoice,
    sendApproval: sendApproval_invoice,
    cancelApproval: cancelApproval_invoice,
    reopen: reopen_invoice,
    post: post_invoice,
  },
  "return-order": {
    createHeader: createSalesReturnOrder,
    fetchHeader: getReturnByNo,
    fetchLines: getReturnLines,
    addLineItems: addSalesReturnOrderLineItems,
    addSingleLine: addSingleSalesReturnOrderLine,
    updateLine: updateLine_return,
    patchHeader: patch_return,
    deleteHeader: deleteHeader_return,
    deleteLine: deleteLine_return,
    sendApproval: sendApproval_return,
    cancelApproval: cancelApproval_return,
    reopen: reopen_return,
    post: post_return,
  },
  "credit-memo": {
    createHeader: createSalesCreditMemo,
    fetchHeader: getCreditMemoByNo,
    fetchLines: getCreditMemoLines,
    addLineItems: addSalesCreditMemoLineItems,
    addSingleLine: addSingleSalesCreditMemoLine,
    updateLine: updateLine_cm,
    patchHeader: patch_cm,
    deleteHeader: deleteHeader_cm,
    deleteLine: deleteLine_cm,
    sendApproval: sendApproval_cm,
    cancelApproval: cancelApproval_cm,
    reopen: reopen_cm,
    post: post_cm,
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type CreateFormState = SalesDocumentHeaderFormState;

const EMPTY_FORM_STATE: CreateFormState = {
  customerNo: "",
  customerName: "",
  shipToCode: "",
  salesPersonCode: "",
  salesPersonName: "",
  locationCode: "",
  postingDate: "",
  documentDate: "",
  orderDate: "",
  externalDocumentNo: "",
  invoiceType: "Bill of supply",
  lob: "",
  branch: "",
  loc: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(val: string | undefined): string {
  if (!val || val === "0001-01-01") return "-";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString();
  } catch {
    return val;
  }
}

function formatAmount(val: number | undefined): string {
  if (val == null) return "-";
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SalesCreateDocumentFormContentProps {
  documentType: SalesDocumentType;
  mode?: SalesDocumentFormMode;
  orderNo?: string;
  onRequestEdit?: () => void;
  onCancelEdit?: () => void;
  onSuccess: (orderNo: string) => void;
  initialFormData?: Record<string, unknown>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SalesCreateDocumentFormContent({
  documentType,
  mode = "create",
  orderNo: initialOrderNo,
  onRequestEdit,
  onCancelEdit,
  onSuccess,
  initialFormData = {},
}: SalesCreateDocumentFormContentProps) {
  const config = getSalesDocumentConfig(documentType);
  const caps = getSalesDocumentCapabilities(documentType);
  const ops = SALES_DOCUMENT_OPS[documentType];

  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";
  const isViewMode = mode === "view";

  // ── Form state (create / edit header) ─────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState<CreateFormState>({
    ...EMPTY_FORM_STATE,
    postingDate: today,
    documentDate: today,
    orderDate: today,
    ...(initialFormData as Partial<CreateFormState>),
  });
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // ── View / edit state ──────────────────────────────────────────────────────
  const [orderHeader, setOrderHeader] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<SalesLine[]>([]);
  const [lineStockMap, setLineStockMap] = useState<Record<string, number>>({});
  const [itemTrackingMap, setItemTrackingMap] = useState<
    Record<string, string>
  >({});
  const [isLoadingTrackingMap, setIsLoadingTrackingMap] = useState(false);
  const [isLoading, setIsLoading] = useState(!isCreateMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Action state ──────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // ── Line dialog state ─────────────────────────────────────────────────────
  const [selectedLine, setSelectedLine] = useState<SalesLine | null>(null);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [isAddLineDialogOpen, setIsAddLineDialogOpen] = useState(false);
  const [selectedTrackingLine, setSelectedTrackingLine] =
    useState<SalesLine | null>(null);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);

  // ── Item charge dialog state ──────────────────────────────────────────────
  const [isItemChargeDialogOpen, setIsItemChargeDialogOpen] = useState(false);
  const [itemChargeLine, setItemChargeLine] = useState<SalesLine | null>(null);

  // ── Delete dialog state ───────────────────────────────────────────────────
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"document" | "lines">(
    "document",
  );
  const [selectedDeleteLineNos, setSelectedDeleteLineNos] = useState<number[]>(
    [],
  );
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // ── Copy document dialog state ────────────────────────────────────────────
  const [isCopyDocOpen, setIsCopyDocOpen] = useState(false);

  // ── Get posted line dialog state ──────────────────────────────────────────
  const [isGetPostedLineOpen, setIsGetPostedLineOpen] = useState(false);

  // ── Post dialog state (order only) ────────────────────────────────────────
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postOption, setPostOption] = useState<"1" | "2" | "3" | null>(null);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [isPostDetailsOpen, setIsPostDetailsOpen] = useState(false);
  const [postDetails, setPostDetails] = useState({
    transporterCode: "",
    transporterName: "",
    vehicleNumber: "",
    driverPhone: "",
    lrRrNumber: "",
    lrRrDate: "",
    postingDate: "",
    externalDocumentNo: "",
    distanceKm: "",
    grossWeight: "",
    tareWeight: "",
  });

  // ── Delivery Challan state (order only) ───────────────────────────────────
  const [isChallanOpen, setIsChallanOpen] = useState(false);
  const [challanDate, setChallanDate] = useState("");
  const [challanShipments, setChallanShipments] = useState<SalesShipment[]>([]);
  const [isChallanLoading, setIsChallanLoading] = useState(false);
  const [challanPdfUrls, setChallanPdfUrls] = useState<Record<string, string>>(
    {},
  );
  const [activeChallanDocNo, setActiveChallanDocNo] = useState<string | null>(
    null,
  );
  const challanPdfUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    challanPdfUrlsRef.current = challanPdfUrls;
  }, [challanPdfUrls]);

  useEffect(() => {
    return () => {
      Object.values(challanPdfUrlsRef.current).forEach((url) =>
        window.URL.revokeObjectURL(url),
      );
    };
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const creds = getAuthCredentials();
    if (creds) setUserId(creds.userID);
  }, []);

  // Sync locationCode with loc dimension
  useEffect(() => {
    setFormData((prev) => {
      if (prev.loc !== prev.locationCode) {
        return { ...prev, locationCode: prev.loc || "" };
      }
      return prev;
    });
  }, [formData.loc]);

  // ── Load document for view/edit ───────────────────────────────────────────
  const loadDocument = useCallback(async () => {
    const docNo = initialOrderNo;
    if (!docNo) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [header, lineItems] = await Promise.all([
        ops.fetchHeader(docNo),
        ops.fetchLines(docNo),
      ]);
      setOrderHeader(header);
      setLines(lineItems);

      if (header) {
        setFormData(mapSalesHeaderToFormData(header));
      }

      if (header?.Location_Code && lineItems.length > 0) {
        const itemNos = [
          ...new Set(lineItems.map((l) => String(l.No || ""))),
        ].filter(Boolean);
        const stockDate = new Date().toISOString().split("T")[0];
        try {
          const stock = await getItemStock(
            itemNos,
            header.Location_Code,
            stockDate,
          );
          setLineStockMap(stock);
        } catch {
          setLineStockMap({});
        }
      }
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load document."));
    } finally {
      setIsLoading(false);
    }
  }, [initialOrderNo, ops]);

  // Refresh only lines + stock without triggering the full loading skeleton.
  // Used after add/edit/delete line operations.
  const refreshLines = useCallback(async () => {
    const docNo = initialOrderNo;
    if (!docNo) return;
    try {
      const lineItems = await ops.fetchLines(docNo);
      setLines(lineItems);

      const locationCode = orderHeader?.Location_Code;
      if (locationCode && lineItems.length > 0) {
        const itemNos = [
          ...new Set(lineItems.map((l) => String(l.No || ""))),
        ].filter(Boolean);
        const stockDate = new Date().toISOString().split("T")[0];
        try {
          const stock = await getItemStock(itemNos, locationCode, stockDate);
          setLineStockMap(stock);
        } catch {
          setLineStockMap({});
        }
      }
    } catch {
      // non-fatal
    }
  }, [initialOrderNo, ops, orderHeader?.Location_Code]);

  useEffect(() => {
    if (!isCreateMode) {
      loadDocument();
    }
  }, [isCreateMode, loadDocument]);

  // Load item tracking codes for lines
  const fetchTrackingMap = useCallback(async () => {
    const itemLines = lines.filter((l) => l.Type === "Item" && l.No?.trim());
    const itemNos = [...new Set(itemLines.map((l) => String(l.No!)))];
    if (itemNos.length === 0) {
      setItemTrackingMap({});
      return;
    }
    setIsLoadingTrackingMap(true);
    try {
      const items = await getItemsByNos(itemNos);
      const map: Record<string, string> = {};
      items.forEach((item) => {
        const code = item.Item_Tracking_Code?.trim();
        if (code) map[item.No.trim().toLowerCase()] = code;
      });
      setItemTrackingMap(map);
    } catch {
      // non-fatal
    } finally {
      setIsLoadingTrackingMap(false);
    }
  }, [lines]);

  useEffect(() => {
    if (!isCreateMode) fetchTrackingMap();
  }, [isCreateMode, fetchTrackingMap]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const handleInputChange = (field: keyof CreateFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = (
    customerNo: string,
    customer?: SalesCustomer,
  ) => {
    const nextSalesPersonCode =
      customer?.Salesperson_Code || formData.salesPersonCode;
    const nextSalesPersonName =
      nextSalesPersonCode === formData.salesPersonCode
        ? formData.salesPersonName
        : "";
    setFormData((prev) => ({
      ...prev,
      customerNo,
      customerName: customer?.Name || "",
      salesPersonCode: nextSalesPersonCode,
      salesPersonName: nextSalesPersonName,
      customerPriceGroup:
        (customer as unknown as Record<string, string>)?.Customer_Price_Group ||
        "",
      shipToCode: "",
      shipToName: "",
      locationCode: "",
    }));
  };

  const handleShipToChange = (shipToCode: string, shipTo?: ShipToAddress) => {
    setFormData((prev) => ({
      ...prev,
      shipToCode,
      shipToName: shipTo?.Name || "",
      locationCode: shipTo?.Location_Code || prev.locationCode,
    }));
  };

  // ── Create mode: step validation ──────────────────────────────────────────
  const isHeaderValid = (): boolean => {
    return !!(
      formData.lob &&
      formData.branch &&
      formData.loc &&
      formData.customerNo &&
      formData.salesPersonCode &&
      formData.postingDate &&
      formData.documentDate &&
      formData.invoiceType
    );
  };

  // ── Create mode: submit ───────────────────────────────────────────────────
  const handleCreateHeader = async () => {
    if (!isHeaderValid()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const headerData = buildSalesCommonHeaderData(formData);
      const response = await ops.createHeader(headerData);
      const docNo = response.orderId ?? response.orderNo;
      if (!docNo) throw new Error("No document number returned");
      toast.success(`${config.documentLabel} created: ${docNo}`);
      onSuccess(docNo);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to create document."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit mode: save header ────────────────────────────────────────────────
  const handleUpdateHeader = async () => {
    if (!initialOrderNo) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const patch = buildSalesHeaderPatchPayload(
        formData,
        caps.supportsOrderDate,
      );
      await ops.patchHeader(initialOrderNo, patch);
      toast.success("Header updated");
      onSuccess(initialOrderNo);
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to update header."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Document status actions ───────────────────────────────────────────────
  const handleStatusAction = async (
    action: "sendApproval" | "cancelApproval" | "reopen",
  ) => {
    if (!initialOrderNo) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      if (action === "sendApproval") {
        await ops.sendApproval(initialOrderNo);
        toast.success("Sent for approval");
      } else if (action === "cancelApproval") {
        await ops.cancelApproval(initialOrderNo);
        toast.success("Approval cancelled");
      } else {
        await ops.reopen(initialOrderNo);
        toast.success("Document reopened");
      }
      loadDocument();
    } catch (err) {
      setActionError(getErrorMessage(err, "Action failed. Please try again."));
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!initialOrderNo) return;
    setIsDeleteLoading(true);
    try {
      if (deleteMode === "lines") {
        if (selectedDeleteLineNos.length === 0) {
          toast.error("Select at least one line to delete");
          return;
        }
        for (const lineNo of selectedDeleteLineNos) {
          await ops.deleteLine(initialOrderNo, lineNo);
        }
        toast.success(`Deleted ${selectedDeleteLineNos.length} line(s)`);
        setIsDeleteDialogOpen(false);
        refreshLines();
        return;
      }
      const allLineNos = lines
        .map((l) => l.Line_No)
        .filter((n): n is number => typeof n === "number");
      for (const lineNo of allLineNos) {
        await ops.deleteLine(initialOrderNo, lineNo);
      }
      await ops.deleteHeader(initialOrderNo);
      toast.success("Document deleted");
      setIsDeleteDialogOpen(false);
      onSuccess("");
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to delete document."));
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // ── Post (order only) ─────────────────────────────────────────────────────
  const handlePostOptionContinue = () => {
    if (!postOption) {
      toast.error("Select a post option");
      return;
    }
    setPostDetails({
      transporterCode: "",
      transporterName: "",
      vehicleNumber: "",
      driverPhone: "",
      lrRrNumber: "",
      lrRrDate: "",
      postingDate: orderHeader?.Posting_Date || "",
      externalDocumentNo: "",
      distanceKm: "",
      grossWeight: "",
      tareWeight: "",
    });
    setIsPostDialogOpen(false);
    setIsPostDetailsOpen(true);
  };

  const isShipOption = postOption === "1" || postOption === "3";
  const netWeight =
    (parseFloat(postDetails.grossWeight) || 0) -
    (parseFloat(postDetails.tareWeight) || 0);

  const handlePostDetailsSubmit = async () => {
    if (!initialOrderNo || !postOption) return;
    if (isShipOption && !postDetails.transporterName.trim()) {
      toast.error("Transporter Name is mandatory for Ship options");
      return;
    }
    if (isShipOption) {
      if (!postDetails.driverPhone.trim()) {
        toast.error("Driver phone is required for shipping");
        return;
      }
      const phoneError = validatePhone(postDetails.driverPhone);
      if (phoneError) {
        toast.error(phoneError);
        return;
      }
      if (!postDetails.lrRrNumber.trim()) {
        toast.error("LR/RR Number is required for shipping");
        return;
      }
      if (!postDetails.lrRrDate) {
        toast.error("LR/RR Date is required for shipping");
        return;
      }
    }

    setIsPostLoading(true);
    try {
      const patchPayload: Record<string, unknown> = {
        Transporter_Code: postDetails.transporterCode || "",
        Transporter_Name: postDetails.transporterName || "",
        Vehicle_No: postDetails.vehicleNumber || "",
        Driver_Mobile_No: postDetails.driverPhone || "",
        LR_RR_No: postDetails.lrRrNumber || "",
        LR_RR_Date: postDetails.lrRrDate || "",
        Posting_Date: postDetails.postingDate || "",
        External_Document_No: postDetails.externalDocumentNo || "",
        Distance_km: postDetails.distanceKm
          ? Number(postDetails.distanceKm)
          : 0,
      };
      if (isShipOption) {
        patchPayload.Gross_Weight = postDetails.grossWeight
          ? Number(postDetails.grossWeight)
          : 0;
        patchPayload.Tier_Weight = postDetails.tareWeight
          ? Number(postDetails.tareWeight)
          : 0;
      }
      await ops.patchHeader(initialOrderNo, patchPayload);
      await ops.post(initialOrderNo, postOption);
      toast.success("Document posted successfully");
      setIsPostDetailsOpen(false);
      loadDocument();
    } catch (err) {
      setActionError(getErrorMessage(err, "Failed to post document."));
    } finally {
      setIsPostLoading(false);
    }
  };

  // ── Delivery challan (order only) ─────────────────────────────────────────
  const base64ToPdfBlob = (base64Value: string) => {
    const normalized = base64Value
      .replace(/^data:application\/pdf;base64,/, "")
      .replace(/\s/g, "");
    const bytes = atob(normalized);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: "application/pdf" });
  };

  const getChallanPdfUrl = useCallback(
    async (shipment: SalesShipment) => {
      const existing = challanPdfUrlsRef.current[shipment.No];
      if (existing) return existing;
      const customerNo = String(orderHeader?.Sell_to_Customer_No || "").trim();
      const postingDate = String(
        shipment.Posting_Date || challanDate || "",
      ).trim();
      if (!customerNo) throw new Error("Customer number missing");
      if (!postingDate) throw new Error("Posting date missing");
      setActiveChallanDocNo(shipment.No);
      try {
        const base64 = await getDeliveryReportPdf(
          shipment.No,
          customerNo,
          postingDate,
        );
        if (!base64) throw new Error("No PDF content returned");
        const blob = base64ToPdfBlob(base64);
        const url = window.URL.createObjectURL(blob);
        setChallanPdfUrls((prev) => {
          const old = prev[shipment.No];
          if (old) window.URL.revokeObjectURL(old);
          return { ...prev, [shipment.No]: url };
        });
        return url;
      } finally {
        setActiveChallanDocNo((c) => (c === shipment.No ? null : c));
      }
    },
    [challanDate, orderHeader?.Sell_to_Customer_No],
  );

  const loadChallan = async () => {
    if (!orderHeader?.No || !challanDate) {
      toast.error("Please choose a posting date");
      return;
    }
    setIsChallanLoading(true);
    try {
      const results = await getSalesShipmentsByOrder(
        orderHeader.No,
        challanDate,
      );
      setChallanShipments(results);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load shipments."));
    } finally {
      setIsChallanLoading(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const deletableLineNos = lines
    .map((l) => l.Line_No)
    .filter((n): n is number => typeof n === "number");
  const allLinesSelected =
    deletableLineNos.length > 0 &&
    selectedDeleteLineNos.length === deletableLineNos.length;

  // ── Status helpers ────────────────────────────────────────────────────────
  const isOpen = orderHeader?.Status === "Open";
  const isPending = orderHeader?.Status === "Pending Approval";
  const isReleased = orderHeader?.Status === "Released";
  const areFieldsReadOnly = isViewMode;

  // ── Render helpers ─────────────────────────────────────────────────────────
  const fieldClass = "min-w-0 space-y-1";
  const labelClass = "text-muted-foreground block text-xs font-medium";

  const renderHeaderFields = () => (
    <Accordion
      type="multiple"
      defaultValue={["general", "customer-info"]}
      className="space-y-0"
    >
      {/* ── General ── */}
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
          <section className="space-y-4">
      {/* LOB | Branch | LOC | Invoice Type */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
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
              onChange={(v) => handleInputChange("lob", v)}
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
              onChange={(v) => handleInputChange("branch", v)}
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
              onChange={(v) => handleInputChange("loc", v)}
              placeholder="Select LOC"
              lobValue={formData.lob}
              branchValue={formData.branch}
              userId={userId}
              compactWhenSingle
            />
          </ClearableField>
        </div>
        {caps.supportsInvoiceType && (
          <div className={fieldClass}>
            <label className={labelClass}>Invoice Type</label>
            <ClearableField
              readOnly={areFieldsReadOnly}
              value={formData.invoiceType}
              onClear={() => handleInputChange("invoiceType", "Bill of supply")}
            >
              <Select
                value={formData.invoiceType}
                onValueChange={(v) => handleInputChange("invoiceType", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {caps.invoiceTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ClearableField>
          </div>
        )}
      </div>

      {/* Customer | Location | Sales Person | Ship To */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={fieldClass}>
          <label className={labelClass}>Customer</label>
          <ClearableField
            readOnly={areFieldsReadOnly}
            value={formData.customerNo}
            onClear={() => handleCustomerChange("", undefined)}
          >
            <CustomerSelect
              value={formData.customerNo}
              onChange={handleCustomerChange}
              placeholder="Select"
            />
          </ClearableField>
          {formData.customerName && (
            <p className="mt-1 pl-1 text-[10px] font-medium text-green-600">
              {formData.customerName}
            </p>
          )}
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Location</label>
          <Input
            value={formData.locationCode || formData.loc || ""}
            disabled
            className="bg-muted h-8"
            readOnly
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Sales Person</label>
          <ClearableField
            readOnly={areFieldsReadOnly}
            value={formData.salesPersonCode}
            onClear={() =>
              setFormData((p) => ({
                ...p,
                salesPersonCode: "",
                salesPersonName: "",
              }))
            }
          >
            <SalesPersonSelect
              value={formData.salesPersonCode}
              onChange={(v, sp) =>
                setFormData((p) => ({
                  ...p,
                  salesPersonCode: v,
                  salesPersonName: sp?.Name || "",
                }))
              }
              placeholder="Select"
            />
          </ClearableField>
          {formData.salesPersonName && (
            <p className="mt-1 pl-1 text-[10px] font-medium text-green-600">
              {formData.salesPersonName}
            </p>
          )}
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Ship To</label>
          <ClearableField
            readOnly={areFieldsReadOnly}
            value={formData.shipToCode}
            onClear={() => handleShipToChange("", undefined)}
          >
            <ShipToSelect
              customerNo={formData.customerNo}
              value={formData.shipToCode}
              onChange={handleShipToChange}
              placeholder="Select (optional)"
              tabId=""
              loc={formData.loc}
            />
          </ClearableField>
          {(formData as unknown as Record<string, string>).shipToName && (
            <p className="mt-1 pl-1 text-[10px] font-medium text-green-600">
              {(formData as unknown as Record<string, string>).shipToName}
            </p>
          )}
        </div>
      </div>

      {/* Dates | External Doc No. */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
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
              onChange={(e) => handleInputChange("postingDate", e.target.value)}
              className="h-8"
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
              className="h-8"
            />
          </ClearableField>
        </div>
        {caps.supportsOrderDate && (
          <div className={fieldClass}>
            <label className={labelClass}>Order Date</label>
            <Input
              type="date"
              value={formData.orderDate}
              onChange={(e) => handleInputChange("orderDate", e.target.value)}
              disabled
              className="bg-muted h-8"
            />
          </div>
        )}
        <div className={fieldClass}>
          <label className={labelClass}>External Doc No.</label>
          <ClearableField
            readOnly={areFieldsReadOnly}
            value={formData.externalDocumentNo}
            onClear={() => handleInputChange("externalDocumentNo", "")}
          >
            <Input
              value={formData.externalDocumentNo}
              onChange={(e) =>
                handleInputChange("externalDocumentNo", e.target.value)
              }
              placeholder="Optional"
              className="h-8"
            />
          </ClearableField>
        </div>
      </div>
          </section>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  const currentDocNo = initialOrderNo || "";

  return (
    <>
      <RequestFailedDialog
        open={!!actionError}
        message={actionError}
        onOpenChange={(open) => !open && setActionError(null)}
      />

      <div className="flex h-full flex-col">
        {/* ── Action Bar ── */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-b px-4 py-2">
          {isLoading && !isCreateMode ? (
            <>
              <div className="bg-muted text-muted-foreground mr-auto flex h-6 w-24 animate-pulse items-center rounded-full px-3 text-[10px] font-bold tracking-wider uppercase" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled
              >
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Edit
              </Button>
              <Button type="button" size="sm" className="h-8" disabled>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Loading…
              </Button>
            </>
          ) : (
            <>
              {/* Status badge */}
              {!isCreateMode && orderHeader?.Status && (
                <div className="mr-auto flex items-center gap-2">
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    Status:
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-6 px-3 text-[10px] font-bold tracking-wider uppercase",
                      orderHeader.Status === "Released" &&
                        "border-green-200 bg-green-500/10 text-green-600",
                      orderHeader.Status === "Pending Approval" &&
                        "border-yellow-200 bg-yellow-500/10 text-yellow-600",
                      orderHeader.Status === "Open" &&
                        "border-blue-200 bg-blue-500/10 text-blue-600",
                    )}
                  >
                    {orderHeader.Status}
                  </Badge>
                </div>
              )}
              {isCreateMode && (
                <div className="mr-auto">
                  <span className="text-muted-foreground text-xs">
                    Fill in header fields to create the document.
                  </span>
                </div>
              )}

              {/* View mode buttons */}
              {isViewMode && !isPending && !isReleased && (
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
              {isViewMode && !isPending && !isReleased && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setDeleteMode("document");
                    setSelectedDeleteLineNos([]);
                    setIsDeleteDialogOpen(true);
                  }}
                  disabled={isActionLoading}
                >
                  Delete
                </Button>
              )}
              {isViewMode && isOpen && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => handleStatusAction("sendApproval")}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send For Approval"
                  )}
                </Button>
              )}
              {isViewMode && isPending && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => handleStatusAction("cancelApproval")}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Cancel Approval"
                  )}
                </Button>
              )}
              {isViewMode && isReleased && caps.supportsDeliveryReport && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setChallanDate(orderHeader?.Posting_Date || "");
                    setChallanShipments([]);
                    setIsChallanOpen(true);
                  }}
                >
                  Delivery Challan
                </Button>
              )}
              {caps.supportsCopyDocument && isCreateMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsCopyDocOpen(true)}
                  disabled={isSubmitting || isActionLoading}
                >
                  Copy Document
                </Button>
              )}
              {isViewMode && isReleased && caps.supportsPost && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setPostOption(null);
                    setIsPostDialogOpen(true);
                  }}
                  disabled={isActionLoading}
                >
                  Post
                </Button>
              )}
              {isViewMode && isReleased && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => handleStatusAction("reopen")}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Reopen"
                  )}
                </Button>
              )}

              {/* Edit mode buttons */}
              {isEditMode && onCancelEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={onCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              {isEditMode && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleUpdateHeader}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Update Header
                </Button>
              )}

              {/* Create mode button */}
              {isCreateMode && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={handleCreateHeader}
                  disabled={isSubmitting || !isHeaderValid()}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  {config.createHeaderButtonLabel}
                </Button>
              )}
            </>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && !isCreateMode ? (
            <div className="flex flex-col gap-3 px-6 py-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : loadError && !isCreateMode ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-destructive text-sm">
                {loadError || "Document not found"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 px-6 py-4">
              {/* Header fields */}
              {renderHeaderFields()}

              {/* Lines section — always visible, Add Line disabled until header created */}
              <section className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground text-[10px] font-bold tracking-wider uppercase">
                      Line Items
                    </h3>
                    {currentDocNo && (
                      <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
                        {currentDocNo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoadingTrackingMap && (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking tracking…
                      </span>
                    )}
                    {caps.supportsGetPostedLine && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => setIsGetPostedLineOpen(true)}
                        disabled={!currentDocNo}
                      >
                        Get Posted Line
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setIsAddLineDialogOpen(true)}
                      disabled={!currentDocNo}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add Line
                    </Button>
                  </div>
                </div>

                <SalesLineItemsTable
                  lines={lines}
                  documentNo={currentDocNo}
                  documentType={documentType}
                  itemTrackingMap={itemTrackingMap}
                  lineStockMap={lineStockMap}
                  readOnly={isViewMode}
                  editable={!!currentDocNo}
                  onRowClick={(line) => {
                    setSelectedLine(line);
                    setIsLineDialogOpen(true);
                  }}
                  onDelete={async (line) => {
                    if (!currentDocNo || line.Line_No == null) return;
                    await ops.deleteLine(currentDocNo, line.Line_No);
                    refreshLines();
                  }}
                  onInlineUpdate={async (line, patch) => {
                    if (!currentDocNo || line.Line_No == null) return;
                    await ops.updateLine(currentDocNo, line.Line_No, patch);
                    await refreshLines();
                  }}
                />

                {lines.length > 0 && (
                  <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-4 py-2.5">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      {lines.length} Line{lines.length !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-muted-foreground text-xs">
                        Total Amount
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {formatAmount(
                          lines.reduce(
                            (sum, l) =>
                              sum + (l.Amt_to_Customer ?? l.Line_Amount ?? 0),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Add line dialog */}
      <SalesAddLineDialog
        open={isAddLineDialogOpen}
        onOpenChange={setIsAddLineDialogOpen}
        documentNo={currentDocNo}
        documentType={documentType}
        locationCode={orderHeader?.Location_Code || formData.locationCode || ""}
        customerPriceGroup={formData.customerPriceGroup}
        orderDate={formData.orderDate || formData.postingDate}
        onSave={refreshLines}
        addSingleLine={
          ops.addSingleLine as (
            documentNo: string,
            line: SalesDocumentLineItem,
            locationCode: string,
          ) => Promise<{ Line_No: number; [key: string]: unknown }>
        }
      />

      {/* Line edit dialog */}
      <SalesOrderLineEditDialog
        open={isLineDialogOpen}
        onOpenChange={setIsLineDialogOpen}
        line={selectedLine}
        documentType={documentType}
        orderNo={currentDocNo}
        hasTracking={
          !!selectedLine &&
          !!itemTrackingMap[
            String(selectedLine.No || "")
              .trim()
              .toLowerCase()
          ]
        }
        onSave={refreshLines}
        onAssignTracking={(line) => {
          setSelectedTrackingLine(line);
          setIsTrackingDialogOpen(true);
        }}
        onOpenItemCharge={(line) => {
          setItemChargeLine(line);
          setIsLineDialogOpen(false);
          setIsItemChargeDialogOpen(true);
        }}
        onDelete={async (line) => {
          if (!currentDocNo || line.Line_No == null) return;
          await ops.deleteLine(currentDocNo, line.Line_No);
          setIsLineDialogOpen(false);
          refreshLines();
        }}
        updateLine={
          ops.updateLine as (
            documentNo: string,
            lineNo: number,
            body: Record<string, unknown>,
          ) => Promise<unknown>
        }
      />

      {/* Item charge assignment dialog */}
      {itemChargeLine && (
        <SalesItemChargeAssignmentDialog
          open={isItemChargeDialogOpen}
          onOpenChange={(open) => {
            setIsItemChargeDialogOpen(open);
            if (!open) setItemChargeLine(null);
          }}
          docType={
            documentType === "order"
              ? "Order"
              : documentType === "invoice"
                ? "Invoice"
                : documentType === "return-order"
                  ? "Return Order"
                  : "Credit Memo"
          }
          docNo={currentDocNo}
          docLineNo={itemChargeLine.Line_No ?? 0}
          itemChargeNo={itemChargeLine.No ?? ""}
          itemChargeDescription={itemChargeLine.Description ?? ""}
          totalQuantity={itemChargeLine.Quantity ?? 0}
          totalAmount={itemChargeLine.Line_Amount ?? 0}
        />
      )}

      {/* Item tracking dialog */}
      <SalesItemTrackingDialog
        open={isTrackingDialogOpen}
        onOpenChange={setIsTrackingDialogOpen}
        onSave={refreshLines}
        orderNo={currentDocNo}
        locationCode={orderHeader?.Location_Code || ""}
        line={selectedTrackingLine}
        documentType={documentType}
      />

      {/* Delete dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "document"
                ? `Delete ${config.documentLabel}`
                : "Delete Line Items"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "document"
                ? `This will permanently delete this ${config.documentLabel} and all its lines. This cannot be undone.`
                : "Select lines to delete and confirm."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteMode === "lines" && (
            <div className="max-h-48 space-y-2 overflow-y-auto py-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allLinesSelected}
                  onCheckedChange={(checked) =>
                    setSelectedDeleteLineNos(
                      checked ? [...deletableLineNos] : [],
                    )
                  }
                />
                <span className="text-sm">Select all</span>
              </div>
              {lines.map((line) => (
                <div key={line.Line_No} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedDeleteLineNos.includes(line.Line_No!)}
                    onCheckedChange={(checked) =>
                      setSelectedDeleteLineNos((prev) =>
                        checked
                          ? [...prev, line.Line_No!]
                          : prev.filter((n) => n !== line.Line_No),
                      )
                    }
                  />
                  <span className="text-sm">
                    Line {line.Line_No} — {line.No} {line.Description}
                  </span>
                </div>
              ))}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleteLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Get Posted Line dialog */}
      {caps.supportsGetPostedLine && currentDocNo && (
        <SalesGetPostedLineDialog
          open={isGetPostedLineOpen}
          onOpenChange={setIsGetPostedLineOpen}
          documentNo={currentDocNo}
          docType={
            (documentType === "invoice" ? "Invoice" : "CreditMemo") as SalesGetPostedLineDocType
          }
          customerNo={orderHeader?.Sell_to_Customer_No}
          onSuccess={async () => {
            await refreshLines();
          }}
        />
      )}

      {/* Copy Document dialog */}
      {caps.supportsCopyDocument && (
        <SalesCopyDocumentDialog
          open={isCopyDocOpen}
          toDocNo={currentDocNo || undefined}
          toDocType={
            (documentType === "invoice"
              ? "Invoice"
              : documentType === "credit-memo"
                ? "Credit Memo"
                : "Return Order") as SalesCopyToDocType
          }
          onOpenChange={setIsCopyDocOpen}
          lobValue={formData.lob}
          branchValue={formData.branch}
          userId={userId}
          onCreateHeader={async (locCode, lobCode, branchCode) => {
            if (documentType === "invoice") {
              const r = await createSalesInvoiceCopyHeader(locCode, lobCode, branchCode);
              return r.orderNo;
            }
            if (documentType === "return-order") {
              const r = await createSalesReturnOrderCopyHeader(locCode, lobCode, branchCode);
              return r.orderNo;
            }
            const r = await createSalesCreditMemoCopyHeader(locCode, lobCode, branchCode);
            return r.orderNo;
          }}
          onSuccess={async (docNo) => {
            if (docNo && docNo !== currentDocNo) {
              onSuccess(docNo);
              return;
            }
            await refreshLines();
          }}
        />
      )}

      {/* Post option dialog */}
      {caps.supportsPost && (
        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Post {config.documentLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {caps.postOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors",
                    postOption === opt.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50",
                  )}
                >
                  <input
                    type="radio"
                    name="postOption"
                    value={opt.value}
                    checked={postOption === opt.value}
                    onChange={() => setPostOption(opt.value)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPostDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handlePostOptionContinue} disabled={!postOption}>
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Post details dialog (transporter, etc.) */}
      {caps.supportsPost && (
        <Dialog open={isPostDetailsOpen} onOpenChange={setIsPostDetailsOpen}>
          <DialogContent className="sm:max-w-150">
            <DialogHeader>
              <DialogTitle>Post Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              {caps.supportsTransporter && (
                <>
                  <div className="space-y-1">
                    <Label>
                      Transporter Name{" "}
                      {isShipOption && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <SearchableSelect<Transporter>
                      value={postDetails.transporterCode}
                      onChange={(val, item) =>
                        setPostDetails((p) => ({
                          ...p,
                          transporterCode: val,
                          transporterName: item?.Name || val,
                        }))
                      }
                      loadInitial={() => getTransporters()}
                      searchItems={(q) => searchTransportersByField(q, "Name")}
                      loadMore={(skip, search) =>
                        getTransportersPage(skip, search)
                      }
                      getDisplayValue={(t) => t.Name || t.No}
                      getItemValue={(t) => t.No}
                      placeholder="Select Transporter"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Vehicle No.</Label>
                    <Input
                      value={postDetails.vehicleNumber}
                      onChange={(e) =>
                        setPostDetails((p) => ({
                          ...p,
                          vehicleNumber: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      Driver Phone{" "}
                      {isShipOption && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <Input
                      value={postDetails.driverPhone}
                      onChange={(e) =>
                        setPostDetails((p) => ({
                          ...p,
                          driverPhone: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      LR/RR No.{" "}
                      {isShipOption && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <Input
                      value={postDetails.lrRrNumber}
                      onChange={(e) =>
                        setPostDetails((p) => ({
                          ...p,
                          lrRrNumber: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      LR/RR Date{" "}
                      {isShipOption && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <Input
                      type="date"
                      value={postDetails.lrRrDate}
                      onChange={(e) =>
                        setPostDetails((p) => ({
                          ...p,
                          lrRrDate: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label>Posting Date</Label>
                <Input
                  type="date"
                  value={postDetails.postingDate}
                  onChange={(e) =>
                    setPostDetails((p) => ({
                      ...p,
                      postingDate: e.target.value,
                    }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label>External Doc No.</Label>
                <Input
                  value={postDetails.externalDocumentNo}
                  onChange={(e) =>
                    setPostDetails((p) => ({
                      ...p,
                      externalDocumentNo: e.target.value,
                    }))
                  }
                  className="h-9"
                />
              </div>
              {caps.supportsTransporter && isShipOption && (
                <>
                  <div className="space-y-1">
                    <Label>Distance (km)</Label>
                    <Input
                      value={postDetails.distanceKm}
                      onChange={(e) =>
                        setPostDetails((p) => ({
                          ...p,
                          distanceKm: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Gross Weight</Label>
                    <Input
                      value={postDetails.grossWeight}
                      onChange={(e) =>
                        setPostDetails((p) => ({
                          ...p,
                          grossWeight: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tare Weight</Label>
                    <Input
                      value={postDetails.tareWeight}
                      onChange={(e) =>
                        setPostDetails((p) => ({
                          ...p,
                          tareWeight: e.target.value,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Net Weight</Label>
                    <Input
                      value={netWeight.toFixed(2)}
                      disabled
                      className="bg-muted h-9"
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
                Back
              </Button>
              <Button
                onClick={handlePostDetailsSubmit}
                disabled={isPostLoading}
              >
                {isPostLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delivery Challan dialog (order only) */}
      {caps.supportsDeliveryReport && (
        <Dialog open={isChallanOpen} onOpenChange={setIsChallanOpen}>
          <DialogContent className="sm:max-w-150">
            <DialogHeader>
              <DialogTitle>Delivery Challan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  className="h-9 flex-1"
                />
                <Button
                  onClick={loadChallan}
                  disabled={isChallanLoading}
                  size="sm"
                >
                  {isChallanLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>

              {challanShipments.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Shipment No.</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {challanShipments.map((shipment) => (
                        <TableRow key={shipment.No}>
                          <TableCell className="text-xs font-medium">
                            {shipment.No}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(shipment.Posting_Date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={activeChallanDocNo === shipment.No}
                                onClick={async () => {
                                  try {
                                    const url =
                                      await getChallanPdfUrl(shipment);
                                    window.open(
                                      url,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                  } catch (err) {
                                    toast.error(
                                      getErrorMessage(err, "Operation failed."),
                                    );
                                  }
                                }}
                              >
                                {activeChallanDocNo === shipment.No ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "View"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={activeChallanDocNo === shipment.No}
                                onClick={async () => {
                                  try {
                                    const url =
                                      await getChallanPdfUrl(shipment);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `Delivery_Challan_${shipment.No.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  } catch (err) {
                                    toast.error(
                                      getErrorMessage(err, "Operation failed."),
                                    );
                                  }
                                }}
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {challanShipments.length === 0 && !isChallanLoading && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No shipments found. Select a date and click Search.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChallanOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
