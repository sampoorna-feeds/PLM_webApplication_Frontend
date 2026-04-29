"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculatorInput } from "@/components/ui/calculator-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldTitle } from "@/components/ui/field";
import { ClearableField } from "@/components/ui/clearable-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SearchableSelect as MasterSearchableSelect } from "@/components/forms/shared/searchable-select";
import {
  SearchableSelect as AppSearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  getItemUnitOfMeasures,
  getItemByNo,
  type Item,
  type ItemUnitOfMeasure,
} from "@/lib/api/services/item.service";
import { SalesItemSelectDialog } from "./sales-item-select-dialog";
import {
  getGLAccounts,
  searchGLAccounts,
  getGLAccountsPage,
  searchGLAccountsByField,
  type GLPostingAccount,
} from "@/lib/api/services/gl-account.service";
import {
  getFixedAssets,
  searchFixedAssets,
  getFixedAssetsPage,
  searchFixedAssetsByField,
  type FixedAsset,
} from "@/lib/api/services/fixed-asset.service";
import {
  getItemCharges,
  searchItemCharges,
  getItemChargesPage,
  searchItemChargesByField,
  type ItemCharge,
} from "@/lib/api/services/item-charge.service";
import {
  getGstGroupCodes,
  getHsnSacCodes,
} from "@/lib/api/services/purchase-orders.service";
import { getSalesPrice } from "@/lib/api/services/sales-price.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";
import type { SalesDocumentLineItem } from "@/lib/api/services/sales-order.service";
import type { SalesDocumentType } from "./sales-document-config";

type LineType = "G/L Account" | "Item" | "Fixed Asset" | "Charge (Item)" | "";

interface FormState {
  type: LineType;
  no: string;
  description: string;
  uom: string;
  quantity: string;
  unitPrice: string;
  mrp: string;
  discount: string;
  exempted: boolean;
  foc: boolean;
  gstGroupCode: string;
  hsnSacCode: string;
  faPostingType: string;
  salvageValue: string;
}

const EMPTY_FORM: FormState = {
  type: "Item",
  no: "",
  description: "",
  uom: "",
  quantity: "",
  unitPrice: "",
  mrp: "",
  discount: "",
  exempted: false,
  foc: false,
  gstGroupCode: "",
  hsnSacCode: "",
  faPostingType: "",
  salvageValue: "",
};

interface SalesAddLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNo: string;
  documentType?: SalesDocumentType;
  locationCode: string;
  customerPriceGroup?: string;
  orderDate?: string;
  onSave: () => void;
  addSingleLine: (
    documentNo: string,
    line: SalesDocumentLineItem,
    locationCode: string,
  ) => Promise<{ Line_No: number; [key: string]: unknown }>;
}

const fieldInputClass =
  "disabled:opacity-100 disabled:text-foreground font-medium text-xs disabled:pointer-events-none";

export function SalesAddLineDialog({
  open,
  onOpenChange,
  documentNo,
  documentType,
  locationCode,
  customerPriceGroup,
  orderDate,
  onSave,
  addSingleLine,
}: SalesAddLineDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [uomOptions, setUomOptions] = useState<ItemUnitOfMeasure[]>([]);
  const [gstOptions, setGstOptions] = useState<SearchableSelectOption[]>([]);
  const [hsnOptions, setHsnOptions] = useState<SearchableSelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState({
    gst: false,
    hsn: false,
    uom: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setUomOptions([]);
      setHsnOptions([]);
      setValidationError(null);
    }
  }, [open]);

  // Load GST groups on open
  useEffect(() => {
    if (!open) return;
    setLoadingOptions((p) => ({ ...p, gst: true }));
    getGstGroupCodes()
      .then((rows) =>
        setGstOptions(
          rows.map((r) => ({
            value: r.Code,
            label: r.Code,
            description: r.GST_Group_Type,
          })),
        ),
      )
      .catch(() => setGstOptions([]))
      .finally(() => setLoadingOptions((p) => ({ ...p, gst: false })));
  }, [open]);

  // Load HSN when GST Group changes
  useEffect(() => {
    if (!open || !form.gstGroupCode) {
      setHsnOptions([]);
      return;
    }
    setLoadingOptions((p) => ({ ...p, hsn: true }));
    getHsnSacCodes(form.gstGroupCode)
      .then((rows) =>
        setHsnOptions(
          rows.map((r) => ({ value: r.Code, label: r.Code, description: r.Type })),
        ),
      )
      .catch(() => setHsnOptions([]))
      .finally(() => setLoadingOptions((p) => ({ ...p, hsn: false })));
  }, [open, form.gstGroupCode]);

  // Load UOM when Item is selected
  useEffect(() => {
    if (!open || form.type !== "Item" || !form.no) {
      setUomOptions([]);
      return;
    }
    let mounted = true;
    setLoadingOptions((p) => ({ ...p, uom: true }));
    getItemUnitOfMeasures(form.no)
      .then((uoms) => {
        if (!mounted) return;
        setUomOptions(uoms);
        if (!form.uom && uoms.length > 0)
          setForm((p) => ({ ...p, uom: uoms[0].Code }));
      })
      .catch(() => mounted && setUomOptions([]))
      .finally(() => mounted && setLoadingOptions((p) => ({ ...p, uom: false })));
    return () => {
      mounted = false;
    };
  }, [open, form.type, form.no]);

  // Fetch sales price when item type is selected and item + UOM are chosen
  useEffect(() => {
    if (!open || form.type !== "Item" || !form.no || !form.uom) return;

    let cancelled = false;
    getSalesPrice({
      salesCode: customerPriceGroup || "",
      itemNo: form.no,
      location: locationCode || "",
      unitofmeasure: form.uom,
      orderDate,
    })
      .then((price) => {
        if (cancelled) return;
        if (!price) return;
        const up = Number(price.Unit_Price ?? 0);
        const mrp = Number(price.MRP ?? 0);
        setForm((p) => ({
          ...p,
          ...(up > 0 ? { unitPrice: String(up) } : {}),
          ...(mrp > 0 ? { mrp: String(mrp) } : {}),
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, form.type, form.no, form.uom, locationCode, customerPriceGroup, orderDate]);

  const amount = useMemo(() => {
    const q = parseFloat(form.quantity) || 0;
    const up = parseFloat(form.unitPrice) || 0;
    const disc = parseFloat(form.discount) || 0;
    return up * q - disc;
  }, [form.quantity, form.unitPrice, form.discount]);

  const set = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) =>
      setForm((p) => ({ ...p, [field]: value })),
    [],
  );

  const setNum = useCallback(
    (field: keyof FormState, value: string) => {
      if (value === "" || /^[0-9\+\-\*\/\.\(\)\s]*$/.test(value)) set(field, value as any);
    },
    [set],
  );

  const handleTypeChange = useCallback((type: LineType) => {
    setUomOptions([]);
    setForm((p) => ({
      ...EMPTY_FORM,
      type,
      gstGroupCode: p.gstGroupCode,
      hsnSacCode: p.hsnSacCode,
    }));
  }, []);

  const handleItemChange = useCallback(
    (value: string, item?: Item) => {
      if (!value && !item) {
        setUomOptions([]);
        setForm((p) => ({
          ...p,
          no: "",
          description: "",
          uom: "",
          unitPrice: "",
          mrp: "",
          exempted: false,
          gstGroupCode: "",
          hsnSacCode: "",
        }));
        return;
      }
      if (!item) return;
      const up = Number(item.Unit_Price ?? 0);
      setForm((p) => ({
        ...p,
        no: item.No,
        description: item.Description,
        uom: item.Sales_Unit_of_Measure || p.uom,
        unitPrice: up > 0 ? String(up) : p.unitPrice,
      }));
      // Load full card for GST/exempted
      getItemByNo(item.No)
        .then((card) => {
          if (!card) return;
          setForm((p) => ({
            ...p,
            exempted: card.Exempted ?? p.exempted,
            gstGroupCode: card.GST_Group_Code || p.gstGroupCode,
            hsnSacCode: card.HSN_SAC_Code || p.hsnSacCode,
            uom:
              card.Sales_Unit_of_Measure ||
              card.Purch_Unit_of_Measure ||
              p.uom,
          }));
        })
        .catch(() => {});
    },
    [],
  );

  const handleGLChange = useCallback((value: string, gl?: GLPostingAccount) => {
    if (!value && !gl) {
      setForm((p) => ({ ...p, no: "", description: "" }));
      return;
    }
    if (!gl) return;
    setForm((p) => ({ ...p, no: gl.No, description: gl.Name }));
  }, []);

  const handleFixedAssetChange = useCallback(
    (value: string, asset?: FixedAsset) => {
      if (!value && !asset) {
        setForm((p) => ({
          ...p,
          no: "",
          description: "",
          uom: "",
          exempted: false,
          gstGroupCode: "",
          hsnSacCode: "",
          faPostingType: "",
          salvageValue: "",
        }));
        return;
      }
      if (!asset) return;
      setForm((p) => ({
        ...p,
        no: asset.No,
        description: asset.Description,
        uom: "",
      }));
    },
    [],
  );

  const handleChargeChange = useCallback(
    (value: string, charge?: ItemCharge) => {
      if (!value && !charge) {
        setForm((p) => ({
          ...p,
          no: "",
          description: "",
          uom: "",
          exempted: false,
          gstGroupCode: "",
          hsnSacCode: "",
        }));
        return;
      }
      if (!charge) return;
      setForm((p) => ({
        ...p,
        no: charge.No,
        description: charge.Description || p.description,
        uom: "",
        exempted: charge.Exempted ?? p.exempted,
        gstGroupCode: charge.GST_Group_Code || p.gstGroupCode,
        hsnSacCode: charge.HSN_SAC_Code || p.hsnSacCode,
      }));
    },
    [],
  );

  const handleSubmit = async () => {
    setValidationError(null);

    if (form.type !== "" && !form.no) {
      setValidationError("Please select an item.");
      return;
    }
    if (!form.description.trim()) {
      setValidationError("Description is required.");
      return;
    }
    if (form.type !== "" && (parseFloat(form.quantity) || 0) <= 0) {
      setValidationError("Quantity must be greater than zero.");
      return;
    }

    setIsSaving(true);
    try {
      const line: SalesDocumentLineItem = {
        type: form.type,
        no: form.no,
        description: form.description.trim(),
        uom: form.uom || undefined,
        quantity: parseFloat(form.quantity) || 0,
        unitPrice: parseFloat(form.unitPrice) || undefined,
        mrp: documentType === "order" && form.mrp ? parseFloat(form.mrp) || undefined : undefined,
        discount: parseFloat(form.discount) || undefined,
        exempted: form.exempted || undefined,
        foc: form.foc || undefined,
        gstGroupCode: form.gstGroupCode || undefined,
        hsnSacCode: form.hsnSacCode || undefined,
        faPostingType:
          form.type === "Fixed Asset" ? form.faPostingType || undefined : undefined,
      };
      await addSingleLine(documentNo, line, locationCode);
      onSave();
      onOpenChange(false);
    } catch (error) {
      const { message, code } = extractApiError(error);
      setApiError({ title: "Add Line Failed", message, code });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* ── Type + Item selector ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldTitle>Type</FieldTitle>
                <ClearableField
                  value={form.type}
                  onClear={() => handleTypeChange("Item")}
                >
                  <Select
                    value={form.type === "" ? "None" : form.type || "Item"}
                    onValueChange={(v) =>
                      handleTypeChange(v === "None" ? "" : (v as LineType))
                    }
                  >
                    <SelectTrigger className={cn("h-8", fieldInputClass)}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G/L Account">G/L Account</SelectItem>
                      <SelectItem value="Item">Item</SelectItem>
                      <SelectItem value="Fixed Asset">Fixed Asset</SelectItem>
                      <SelectItem value="Charge (Item)">Charge Item</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                </ClearableField>
              </div>

              {form.type !== "" && (
                <div className="space-y-1">
                  <FieldTitle>Select Item</FieldTitle>
                  {form.type === "G/L Account" ? (
                    <ClearableField
                      key="sel-gl"
                      value={form.no}
                      onClear={() => handleGLChange("", undefined)}
                    >
                      <MasterSearchableSelect<GLPostingAccount>
                        key="ms-gl"
                        value={form.no}
                        onChange={handleGLChange}
                        placeholder="Select GL Account"
                        loadInitial={() => getGLAccounts(20)}
                        searchItems={searchGLAccounts}
                        loadMore={(skip, search) =>
                          getGLAccountsPage(skip, search)
                        }
                        getDisplayValue={(item) => `${item.No} - ${item.Name}`}
                        getItemValue={(item) => item.No}
                        supportsDualSearch
                        searchByField={(q, field) =>
                          searchGLAccountsByField(q, field === "No" ? "No" : "Name")
                        }
                      />
                    </ClearableField>
                  ) : form.type === "Fixed Asset" ? (
                    <ClearableField
                      key="sel-fa"
                      value={form.no}
                      onClear={() => handleFixedAssetChange("", undefined)}
                    >
                      <MasterSearchableSelect<FixedAsset>
                        key="ms-fa"
                        value={form.no}
                        onChange={handleFixedAssetChange}
                        placeholder="Select Fixed Asset"
                        loadInitial={() => getFixedAssets(20)}
                        searchItems={searchFixedAssets}
                        loadMore={(skip, search) =>
                          getFixedAssetsPage(skip, search)
                        }
                        getDisplayValue={(a) => `${a.No} - ${a.Description}`}
                        getItemValue={(a) => a.No}
                        supportsDualSearch
                        searchByField={(q, field) =>
                          searchFixedAssetsByField(
                            q,
                            field === "No" ? "No" : "Description",
                          )
                        }
                      />
                    </ClearableField>
                  ) : form.type === "Charge (Item)" ? (
                    <ClearableField
                      key="sel-charge"
                      value={form.no}
                      onClear={() => handleChargeChange("", undefined)}
                    >
                      <MasterSearchableSelect<ItemCharge>
                        key="ms-charge"
                        value={form.no}
                        onChange={handleChargeChange}
                        placeholder="Select Charge Item"
                        loadInitial={() => getItemCharges(20)}
                        searchItems={searchItemCharges}
                        loadMore={(skip, search) =>
                          getItemChargesPage(skip, search)
                        }
                        getDisplayValue={(c) =>
                          `${c.No} - ${c.Description || ""}`
                        }
                        getItemValue={(c) => c.No}
                        supportsDualSearch
                        searchByField={(q, field) =>
                          searchItemChargesByField(
                            q,
                            field === "No" ? "No" : "Description",
                          )
                        }
                      />
                    </ClearableField>
                  ) : (
                    <SalesItemSelectDialog
                      key="sel-item"
                      value={form.no}
                      onChange={handleItemChange}
                      placeholder="Select Item"
                      locationCode={locationCode || undefined}
                    />
                  )}
                </div>
              )}

              {/* Description — full width */}
              <div className="space-y-1 sm:col-span-2">
                <FieldTitle>Description</FieldTitle>
                <ClearableField
                  value={form.description}
                  onClear={() => set("description", "")}
                >
                  <Input
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Enter description"
                    className={cn("h-8", fieldInputClass)}
                  />
                </ClearableField>
              </div>

              {/* UOM — visible for all non-none types */}
              {form.type !== "" && (
                <div className="space-y-1">
                  <FieldTitle>UOM</FieldTitle>
                  <ClearableField
                    value={form.uom}
                    onClear={() => set("uom", "")}
                  >
                    {loadingOptions.uom ? (
                      <div className="flex h-8 items-center gap-2 text-xs">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </div>
                    ) : (
                      <Select
                        value={form.uom}
                        onValueChange={(v) => set("uom", v)}
                        disabled={uomOptions.length === 0}
                      >
                        <SelectTrigger className={cn("h-8", fieldInputClass)}>
                          <SelectValue placeholder="Select UOM" />
                        </SelectTrigger>
                        <SelectContent>
                          {uomOptions.map((u) => (
                            <SelectItem key={u.Code} value={u.Code}>
                              {u.Code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </ClearableField>
                </div>
              )}
            </div>

            {/* ── Pricing ── */}
            {form.type !== "" && (
              <div className="space-y-2 border-t pt-2">
                <h3 className="text-foreground text-xs font-medium">Pricing</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <FieldTitle>Quantity</FieldTitle>
                    <ClearableField
                      value={form.quantity}
                      onClear={() => set("quantity", "")}
                    >
                      <CalculatorInput
                        value={form.quantity}
                        onValueChange={(v) => setNum("quantity", v)}
                        placeholder="0.00"
                        className={cn("h-8", fieldInputClass)}
                      />
                    </ClearableField>
                  </div>

                  <div className="space-y-1">
                    <FieldTitle>Unit Price</FieldTitle>
                    <ClearableField
                      value={form.unitPrice}
                      onClear={() => set("unitPrice", "")}
                    >
                      <CalculatorInput
                        value={form.unitPrice}
                        onValueChange={(v) => setNum("unitPrice", v)}
                        placeholder="0.00"
                        className={cn("h-8", fieldInputClass)}
                      />
                    </ClearableField>
                  </div>

                  {documentType === "order" && form.type === "Item" && (
                    <div className="space-y-1">
                      <FieldTitle>MRP</FieldTitle>
                      <ClearableField
                        value={form.mrp}
                        onClear={() => set("mrp", "")}
                      >
                        <CalculatorInput
                          value={form.mrp}
                          onValueChange={(v) => setNum("mrp", v)}
                          placeholder="0.00"
                          className={cn("h-8", fieldInputClass)}
                        />
                      </ClearableField>
                    </div>
                  )}

                  <div className="space-y-1">
                    <FieldTitle>Discount</FieldTitle>
                    <ClearableField
                      value={form.discount}
                      onClear={() => set("discount", "")}
                    >
                      <CalculatorInput
                        value={form.discount}
                        onValueChange={(v) => setNum("discount", v)}
                        placeholder="0.00"
                        className={cn("h-8", fieldInputClass)}
                      />
                    </ClearableField>
                  </div>

                  <div className="space-y-1">
                    <FieldTitle>Amount</FieldTitle>
                    <Input
                      type="text"
                      value={amount > 0 ? amount.toFixed(2) : ""}
                      disabled
                      readOnly
                      className={cn("bg-muted h-8 font-medium", fieldInputClass)}
                    />
                  </div>

                  {form.type === "Fixed Asset" && (
                    <>
                      <div className="space-y-1">
                        <FieldTitle>FA Posting Type</FieldTitle>
                        <ClearableField
                          value={form.faPostingType}
                          onClear={() => set("faPostingType", "")}
                        >
                          <Select
                            value={form.faPostingType}
                            onValueChange={(v) => set("faPostingType", v)}
                          >
                            <SelectTrigger
                              className={cn("h-8", fieldInputClass)}
                            >
                              <SelectValue placeholder="Select type" />
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
                        <FieldTitle>Salvage Value</FieldTitle>
                        <ClearableField
                          value={form.salvageValue}
                          onClear={() => set("salvageValue", "")}
                        >
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={form.salvageValue}
                            onChange={(e) =>
                              setNum("salvageValue", e.target.value)
                            }
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder="0.00"
                            className={cn(
                              "h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                              fieldInputClass,
                            )}
                          />
                        </ClearableField>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Tax Details ── */}
            {form.type !== "" && (
              <div className="space-y-2 border-t pt-2">
                <h3 className="text-foreground text-xs font-medium">
                  Tax Details
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Checkboxes row */}
                  <div className="flex items-center gap-6 pt-5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="line-exempted"
                        checked={form.exempted}
                        onCheckedChange={(c) =>
                          set("exempted", c === true)
                        }
                      />
                      <Label
                        htmlFor="line-exempted"
                        className="text-muted-foreground cursor-pointer text-xs font-medium"
                      >
                        Exempted
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="line-foc"
                        checked={form.foc}
                        onCheckedChange={(c) => set("foc", c === true)}
                      />
                      <Label
                        htmlFor="line-foc"
                        className="text-muted-foreground cursor-pointer text-xs font-medium"
                      >
                        FOC
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <FieldTitle>GST Group Code</FieldTitle>
                    <ClearableField
                      value={form.gstGroupCode}
                      onClear={() => {
                        set("gstGroupCode", "");
                        set("hsnSacCode", "");
                      }}
                    >
                      <AppSearchableSelect
                        value={form.gstGroupCode}
                        onValueChange={(v) => {
                          set("gstGroupCode", v);
                          set("hsnSacCode", "");
                        }}
                        options={gstOptions}
                        isLoading={loadingOptions.gst}
                        placeholder="Select GST Group…"
                        searchPlaceholder="Search GST Group…"
                      />
                    </ClearableField>
                  </div>

                  <div className="space-y-1">
                    <FieldTitle>HSN/SAC Code</FieldTitle>
                    <ClearableField
                      value={form.hsnSacCode}
                      onClear={() => set("hsnSacCode", "")}
                      disabled={!form.gstGroupCode}
                    >
                      <AppSearchableSelect
                        value={form.hsnSacCode}
                        onValueChange={(v) => set("hsnSacCode", v)}
                        options={hsnOptions}
                        isLoading={loadingOptions.hsn}
                        placeholder={
                          form.gstGroupCode
                            ? "Select HSN/SAC…"
                            : "Select GST Group first"
                        }
                        searchPlaceholder="Search HSN/SAC…"
                        disabled={!form.gstGroupCode}
                      />
                    </ClearableField>
                  </div>
                </div>
              </div>
            )}

            {validationError && (
              <p className="text-destructive text-xs">{validationError}</p>
            )}
          </div>

          <DialogFooter className="flex items-center justify-end sm:justify-end">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Add Line"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
