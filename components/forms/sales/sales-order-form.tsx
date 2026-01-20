/**
 * Sales Order Form
 * Form component for creating/editing Sales Orders
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

interface SalesOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function SalesOrderForm({ tabId, formData: initialFormData, context }: SalesOrderFormProps) {
  const { tab, registerRefresh, handleSuccess, updateFormData } = useFormStack(tabId);
  const [userId, setUserId] = useState<string | undefined>(undefined);
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

  // Get logged-in user ID
  useEffect(() => {
    const credentials = getAuthCredentials();
    if (credentials) {
      setUserId(credentials.userID);
    }
  }, []);

  // Set Order Date to current date on mount (if not already set)
  useEffect(() => {
    if (!formData.orderDate) {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      setFormData((prev) => ({ ...prev, orderDate: formattedDate }));
    }
  }, []);

  // Register refresh callback
  useEffect(() => {
    registerRefresh(async () => {
      // TODO: Re-fetch data from API if editing
      // For now, just reset form
      console.log('Refreshing Sales Order form...');
    });
  }, [registerRefresh]);

  // Initialize form data from props (only once on mount or when initialFormData changes)
  useEffect(() => {
    if (initialFormData && Object.keys(initialFormData).length > 0) {
      setFormData((prev) => {
        // Only update if there's actual data and it's different
        const hasChanges = Object.keys(initialFormData).some(
          (key) => prev[key as keyof typeof prev] !== initialFormData[key]
        );
        if (hasChanges) {
          return { ...prev, ...initialFormData };
        }
        return prev;
      });
    }
  }, [initialFormData]);

  // Update tab formData whenever formData changes (deferred to avoid render issues)
  // Use a ref to track if we should update to prevent unnecessary updates
  const prevFormDataRef = React.useRef(formData);
  useEffect(() => {
    // Only update if formData actually changed
    if (JSON.stringify(prevFormDataRef.current) !== JSON.stringify(formData)) {
      prevFormDataRef.current = formData;
      updateFormData(formData);
    }
  }, [formData, updateFormData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = useCallback((customerNo: string, customer?: SalesCustomer) => {
    setFormData((prev) => ({
      ...prev,
      customerNo,
      customerName: customer?.Name || '',
      salesPersonCode: customer?.Salesperson_Code || prev.salesPersonCode,
      // Clear ship-to code when customer changes
      shipToCode: '',
      locationCode: '',
    }));
  }, []);

  const handleShipToChange = useCallback((shipToCode: string, shipTo?: ShipToAddress) => {
    setFormData((prev) => {
      // Only update if value actually changed to prevent unnecessary re-renders
      if (prev.shipToCode === shipToCode && prev.locationCode === (shipTo?.Location_Code || prev.locationCode)) {
        return prev;
      }
      return {
        ...prev,
        shipToCode,
        // Auto-populate location code but keep it editable
        locationCode: shipTo?.Location_Code || prev.locationCode,
      };
    });
  }, []);

  const handleSubmit = async () => {
    try {
      // TODO: Implement API call
      console.log('Submitting Sales Order:', formData);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // On success, handle auto-close
      await handleSuccess();
    } catch (error) {
      console.error('Error submitting Sales Order:', error);
      // TODO: Show error dialog
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6">
          {/* Dimension Information Section - Moved to First */}
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
                  <Input
                    value={formData.customerName}
                    disabled
                    className="bg-muted"
                  />
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
                />
              </div>
              <div className="space-y-2">
                <FieldTitle>Location Code</FieldTitle>
                <Input
                  value={formData.locationCode}
                  onChange={(e) => handleInputChange('locationCode', e.target.value)}
                  placeholder="Enter location code"
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
                />
              </div>
              <div className="space-y-2">
                <FieldTitle>Document Date</FieldTitle>
                <Input
                  type="date"
                  value={formData.documentDate}
                  onChange={(e) => handleInputChange('documentDate', e.target.value)}
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
                />
              </div>
            </div>
          </div>

          {/* Document Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Document Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Status field - Hidden for create mode, will be shown in edit mode
                  TODO: Uncomment and show this field when implementing edit functionality */}
              {/* <div className="space-y-2">
                <FieldTitle>Status</FieldTitle>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
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
      </div>

      <div className="px-6 py-4 border-t">
        <Button onClick={handleSubmit} className="w-full">
          Create Order
        </Button>
      </div>
    </div>
  );
}
