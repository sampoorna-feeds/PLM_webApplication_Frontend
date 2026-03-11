"use client";

import { useEffect, useState } from "react";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import {
  getTransferOrderByNo,
  getTransferOrderLines,
  type TransferOrder,
  type TransferLine,
} from "@/lib/api/services/transfer-orders.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export interface TransferOrderDetailFormProps {
  tabId?: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
  orderNo?: string;
}

export function TransferOrderDetailForm({
  orderNo,
}: TransferOrderDetailFormProps) {
  const { currentTab } = useFormStackContext();
  const activeOrderNo = orderNo || currentTab?.context?.orderNo;

  const [order, setOrder] = useState<TransferOrder | null>(null);
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrderNo) return;

    let isMounted = true;
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [orderData, linesData] = await Promise.all([
          getTransferOrderByNo(activeOrderNo),
          getTransferOrderLines(activeOrderNo),
        ]);

        if (isMounted) {
          if (!orderData) {
            setError("Transfer Order not found.");
          } else {
            setOrder(orderData);
            setLines(linesData || []);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load transfer order.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrderData();

    return () => {
      isMounted = false;
    };
  }, [activeOrderNo]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <p>{error || "Transfer order not found"}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-8 p-6 pb-20">
        {/* Header Section */}
        <div>
          <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Order Summary
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
            <SummaryField label="Transfer order No." value={order.No} />
            <SummaryField label="Transfer-from Code" value={order.Transfer_from_Code} />
            <SummaryField label="Transfer-to Code" value={order.Transfer_to_Code} />
            <SummaryField label="In-Transit Code" value={order.In_Transit_Code} />
            <SummaryField label="Status" value={order.Status} />
            <SummaryField label="LOB" value={order.Shortcut_Dimension_1_Code} />
            <SummaryField label="Branch" value={order.Shortcut_Dimension_2_Code} />
            <SummaryField label="Shipment Date" value={formatDate(order.Shipment_Date)} />
            <SummaryField label="Receipt Date" value={formatDate(order.Receipt_Date)} />
            <SummaryField label="Assigned User" value={order.Assigned_User_ID} />
            <SummaryField label="Direct Transfer" value={order.Direct_Transfer} />
            <SummaryField label="Shipping Advice" value={order.Shipping_Advice} />
            <SummaryField label="Shipping Agent Code" value={order.Shipping_Agent_Code} />
            <SummaryField label="Shipment Method Code" value={order.Shipment_Method_Code} />
          </div>
        </div>

        <Separator />

        {/* Lines Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
              Line Items
            </h2>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted bg-opacity-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item No.</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Quantity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">UOM</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Transfer Price</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Qty. to Ship</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Qty. Shipped</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Qty. to Receive</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Qty. Received</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Appl.-to Entry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">GST Group</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">HSN/SAC</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-4 text-center text-muted-foreground">
                      No line items found.
                    </td>
                  </tr>
                ) : (
                  lines.map((line, index) => (
                    <tr
                      key={index}
                      className="border-t transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium">{line.Item_No || "-"}</td>
                      <td className="px-4 py-3">{line.Description || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{line.Quantity?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3">{line.Unit_of_Measure_Code || "-"}</td>
                      <td className="px-4 py-3 text-right">{line.Transfer_Price != null ? line.Transfer_Price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) : "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{line.Amount != null ? line.Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</td>
                      <td className="px-4 py-3 text-right">{line.Qty_to_Ship?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right">{line.Quantity_Shipped?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right">{line.Qty_to_Receive?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right">{line.Quantity_Received?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right">{line.Appl_to_Item_Entry || "-"}</td>
                      <td className="px-4 py-3">{line.GST_Group_Code || "-"}</td>
                      <td className="px-4 py-3">{line.HSN_SAC_Code || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: any }) {
  if (value === undefined || value === null || value === "") {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">-</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{String(value)}</span>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr || dateStr === "0001-01-01") return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}
