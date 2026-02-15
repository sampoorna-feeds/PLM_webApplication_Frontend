"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getItemAvailabilityByLot } from "@/lib/api/services/production-orders.service";
import { modifyItemTrackingLine } from "@/lib/api/services/production-orders.service";
import type { LotAvailability } from "@/lib/api/services/production-orders.service";
import {
  assignSalesItemTracking,
  getSalesItemTrackingLines,
  deleteSalesItemTrackingLine,
  type SalesLine,
  type SalesItemTrackingLine,
} from "@/lib/api/services/sales-orders.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";

interface SalesItemTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  orderNo: string;
  locationCode: string;
  line: SalesLine | null;
}

export function SalesItemTrackingDialog({
  open,
  onOpenChange,
  onSave,
  orderNo,
  locationCode,
  line,
}: SalesItemTrackingDialogProps) {
  const [lotNo, setLotNo] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [availableLots, setAvailableLots] = useState<LotAvailability[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(false);
  const [trackingLines, setTrackingLines] = useState<SalesItemTrackingLine[]>([]);
  const [isLoadingTrackingLines, setIsLoadingTrackingLines] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  const [editingLine, setEditingLine] = useState<SalesItemTrackingLine | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lineToDelete, setLineToDelete] =
    useState<SalesItemTrackingLine | null>(null);

  const itemNo = line?.No ?? "";
  const lineNo = line?.Line_No ?? 0;
  const remainingQuantity = useMemo(
    () => (line?.Quantity ?? 0),
    [line?.Quantity],
  );
  const assignedQuantity = useMemo(() => {
    if (editingLine) {
      return trackingLines
        .filter((l) => l.Entry_No !== editingLine.Entry_No)
        .reduce((sum, l) => sum + Math.abs(l.Quantity_Base || 0), 0);
    }
    return trackingLines.reduce(
      (sum, l) => sum + Math.abs(l.Quantity_Base || 0),
      0,
    );
  }, [trackingLines, editingLine]);
  const availableForAssignment = useMemo(
    () => Math.max(0, remainingQuantity - assignedQuantity),
    [remainingQuantity, assignedQuantity],
  );

  useEffect(() => {
    if (open && line && itemNo && locationCode) {
      const fetchLots = async () => {
        setIsLoadingLots(true);
        try {
          const lots = await getItemAvailabilityByLot(itemNo, locationCode);
          setAvailableLots(lots);
        } catch (error) {
          console.error("Error fetching available lots:", error);
          const { message, code } = extractApiError(error);
          setApiError({ title: "Load Lots Failed", message, code });
        } finally {
          setIsLoadingLots(false);
        }
      };
      const fetchTrackingLines = async () => {
        setIsLoadingTrackingLines(true);
        try {
          const lines = await getSalesItemTrackingLines(
            orderNo,
            lineNo,
            itemNo,
            locationCode,
          );
          setTrackingLines(lines);
        } catch (error) {
          console.error("Error fetching tracking lines:", error);
        } finally {
          setIsLoadingTrackingLines(false);
        }
      };
      fetchLots();
      fetchTrackingLines();
    } else {
      setAvailableLots([]);
      setTrackingLines([]);
      setLotNo("");
      setExpirationDate("");
      setQuantity("");
      setEditingLine(null);
      setIsDeleting(null);
    }
  }, [open, line, orderNo, lineNo, itemNo, locationCode]);

  const handleLotSelect = (lot: LotAvailability) => {
    setLotNo(lot.LotNo);
    const expDate = lot.Expiration_Date?.split("T")[0] || "";
    setExpirationDate(expDate);
    const suggestedQty = Math.min(
      lot.RemainingQty || 0,
      availableForAssignment,
    );
    setQuantity(suggestedQty.toString());
  };

  const refreshTrackingLines = async () => {
    if (!line || !itemNo || !locationCode) return;
    try {
      const lines = await getSalesItemTrackingLines(
        orderNo,
        lineNo,
        itemNo,
        locationCode,
      );
      setTrackingLines(lines);
    } catch (error) {
      console.error("Error refreshing tracking lines:", error);
    }
  };

  const handleSave = async () => {
    if (!line) return;

    const quantityValue = parseFloat(quantity) || 0;
    if (!lotNo.trim()) {
      toast.error("Lot No. is required");
      return;
    }
    if (!quantityValue || quantityValue <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (quantityValue > availableForAssignment) {
      toast.error(
        `Quantity exceeds available amount. Available: ${availableForAssignment.toLocaleString()} (Remaining: ${remainingQuantity.toLocaleString()}, Already Assigned: ${assignedQuantity.toLocaleString()})`,
      );
      return;
    }

    if (editingLine) {
      setIsSaving(true);
      try {
        await modifyItemTrackingLine({
          entryNo: editingLine.Entry_No,
          positive: editingLine.Positive ?? false,
          quantityBase: -Math.abs(quantityValue),
          qtyToHandlBase: -Math.abs(quantityValue),
        });
        toast.success("Item tracking updated successfully");
        onSave();
        await refreshTrackingLines();
        setLotNo("");
        setExpirationDate("");
        setQuantity("");
        setEditingLine(null);
      } catch (error) {
        console.error("Error updating item tracking:", error);
        const { message, code } = extractApiError(error);
        setApiError({ title: "Update Failed", message, code });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setIsSaving(true);
    try {
      await assignSalesItemTracking({
        orderNo,
        lineNo,
        itemNo,
        locationCode,
        quantity: quantityValue,
        lotNo: lotNo.trim(),
        expirationDate: expirationDate || undefined,
      });
      toast.success("Item tracking assigned successfully");
      onSave();
      await refreshTrackingLines();
      setLotNo("");
      setExpirationDate("");
      setQuantity("");
    } catch (error) {
      console.error("Error assigning item tracking:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Tracking Failed", message, code });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditLine = (l: SalesItemTrackingLine) => {
    setEditingLine(l);
    setLotNo(l.Lot_No || "");
    setExpirationDate(l.Expiration_Date?.split("T")[0] || "");
    setQuantity(Math.abs(l.Quantity_Base || 0).toString());
  };

  const handleCancelEdit = () => {
    setEditingLine(null);
    setLotNo("");
    setExpirationDate("");
    setQuantity("");
  };

  const handleDeleteLine = (l: SalesItemTrackingLine) => {
    setLineToDelete(l);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!lineToDelete) return;
    setIsDeleting(lineToDelete.Entry_No);
    setDeleteConfirmOpen(false);
    try {
      await deleteSalesItemTrackingLine(
        lineToDelete.Entry_No,
        lineToDelete.Positive ?? false,
      );
      toast.success("Item tracking deleted successfully");
      onSave();
      await refreshTrackingLines();
    } catch (error) {
      console.error("Error deleting item tracking:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: "Delete Failed", message, code });
    } finally {
      setIsDeleting(null);
      setLineToDelete(null);
    }
  };

  if (!line) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-[95vw] flex-col gap-0 p-0 sm:max-w-[85vw] md:max-w-4xl lg:max-w-6xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6 md:px-8">
            <DialogTitle className="text-lg">
              {editingLine
                ? "Edit Item Tracking (Sales Line)"
                : "Assign Item Tracking (Sales Line)"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
              <div className="flex h-100 flex-col overflow-hidden rounded-md border">
                <div className="bg-muted border-b px-4 py-3 font-medium">
                  Available Lots
                </div>
                <div className="flex-1 overflow-auto">
                  {isLoadingLots ? (
                    <div className="flex h-40 flex-col items-center justify-center gap-2">
                      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                      <p className="text-muted-foreground text-sm">
                        Loading lots...
                      </p>
                    </div>
                  ) : availableLots.length === 0 ? (
                    <div className="text-muted-foreground flex h-40 items-center justify-center p-4 text-center text-sm">
                      No available lots found for this item and location.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8">Lot No.</TableHead>
                          <TableHead className="h-8 text-right">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableLots.map((lot, index) => (
                          <TableRow
                            key={`${lot.LotNo}-${index}`}
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleLotSelect(lot)}
                          >
                            <TableCell className="py-2 font-medium">
                              {lot.LotNo}
                              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                <Calendar className="h-3 w-3" />
                                {lot.Expiration_Date
                                  ? lot.Expiration_Date.split("T")[0]
                                  : "-"}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {(lot.RemainingQty || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {editingLine && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-medium">Editing Tracking Line</p>
                    <p className="mt-1 text-xs">
                      Modifying Entry #{editingLine.Entry_No}. Click &quot;Cancel
                      Edit&quot; to create a new tracking line instead.
                    </p>
                  </div>
                )}

                {availableForAssignment <= 0 && !editingLine && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                    <p className="font-medium">No Quantity Available</p>
                    <p className="mt-1 text-xs">
                      All quantity has been assigned. You can edit or delete
                      existing tracking lines.
                    </p>
                  </div>
                )}

                <div className="bg-muted/50 space-y-2 rounded-md p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item No:</span>
                    <span className="font-medium">{itemNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{locationCode}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="lotNo" className="text-sm">
                      Lot No.
                    </Label>
                    <Input
                      id="lotNo"
                      value={lotNo}
                      onChange={(e) => setLotNo(e.target.value)}
                      placeholder="Select or enter lot no"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expirationDate" className="text-sm">
                      Expiration Date
                    </Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity" className="text-sm">
                      Quantity to Assign
                    </Label>
                    <Input
                      id="quantity"
                      type="text"
                      inputMode="decimal"
                      value={quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                          setQuantity(val);
                        }
                      }}
                      placeholder="Enter quantity"
                    />
                    <div className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                      <p className="flex justify-between">
                        <span>Total Remaining:</span>
                        <span className="font-medium">
                          {remainingQuantity.toLocaleString()}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>Already Assigned:</span>
                        <span className="font-medium">
                          {assignedQuantity.toLocaleString()}
                        </span>
                      </p>
                      <p className="flex justify-between border-t pt-0.5">
                        <span className="font-medium">
                          Available to Assign:
                        </span>
                        <span
                          className={
                            availableForAssignment > 0
                              ? "font-semibold text-green-600 dark:text-green-400"
                              : "font-semibold text-red-600 dark:text-red-400"
                          }
                        >
                          {availableForAssignment.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-6 border-t" />
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                Existing Item Tracking Lines
              </h3>
              <div className="max-h-60 overflow-auto rounded-md border">
                {isLoadingTrackingLines ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                    <span className="text-muted-foreground ml-2 text-sm">
                      Loading tracking lines...
                    </span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8">Item No.</TableHead>
                        <TableHead className="h-8">Lot No.</TableHead>
                        <TableHead className="h-8">Location</TableHead>
                        <TableHead className="h-8 text-right">Quantity</TableHead>
                        <TableHead className="h-8 text-right">
                          Qty to Handle
                        </TableHead>
                        <TableHead className="h-8">Expiration</TableHead>
                        <TableHead className="h-8 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackingLines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            <div className="text-muted-foreground flex flex-col items-center justify-center gap-1">
                              <p className="text-sm">
                                No tracking lines assigned yet
                              </p>
                              <p className="text-xs">
                                Assign a lot number above to create tracking
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        trackingLines.map((l, index) => (
                          <TableRow
                            key={`${l.Entry_No}-${index}`}
                            className={
                              editingLine?.Entry_No === l.Entry_No
                                ? "bg-blue-100/50"
                                : ""
                            }
                          >
                            <TableCell className="py-2 font-medium">
                              {l.Item_No || "-"}
                            </TableCell>
                            <TableCell className="py-2">
                              {l.Lot_No || "-"}
                            </TableCell>
                            <TableCell className="py-2">
                              {l.Location_Code || "-"}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {l.Quantity_Base?.toLocaleString() ?? "-"}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {l.Qty_to_Handl_Base?.toLocaleString() ?? "-"}
                            </TableCell>
                            <TableCell className="py-2">
                              {l.Expiration_Date
                                ? l.Expiration_Date.split("T")[0]
                                : "-"}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleEditLine(l)}
                                  disabled={!!editingLine}
                                  title="Edit tracking line"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                  onClick={() => handleDeleteLine(l)}
                                  disabled={isDeleting === l.Entry_No}
                                  title="Delete tracking line"
                                >
                                  {isDeleting === l.Entry_No ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-4 py-4 sm:px-6 md:px-8">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {editingLine && (
              <Button variant="destructive" onClick={handleCancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancel Edit
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={
                isSaving || (!editingLine && availableForAssignment <= 0)
              }
              title={
                !editingLine && availableForAssignment <= 0
                  ? "No available quantity for assignment"
                  : undefined
              }
            >
              {isSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingLine ? "Update" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item Tracking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tracking line? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="destructive">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
