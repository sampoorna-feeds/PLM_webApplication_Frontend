"use client";

/**
 * Purchase Order Detail Form
 * Read-only view of a purchase order with header and line items.
 * Toolbar: Edit, Send For Approval / Cancel Approval / Reopen, Delete, Post.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  getPurchaseOrderByNo,
  getPurchaseOrderLines,
  sendApprovalRequest,
  cancelApprovalRequest,
  reopenPurchaseOrder,
  deletePurchaseOrderLine,
  deletePurchaseOrderHeader,
  patchPurchaseOrderHeader,
  postPurchaseOrder,
  getPurchaseShipmentsByOrder,
  type PurchaseOrder,
  type PurchaseLine,
  type PurchaseShipment,
} from "@/lib/api/services/purchase-orders.service";
import { getItemsByNos, getItemStock } from "@/lib/api/services/item.service";

import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { PurchaseItemTrackingDialog } from "./purchase-item-tracking-dialog";
import { PurchaseOrderLineEditDialog } from "./purchase-order-line-edit-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/lib/api/client";

interface PurchaseOrderDetailFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

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
  return val.toLocaleString();
}

export function PurchaseOrderDetailForm({
  tabId,
  context,
}: PurchaseOrderDetailFormProps) {
  const { closeTab } = useFormStack(tabId);
  const { openTab } = useFormStackContext();
  const orderNo = context?.orderNo as string | undefined;
  const refetch = context?.refetch as (() => void) | undefined;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [lineStockMap, setLineStockMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isLoadingTrackingMap, setIsLoadingTrackingMap] = useState(false);
  const [itemTrackingMap, setItemTrackingMap] = useState<
    Record<string, string>
  >({});
  const [selectedLine, setSelectedLine] = useState<PurchaseLine | null>(null);
  const [selectedTrackingLine, setSelectedTrackingLine] =
    useState<PurchaseLine | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"order" | "lines">("order");
  const [selectedDeleteLineNos, setSelectedDeleteLineNos] = useState<number[]>(
    [],
  );
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postOption, setPostOption] = useState<
    "receive" | "invoice" | "receive-invoice" | null
  >(null);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [isPostDetailsOpen, setIsPostDetailsOpen] = useState(false);
  const [postDetails, setPostDetails] = useState({
    postingDate: "",
    documentDate: "",
    vehicleNo: "",
    vendorInvoiceNo: "",
    dueDateCalculation: "Posting Date",
    lineNarration: "",
    freight: "",
  });
  // Delivery receipt popup state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptDate, setReceiptDate] = useState(order?.Posting_Date || "");
  const [receiptShipments, setReceiptShipments] = useState<PurchaseShipment[]>(
    [],
  );
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  useEffect(() => {
    if (order?.Posting_Date) {
      setReceiptDate(order.Posting_Date);
    }
  }, [order]);

  const deletableLineNos = lines
    .map((l) => l.Line_No)
    .filter((lineNo): lineNo is number => typeof lineNo === "number");
  const allLinesSelected =
    deletableLineNos.length > 0 &&
    selectedDeleteLineNos.length === deletableLineNos.length;
  const someLinesSelected =
    selectedDeleteLineNos.length > 0 &&
    selectedDeleteLineNos.length < deletableLineNos.length;

  const loadOrder = useCallback(() => {
    if (!orderNo) return;
    setIsLoading(true);
    setError(null);
    Promise.all([getPurchaseOrderByNo(orderNo), getPurchaseOrderLines(orderNo)])
      .then(async ([header, lineItems]) => {
        setOrder(header || null);
        const linesData = lineItems || [];
        setLines(linesData);
        if (header?.Location_Code && linesData.length > 0) {
          const itemNos = [
            ...new Set(linesData.map((l) => String(l.No || ""))),
          ].filter((n) => n.trim() !== "");
          const today = new Date().toISOString().split("T")[0];
          try {
            const stock = await getItemStock(
              itemNos,
              header.Location_Code,
              today,
            );
            setLineStockMap(stock);
          } catch {
            setLineStockMap({});
          }
        } else {
          setLineStockMap({});
        }
      })
      .catch((err) => {
        setError(err?.message || "Failed to load order");
      })
      .finally(() => setIsLoading(false));
  }, [orderNo]);

  useEffect(() => {
    if (!orderNo) {
      setError("No order number provided");
      setIsLoading(false);
      return;
    }
    loadOrder();
  }, [orderNo, loadOrder]);

  const handleEdit = () => {
    openTab("purchase-order-edit", {
      title: `Edit Order ${orderNo}`,
      context: { orderNo, onUpdated: refetch },
      autoCloseOnSuccess: false,
    });
  };

  const handleSendForApproval = async () => {
    if (!orderNo) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      await sendApprovalRequest(orderNo);
      refetch?.();
      loadOrder();
      toast.success("Sent for approval.");
    } catch (err) {
      setActionError((err as ApiError).message ?? "Send for approval failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelApproval = async () => {
    if (!orderNo) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      await cancelApprovalRequest(orderNo);
      refetch?.();
      loadOrder();
      toast.success("Approval cancelled.");
    } catch (err) {
      setActionError((err as ApiError).message ?? "Cancel approval failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!orderNo) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      await reopenPurchaseOrder(orderNo);
      refetch?.();
      loadOrder();
      toast.success("Order reopened.");
    } catch (err) {
      setActionError((err as ApiError).message ?? "Reopen failed.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setDeleteMode("order");
    setSelectedDeleteLineNos([]);
    setIsDeleteDialogOpen(true);
  };

  const toggleDeleteLineSelection = (lineNo: number, checked: boolean) => {
    setSelectedDeleteLineNos((prev) =>
      checked ? [...prev, lineNo] : prev.filter((n) => n !== lineNo),
    );
  };

  const toggleSelectAllDeleteLines = (checked: boolean) => {
    setSelectedDeleteLineNos(checked ? [...deletableLineNos] : []);
  };

  const handleDeleteConfirm = async () => {
    if (!orderNo) return;
    setIsDeleteLoading(true);
    try {
      if (deleteMode === "lines") {
        const toDelete = selectedDeleteLineNos;
        if (toDelete.length === 0) {
          toast.error("Select at least one line item to delete.");
          return;
        }
        for (const lineNo of toDelete) {
          await deletePurchaseOrderLine(orderNo, lineNo);
        }
        toast.success(`Deleted ${toDelete.length} line item(s).`);
        setIsDeleteDialogOpen(false);
        refetch?.();
        loadOrder();
        return;
      }

      const headerLines = lines
        .map((l) => l.Line_No)
        .filter((lineNo): lineNo is number => typeof lineNo === "number");
      for (const lineNo of headerLines) {
        await deletePurchaseOrderLine(orderNo, lineNo);
      }
      await deletePurchaseOrderHeader(orderNo);
      toast.success("Order deleted successfully.");
      setIsDeleteDialogOpen(false);
      refetch?.();
      closeTab();
    } catch (err) {
      setActionError((err as ApiError).message ?? "Delete failed.");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleOpenPostDialog = () => {
    setPostOption(null);
    setPostDetails((prev) => ({
      ...prev,
      postingDate: order?.Posting_Date || "",
    }));
    setIsPostDialogOpen(true);
  };

  const handleOpenReceipt = () => {
    setReceiptDate(order?.Posting_Date || "");
    setReceiptShipments([]);
    setIsReceiptOpen(true);
  };

  const loadReceipt = async () => {
    if (!order?.No) return;
    if (!receiptDate) {
      toast.error("Please choose a posting date.");
      return;
    }
    setIsReceiptLoading(true);
    try {
      const results = await getPurchaseShipmentsByOrder(order.No, receiptDate);
      setReceiptShipments(results);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Failed to fetch receipts.");
    } finally {
      setIsReceiptLoading(false);
    }
  };

  const handlePostOptionContinue = () => {
    if (!postOption) {
      toast.error("Please select a post option.");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    setPostDetails({
      postingDate: order?.Posting_Date || today,
      documentDate: order?.Document_Date || today,
      vehicleNo: "",
      vendorInvoiceNo: "",
      dueDateCalculation: "Posting Date",
      lineNarration: "",
      freight: "0",
    });
    setIsPostDialogOpen(false);
    setIsPostDetailsOpen(true);
  };

  const isReceiveOption =
    postOption === "receive" || postOption === "receive-invoice";
  const isInvoiceOption =
    postOption === "invoice" || postOption === "receive-invoice";

  const handlePostDetailsSubmit = async () => {
    if (!orderNo || !postOption) return;

    if (!postDetails.postingDate) {
      toast.error("Posting Date is required.");
      return;
    }
    if (!postDetails.documentDate) {
      toast.error("Document Date is required.");
      return;
    }

    setIsPostLoading(true);
    try {
      // Build PATCH payload based on post option
      const patchPayload: Record<string, unknown> = {
        Posting_Date: postDetails.postingDate,
        Document_Date: postDetails.documentDate,
        Vehicle_No: postDetails.vehicleNo || "",
        Vendor_Invoice_No: postDetails.vendorInvoiceNo || "",
      };

      // Invoice-specific fields
      if (isInvoiceOption) {
        patchPayload.Due_Date_calculation = postDetails.dueDateCalculation || "Posting Date";
        patchPayload.Line_Narration1 = postDetails.lineNarration || "";
        patchPayload.Freight = postDetails.freight || "0";
      }

      await patchPurchaseOrderHeader(orderNo, patchPayload);

      const optionMap: Record<
        NonNullable<typeof postOption>,
        "1" | "2" | "3"
      > = {
        receive: "1",
        invoice: "2",
        "receive-invoice": "3",
      };
      await postPurchaseOrder(orderNo, optionMap[postOption]);

      toast.success("Order posted successfully.");
      setIsPostDetailsOpen(false);
      refetch?.();
      loadOrder();
    } catch (err) {
      setActionError((err as ApiError).message ?? "Post failed.");
    } finally {
      setIsPostLoading(false);
    }
  };

  const fetchTrackingMap = useCallback(async () => {
    const itemLines = lines.filter(
      (l) => l.Type === "Item" && l.No && String(l.No).trim() !== "",
    );
    const itemNos = [...new Set(itemLines.map((l) => String(l.No!)))];
    if (itemNos.length === 0) {
      setItemTrackingMap({});
      return;
    }
    setIsLoadingTrackingMap(true);
    setItemTrackingMap({});
    try {
      const items = await getItemsByNos(itemNos);
      const map: Record<string, string> = {};
      items.forEach((item) => {
        const code = item.Item_Tracking_Code?.trim();
        if (code) map[item.No.trim().toLowerCase()] = code;
      });
      setItemTrackingMap(map);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Failed to load item tracking.");
    } finally {
      setIsLoadingTrackingMap(false);
    }
  }, [lines]);

  useEffect(() => {
    fetchTrackingMap();
  }, [fetchTrackingMap]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
        <p className="text-muted-foreground mt-2 text-sm">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive text-sm">{error || "Order not found"}</p>
      </div>
    );
  }

  const isReleased = order.Status === "Released";
  const isOpen = order.Status === "Open";
  const isPendingApproval = order.Status === "Pending Approval";

  return (
    <>
      <RequestFailedDialog
        open={!!actionError}
        message={actionError}
        onOpenChange={(open) => !open && setActionError(null)}
      />
      <div className="flex flex-col gap-6 px-6 py-4">
        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!isPendingApproval && !isReleased && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                disabled={isReleased}
                className="h-8"
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleOpenDeleteDialog}
                disabled={isActionLoading}
                className="h-8"
              >
                Delete
              </Button>
            </>
          )}
          {isOpen && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSendForApproval}
              disabled={isActionLoading}
              className="h-8"
            >
              {isActionLoading ? "..." : "Send For Approval"}
            </Button>
          )}
          {isPendingApproval && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCancelApproval}
              disabled={isActionLoading}
              className="h-8"
            >
              {isActionLoading ? "..." : "Cancel Approval"}
            </Button>
          )}
          {isReleased && (
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenReceipt}
              disabled={isActionLoading}
              className="h-8"
            >
              Purchase Receipts
            </Button>
          )}
          {isReleased && (
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenPostDialog}
              disabled={isActionLoading}
              className="h-8"
            >
              Post
            </Button>
          )}
          {isReleased && (
            <Button
              variant="default"
              size="sm"
              onClick={handleReopen}
              disabled={isActionLoading}
              className="h-8"
            >
              {isActionLoading ? "..." : "Reopen"}
            </Button>
          )}
        </div>

        {/* Header summary */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="mb-4 text-sm font-semibold">Order Summary</div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground block text-xs">
                Order No
              </span>
              <span className="font-medium">{order.No}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Vendor
              </span>
              <span className="font-medium">
                {order.Buy_from_Vendor_Name || order.Buy_from_Vendor_No}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Vendor No
              </span>
              <span className="font-medium">{order.Buy_from_Vendor_No}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Order Date
              </span>
              <span className="font-medium">
                {formatDate(order.Order_Date)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Posting Date
              </span>
              <span className="font-medium">
                {formatDate(order.Posting_Date)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Document Date
              </span>
              <span className="font-medium">
                {formatDate(order.Document_Date)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Vendor Invoice No
              </span>
              <span className="font-medium">
                {order.Vendor_Invoice_No || "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">
                Status
              </span>
              <span className="font-medium">{order.Status || "-"}</span>
            </div>
            {order.Invoice_Type && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Invoice Type
                </span>
                <span className="font-medium">{order.Invoice_Type}</span>
              </div>
            )}
            {order.PO_Type && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  PO Type
                </span>
                <span className="font-medium">{order.PO_Type}</span>
              </div>
            )}
            {order.Service_Type && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Service Type
                </span>
                <span className="font-medium">{order.Service_Type}</span>
              </div>
            )}
            {order.Order_Address_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Order Address Code
                </span>
                <span className="font-medium">{order.Order_Address_Code}</span>
              </div>
            )}
            {order.Vendor_GST_Reg_No && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Vendor GST
                </span>
                <span className="font-medium">{order.Vendor_GST_Reg_No}</span>
              </div>
            )}
            {order.P_A_N_No && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Vendor PAN
                </span>
                <span className="font-medium">{order.P_A_N_No}</span>
              </div>
            )}
            {order.Location_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Location
                </span>
                <span className="font-medium">{order.Location_Code}</span>
              </div>
            )}
            {order.Shortcut_Dimension_1_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">LOB</span>
                <span className="font-medium">
                  {order.Shortcut_Dimension_1_Code}
                </span>
              </div>
            )}
            {order.Shortcut_Dimension_2_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Branch
                </span>
                <span className="font-medium">
                  {order.Shortcut_Dimension_2_Code}
                </span>
              </div>
            )}
            {order.Shortcut_Dimension_3_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">LOC</span>
                <span className="font-medium">
                  {order.Shortcut_Dimension_3_Code}
                </span>
              </div>
            )}
            {order.Brokerage_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Broker
                </span>
                <span className="font-medium">{order.Brokerage_Code}</span>
              </div>
            )}
            {order.Brokerage_Rate != null && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Brokerage Rate
                </span>
                <span className="font-medium">{order.Brokerage_Rate}</span>
              </div>
            )}
            {order.Rate_Basis && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Rate Basis
                </span>
                <span className="font-medium">{order.Rate_Basis}</span>
              </div>
            )}
            {order.Terms_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Term Code
                </span>
                <span className="font-medium">{order.Terms_Code}</span>
              </div>
            )}
            {order.Payment_Terms_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Payment Term
                </span>
                <span className="font-medium">{order.Payment_Terms_Code}</span>
              </div>
            )}
            {order.Due_Date_calculation && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Due Date Calc
                </span>
                <span className="font-medium">
                  {order.Due_Date_calculation}
                </span>
              </div>
            )}
            {order.Creditors_Type && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Creditor Type
                </span>
                <span className="font-medium">{order.Creditors_Type}</span>
              </div>
            )}
            {order.QCType && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  QC Type
                </span>
                <span className="font-medium">{order.QCType}</span>
              </div>
            )}
            {order.Vehicle_No && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Vehicle No
                </span>
                <span className="font-medium">{order.Vehicle_No}</span>
              </div>
            )}
            {order.Due_Date && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Due Date
                </span>
                <span className="font-medium">
                  {formatDate(order.Due_Date)}
                </span>
              </div>
            )}
            {order.Purchaser_Code && (
              <div>
                <span className="text-muted-foreground block text-xs">
                  Purchaser
                </span>
                <span className="font-medium">{order.Purchaser_Code}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line items table */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Line Items</span>
            {isLoadingTrackingMap ? (
              <span className="text-muted-foreground inline-flex items-center text-xs">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Checking tracking...
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                Tracked items are highlighted
              </span>
            )}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-xs">Line</TableHead>
                  <TableHead className="w-24 text-xs">Type</TableHead>
                  <TableHead className="w-24 text-xs">No</TableHead>
                  <TableHead className="min-w-[180px] text-xs">
                    Description
                  </TableHead>
                  <TableHead className="w-20 text-xs">UOM</TableHead>
                  <TableHead className="w-24 text-right text-xs">
                    Quantity
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs">
                    Qty to Receive
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs">
                    Qty Received
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs">
                    Qty to Invoice
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs">
                    Qty Invoiced
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs">
                    Unit Price
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs">
                    Discount
                  </TableHead>
                  <TableHead className="w-24 text-right text-xs">
                    Line Amount
                  </TableHead>
                  <TableHead className="w-24 text-xs">GST Group</TableHead>
                  <TableHead className="w-28 text-xs">HSN/SAC</TableHead>
                  <TableHead className="w-20 text-xs">Exempted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={16}
                      className="text-muted-foreground py-8 text-center text-sm"
                    >
                      No line items
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => {
                    const itemNoKey = line.No
                      ? String(line.No).trim().toLowerCase()
                      : "";
                    const hasTracking = !!itemTrackingMap[itemNoKey];
                    return (
                      <TableRow
                        key={line.Line_No}
                        className={cn(
                          "hover:bg-muted/50 cursor-pointer",
                          hasTracking && "text-red-600",
                        )}
                        onClick={() => setSelectedLine(line)}
                      >
                        <TableCell className="text-xs">
                          {line.Line_No}
                        </TableCell>
                        <TableCell className="text-xs">
                          {line.Type || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {line.No || "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">
                          {line.Description || line.Description_2 || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {line.Unit_of_Measure_Code ||
                            line.Unit_of_Measure ||
                            "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {line.Quantity != null ? line.Quantity : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {line.Qty_to_Receive != null ? line.Qty_to_Receive : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {line.Quantity_Received != null
                            ? line.Quantity_Received
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {line.Qty_to_Invoice != null
                            ? line.Qty_to_Invoice
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {line.Quantity_Invoiced != null
                            ? line.Quantity_Invoiced
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatAmount(line.Direct_Unit_Cost)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatAmount(line.Line_Discount_Amount)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatAmount(line.Line_Amount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {line.GST_Group_Code || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {line.HSN_SAC_Code || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {line.Exempted ? "Yes" : "No"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Total */}
        <div className="bg-muted/20 flex justify-end rounded-lg border px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="text-muted-foreground text-sm">Total Amount</span>
            <span className="text-lg font-semibold">
              {formatAmount(
                lines.reduce((sum, l) => sum + (l.Line_Amount || 0), 0),
              )}
            </span>
          </div>
        </div>

        <PurchaseOrderLineEditDialog
          open={!!selectedLine}
          onOpenChange={(open) => !open && setSelectedLine(null)}
          line={selectedLine}
          orderNo={order?.No ?? ""}
          hasTracking={
            !!(
              selectedLine?.No &&
              itemTrackingMap[String(selectedLine.No).trim().toLowerCase()]
            )
          }
          onSave={() => {
            loadOrder();
            setSelectedLine(null);
          }}
          onAssignTracking={() => setSelectedTrackingLine(selectedLine)}
        />

        <PurchaseItemTrackingDialog
          open={!!selectedTrackingLine}
          onOpenChange={(open) => !open && setSelectedTrackingLine(null)}
          onSave={() => {
            setSelectedTrackingLine(null);
            loadOrder();
          }}
          orderNo={order?.No ?? ""}
          locationCode={order?.Location_Code ?? ""}
          line={selectedTrackingLine}
        />

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Delete Purchase Order</DialogTitle>
              <DialogDescription>
                Choose whether to delete the full order or only specific line
                items.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="delete-mode"
                    checked={deleteMode === "order"}
                    onChange={() => setDeleteMode("order")}
                  />
                  <span>Delete whole order</span>
                </Label>
                <Label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="delete-mode"
                    checked={deleteMode === "lines"}
                    onChange={() => setDeleteMode("lines")}
                  />
                  <span>Delete individual line items</span>
                </Label>
              </div>

              {deleteMode === "lines" && (
                <div className="space-y-3 rounded-md border p-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={
                        allLinesSelected
                          ? true
                          : someLinesSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        toggleSelectAllDeleteLines(checked === true)
                      }
                    />
                    <span>Select all</span>
                  </Label>
                  <div className="max-h-[252px] space-y-2 overflow-y-auto pr-1">
                    {lines.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No lines available.
                      </p>
                    ) : (
                      lines.map((line) => (
                        <Label
                          key={line.Line_No}
                          className="flex items-center gap-2 text-sm font-normal"
                        >
                          <Checkbox
                            checked={selectedDeleteLineNos.includes(
                              line.Line_No,
                            )}
                            onCheckedChange={(checked) =>
                              toggleDeleteLineSelection(
                                line.Line_No,
                                checked === true,
                              )
                            }
                          />
                          <span>
                            {line.Description ||
                              line.Description_2 ||
                              line.No ||
                              "-"}{" "}
                            <span className="text-muted-foreground">
                              (Qty: {line.Quantity ?? 0}, UOM:{" "}
                              {line.Unit_of_Measure_Code ||
                                line.Unit_of_Measure ||
                                "-"}
                              )
                            </span>
                          </span>
                        </Label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleteLoading}
              >
                {isDeleteLoading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Post Purchase Order</DialogTitle>
              <DialogDescription>
                Choose how you want to post this released order.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
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

        <Dialog open={isPostDetailsOpen} onOpenChange={setIsPostDetailsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Post Details</DialogTitle>
              <DialogDescription>
                Fill in the posting details before confirming.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Always visible */}
              <div className="space-y-1">
                <Label>Posting Date *</Label>
                <input
                  type="date"
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={postDetails.postingDate}
                  onChange={(e) =>
                    setPostDetails((prev) => ({
                      ...prev,
                      postingDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Document Date *</Label>
                <input
                  type="date"
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={postDetails.documentDate}
                  onChange={(e) =>
                    setPostDetails((prev) => ({
                      ...prev,
                      documentDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Vehicle No</Label>
                <input
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={postDetails.vehicleNo}
                  onChange={(e) =>
                    setPostDetails((prev) => ({
                      ...prev,
                      vehicleNo: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Vendor Invoice No</Label>
                <input
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={postDetails.vendorInvoiceNo}
                  onChange={(e) =>
                    setPostDetails((prev) => ({
                      ...prev,
                      vendorInvoiceNo: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Invoice-only fields */}
              {isInvoiceOption && (
                <>
                  <div className="space-y-1">
                    <Label>Due Date Calculation</Label>
                    <select
                      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                      value={postDetails.dueDateCalculation}
                      onChange={(e) =>
                        setPostDetails((prev) => ({
                          ...prev,
                          dueDateCalculation: e.target.value,
                        }))
                      }
                    >
                      <option value="Posting Date">Posting Date</option>
                      <option value="Document Date">Document Date</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label>Freight</Label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                      value={postDetails.freight}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*\.?\d*$/.test(val)) {
                          setPostDetails((prev) => ({ ...prev, freight: val }));
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label>Line Narration</Label>
                    <input
                      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                      value={postDetails.lineNarration}
                      onChange={(e) =>
                        setPostDetails((prev) => ({
                          ...prev,
                          lineNarration: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}

            </div>

            {actionError && (
              <p className="text-destructive mt-1 text-sm">{actionError}</p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPostDetailsOpen(false)}
                disabled={isPostLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePostDetailsSubmit}
                disabled={isPostLoading}
              >
                {isPostLoading ? "Posting..." : "Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Purchase receipt popup */}
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Purchase Receipts</DialogTitle>
              <DialogDescription>
                Select posting date and load receipts for this order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Posting Date</Label>
                <input
                  type="date"
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </div>
              <Button
                onClick={loadReceipt}
                disabled={isReceiptLoading || !receiptDate}
              >
                {isReceiptLoading ? "Loading..." : "Load"}
              </Button>
              {receiptShipments.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">No</TableHead>
                        <TableHead className="text-xs">Posting Date</TableHead>
                        <TableHead className="text-xs">LR/RR No</TableHead>
                        <TableHead className="text-xs">LR/RR Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptShipments.map((s) => (
                        <TableRow key={s.No}>
                          <TableCell className="text-xs">{s.No}</TableCell>
                          <TableCell className="text-xs">
                            {formatDate(s.Posting_Date)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {s.LR_RR_No || ""}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatDate(s.LR_RR_Date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
