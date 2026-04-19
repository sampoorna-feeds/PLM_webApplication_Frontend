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
import { Loader2, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesTaxInfoPopover } from "./sales-tax-info-popover";
import { EditableQtyCell } from "../shared/editable-qty-cell";
import { getSalesLineQuantityConfig } from "./sales-line-quantity-config";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";
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
  /** Enable inline editing of pending qty columns. */
  editable?: boolean;
  /** Called when the user saves inline qty edits for a line. */
  onInlineUpdate?: (
    line: SalesLine,
    patch: Record<string, number>,
  ) => Promise<void>;
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
  editable = false,
  onInlineUpdate,
}: SalesLineItemsTableProps) {
  const [lineToDelete, setLineToDelete] = useState<SalesLine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const qtyConfig = getSalesLineQuantityConfig(documentType);
  const showQtyColumns = !!qtyConfig;
  const canInlineEdit = editable && !!qtyConfig && !!onInlineUpdate;
  const qtyToShipLabel = qtyConfig?.firstPendingLabel ?? "Qty to Ship";
  const qtyShippedLabel = qtyConfig?.firstCompletedLabel ?? "Qty Shipped";
  const qtyToInvoiceLabel = qtyConfig?.secondPendingLabel ?? "Qty to Invoice";
  const qtyInvoicedLabel = qtyConfig?.secondCompletedLabel ?? "Qty Invoiced";

  const [pendingEdits, setPendingEdits] = useState<
    Record<number, Record<string, number>>
  >({});
  const [savingLineNo, setSavingLineNo] = useState<number | null>(null);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  const hasPendingEdits = Object.keys(pendingEdits).length > 0;

  const handleInlineChange = useCallback(
    (lineNo: number, bcField: string, next: number) => {
      setPendingEdits((prev) => ({
        ...prev,
        [lineNo]: { ...(prev[lineNo] ?? {}), [bcField]: next },
      }));
    },
    [],
  );

  const handleSaveInline = useCallback(
    async (line: SalesLine) => {
      const lineNo = line.Line_No;
      if (lineNo == null) return;
      const patch = pendingEdits[lineNo];
      if (!patch || !onInlineUpdate) return;
      try {
        setSavingLineNo(lineNo);
        await onInlineUpdate(line, patch);
        setPendingEdits((prev) => {
          const next = { ...prev };
          delete next[lineNo];
          return next;
        });
      } catch (error) {
        const { message, code } = extractApiError(error);
        setApiError({ title: "Failed to Save", message, code });
      } finally {
        setSavingLineNo(null);
      }
    },
    [pendingEdits, onInlineUpdate],
  );

  const handleCancelInline = useCallback((lineNo: number) => {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[lineNo];
      return next;
    });
  }, []);

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
                    {qtyToInvoiceLabel}
                  </TableHead>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    {qtyInvoicedLabel}
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
              {canInlineEdit && hasPendingEdits && (
                <TableHead className="text-primary bg-background sticky right-0 z-20 w-20 text-center text-[10px] font-bold tracking-wider uppercase shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)]">
                  Actions
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
                  {showQtyColumns && qtyConfig && (
                    <>
                      {canInlineEdit && line.Line_No != null ? (
                        <EditableQtyCell
                          value={
                            pendingEdits[line.Line_No]?.[
                              qtyConfig.firstPendingBcField
                            ] ??
                            ((line as unknown as Record<string, unknown>)[
                              qtyConfig.firstPendingBcField
                            ] as number | undefined)
                          }
                          isDirty={
                            pendingEdits[line.Line_No]?.[
                              qtyConfig.firstPendingBcField
                            ] !== undefined
                          }
                          onChange={(next) =>
                            handleInlineChange(
                              line.Line_No as number,
                              qtyConfig.firstPendingBcField,
                              next,
                            )
                          }
                        />
                      ) : (
                        <TableCell className="text-right text-xs">
                          {((line as unknown as Record<string, unknown>)[
                            qtyConfig.firstPendingBcField
                          ] as number | undefined) ?? "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-xs">
                        {((line as unknown as Record<string, unknown>)[
                          qtyConfig.firstCompletedBcField
                        ] as number | undefined) ?? "-"}
                      </TableCell>
                      {canInlineEdit && line.Line_No != null ? (
                        <EditableQtyCell
                          value={
                            pendingEdits[line.Line_No]?.[
                              qtyConfig.secondPendingBcField
                            ] ??
                            ((line as unknown as Record<string, unknown>)[
                              qtyConfig.secondPendingBcField
                            ] as number | undefined)
                          }
                          isDirty={
                            pendingEdits[line.Line_No]?.[
                              qtyConfig.secondPendingBcField
                            ] !== undefined
                          }
                          onChange={(next) =>
                            handleInlineChange(
                              line.Line_No as number,
                              qtyConfig.secondPendingBcField,
                              next,
                            )
                          }
                        />
                      ) : (
                        <TableCell className="text-right text-xs">
                          {((line as unknown as Record<string, unknown>)[
                            qtyConfig.secondPendingBcField
                          ] as number | undefined) ?? "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-right text-xs">
                        {((line as unknown as Record<string, unknown>)[
                          qtyConfig.secondCompletedBcField
                        ] as number | undefined) ?? "-"}
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
                      className="w-12 text-center"
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
                  {canInlineEdit && hasPendingEdits && (
                    <TableCell
                      className="bg-background sticky right-0 z-10 w-20 text-center shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.12)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {line.Line_No != null && pendingEdits[line.Line_No] && (
                        <div className="animate-in fade-in flex items-center justify-center gap-1 duration-150">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={savingLineNo === line.Line_No}
                            onClick={() => handleSaveInline(line)}
                          >
                            {savingLineNo === line.Line_No ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={savingLineNo === line.Line_No}
                            onClick={() => handleCancelInline(line.Line_No as number)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
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

      <ApiErrorDialog
        error={apiError}
        onClose={() => setApiError(null)}
      />
    </>
  );
}
