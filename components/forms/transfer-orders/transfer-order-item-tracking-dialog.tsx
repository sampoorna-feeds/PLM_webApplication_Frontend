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
import {
  assignTransferItemTracking,
  getTransferItemTrackingLines,
  deleteTransferItemTrackingLine,
  getTransferItemAvailabilityByLot,
  modifyTransferItemTrackingLine,
  type TransferLotAvailability,
  type TransferLine,
  type TransferItemTrackingLine,
} from "@/lib/api/services/transfer-orders.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";

interface TransferOrderItemTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  orderNo: string;
  locationCode: string; // This should be the Transfer-from Code
  line: TransferLine | null;
  isReceipt?: boolean;
}

export function TransferOrderItemTrackingDialog({
  open,
  onOpenChange,
  onSave,
  orderNo,
  locationCode,
  line,
  isReceipt = false,
}: TransferOrderItemTrackingDialogProps) {
  const [lotNo, setLotNo] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [availableLots, setAvailableLots] = useState<TransferLotAvailability[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(false);
  const [trackingLines, setTrackingLines] = useState<TransferItemTrackingLine[]>([]);
  const [isLoadingTrackingLines, setIsLoadingTrackingLines] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  const [editingLine, setEditingLine] = useState<TransferItemTrackingLine | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<TransferItemTrackingLine | null>(null);

  const itemNo = line?.Item_No ?? "";
  const lineNo = line?.Line_No ?? 0;
  
  // For transfers, we track either ship or receive quantity
  const totalQuantity = useMemo(() => {
    return isReceipt ? (line?.Qty_to_Receive || 0) : (line?.Qty_to_Ship || 0);
  }, [line, isReceipt]);

  const assignedQuantity = useMemo(() => {
    if (editingLine) {
      return trackingLines
        .filter((l) => l.Entry_No !== editingLine.Entry_No)
        .reduce((sum, l) => sum + Math.abs(l.Quantity_Base || 0), 0);
    }
    return trackingLines.reduce((sum, l) => sum + Math.abs(l.Quantity_Base || 0), 0);
  }, [trackingLines, editingLine]);

  const availableForAssignment = useMemo(
    () => Math.max(0, totalQuantity - assignedQuantity),
    [totalQuantity, assignedQuantity]
  );

  useEffect(() => {
    if (open && line && itemNo && locationCode) {
      const fetchLots = async () => {
        setIsLoadingLots(true);
        try {
          const lots = await getTransferItemAvailabilityByLot(itemNo, locationCode);
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
          const lines = await getTransferItemTrackingLines(
            orderNo,
            lineNo,
            itemNo,
            locationCode,
            isReceipt
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
  }, [open, line, orderNo, lineNo, itemNo, locationCode, isReceipt]);

  const handleLotSelect = (lot: TransferLotAvailability) => {
    setLotNo(lot.LotNo);
    const expDate = lot.Expiration_Date?.split("T")[0] || "";
    setExpirationDate(expDate);
    const suggestedQty = Math.min(lot.RemainingQty || 0, availableForAssignment);
    setQuantity(suggestedQty.toString());
  };

  const refreshTrackingLines = async () => {
    if (!line || !itemNo || !locationCode) return;
    try {
      const lines = await getTransferItemTrackingLines(
        orderNo,
        lineNo,
        itemNo,
        locationCode,
        isReceipt
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
    
    if (quantityValue > availableForAssignment && !editingLine) {
        toast.error(`Quantity exceeds available amount. Available: ${availableForAssignment.toLocaleString()}`);
        return;
    }

    setIsSaving(true);
    try {
      if (editingLine) {
        await modifyTransferItemTrackingLine({
          entryNo: editingLine.Entry_No,
          positive: editingLine.Positive ?? false,
          quantityBase: isReceipt ? Math.abs(quantityValue) : -Math.abs(quantityValue),
          qtyToHandlBase: isReceipt ? Math.abs(quantityValue) : -Math.abs(quantityValue),
          lotNo: lotNo.trim(),
          expirationDate: expirationDate || undefined,
        });
        toast.success("Item tracking updated successfully");
      } else {
        await assignTransferItemTracking({
          orderNo,
          lineNo,
          itemNo,
          locationCode,
          quantity: quantityValue,
          lotNo: lotNo.trim(),
          expirationDate: expirationDate || undefined,
          isReceipt
        });
        toast.success("Item tracking assigned successfully");
      }
      
      onSave();
      await refreshTrackingLines();
      setLotNo("");
      setExpirationDate("");
      setQuantity("");
      setEditingLine(null);
    } catch (error) {
      console.error("Error saving item tracking:", error);
      const { message, code } = extractApiError(error);
      setApiError({ title: editingLine ? "Update Failed" : "Assignment Failed", message, code });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditLine = (l: TransferItemTrackingLine) => {
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

  const handleDeleteLine = (l: TransferItemTrackingLine) => {
    setLineToDelete(l);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!lineToDelete) return;
    setIsDeleting(lineToDelete.Entry_No);
    setDeleteConfirmOpen(false);
    try {
      await deleteTransferItemTrackingLine(lineToDelete.Entry_No, lineToDelete.Positive ?? false);
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
        <DialogContent className="flex max-h-[90vh] max-w-[95vw] flex-col gap-0 p-0 sm:max-w-[85vw] md:max-w-4xl lg:max-w-6xl bg-[#0a0a0a] border-[#222] text-white overflow-hidden rounded-2xl">
          <DialogHeader className="border-b border-[#222] px-4 py-4 sm:px-6 md:px-8">
            <DialogTitle className="text-lg font-semibold">
              {editingLine
                ? "Edit Item Tracking (Transfer Line)"
                : "Assign Item Tracking (Transfer Line)"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 md:px-8 scrollbar-hide">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
              {/* Left Side: Available Lots */}
              <div className="flex h-[400px] flex-col overflow-hidden rounded-xl border border-[#222] bg-[#111]">
                <div className="bg-[#1a1a1a] border-b border-[#222] px-4 py-3 font-medium text-sm">
                  Available Lots
                </div>
                <div className="flex-1 overflow-auto scrollbar-hide">
                  {isLoadingLots ? (
                    <div className="flex h-40 flex-col items-center justify-center gap-2">
                      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                      <p className="text-muted-foreground text-sm">Loading lots...</p>
                    </div>
                  ) : availableLots.length === 0 ? (
                    <div className="text-muted-foreground flex h-40 items-center justify-center p-4 text-center text-sm">
                      No available lots found for this item and location.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-[#1a1a1a] sticky top-0 z-10">
                        <TableRow className="border-[#222] hover:bg-transparent">
                          <TableHead className="h-9 text-xs font-semibold text-muted-foreground">Lot No.</TableHead>
                          <TableHead className="h-9 text-xs font-semibold text-muted-foreground text-right">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableLots.map((lot, index) => (
                          <TableRow
                            key={`${lot.LotNo}-${index}`}
                            className="border-[#222] hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                            onClick={() => handleLotSelect(lot)}
                          >
                            <TableCell className="py-2.5 font-medium text-sm">
                              {lot.LotNo}
                              <div className="text-muted-foreground flex items-center gap-1 text-[10px] mt-0.5">
                                <Calendar className="h-3 w-3" />
                                {lot.Expiration_Date ? lot.Expiration_Date.split("T")[0] : "-"}
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 text-right text-sm font-semibold">
                              {(lot.RemainingQty || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              {/* Right Side: Assignment Form */}
              <div className="space-y-4">
                {editingLine && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-400">
                    <p className="font-medium">Editing Tracking Line</p>
                    <p className="mt-1 text-xs opacity-80">
                      Modifying Entry #{editingLine.Entry_No}. Click "Cancel Edit" to create a new tracking line.
                    </p>
                  </div>
                )}

                {availableForAssignment <= 0 && !editingLine && (
                  <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-sm text-orange-400">
                    <p className="font-medium">No Quantity Available</p>
                    <p className="mt-1 text-xs opacity-80">
                      All quantity has been assigned. You can edit or delete existing tracking lines.
                    </p>
                  </div>
                )}

                <div className="bg-[#111] border border-[#222] space-y-2 rounded-xl p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item No:</span>
                    <span className="font-bold">{itemNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-bold">{locationCode}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Lot No.</Label>
                    <Input
                      value={lotNo}
                      onChange={(e) => setLotNo(e.target.value)}
                      placeholder="Select or enter lot no"
                      className="bg-[#111] border-[#222] h-10 text-sm focus:border-red-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Expiration Date</Label>
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="bg-[#111] border-[#222] h-10 text-sm focus:border-red-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Quantity to Assign</Label>
                    <Input
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
                      className="bg-[#111] border-[#222] h-10 text-sm focus:border-red-500/50 transition-colors font-semibold"
                    />
                    
                    <div className="bg-[#111]/50 p-3 rounded-xl border border-[#222] mt-3 space-y-1.5 text-xs">
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Total to Track:</span>
                        <span className="font-bold">{totalQuantity.toLocaleString()}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">Already Assigned:</span>
                        <span className="font-bold">{assignedQuantity.toLocaleString()}</span>
                      </p>
                      <div className="h-px bg-[#222] my-1" />
                      <p className="flex justify-between">
                        <span className="font-semibold">Available to Assign:</span>
                        <span className={availableForAssignment > 0 ? "font-bold text-green-500" : "font-bold text-red-500"}>
                          {availableForAssignment.toLocaleString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Existing Lines */}
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Existing Item Tracking Lines
                {trackingLines.length > 0 && (
                    <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full border border-red-500/20">
                        {trackingLines.length}
                    </span>
                )}
              </h3>
              <div className="max-h-60 overflow-auto rounded-xl border border-[#222] bg-[#111] scrollbar-hide">
                {isLoadingTrackingLines ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                    <span className="text-muted-foreground ml-3 text-sm">Loading tracks...</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-[#1a1a1a] sticky top-0 z-10">
                      <TableRow className="border-[#222] hover:bg-transparent">
                        <TableHead className="h-9 text-xs font-semibold text-muted-foreground">Item No.</TableHead>
                        <TableHead className="h-9 text-xs font-semibold text-muted-foreground">Lot No.</TableHead>
                        <TableHead className="h-9 text-xs font-semibold text-muted-foreground">Location</TableHead>
                        <TableHead className="h-9 text-xs font-semibold text-muted-foreground text-right">Quantity</TableHead>
                        <TableHead className="h-9 text-xs font-semibold text-muted-foreground">Expiration</TableHead>
                        <TableHead className="h-9 text-xs font-semibold text-muted-foreground text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trackingLines.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="h-32 text-center">
                            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                                  <X className="h-5 w-5 opacity-20" />
                              </div>
                              <p className="text-sm font-medium">No tracking lines assigned yet</p>
                              <p className="text-[10px] opacity-60">Assign a lot number above to create tracking</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        trackingLines.map((l, index) => (
                          <TableRow
                            key={`${l.Entry_No}-${index}`}
                            className={cn(
                                "border-[#222] transition-colors",
                                editingLine?.Entry_No === l.Entry_No ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-[#1a1a1a]"
                            )}
                          >
                            <TableCell className="py-2.5 text-xs font-medium">{l.Item_No || "-"}</TableCell>
                            <TableCell className="py-2.5 text-xs font-bold">{l.Lot_No || "-"}</TableCell>
                            <TableCell className="py-2.5 text-xs">{l.Location_Code || "-"}</TableCell>
                            <TableCell className="py-2.5 text-xs text-right font-bold">
                              {Math.abs(l.Quantity_Base || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="py-2.5 text-xs">
                              {l.Expiration_Date ? l.Expiration_Date.split("T")[0] : "-"}
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-[#222] hover:text-white"
                                  onClick={() => handleEditLine(l)}
                                  disabled={!!editingLine}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"
                                  onClick={() => handleDeleteLine(l)}
                                  disabled={isDeleting === l.Entry_No}
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

          <DialogFooter className="border-t border-[#222] px-4 py-4 sm:px-6 md:px-8 bg-[#0a0a0a]">
            <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="bg-[#1a1a1a] border-[#222] hover:bg-[#222] text-white rounded-lg px-6 h-10 text-sm"
            >
              Close
            </Button>
            {editingLine && (
              <Button 
                variant="destructive" 
                onClick={handleCancelEdit}
                className="rounded-lg px-6 h-10 text-sm bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600/20"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Edit
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || (!editingLine && availableForAssignment <= 0)}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-8 h-10 text-sm font-semibold transition-all shadow-lg shadow-green-900/20"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLine ? "Update" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-[#0a0a0a] border-[#222] text-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item Tracking?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this tracking line for lot {lineToDelete?.Lot_No}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1a1a1a] border-[#222] text-white hover:bg-[#222] rounded-lg">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
