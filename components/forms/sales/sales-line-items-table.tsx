"use client";

import React, { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesTaxInfoPopover } from "./sales-tax-info-popover";
import type { SalesLine } from "@/lib/api/services/sales-orders.service";
import type { SalesDocumentType } from "./sales-document-config";

function formatAmount(val: number | undefined | null): string {
  if (val == null) return "-";
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface SalesLineItemsTableProps {
  lines: SalesLine[];
  documentNo: string;
  documentType?: SalesDocumentType;
  onRowClick?: (line: SalesLine) => void;
  onDelete?: (line: SalesLine) => void | Promise<void>;
  itemTrackingMap?: Record<string, string>;
  lineStockMap?: Record<string, number>;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function SalesLineItemsTable({
  lines,
  documentNo,
  documentType = "order",
  onRowClick,
  onDelete,
  itemTrackingMap = {},
  lineStockMap = {},
  isLoading = false,
  readOnly = false,
}: SalesLineItemsTableProps) {
  const [lineToDelete, setLineToDelete] = useState<SalesLine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showQtyColumns =
    documentType === "order" || documentType === "return-order";
  const qtyToShipLabel =
    documentType === "return-order" ? "Qty to Return" : "Qty to Ship";
  const qtyShippedLabel =
    documentType === "return-order" ? "Qty Returned" : "Qty Shipped";

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, line: SalesLine) => {
      e.stopPropagation();
      setLineToDelete(line);
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!lineToDelete || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(lineToDelete);
    } finally {
      setIsDeleting(false);
      setLineToDelete(null);
    }
  }, [lineToDelete, onDelete]);

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted border-b whitespace-nowrap">
              {Array.from({ length: 9 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-3 w-16" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-3 w-full min-w-12" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">No line items added yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 border-primary/20 border-b whitespace-nowrap">
              <TableHead className="text-primary w-12 text-center text-[10px] font-bold tracking-wider uppercase">
                Tax
              </TableHead>
              <TableHead className="text-primary w-16 text-[10px] font-bold tracking-wider uppercase">
                Line
              </TableHead>
              <TableHead className="text-primary w-24 text-[10px] font-bold tracking-wider uppercase">
                Type
              </TableHead>
              <TableHead className="text-primary w-32 text-[10px] font-bold tracking-wider uppercase">
                No
              </TableHead>
              <TableHead className="text-primary min-w-[180px] text-[10px] font-bold tracking-wider uppercase">
                Description
              </TableHead>
              <TableHead className="text-primary w-20 text-[10px] font-bold tracking-wider uppercase">
                UOM
              </TableHead>
              <TableHead className="text-primary w-24 text-[10px] font-bold tracking-wider uppercase">
                Avail. Stock
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Quantity
              </TableHead>
              {showQtyColumns && (
                <>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    {qtyToShipLabel}
                  </TableHead>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    {qtyShippedLabel}
                  </TableHead>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    Qty to Invoice
                  </TableHead>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    Qty Invoiced
                  </TableHead>
                </>
              )}
              <TableHead className="text-primary w-28 text-right text-[10px] font-bold tracking-wider uppercase">
                Unit Price
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Disc %
              </TableHead>
              <TableHead className="text-primary w-32 text-right text-[10px] font-bold tracking-wider uppercase">
                Amount
              </TableHead>
              <TableHead className="text-primary w-32 text-[10px] font-bold tracking-wider uppercase">
                GST Group
              </TableHead>
              <TableHead className="text-primary w-32 text-[10px] font-bold tracking-wider uppercase">
                HSN/SAC
              </TableHead>
              <TableHead className="text-primary w-24 text-center text-[10px] font-bold tracking-wider uppercase">
                Exempt
              </TableHead>
              {!readOnly && onDelete && (
                <TableHead className="text-primary w-12 text-center text-[10px] font-bold tracking-wider uppercase">
                  Del
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const itemNo = String(line.No || "").trim().toLowerCase();
              const hasTracking = !!itemTrackingMap[itemNo];
              const stockVal = lineStockMap[line.No || ""];
              return (
                <TableRow
                  key={line.Line_No}
                  className={cn(
                    "hover:bg-muted/50 cursor-pointer",
                    hasTracking && "bg-red-50 hover:bg-red-100",
                  )}
                  onClick={() => onRowClick?.(line)}
                >
                  {/* Tax popover */}
                  <TableCell
                    className="text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {line.Line_No != null && (
                      <SalesTaxInfoPopover
                        documentNo={documentNo}
                        lineNo={line.Line_No}
                      />
                    )}
                  </TableCell>

                  <TableCell className="text-xs">{line.Line_No}</TableCell>
                  <TableCell className="text-xs">{line.Type || "-"}</TableCell>
                  <TableCell className="text-xs font-medium">
                    {line.No || "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {[line.Description, line.Description_2]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {line.Unit_of_Measure_Code || line.Unit_of_Measure || "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {stockVal != null ? stockVal.toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {line.Quantity ?? "-"}
                  </TableCell>
                  {showQtyColumns && (
                    <>
                      <TableCell className="text-right text-xs">
                        {line.Qty_to_Ship ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {line.Quantity_Shipped ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {line.Qty_to_Invoice ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {line.Quantity_Invoiced ?? "-"}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right text-xs">
                    {formatAmount(line.Unit_Price)}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {line.Line_Discount_Percent != null
                      ? `${line.Line_Discount_Percent}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium">
                    {formatAmount(line.Amt_to_Customer ?? line.Line_Amount)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {line.GST_Group_Code || "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {line.HSN_SAC_Code || "-"}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {line.Exempted ? "✓" : "-"}
                  </TableCell>
                  {!readOnly && onDelete && (
                    <TableCell
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
                        onClick={(e) => handleDeleteClick(e, line)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirm delete dialog */}
      <AlertDialog
        open={!!lineToDelete}
        onOpenChange={(open) => !open && setLineToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line</AlertDialogTitle>
            <AlertDialogDescription>
              Delete Line {lineToDelete?.Line_No} — {lineToDelete?.No}{" "}
              {lineToDelete?.Description}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
