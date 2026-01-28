'use client';

/**
 * Line Item Form Component
 * Clean, simple form for adding/editing line items with optimized performance
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldTitle } from '@/components/ui/field';
import { Search, Loader2 } from 'lucide-react';
import { useFormStackContext } from '@/lib/form-stack/form-stack-context';
import {
  getItemUnitOfMeasures,
  type Item,
  type ItemUnitOfMeasure,
} from '@/lib/api/services/item.service';
import {
  type GLPostingAccount,
} from '@/lib/api/services/gl-account.service';
import { getTCSGroupCodes, type TCSGroupCode } from '@/lib/api/services/tcs.service';
import { useAuth } from '@/lib/contexts/auth-context';

export interface LineItem {
  id: string;
  type: 'G/L Account' | 'Item';
  no: string;
  description: string;
  uom?: string;
  quantity: number;
  mrp?: number;
  price?: number;
  unitPrice: number;
  totalMRP: number;
  discount: number;
  amount: number;
  exempted?: boolean;
  gstGroupCode?: string;
  hsnSacCode?: string;
  tcsGroupCode?: string;
}

interface LineItemFormProps {
  lineItem?: LineItem;
  customerNo?: string;
  onSubmit: (lineItem: LineItem) => void;
  onCancel: () => void;
}

function LineItemFormComponent({ lineItem, customerNo, onSubmit, onCancel }: LineItemFormProps) {
  const { openTab } = useFormStackContext();
  const { username } = useAuth();
  
  // Single source of truth for form state
  const [formData, setFormData] = useState<Partial<LineItem>>(() => ({
    type: lineItem?.type || 'Item',
    no: lineItem?.no || '',
    description: lineItem?.description || '',
    uom: lineItem?.uom || '',
    quantity: lineItem?.quantity || 0,
    mrp: lineItem?.mrp || 0,
    price: lineItem?.price || 0,
    unitPrice: lineItem?.unitPrice || 0,
    discount: lineItem?.discount || 0,
    exempted: lineItem?.exempted || false,
    gstGroupCode: lineItem?.gstGroupCode || '',
    hsnSacCode: lineItem?.hsnSacCode || '',
    tcsGroupCode: lineItem?.tcsGroupCode || '',
  }));

  const [uomOptions, setUomOptions] = useState<ItemUnitOfMeasure[]>([]);
  const [tcsOptions, setTcsOptions] = useState<TCSGroupCode[]>([]);
  const [isLoadingUOM, setIsLoadingUOM] = useState(false);

  // Load TCS options using logged-in user's username
  useEffect(() => {
    if (!username) {
      setTcsOptions([]);
      return;
    }

    getTCSGroupCodes(username)
      .then(setTcsOptions)
      .catch((error) => {
        console.error('Error loading TCS Group Codes:', error);
        setTcsOptions([]);
      });
  }, [username]);

  // Load UOM when Item type and No are selected
  useEffect(() => {
    if (formData.type !== 'Item' || !formData.no) {
      setUomOptions([]);
      if (formData.type !== 'Item') {
        setFormData((prev) => ({ ...prev, uom: '' }));
      }
      return;
    }

    setIsLoadingUOM(true);
    getItemUnitOfMeasures(formData.no)
      .then((uoms) => {
        setUomOptions(uoms);
        // Auto-select first UOM if none selected and not editing
        if (!formData.uom && uoms.length > 0 && !lineItem) {
          setFormData((prev) => ({ ...prev, uom: uoms[0].Code }));
        }
      })
      .catch((error) => {
        console.error('Error loading UOM:', error);
        setUomOptions([]);
      })
      .finally(() => setIsLoadingUOM(false));
  }, [formData.type, formData.no, lineItem]);

  // Calculate derived values using useMemo (no re-renders needed)
  const { totalMRP, amount } = useMemo(() => {
    const quantity = formData.quantity || 0;
    const unitPrice = formData.unitPrice || 0;
    const discount = formData.discount || 0;

    return {
      totalMRP: unitPrice * quantity,
      amount: unitPrice * quantity - discount,
    };
  }, [formData.quantity, formData.unitPrice, formData.discount]);

  // Derived values
  const isItemType = formData.type === 'Item';
  const isDescriptionEditable = formData.type === 'G/L Account';

  // Memoized handlers to prevent re-renders
  const handleTypeChange = useCallback((type: 'G/L Account' | 'Item') => {
    setFormData((prev) => ({
      ...prev,
      type,
      no: '',
      description: '',
      uom: type === 'Item' ? prev.uom : '',
      exempted: false,
      gstGroupCode: '',
      hsnSacCode: '',
    }));
  }, []);

  // Handle opening item selector tab
  const handleOpenItemSelector = useCallback(() => {
    openTab('item-selector', {
      title: `Select ${formData.type || 'Item'}`,
      formData: {
        type: formData.type || 'Item',
      },
      context: {
        openedFromParent: true,
        onSelect: (item: Item | GLPostingAccount, type: 'Item' | 'G/L Account') => {
          if (type === 'Item') {
            const itemData = item as Item;
            setFormData((prev) => ({
              ...prev,
              no: itemData.No,
              description: itemData.Description,
              exempted: itemData.Exempted || false,
              gstGroupCode: itemData.GST_Group_Code || '',
              hsnSacCode: itemData.HSN_SAC_Code || '',
            }));
          } else {
            const accountData = item as GLPostingAccount;
            setFormData((prev) => ({
              ...prev,
              no: accountData.No,
              description: accountData.Name,
            }));
          }
        },
      },
      autoCloseOnSuccess: true,
    });
  }, [openTab, formData.type]);

  const handleFieldChange = useCallback((field: keyof LineItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle numeric input change - only allow valid numbers
  const handleNumericChange = useCallback((field: keyof LineItem, value: string) => {
    // Allow empty string, numbers, and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numValue = value === '' ? 0 : parseFloat(value) || 0;
      handleFieldChange(field, numValue);
    }
  }, [handleFieldChange]);

  // Format numeric value for display
  const formatNumericValue = useCallback((value: number | undefined): string => {
    if (value === undefined || value === null) return '';
    if (value === 0) return '';
    return value.toString();
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.no || !formData.description || !formData.quantity || formData.quantity <= 0) {
      return;
    }

    const newLineItem: LineItem = {
      id: lineItem?.id || `line-item-${Date.now()}`,
      type: formData.type!,
      no: formData.no,
      description: formData.description,
      uom: formData.uom,
      quantity: formData.quantity,
      mrp: formData.mrp,
      price: formData.price,
      unitPrice: formData.unitPrice || 0,
      totalMRP,
      discount: formData.discount || 0,
      amount,
      exempted: formData.exempted,
      gstGroupCode: formData.gstGroupCode,
      hsnSacCode: formData.hsnSacCode,
      tcsGroupCode: formData.tcsGroupCode,
    };

    onSubmit(newLineItem);
  }, [formData, totalMRP, amount, lineItem?.id, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Type */}
          <div className="space-y-2">
            <FieldTitle>Type</FieldTitle>
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="G/L Account">G/L Account</SelectItem>
                <SelectItem value="Item">Item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* No */}
          <div className="space-y-2">
            <FieldTitle>No.</FieldTitle>
            <div className="flex gap-2">
              <Input
                value={formData.no || ''}
                placeholder={`Select ${formData.type || 'Item'}`}
                readOnly
                className="bg-muted cursor-pointer"
                onClick={handleOpenItemSelector}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenItemSelector}
                className="shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <FieldTitle>Description</FieldTitle>
          <Input
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            disabled={!isDescriptionEditable}
            placeholder="Description"
          />
        </div>

        {/* UOM (only for Item) */}
        {isItemType && (
          <div className="space-y-2">
            <FieldTitle>UOM</FieldTitle>
            <Select
              value={formData.uom || ''}
              onValueChange={(value) => handleFieldChange('uom', value)}
              disabled={isLoadingUOM || uomOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingUOM ? 'Loading...' : 'Select UOM'} />
              </SelectTrigger>
              <SelectContent>
                {uomOptions.map((uom) => (
                  <SelectItem key={uom.Code} value={uom.Code}>
                    {uom.Code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Pricing Section */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-medium text-foreground">Pricing</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <FieldTitle>Quantity</FieldTitle>
            <Input
              type="text"
              inputMode="decimal"
              value={formatNumericValue(formData.quantity)}
              onChange={(e) => handleNumericChange('quantity', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0.00"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>MRP</FieldTitle>
            <Input
              type="text"
              inputMode="decimal"
              value={formatNumericValue(formData.mrp)}
              onChange={(e) => handleNumericChange('mrp', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0.00"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>Price</FieldTitle>
            <Input
              type="text"
              inputMode="decimal"
              value={formatNumericValue(formData.price)}
              onChange={(e) => handleNumericChange('price', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0.00"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <FieldTitle>Unit Price</FieldTitle>
            <Input
              type="text"
              inputMode="decimal"
              value={formatNumericValue(formData.unitPrice)}
              onChange={(e) => handleNumericChange('unitPrice', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0.00"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>Total MRP</FieldTitle>
            <Input
              type="text"
              value={totalMRP > 0 ? totalMRP.toFixed(2) : ''}
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
              value={formatNumericValue(formData.discount)}
              onChange={(e) => handleNumericChange('discount', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0.00"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <FieldTitle>Amount</FieldTitle>
          <Input
            type="text"
            value={amount > 0 ? amount.toFixed(2) : ''}
            disabled
            className="bg-muted font-medium"
            readOnly
          />
        </div>
      </div>

      {/* Item Details Section (only for Item type) */}
      {isItemType && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-medium text-foreground">Item Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <FieldTitle>Exempted</FieldTitle>
              <Input
                value={formData.exempted ? 'Yes' : 'No'}
                disabled
                className="bg-muted"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <FieldTitle>GST Group Code</FieldTitle>
              <Input
                value={formData.gstGroupCode || ''}
                disabled
                className="bg-muted"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <FieldTitle>HSN/SAC Code</FieldTitle>
              <Input
                value={formData.hsnSacCode || ''}
                disabled
                className="bg-muted"
                readOnly
              />
            </div>
          </div>
        </div>
      )}

      {/* TCS Group Code */}
      <div className="space-y-2 border-t pt-4">
        <FieldTitle>TCS Group Code</FieldTitle>
        {tcsOptions.length > 0 ? (
          <Select
            value={formData.tcsGroupCode || ''}
            onValueChange={(value) => handleFieldChange('tcsGroupCode', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select TCS Group Code" />
            </SelectTrigger>
            <SelectContent>
              {tcsOptions.map((tcs) => (
                <SelectItem key={tcs.TCS_Nature_of_Collection} value={tcs.TCS_Nature_of_Collection}>
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

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

// Memoized export to prevent unnecessary re-renders
export const LineItemForm = React.memo(LineItemFormComponent, (prev, next) => {
  return (
    prev.lineItem?.id === next.lineItem?.id &&
    prev.customerNo === next.customerNo
  );
});

LineItemForm.displayName = 'LineItemForm';
