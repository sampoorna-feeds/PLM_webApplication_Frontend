"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updatePurchaseLine,
  type PurchaseLine,
} from "@/lib/api/services/purchase-orders.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";

interface PurchaseOrderLineEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: PurchaseLine | null;
  orderNo: string;
  hasTracking?: boolean;
  onSave: () => void;
  onAssignTracking?: () => void;
}

export function PurchaseOrderLineEditDialog({
  open,
  onOpenChange,
  line,
  orderNo,
  hasTracking = false,
  onSave,
  onAssignTracking,
}: PurchaseOrderLineEditDialogProps) {
  const [description, setDescription] = useState("");
  const [qtyToReceive, setQtyToReceive] = useState("");
  const [qtyToInvoice, setQtyToInvoice] = useState("");
  const [gstGroupCode, setGstGroupCode] = useState("");
  const [hsnSacCode, setHsnSacCode] = useState("");
  const [exempted, setExempted] = useState(false);
  const [tdsSection, setTdsSection] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  useEffect(() => {
    if (!line) return;
    setDescription(line.Description || "");
    setQtyToReceive(line.Qty_to_Receive?.toString() || "");
    setQtyToInvoice(line.Qty_to_Invoice?.toString() || "");
    setGstGroupCode(line.GST_Group_Code || "");
    setHsnSacCode(line.HSN_SAC_Code || "");
    setExempted(line.Exempted ?? false);
    setTdsSection(line.TDS_Section_Code || "");
  }, [line]);

  const handleSave = async () => {
    if (!line || !line.Line_No || !orderNo) return;

    const receiveVal = parseFloat(qtyToReceive) || 0;
    const invoiceVal = parseFloat(qtyToInvoice) || 0;

    if (receiveVal < 0) {
      toast.error("Qty to Receive cannot be negative");
      return;
    }
    if (invoiceVal < 0) {
      toast.error("Qty to Invoice cannot be negative");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (description.trim() !== (line.Description || "").trim()) {
        payload.Description = description.trim();
      }
      if (receiveVal !== (line.Qty_to_Receive || 0)) {
        payload.Qty_to_Receive = receiveVal;
      }
      if (invoiceVal !== (line.Qty_to_Invoice || 0)) {
        payload.Qty_to_Invoice = invoiceVal;
      }
      if (exempted !== (line.Exempted ?? false)) {
        payload.Exempted = exempted;
      }
      if (gstGroupCode.trim() !== (line.GST_Group_Code || "").trim()) {
        payload.GST_Group_Code = gstGroupCode.trim();
      }
      if (hsnSacCode.trim() !== (line.HSN_SAC_Code || "").trim()) {
        payload.HSN_SAC_Code = hsnSacCode.trim();
      }
      if (tdsSection.trim() !== (line.TDS_Section_Code || "").trim()) {
        payload.TDS_Section_Code = tdsSection.trim();
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        setIsSaving(false);
        onOpenChange(false);
        return;
      }

      await updatePurchaseLine(orderNo, line.Line_No, payload);
      toast.success("Line updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      const { message, code } = extractApiError(error);
      setApiError({ title: "Update Failed", message, code });
    } finally {
      setIsSaving(false);
    }
  };

  if (!line) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-8 sm:max-w-180">
          <DialogHeader>
            <DialogTitle className={hasTracking ? "text-red-600" : ""}>
              Purchase Line Details
              {hasTracking && (
                <span className="ml-2 text-sm font-normal">(Has Tracking)</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* ── Read-only display ── */}
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Item No.
              </Label>
              <div className="col-span-3 text-sm font-medium">
                {line.No || "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Type
              </Label>
              <div className="col-span-3 text-sm">{line.Type || "-"}</div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                UOM
              </Label>
              <div className="col-span-3 text-sm">
                {line.Unit_of_Measure_Code || line.Unit_of_Measure || "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Quantity
              </Label>
              <div className="col-span-3 text-sm font-medium">
                {line.Quantity ?? "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Qty Received
              </Label>
              <div className="col-span-3 text-sm font-medium">
                {line.Quantity_Shipped ?? "-"}
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label className="text-muted-foreground text-left text-sm sm:text-right">
                Qty Invoiced
              </Label>
              <div className="col-span-3 text-sm font-medium">
                {line.Quantity_Invoiced ?? "-"}
              </div>
            </div>

            {/* ── Editable fields ── */}
            <div className="my-1 border-t" />

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="po-line-description"
                className="text-left text-sm sm:text-right"
              >
                Description
              </Label>
              <Input
                id="po-line-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="po-line-qty-receive"
                className="text-left text-sm sm:text-right"
              >
                Qty to Receive
              </Label>
              <Input
                id="po-line-qty-receive"
                type="text"
                inputMode="decimal"
                value={qtyToReceive}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                    setQtyToReceive(val);
                  }
                }}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="po-line-qty-invoice"
                className="text-left text-sm sm:text-right"
              >
                Qty to Invoice
              </Label>
              <Input
                id="po-line-qty-invoice"
                type="text"
                inputMode="decimal"
                value={qtyToInvoice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                    setQtyToInvoice(val);
                  }
                }}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="po-line-gst-group"
                className="text-left text-sm sm:text-right"
              >
                GST Group Code
              </Label>
              <Input
                id="po-line-gst-group"
                value={gstGroupCode}
                onChange={(e) => setGstGroupCode(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="po-line-hsn"
                className="text-left text-sm sm:text-right"
              >
                HSN/SAC Code
              </Label>
              <Input
                id="po-line-hsn"
                value={hsnSacCode}
                onChange={(e) => setHsnSacCode(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="po-line-exempted"
                className="text-left text-sm sm:text-right"
              >
                Exempted
              </Label>
              <div className="col-span-3 flex items-center">
                <Checkbox
                  id="po-line-exempted"
                  checked={exempted}
                  onCheckedChange={(checked) => setExempted(checked === true)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
              <Label
                htmlFor="po-line-tds-section"
                className="text-left text-sm sm:text-right"
              >
                TDS Section
              </Label>
              <Input
                id="po-line-tds-section"
                value={tdsSection}
                onChange={(e) => setTdsSection(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>

          {hasTracking && onAssignTracking && (
            <div className="mt-3 border-t pt-4 pb-2">
              <Button
                variant="outline"
                className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  onAssignTracking();
                  onOpenChange(false);
                }}
              >
                Item Tracking
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
