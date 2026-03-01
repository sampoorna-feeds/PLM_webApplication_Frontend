"use client";

/**
 * Sales Order Detail Form
 * Read-only view of a sales order with header and line items.
 * Toolbar: Edit, Send For Approval / Cancel Approval / Reopen.
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
  getSalesOrderByNo,
  getSalesOrderLines,
  sendApprovalRequest,
  cancelApprovalRequest,
  reopenSalesOrder,
  deleteSalesOrderLine,
  deleteSalesOrderHeader,
  getTransporters,
  searchTransporters,
  getTransportersPage,
  searchTransportersByField,
  patchSalesOrderHeader,
  postSalesOrder,
  type SalesOrder,
  type SalesLine,
  type Transporter,
} from "@/lib/api/services/sales-orders.service";
import { getItemsByNos, getItemStock } from "@/lib/api/services/item.service";
import { validatePhone } from "@/lib/validations/shipto.validation";
import { SearchableSelect } from "@/components/forms/shared/searchable-select";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { SalesItemTrackingDialog } from "@/components/forms/sales/sales-item-tracking-dialog";
import { SalesOrderLineDialog } from "@/components/forms/sales/sales-order-line-dialog";
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

interface SalesOrderDetailFormProps {
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

export function SalesOrderDetailForm({
  tabId,
  context,
}: SalesOrderDetailFormProps) {
  const { closeTab } = useFormStack(tabId);
  const { openTab } = useFormStackContext();
  const orderNo = context?.orderNo as string | undefined;
  const refetch = context?.refetch as (() => void) | undefined;

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<SalesLine[]>([]);
  // item -> available stock
  const [lineStockMap, setLineStockMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isLoadingTrackingMap, setIsLoadingTrackingMap] = useState(false);
  /** Item No -> Item_Tracking_Code (only set when item has tracking) */
  const [itemTrackingMap, setItemTrackingMap] = useState<Record<string, string>>({});
  /** Selected line for line-card dialog */
  const [selectedLine, setSelectedLine] = useState<SalesLine | null>(null);
  /** Selected sales line for item tracking dialog (Product Tracking sheet) */
  const [selectedTrackingLine, setSelectedTrackingLine] = useState<SalesLine | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"order" | "lines">("order");
  const [selectedDeleteLineNos, setSelectedDeleteLineNos] = useState<number[]>([]);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [postOption, setPostOption] = useState<"ship" | "invoice" | "ship-invoice" | null>(null);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [isPostDetailsOpen, setIsPostDetailsOpen] = useState(false);
  const [postDetails, setPostDetails] = useState({
    transporterCode: "",
    transporterName: "",
    vehicleNumber: "",
    driverPhone: "",
    lrRrNumber: "",
    lrRrDate: "",
    externalDocumentNo: "",
    distanceKm: "",
    grossWeight: "",
    tareWeight: "",
  });
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
    Promise.all([
      getSalesOrderByNo(orderNo),
      getSalesOrderLines(orderNo),
    ])
      .then(async ([header, lineItems]) => {
        setOrder(header || null);
        const linesData = lineItems || [];
        setLines(linesData);
        // fetch stock if we have location and lines
        if (header?.Location_Code && linesData.length > 0) {
          const itemNos = [...new Set(linesData.map((l) => String(l.No || "")))].filter(
            (n) => n.trim() !== "",
          );
          const today = new Date().toISOString().split("T")[0];
          try {
            const stock = await getItemStock(itemNos, header.Location_Code, today);
            setLineStockMap(stock);
          } catch {
            // ignore failure; stock will be empty
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
    openTab("sales-order-edit", {
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
      await reopenSalesOrder(orderNo);
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
          await deleteSalesOrderLine(orderNo, lineNo);
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
        await deleteSalesOrderLine(orderNo, lineNo);
      }
      await deleteSalesOrderHeader(orderNo);
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
    setIsPostDialogOpen(true);
  };

  const handlePostOptionContinue = () => {
    if (!postOption) {
      toast.error("Please select a post option.");
      return;
    }
    setPostDetails({
      transporterCode: "",
      transporterName: "",
      vehicleNumber: "",
      driverPhone: "",
      lrRrNumber: "",
      lrRrDate: "",
      externalDocumentNo: "",
      distanceKm: "",
      grossWeight: "",
      tareWeight: "",
    });
    setIsPostDialogOpen(false);
    setIsPostDetailsOpen(true);
  };

  const isShipOption = postOption === "ship" || postOption === "ship-invoice";
  const netWeight =
    (parseFloat(postDetails.grossWeight) || 0) -
    (parseFloat(postDetails.tareWeight) || 0);

  const handlePostDetailsSubmit = async () => {
    if (!orderNo || !postOption) return;
    if (isShipOption && !postDetails.transporterName.trim()) {
      toast.error("Transporter Name is mandatory for Ship and Ship & Invoice.");
      return;
    }

    if (isShipOption) {
      const phoneError = validatePhone(postDetails.driverPhone || "");
      if (!postDetails.driverPhone.trim()) {
        toast.error("Driver phone number is required for shipping.");
        return;
      }
      if (phoneError) {
        toast.error(phoneError);
        return;
      }
    }

    setIsPostLoading(true);
    try {
      const patchPayload: Record<string, unknown> = {
        Transporter_Code: postDetails.transporterCode || "",
        Transporter_Name: postDetails.transporterName || "",
        Vehicle_Number: postDetails.vehicleNumber || "",
        Driver_Mobile_No: postDetails.driverPhone || "",
        LR_RR_Number: postDetails.lrRrNumber || "",
        LR_RR_Date: postDetails.lrRrDate || "",
        External_Document_No: postDetails.externalDocumentNo || "",
        Distance_km: postDetails.distanceKm ? Number(postDetails.distanceKm) : 0,
      };

      if (isShipOption) {
        patchPayload.Gross_Weight = postDetails.grossWeight
          ? Number(postDetails.grossWeight)
          : 0;
        patchPayload.Tier_Weight = postDetails.tareWeight
          ? Number(postDetails.tareWeight)
          : 0;
        patchPayload.Net_Weight = netWeight;
      }

      await patchSalesOrderHeader(orderNo, patchPayload);

      const optionMap: Record<NonNullable<typeof postOption>, "1" | "2" | "3"> = {
        ship: "1",
        invoice: "2",
        "ship-invoice": "3",
      };
      await postSalesOrder(orderNo, optionMap[postOption]);

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
        {/* Action bar: Edit, Send/Cancel/Reopen */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* hide edit/delete when pending approval or already released/approved */}
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
              // no action yet; placeholder
              onClick={() => {}}
              disabled={isActionLoading}
              className="h-8"
            >
              Delivery Challan
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

        {/* Header summary - same fields as review step */}
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
            <span className="text-muted-foreground block text-xs">Customer</span>
            <span className="font-medium">
              {order.Sell_to_Customer_Name || order.Sell_to_Customer_No}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">
              Customer No
            </span>
            <span className="font-medium">{order.Sell_to_Customer_No}</span>
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
              External Doc No
            </span>
            <span className="font-medium">
              {order.External_Document_No || "-"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Status</span>
            <span className="font-medium">{order.Status || "-"}</span>
          </div>
          {(order.Ship_to_Code || order.Ship_to_Name) && (
            <div>
              <span className="text-muted-foreground block text-xs">
                Ship To
              </span>
              <span className="font-medium">
                {order.Ship_to_Name || order.Ship_to_Code}
              </span>
            </div>
          )}
          {order.Invoice_Type && (
            <div>
              <span className="text-muted-foreground block text-xs">
                Invoice Type
              </span>
              <span className="font-medium">{order.Invoice_Type}</span>
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
          {order.Salesperson_Code && (
            <div>
              <span className="text-muted-foreground block text-xs">
                Salesperson
              </span>
              <span className="font-medium">{order.Salesperson_Code}</span>
            </div>
          )}
        </div>
      </div>

      {/* Line items table - all details as in review */}
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
                <TableHead className="min-w-[180px] text-xs">Description</TableHead>
                <TableHead className="w-20 text-xs">UOM</TableHead>
                <TableHead className="w-24 text-xs">Avail Stock</TableHead>
                <TableHead className="w-24 text-right text-xs">Quantity</TableHead>
                <TableHead className="w-24 text-right text-xs">Qty to Ship</TableHead>
                <TableHead className="w-24 text-right text-xs">Qty Shipped</TableHead>
                <TableHead className="w-24 text-right text-xs">Qty to Invoice</TableHead>
                <TableHead className="w-24 text-right text-xs">Qty Invoiced</TableHead>
                <TableHead className="w-24 text-right text-xs">Unit Price</TableHead>
                <TableHead className="w-24 text-right text-xs">Discount</TableHead>
                <TableHead className="w-24 text-right text-xs">Line Amount</TableHead>
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
                  const itemNoKey = line.No ? String(line.No).trim().toLowerCase() : "";
                  const hasTracking = !!itemTrackingMap[itemNoKey];
                  return (
                  <TableRow
                    key={line.Line_No}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      hasTracking && "text-red-600",
                    )}
                    onClick={() => setSelectedLine(line)}
                  >
                    <TableCell className="text-xs">{line.Line_No}</TableCell>
                    <TableCell className="text-xs">{line.Type || "-"}</TableCell>
                    <TableCell className="text-xs">{line.No || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {line.Description || line.Description_2 || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {line.Unit_of_Measure_Code || line.Unit_of_Measure || "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {line.No ? lineStockMap[String(line.No).trim()] ?? "-" : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {line.Quantity != null ? line.Quantity : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {line.Qty_to_Ship != null ? line.Qty_to_Ship : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {line.Quantity_Shipped != null ? line.Quantity_Shipped : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {line.Qty_to_Invoice != null ? line.Qty_to_Invoice : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {line.Quantity_Invoiced != null ? line.Quantity_Invoiced : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatAmount(line.Unit_Price)}
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
                )})
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-end rounded-lg border bg-muted/20 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-muted-foreground text-sm">Total Amount</span>
          <span className="text-lg font-semibold">
            {formatAmount(order.Amt_to_Customer)}
          </span>
        </div>
      </div>

      <SalesOrderLineDialog
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

      <SalesItemTrackingDialog
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
            <DialogTitle>Delete Sales Order</DialogTitle>
            <DialogDescription>
              Choose whether to delete the full order or only specific line items.
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
                    checked={allLinesSelected ? true : someLinesSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) =>
                      toggleSelectAllDeleteLines(checked === true)
                    }
                  />
                  <span>Select all</span>
                </Label>
                <div className="max-h-[252px] space-y-2 overflow-y-auto pr-1">
                {lines.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No lines available.</p>
                ) : (
                  lines.map((line) => (
                    <Label
                      key={line.Line_No}
                      className="flex items-center gap-2 text-sm font-normal"
                    >
                      <Checkbox
                        checked={selectedDeleteLineNos.includes(line.Line_No)}
                        onCheckedChange={(checked) =>
                          toggleDeleteLineSelection(line.Line_No, checked === true)
                        }
                      />
                      <span>
                        {line.Description || line.Description_2 || line.No || "-"}
                        {" "}
                        <span className="text-muted-foreground">
                          (Qty: {line.Quantity ?? 0}, UOM: {line.Unit_of_Measure_Code || line.Unit_of_Measure || "-"})
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
            <DialogTitle>Post Sales Order</DialogTitle>
            <DialogDescription>
              Choose how you want to post this released order.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="post-mode"
                checked={postOption === "ship"}
                onChange={() => setPostOption("ship")}
              />
              <span>Ship</span>
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
                checked={postOption === "ship-invoice"}
                onChange={() => setPostOption("ship-invoice")}
              />
              <span>Ship & Invoice</span>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>
              Fill posting details before confirming post.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Transporter Code</Label>
              <SearchableSelect<Transporter>
                value={postDetails.transporterCode}
                onChange={(value, transporter) =>
                  setPostDetails((prev) => ({
                    ...prev,
                    transporterCode: value,
                    transporterName:
                      transporter?.Name && String(transporter.Name).trim() !== ""
                        ? String(transporter.Name)
                        : prev.transporterName,
                  }))
                }
                placeholder="Select (optional)"
                loadInitial={() => getTransporters(20)}
                searchItems={(q) => searchTransporters(q, 30, 0)}
                loadMore={(skip, search) => getTransportersPage(skip, search, 30)}
                getDisplayValue={(t) => `${t.No} - ${t.Name || ""}`}
                getItemValue={(t) => t.No}
                supportsDualSearch={true}
                searchByField={(q, field) => searchTransportersByField(q, field, 30, 0)}
              />
            </div>

            <div className="space-y-1">
              <Label>Transporter Name {isShipOption ? "*" : ""}</Label>
              <input
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={postDetails.transporterName}
                onChange={(e) =>
                  setPostDetails((prev) => ({ ...prev, transporterName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Vehicle Number</Label>
              <input
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={postDetails.vehicleNumber}
                onChange={(e) =>
                  setPostDetails((prev) => ({ ...prev, vehicleNumber: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Driver Phone Number {isShipOption ? "*" : ""}</Label>
              <input
                type="tel"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={postDetails.driverPhone}
                onChange={(e) =>
                  setPostDetails((prev) => ({ ...prev, driverPhone: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>LR/RR Number</Label>
              <input
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={postDetails.lrRrNumber}
                onChange={(e) =>
                  setPostDetails((prev) => ({ ...prev, lrRrNumber: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>LR/RR Date</Label>
              <input
                type="date"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={postDetails.lrRrDate}
                onChange={(e) =>
                  setPostDetails((prev) => ({ ...prev, lrRrDate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>External Document Number</Label>
              <input
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={postDetails.externalDocumentNo}
                onChange={(e) =>
                  setPostDetails((prev) => ({ ...prev, externalDocumentNo: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Distance (km)</Label>
              <input
                type="number"
                step="0.01"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={postDetails.distanceKm}
                onChange={(e) =>
                  setPostDetails((prev) => ({ ...prev, distanceKm: e.target.value }))
                }
              />
            </div>
          </div>

          {isShipOption && (
            <div className="mt-2 space-y-3 border-t pt-3">
              <div className="text-sm font-medium">Weight Detail</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Gross Weight</Label>
                  <input
                    type="number"
                    step="0.01"
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={postDetails.grossWeight}
                    onChange={(e) =>
                      setPostDetails((prev) => ({ ...prev, grossWeight: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tier Weight</Label>
                  <input
                    type="number"
                    step="0.01"
                    className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={postDetails.tareWeight}
                    onChange={(e) =>
                      setPostDetails((prev) => ({ ...prev, tareWeight: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Net Weight</Label>
                  <input
                    className="border-input h-9 w-full rounded-md border bg-muted px-3 text-sm"
                    value={Number.isFinite(netWeight) ? netWeight.toString() : "0"}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}

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
    </div>
    </>
  );
}
