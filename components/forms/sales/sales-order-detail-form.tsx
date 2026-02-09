"use client";

/**
 * Sales Order Detail Form
 * Read-only view of a sales order with header and line items
 * Opens in FormStack when clicking a row in the Sales Order list
 */

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import {
  getSalesOrderByNo,
  getSalesOrderLines,
  type SalesOrder,
  type SalesLine,
} from "@/lib/api/services/sales-orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const orderNo = context?.orderNo as string | undefined;

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<SalesLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNo) {
      setError("No order number provided");
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
      .then(([header, lineItems]) => {
        if (cancelled) return;
        setOrder(header || null);
        setLines(lineItems || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load order");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderNo]);

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

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
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
        <div className="mb-3 text-sm font-semibold">Line Items</div>
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
    </div>
  );
}
