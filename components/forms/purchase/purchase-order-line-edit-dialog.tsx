"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Trash2, Link2, Search, X } from "lucide-react";
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
  updatePurchaseLine,
  getGstGroupCodes,
  getHsnSacCodes,
  getItemLedgerEntriesForApply,
  type PurchaseLine,
  type ApplyItemLedgerEntry,
} from "@/lib/api/services/purchase-orders.service";
import { getVendorTDSGroupCodes } from "@/lib/api/services/tds.service";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { getItemByNo } from "@/lib/api/services/item.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";
import { BardanaDialog } from "./bardana-dialog";
import { ApplyItemEntryModal } from "@/components/forms/shared/apply-item-entry-modal";
import { cn } from "@/lib/utils";
import { ClearableField } from "@/components/ui/clearable-field";
import {
  getPurchaseLineQuantityConfig,
  type PurchaseLineDocumentType,
} from "./purchase-line-quantity-config";
interface PurchaseOrderLineEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: PurchaseLine | null;
  documentType?: PurchaseLineDocumentType;
  orderNo: string;
  vendorNo: string;
  onDelete?: (line: PurchaseLine) => void | Promise<void>;
  hasTracking?: boolean;
  onSave: () => void;
  onAssignTracking?: (line: PurchaseLine) => void;
  onOpenItemCharge?: (line: PurchaseLine) => void;
  updateLine?: (documentNo: string, lineNo: number, payload: Record<string, unknown>) => Promise<unknown>;
}

export function PurchaseOrderLineEditDialog({
  open,
  onOpenChange,
  line,
  documentType = "order",
  orderNo,
  vendorNo,
  onDelete,
  hasTracking = false,
  onSave,
  onAssignTracking,
  onOpenItemCharge,
  updateLine,
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
  const [faPostingType, setFaPostingType] = useState("");
  const [salvageValue, setSalvageValue] = useState("");
  const [noOfBags, setNoOfBags] = useState("");
  const [challanQty, setChallanQty] = useState("");
  const [weightQty, setWeightQty] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [outstandingQty, setOutstandingQty] = useState("");
  const [gstCredit, setGstCredit] = useState("");
  const [applToItemEntry, setApplToItemEntry] = useState<string>("");
  const [ledgerEntries, setLedgerEntries] = useState<ApplyItemLedgerEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isApplyItemEntryOpen, setIsApplyItemEntryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  const fieldInputClass =
    "disabled:opacity-100 disabled:text-foreground font-medium text-xs disabled:pointer-events-none";
  const [canAddBardana, setCanAddBardana] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBardanaOpen, setIsBardanaOpen] = useState(false);
  const quantityColumns = getPurchaseLineQuantityConfig(documentType);
  const showQtyColumns = documentType === "order" || documentType === "return-order";

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
    setFaPostingType((line.FA_Posting_Type || "").trim());
    setSalvageValue(
      line.Salvage_Value != null ? String(line.Salvage_Value) : "",
    );
    setNoOfBags(line.No_of_Bags != null ? String(line.No_of_Bags) : "");
    setChallanQty(line.Challan_Qty != null ? String(line.Challan_Qty) : "");
    setWeightQty(line.Weight_Qty != null ? String(line.Weight_Qty) : "");
    setActualQty(line.Actual_Qty != null ? String(line.Actual_Qty) : "");
    setOutstandingQty(line.Outstanding_Quantity != null ? String(line.Outstanding_Quantity) : "");
    setGstCredit(line.GST_Credit || "Non-Availment");
    setApplToItemEntry(line.Appl_to_Item_Entry ? String(line.Appl_to_Item_Entry) : "");
  }, [line]);

  const [tdsOptions, setTdsOptions] = useState<SearchableSelectOption[]>([]);
  const [gstOptions, setGstOptions] = useState<SearchableSelectOption[]>([]);
  const [hsnOptions, setHsnOptions] = useState<SearchableSelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState({
    tds: false,
    gst: false,
    hsn: false,
  });

  useEffect(() => {
    if (!open || !line?.No || (line.Type || "").trim() !== "Item") {
      setCanAddBardana(false);
      return;
    }

    let mounted = true;
    getItemByNo(String(line.No))
      .then((item) => {
        if (!mounted) return;
        setCanAddBardana(
          item?.Bardana_Generation_Enable === true && documentType !== "invoice",
        );
      })
      .catch((error) => {
        const { message } = extractApiError(error);
        console.error(
          `Error loading item bardana configuration for ${line.No}:`,
          message,
        );
        if (mounted) setCanAddBardana(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, line?.No]);

  // Load item ledger entries for Apply to Item Entry
  useEffect(() => {
    const itemNo = line?.No;
    const locationCode = line?.Location_Code;
    const isItem = (line?.Type || "").trim() === "Item";
    if (!open || !isItem || !itemNo || !locationCode) {
      setLedgerEntries([]);
      return;
    }
    let mounted = true;
    setIsLoadingLedger(true);
    getItemLedgerEntriesForApply(itemNo, locationCode)
      .then((entries) => { if (mounted) setLedgerEntries(entries); })
      .catch(() => { if (mounted) setLedgerEntries([]); })
      .finally(() => { if (mounted) setIsLoadingLedger(false); });
    return () => { mounted = false; };
  }, [open, line?.No, line?.Location_Code, line?.Type]);

  // Load TDS and GST groups on mount
  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function fetchTds() {
      if (!vendorNo) return;
      setLoadingOptions((p) => ({ ...p, tds: true }));
      try {
        const res = await getVendorTDSGroupCodes(vendorNo);
        if (mounted) {
          setTdsOptions(
            res.map((r) => ({
              value: r.TDS_Section || "",
              label: `${r.TDS_Section} - ${r.TDS_Section_Description || ""}`,
            })),
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoadingOptions((p) => ({ ...p, tds: false }));
      }
    }

    async function fetchGst() {
      setLoadingOptions((p) => ({ ...p, gst: true }));
      try {
        const res = await getGstGroupCodes();
        if (mounted) {
          setGstOptions(
            res.map((r) => ({
              value: r.Code,
              label: `${r.Code}`,
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

    fetchTds();
    fetchGst();

    return () => {
      mounted = false;
    };
  }, [open, vendorNo]);

  // Load HSN based on selected GST Group Code
  useEffect(() => {
    if (!open) return;
    if (!gstGroupCode) {
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
              label: `${r.Code}`,
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
    const receivedVal = parseFloat(qtyReceived) || 0;
    const invoicedVal = parseFloat(qtyInvoiced) || 0;
    const receiveVal = parseFloat(qtyToReceive) || 0;
    const invoiceVal = parseFloat(qtyToInvoice) || 0;

    if (qtyVal < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }
    if (receivedVal < 0) {
      toast.error("Qty Received cannot be negative");
      return;
    }
    if (invoicedVal < 0) {
      toast.error("Qty Invoiced cannot be negative");
      return;
    }
    if (receiveVal < 0) {
      toast.error("Qty to Receive cannot be negative");
      return;
    }
    if (invoiceVal < 0) {
      toast.error("Qty to Invoice cannot be negative");
      return;
    }
    if (receivedVal + receiveVal > qtyVal) {
      toast.error(
        `Qty Received (${receivedVal}) + Qty to Receive (${receiveVal}) cannot exceed Quantity (${qtyVal})`,
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (qtyVal !== (line.Quantity || 0)) payload.Quantity = qtyVal;
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
      if (exempted !== (line.Exempted ?? false)) payload.Exempted = exempted;
      if (gstGroupCode.trim() !== (line.GST_Group_Code || "").trim())
        payload.GST_Group_Code = gstGroupCode.trim();
      if (hsnSacCode.trim() !== (line.HSN_SAC_Code || "").trim())
        payload.HSN_SAC_Code = hsnSacCode.trim();
      if (tdsSection !== (line.TDS_Section_Code || ""))
        payload.TDS_Section_Code = tdsSection;
      if (gstCredit !== (line.GST_Credit || "Non-Availment"))
        payload.GST_Credit = gstCredit;

      if ((line.Type || "").trim() === "Fixed Asset") {
        if (faPostingType.trim() !== (line.FA_Posting_Type || "").trim()) {
          payload.FA_Posting_Type = faPostingType.trim();
        }

        const parsedSalvage =
          salvageValue.trim() === "" ? undefined : Number(salvageValue);
        if (
          parsedSalvage !== undefined &&
          !Number.isNaN(parsedSalvage) &&
          parsedSalvage !== (line.Salvage_Value ?? undefined)
        ) {
          payload.Salvage_Value = parsedSalvage;
        }
      }
      if (canAddBardana) {
        const bagsVal = noOfBags === "" ? undefined : parseInt(noOfBags, 10);
        if (
          !isNaN(bagsVal ?? NaN) &&
          bagsVal !== (line.No_of_Bags ?? undefined)
        ) {
          payload.No_of_Bags = bagsVal;
        }
      }

      if ((line.Type || "").trim() === "Item") {
        const cQty = parseFloat(challanQty) || 0;
        const wQty = parseFloat(weightQty) || 0;
        const aQty = parseFloat(actualQty) || 0;
        if (cQty !== (line.Challan_Qty || 0)) payload.Challan_Qty = cQty;
        if (wQty !== (line.Weight_Qty || 0)) payload.Weight_Qty = wQty;
        if (aQty !== (line.Actual_Qty || 0)) payload.Actual_Qty = aQty;
      }

      const applVal = applToItemEntry ? Number(applToItemEntry) : 0;
      if (applVal !== (line.Appl_to_Item_Entry ?? 0)) payload.Appl_to_Item_Entry = applVal;

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        setIsSaving(false);
        onOpenChange(false);
        return;
      }

      await (updateLine ?? updatePurchaseLine)(orderNo, line.Line_No, payload);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className={hasTracking ? "text-red-600" : ""}>
              Edit Purchase Line
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
                Item No
              </p>
              <p className="font-medium">{line.No || "—"}</p>
            </div>
            <div className="border-r border-b p-2 sm:border-r-0">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                Type
              </p>
              <p>{line.Type || "—"}</p>
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
                    {quantityColumns.firstCompletedLabel}
                  </p>
                  <p>{line.Quantity_Received || "0"}</p>
                </div>
                <div className="p-2">
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Outstanding Qty
                  </p>
                  <p className="font-medium">{line.Outstanding_Quantity || "0"}</p>
                </div>
              </>
            )}
          </div>

          {/* ── Editable fields ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Description — always first, always full width */}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="po-line-description" className="text-xs">
                Description
              </Label>
              <ClearableField
                value={description}
                onClear={() => setDescription("")}
              >
                <Input
                  id="po-line-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={fieldInputClass}
                />
              </ClearableField>
            </div>

            {(line.Type || "").trim() !== "" && (
              <>
                {/* Row 1 */}
                <div className="space-y-1">
                  <Label htmlFor="po-line-qty" className="text-xs">
                    Quantity
                  </Label>
                  <ClearableField
                    value={quantity}
                    onClear={() => setQuantity("")}
                  >
                    <Input
                      id="po-line-qty"
                      inputMode="decimal"
                      value={quantity}
                      onChange={(e) => {
                        if (isValidNum(e.target.value))
                          setQuantity(e.target.value);
                      }}
                      className={fieldInputClass}
                    />
                  </ClearableField>
                </div>

                {(line.Type || "").trim() === "Item" &&
                  documentType !== "invoice" &&
                  documentType !== "credit-memo" && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="po-line-challan-qty" className="text-xs">
                        Challan Qty
                      </Label>
                      <ClearableField
                        value={challanQty}
                        onClear={() => setChallanQty("")}
                      >
                        <Input
                          id="po-line-challan-qty"
                          inputMode="decimal"
                          value={challanQty}
                          onChange={(e) => {
                            if (isValidNum(e.target.value))
                              setChallanQty(e.target.value);
                          }}
                          className={fieldInputClass}
                        />
                      </ClearableField>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="po-line-weight-qty" className="text-xs">
                        Weight Qty
                      </Label>
                      <ClearableField
                        value={weightQty}
                        onClear={() => setWeightQty("")}
                      >
                        <Input
                          id="po-line-weight-qty"
                          inputMode="decimal"
                          value={weightQty}
                          onChange={(e) => {
                            if (isValidNum(e.target.value))
                              setWeightQty(e.target.value);
                          }}
                          className={fieldInputClass}
                        />
                      </ClearableField>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="po-line-actual-qty" className="text-xs">
                        Actual Qty
                      </Label>
                      <ClearableField
                        value={actualQty}
                        onClear={() => setActualQty("")}
                      >
                        <Input
                          id="po-line-actual-qty"
                          inputMode="decimal"
                          value={actualQty}
                          onChange={(e) => {
                            if (isValidNum(e.target.value))
                              setActualQty(e.target.value);
                          }}
                          className={fieldInputClass}
                        />
                      </ClearableField>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Short/Excess Qty</Label>
                      <Input
                        readOnly
                        value={(() => {
                          const w = parseFloat(weightQty) || 0;
                          const c = parseFloat(challanQty) || 0;
                          return (w - c).toFixed(3);
                        })()}
                        className={cn(fieldInputClass, "bg-muted/50")}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {(line.Type || "").trim() !== "" && (
              <>
                {(line.Type || "").trim() === "Fixed Asset" && (
                  <>
                    <div className="space-y-1">
                      <Label
                        htmlFor="po-line-fa-posting-type"
                        className="text-xs"
                      >
                        FA Posting Type
                      </Label>
                      <ClearableField
                        value={faPostingType}
                        onClear={() => setFaPostingType("")}
                      >
                        <Select
                          value={faPostingType || ""}
                          onValueChange={setFaPostingType}
                        >
                          <SelectTrigger
                            id="po-line-fa-posting-type"
                            className={fieldInputClass}
                          >
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Acquisition Cost">
                              Acquisition Cost
                            </SelectItem>
                            <SelectItem value="Maintenance">
                              Maintenance
                            </SelectItem>
                            <SelectItem value="Appreciation">
                              Appreciation
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </ClearableField>
                    </div>

                    <div className="space-y-1">
                      <Label
                        htmlFor="po-line-salvage-value"
                        className="text-xs"
                      >
                        Salvage Value
                      </Label>
                      <ClearableField
                        value={salvageValue}
                        onClear={() => setSalvageValue("")}
                      >
                        <Input
                          id="po-line-salvage-value"
                          inputMode="decimal"
                          value={salvageValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setSalvageValue(value);
                            }
                          }}
                          placeholder="0.00"
                          className={fieldInputClass}
                        />
                      </ClearableField>
                    </div>
                  </>
                )}

                {canAddBardana && (
                  <div className="space-y-1">
                    <Label htmlFor="po-line-bags" className="text-xs">
                      No. of Bags
                    </Label>
                    <ClearableField
                      value={noOfBags}
                      onClear={() => setNoOfBags("")}
                    >
                      <Input
                        id="po-line-bags"
                        inputMode="numeric"
                        placeholder="0"
                        value={noOfBags}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^[0-9]+$/.test(v)) setNoOfBags(v);
                        }}
                      />
                    </ClearableField>
                  </div>
                )}

                {/* Row 2 — qty pending fields (order / return-order only) */}
                {showQtyColumns && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="po-line-qty-receive" className="text-xs">
                        {quantityColumns.firstPendingLabel}
                      </Label>
                      <ClearableField
                        value={qtyToReceive}
                        onClear={() => setQtyToReceive("")}
                      >
                        <Input
                          id="po-line-qty-receive"
                          inputMode="decimal"
                          value={qtyToReceive}
                          onChange={(e) => {
                            if (isValidNum(e.target.value))
                              setQtyToReceive(e.target.value);
                          }}
                        />
                      </ClearableField>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="po-line-qty-invoice" className="text-xs">
                        {quantityColumns.secondPendingLabel}
                      </Label>
                      <ClearableField
                        value={qtyToInvoice}
                        onClear={() => setQtyToInvoice("")}
                      >
                        <Input
                          id="po-line-qty-invoice"
                          inputMode="decimal"
                          value={qtyToInvoice}
                          onChange={(e) => {
                            if (isValidNum(e.target.value))
                              setQtyToInvoice(e.target.value);
                          }}
                        />
                      </ClearableField>
                    </div>
                  </>
                )}

                {/* Row 3 */}
                <div className="space-y-1 overflow-hidden">
                  <Label htmlFor="po-line-gst-group" className="text-xs">
                    GST Group Code
                  </Label>
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
                  <Label htmlFor="po-line-hsn" className="text-xs">
                    HSN/SAC Code
                  </Label>
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
                      placeholder={
                        gstGroupCode
                          ? "Select HSN/SAC..."
                          : "Select GST Group first"
                      }
                      searchPlaceholder="Search HSN/SAC Codes..."
                      disabled={!gstGroupCode}
                      allowCustomValue={true}
                    />
                  </ClearableField>
                </div>

                {/* Row 4 */}
                <div className="space-y-1 overflow-hidden">
                  <Label htmlFor="po-line-tds-section" className="text-xs">
                    TDS Section
                  </Label>
                  <ClearableField
                    value={tdsSection}
                    onClear={() => setTdsSection("")}
                  >
                    <SearchableSelect
                      value={tdsSection}
                      onValueChange={setTdsSection}
                      options={tdsOptions}
                      isLoading={loadingOptions.tds}
                      placeholder="Select TDS Section..."
                      searchPlaceholder="Search TDS Section..."
                      allowCustomValue={true}
                    />
                  </ClearableField>
                </div>

                <div className="space-y-1 overflow-hidden">
                  <Label htmlFor="po-line-gst-credit" className="text-xs">
                    GST Credit
                  </Label>
                  <ClearableField
                    value={gstCredit}
                    onClear={() => setGstCredit("")}
                  >
                    <Select value={gstCredit} onValueChange={setGstCredit}>
                      <SelectTrigger className={cn("h-8", fieldInputClass)}>
                        <SelectValue placeholder="Select GST Credit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Availment">Availment</SelectItem>
                        <SelectItem value="Non-Availment">
                          Non-Availment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </ClearableField>
                </div>

                {(line.Type || "").trim() === "Item" && line.Location_Code && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Applies to Item Entry</Label>
                    <div className="group relative">
                      <Input
                        readOnly
                        value={(() => {
                          if (!applToItemEntry) return "";
                          const e = ledgerEntries.find((e) => String(e.Entry_No) === applToItemEntry);
                          return e
                            ? `#${e.Entry_No} · ${e.Document_No} · Rem: ${e.Remaining_Quantity ?? 0}`
                            : `Entry #${applToItemEntry}`;
                        })()}
                        placeholder={isLoadingLedger ? "Loading entries..." : "Click to select (optional)"}
                        className="bg-muted/30 h-8 cursor-pointer border-dashed pr-10 font-medium text-xs"
                        onClick={() => !isLoadingLedger && setIsApplyItemEntryOpen(true)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary absolute top-0 right-0 h-8 w-9"
                        onClick={() => !isLoadingLedger && setIsApplyItemEntryOpen(true)}
                        disabled={isLoadingLedger}
                      >
                        {isLoadingLedger ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {applToItemEntry && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setApplToItemEntry("");
                          }}
                          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-9 -translate-y-1/2 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-5">
                  <Checkbox
                    id="po-line-exempted"
                    checked={exempted}
                    onCheckedChange={(checked) => setExempted(checked === true)}
                  />
                  <Label
                    htmlFor="po-line-exempted"
                    className="cursor-pointer text-sm"
                  >
                    Exempted
                  </Label>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-2 gap-2">
            <div className="mr-auto flex items-center gap-2">
              {canAddBardana && line?.Line_No && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBardanaOpen(true);
                  }}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Add Bardana
                </Button>
              )}
              {(line.Type || "").trim() === "Charge (Item)" &&
                line?.Line_No && (
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
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
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
                  onClick={() => {
                    onAssignTracking(line);
                  }}
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

      <ApplyItemEntryModal
        isOpen={isApplyItemEntryOpen}
        onClose={() => setIsApplyItemEntryOpen(false)}
        entries={ledgerEntries}
        onSelect={(entry) => setApplToItemEntry(String(entry.Entry_No))}
        title={`Select Applies-to Item Entry — ${line?.No ?? ""}`}
        isLoading={isLoadingLedger}
        selectedEntryNo={applToItemEntry ? Number(applToItemEntry) : undefined}
      />

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />

      {isBardanaOpen && line && (
        <BardanaDialog
          isOpen={isBardanaOpen}
          onOpenChange={setIsBardanaOpen}
          documentNo={orderNo}
          lineNo={line.Line_No!}
          noOfBags={parseInt(noOfBags, 10) || line.No_of_Bags}
          lineDescription={description || line.Description}
        />
      )}
    </>
  );
}
