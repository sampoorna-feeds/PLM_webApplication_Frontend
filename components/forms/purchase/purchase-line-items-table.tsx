"use client";

import React, { useState, useCallback } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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

interface PurchaseLineItemsTableProps {
  lineItems: LineItem[];
  onEdit?: (lineItem: LineItem) => void;
  onRemove?: (lineItemId: string) => void;
  onRowClick?: (lineItem: LineItem) => void;
  showRowActions?: boolean;
  documentNo?: string;
}

export function PurchaseLineItemsTable({
  lineItems,
  onEdit,
  onRemove,
  onRowClick,
  showRowActions = false,
  documentNo,
}: PurchaseLineItemsTableProps) {
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);

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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5 whitespace-nowrap border-b border-primary/20">
              <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-primary">Tax</TableHead>
              <TableHead className="w-16 text-[10px] font-bold uppercase tracking-wider text-primary">Line</TableHead>
              <TableHead className="w-24 text-[10px] font-bold uppercase tracking-wider text-primary">Type</TableHead>
              <TableHead className="w-32 text-[10px] font-bold uppercase tracking-wider text-primary">No</TableHead>
              <TableHead className="min-w-[200px] text-[10px] font-bold uppercase tracking-wider text-primary">Description</TableHead>
              <TableHead className="w-24 text-[10px] font-bold uppercase tracking-wider text-primary">UOM</TableHead>
              <TableHead className="w-24 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Quantity</TableHead>
              <TableHead className="w-24 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Qty Receive</TableHead>
              <TableHead className="w-24 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Qty Recd</TableHead>
              <TableHead className="w-24 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Qty Invce</TableHead>
              <TableHead className="w-24 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Qty Invd</TableHead>
              <TableHead className="w-32 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Unit Price</TableHead>
              <TableHead className="w-24 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Disc %</TableHead>
              <TableHead className="w-32 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Amount</TableHead>
              <TableHead className="w-32 text-[10px] font-bold uppercase tracking-wider text-primary">GST Group</TableHead>
              <TableHead className="w-32 text-[10px] font-bold uppercase tracking-wider text-primary">HSN/SAC</TableHead>
              <TableHead className="w-32 text-[10px] font-bold uppercase tracking-wider text-primary">GST Credit</TableHead>
              <TableHead className="w-24 text-center text-[10px] font-bold uppercase tracking-wider text-primary">Exempt</TableHead>
              <TableHead className="w-20 text-right text-[10px] font-bold uppercase tracking-wider text-primary">Bags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  "hover:bg-muted/50 whitespace-nowrap cursor-pointer",
                )}
                onClick={() => onRowClick?.(item)}
              >
                <TableCell className="text-center">
                  {item.lineNo && item.lineNo > 0 && documentNo ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <TaxInfoPopover documentNo={documentNo} lineNo={item.lineNo} />
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="font-medium">{item.lineNo || "-"}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.no}</TableCell>
                <TableCell className="max-w-[300px] truncate">{item.description}</TableCell>
                <TableCell>{item.uom || "-"}</TableCell>
                <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                <TableCell className="text-right">{(item as any).qtyToReceive ?? "-"}</TableCell>
                <TableCell className="text-right">{(item as any).qtyReceived ?? "-"}</TableCell>
                <TableCell className="text-right">{(item as any).qtyToInvoice ?? "-"}</TableCell>
                <TableCell className="text-right">{(item as any).qtyInvoiced ?? "-"}</TableCell>
                <TableCell className="text-right">
                  {(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">{item.discount > 0 ? `${item.discount}%` : "-"}</TableCell>
                <TableCell className="text-right font-bold">
                  {(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>{item.gstGroupCode || "-"}</TableCell>
                <TableCell>{item.hsnSacCode || "-"}</TableCell>
                <TableCell>{item.gstCredit || "-"}</TableCell>
                <TableCell className="text-center">{item.exempted ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">{item.noOfBags || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Line Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this line item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToRemove(null)}>Cancel</AlertDialogCancel>
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
