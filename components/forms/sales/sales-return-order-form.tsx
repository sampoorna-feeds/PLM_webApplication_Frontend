/**
 * Sales Return Order Form
 * Form component for creating/editing Sales Return Orders
 */

'use client';

import React, { useState, useEffect } from 'react';
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
import { useFormStack } from '@/lib/form-stack/use-form-stack';

interface SalesReturnOrderFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function SalesReturnOrderForm({ tabId, formData: initialFormData, context }: SalesReturnOrderFormProps) {
  const { registerRefresh, handleSuccess, updateFormData } = useFormStack(tabId);
  const [formData, setFormData] = useState({
    customerNo: '',
    customerName: '',
    returnDate: '',
    postingDate: '',
    documentDate: '',
    externalDocumentNo: '',
    status: '',
    reason: '',
    lob: '',
    branch: '',
    loc: '',
    ...initialFormData,
  });

  useEffect(() => {
    registerRefresh(async () => {
      console.log('Refreshing Sales Return Order form...');
    });
  }, [registerRefresh]);

  useEffect(() => {
    if (initialFormData) {
      setFormData((prev) => ({ ...prev, ...initialFormData }));
    }
  }, [initialFormData]);

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateFormData(newData);
  };

  const handleSubmit = async () => {
    try {
      console.log('Submitting Sales Return Order:', formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await handleSuccess();
    } catch (error) {
      console.error('Error submitting Sales Return Order:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Not available for now
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
