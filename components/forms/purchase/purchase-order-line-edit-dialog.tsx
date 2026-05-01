"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Trash2, Link2, Search, X, User, Briefcase } from "lucide-react";
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
  type DimensionValue,
  getEmployeesPage,
  getAssignmentsPage,
} from "@/lib/api/services/dimension.service";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { getItemByNo, getItemUnitOfMeasures } from "@/lib/api/services/item.service";
import { getUOMs, type UOM } from "@/lib/api/services/uom.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";
import { BardanaDialog } from "./bardana-dialog";
import { ApplyItemEntryModal } from "@/components/forms/shared/apply-item-entry-modal";
import { GenericLookupModal } from "@/components/forms/shared/generic-lookup-modal";
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
  const [shortcutDimCode4, setShortcutDimCode4] = useState("");
  const [shortcutDimCode5, setShortcutDimCode5] = useState("");
  const [applToItemEntry, setApplToItemEntry] = useState<string>("");
  const [ledgerEntries, setLedgerEntries] = useState<ApplyItemLedgerEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isApplyItemEntryOpen, setIsApplyItemEntryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);
  const [uom, setUom] = useState("");
  const [uomOptions, setUomOptions] = useState<SearchableSelectOption[]>([]);
  const [loadingUoms, setLoadingUoms] = useState(false);

  const fieldInputClass =
    "h-8 disabled:opacity-100 disabled:text-foreground font-medium text-xs disabled:pointer-events-none";
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
    setShortcutDimCode4(line.ShortcutDimCode4 ? String(line.ShortcutDimCode4) : "");
    setShortcutDimCode5(line.ShortcutDimCode5 ? String(line.ShortcutDimCode5) : "");
    setApplToItemEntry(line.Appl_to_Item_Entry ? String(line.Appl_to_Item_Entry) : "");
    setUom(line.Unit_of_Measure_Code || "");
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

  // Load UOM options
  useEffect(() => {
    if (!open || !line) return;
    const type = (line.Type || "").trim();
    if (type === "") {
      setUomOptions([]);
      return;
    }

    let mounted = true;
    setLoadingUoms(true);

    if (type === "Item") {
      getItemUnitOfMeasures(line.No || "")
        .then((uoms) => {
          if (mounted) {
            setUomOptions(
              uoms.map((u) => ({
                value: u.Code,
                label: u.Code,
              })),
            );
          }
        })
        .catch(() => { if (mounted) setUomOptions([]); })
        .finally(() => { if (mounted) setLoadingUoms(false); });
    } else {
      getUOMs()
        .then((uoms) => {
          if (mounted) {
            setUomOptions(
              uoms.map((u) => ({
                value: u.Code,
                label: `${u.Code} - ${u.Description}`,
              })),
            );
          }
        })
        .catch(() => { if (mounted) setUomOptions([]); })
        .finally(() => { if (mounted) setLoadingUoms(false); });
    }
    return () => { mounted = false; };
  }, [open, line?.Type, line?.No]);

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
      if (shortcutDimCode4 !== (line.ShortcutDimCode4 || ""))
        payload.ShortcutDimCode4 = shortcutDimCode4;
      if (shortcutDimCode5 !== (line.ShortcutDimCode5 || ""))
        payload.ShortcutDimCode5 = shortcutDimCode5;
      if (uom !== (line.Unit_of_Measure_Code || ""))
        payload.Unit_of_Measure_Code = uom;

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
      const bagsVal = noOfBags === "" ? undefined : parseInt(noOfBags, 10);
      if (!isNaN(bagsVal ?? NaN) && bagsVal !== (line.No_of_Bags ?? undefined)) {
        payload.No_of_Bags = bagsVal;
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

    if (!onDelete) return;
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
        <DialogContent className="sm:max-w-3xl [&>button]:hidden">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
            <DialogTitle className={hasTracking ? "text-red-600" : ""}>
              Edit Purchase Line
              {hasTracking && (
                <span className="ml-2 text-sm font-normal text-red-500">
                  (Has Tracking)
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {onDelete && line.Line_No && (
                <Button
                  variant="outline"
                  className={cn(
                    "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-3 text-xs",
                  )}
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  Delete
                </Button>
              )}

              {canAddBardana && line.Line_No && (
                <Button
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => setIsBardanaOpen(true)}
                >
                  <Package className="mr-2 h-3.5 w-3.5" />
                  Add Bardana
                </Button>
              )}

              {(line.Type || "").trim() === "Charge (Item)" && line.Line_No && onOpenItemCharge && (
                <Button
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => onOpenItemCharge(line)}
                >
                  <Link2 className="mr-2 h-3.5 w-3.5" />
                  Item Charge
                </Button>
              )}

              {hasTracking && onAssignTracking && (
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs"
                  onClick={() => {
                    onAssignTracking(line);
                  }}
                >
                  Item Tracking
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || isDeleting} className="h-8 text-xs">
                {(isSaving || isDeleting) && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </DialogHeader>



          {/* ── Editable fields ── */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {/* Description — always first, takes 2 columns to leave room for Applies to Item Entry */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-2">
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
                {(line.Type || "").trim() === "Item" && line.Location_Code && (
                  <div className="space-y-1 sm:col-span-1 lg:col-span-1">
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

                <div className="space-y-1">
                  <Label htmlFor="po-line-uom" className="text-xs">
                    UOM
                  </Label>
                  <ClearableField value={uom} onClear={() => setUom("")}>
                    <SearchableSelect
                      value={uom}
                      onValueChange={setUom}
                      options={uomOptions}
                      isLoading={loadingUoms}
                      placeholder="Select UOM"
                      searchPlaceholder="Search UOM..."
                      className={fieldInputClass}
                    />
                  </ClearableField>
                </div>
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
                      className={fieldInputClass}
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
                      className={fieldInputClass}
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
                      className={fieldInputClass}
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

                {/* Dimension Row */}
                <div className="space-y-1 overflow-hidden">
                  <Label htmlFor="po-line-employee" className="text-xs">
                    Employee Code
                  </Label>
                  <GenericLookupModal<DimensionValue>
                    value={shortcutDimCode4}
                    onChange={(val) => setShortcutDimCode4(String(val))}
                    fetchData={getEmployeesPage}
                    columns={[
                      { id: "Code", label: "Code", width: "100px" },
                      { id: "Name", label: "Name", width: "150px" },
                    ]}
                    icon={<User className="h-3.5 w-3.5" />}
                    title="Select Employee"
                    placeholder="Select Employee..."
                    keyExtractor={(item) => item.Code}
                    displayValueExtractor={(item) =>
                      item.Name ? `${item.Code} - ${item.Name}` : item.Code
                    }
                  />
                </div>

                <div className="space-y-1 overflow-hidden">
                  <Label htmlFor="po-line-assignment" className="text-xs">
                    Assignment Code
                  </Label>
                  <GenericLookupModal<DimensionValue>
                    value={shortcutDimCode5}
                    onChange={(val) => setShortcutDimCode5(String(val))}
                    fetchData={getAssignmentsPage}
                    columns={[
                      { id: "Code", label: "Code", width: "100px" },
                      { id: "Name", label: "Name", width: "150px" },
                    ]}
                    icon={<Briefcase className="h-3.5 w-3.5" />}
                    title="Select Assignment"
                    placeholder="Select Assignment..."
                    keyExtractor={(item) => item.Code}
                    displayValueExtractor={(item) =>
                      item.Name ? `${item.Code} - ${item.Name}` : item.Code
                    }
                  />
                </div>



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
