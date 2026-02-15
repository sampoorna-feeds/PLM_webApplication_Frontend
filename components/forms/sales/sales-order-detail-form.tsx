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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  getSalesOrderByNo,
  getSalesOrderLines,
  sendApprovalRequest,
  cancelApprovalRequest,
  reopenSalesOrder,
  type SalesOrder,
  type SalesLine,
} from "@/lib/api/services/sales-orders.service";
import { getItemsByNos } from "@/lib/api/services/item.service";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";
import { SalesItemTrackingDialog } from "@/components/forms/sales/sales-item-tracking-dialog";
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
  useFormStack(tabId);
  const { openTab } = useFormStackContext();
  const orderNo = context?.orderNo as string | undefined;
  const refetch = context?.refetch as (() => void) | undefined;

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<SalesLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isTrackingSheetOpen, setIsTrackingSheetOpen] = useState(false);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  /** Item No -> Item_Tracking_Code (only set when item has tracking) */
  const [itemTrackingMap, setItemTrackingMap] = useState<Record<string, string>>({});
  /** Selected sales line for item tracking dialog (Product Tracking sheet) */
  const [selectedTrackingLine, setSelectedTrackingLine] = useState<SalesLine | null>(null);

  const loadOrder = useCallback(() => {
    if (!orderNo) return;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getSalesOrderByNo(orderNo),
      getSalesOrderLines(orderNo),
    ])
      .then(([header, lineItems]) => {
        setOrder(header || null);
        setLines(lineItems || []);
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

  const handleProductTracking = useCallback(async () => {
    const itemLines = lines.filter(
      (l) => l.Type === "Item" && l.No && String(l.No).trim() !== "",
    );
    const itemNos = [...new Set(itemLines.map((l) => String(l.No!)))];
    if (itemNos.length === 0) {
      toast.info("No items in this order to check for tracking.");
      return;
    }
    setIsLoadingTracking(true);
    setItemTrackingMap({});
    try {
      const items = await getItemsByNos(itemNos);
      const map: Record<string, string> = {};
      items.forEach((item) => {
        const code = item.Item_Tracking_Code?.trim();
        if (code) map[item.No] = code;
      });
      setItemTrackingMap(map);
      setIsTrackingSheetOpen(true);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Failed to load item tracking.");
    } finally {
      setIsLoadingTracking(false);
    }
  }, [lines]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            disabled={isReleased}
            className="h-8"
          >
            Edit
          </Button>
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
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleProductTracking}
            disabled={isLoadingTracking || lines.length === 0}
          >
            {isLoadingTracking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Product Tracking
          </Button>
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
                <TableHead className="w-24 text-right text-xs">Quantity</TableHead>
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
                    colSpan={11}
                    className="text-muted-foreground py-8 text-center text-sm"
                  >
                    No line items
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.Line_No}>
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
                      {line.Quantity != null ? line.Quantity : "-"}
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
                ))
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

      {/* Product Tracking Sheet - highlights items with Item_Tracking_Code */}
      <Sheet open={isTrackingSheetOpen} onOpenChange={setIsTrackingSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-screen flex-col gap-0 overflow-y-auto p-0 md:w-[75vw] lg:w-[50vw]"
        >
          <SheetHeader className="bg-background sticky top-0 z-10 border-b px-6 py-4">
            <SheetTitle>Product Tracking</SheetTitle>
            <p className="text-muted-foreground text-sm font-normal">
              Items with a tracking code are highlighted.
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-x-auto px-6 py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-xs">Line</TableHead>
                  <TableHead className="w-24 text-xs">Type</TableHead>
                  <TableHead className="w-24 text-xs">No</TableHead>
                  <TableHead className="min-w-[180px] text-xs">Description</TableHead>
                  <TableHead className="w-24 text-xs">Tracking</TableHead>
                  <TableHead className="w-20 text-xs">UOM</TableHead>
                  <TableHead className="w-24 text-right text-xs">Quantity</TableHead>
                  <TableHead className="w-24 text-right text-xs">Unit Price</TableHead>
                  <TableHead className="w-24 text-right text-xs">Line Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const itemNo = line.No ? String(line.No) : "";
                  const hasTracking = !!itemTrackingMap[itemNo];
                  return (
                    <TableRow
                      key={line.Line_No}
                      className={cn(
                        hasTracking &&
                          "bg-primary/10 border-l-4 border-l-primary cursor-pointer hover:bg-primary/15",
                      )}
                      onClick={hasTracking ? () => setSelectedTrackingLine(line) : undefined}
                      role={hasTracking ? "button" : undefined}
                    >
                      <TableCell className="text-xs">{line.Line_No}</TableCell>
                      <TableCell className="text-xs">{line.Type || "-"}</TableCell>
                      <TableCell className="text-xs">{line.No || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {line.Description || line.Description_2 || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {hasTracking ? (
                          <span className="font-medium text-primary">
                            {itemTrackingMap[itemNo]}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {line.Unit_of_Measure_Code || line.Unit_of_Measure || "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {line.Quantity != null ? line.Quantity : "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatAmount(line.Unit_Price)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatAmount(line.Line_Amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>

      <SalesItemTrackingDialog
        open={!!selectedTrackingLine}
        onOpenChange={(open) => !open && setSelectedTrackingLine(null)}
        onSave={() => setSelectedTrackingLine(null)}
        orderNo={order?.No ?? ""}
        locationCode={order?.Location_Code ?? ""}
        line={selectedTrackingLine}
      />
    </div>
    </>
  );
}
