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
import { cn } from "@/lib/utils";
import { TaxInfoPopover } from "./tax-info-popover";
import type { LineItem } from "./purchase-line-item.type";
import {
  getPurchaseLineQuantityConfig,
  type PurchaseLineDocumentType,
  type PurchaseLineQuantityKey,
} from "./purchase-line-quantity-config";

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
}

export function PurchaseLineItemsTable({
  lineItems,
  onEdit,
  onRemove,
  onRowClick,
  showRowActions = false,
  documentNo,
  documentType = "order",
}: PurchaseLineItemsTableProps) {
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const quantityColumns = getPurchaseLineQuantityConfig(documentType);

  const handleRemoveClick = useCallback((itemId: string) => {
    setItemToRemove(itemId);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (itemToRemove) {
      onRemove?.(itemToRemove);
      setItemToRemove(null);
    }
  }, [itemToRemove, onRemove]);

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
              <TableHead className="text-primary min-w-[200px] text-[10px] font-bold tracking-wider uppercase">
                Description
              </TableHead>
              <TableHead className="text-primary w-24 text-[10px] font-bold tracking-wider uppercase">
                UOM
              </TableHead>
              <TableHead className="text-primary w-24 text-right text-[10px] font-bold tracking-wider uppercase">
                Quantity
              </TableHead>
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
              <TableHead className="text-primary w-20 text-right text-[10px] font-bold tracking-wider uppercase">
                Bags
              </TableHead>
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
                <TableCell className="font-medium">
                  {item.lineNo || "-"}
                </TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.no}</TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {item.description}
                </TableCell>
                <TableCell>{item.uom || "-"}</TableCell>
                <TableCell className="text-right font-medium">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right">
                  {getQuantityDisplayValue(
                    item,
                    quantityColumns.firstPendingKey,
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {getQuantityDisplayValue(
                    item,
                    quantityColumns.firstCompletedKey,
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {getQuantityDisplayValue(
                    item,
                    quantityColumns.secondPendingKey,
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {getQuantityDisplayValue(
                    item,
                    quantityColumns.secondCompletedKey,
                  )}
                </TableCell>
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
                <TableCell className="text-right">
                  {item.noOfBags || "-"}
                </TableCell>
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
    </>
  );
}
