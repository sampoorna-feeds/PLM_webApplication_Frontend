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
import { formatDate } from "@/lib/utils/date";

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
      <div className="flex flex-col gap-6 p-4 pb-20">
        {/* Header Section */}
        <div>
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            General Information
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 lg:grid-cols-6">
            <SummaryField label="Transfer order No." value={order.No} />
            <SummaryField label="Status" value={order.Status} />
            <SummaryField label="Posting Date" value={formatDate(order.Posting_Date)} />
            <SummaryField label="External Doc No." value={order.External_Document_No} />
            <SummaryField label="LOB" value={order.Shortcut_Dimension_1_Code} />
            <SummaryField label="Branch" value={order.Shortcut_Dimension_2_Code} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Transfer Locations
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
            <SummaryField label="Transfer-from Code" value={order.Transfer_from_Code} />
            <SummaryField label="Transfer-from Name" value={order.Transfer_from_Name} />
            <SummaryField label="Transfer-to Code" value={order.Transfer_to_Code} />
            <SummaryField label="Transfer-to Name" value={order.Transfer_to_Name} />
            <SummaryField label="In-Transit Code" value={order.In_Transit_Code} />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-base font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Transport & Logistics
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 lg:grid-cols-5">
            <SummaryField label="Vehicle No." value={order.Vehicle_No} />
            <SummaryField label="LR/RR No." value={order.LR_RR_No} />
            <SummaryField label="LR/RR Date" value={formatDate(order.LR_RR_Date)} />
            <SummaryField label="Distance (Km)" value={order.Distance_Km} />
            <SummaryField label="Freight Value" value={order.Freight_Value} />
            <SummaryField label="Transporter Code" value={order.Transporter_Code} />
            <SummaryField label="Transporter Name" value={order.Transporter_Name} />
            <SummaryField label="Mode of Transport" value={order.Mode_of_Transport} />
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
                <tr className="whitespace-nowrap">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item No.</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Appl.-to Entry</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Transfer Price</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Qty. to Ship</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Qty. Shipped</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Qty. to Receive</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Qty. Received</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">GST Group</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">HSN/SAC</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">GST Credit</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-muted-foreground">
                      No line items found.
                    </td>
                  </tr>
                ) : (
                  lines.map((line, index) => (
                    <tr
                      key={index}
                      className="border-t transition-colors hover:bg-muted/50 whitespace-nowrap"
                    >
                      <td className="px-4 py-3 font-medium">{line.Item_No || "-"}</td>
                      <td className="px-4 py-3">{line.Description || "-"}</td>
                      <td className="px-4 py-3">{line.Appl_to_Item_Entry || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{line.Quantity?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right">{line.Transfer_Price != null ? line.Transfer_Price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{line.Amount != null ? line.Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}</td>
                      <td className="px-4 py-3 text-right">{line.Qty_to_Ship?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right">{line.Quantity_Shipped?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right">{line.Qty_to_Receive?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3 text-right">{line.Quantity_Received?.toLocaleString() || 0}</td>
                      <td className="px-4 py-3">{line.GST_Group_Code || "-"}</td>
                      <td className="px-4 py-3">{line.HSN_SAC_Code || "-"}</td>
                      <td className="px-4 py-3">{line.GST_Credit || "-"}</td>
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

