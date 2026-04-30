"use client";

import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { EditableQtyCell } from "../shared/editable-qty-cell";
import type { LineItem } from "./purchase-line-item.type";
import {
  getPurchaseLineQuantityConfig,
  type PurchaseLineDocumentType,
  type PurchaseLineQuantityKey,
} from "./purchase-line-quantity-config";
import { TaxInfoPopover } from "./tax-info-popover";

function getQuantityDisplayValue(
  item: LineItem,
  key: PurchaseLineQuantityKey,
): string | number {
  const typedItem = item as unknown as Record<string, unknown>;
  const value = typedItem[key];

  if (value === undefined || value === null || value === "") {
    return "-";
  }

  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return String(value);
}

interface PurchaseLineItemsTableProps {
  lineItems: LineItem[];
  onEdit?: (lineItem: LineItem) => void;
  onRemove?: (lineItemId: string) => void;
  onRowClick?: (lineItem: LineItem) => void;
  showRowActions?: boolean;
  documentNo?: string;
  documentType?: PurchaseLineDocumentType;
  isLoading?: boolean;
  /** Enable inline editing of pending qty columns. */
  editable?: boolean;
  /** Called when the user saves inline qty edits for a line. */
  onInlineUpdate?: (
    lineItem: LineItem,
    patch: Record<string, number>,
  ) => Promise<void>;
}

export function PurchaseLineItemsTable({
  lineItems,
  onEdit,
  onRemove,
  onRowClick,
  showRowActions = false,
  documentNo,
  documentType = "order",
  isLoading = false,
  editable = false,
  onInlineUpdate,
}: PurchaseLineItemsTableProps) {
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const quantityColumns = getPurchaseLineQuantityConfig(documentType);
  const showQtyColumns = documentType === "order" || documentType === "return-order";
  const showBagsColumn = documentType !== "invoice";
  const canInlineEdit = editable && showQtyColumns && !!onInlineUpdate;

  const [savingId, setSavingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  const handleCommitInline = useCallback(
    async (item: LineItem, bcField: string, nextValue: number) => {
      if (!onInlineUpdate) return;
      try {
        setSavingId(item.id);

        const patch: Record<string, number> = {
          [bcField]: nextValue,
        };

        await onInlineUpdate(item, patch);
      } catch (error) {
        const { message, code } = extractApiError(error);
        setApiError({ title: "Failed to Save", message, code });
      } finally {
        setSavingId(null);
      }
    },
    [onInlineUpdate, quantityColumns],
  );

  const handleRemoveClick = useCallback((itemId: string) => {
    setItemToRemove(itemId);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (itemToRemove) {
      onRemove?.(itemToRemove);
      setItemToRemove(null);
    }
  }, [itemToRemove, onRemove]);

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted border-b whitespace-nowrap">
              {Array.from({ length: 8 }).map((_, i) => (
                <TableHead key={i}><Skeleton className="h-3 w-16" /></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-3 w-full min-w-12" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (lineItems.length === 0) {
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
              <TableHead className="text-primary w-16 text-[10px] font-bold tracking-wider uppercase">
                Line
              </TableHead>
              <TableHead className="text-primary w-24 text-[10px] font-bold tracking-wider uppercase">
                Type
              </TableHead>
              <TableHead className="text-primary w-32 text-[10px] font-bold tracking-wider uppercase">
                No
              </TableHead>
              <TableHead className="text-primary min-w-50 text-[10px] font-bold tracking-wider uppercase">
                Description
              </TableHead>
              <TableHead className="text-primary w-24 text-[10px] font-bold tracking-wider uppercase">
                UOM
              </TableHead>
              {showBagsColumn && (
                <TableHead className="text-primary w-20 text-right text-[10px] font-bold tracking-wider uppercase">
                  Bags
                </TableHead>
              )}
              <TableHead className="text-primary w-12 text-center text-[10px] font-bold tracking-wider uppercase">
                Tax
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Quantity
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Outstanding Qty
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Challan Qty
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Weight Qty
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Actual Qty
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Short/Excess
              </TableHead>
              {showQtyColumns && (
                <>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    {quantityColumns.firstPendingLabel}
                  </TableHead>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    {quantityColumns.firstCompletedLabel}
                  </TableHead>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    {quantityColumns.secondPendingLabel}
                  </TableHead>
                  <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                    {quantityColumns.secondCompletedLabel}
                  </TableHead>
                </>
              )}
              <TableHead className="text-primary w-32 text-right text-[10px] font-bold tracking-wider uppercase">
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
              <TableHead className="text-primary w-32 text-[10px] font-bold tracking-wider uppercase">
                GST Credit
              </TableHead>
              <TableHead className="text-primary w-24 text-center text-[10px] font-bold tracking-wider uppercase">
                Exempt
              </TableHead>


              {onRemove && (
                <TableHead className="text-primary w-12 text-center text-[10px] font-bold tracking-wider uppercase">
                  Del
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  "hover:bg-muted/50 cursor-pointer whitespace-nowrap",
                )}
                onClick={() => onRowClick?.(item)}
              >
                <TableCell className="font-medium">
                  {item.lineNo || "-"}
                </TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.no}</TableCell>
                <TableCell className="max-w-75 truncate">
                  {item.description}
                </TableCell>
                <TableCell>{item.uom || "-"}</TableCell>
                {showBagsColumn && (
                  <EditableQtyCell
                    value={item.noOfBags}
                    isDirty={savingId === item.id}
                    onChange={() => { }}
                    onCommit={(next) =>
                      handleCommitInline(item, "No_of_Bags", next)
                    }
                  />
                )}
                <TableCell className="text-center">
                  {item.lineNo && item.lineNo > 0 && documentNo ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <TaxInfoPopover
                        documentNo={documentNo}
                        lineNo={item.lineNo}
                      />
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right">
                  {item.outstandingQty || "0"}
                </TableCell>
                <EditableQtyCell
                  value={item.challanQty}
                  isDirty={savingId === item.id}
                  onChange={() => { }}
                  onCommit={(next) =>
                    handleCommitInline(item, "Challan_Qty", next)
                  }
                />
                <EditableQtyCell
                  value={item.weightQty}
                  isDirty={savingId === item.id}
                  onChange={() => { }}
                  onCommit={(next) =>
                    handleCommitInline(item, "Weight_Qty", next)
                  }
                />
                <EditableQtyCell
                  value={(item as any).actualQty}
                  isDirty={savingId === item.id}
                  onChange={() => { }}
                  onCommit={(next) =>
                    handleCommitInline(item, "Actual_Qty", next)
                  }
                />
                <TableCell className="text-right">
                  {((item.weightQty || 0) - (item.challanQty || 0)).toFixed(3)}
                </TableCell>
                {showQtyColumns && (
                  <>
                    {canInlineEdit ? (
                      <EditableQtyCell
                        value={
                          item[
                          quantityColumns.firstPendingKey as keyof LineItem
                          ] as number | undefined
                        }
                        isDirty={savingId === item.id}
                        onChange={() => { }}
                        onCommit={(next) =>
                          handleCommitInline(
                            item,
                            quantityColumns.firstPendingBcField,
                            next,
                          )
                        }
                      />
                    ) : (
                      <TableCell className="text-right">
                        {getQuantityDisplayValue(
                          item,
                          quantityColumns.firstPendingKey,
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {getQuantityDisplayValue(
                        item,
                        quantityColumns.firstCompletedKey,
                      )}
                    </TableCell>
                    {canInlineEdit ? (
                      <EditableQtyCell
                        value={
                          item[
                          quantityColumns.secondPendingKey as keyof LineItem
                          ] as number | undefined
                        }
                        isDirty={savingId === item.id}
                        onChange={() => { }}
                        onCommit={(next) =>
                          handleCommitInline(
                            item,
                            quantityColumns.secondPendingBcField,
                            next,
                          )
                        }
                      />
                    ) : (
                      <TableCell className="text-right">
                        {getQuantityDisplayValue(
                          item,
                          quantityColumns.secondPendingKey,
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {getQuantityDisplayValue(
                        item,
                        quantityColumns.secondCompletedKey,
                      )}
                    </TableCell>
                  </>
                )}
                <TableCell className="text-right">
                  {(item.unitPrice || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {item.discount > 0 ? `${item.discount}%` : "-"}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {(item.amount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell>{item.gstGroupCode || "-"}</TableCell>
                <TableCell>{item.hsnSacCode || "-"}</TableCell>
                <TableCell>{item.gstCredit || "-"}</TableCell>
                <TableCell className="text-center">
                  {item.exempted ? "Yes" : "No"}
                </TableCell>


                {onRemove && (
                  <TableCell
                    className="w-12 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"
                      onClick={() => handleRemoveClick(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!itemToRemove}
        onOpenChange={(open) => !open && setItemToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Line Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this line item? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
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
