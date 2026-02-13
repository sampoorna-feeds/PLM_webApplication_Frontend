"use client";

/**
 * Line Item Tab Form
 * Tab-based form for adding/editing line items
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldTitle } from '@/components/ui/field';
import { ClearableField } from '@/components/ui/clearable-field';
import { SearchableSelect } from '@/components/forms/shared/searchable-select';
import { useFormStackContext } from '@/lib/form-stack/form-stack-context';
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
} from '@/lib/api/services/gl-account.service';
import { getTCSGroupCodes, type TCSGroupCode } from '@/lib/api/services/tcs.service';
import { getSalesPrice, type SalesPriceResponse } from '@/lib/api/services/sales-price.service';
import type { LineItem } from './line-item-form';

interface LineItemTabFormProps {
  tabId: string;
  formData?: {
    lineItem?: LineItem;
    customerNo?: string;
    locationCode?: string;
    customerPriceGroup?: string;
  };
  context?: {
    onSave?: (lineItem: LineItem) => void;
    openedFromParent?: boolean;
  };
}

export function LineItemTabForm({
  tabId,
  formData,
  context,
}: LineItemTabFormProps) {
  const { closeTab } = useFormStackContext();

  const lineItem = formData?.lineItem;
  const customerNo = formData?.customerNo;
  const locationCode = formData?.locationCode;
  const customerPriceGroup = formData?.customerPriceGroup;

  // Single source of truth for form state
  const [formState, setFormState] = useState<Partial<LineItem>>(() => ({
    type: lineItem?.type || "Item",
    no: lineItem?.no || "",
    description: lineItem?.description || "",
    uom: lineItem?.uom || "",
    quantity: lineItem?.quantity || 0,
    mrp: lineItem?.mrp || 0,
    price: lineItem?.price || 0,
    unitPrice: lineItem?.unitPrice || 0,
    discount: lineItem?.discount || 0,
    exempted: lineItem?.exempted || false,
    gstGroupCode: lineItem?.gstGroupCode || "",
    hsnSacCode: lineItem?.hsnSacCode || "",
    tcsGroupCode: lineItem?.tcsGroupCode || "",
  }));

  const [uomOptions, setUomOptions] = useState<ItemUnitOfMeasure[]>([]);
  const [tcsOptions, setTcsOptions] = useState<TCSGroupCode[]>([]);
  const [isLoadingUOM, setIsLoadingUOM] = useState(false);
  const [hasSalesPrice, setHasSalesPrice] = useState<boolean | null>(null);

  // Load TCS options based on selected customer number (skip in edit mode - TCS field hidden)
  useEffect(() => {
    if (lineItem) {
      setTcsOptions([]);
      return;
    }
    if (!customerNo) {
      setTcsOptions([]);
      return;
    }

    getTCSGroupCodes(customerNo)
      .then(setTcsOptions)
      .catch((error) => {
        console.error("Error loading TCS Group Codes:", error);
        setTcsOptions([]);
      });
  }, [customerNo, lineItem]);

  // Load UOM when Item type and No are selected
  useEffect(() => {
    if (formState.type !== "Item" || !formState.no) {
      setUomOptions([]);
      if (formState.type !== "Item") {
        setFormState((prev) => ({ ...prev, uom: "" }));
      }
      return;
    }

    setIsLoadingUOM(true);
    getItemUnitOfMeasures(formState.no)
      .then((uoms) => {
        setUomOptions(uoms);
        // Auto-select first UOM if none selected and not editing
        if (!formState.uom && uoms.length > 0 && !lineItem) {
          setFormState((prev) => ({ ...prev, uom: uoms[0].Code }));
        }
      })
      .catch((error) => {
        console.error("Error loading UOM:", error);
        setUomOptions([]);
      })
      .finally(() => setIsLoadingUOM(false));
  }, [formState.type, formState.no, lineItem]);

  // Calculate derived values using useMemo
  const { totalMRP, amount } = useMemo(() => {
    const quantity = formState.quantity || 0;
    const unitPrice = formState.unitPrice || 0;
    const discount = formState.discount || 0;

    return {
      totalMRP: unitPrice * quantity,
      amount: unitPrice * quantity - discount,
    };
  }, [formState.quantity, formState.unitPrice, formState.discount]);

  // Derived values
  const isItemType = formState.type === "Item";
  const isDescriptionEditable = formState.type === "G/L Account";

  // Memoized handlers
  const handleTypeChange = useCallback((type: "G/L Account" | "Item") => {
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

  // Handle GL Account selection
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

  // Handle Item selection: prefill from ItemList (Unit_Price, Sales_Unit_of_Measure), then fetch ItemCard (Exempted, GST, HSN)
  const handleItemChange = useCallback((value: string, item?: Item) => {
    if (value === "" && !item) {
      setFormState((prev) => ({
        ...prev,
        no: "",
        description: "",
        uom: "",
        mrp: 0,
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
      mrp: unitPrice,
      price: unitPrice,
      unitPrice,
    }));

    getItemByNo(item.No).then((cardItem) => {
      if (cardItem) {
        setFormState((prev) => ({
          ...prev,
          exempted: cardItem.Exempted ?? false,
          gstGroupCode: cardItem.GST_Group_Code ?? '',
          hsnSacCode: cardItem.HSN_SAC_Code ?? '',
          uom: cardItem.Sales_Unit_of_Measure || prev.uom,
        }));
      }
    }).catch((err) => {
      console.error('Error loading item card details:', err);
    });
  }, []);

  // Fetch sales price once we know item, UOM, location, and customer price group
  useEffect(() => {
    if (
      formState.type !== 'Item' ||
      !formState.no ||
      !formState.uom ||
      !locationCode ||
      !customerPriceGroup
    ) {
      setHasSalesPrice(null);
      return;
    }

    const today = new Date();
    const orderDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

    getSalesPrice({
      salesType: '1',
      salesCode: customerPriceGroup,
      itemNo: formState.no,
      location: locationCode,
      unitofmeasure: formState.uom,
      orderDate,
    })
      .then((price: SalesPriceResponse | null) => {
        if (price && (price.Unit_Price != null || price.MRP != null)) {
          setFormState((prev) => ({
            ...prev,
            mrp: price.MRP ?? prev.mrp,
            price: price.Unit_Price ?? prev.price,
            unitPrice: price.Unit_Price ?? prev.unitPrice,
          }));
          setHasSalesPrice(true);
        } else {
          setHasSalesPrice(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching sales price:', err);
        setHasSalesPrice(false);
      });
  }, [formState.type, formState.no, formState.uom, locationCode, customerPriceGroup]);

  const handleFieldChange = useCallback((field: keyof LineItem, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle numeric input change - only allow valid numbers
  const handleNumericChange = useCallback(
    (field: keyof LineItem, value: string) => {
      // Allow empty string, numbers, and decimal point
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        const numValue = value === "" ? 0 : parseFloat(value) || 0;
        handleFieldChange(field, numValue);
      }
    },
    [handleFieldChange],
  );

  // Format numeric value for display
  const formatNumericValue = useCallback(
    (value: number | undefined): string => {
      if (value === undefined || value === null) return "";
      if (value === 0) return "";
      return value.toString();
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (
        !formState.no ||
        !formState.description ||
        !formState.quantity ||
        formState.quantity <= 0
      ) {
        return;
      }

      const newLineItem: LineItem = {
        id: lineItem?.id || `line-item-${Date.now()}`,
        type: formState.type!,
        no: formState.no,
        description: formState.description,
        uom: formState.uom,
        quantity: formState.quantity,
        mrp: formState.mrp,
        price: formState.price,
        unitPrice: formState.unitPrice || 0,
        totalMRP,
        discount: formState.discount || 0,
        amount,
        exempted: formState.exempted,
        gstGroupCode: formState.gstGroupCode,
        hsnSacCode: formState.hsnSacCode,
        tcsGroupCode: formState.tcsGroupCode,
      };

      if (context?.onSave) {
        context.onSave(newLineItem);
        // Parent (e.g. edit form) is responsible for closing this tab after persisting
      } else {
        closeTab(tabId);
      }
    },
    [formState, totalMRP, amount, lineItem?.id, context, closeTab, tabId],
  );

  const handleCancel = useCallback(() => {
    closeTab(tabId);
  }, [closeTab, tabId]);

  return (
    <div className="flex h-full flex-col">
      <form
        onSubmit={handleSubmit}
        className="flex-1 space-y-6 overflow-y-auto p-6"
      >
        {/* Basic Information Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <FieldTitle>Type</FieldTitle>
              <ClearableField
                value={formState.type}
                onClear={() => handleTypeChange("Item")}
              >
              <Select value={formState.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="G/L Account">G/L Account</SelectItem>
                  <SelectItem value="Item">Item</SelectItem>
                </SelectContent>
              </Select>
              </ClearableField>
            </div>

            {/* Select Item */}
            <div className="space-y-2">
              <FieldTitle>Select Item</FieldTitle>
              {formState.type === 'G/L Account' ? (
                <ClearableField
                  value={formState.no}
                  onClear={() => handleGLAccountChange("", undefined)}
                >
                <SearchableSelect<GLPostingAccount>
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
                <SearchableSelect<Item>
                  value={formState.no || ""}
                  onChange={handleItemChange}
                  placeholder="Select Item"
                  loadInitial={() => getItems(20, locationCode)}
                  searchItems={(q) => searchItems(q, locationCode)}
                  loadMore={(skip, search) => getItemsPage(skip, search, 20, locationCode)}
                  getDisplayValue={(item) => `${item.No} - ${item.Description}`}
                  getItemValue={(item) => item.No}
                  supportsDualSearch={true}
                  searchByField={(q, field) => searchItemsByField(q, field, locationCode)}
                />
                </ClearableField>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <FieldTitle>Description</FieldTitle>
            <ClearableField
              value={formState.description}
              onClear={() => handleFieldChange("description", "")}
            >
            <Input
              value={formState.description || ""}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              disabled={!isDescriptionEditable}
              placeholder="Description"
            />
            </ClearableField>
          </div>

          {/* UOM (only for Item) */}
          {isItemType && (
            <div className="space-y-2">
              <FieldTitle>UOM</FieldTitle>
              <ClearableField
                value={formState.uom}
                onClear={() => handleFieldChange("uom", "")}
              >
              <Select
                value={formState.uom || ""}
                onValueChange={(value) => handleFieldChange("uom", value)}
                disabled={isLoadingUOM || uomOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingUOM ? "Loading..." : "Select UOM"}
                  />
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
        </div>

        {/* Pricing Section */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-foreground text-sm font-medium">Pricing</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
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
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-2">
              <FieldTitle>MRP</FieldTitle>
              <Input
                type="text"
                inputMode="decimal"
                value={formatNumericValue(formState.mrp)}
                onChange={(e) => handleNumericChange("mrp", e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-2">
              <FieldTitle>Price</FieldTitle>
              <Input
                type="text"
                inputMode="decimal"
                value={formatNumericValue(formState.price)}
                onChange={(e) => handleNumericChange("price", e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
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
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-2">
              <FieldTitle>Total MRP</FieldTitle>
              <Input
                type="text"
                value={totalMRP > 0 ? totalMRP.toFixed(2) : ""}
                disabled
                className="bg-muted"
                readOnly
              />
            </div>
            <div className="space-y-2">
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
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <FieldTitle>Amount</FieldTitle>
            <Input
              type="text"
              value={amount > 0 ? amount.toFixed(2) : ""}
              disabled
              className="bg-muted font-medium"
              readOnly
            />
          </div>
        </div>

        {/* Item Details Section (only for Item type) */}
        {isItemType && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-foreground text-sm font-medium">
              Item Details
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <FieldTitle>Exempted</FieldTitle>
                <Input
                  value={formState.exempted ? "Yes" : "No"}
                  disabled
                  className="bg-muted"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <FieldTitle>GST Group Code</FieldTitle>
                <Input
                  value={formState.gstGroupCode || ""}
                  disabled
                  className="bg-muted"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <FieldTitle>HSN/SAC Code</FieldTitle>
                <Input
                  value={formState.hsnSacCode || ""}
                  disabled
                  className="bg-muted"
                  readOnly
                />
              </div>
            </div>
          </div>
        )}

        {/* TCS Group Code - hidden in edit mode (data not available from API) */}
        {!lineItem && (
          <div className="space-y-2 border-t pt-4">
            <FieldTitle>TCS Group Code</FieldTitle>
            {tcsOptions.length > 0 ? (
              <Select
                value={formState.tcsGroupCode || ""}
                onValueChange={(value) =>
                  handleFieldChange("tcsGroupCode", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select TCS Group Code" />
                </SelectTrigger>
                <SelectContent>
                  {tcsOptions.map((tcs) => (
                    <SelectItem
                      key={tcs.TCS_Nature_of_Collection}
                      value={tcs.TCS_Nature_of_Collection}
                    >
                      {tcs.TCS_Nature_of_Collection}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value="Not available"
                disabled
                className="bg-muted"
                readOnly
              />
            )}
          </div>
        )}
      </form>

      {/* Form Actions */}
      <div className="bg-background flex justify-end gap-3 border-t p-4">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Save
        </Button>
      </div>
    </div>
  );
}
