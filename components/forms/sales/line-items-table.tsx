"use client";

/**
 * Line Items Table Component
 * Editable table with right-click context menu for managing line items
 */

import React, { useState, useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LineItem } from "./line-item-form";

interface LineItemsTableProps {
  lineItems: LineItem[];
  onEdit: (lineItem: LineItem) => void;
  onRemove: (lineItemId: string) => void;
  onUpdate?: (lineItem: LineItem) => void;
  editable?: boolean;
}

function LineItemsTableComponent({
  lineItems,
  onEdit,
  onRemove,
  onUpdate,
  editable = false,
}: LineItemsTableProps) {
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    field: keyof LineItem;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleRemoveClick = useCallback((itemId: string) => {
    setItemToRemove(itemId);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (itemToRemove) {
      onRemove(itemToRemove);
      setItemToRemove(null);
    }
  }, [itemToRemove, onRemove]);

  const handleCancelRemove = useCallback(() => {
    setItemToRemove(null);
  }, []);

  const handleCellClick = useCallback(
    (itemId: string, field: keyof LineItem, currentValue: any) => {
      if (!editable) return;
      setEditingCell({ itemId, field });
      setEditValue(String(currentValue || ""));
    },
    [editable],
  );

  const handleCellBlur = useCallback(() => {
    if (!editingCell || !onUpdate) return;

    const item = lineItems.find((li) => li.id === editingCell.itemId);
    if (!item) {
      setEditingCell(null);
      return;
    }

    // Parse value based on field type
    let newValue: any = editValue;
    if (
      editingCell.field === "quantity" ||
      editingCell.field === "unitPrice" ||
      editingCell.field === "discount" ||
      editingCell.field === "mrp" ||
      editingCell.field === "price" ||
      editingCell.field === "totalMRP" ||
      editingCell.field === "amount"
    ) {
      newValue = parseFloat(editValue) || 0;
    }

    // Update the item
    const updatedItem: LineItem = {
      ...item,
      [editingCell.field]: newValue,
    };

    // Recalculate amounts if needed
    if (
      editingCell.field === "quantity" ||
      editingCell.field === "unitPrice" ||
      editingCell.field === "discount"
    ) {
      updatedItem.totalMRP = updatedItem.unitPrice * updatedItem.quantity;
      updatedItem.amount = updatedItem.totalMRP - updatedItem.discount;
    }

    onUpdate(updatedItem);
    setEditingCell(null);
  }, [editingCell, editValue, lineItems, onUpdate]);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleCellBlur();
      } else if (e.key === "Escape") {
        setEditingCell(null);
      }
    },
    [handleCellBlur],
  );

  if (lineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">No line items added yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Type</TableHead>
              <TableHead className="w-[100px]">No.</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="w-[100px]">UOM</TableHead>
              <TableHead className="w-[100px]">Quantity</TableHead>
              <TableHead className="w-[100px]">MRP</TableHead>
              <TableHead className="w-[100px]">Price</TableHead>
              <TableHead className="w-[100px]">Unit Price</TableHead>
              <TableHead className="w-[100px]">Total MRP</TableHead>
              <TableHead className="w-[100px]">Discount</TableHead>
              <TableHead className="w-[100px]">Amount</TableHead>
              <TableHead className="w-[100px]">Exempted</TableHead>
              <TableHead className="w-[120px]">GST Group Code</TableHead>
              <TableHead className="w-[120px]">HSN/SAC Code</TableHead>
              <TableHead className="w-[120px]">TCS Group Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => {
              const isEditing = editingCell?.itemId === item.id;
              return (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="font-medium">{item.type}</TableCell>
                      <TableCell>{item.no}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.description}
                      </TableCell>
                      <TableCell>{item.uom || "-"}</TableCell>
                      <TableCell
                        className={cn(
                          editable && "hover:bg-muted cursor-pointer",
                          isEditing &&
                            editingCell?.field === "quantity" &&
                            "p-0",
                        )}
                        onClick={() =>
                          handleCellClick(item.id, "quantity", item.quantity)
                        }
                      >
                        {isEditing && editingCell?.field === "quantity" ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
                            className="h-8 border-0 focus-visible:ring-1"
                            autoFocus={false}
                          />
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          editable && "hover:bg-muted cursor-pointer",
                          isEditing && editingCell?.field === "mrp" && "p-0",
                        )}
                        onClick={() =>
                          handleCellClick(item.id, "mrp", item.mrp)
                        }
                      >
                        {isEditing && editingCell?.field === "mrp" ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
                            className="h-8 border-0 focus-visible:ring-1"
                            autoFocus={false}
                          />
                        ) : (
                          item.mrp || "-"
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          editable && "hover:bg-muted cursor-pointer",
                          isEditing && editingCell?.field === "price" && "p-0",
                        )}
                        onClick={() =>
                          handleCellClick(item.id, "price", item.price)
                        }
                      >
                        {isEditing && editingCell?.field === "price" ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
                            className="h-8 border-0 focus-visible:ring-1"
                            autoFocus={false}
                          />
                        ) : (
                          item.price || "-"
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          editable && "hover:bg-muted cursor-pointer",
                          isEditing &&
                            editingCell?.field === "unitPrice" &&
                            "p-0",
                        )}
                        onClick={() =>
                          handleCellClick(item.id, "unitPrice", item.unitPrice)
                        }
                      >
                        {isEditing && editingCell?.field === "unitPrice" ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
                            className="h-8 border-0 focus-visible:ring-1"
                            autoFocus={false}
                          />
                        ) : (
                          item.unitPrice.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.totalMRP.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          editable && "hover:bg-muted cursor-pointer",
                          isEditing &&
                            editingCell?.field === "discount" &&
                            "p-0",
                        )}
                        onClick={() =>
                          handleCellClick(item.id, "discount", item.discount)
                        }
                      >
                        {isEditing && editingCell?.field === "discount" ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
                            className="h-8 border-0 focus-visible:ring-1"
                            autoFocus={false}
                          />
                        ) : (
                          item.discount.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{item.exempted ? "Yes" : "No"}</TableCell>
                      <TableCell>{item.gstGroupCode || "-"}</TableCell>
                      <TableCell>{item.hsnSacCode || "-"}</TableCell>
                      <TableCell>{item.tcsGroupCode || "-"}</TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onEdit(item)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </ContextMenuItem>
                    <ContextMenuItem
                      variant="destructive"
                      onClick={() => handleRemoveClick(item.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!itemToRemove}
        onOpenChange={(open) => !open && handleCancelRemove()}
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
            <AlertDialogCancel onClick={handleCancelRemove}>
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

export const LineItemsTable = React.memo(
  LineItemsTableComponent,
  (prev, next) => {
    // Only re-render if lineItems array changed or editable changed
    return (
      prev.lineItems.length === next.lineItems.length &&
      prev.lineItems.every((item, idx) => {
        const nextItem = next.lineItems[idx];
        return (
          nextItem &&
          item.id === nextItem.id &&
          item.quantity === nextItem.quantity &&
          item.unitPrice === nextItem.unitPrice &&
          item.discount === nextItem.discount &&
          item.amount === nextItem.amount
        );
      }) &&
      prev.editable === next.editable
    );
  },
);

LineItemsTable.displayName = "LineItemsTable";
