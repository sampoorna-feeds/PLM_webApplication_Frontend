"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CalculatorInput } from "@/components/ui/calculator-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  checkItemTracking,
  getItemAvailableQuantity,
  getTransferItemByNo,
  getTransferItemLedgerEntries,
  getTransferLine,
  postTransferBardana,
  updateTransferLine,
  type TransferItemLedgerEntry,
  type TransferLine,
} from "@/lib/api/services/transfer-orders.service";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { Loader2, Package, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TransferBardanaDialog } from "./transfer-bardana-dialog";
import { TransferOrderItemTrackingDialog } from "./transfer-order-item-tracking-dialog";

interface TransferOrderLineDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  line: TransferLine;
  locationCode?: string;
  transferToCode?: string;
  onSuccess: () => void;
}

export function TransferOrderLineDetailsDialog({
  isOpen,
  onOpenChange,
  line,
  locationCode,
  transferToCode,
  onSuccess,
}: TransferOrderLineDetailsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTracking, setHasTracking] = useState(false);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<TransferItemLedgerEntry[]>(
    [],
  );
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isLoadingLine, setIsLoadingLine] = useState(false);
  const [canAddBardana, setCanAddBardana] = useState(false);
  const [isBardanaOpen, setIsBardanaOpen] = useState(false);
  const [isPostingBardana, setIsPostingBardana] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");

  const [formData, setFormData] = useState<Partial<TransferLine>>({ ...line });

  useEffect(() => {
    setFormData({ ...line });
    if (isOpen && line?.Item_No && locationCode) {
      const activeLocationCode = locationCode;

      const fetchData = async () => {
        setHasTracking(false);
        setAvailableQty(null);
        setIsLoadingTracking(true);
        setIsLoadingStock(true);
        setIsLoadingLine(true);
        try {
          // Parallel fetch for ledger tracking, stock, item master, and latest line data
          const [
            ledgerTrackingResult,
            availableResult,
            itemResult,
            currentLineResult,
          ] = await Promise.all([
            checkItemTracking(line.Item_No!, activeLocationCode),
            getItemAvailableQuantity(line.Item_No!, activeLocationCode),
            getTransferItemByNo(line.Item_No!),
            getTransferLine(line.Document_No, line.Line_No),
          ]);

          if (currentLineResult) {
            setFormData((prev) => ({
              ...prev,
              GST_Credit: currentLineResult.GST_Credit,
              GST_Group_Code: currentLineResult.GST_Group_Code,
              HSN_SAC_Code: currentLineResult.HSN_SAC_Code,
              Exempted: !!currentLineResult.Exempted,
            }));
          }

          // An item has tracking if it either has tracked entries OR is setup for tracking in item master
          const isTrackedInMaster = !!itemResult?.Item_Tracking_Code?.trim();
          const tracked = ledgerTrackingResult || isTrackedInMaster;
          setHasTracking(tracked);
          setCanAddBardana(itemResult?.Bardana_Generation_Enable === true);
          setAvailableQty(availableResult);

          if (!tracked) {
            setIsLoadingLedger(true);
            try {
              const entries = await getTransferItemLedgerEntries(
                line.Item_No!,
                activeLocationCode,
              );
              setLedgerEntries(entries);
            } finally {
              setIsLoadingLedger(false);
            }
          }
        } catch (err) {
          console.error("Error fetching line metadata:", err);
        } finally {
          setIsLoadingTracking(false);
          setIsLoadingStock(false);
          setIsLoadingLine(false);
        }
      };
      fetchData();
    }
  }, [line, isOpen, locationCode]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!line?.Document_No || !line?.Line_No) return;

    // Validation: Qty to Ship <= Available Quantity
    const qtyToShip = Number(formData.Qty_to_Ship);
    if (availableQty !== null && qtyToShip > availableQty) {
      toast.error(
        `Cannot ship ${qtyToShip}. Only ${availableQty} available at ${locationCode}`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTransferLine(line.Document_No, line.Line_No, {
        Description: formData.Description,
        Quantity: Number(formData.Quantity),
        Qty_to_Ship: Number(formData.Qty_to_Ship),
        Qty_to_Receive: Number(formData.Qty_to_Receive),
        GST_Group_Code: formData.GST_Group_Code,
        HSN_SAC_Code: formData.HSN_SAC_Code,
        Exempted: !!formData.Exempted,
        Appl_to_Item_Entry: formData.Appl_to_Item_Entry
          ? Number(formData.Appl_to_Item_Entry)
          : undefined,
        GST_Credit: formData.GST_Credit,
      });
      toast.success("Line details updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating line:", err);
      toast.error(err.message || "Failed to update line details");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostBardana = async () => {
    if (!line?.Document_No || !line?.Line_No) return;

    setIsPostingBardana(true);
    try {
      await postTransferBardana(line.Document_No, line.Line_No);
      toast.success("Bardana posted successfully");
    } catch (err: any) {
      console.error("Error posting bardana:", err);
      toast.error(err.message || "Failed to post bardana");
    } finally {
      setIsPostingBardana(false);
    }
  };

  const infoLabelClass = "text-muted-foreground text-sm font-medium w-32";
  const infoValueClass = "text-sm font-bold text-foreground";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-background border-border flex max-h-[90vh] w-full sm:max-w-[800px] flex-col overflow-hidden rounded-2xl p-0">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="flex items-center justify-between border-b pb-4 -mx-6 px-6 mb-4">
            <h2
              className={cn(
                "text-base font-semibold transition-colors duration-300",
                hasTracking ? "text-red-500" : "text-foreground",
              )}
            >
              Transfer Line Details
            </h2>

            <div className="flex items-center gap-2">
              {canAddBardana && (
                <div className="flex items-center gap-2 mr-4 border-r pr-4 border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-primary border-border hover:bg-primary/5 flex h-8 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold"
                    onClick={() => setIsBardanaOpen(true)}
                    disabled={isPostingBardana}
                  >
                    <Package className="h-3 w-3" />
                    Add Bardana
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border flex h-8 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold text-green-600 hover:bg-green-500/10"
                    onClick={handlePostBardana}
                    disabled={isPostingBardana}
                  >
                    {isPostingBardana ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Package className="h-3 w-3" />
                    )}
                    Post Bardana
                  </Button>
                </div>
              )}
              
              <Button
                onClick={handleSave}
                disabled={isSubmitting}
                size="sm"
                className="h-8 rounded-lg bg-green-600 px-6 text-xs text-white hover:bg-green-700 font-bold"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Save
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 rounded-lg px-6 text-xs font-bold"
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Header Info Section */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl bg-muted/30 p-4 border border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Available Qty</span>
              <span
                className={cn(
                  "text-sm font-black text-foreground",
                  availableQty !== null && availableQty <= 0 && "text-red-500",
                  isLoadingStock && "animate-pulse",
                )}
              >
                {isLoadingStock ? "..." : (availableQty?.toLocaleString() ?? "-")}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Description</span>
              <span className="text-sm font-black text-foreground line-clamp-1">
                {formData.Description || "-"}
              </span>
            </div>
          </div>

          {!locationCode && hasTracking && (
            <div className="animate-in fade-in zoom-in rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-xs font-medium text-red-500 duration-300">
              Note: Select a source location in the header to manage item
              tracking correctly.
            </div>
          )}

          <div className="bg-border h-px w-full" />

          {/* Editable Fields Section - 3-column Grid */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-12">
            <div className="space-y-1.5 md:col-span-4">
              <label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                GST Group Code
              </label>
              <Input
                value={formData.GST_Group_Code || ""}
                readOnly
                className="bg-muted/50 text-muted-foreground h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5 md:col-span-4">
              <label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                HSN/SAC Code
              </label>
              <Input
                value={formData.HSN_SAC_Code || ""}
                readOnly
                className="bg-muted/50 text-muted-foreground h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5 md:col-span-4">
              <label className="text-muted-foreground flex items-center justify-between text-[10px] uppercase tracking-wider font-bold">
                GST Credit
                {isLoadingLine && (
                  <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
                )}
              </label>
              <SearchableSelect
                options={[
                  { value: "Availment", label: "Availment" },
                  { value: "Non-Availment", label: "Non-Availment" },
                ]}
                value={formData.GST_Credit || ""}
                onValueChange={(v) => handleChange("GST_Credit", v)}
                placeholder={isLoadingLine ? "Loading..." : "Select GST Credit"}
                isLoading={isLoadingLine}
                allowCustomValue={true}
                className="h-9 transition-all focus:ring-1 focus:ring-red-500/50"
              />
            </div>

            <div className="space-y-1.5 md:col-span-4">
              <label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                Qty. to Ship
              </label>
              <CalculatorInput
                value={formData.Qty_to_Ship?.toString() || "0"}
                onValueChange={(v) => handleChange("Qty_to_Ship", v)}
                className="h-9 focus:border-red-500/50 transition-colors font-bold"
              />
            </div>

            <div className="space-y-1.5 md:col-span-4">
              <label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                Qty. to Receive
              </label>
              <CalculatorInput
                value={formData.Qty_to_Receive?.toString() || "0"}
                onValueChange={(v) => handleChange("Qty_to_Receive", v)}
                className="h-9 focus:border-red-500/50 transition-colors font-bold"
              />
            </div>

            {!isLoadingTracking && !hasTracking && (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-1.5 duration-300 md:col-span-4">
                <label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                  Applies to Entry
                </label>
                <div className="relative">
                  <Input
                    value={formData.Appl_to_Item_Entry?.toString() || ""}
                    readOnly
                    onClick={() =>
                      !isLoadingLedger && setIsLedgerModalOpen(true)
                    }
                    placeholder={
                      isLoadingLedger
                        ? "Loading entries..."
                        : "Click to select Entry No."
                    }
                    className="h-9 cursor-pointer pr-10 focus:ring-1 focus:ring-red-500/50 text-xs font-bold"
                  />
                  <div
                    className="absolute top-2.5 right-3 cursor-pointer opacity-50 transition-opacity hover:opacity-100"
                    onClick={() =>
                      !isLoadingLedger && setIsLedgerModalOpen(true)
                    }
                  >
                    <Search className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 md:col-span-12 pt-2">
              <div
                className={cn(
                  "flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-colors",
                  formData.Exempted
                    ? "border-green-600 bg-green-600"
                    : "bg-muted border-input",
                )}
                onClick={() => handleChange("Exempted", !formData.Exempted)}
              >
                {formData.Exempted && (
                  <div className="text-[8px] text-white">✔</div>
                )}
              </div>
              <label
                className="text-muted-foreground cursor-pointer text-xs font-medium"
                onClick={() => handleChange("Exempted", !formData.Exempted)}
              >
                Exempted
              </label>
            </div>

                <Dialog
                  open={isLedgerModalOpen}
                  onOpenChange={setIsLedgerModalOpen}
                >
                  <DialogContent className="flex max-h-[85vh] w-fit max-w-[95vw] sm:max-w-[95vw] flex-col overflow-hidden p-0">
                    <DialogHeader className="p-6 pb-2">
                      <DialogTitle>Select Ledger Entry</DialogTitle>
                      <div className="relative mt-4">
                        <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                        <Input
                          placeholder="Search by Entry No., Document No., or Lot No..."
                          value={ledgerSearchQuery}
                          onChange={(e) => setLedgerSearchQuery(e.target.value)}
                          className="h-10 pl-9"
                        />
                      </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 pt-0">
                      <div className="border-border overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader className="bg-muted sticky top-0 z-10 whitespace-nowrap">
                            <TableRow>
                              <TableHead className="w-[100px]">
                                Entry No.
                              </TableHead>
                              <TableHead>Posting Date</TableHead>
                              <TableHead>Document No.</TableHead>
                              <TableHead className="text-right">
                                Quantity
                              </TableHead>
                              <TableHead className="text-right">
                                Rem. Qty
                              </TableHead>
                              <TableHead>Lot No.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgerEntries
                              .filter(
                                (e) =>
                                  e.Entry_No.toString().includes(
                                    ledgerSearchQuery,
                                  ) ||
                                  e.Document_No?.toLowerCase().includes(
                                    ledgerSearchQuery.toLowerCase(),
                                  ) ||
                                  e.Lot_No?.toLowerCase().includes(
                                    ledgerSearchQuery.toLowerCase(),
                                  ),
                              )
                              .map((entry) => (
                                <TableRow
                                  key={entry.Entry_No}
                                  className="hover:bg-muted/50 cursor-pointer transition-colors whitespace-nowrap"
                                  onClick={() => {
                                    handleChange(
                                      "Appl_to_Item_Entry",
                                      entry.Entry_No.toString(),
                                    );
                                    setIsLedgerModalOpen(false);
                                  }}
                                >
                                  <TableCell className="font-bold">
                                    {entry.Entry_No}
                                  </TableCell>
                                  <TableCell>
                                    {entry.Posting_Date
                                      ? formatDate(entry.Posting_Date)
                                      : "-"}
                                  </TableCell>
                                  <TableCell>{entry.Document_No}</TableCell>
                                  <TableCell className="text-right">
                                    {entry.Quantity?.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-green-600">
                                    {entry.Remaining_Quantity?.toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {entry.Lot_No || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {ledgerEntries.length === 0 && !isLoadingLedger && (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-muted-foreground h-24 text-center"
                                >
                                  No ledger entries found for this item and
                                  location.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <DialogFooter className="bg-muted/20 border-t p-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsLedgerModalOpen(false)}
                      >
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {hasTracking && (
                <div className="border-border flex flex-wrap gap-3 border-t pt-4 mt-6">
                  <Button
                    variant="outline"
                    className="border-border h-10 flex-1 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => setIsTrackingOpen(true)}
                  >
                    Item Tracking
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>

      <TransferOrderItemTrackingDialog
        open={isTrackingOpen}
        onOpenChange={setIsTrackingOpen}
        orderNo={line.Document_No}
        locationCode={locationCode || ""}
        transferToCode={transferToCode}
        line={line}
        onSave={onSuccess}
      />

      {isBardanaOpen && (
        <TransferBardanaDialog
          isOpen={isBardanaOpen}
          onOpenChange={setIsBardanaOpen}
          documentNo={line.Document_No}
          lineNo={line.Line_No}
          lineDescription={formData.Description}
          locationCode={locationCode}
        />
      )}
    </Dialog>
  );
}
