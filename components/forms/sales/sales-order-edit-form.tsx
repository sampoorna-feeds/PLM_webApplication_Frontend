"use client";

/**
 * Sales Order Edit Form
 * Single-page layout: top = address (ship-to), middle = line items list (add/edit), bottom = changes summary + Update.
 * Reopen is called only on Update and only if order status is not Open.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  getSalesOrderByNo,
  getSalesOrderLines,
  reopenSalesOrder,
  orderShiptocodeModify,
  deleteSalesOrderLine,
  addSalesLine,
  updateSalesLine,
  type SalesOrder,
  type SalesLine,
} from "@/lib/api/services/sales-orders.service";
import type { LineItem } from "./line-item-form";
import { ShipToSelect } from "./shipto-select";
import { LineItemsTable } from "./line-items-table";
import { toast } from "sonner";
import { RequestFailedDialog } from "@/components/ui/request-failed-dialog";

interface SalesOrderEditFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

const PERSIST_KEY = "_editPersisted";

function salesLineToLineItem(line: SalesLine, _orderNo: string): LineItem {
  const lineNo = line.Line_No ?? 0;
  const id = `line-${lineNo}`;
  return {
    id,
    lineNo: lineNo > 0 ? lineNo : undefined,
    type: (line.Type as "Item" | "G/L Account") || "Item",
    no: line.No ?? "",
    description: [line.Description, line.Description_2].filter(Boolean).join(" ") || "",
    uom: line.Unit_of_Measure_Code ?? line.Unit_of_Measure ?? "",
    quantity: line.Quantity ?? 0,
    mrp: line.MRP_Price,
    price: line.Unit_Price,
    unitPrice: line.Unit_Price ?? 0,
    totalMRP: line.Total_MRP ?? 0,
    discount: line.Line_Discount_Amount ?? line.Line_Discount_Percent ?? 0,
    amount: line.Line_Amount ?? line.Amt_to_Customer ?? 0,
    exempted: line.Exempted,
    gstGroupCode: line.GST_Group_Code,
    hsnSacCode: line.HSN_SAC_Code,
  };
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

export function SalesOrderEditForm({
  tabId,
  formData: initialFormData,
  context,
}: SalesOrderEditFormProps) {
  const { updateFormData } = useFormStack(tabId);
  const { openTab, closeTab, switchTab } = useFormStackContext();
  const orderNo = context?.orderNo as string | undefined;
  const onUpdated = context?.onUpdated as (() => void) | undefined;

  const [order, setOrder] = useState<SalesOrder | null>(() =>
    (initialFormData?.order as SalesOrder) ?? null,
  );
  const [isLoading, setIsLoading] = useState(() =>
    !initialFormData?.[PERSIST_KEY] || !initialFormData?.order,
  );
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRestoredRef = useRef(false);
  const lineItemTabIdRef = useRef<string | null>(null);

  const [shipToCode, setShipToCode] = useState(
    () =>
      (initialFormData?.shipToCode as string) ??
      (initialFormData?.order as SalesOrder)?.Ship_to_Code ??
      "",
  );
  const [shipToName, setShipToName] = useState(
    () =>
      (initialFormData?.shipToName as string) ??
      (initialFormData?.order as SalesOrder)?.Ship_to_Name ??
      "",
  );

  const [originalItems, setOriginalItems] = useState<LineItem[]>(
    () => (initialFormData?.originalItems as LineItem[]) ?? [],
  );
  const [orderItems, setOrderItems] = useState<LineItem[]>(
    () => (initialFormData?.orderItems as LineItem[]) ?? [],
  );
  const [itemsToDelete, setItemsToDelete] = useState<number[]>(
    () => (initialFormData?.itemsToDelete as number[]) ?? [],
  );
  const [itemsToUpdate, setItemsToUpdate] = useState<LineItem[]>(
    () => (initialFormData?.itemsToUpdate as LineItem[]) ?? [],
  );

  const originalShipToCode = order?.Ship_to_Code ?? "";

  const persistState = useCallback(
    (state: {
      order: SalesOrder | null;
      originalItems: LineItem[];
      orderItems: LineItem[];
      itemsToDelete: number[];
      itemsToUpdate: LineItem[];
      shipToCode: string;
      shipToName: string;
    }) => {
      if (!state.order || !orderNo) return;
      updateFormData({
        [PERSIST_KEY]: true,
        orderNo,
        order: state.order,
        originalItems: state.originalItems,
        orderItems: state.orderItems,
        itemsToDelete: state.itemsToDelete,
        itemsToUpdate: state.itemsToUpdate,
        shipToCode: state.shipToCode,
        shipToName: state.shipToName,
      });
    },
    [orderNo, updateFormData],
  );

  useEffect(() => {
    if (!orderNo) {
      setError("No order number provided");
      setIsLoading(false);
      return;
    }
    if (initialFormData?.[PERSIST_KEY] && initialFormData?.order) {
      if (!hasRestoredRef.current) {
        hasRestoredRef.current = true;
        setOrder(initialFormData.order as SalesOrder);
        setOriginalItems((initialFormData.originalItems as LineItem[]) ?? []);
        setOrderItems((initialFormData.orderItems as LineItem[]) ?? []);
        setItemsToDelete((initialFormData.itemsToDelete as number[]) ?? []);
        setItemsToUpdate((initialFormData.itemsToUpdate as LineItem[]) ?? []);
        setShipToCode((initialFormData.shipToCode as string) ?? "");
        setShipToName((initialFormData.shipToName as string) ?? "");
      }
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getSalesOrderByNo(orderNo),
      getSalesOrderLines(orderNo),
    ])
      .then(([header, lines]) => {
        if (cancelled) return;
        const ord = header || null;
        setOrder(ord);
        setShipToCode(ord?.Ship_to_Code ?? "");
        setShipToName(ord?.Ship_to_Name ?? "");
        const items = lines.map((l) => salesLineToLineItem(l, orderNo));
        setOriginalItems(items);
        setOrderItems([...items]);
        setItemsToDelete([]);
        setItemsToUpdate([]);
        if (ord) {
          persistState({
            order: ord,
            originalItems: items,
            orderItems: [...items],
            itemsToDelete: [],
            itemsToUpdate: [],
            shipToCode: ord.Ship_to_Code ?? "",
            shipToName: ord.Ship_to_Name ?? "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load order");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderNo, initialFormData?.[PERSIST_KEY], persistState]);

  const handleShipToChange = useCallback(
    (code: string, shipTo?: { Name?: string }) => {
      setShipToCode(code);
      setShipToName(shipTo?.Name ?? "");
      if (order) {
        persistState({
          order,
          originalItems,
          orderItems,
          itemsToDelete,
          itemsToUpdate,
          shipToCode: code,
          shipToName: shipTo?.Name ?? "",
        });
      }
    },
    [order, originalItems, orderItems, itemsToDelete, itemsToUpdate, persistState],
  );

  const handleAddLineItem = useCallback(() => {
    if (!order) return;
    const locationCode = order.Location_Code ?? "";
    persistState({
      order,
      originalItems,
      orderItems,
      itemsToDelete,
      itemsToUpdate,
      shipToCode,
      shipToName,
    });
    const tabIdNew = openTab("line-item", {
      title: "Add Line Item",
      formData: {
        customerNo: order.Sell_to_Customer_No,
        locationCode,
        customerPriceGroup: "",
      },
      context: {
        openedFromParent: true,
        onSave: (lineItem: LineItem) => {
          const newItem: LineItem = {
            ...lineItem,
            id: `new-${crypto.randomUUID()}`,
            lineNo: undefined,
          };
          const next = [...orderItems, newItem];
          persistState({
            order,
            originalItems,
            orderItems: next,
            itemsToDelete,
            itemsToUpdate,
            shipToCode,
            shipToName,
          });
          setOrderItems(next);
          const id = lineItemTabIdRef.current;
          if (id) {
            lineItemTabIdRef.current = null;
            setTimeout(() => {
              closeTab(id);
              switchTab(tabId);
            }, 0);
          }
        },
      },
      autoCloseOnSuccess: true,
    });
    lineItemTabIdRef.current = tabIdNew;
  }, [
    order,
    orderItems,
    originalItems,
    itemsToDelete,
    itemsToUpdate,
    shipToCode,
    shipToName,
    openTab,
    closeTab,
    switchTab,
    tabId,
    persistState,
  ]);

  const handleEditLineItem = useCallback(
    (lineItem: LineItem) => {
      if (!order) return;
      const locationCode = order.Location_Code ?? "";
      persistState({
        order,
        originalItems,
        orderItems,
        itemsToDelete,
        itemsToUpdate,
        shipToCode,
        shipToName,
      });
      const tabIdNew = openTab("line-item", {
        title: "Edit Line Item",
        formData: {
          lineItem,
          customerNo: order.Sell_to_Customer_No,
          locationCode,
          customerPriceGroup: "",
        },
        context: {
          openedFromParent: true,
          onSave: (updated: LineItem) => {
            const hadLineNo = lineItem.lineNo != null && lineItem.lineNo > 0;
            const merged = { ...updated, id: lineItem.id, lineNo: lineItem.lineNo };
            const next = orderItems.map((item) =>
              item.id === lineItem.id ? merged : item,
            );
            const nextUpdates =
              hadLineNo && lineItem.lineNo != null
                ? [...itemsToUpdate.filter((x) => x.lineNo !== lineItem.lineNo), merged]
                : itemsToUpdate;
            persistState({
              order,
              originalItems,
              orderItems: next,
              itemsToDelete,
              itemsToUpdate: nextUpdates,
              shipToCode,
              shipToName,
            });
            setOrderItems(next);
            setItemsToUpdate(nextUpdates);
            const id = lineItemTabIdRef.current;
            if (id) {
              lineItemTabIdRef.current = null;
              setTimeout(() => {
                closeTab(id);
                switchTab(tabId);
              }, 0);
            }
          },
        },
        autoCloseOnSuccess: true,
      });
      lineItemTabIdRef.current = tabIdNew;
    },
    [
      order,
      orderItems,
      originalItems,
      itemsToDelete,
      itemsToUpdate,
      shipToCode,
      shipToName,
      openTab,
      closeTab,
      switchTab,
      tabId,
      persistState,
    ],
  );

  const handleViewLineItem = useCallback(
    (item: LineItem) => {
      if (!order) return;
      const locationCode = order.Location_Code ?? "";
      openTab("line-item", {
        title: "View Line Item",
        formData: {
          lineItem: item,
          customerNo: order.Sell_to_Customer_No,
          locationCode,
          customerPriceGroup: "",
        },
        context: {
          openedFromParent: true,
          viewOnly: true,
          onEdit: () => handleEditLineItem(item),
        },
        autoCloseOnSuccess: false,
      });
    },
    [order, openTab, handleEditLineItem],
  );

  const handleRemoveLineItem = useCallback(
    (itemId: string) => {
      const item = orderItems.find((i) => i.id === itemId);
      const nextDelete =
        item?.lineNo != null && item.lineNo > 0
          ? [...itemsToDelete, item.lineNo]
          : itemsToDelete;
      const nextOrderItems = orderItems.filter((i) => i.id !== itemId);
      setItemsToDelete(nextDelete);
      setOrderItems(nextOrderItems);
      if (order) {
        persistState({
          order,
          originalItems,
          orderItems: nextOrderItems,
          itemsToDelete: nextDelete,
          itemsToUpdate,
          shipToCode,
          shipToName,
        });
      }
    },
    [
      order,
      orderItems,
      itemsToDelete,
      originalItems,
      itemsToUpdate,
      shipToCode,
      shipToName,
      persistState,
    ],
  );

  const handleUpdateLineItem = useCallback(
    (lineItem: LineItem) => {
      const nextOrderItems = orderItems.map((item) =>
        item.id === lineItem.id ? lineItem : item,
      );
      const nextUpdates =
        lineItem.lineNo != null && lineItem.lineNo > 0
          ? [...itemsToUpdate.filter((x) => x.lineNo !== lineItem.lineNo), lineItem]
          : itemsToUpdate;
      setOrderItems(nextOrderItems);
      setItemsToUpdate(nextUpdates);
      if (order) {
        persistState({
          order,
          originalItems,
          orderItems: nextOrderItems,
          itemsToDelete,
          itemsToUpdate: nextUpdates,
          shipToCode,
          shipToName,
        });
      }
    },
    [
      order,
      orderItems,
      itemsToDelete,
      itemsToUpdate,
      originalItems,
      shipToCode,
      shipToName,
      persistState,
    ],
  );

  const runSaveSequence = async () => {
    if (!orderNo || !order) return;
    const locationCode = order.Location_Code ?? "";
    const status = order.Status ?? "";

    if (status !== "Open") {
      await reopenSalesOrder(orderNo);
    }
    if (shipToCode !== originalShipToCode) {
      await orderShiptocodeModify(orderNo, shipToCode);
    }
    for (const lineNo of itemsToDelete) {
      await deleteSalesOrderLine(orderNo, lineNo);
    }
    const toAdd = orderItems.filter((i) => i.lineNo == null || i.lineNo <= 0);
    for (const item of toAdd) {
      await addSalesLine({
        Document_No: orderNo,
        Type: "Item",
        No: item.no,
        Location_Code: locationCode,
        Quantity: item.quantity,
        Unit_of_Measure_Code: item.uom ?? "",
      });
    }
    for (const item of itemsToUpdate) {
      if (item.lineNo == null || item.lineNo <= 0) continue;
      await updateSalesLine(orderNo, item.lineNo, {
        No: item.no,
        Description: item.description,
        Quantity: item.quantity,
        Unit_of_Measure_Code: item.uom ?? "",
      });
    }
  };

  const handleUpdate = async () => {
    if (!order) return;
    setIsSubmitting(true);
    setUpdateError(null);
    try {
      await runSaveSequence();
      toast.success("Order updated successfully.");
      onUpdated?.();
      closeTab(tabId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed.";
      setUpdateError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const shipToChanged = shipToCode !== originalShipToCode;
  const addCount = orderItems.filter((i) => i.lineNo == null || i.lineNo <= 0).length;
  const deleteCount = itemsToDelete.length;
  const updateCount = itemsToUpdate.length;
  const hasChanges =
    shipToChanged || addCount > 0 || deleteCount > 0 || updateCount > 0;

  return (
    <>
      <RequestFailedDialog
        open={!!updateError}
        message={updateError}
        onOpenChange={(open) => !open && setUpdateError(null)}
      />
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Top: Edit address (ship-to) */}
          <section className="mb-6">
            <h3 className="text-foreground mb-3 text-sm font-semibold">
              Edit address
            </h3>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground block text-xs">Order No</span>
                  <span className="font-medium">{order.No}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Customer</span>
                  <span className="font-medium">
                    {order.Sell_to_Customer_Name || order.Sell_to_Customer_No}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Order Date</span>
                  <span className="font-medium">{formatDate(order.Order_Date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Status</span>
                  <span className="font-medium">{order.Status ?? "-"}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground block text-xs font-medium">
                  Ship to
                </label>
                <ShipToSelect
                  customerNo={order.Sell_to_Customer_No}
                  value={shipToCode}
                  onChange={handleShipToChange}
                  placeholder="Select or add new"
                  tabId={tabId}
                />
              </div>
            </div>
          </section>

          {/* Middle: Line items list with add / edit */}
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-foreground text-sm font-semibold">Line items</h3>
              <Button onClick={handleAddLineItem} size="sm" className="h-8">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add item
              </Button>
            </div>
            {orderItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
                <p className="text-muted-foreground text-sm">No line items.</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Click &quot;Add item&quot; to add a line.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <LineItemsTable
                  lineItems={orderItems}
                  onEdit={handleEditLineItem}
                  onRemove={handleRemoveLineItem}
                  onUpdate={handleUpdateLineItem}
                  onRowClick={handleViewLineItem}
                  editable
                />
              </div>
            )}
          </section>
        </div>

        {/* Bottom: Changes notification + Update */}
        <div className="border-t bg-muted/30 px-4 py-3">
          <div className="mb-3 rounded-md border bg-background p-3">
            <div className="text-foreground mb-1.5 text-xs font-semibold">
              Changes
            </div>
            {hasChanges ? (
              <ul className="text-muted-foreground space-y-0.5 text-xs">
                {shipToChanged && <li>Ship-to address changed</li>}
                {deleteCount > 0 && <li>{deleteCount} item(s) removed</li>}
                {addCount > 0 && <li>{addCount} item(s) added</li>}
                {updateCount > 0 && <li>{updateCount} item(s) updated</li>}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">No changes to save.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleUpdate}
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? "Updating…" : "Update"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
