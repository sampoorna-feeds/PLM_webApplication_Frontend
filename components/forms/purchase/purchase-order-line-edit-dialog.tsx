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
  const [quantity, setQuantity] = useState("");
  const [qtyReceived, setQtyReceived] = useState("");
  const [qtyInvoiced, setQtyInvoiced] = useState("");
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
    setQuantity(line.Quantity?.toString() ?? "");
    setQtyReceived(line.Quantity_Received?.toString() ?? "");
    setQtyInvoiced(line.Quantity_Invoiced?.toString() ?? "");
    setDescription(line.Description || "");
    setQtyToReceive(line.Qty_to_Receive?.toString() ?? "");
    setQtyToInvoice(line.Qty_to_Invoice?.toString() ?? "");
    setGstGroupCode(line.GST_Group_Code || "");
    setHsnSacCode(line.HSN_SAC_Code || "");
    setExempted(line.Exempted ?? false);
    setTdsSection(line.TDS_Section_Code || "");
  }, [line]);

  const isValidNum = (v: string) => v === "" || /^[0-9]*\.?[0-9]*$/.test(v);

  const handleSave = async () => {
    if (!line || !line.Line_No || !orderNo) return;

    const qtyVal = parseFloat(quantity) || 0;
    const receivedVal = parseFloat(qtyReceived) || 0;
    const invoicedVal = parseFloat(qtyInvoiced) || 0;
    const receiveVal = parseFloat(qtyToReceive) || 0;
    const invoiceVal = parseFloat(qtyToInvoice) || 0;

    if (qtyVal < 0) { toast.error("Quantity cannot be negative"); return; }
    if (receivedVal < 0) { toast.error("Qty Received cannot be negative"); return; }
    if (invoicedVal < 0) { toast.error("Qty Invoiced cannot be negative"); return; }
    if (receiveVal < 0) { toast.error("Qty to Receive cannot be negative"); return; }
    if (invoiceVal < 0) { toast.error("Qty to Invoice cannot be negative"); return; }
    if (receivedVal + receiveVal > qtyVal) {
      toast.error(`Qty Received (${receivedVal}) + Qty to Receive (${receiveVal}) cannot exceed Quantity (${qtyVal})`);
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (qtyVal !== (line.Quantity || 0))
        payload.Quantity = qtyVal;
      if (receivedVal !== (line.Quantity_Received || 0))
        payload.Quantity_Received = receivedVal;
      if (invoicedVal !== (line.Quantity_Invoiced || 0))
        payload.Quantity_Invoiced = invoicedVal;
      if (description.trim() !== (line.Description || "").trim())
        payload.Description = description.trim();
      if (receiveVal !== (line.Qty_to_Receive || 0))
        payload.Qty_to_Receive = receiveVal;
      if (invoiceVal !== (line.Qty_to_Invoice || 0))
        payload.Qty_to_Invoice = invoiceVal;
      if (exempted !== (line.Exempted ?? false))
        payload.Exempted = exempted;
      if (gstGroupCode.trim() !== (line.GST_Group_Code || "").trim())
        payload.GST_Group_Code = gstGroupCode.trim();
      if (hsnSacCode.trim() !== (line.HSN_SAC_Code || "").trim())
        payload.HSN_SAC_Code = hsnSacCode.trim();
      if (tdsSection.trim() !== (line.TDS_Section_Code || "").trim())
        payload.TDS_Section_Code = tdsSection.trim();

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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className={hasTracking ? "text-red-600" : ""}>
              Edit Purchase Line
              {hasTracking && (
                <span className="ml-2 text-sm font-normal text-red-500">(Has Tracking)</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* ── Info strip ── */}
          <div className="bg-muted/40 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border px-4 py-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Line</p>
              <p className="font-medium">{line.Line_No}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Item No</p>
              <p className="font-medium">{line.No || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Type</p>
              <p>{line.Type || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-wide">UOM</p>
              <p>{line.Unit_of_Measure_Code || line.Unit_of_Measure || "—"}</p>
            </div>
          </div>

          {/* ── Editable fields ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Row 1 */}
            <div className="space-y-1">
              <Label htmlFor="po-line-qty" className="text-xs">Quantity</Label>
              <Input
                id="po-line-qty"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => { if (isValidNum(e.target.value)) setQuantity(e.target.value); }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="po-line-description" className="text-xs">Description</Label>
              <Input
                id="po-line-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Row 2 */}
            <div className="space-y-1">
              <Label htmlFor="po-line-qty-receive" className="text-xs">Qty to Receive</Label>
              <Input
                id="po-line-qty-receive"
                inputMode="decimal"
                value={qtyToReceive}
                onChange={(e) => { if (isValidNum(e.target.value)) setQtyToReceive(e.target.value); }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="po-line-qty-invoice" className="text-xs">Qty to Invoice</Label>
              <Input
                id="po-line-qty-invoice"
                inputMode="decimal"
                value={qtyToInvoice}
                onChange={(e) => { if (isValidNum(e.target.value)) setQtyToInvoice(e.target.value); }}
              />
            </div>

            {/* Row 3 — received / invoiced (BC-managed, editable on request) */}
            <div className="space-y-1">
              <Label htmlFor="po-line-qty-received" className="text-xs">Qty Received</Label>
              <Input
                id="po-line-qty-received"
                inputMode="decimal"
                value={qtyReceived}
                onChange={(e) => { if (isValidNum(e.target.value)) setQtyReceived(e.target.value); }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="po-line-qty-invoiced" className="text-xs">Qty Invoiced</Label>
              <Input
                id="po-line-qty-invoiced"
                inputMode="decimal"
                value={qtyInvoiced}
                onChange={(e) => { if (isValidNum(e.target.value)) setQtyInvoiced(e.target.value); }}
              />
            </div>

            {/* Row 3 */}
            <div className="space-y-1">
              <Label htmlFor="po-line-gst-group" className="text-xs">GST Group Code</Label>
              <Input
                id="po-line-gst-group"
                value={gstGroupCode}
                onChange={(e) => setGstGroupCode(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="po-line-hsn" className="text-xs">HSN/SAC Code</Label>
              <Input
                id="po-line-hsn"
                value={hsnSacCode}
                onChange={(e) => setHsnSacCode(e.target.value)}
              />
            </div>

            {/* Row 4 */}
            <div className="space-y-1">
              <Label htmlFor="po-line-tds-section" className="text-xs">TDS Section</Label>
              <Input
                id="po-line-tds-section"
                value={tdsSection}
                onChange={(e) => setTdsSection(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <Checkbox
                id="po-line-exempted"
                checked={exempted}
                onCheckedChange={(checked) => setExempted(checked === true)}
              />
              <Label htmlFor="po-line-exempted" className="cursor-pointer text-sm">
                Exempted
              </Label>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2">
            {hasTracking && onAssignTracking && (
              <Button
                variant="outline"
                className="mr-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  onAssignTracking();
                  onOpenChange(false);
                }}
              >
                Item Tracking
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
