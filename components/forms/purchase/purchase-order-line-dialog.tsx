"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SearchableSelect as MasterSearchableSelect } from "@/components/forms/shared/searchable-select";
import {
  SearchableSelect as AppSearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  getItems,
  searchItems,
  getItemsPage,
  searchItemsByField,
  getItemUnitOfMeasures,
  getItemByNo,
  type Item,
  type ItemUnitOfMeasure,
} from "@/lib/api/services/item.service";
import {
  getGLAccounts,
  searchGLAccounts,
  getGLAccountsPage,
  type GLPostingAccount,
} from "@/lib/api/services/gl-account.service";
import { getVendorTDSGroupCodes } from "@/lib/api/services/tds.service";
import {
  getGstGroupCodes,
  getHsnSacCodes,
} from "@/lib/api/services/purchase-orders.service";
import type { LineItem } from "@/components/forms/sales/line-item-form";

type LineType = "G/L Account" | "Item";

interface PurchaseOrderLineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem?: LineItem | null;
  customerNo?: string;
  locationCode?: string;
  onSave: (lineItem: LineItem) => void | Promise<void>;
  isSaving?: boolean;
}

function createLineItemId() {
  return `line-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInitialLineState(lineItem?: LineItem | null): Partial<LineItem> {
  return {
    lineNo: lineItem?.lineNo,
    type: lineItem?.type || "Item",
    no: lineItem?.no || "",
    description: lineItem?.description || "",
    uom: lineItem?.uom || "",
    quantity: lineItem?.quantity || 0,
    price: lineItem?.price || 0,
    unitPrice: lineItem?.unitPrice || 0,
    discount: lineItem?.discount || 0,
    exempted: lineItem?.exempted || false,
    gstGroupCode: lineItem?.gstGroupCode || "",
    hsnSacCode: lineItem?.hsnSacCode || "",
    tdsGroupCode: lineItem?.tdsGroupCode || "",
    noOfBags: lineItem?.noOfBags,
  };
}

export function PurchaseOrderLineDialog({
  isOpen,
  onOpenChange,
  lineItem,
  customerNo,
  locationCode,
  onSave,
  isSaving = false,
}: PurchaseOrderLineDialogProps) {
  const isEdit = !!lineItem;
  const [formState, setFormState] = useState<Partial<LineItem>>(
    getInitialLineState(lineItem),
  );
  const [uomOptions, setUomOptions] = useState<ItemUnitOfMeasure[]>([]);
  const [tdsOptions, setTdsOptions] = useState<SearchableSelectOption[]>([]);
  const [gstOptions, setGstOptions] = useState<SearchableSelectOption[]>([]);
  const [hsnOptions, setHsnOptions] = useState<SearchableSelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState({
    tds: false,
    gst: false,
    hsn: false,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !customerNo) return;

    setLoadingOptions((prev) => ({ ...prev, tds: true }));
    getVendorTDSGroupCodes(customerNo)
      .then((rows) => {
        setTdsOptions(
          rows.map((row) => ({
            value: row.TDS_Section || "",
            label: `${row.TDS_Section} - ${row.TDS_Section_Description || ""}`,
          })),
        );
      })
      .catch((error) => {
        console.error("Error loading Vendor TDS Group Codes:", error);
        setTdsOptions([]);
      })
      .finally(() => {
        setLoadingOptions((prev) => ({ ...prev, tds: false }));
      });
  }, [isOpen, customerNo]);

  useEffect(() => {
    if (!isOpen) return;

    setLoadingOptions((prev) => ({ ...prev, gst: true }));
    getGstGroupCodes()
      .then((rows) => {
        setGstOptions(
          rows.map((row) => ({
            value: row.Code,
            label: row.Code,
            description: row.GST_Group_Type,
          })),
        );
      })
      .catch((error) => {
        console.error("Error loading GST Group Codes:", error);
        setGstOptions([]);
      })
      .finally(() => {
        setLoadingOptions((prev) => ({ ...prev, gst: false }));
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !formState.gstGroupCode) {
      setHsnOptions([]);
      return;
    }

    setLoadingOptions((prev) => ({ ...prev, hsn: true }));
    getHsnSacCodes(formState.gstGroupCode)
      .then((rows) => {
        setHsnOptions(
          rows.map((row) => ({
            value: row.Code,
            label: row.Code,
            description: row.Type,
          })),
        );
      })
      .catch((error) => {
        console.error("Error loading HSN/SAC Codes:", error);
        setHsnOptions([]);
      })
      .finally(() => {
        setLoadingOptions((prev) => ({ ...prev, hsn: false }));
      });
  }, [isOpen, formState.gstGroupCode]);

  useEffect(() => {
    if (!isOpen || formState.type !== "Item" || !formState.no) return;

    getItemUnitOfMeasures(formState.no)
      .then((uoms) => {
        setUomOptions(uoms);
        if (!formState.uom && uoms.length > 0 && !isEdit) {
          setFormState((prev) => ({ ...prev, uom: uoms[0].Code }));
        }
      })
      .catch((error) => {
        console.error("Error loading UOM:", error);
        setUomOptions([]);
      });
  }, [isOpen, formState.type, formState.no, formState.uom, isEdit]);

  const amount = useMemo(() => {
    const quantity = Number(formState.quantity) || 0;
    const unitPrice = Number(formState.unitPrice) || 0;
    const discount = Number(formState.discount) || 0;
    return unitPrice * quantity - discount;
  }, [formState.quantity, formState.unitPrice, formState.discount]);

  const isItemType = formState.type === "Item";

  const handleTypeChange = useCallback((type: LineType) => {
    setUomOptions([]);
    setFormState((prev) => ({
      ...prev,
      type,
      no: "",
      description: "",
      uom: type === "Item" ? prev.uom : "",
      exempted: false,
      gstGroupCode: "",
      hsnSacCode: "",
    }));
  }, []);

  const handleFieldChange = useCallback((field: keyof LineItem, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleNumericChange = useCallback(
    (field: keyof LineItem, value: string) => {
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        handleFieldChange(field, value as any);
      }
    },
    [handleFieldChange],
  );

  const formatNumericValue = useCallback((value: any): string => {
    if (value == null) return "";
    return String(value);
  }, []);

  const handleGLAccountChange = useCallback(
    (value: string, account?: GLPostingAccount) => {
      if (value === "" && !account) {
        setFormState((prev) => ({ ...prev, no: "", description: "" }));
        return;
      }

      if (account) {
        setFormState((prev) => ({
          ...prev,
          no: account.No,
          description: account.Name,
        }));
      }
    },
    [],
  );

  const handleItemChange = useCallback((value: string, item?: Item) => {
    if (value === "" && !item) {
      setUomOptions([]);
      setFormState((prev) => ({
        ...prev,
        no: "",
        description: "",
        uom: "",
        price: 0,
        unitPrice: 0,
      }));
      return;
    }

    if (!item) return;

    const unitPrice = Number(item.Unit_Price ?? 0);
    setFormState((prev) => ({
      ...prev,
      no: item.No,
      description: item.Description,
      uom: item.Sales_Unit_of_Measure || prev.uom,
      price: unitPrice,
      unitPrice,
    }));

    getItemByNo(item.No)
      .then((cardItem) => {
        if (cardItem) {
          setFormState((prev) => ({
            ...prev,
            exempted: cardItem.Exempted ?? false,
            gstGroupCode: cardItem.GST_Group_Code ?? "",
            hsnSacCode: cardItem.HSN_SAC_Code ?? "",
            uom: cardItem.Sales_Unit_of_Measure || prev.uom,
          }));
        }
      })
      .catch((error) => {
        console.error("Error loading item card details:", error);
      });
  }, []);

  const handleSubmit = useCallback(() => {
    setValidationError(null);

    if (!formState.no || !formState.description) {
      setValidationError("Item and description are required.");
      return;
    }

    if (!formState.quantity || formState.quantity <= 0) {
      setValidationError("Quantity must be greater than zero.");
      return;
    }

    const normalizedLineItem: LineItem = {
      id: lineItem?.id || createLineItemId(),
      lineNo: lineItem?.lineNo,
      type: (formState.type as LineType) || "Item",
      no: formState.no,
      description: formState.description,
      uom: formState.uom,
      quantity: Number(formState.quantity) || 0,
      price: Number(formState.price) || 0,
      unitPrice: Number(formState.unitPrice) || 0,
      discount: Number(formState.discount) || 0,
      amount,
      exempted: formState.exempted,
      gstGroupCode: formState.gstGroupCode,
      hsnSacCode: formState.hsnSacCode,
      tdsGroupCode: formState.tdsGroupCode,
    };

    onSave(normalizedLineItem);
  }, [amount, formState, lineItem, onSave]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Line Item" : "Add Line Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldTitle>Type</FieldTitle>
              <ClearableField
                value={formState.type}
                onClear={() => handleTypeChange("Item")}
              >
                <Select
                  value={(formState.type as string) || "Item"}
                  onValueChange={(value) => handleTypeChange(value as LineType)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G/L Account">G/L Account</SelectItem>
                    <SelectItem value="Item">Item</SelectItem>
                  </SelectContent>
                </Select>
              </ClearableField>
            </div>

            <div className="space-y-1">
              <FieldTitle>Select Item</FieldTitle>
              {formState.type === "G/L Account" ? (
                <ClearableField
                  value={formState.no}
                  onClear={() => handleGLAccountChange("", undefined)}
                >
                  <MasterSearchableSelect<GLPostingAccount>
                    value={formState.no || ""}
                    onChange={handleGLAccountChange}
                    placeholder="Select GL Account"
                    loadInitial={() => getGLAccounts(20)}
                    searchItems={searchGLAccounts}
                    loadMore={(skip, search) => getGLAccountsPage(skip, search)}
                    getDisplayValue={(item) => `${item.No} - ${item.Name}`}
                    getItemValue={(item) => item.No}
                    supportsDualSearch={true}
                    searchByField={async (query, field) => {
                      const results = await searchGLAccounts(query);
                      if (field === "No") {
                        return results.filter((acc) =>
                          acc.No.toLowerCase().includes(query.toLowerCase()),
                        );
                      }
                      return results.filter((acc) =>
                        acc.Name.toLowerCase().includes(query.toLowerCase()),
                      );
                    }}
                  />
                </ClearableField>
              ) : (
                <ClearableField
                  value={formState.no}
                  onClear={() => handleItemChange("", undefined)}
                >
                  <MasterSearchableSelect<Item>
                    value={formState.no || ""}
                    onChange={handleItemChange}
                    placeholder="Select Item"
                    loadInitial={() => getItems(20, locationCode)}
                    searchItems={(query) => searchItems(query, locationCode)}
                    loadMore={(skip, search) =>
                      getItemsPage(skip, search, 20, locationCode)
                    }
                    getDisplayValue={(item) =>
                      `${item.No} - ${item.Description}`
                    }
                    getItemValue={(item) => item.No}
                    supportsDualSearch={true}
                    searchByField={(query, field) =>
                      searchItemsByField(query, field, locationCode)
                    }
                  />
                </ClearableField>
              )}
              {formState.description && (
                <p className="mt-1 pl-1 text-[10px] font-medium text-green-600">
                  {formState.description}
                </p>
              )}
            </div>

            {isItemType && (
              <div className="space-y-1">
                <FieldTitle>UOM</FieldTitle>
                <ClearableField
                  value={formState.uom}
                  onClear={() => handleFieldChange("uom", "")}
                >
                  <Select
                    value={formState.uom || ""}
                    onValueChange={(value) => handleFieldChange("uom", value)}
                    disabled={uomOptions.length === 0}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select UOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {uomOptions.map((uom) => (
                        <SelectItem key={uom.Code} value={uom.Code}>
                          {uom.Code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ClearableField>
              </div>
            )}

            <div className="space-y-1">
              <FieldTitle>TDS Group Code</FieldTitle>
              <AppSearchableSelect
                value={formState.tdsGroupCode || ""}
                onValueChange={(value) =>
                  handleFieldChange("tdsGroupCode", value)
                }
                options={tdsOptions}
                isLoading={loadingOptions.tds}
                placeholder="Select TDS Group Code"
                searchPlaceholder="Search TDS Group Code..."
              />
            </div>
          </div>

          <div className="space-y-2 border-t pt-2">
            <h3 className="text-foreground text-xs font-medium">Pricing</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1">
                <FieldTitle>Quantity</FieldTitle>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericValue(formState.quantity)}
                  onChange={(e) =>
                    handleNumericChange("quantity", e.target.value)
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                  className="h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <div className="space-y-1">
                <FieldTitle>No. of Bags</FieldTitle>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={
                    formState.noOfBags != null ? String(formState.noOfBags) : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setFormState((prev) => ({
                        ...prev,
                        noOfBags: undefined,
                      }));
                    } else {
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n >= 0)
                        setFormState((prev) => ({ ...prev, noOfBags: n }));
                    }
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className="h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <div className="space-y-1">
                <FieldTitle>Unit Price</FieldTitle>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericValue(formState.unitPrice)}
                  onChange={(e) =>
                    handleNumericChange("unitPrice", e.target.value)
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                  className="h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <div className="space-y-1">
                <FieldTitle>Discount</FieldTitle>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericValue(formState.discount)}
                  onChange={(e) =>
                    handleNumericChange("discount", e.target.value)
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                  className="h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <div className="space-y-1">
                <FieldTitle>Amount</FieldTitle>
                <Input
                  type="text"
                  value={amount > 0 ? amount.toFixed(2) : ""}
                  disabled
                  className="bg-muted h-8 font-medium"
                  readOnly
                />
              </div>
            </div>
          </div>

          {isItemType && (
            <div className="space-y-2 border-t pt-2">
              <h3 className="text-foreground text-xs font-medium">
                Item Details
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldTitle>Exempted</FieldTitle>
                  <Input
                    value={formState.exempted ? "Yes" : "No"}
                    disabled
                    className="bg-muted h-8"
                    readOnly
                  />
                </div>
                <div className="space-y-1">
                  <FieldTitle>GST Group Code</FieldTitle>
                  <AppSearchableSelect
                    value={formState.gstGroupCode || ""}
                    onValueChange={(value) => {
                      handleFieldChange("gstGroupCode", value);
                      handleFieldChange("hsnSacCode", "");
                    }}
                    options={gstOptions}
                    isLoading={loadingOptions.gst}
                    placeholder="Select GST Group..."
                    searchPlaceholder="Search GST Group..."
                  />
                </div>
                <div className="space-y-1">
                  <FieldTitle>HSN/SAC Code</FieldTitle>
                  <AppSearchableSelect
                    value={formState.hsnSacCode || ""}
                    onValueChange={(value) =>
                      handleFieldChange("hsnSacCode", value)
                    }
                    options={hsnOptions}
                    isLoading={loadingOptions.hsn}
                    placeholder={
                      formState.gstGroupCode
                        ? "Select HSN/SAC..."
                        : "Select GST Group first"
                    }
                    searchPlaceholder="Search HSN/SAC..."
                    disabled={!formState.gstGroupCode}
                  />
                </div>
              </div>
            </div>
          )}

          {validationError && (
            <p className="text-destructive text-xs">{validationError}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              "Update Item"
            ) : (
              "Add Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
