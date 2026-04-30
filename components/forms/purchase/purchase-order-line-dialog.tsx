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
import { ItemSelect } from "./item-select";
import { getVendorTDSGroupCodes } from "@/lib/api/services/tds.service";
import {
  getGstGroupCodes,
  getHsnSacCodes,
} from "@/lib/api/services/purchase-orders.service";
import type { LineItem } from "@/components/forms/purchase/purchase-line-item.type";
import {
  getPurchaseLineQuantityConfig,
  type PurchaseLineDocumentType,
  type PurchaseLineQuantityKey,
} from "@/components/forms/purchase/purchase-line-quantity-config";

type LineType = "G/L Account" | "Item" | "Fixed Asset" | "Charge (Item)" | "";

interface PurchaseOrderLineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem?: LineItem | null;
  documentType?: PurchaseLineDocumentType;
  vendorNo?: string;
  locationCode?: string;
  onSave: (lineItem: LineItem) => void | Promise<void>;
  onRemove?: (lineItem: LineItem) => void | Promise<void>;
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
    qtyToReceive: lineItem?.qtyToReceive || 0,
    qtyReceived: lineItem?.qtyReceived || 0,
    returnQtyToShip: lineItem?.returnQtyToShip || 0,
    returnQtyShipped: lineItem?.returnQtyShipped || 0,
    qtyToInvoice: lineItem?.qtyToInvoice || 0,
    qtyInvoiced: lineItem?.qtyInvoiced || 0,
    price: lineItem?.price || 0,
    unitPrice: lineItem?.unitPrice || 0,
    discount: lineItem?.discount || 0,
    exempted: lineItem?.exempted || false,
    gstGroupCode: lineItem?.gstGroupCode || "",
    hsnSacCode: lineItem?.hsnSacCode || "",
    tdsSectionCode: lineItem?.tdsSectionCode || "",
    faPostingType: (lineItem?.faPostingType || "").trim(),
    salvageValue: lineItem?.salvageValue,
    noOfBags: lineItem?.noOfBags,
    challanQty: lineItem?.challanQty,
    weightQty: lineItem?.weightQty,
    gstCredit: lineItem?.gstCredit || "Non-Availment",
  };
}

export function PurchaseOrderLineDialog({
  isOpen,
  onOpenChange,
  lineItem,
  documentType = "order",
  vendorNo,
  locationCode,
  onSave,
  onRemove,
  isSaving = false,
}: PurchaseOrderLineDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);
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
  const [canAddBardana, setCanAddBardana] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const quantityColumns = useMemo(
    () => getPurchaseLineQuantityConfig(documentType),
    [documentType],
  );
  const showQtyColumns = isEdit && (documentType === "order" || documentType === "return-order");

  const fieldInputClass =
    "disabled:opacity-100 disabled:text-foreground font-medium text-xs disabled:pointer-events-none";

  useEffect(() => {
    if (!isOpen || formState.type !== "Item" || !formState.no) {
      setCanAddBardana(false);
      setFormState((prev) =>
        prev.noOfBags == null ? prev : { ...prev, noOfBags: undefined },
      );
      return;
    }

    let mounted = true;
    getItemByNo(formState.no)
      .then((item) => {
        if (!mounted) return;
        const isBardanaEnabled =
          item?.Bardana_Generation_Enable === true &&
          documentType !== "invoice";
        setCanAddBardana(isBardanaEnabled);
        if (!isBardanaEnabled) {
          setFormState((prev) =>
            prev.noOfBags == null ? prev : { ...prev, noOfBags: undefined },
          );
        }
      })
      .catch((error) => {
        console.error("Error loading item bardana configuration:", error);
        if (!mounted) return;
        setCanAddBardana(false);
        setFormState((prev) =>
          prev.noOfBags == null ? prev : { ...prev, noOfBags: undefined },
        );
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, formState.type, formState.no]);

  useEffect(() => {
    if (!isOpen || !vendorNo) return;

    setLoadingOptions((prev) => ({ ...prev, tds: true }));
    getVendorTDSGroupCodes(vendorNo)
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
  }, [isOpen, vendorNo]);

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
    setCanAddBardana(false);
    setFormState((prev) => ({
      ...prev,
      type,
      no: "",
      description: "",
      uom: type === "Item" ? prev.uom : "",
      noOfBags: undefined,
      faPostingType: "",
      salvageValue: undefined,
      exempted: false,
      gstGroupCode: "",
      hsnSacCode: "",
      quantity: type === "" ? 0 : prev.quantity,
      qtyToReceive: 0,
      returnQtyToShip: 0,
      qtyToInvoice: 0,
      price: type === "" ? 0 : prev.price,
      unitPrice: type === "" ? 0 : prev.unitPrice,
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

  const getQuantityFieldDisplayValue = useCallback(
    (key: PurchaseLineQuantityKey): string =>
      formatNumericValue(formState[key as keyof LineItem]),
    [formState, formatNumericValue],
  );

  const handleQuantityFieldChange = useCallback(
    (key: PurchaseLineQuantityKey, value: string) => {
      handleNumericChange(key as keyof LineItem, value);
    },
    [handleNumericChange],
  );

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
      setCanAddBardana(false);
      setUomOptions([]);
      setFormState((prev) => ({
        ...prev,
        no: "",
        description: "",
        uom: "",
        noOfBags: undefined,
        faPostingType: "",
        salvageValue: undefined,
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
      uom: item.Purch_Unit_of_Measure || item.Sales_Unit_of_Measure || prev.uom,
      price: unitPrice,
      unitPrice,
    }));

    getItemByNo(item.No)
      .then((cardItem) => {
        if (cardItem) {
          const isBardanaEnabled =
            cardItem.Bardana_Generation_Enable === true &&
            documentType !== "invoice";
          setCanAddBardana(isBardanaEnabled);
          setFormState((prev) => ({
            ...prev,
            exempted: cardItem.Exempted ?? false,
            gstGroupCode: cardItem.GST_Group_Code ?? "",
            hsnSacCode: cardItem.HSN_SAC_Code ?? "",
            uom:
              cardItem.Purch_Unit_of_Measure ||
              cardItem.Sales_Unit_of_Measure ||
              prev.uom,
            noOfBags: isBardanaEnabled ? prev.noOfBags : undefined,
          }));
        }
      })
      .catch((error) => {
        console.error("Error loading item card details:", error);
        setCanAddBardana(false);
      });
  }, []);

  const handleSubmit = useCallback(() => {
    setValidationError(null);

    if (formState.type !== "" && !formState.no) {
      setValidationError("Item or selection is required.");
      return;
    }

    if (!formState.description) {
      setValidationError("Description is required.");
      return;
    }

    if (
      formState.type !== "" &&
      (!formState.quantity || formState.quantity <= 0)
    ) {
      setValidationError("Quantity must be greater than zero.");
      return;
    }

    const normalizedLineItem: LineItem = {
      id: lineItem?.id || createLineItemId(),
      lineNo: lineItem?.lineNo,
      type: (formState.type === "" ? "" : (formState.type as LineType) || "Item"),
      no: formState.no || "",
      description: formState.description || "",
      uom: formState.uom || "",
      quantity: Number(formState.quantity) || 0,
      price: Number(formState.price) || 0,
      unitPrice: Number(formState.unitPrice) || 0,
      discount: Number(formState.discount) || 0,
      amount,
      exempted: formState.exempted || false,
      gstGroupCode: formState.gstGroupCode || "",
      hsnSacCode: formState.hsnSacCode || "",
      tdsSectionCode: formState.tdsSectionCode || "",
      faPostingType:
        formState.type === "Fixed Asset"
          ? (formState.faPostingType || "").trim() || undefined
          : undefined,
      salvageValue:
        formState.type === "Fixed Asset"
          ? formState.salvageValue != null
            ? Number(formState.salvageValue)
            : undefined
          : undefined,
      noOfBags: canAddBardana ? formState.noOfBags : undefined,
      challanQty: isItemType ? Number(formState.challanQty) || 0 : undefined,
      weightQty: isItemType ? Number(formState.weightQty) || 0 : undefined,
      gstCredit: formState.gstCredit,
    };

    const normalizedLineItemRecord = normalizedLineItem as unknown as Record<
      string,
      unknown
    >;
    const firstPendingQuantity = Number(
      formState[quantityColumns.firstPendingKey as keyof LineItem],
    );
    const secondPendingQuantity = Number(
      formState[quantityColumns.secondPendingKey as keyof LineItem],
    );

    normalizedLineItemRecord[quantityColumns.firstPendingKey] = Number.isFinite(
      firstPendingQuantity,
    )
      ? firstPendingQuantity
      : 0;
    normalizedLineItemRecord[quantityColumns.secondPendingKey] =
      Number.isFinite(secondPendingQuantity) ? secondPendingQuantity : 0;

    onSave(normalizedLineItem);
  }, [amount, formState, lineItem, onSave, quantityColumns]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Line Item" : "Add Line Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1 -mr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldTitle>Type</FieldTitle>
              <ClearableField
                value={formState.type}
                onClear={() => handleTypeChange("Item")}
                disabled={isEdit}
              >
                <Select
                  value={
                    formState.type === "" ? "None" : formState.type || "Item"
                  }
                  onValueChange={(value) =>
                    handleTypeChange(
                      value === "None" ? "" : (value as LineType),
                    )
                  }
                  disabled={isEdit}
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

            {formState.type !== "" && (
              <div className="space-y-1">
                <FieldTitle>Select Item</FieldTitle>
                {formState.type === "G/L Account" ? (
                  <ClearableField
                    key="line-selector-gl-account"
                    value={formState.no}
                    onClear={() => handleGLAccountChange("", undefined)}
                  >
                    <MasterSearchableSelect<GLPostingAccount>
                      key="master-select-gl-account"
                      value={formState.no || ""}
                      onChange={handleGLAccountChange}
                      placeholder="Select GL Account"
                      loadInitial={() => getGLAccounts(20)}
                      searchItems={searchGLAccounts}
                      loadMore={(skip, search) =>
                        getGLAccountsPage(skip, search)
                      }
                      getDisplayValue={(item) => `${item.No} - ${item.Name}`}
                      getItemValue={(item) => item.No}
                      supportsDualSearch={true}
                      searchByField={(query, field) =>
                        searchGLAccountsByField(
                          query,
                          field === "No" ? "No" : "Name",
                        )
                      }
                    />
                  </ClearableField>
                ) : formState.type === "Fixed Asset" ? (
                  <ClearableField
                    key="line-selector-fixed-asset"
                    value={formState.no}
                    onClear={() => {
                      setFormState((prev) => ({
                        ...prev,
                        no: "",
                        description: "",
                        uom: "",
                        exempted: false,
                        gstGroupCode: "",
                        hsnSacCode: "",
                        faPostingType: "",
                        salvageValue: undefined,
                      }));
                    }}
                  >
                    <MasterSearchableSelect<FixedAsset>
                      key="master-select-fixed-asset"
                      value={formState.no || ""}
                      onChange={(value, asset) => {
                        if (value === "" && !asset) {
                          setFormState((prev) => ({
                            ...prev,
                            no: "",
                            description: "",
                            uom: "",
                            exempted: false,
                            gstGroupCode: "",
                            hsnSacCode: "",
                            faPostingType: "",
                            salvageValue: undefined,
                          }));
                          return;
                        }

                        if (!asset) return;
                        setFormState((prev) => ({
                          ...prev,
                          no: asset.No,
                          description: asset.Description,
                          uom: "",
                        }));
                      }}
                      placeholder="Select Fixed Asset"
                      loadInitial={() => getFixedAssets(20)}
                      searchItems={searchFixedAssets}
                      loadMore={(skip, search) =>
                        getFixedAssetsPage(skip, search)
                      }
                      getDisplayValue={(asset) =>
                        `${asset.No} - ${asset.Description}`
                      }
                      getItemValue={(asset) => asset.No}
                      supportsDualSearch={true}
                      searchByField={(query, field) =>
                        searchFixedAssetsByField(
                          query,
                          field === "No" ? "No" : "Description",
                        )
                      }
                    />
                  </ClearableField>
                ) : formState.type === "Charge (Item)" ? (
                  <ClearableField
                    key="line-selector-charge-item"
                    value={formState.no}
                    onClear={() => {
                      setFormState((prev) => ({
                        ...prev,
                        no: "",
                        description: "",
                        uom: "",
                        exempted: false,
                        gstGroupCode: "",
                        hsnSacCode: "",
                      }));
                    }}
                  >
                    <MasterSearchableSelect<ItemCharge>
                      key="master-select-charge-item"
                      value={formState.no || ""}
                      onChange={(value, charge) => {
                        if (value === "" && !charge) {
                          setFormState((prev) => ({
                            ...prev,
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
                        setFormState((prev) => ({
                          ...prev,
                          no: charge.No,
                          description: charge.Description || prev.description,
                          uom: "",
                          exempted: charge.Exempted ?? prev.exempted,
                          gstGroupCode:
                            charge.GST_Group_Code || prev.gstGroupCode,
                          hsnSacCode: charge.HSN_SAC_Code || prev.hsnSacCode,
                        }));
                      }}
                      placeholder="Select Charge Item"
                      loadInitial={() => getItemCharges(20)}
                      searchItems={searchItemCharges}
                      loadMore={(skip, search) =>
                        getItemChargesPage(skip, search)
                      }
                      getDisplayValue={(charge) =>
                        `${charge.No} - ${charge.Description || ""}`
                      }
                      getItemValue={(charge) => charge.No}
                      supportsDualSearch={true}
                      searchByField={(query, field) =>
                        searchItemChargesByField(
                          query,
                          field === "No" ? "No" : "Description",
                        )
                      }
                    />
                  </ClearableField>
                ) : (
                  <ClearableField
                    key="line-selector-item"
                    value={formState.no}
                    onClear={() => handleItemChange("", undefined)}
                  >
                    <ItemSelect
                      value={formState.no || ""}
                      onChange={handleItemChange}
                      locationCode={locationCode}
                    />
                  </ClearableField>
                )}
              </div>
            )}

            {/* Description — full width, always shown after item selector */}
            <div className="space-y-1 sm:col-span-2">
              <FieldTitle>Description</FieldTitle>
              <ClearableField
                value={formState.description || ""}
                onClear={() => handleFieldChange("description", "")}
              >
                <Input
                  value={formState.description || ""}
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                  placeholder="Enter description"
                  className={fieldInputClass}
                />
              </ClearableField>
            </div>

            {formState.type !== "" && (
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
                    <SelectTrigger className={cn("h-8", fieldInputClass)}>
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

            {formState.type !== "" && (
              <div className="space-y-1">
                <FieldTitle>TDS Section</FieldTitle>
                <ClearableField
                  value={formState.tdsSectionCode || ""}
                  onClear={() => handleFieldChange("tdsSectionCode", "")}
                >
                  <AppSearchableSelect
                    value={formState.tdsSectionCode || ""}
                    onValueChange={(value) =>
                      handleFieldChange("tdsSectionCode", value)
                    }
                    options={tdsOptions}
                    isLoading={loadingOptions.tds}
                    placeholder="Select TDS Section"
                    searchPlaceholder="Search TDS Section..."
                  />
                </ClearableField>
              </div>
            )}
          </div>

          {formState.type !== "" && (
            <div className="space-y-2 border-t pt-2">
              <h3 className="text-foreground text-xs font-medium">Pricing</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <FieldTitle>Quantity</FieldTitle>
                  <ClearableField
                    value={formatNumericValue(formState.quantity)}
                    onClear={() => handleNumericChange("quantity", "")}
                  >
                    <CalculatorInput
                      value={formatNumericValue(formState.quantity)}
                      onValueChange={(v) => handleNumericChange("quantity", v)}
                      placeholder="0.00"
                      className={cn("h-8", fieldInputClass)}
                    />
                  </ClearableField>
                </div>




                <div className="space-y-1">
                  <FieldTitle>Unit Price</FieldTitle>
                  <ClearableField
                    value={formatNumericValue(formState.unitPrice)}
                    onClear={() => handleNumericChange("unitPrice", "")}
                  >
                    <CalculatorInput
                      value={formatNumericValue(formState.unitPrice)}
                      onValueChange={(v) => handleNumericChange("unitPrice", v)}
                      placeholder="0.00"
                      className={cn("h-8", fieldInputClass)}
                    />
                  </ClearableField>
                </div>

                <div className="space-y-1">
                  <FieldTitle>Discount</FieldTitle>
                  <ClearableField
                    value={formatNumericValue(formState.discount)}
                    onClear={() => handleNumericChange("discount", "")}
                  >
                    <CalculatorInput
                      value={formatNumericValue(formState.discount)}
                      onValueChange={(v) => handleNumericChange("discount", v)}
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
                    className={cn("bg-muted h-8 font-medium", fieldInputClass)}
                    readOnly
                  />
                </div>

                {formState.type === "Fixed Asset" && (
                  <>
                    <div className="space-y-1">
                      <FieldTitle>FA Posting Type</FieldTitle>
                      <ClearableField
                        value={formState.faPostingType}
                        onClear={() => handleFieldChange("faPostingType", "")}
                      >
                        <Select
                          value={formState.faPostingType || ""}
                          onValueChange={(val) =>
                            handleFieldChange("faPostingType", val)
                          }
                        >
                          <SelectTrigger className={cn("h-8", fieldInputClass)}>
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
                      <FieldTitle>Salvage Value</FieldTitle>
                      <ClearableField
                        value={formatNumericValue(formState.salvageValue)}
                        onClear={() => handleNumericChange("salvageValue", "")}
                      >
                        <CalculatorInput
                          value={formatNumericValue(formState.salvageValue)}
                          onValueChange={(v) => handleNumericChange("salvageValue", v)}
                          placeholder="0.00"
                          className={cn("h-8", fieldInputClass)}
                        />
                      </ClearableField>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {formState.type !== "" && (
            <div className="space-y-2 border-t pt-2">
              <h3 className="text-foreground text-xs font-medium">
                Tax Details
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 pt-5">
                  <Checkbox
                    id="line-exempted"
                    checked={formState.exempted}
                    onCheckedChange={(checked) =>
                      handleFieldChange("exempted", checked === true)
                    }
                  />
                  <Label
                    htmlFor="line-exempted"
                    className="text-muted-foreground mr-1 cursor-pointer text-xs font-medium"
                  >
                    Exempted
                  </Label>
                </div>
                <div className="space-y-1">
                  <FieldTitle>GST Group Code</FieldTitle>
                  <ClearableField
                    value={formState.gstGroupCode || ""}
                    onClear={() => {
                      handleFieldChange("gstGroupCode", "");
                      handleFieldChange("hsnSacCode", "");
                    }}
                  >
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
                  </ClearableField>
                </div>
                <div className="space-y-1">
                  <FieldTitle>HSN/SAC Code</FieldTitle>
                  <ClearableField
                    value={formState.hsnSacCode || ""}
                    onClear={() => handleFieldChange("hsnSacCode", "")}
                    disabled={!formState.gstGroupCode}
                  >
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
                  </ClearableField>
                </div>
                <div className="space-y-1">
                  <FieldTitle>GST Credit</FieldTitle>
                  <ClearableField
                    value={formState.gstCredit || ""}
                    onClear={() => handleFieldChange("gstCredit", "")}
                  >
                    <Select
                      value={formState.gstCredit || "Non-Availment"}
                      onValueChange={(value) =>
                        handleFieldChange("gstCredit", value)
                      }
                    >
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
              </div>
            </div>
          )}

          {validationError && (
            <p className="text-destructive text-xs">{validationError}</p>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div>
            {isEdit && onRemove && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                onClick={async () => {
                  if (lineItem) {
                    setIsRemoving(true);
                    try {
                      await onRemove(lineItem);
                      onOpenChange(false);
                    } finally {
                      setIsRemoving(false);
                    }
                  }
                }}
                disabled={isSaving || isRemoving}
              >
                {isRemoving ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                )}
                Delete Item
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isRemoving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={handleSubmit}
              disabled={isSaving || isRemoving}
            >
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
