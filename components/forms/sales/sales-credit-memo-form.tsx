/**
 * Sales Credit Memo Form
 * Form component for creating/editing Sales Credit Memos
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

interface SalesCreditMemoFormProps {
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}

export function SalesCreditMemoForm({ tabId, formData: initialFormData, context }: SalesCreditMemoFormProps) {
  const { registerRefresh, handleSuccess, updateFormData } = useFormStack(tabId);
  const [formData, setFormData] = useState({
    customerNo: '',
    customerName: '',
    creditMemoDate: '',
    postingDate: '',
    documentDate: '',
    externalDocumentNo: '',
    status: '',
    reason: '',
    amount: '',
    lob: '',
    branch: '',
    loc: '',
    ...initialFormData,
  });

  useEffect(() => {
    registerRefresh(async () => {
      console.log('Refreshing Sales Credit Memo form...');
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
      console.log('Submitting Sales Credit Memo:', formData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await handleSuccess();
    } catch (error) {
      console.error('Error submitting Sales Credit Memo:', error);
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
