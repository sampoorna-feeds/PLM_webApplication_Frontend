'use client';

/**
 * Line Item Form Component
 * Form for adding/editing a single line item in a sales order
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { SearchableSelect } from '@/components/forms/shared/searchable-select';
import {
  getGLAccounts,
  searchGLAccounts,
  getGLAccountsPage,
  type GLAccount,
} from '@/lib/api/services/gl-account.service';
import {
  getItems,
  searchItems,
  getItemsPage,
  searchItemsByField,
  getItemUnitOfMeasures,
  type Item,
  type ItemUnitOfMeasure,
} from '@/lib/api/services/item.service';
import { getTCSGroupCodes, type TCSGroupCode } from '@/lib/api/services/tcs.service';

export interface LineItem {
  id: string; // temporary ID for UI
  type: 'G/L Account' | 'Item';
  no: string;
  description: string;
  uom?: string; // only for Item
  quantity: number;
  mrp?: number;
  price?: number;
  unitPrice: number;
  totalMRP: number; // calculated: Unit Price * Quantity
  discount: number;
  amount: number; // calculated: unitPrice * quantity - discount
  exempted?: boolean; // from Item API
  gstGroupCode?: string; // from Item API
  hsnSacCode?: string; // from Item API
  tcsGroupCode?: string;
}

interface LineItemFormProps {
  lineItem?: LineItem;
  customerNo?: string;
  onSubmit: (lineItem: LineItem) => void;
  onCancel: () => void;
}

function LineItemFormComponent({ lineItem, customerNo, onSubmit, onCancel }: LineItemFormProps) {
  const initialType = lineItem?.type || 'Item';
  const [formData, setFormData] = useState<Partial<LineItem>>({
    type: initialType,
    no: lineItem?.no || '',
    description: lineItem?.description || '',
    uom: lineItem?.uom || '',
    quantity: lineItem?.quantity || 0,
    mrp: lineItem?.mrp || 0,
    price: lineItem?.price || 0,
    unitPrice: lineItem?.unitPrice || 0,
    totalMRP: lineItem?.totalMRP || 0,
    discount: lineItem?.discount || 0,
    amount: lineItem?.amount || 0,
    exempted: lineItem?.exempted || false,
    gstGroupCode: lineItem?.gstGroupCode || '',
    hsnSacCode: lineItem?.hsnSacCode || '',
    tcsGroupCode: lineItem?.tcsGroupCode || '',
  });

  const [uomOptions, setUomOptions] = useState<ItemUnitOfMeasure[]>([]);
  const [isDescriptionEditable, setIsDescriptionEditable] = useState(initialType === 'G/L Account');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedGLAccount, setSelectedGLAccount] = useState<GLAccount | null>(null);
  const [tcsOptions, setTcsOptions] = useState<TCSGroupCode[]>([]);

  // Load TCS Group Codes when customerNo is available
  useEffect(() => {
    if (customerNo) {
      getTCSGroupCodes(customerNo)
        .then((codes) => {
          setTcsOptions(codes);
        })
        .catch((error) => {
          console.error('Error loading TCS Group Codes:', error);
          setTcsOptions([]);
        });
    } else {
      setTcsOptions([]);
    }
  }, [customerNo]);

  // Calculate derived fields - Amount = Unit Price * Quantity - Discount
  const calculateAmounts = useCallback(() => {
    const quantity = formData.quantity || 0;
    const unitPrice = formData.unitPrice || 0;
    const discount = formData.discount || 0;

    const totalMRP = unitPrice * quantity;
    const amount = (unitPrice * quantity) - discount;

    setFormData((prev) => ({
      ...prev,
      totalMRP,
      amount,
    }));
  }, [formData.quantity, formData.unitPrice, formData.discount]);

  // Recalculate when quantity, unitPrice, or discount changes
  useEffect(() => {
    calculateAmounts();
  }, [formData.quantity, formData.unitPrice, formData.discount, calculateAmounts]);

  // Load UOM when Item is selected
  useEffect(() => {
    if (formData.type === 'Item' && formData.no) {
      getItemUnitOfMeasures(formData.no)
        .then((uoms) => {
          setUomOptions(uoms);
          // Auto-select first UOM if none selected and we're not editing
          if (!formData.uom && uoms.length > 0 && !lineItem) {
            setFormData((prev) => ({ ...prev, uom: uoms[0].Code }));
          }
        })
        .catch((error) => {
          console.error('Error loading UOM:', error);
          setUomOptions([]);
        });
    } else {
      setUomOptions([]);
      if (formData.type !== 'Item') {
        setFormData((prev) => ({ ...prev, uom: '' }));
      }
    }
  }, [formData.type, formData.no, lineItem]);

  // Handle type change
  const handleTypeChange = (type: 'G/L Account' | 'Item') => {
    setFormData((prev) => ({
      ...prev,
      type,
      no: '',
      description: '',
      uom: type === 'Item' ? prev.uom : '', // Clear UOM for GL Account
      exempted: false,
      gstGroupCode: '',
      hsnSacCode: '',
    }));
    setSelectedItem(null);
    setSelectedGLAccount(null);
    setIsDescriptionEditable(type === 'G/L Account');
    // Clear UOM options for GL Account
    if (type === 'G/L Account') {
      setUomOptions([]);
    }
  };

  // Handle GL Account selection
  const handleGLAccountChange = (value: string, account?: GLAccount) => {
    if (account) {
      setSelectedGLAccount(account);
      setFormData((prev) => ({
        ...prev,
        no: account.No,
        description: account.Name, // Description is editable for GL Account
      }));
    }
  };

  // Handle Item selection
  const handleItemChange = (value: string, item?: Item) => {
    if (item) {
      setSelectedItem(item);
      setFormData((prev) => ({
        ...prev,
        no: item.No,
        description: item.Description, // Description is read-only for Item
        exempted: item.Exempted || false,
        gstGroupCode: item.GST_Group_Code || '',
        hsnSacCode: item.HSN_SAC_Code || '',
      }));
      setIsDescriptionEditable(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
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
      unitPrice: formData.unitPrice,
      totalMRP: formData.totalMRP || 0,
      discount: formData.discount,
      amount: formData.amount || 0,
      exempted: formData.exempted,
      gstGroupCode: formData.gstGroupCode,
      hsnSacCode: formData.hsnSacCode,
      tcsGroupCode: formData.tcsGroupCode,
    };

    onSubmit(newLineItem);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div className="space-y-2">
          <FieldTitle>Type</FieldTitle>
          <Select
            value={formData.type}
            onValueChange={(value) => handleTypeChange(value as 'G/L Account' | 'Item')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="G/L Account">G/L Account</SelectItem>
              <SelectItem value="Item">Item</SelectItem>
              {/* Disabled options for now */}
              <SelectItem value="Resource" disabled>Resource</SelectItem>
              <SelectItem value="Fixed Asset" disabled>Fixed Asset</SelectItem>
              <SelectItem value="Charge (Item)" disabled>Charge (Item)</SelectItem>
              <SelectItem value="Allocation Account" disabled>Allocation Account</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* No */}
        <div className="space-y-2">
          <FieldTitle>No.</FieldTitle>
          {formData.type === 'G/L Account' ? (
            <SearchableSelect<GLAccount>
              value={formData.no || ''}
              onChange={handleGLAccountChange}
              placeholder="Select GL Account"
              loadInitial={() => getGLAccounts(20)}
              searchItems={searchGLAccounts}
              loadMore={(skip, search) => getGLAccountsPage(skip, search)}
              getDisplayValue={(item) => `${item.No} - ${item.Name}`}
              getItemValue={(item) => item.No}
              supportsDualSearch={true}
              searchByField={async (query, field) => {
                // Use the searchGLAccounts function which already handles dual search
                // For field-specific search, we can filter the results
                const results = await searchGLAccounts(query);
                if (field === 'No') {
                  return results.filter((acc) => acc.No.toLowerCase().includes(query.toLowerCase()));
                } else {
                  return results.filter((acc) => acc.Name.toLowerCase().includes(query.toLowerCase()));
                }
              }}
            />
          ) : (
            <SearchableSelect<Item>
              value={formData.no || ''}
              onChange={handleItemChange}
              placeholder="Select Item"
              loadInitial={() => getItems(20)}
              searchItems={searchItems}
              loadMore={(skip, search) => getItemsPage(skip, search)}
              getDisplayValue={(item) => `${item.No} - ${item.Description}`}
              getItemValue={(item) => item.No}
              supportsDualSearch={true}
              searchByField={searchItemsByField}
            />
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <FieldTitle>Description</FieldTitle>
        <Input
          value={formData.description || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          disabled={!isDescriptionEditable}
          placeholder="Description"
          onFocus={(e) => {
            e.stopPropagation();
          }}
        />
      </div>

      {/* UOM (only for Item, blank for GL Account) */}
      <div className="space-y-2">
        <FieldTitle>UOM</FieldTitle>
        {formData.type === 'Item' ? (
          <Select
            value={formData.uom || ''}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, uom: value }))}
          >
            <SelectTrigger>
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
        ) : (
          <Input
            value=""
            disabled
            className="bg-muted"
            placeholder="Not applicable for G/L Account"
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Quantity */}
        <div className="space-y-2">
          <FieldTitle>Quantity</FieldTitle>
          <Input
            type="number"
            step="0.01"
            value={formData.quantity || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))
            }
            placeholder="0.00"
            onFocus={(e) => {
              e.stopPropagation();
            }}
          />
        </div>

        {/* MRP */}
        <div className="space-y-2">
          <FieldTitle>MRP</FieldTitle>
          <Input
            type="number"
            step="0.01"
            value={formData.mrp || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, mrp: parseFloat(e.target.value) || 0 }))
            }
            placeholder="0.00"
            onFocus={(e) => {
              e.stopPropagation();
            }}
          />
        </div>

        {/* Price */}
        <div className="space-y-2">
          <FieldTitle>Price</FieldTitle>
          <Input
            type="number"
            step="0.01"
            value={formData.price || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
            }
            placeholder="0.00"
            onFocus={(e) => {
              e.stopPropagation();
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Unit Price */}
        <div className="space-y-2">
          <FieldTitle>Unit Price</FieldTitle>
          <Input
            type="number"
            step="0.01"
            value={formData.unitPrice || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))
            }
            placeholder="0.00"
            onFocus={(e) => {
              e.stopPropagation();
            }}
          />
        </div>

        {/* Total MRP (calculated) */}
        <div className="space-y-2">
          <FieldTitle>Total MRP</FieldTitle>
          <Input
            type="number"
            value={formData.totalMRP || 0}
            disabled
            className="bg-muted"
            placeholder="0.00"
          />
        </div>

        {/* Discount */}
        <div className="space-y-2">
          <FieldTitle>Discount</FieldTitle>
          <Input
            type="number"
            step="0.01"
            value={formData.discount || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))
            }
            placeholder="0.00"
            onFocus={(e) => {
              e.stopPropagation();
            }}
          />
        </div>
      </div>

      {/* Amount (calculated) */}
      <div className="space-y-2">
        <FieldTitle>Amount</FieldTitle>
        <Input
          type="number"
          value={formData.amount || 0}
          disabled
          className="bg-muted"
          placeholder="0.00"
        />
      </div>

      {/* Display-only fields for Item */}
      {formData.type === 'Item' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldTitle>Exempted</FieldTitle>
            <Input
              value={formData.exempted ? 'Yes' : 'No'}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>GST Group Code</FieldTitle>
            <Input
              value={formData.gstGroupCode || ''}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>HSN/SAC Code</FieldTitle>
            <Input
              value={formData.hsnSacCode || ''}
              disabled
              className="bg-muted"
            />
          </div>
        </div>
      )}

      {/* TCS Group Code */}
      <div className="space-y-2">
        <FieldTitle>TCS Group Code</FieldTitle>
        {customerNo ? (
          <Select
            value={formData.tcsGroupCode || ''}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, tcsGroupCode: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select TCS Group Code" />
            </SelectTrigger>
            <SelectContent>
              {tcsOptions.length > 0 ? (
                tcsOptions.map((tcs) => (
                  <SelectItem key={tcs.TCS_Nature_of_Collection} value={tcs.TCS_Nature_of_Collection}>
                    {tcs.TCS_Nature_of_Collection}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No TCS codes available
                </div>
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={formData.tcsGroupCode || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, tcsGroupCode: e.target.value }))}
            placeholder="Select customer first"
            disabled
            className="bg-muted"
          />
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export const LineItemForm = React.memo(LineItemFormComponent, (prev, next) => {
  // Only re-render if lineItem or customerNo changed
  return (
    prev.lineItem?.id === next.lineItem?.id &&
    prev.customerNo === next.customerNo
  );
});

LineItemForm.displayName = 'LineItemForm';
