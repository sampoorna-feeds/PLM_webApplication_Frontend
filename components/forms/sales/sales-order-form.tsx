/**
 * Sales Order Form - Multi-Step Wizard
 * Step 1: Order Information
 * Step 2: Line Items
 * Step 3: Order Summary & Submission
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { CascadingDimensionSelect } from '@/components/forms/cascading-dimension-select';
import { CustomerSelect, type SalesCustomer } from './customer-select';
import { ShipToSelect } from './shipto-select';
import type { ShipToAddress } from '@/lib/api/services/shipto.service';
import { useFormStack } from '@/lib/form-stack/use-form-stack';
import { getAuthCredentials } from '@/lib/auth/storage';
import { LineItemForm, type LineItem } from './line-item-form';
import { LineItemsTable } from './line-items-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createSalesOrder,
  addSalesOrderLineItems,
  type SalesOrderData,
  type SalesOrderLineItem,
} from '@/lib/api/services/sales-order.service';

interface SalesOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

type Step = 1 | 2 | 3;

export function SalesOrderForm({ tabId, formData: initialFormData, context }: SalesOrderFormProps) {
  const { registerRefresh, handleSuccess, updateFormData } = useFormStack(tabId);
  
  const [formData, setFormData] = useState({
    customerNo: '',
    customerName: '',
    shipToCode: '',
    shippingFrom: '',
    salesPersonCode: '',
    locationCode: '',
    postingDate: '',
    documentDate: '',
    orderDate: '',
    externalDocumentNo: '',
    status: '',
    invoiceType: '',
    lob: '',
    branch: '',
    loc: '',
    ...initialFormData,
  });

  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [editingLineItem, setEditingLineItem] = useState<LineItem | null>(null);
  const [isLineItemDialogOpen, setIsLineItemDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Only sync to FormStack when needed (step changes, not on every keystroke)
  // This prevents re-renders that cause focus loss

  // Get logged-in user ID
  useEffect(() => {
    const credentials = getAuthCredentials();
    if (credentials) {
      setUserId(credentials.userID);
    }
  }, []);

  // Set Order Date to current date on mount
  useEffect(() => {
    if (!formData.orderDate) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setFormData((prev) => ({ ...prev, orderDate: formattedDate }));
    }
  }, []);

  // Register refresh callback
  useEffect(() => {
    registerRefresh(async () => {
      console.log('Refreshing Sales Order form...');
    });
  }, [registerRefresh]);

  // Initialize form data from props
  useEffect(() => {
    if (initialFormData && Object.keys(initialFormData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialFormData }));
    }
  }, [initialFormData]);

  // Simple input change handler
  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    // Don't call updateFormData here - it causes re-renders and focus loss
    // We'll sync on step changes instead
  };

  // Customer change handler
  const handleCustomerChange = (customerNo: string, customer?: SalesCustomer) => {
    const newData = {
      ...formData,
      customerNo,
      customerName: customer?.Name || '',
      salesPersonCode: customer?.Salesperson_Code || formData.salesPersonCode,
      shipToCode: '',
      locationCode: '',
    };
    setFormData(newData);
    // Don't call updateFormData - it causes re-renders
  };

  // ShipTo change handler
  const handleShipToChange = (shipToCode: string, shipTo?: ShipToAddress) => {
    const newData = {
      ...formData,
      shipToCode,
      locationCode: shipTo?.Location_Code || formData.locationCode,
    };
    setFormData(newData);
    // Don't call updateFormData - it causes re-renders
  };

  // Step navigation
  const canGoToStep = (step: Step): boolean => {
    if (step === 1) return true;
    if (step === 2) {
      return !!(
        formData.customerNo &&
        formData.postingDate &&
        formData.documentDate &&
        formData.orderDate
      );
    }
    if (step === 3) {
      return lineItems.length > 0;
    }
    return false;
  };

  const handleNext = () => {
    if (currentStep < 3 && canGoToStep((currentStep + 1) as Step)) {
      setCurrentStep((currentStep + 1) as Step);
      // Sync to FormStack when changing steps
      updateFormData({ ...formData, lineItems });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
      // Sync to FormStack when changing steps
      updateFormData({ ...formData, lineItems });
    }
  };

  const handleStepClick = (step: Step) => {
    if (canGoToStep(step)) {
      setCurrentStep(step);
      // Sync to FormStack when changing steps
      updateFormData({ ...formData, lineItems });
    }
  };

  // Line Items management
  const handleAddLineItem = () => {
    setEditingLineItem(null);
    setIsLineItemDialogOpen(true);
  };

  const handleEditLineItem = (lineItem: LineItem) => {
    setEditingLineItem(lineItem);
    setIsLineItemDialogOpen(true);
  };

  const handleSaveLineItem = (lineItem: LineItem) => {
    let updated: LineItem[];
    if (editingLineItem) {
      updated = lineItems.map((item) => (item.id === editingLineItem.id ? lineItem : item));
      setLineItems(updated);
    } else {
      updated = [...lineItems, lineItem];
      setLineItems(updated);
    }
    setIsLineItemDialogOpen(false);
    setEditingLineItem(null);
    // Sync to FormStack after line item operation
    updateFormData({ ...formData, lineItems: updated });
  };

  const handleRemoveLineItem = (lineItemId: string) => {
    const updated = lineItems.filter((item) => item.id !== lineItemId);
    setLineItems(updated);
    // Sync to FormStack after removing line item
    updateFormData({ ...formData, lineItems: updated });
  };

  const handleUpdateLineItem = (lineItem: LineItem) => {
    const updated = lineItems.map((item) => (item.id === lineItem.id ? lineItem : item));
    setLineItems(updated);
    // Sync to FormStack after updating line item
    updateFormData({ ...formData, lineItems: updated });
  };

  // Final submission
  const handlePlaceOrder = async () => {
    if (!canGoToStep(3)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData: SalesOrderData = {
        customerNo: formData.customerNo,
        shipToCode: formData.shipToCode,
        shippingFrom: formData.shippingFrom,
        salesPersonCode: formData.salesPersonCode,
        locationCode: formData.locationCode,
        postingDate: formData.postingDate,
        documentDate: formData.documentDate,
        orderDate: formData.orderDate,
        externalDocumentNo: formData.externalDocumentNo,
        invoiceType: formData.invoiceType,
        lob: formData.lob,
        branch: formData.branch,
        loc: formData.loc,
      };

      const orderResponse = await createSalesOrder(orderData);
      const orderId = orderResponse.orderId;

      if (!orderId) {
        throw new Error('Failed to create order: No order ID returned');
      }

      const lineItemsData: SalesOrderLineItem[] = lineItems.map((item) => ({
        type: item.type,
        no: item.no,
        description: item.description,
        uom: item.uom,
        quantity: item.quantity,
        mrp: item.mrp,
        price: item.price,
        unitPrice: item.unitPrice,
        totalMRP: item.totalMRP,
        discount: item.discount,
        amount: item.amount,
        exempted: item.exempted,
        gstGroupCode: item.gstGroupCode,
        hsnSacCode: item.hsnSacCode,
        tcsGroupCode: item.tcsGroupCode,
      }));

      await addSalesOrderLineItems(orderId, lineItemsData);
      await handleSuccess();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Order Information
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Dimension Information Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Dimension Information</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <FieldTitle>LOB</FieldTitle>
            <CascadingDimensionSelect
              dimensionType="LOB"
              value={formData.lob}
              onChange={(value) => handleInputChange('lob', value)}
              placeholder="Select LOB"
              userId={userId}
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>Branch</FieldTitle>
            <CascadingDimensionSelect
              dimensionType="BRANCH"
              value={formData.branch}
              onChange={(value) => handleInputChange('branch', value)}
              placeholder="Select Branch"
              lobValue={formData.lob}
              userId={userId}
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>LOC</FieldTitle>
            <CascadingDimensionSelect
              dimensionType="LOC"
              value={formData.loc}
              onChange={(value) => handleInputChange('loc', value)}
              placeholder="Select LOC"
              lobValue={formData.lob}
              branchValue={formData.branch}
              userId={userId}
            />
          </div>
        </div>
      </div>

      {/* Customer Information Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Customer Information</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <FieldTitle>Customer</FieldTitle>
            <CustomerSelect
              value={formData.customerNo}
              onChange={handleCustomerChange}
              placeholder="Select customer"
            />
          </div>
          {formData.customerName && (
            <div className="space-y-2">
              <FieldTitle>Customer Name</FieldTitle>
              <Input value={formData.customerName} disabled className="bg-muted" />
            </div>
          )}
        </div>
      </div>

      {/* Shipping Information Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Shipping Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldTitle>Ship to Code</FieldTitle>
            <ShipToSelect
              customerNo={formData.customerNo}
              value={formData.shipToCode}
              onChange={handleShipToChange}
              placeholder="Select ship-to address"
              tabId={tabId}
              loc={formData.loc}
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>Shipping From</FieldTitle>
            <Input
              value={formData.shippingFrom}
              onChange={(e) => handleInputChange('shippingFrom', e.target.value)}
              placeholder="Enter shipping from"
              onFocus={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldTitle>Sales Person Code/Name</FieldTitle>
            <Input
              value={formData.salesPersonCode}
              onChange={(e) => handleInputChange('salesPersonCode', e.target.value)}
              placeholder="Enter sales person code/name"
              onFocus={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>Location Code</FieldTitle>
            <Input
              value={formData.locationCode}
              onChange={(e) => handleInputChange('locationCode', e.target.value)}
              placeholder="Enter location code"
              onFocus={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
        </div>
      </div>

      {/* Date Information Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Date Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldTitle>Posting Date</FieldTitle>
            <Input
              type="date"
              value={formData.postingDate}
              onChange={(e) => handleInputChange('postingDate', e.target.value)}
              onFocus={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>Document Date</FieldTitle>
            <Input
              type="date"
              value={formData.documentDate}
              onChange={(e) => handleInputChange('documentDate', e.target.value)}
              onFocus={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldTitle>Order Date</FieldTitle>
            <Input
              type="date"
              value={formData.orderDate}
              onChange={(e) => handleInputChange('orderDate', e.target.value)}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle>External Document No.</FieldTitle>
            <Input
              value={formData.externalDocumentNo}
              onChange={(e) => handleInputChange('externalDocumentNo', e.target.value)}
              placeholder="Enter external document number"
              onFocus={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
        </div>
      </div>

      {/* Document Information Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Document Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FieldTitle>Invoice Type</FieldTitle>
            <Select
              value={formData.invoiceType}
              onValueChange={(value) => handleInputChange('invoiceType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select invoice type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bill of supply">Bill of supply</SelectItem>
                <SelectItem value="Export">Export</SelectItem>
                <SelectItem value="Supplementary">Supplementary</SelectItem>
                <SelectItem value="Debit Note">Debit Note</SelectItem>
                <SelectItem value="Non-GST">Non-GST</SelectItem>
                <SelectItem value="Taxable">Taxable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2: Line Items
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">Line Items</h3>
        <Button onClick={handleAddLineItem} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>
      <LineItemsTable
        lineItems={lineItems}
        onEdit={handleEditLineItem}
        onRemove={handleRemoveLineItem}
        onUpdate={handleUpdateLineItem}
        editable={true}
      />
      {lineItems.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No line items added. Click "Add Item" to add your first item.
        </div>
      )}
    </div>
  );

  // Step 3: Order Summary
  const renderStep3 = () => {
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    return (
      <div className="space-y-6">
        {/* Order Information Summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Order Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Customer:</span>{' '}
              <span className="font-medium">{formData.customerName || formData.customerNo}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Order Date:</span>{' '}
              <span className="font-medium">{formData.orderDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Posting Date:</span>{' '}
              <span className="font-medium">{formData.postingDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Document Date:</span>{' '}
              <span className="font-medium">{formData.documentDate}</span>
            </div>
            {formData.shipToCode && (
              <div>
                <span className="text-muted-foreground">Ship To:</span>{' '}
                <span className="font-medium">{formData.shipToCode}</span>
              </div>
            )}
            {formData.invoiceType && (
              <div>
                <span className="text-muted-foreground">Invoice Type:</span>{' '}
                <span className="font-medium">{formData.invoiceType}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Summary */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-muted-foreground">Line Items</h3>
            <Button onClick={handleAddLineItem} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          <LineItemsTable
            lineItems={lineItems}
            onEdit={handleEditLineItem}
            onRemove={handleRemoveLineItem}
            onUpdate={handleUpdateLineItem}
            editable={true}
          />
        </div>

        {/* Total Summary */}
        <div className="border-t pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold text-lg">{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Step Indicators */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <button
                onClick={() => handleStepClick(step as Step)}
                disabled={!canGoToStep(step as Step)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md transition-colors',
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : canGoToStep(step as Step)
                      ? 'hover:bg-muted text-foreground'
                      : 'text-muted-foreground cursor-not-allowed opacity-50'
                )}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-current/20 text-xs font-medium">
                  {step}
                </span>
                <span className="text-sm font-medium">
                  {step === 1 && 'Order Info'}
                  {step === 2 && 'Line Items'}
                  {step === 3 && 'Review'}
                </span>
              </button>
              {step < 3 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {/* Step Navigation */}
      <div className="px-6 py-4 border-t flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        {currentStep < 3 ? (
          <Button onClick={handleNext} disabled={!canGoToStep((currentStep + 1) as Step)}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handlePlaceOrder} disabled={isSubmitting || !canGoToStep(3)}>
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </Button>
        )}
      </div>

      {/* Line Item Dialog */}
      <Dialog open={isLineItemDialogOpen} onOpenChange={setIsLineItemDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLineItem ? 'Edit Line Item' : 'Add Line Item'}
            </DialogTitle>
          </DialogHeader>
          <LineItemForm
            lineItem={editingLineItem || undefined}
            customerNo={formData.customerNo}
            onSubmit={handleSaveLineItem}
            onCancel={() => {
              setIsLineItemDialogOpen(false);
              setEditingLineItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
