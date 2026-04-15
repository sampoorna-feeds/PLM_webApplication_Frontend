"use client";

import { useEffect, useState } from "react";
import { Loader2, Link2, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getGstGroupCodes,
  getHsnSacCodes,
} from "@/lib/api/services/purchase-orders.service";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";
import { cn } from "@/lib/utils";
import { ClearableField } from "@/components/ui/clearable-field";
import type { SalesLine } from "@/lib/api/services/sales-orders.service";
import type { SalesDocumentType } from "./sales-document-config";

interface SalesOrderLineEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: SalesLine | null;
  documentType?: SalesDocumentType;
  orderNo: string;
  onDelete?: (line: SalesLine) => void | Promise<void>;
  hasTracking?: boolean;
  onSave: () => void;
  onAssignTracking?: (line: SalesLine) => void;
  onOpenItemCharge?: (line: SalesLine) => void;
  updateLine: (
    documentNo: string,
    lineNo: number,
    payload: Record<string, unknown>,
  ) => Promise<unknown>;
}

export function SalesOrderLineEditDialog({
  open,
  onOpenChange,
  line,
  documentType = "order",
  orderNo,
  onDelete,
  hasTracking = false,
  onSave,
  onAssignTracking,
  onOpenItemCharge,
  updateLine,
}: SalesOrderLineEditDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [qtyShipped, setQtyShipped] = useState("");
  const [qtyInvoiced, setQtyInvoiced] = useState("");
  const [description, setDescription] = useState("");
  const [qtyToShip, setQtyToShip] = useState("");
  const [qtyToInvoice, setQtyToInvoice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [gstGroupCode, setGstGroupCode] = useState("");
  const [hsnSacCode, setHsnSacCode] = useState("");
  const [exempted, setExempted] = useState(false);
  const [foc, setFoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  const [gstOptions, setGstOptions] = useState<SearchableSelectOption[]>([]);
  const [hsnOptions, setHsnOptions] = useState<SearchableSelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState({
    gst: false,
    hsn: false,
  });

  const fieldInputClass =
    "disabled:opacity-100 disabled:text-foreground font-medium text-xs disabled:pointer-events-none";

  const showQtyColumns =
    documentType === "order" || documentType === "return-order";

  // Labels vary by document type (order ships; return-order receives back)
  const qtyToShipLabel =
    documentType === "return-order" ? "Qty to Return" : "Qty to Ship";
  const qtyShippedLabel =
    documentType === "return-order" ? "Qty Returned" : "Qty Shipped";

  useEffect(() => {
    if (!line) return;
    setQuantity(line.Quantity?.toString() ?? "");
    setQtyShipped(line.Quantity_Shipped?.toString() ?? "");
    setQtyInvoiced(line.Quantity_Invoiced?.toString() ?? "");
    setDescription(line.Description || "");
    setQtyToShip(line.Qty_to_Ship?.toString() ?? "");
    setQtyToInvoice(line.Qty_to_Invoice?.toString() ?? "");
    setUnitPrice(line.Unit_Price?.toString() ?? "");
    setDiscountPct(line.Line_Discount_Percent?.toString() ?? "");
    setGstGroupCode(line.GST_Group_Code || "");
    setHsnSacCode(line.HSN_SAC_Code || "");
    setExempted(line.Exempted ?? false);
    setFoc((line as unknown as Record<string, unknown>).FOC === true);
  }, [line]);

  // Load GST group codes when dialog opens
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    async function fetchGst() {
      setLoadingOptions((p) => ({ ...p, gst: true }));
      try {
        const res = await getGstGroupCodes();
        if (mounted) {
          setGstOptions(
            res.map((r) => ({
              value: r.Code,
              label: r.Code,
              description: r.GST_Group_Type,
            })),
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoadingOptions((p) => ({ ...p, gst: false }));
      }
    }
    fetchGst();
    return () => {
      mounted = false;
    };
  }, [open]);

  // Load HSN based on selected GST Group Code
  useEffect(() => {
    if (!open || !gstGroupCode) {
      setHsnOptions([]);
      return;
    }
    let mounted = true;
    async function fetchHsn() {
      setLoadingOptions((p) => ({ ...p, hsn: true }));
      try {
        const res = await getHsnSacCodes(gstGroupCode);
        if (mounted) {
          setHsnOptions(
            res.map((r) => ({
              value: r.Code,
              label: r.Code,
              description: r.Type,
            })),
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoadingOptions((p) => ({ ...p, hsn: false }));
      }
    }
    fetchHsn();
    return () => {
      mounted = false;
    };
  }, [open, gstGroupCode]);

  const isValidNum = (v: string) => v === "" || /^[0-9]*\.?[0-9]*$/.test(v);

  const handleSave = async () => {
    if (!line || !line.Line_No || !orderNo) return;

    const qtyVal = parseFloat(quantity) || 0;
    const shipVal = parseFloat(qtyToShip) || 0;
    const invoiceVal = parseFloat(qtyToInvoice) || 0;
    const upVal = parseFloat(unitPrice) || 0;
    const discVal = parseFloat(discountPct) || 0;

    if (qtyVal < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }
    if (shipVal < 0) {
      toast.error("Qty to ship cannot be negative");
      return;
    }
    if (invoiceVal < 0) {
      toast.error("Qty to invoice cannot be negative");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (qtyVal !== (line.Quantity || 0)) payload.Quantity = qtyVal;
      if (description.trim() !== (line.Description || "").trim())
        payload.Description = description.trim();
      if (showQtyColumns) {
        if (shipVal !== (line.Qty_to_Ship || 0)) payload.Qty_to_Ship = shipVal;
      }
      if (invoiceVal !== (line.Qty_to_Invoice || 0))
        payload.Qty_to_Invoice = invoiceVal;
      if (upVal !== (line.Unit_Price || 0)) payload.Unit_Price = upVal;
      if (discVal !== (line.Line_Discount_Percent || 0))
        payload.Line_Discount_Percent = discVal;
      if (exempted !== (line.Exempted ?? false)) payload.Exempted = exempted;
      if (foc !== ((line as unknown as Record<string, unknown>).FOC === true))
        payload.FOC = foc;
      if (gstGroupCode.trim() !== (line.GST_Group_Code || "").trim())
        payload.GST_Group_Code = gstGroupCode.trim();
      if (hsnSacCode.trim() !== (line.HSN_SAC_Code || "").trim())
        payload.HSN_SAC_Code = hsnSacCode.trim();

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        setIsSaving(false);
        onOpenChange(false);
        return;
      }

      await updateLine(orderNo, line.Line_No, payload);
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

  const handleDelete = async () => {
    if (!line || !onDelete || !orderNo) return;
    if (!confirm("Are you sure you want to delete this line?")) return;
    setIsDeleting(true);
    try {
      await onDelete(line);
      onOpenChange(false);
    } catch (error) {
      const { message, code } = extractApiError(error);
      setApiError({ title: "Delete Failed", message, code });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!line) return null;

  const lineType = (line.Type || "").trim();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className={hasTracking ? "text-red-600" : ""}>
              Edit Sales Line
              {hasTracking && (
                <span className="ml-2 text-sm font-normal text-red-500">
                  (Has Tracking)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* ── Info strip ── */}
          <div className="bg-muted/40 grid grid-cols-2 overflow-hidden rounded-md border text-sm sm:grid-cols-3">
            <div className="border-r border-b p-2">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Line
              </p>
              <p className="font-medium">{line.Line_No}</p>
            </div>
            <div className="border-b p-2 sm:border-r">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {lineType === "G/L Account" ? "GL Account" : "Item No"}
              </p>
              <p className="font-medium">{line.No || "—"}</p>
            </div>
            <div className="border-r border-b p-2 sm:border-r-0">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Type
              </p>
              <p>{lineType || "—"}</p>
            </div>
            <div className="border-b p-2 sm:border-r sm:border-b-0">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                UOM
              </p>
              <p>{line.Unit_of_Measure_Code || line.Unit_of_Measure || "—"}</p>
            </div>
            {showQtyColumns && (
              <>
                <div className="border-r p-2 sm:border-b-0">
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    {qtyShippedLabel}
                  </p>
                  <p>{line.Quantity_Shipped ?? "0"}</p>
                </div>
                <div className="p-2">
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Qty Invoiced
                  </p>
                  <p>{line.Quantity_Invoiced ?? "0"}</p>
                </div>
              </>
            )}
          </div>

          {/* ── Editable fields ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Description — always first, always full width */}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sl-description" className="text-xs">
                Description
              </Label>
              <ClearableField value={description} onClear={() => setDescription("")}>
                <Input
                  id="sl-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={fieldInputClass}
                />
              </ClearableField>
            </div>

            {lineType !== "" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="sl-qty" className="text-xs">
                    Quantity
                  </Label>
                  <ClearableField value={quantity} onClear={() => setQuantity("")}>
                    <Input
                      id="sl-qty"
                      inputMode="decimal"
                      value={quantity}
                      onChange={(e) => {
                        if (isValidNum(e.target.value)) setQuantity(e.target.value);
                      }}
                      className={fieldInputClass}
                    />
                  </ClearableField>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sl-unit-price" className="text-xs">
                    Unit Price
                  </Label>
                  <ClearableField value={unitPrice} onClear={() => setUnitPrice("")}>
                    <Input
                      id="sl-unit-price"
                      inputMode="decimal"
                      value={unitPrice}
                      onChange={(e) => {
                        if (isValidNum(e.target.value)) setUnitPrice(e.target.value);
                      }}
                      className={fieldInputClass}
                    />
                  </ClearableField>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="sl-discount" className="text-xs">
                    Discount %
                  </Label>
                  <ClearableField value={discountPct} onClear={() => setDiscountPct("")}>
                    <Input
                      id="sl-discount"
                      inputMode="decimal"
                      value={discountPct}
                      onChange={(e) => {
                        if (isValidNum(e.target.value)) setDiscountPct(e.target.value);
                      }}
                      className={fieldInputClass}
                    />
                  </ClearableField>
                </div>

                {showQtyColumns && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="sl-qty-to-ship" className="text-xs">
                        {qtyToShipLabel}
                      </Label>
                      <ClearableField value={qtyToShip} onClear={() => setQtyToShip("")}>
                        <Input
                          id="sl-qty-to-ship"
                          inputMode="decimal"
                          value={qtyToShip}
                          onChange={(e) => {
                            if (isValidNum(e.target.value)) setQtyToShip(e.target.value);
                          }}
                        />
                      </ClearableField>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="sl-qty-to-invoice" className="text-xs">
                        Qty to Invoice
                      </Label>
                      <ClearableField value={qtyToInvoice} onClear={() => setQtyToInvoice("")}>
                        <Input
                          id="sl-qty-to-invoice"
                          inputMode="decimal"
                          value={qtyToInvoice}
                          onChange={(e) => {
                            if (isValidNum(e.target.value)) setQtyToInvoice(e.target.value);
                          }}
                        />
                      </ClearableField>
                    </div>
                  </>
                )}

                {/* GST / HSN */}
                <div className="space-y-1 overflow-hidden">
                  <Label className="text-xs">GST Group Code</Label>
                  <ClearableField
                    value={gstGroupCode}
                    onClear={() => {
                      setGstGroupCode("");
                      setHsnSacCode("");
                    }}
                  >
                    <SearchableSelect
                      value={gstGroupCode}
                      onValueChange={(val) => {
                        setGstGroupCode(val);
                        setHsnSacCode("");
                      }}
                      options={gstOptions}
                      isLoading={loadingOptions.gst}
                      placeholder="Select GST Group..."
                      searchPlaceholder="Search GST Groups..."
                      allowCustomValue={true}
                    />
                  </ClearableField>
                </div>

                <div className="space-y-1 overflow-hidden">
                  <Label className="text-xs">HSN/SAC Code</Label>
                  <ClearableField
                    value={hsnSacCode}
                    onClear={() => setHsnSacCode("")}
                    disabled={!gstGroupCode}
                  >
                    <SearchableSelect
                      value={hsnSacCode}
                      onValueChange={setHsnSacCode}
                      options={hsnOptions}
                      isLoading={loadingOptions.hsn}
                      placeholder={gstGroupCode ? "Select HSN/SAC..." : "Select GST Group first"}
                      searchPlaceholder="Search HSN/SAC Codes..."
                      disabled={!gstGroupCode}
                      allowCustomValue={true}
                    />
                  </ClearableField>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sl-exempted"
                      checked={exempted}
                      onCheckedChange={(checked) => setExempted(checked === true)}
                    />
                    <Label htmlFor="sl-exempted" className="cursor-pointer text-sm">
                      Exempted
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sl-foc"
                      checked={foc}
                      onCheckedChange={(checked) => setFoc(checked === true)}
                    />
                    <Label htmlFor="sl-foc" className="cursor-pointer text-sm">
                      FOC
                    </Label>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-2 gap-2">
            <div className="mr-auto flex items-center gap-2">
              {lineType === "Charge (Item)" && line?.Line_No && (
                <Button
                  variant="outline"
                  onClick={() => onOpenItemCharge?.(line)}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Item Charge Assignment
                </Button>
              )}
              {onDelete && line?.Line_No && (
                <Button
                  variant="outline"
                  className={cn(
                    "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive",
                  )}
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              )}
              {hasTracking && onAssignTracking && (
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onAssignTracking(line)}
                >
                  Item Tracking
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isDeleting}>
              {(isSaving || isDeleting) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
