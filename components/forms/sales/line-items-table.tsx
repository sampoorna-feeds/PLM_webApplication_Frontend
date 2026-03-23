"use client";

/**
 * Line Items Table Component
 * Optional per-row Actions (Edit, Delete) and right-click context menu when showRowActions.
 * Row click opens line in view when onRowClick provided.
 */

import React, { useState, useCallback } from "react";
import { Package, Pencil, Trash2 } from "lucide-react";
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
import { TaxInfoPopover } from "@/components/forms/purchase/tax-info-popover";

interface LineItemsTableProps {
  lineItems: LineItem[];
  onEdit?: (lineItem: LineItem) => void;
  onRemove?: (lineItemId: string) => void;
  onUpdate?: (lineItem: LineItem) => void;
  onRowClick?: (lineItem: LineItem) => void;
  editable?: boolean;
  /** When true, show Edit/Delete buttons and right-click context menu on each row */
  showRowActions?: boolean;
  /** Optional document number to fetch tax info for synced line items */
  documentNo?: string;
  /** When provided, renders a Bardana button per row (only for synced lines with lineNo) */
  onBardana?: (lineItem: LineItem) => void;
}

function LineItemsTableComponent({
  lineItems,
  onEdit,
  onRemove,
  onUpdate,
  onRowClick,
  editable = false,
  showRowActions = false,
  documentNo,
  onBardana,
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
      onRemove?.(itemToRemove);
      setItemToRemove(null);
    }
  }, [itemToRemove, onRemove]);

  const handleCancelRemove = useCallback(() => {
    setItemToRemove(null);
  }, []);

  const handleCellClick = useCallback(
    (
      e: React.MouseEvent,
      itemId: string,
      field: keyof LineItem,
      currentValue: any,
    ) => {
      if (onRowClick) {
        e.stopPropagation();
        const item = lineItems.find((li) => li.id === itemId);
        if (item) onRowClick(item);
        return;
      }
      if (!editable) return;
      e.stopPropagation();
      setEditingCell({ itemId, field });
      setEditValue(String(currentValue || ""));
    },
    [editable, onRowClick, lineItems],
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
      editingCell.field === "price" ||
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
      updatedItem.amount =
        updatedItem.unitPrice * updatedItem.quantity - updatedItem.discount;
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
              <TableHead className="w-20">Type</TableHead>
              <TableHead className="w-25">No.</TableHead>
              <TableHead className="min-w-50">Description</TableHead>
              <TableHead className="w-25">UOM</TableHead>
              <TableHead className="w-25">Quantity</TableHead>
              <TableHead className="w-20">Bags</TableHead>
              <TableHead className="w-25">Price</TableHead>
              <TableHead className="w-25">Unit Price</TableHead>
              <TableHead className="w-25">Discount</TableHead>
              <TableHead className="w-25">Amount</TableHead>
              <TableHead className="w-25">Exempted</TableHead>
              <TableHead className="w-30">GST Group Code</TableHead>
              <TableHead className="w-30">HSN/SAC Code</TableHead>
              <TableHead className="w-30">TDS Group Code</TableHead>
              {showRowActions && (
                <TableHead className="w-27.5 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => {
              const isEditing = editingCell?.itemId === item.id;
              const row = (
                <TableRow
                  key={item.id}
                  className={cn(
                    "hover:bg-muted/50",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={
                    onRowClick && !showRowActions
                      ? (e) => {
                          if (
                            editingCell?.itemId === item.id &&
                            (e.target as HTMLElement).closest("input")
                          ) {
                            return;
                          }
                          onRowClick(item);
                        }
                      : undefined
                  }
                >
                  <TableCell className="font-medium">{item.type}</TableCell>
                  <TableCell>{item.no}</TableCell>
                  <TableCell className="max-w-50 truncate">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{item.description}</span>
                      {item.lineNo && documentNo && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <TaxInfoPopover
                            documentNo={documentNo}
                            lineNo={item.lineNo}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.uom || "-"}</TableCell>
                  <TableCell
                    className={cn(
                      editable &&
                        !onRowClick &&
                        "hover:bg-muted cursor-pointer",
                      isEditing && editingCell?.field === "quantity" && "p-0",
                    )}
                    onClick={(e) =>
                      handleCellClick(e, item.id, "quantity", item.quantity)
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
                      editable &&
                        !onRowClick &&
                        "hover:bg-muted cursor-pointer",
                      isEditing && editingCell?.field === "price" && "p-0",
                    )}
                    onClick={(e) =>
                      handleCellClick(e, item.id, "price", item.price)
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
                      (item.price ?? "-")
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      editable &&
                        !onRowClick &&
                        "hover:bg-muted cursor-pointer",
                      isEditing && editingCell?.field === "unitPrice" && "p-0",
                    )}
                    onClick={(e) =>
                      handleCellClick(e, item.id, "unitPrice", item.unitPrice)
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

                  <TableCell
                    className={cn(
                      editable &&
                        !onRowClick &&
                        "hover:bg-muted cursor-pointer",
                      isEditing && editingCell?.field === "discount" && "p-0",
                    )}
                    onClick={(e) =>
                      handleCellClick(e, item.id, "discount", item.discount)
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
                  <TableCell>{item.tdsGroupCode || "-"}</TableCell>
                  <TableCell>{item.noOfBags ?? "-"}</TableCell>
                  {showRowActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onBardana && item.lineNo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBardana(item);
                            }}
                            title="Add Bardana"
                            aria-label="Add Bardana"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(item);
                            }}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onRemove && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveClick(item.id);
                            }}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
              return showRowActions ? (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
                  <ContextMenuContent className="min-w-40">
                    {onEdit && (
                      <ContextMenuItem onClick={() => onEdit(item)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </ContextMenuItem>
                    )}
                    {onRemove && (
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() => handleRemoveClick(item.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ) : (
                <React.Fragment key={item.id}>{row}</React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {showRowActions && (
        <AlertDialog
          open={!!itemToRemove}
          onOpenChange={(open) => !open && handleCancelRemove()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Line Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this line item? This action
                cannot be undone.
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
      )}
    </>
  );
}

export const LineItemsTable = React.memo(
  LineItemsTableComponent,
  (prev, next) => {
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
      prev.editable === next.editable &&
      prev.onRowClick === next.onRowClick &&
      prev.showRowActions === next.showRowActions
    );
  },
);

LineItemsTable.displayName = "LineItemsTable";
