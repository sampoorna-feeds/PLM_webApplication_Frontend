'use client';

/**
 * Voucher Form component
 * Dashboard-style form with table for multiple entries
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { voucherSchema, type VoucherFormData } from '@/lib/validations/voucher.validation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldLabel, FieldError } from '@/components/ui/field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';

// Extended type for entries with ID
type VoucherEntry = VoucherFormData & { id: string };

export function VoucherForm() {
  // Track accountType for conditional rendering
  const [accountType, setAccountType] = useState<VoucherFormData['accountType']>(undefined);
  
  // State for entries table
  const [entries, setEntries] = useState<VoucherEntry[]>([]);
  
  // State for warning dialogs
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showReloadWarning, setShowReloadWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  
  // Track if form has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const form = useForm<VoucherFormData>({
    validatorAdapter: zodValidator(),
    defaultValues: {
      voucherType: undefined,
      documentType: undefined,
      postingDate: '',
      documentDate: '',
      accountType: undefined,
      accountNo: '',
      externalDocumentNo: '',
      tdsSection: undefined,
      tcsSection: undefined,
      description: '',
      amount: 0,
      balanceAccountType: undefined,
      balanceAccountNo: '',
      lineNarration: '',
      lob: '',
      branch: '',
      loc: '',
      employee: '',
      assignment: '',
    },
    onSubmit: async ({ value }) => {
      // This will be called when submitting all entries
      console.log('Submitting entries:', entries);
      // TODO: API call will be integrated here
    },
  });

  // Track form changes
  useEffect(() => {
    const subscription = form.store.subscribe((state) => {
      if (!state.values) {
        setHasUnsavedChanges(false);
        return;
      }
      
      const hasValues = Object.values(state.values).some((val) => {
        if (val === undefined || val === '' || val === 0) return false;
        if (typeof val === 'object' && val !== null) {
          return Object.values(val).some((v) => v !== undefined && v !== '' && v !== 0);
        }
        return true;
      });
      setHasUnsavedChanges(hasValues);
    });
    return () => subscription();
  }, [form]);

  // Handle page reload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (entries.length > 0 || hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [entries, hasUnsavedChanges]);

  // Determine which sections to show based on accountType
  const showTdsSection = accountType === 'Vendor';
  const showTcsSection = accountType === 'Customer';

  // Reset form to default values
  const resetForm = useCallback(() => {
    form.reset();
    setAccountType(undefined);
    setHasUnsavedChanges(false);
    setPendingEditId(null);
  }, [form]);

  // Add entry to table
  const handleAddEntry = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      // Validate all fields first to show error messages
      await form.validateAllFields('change');
      
      // Wait a bit for validation to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check for field-level errors
      const fieldErrors: string[] = [];
      Object.keys(form.state.fieldMeta).forEach(key => {
        const meta = form.state.fieldMeta[key];
        if (meta?.errors && meta.errors.length > 0) {
          fieldErrors.push(key);
          console.log(`Field ${key} has errors:`, meta.errors);
        }
      });
      
      // Check form-level errors
      const formErrors = form.state.errors || [];
      const hasFormErrors = Array.isArray(formErrors) ? formErrors.length > 0 : Object.keys(formErrors).length > 0;
      
      // Try to validate using the schema directly
      let schemaValidationPassed = false;
      try {
        const formValues = form.state.values;
        if (formValues) {
          // Validate against the schema directly
          const result = voucherSchema.safeParse(formValues);
          if (result.success) {
            schemaValidationPassed = true;
            console.log('Schema validation passed');
          } else {
            console.log('Schema validation failed:', result.error.errors);
            // Add schema errors to field errors
            result.error.errors.forEach((error) => {
              if (error.path && error.path.length > 0) {
                const fieldName = error.path[0] as string;
                if (!fieldErrors.includes(fieldName)) {
                  fieldErrors.push(fieldName);
                }
              }
            });
          }
        }
      } catch (schemaError) {
        console.log('Schema validation threw error:', schemaError);
      }
      
      // Check if we have any errors
      if (fieldErrors.length > 0 || hasFormErrors || !schemaValidationPassed) {
        console.log('Validation failed - field errors:', fieldErrors);
        console.log('Form errors:', formErrors);
        console.log('Form state:', {
          values: form.state.values,
          errors: form.state.errors,
        });
        
        // Scroll to first error field
        setTimeout(() => {
          const firstErrorField = document.querySelector('[data-field-error="true"], .text-destructive, [class*="text-destructive"]');
          if (firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }

      const formValues = form.state.values;
      console.log('Validation passed! Adding entry with values:', formValues);
      
      if (!formValues) {
        console.error('Form values are empty');
        return;
      }
      
      const newEntry: VoucherEntry = {
        ...formValues,
        id: Date.now().toString(),
      };

      console.log('New entry created:', newEntry);
      
      setEntries((prev) => {
        const updated = [...prev, newEntry];
        console.log('Updated entries - previous count:', prev.length, 'new count:', updated.length);
        return updated;
      });
      
      // Small delay before reset to ensure state update
      await new Promise(resolve => setTimeout(resolve, 10));
      resetForm();
    } catch (error) {
      console.error('Error in handleAddEntry:', error);
    }
  };

  // Handle edit click
  const handleEditClick = (entryId: string) => {
    // If already editing this entry, do nothing
    if (pendingEditId === entryId) {
      return;
    }

    // Check if form has any values (unsaved data) or if we're currently editing another entry
    const formValues = form.state.values;
    const hasFormData = formValues && Object.values(formValues).some((val) => {
      if (val === undefined || val === '' || val === 0) return false;
      if (typeof val === 'object' && val !== null) {
        return Object.values(val).some((v) => v !== undefined && v !== '' && v !== 0);
      }
      return true;
    });

    // If we're switching from one entry to another, or form has unsaved changes, show warning
    if (pendingEditId !== null || hasUnsavedChanges || hasFormData) {
      setPendingEditId(entryId);
      setShowUnsavedWarning(true);
      return;
    }

    loadEntryForEdit(entryId);
  };

  // Load entry into form for editing
  const loadEntryForEdit = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    // Reset form first to clear any existing data
    form.reset();
    setAccountType(undefined);
    
    // Small delay to ensure form is reset before setting new values
    setTimeout(() => {
      // Set all form values
      Object.keys(entry).forEach((key) => {
        if (key !== 'id') {
          const value = entry[key as keyof VoucherFormData];
          form.setFieldValue(key as keyof VoucherFormData, value);
        }
      });

      setAccountType(entry.accountType);
      setPendingEditId(entryId);
      setHasUnsavedChanges(true);
    }, 10);
  };

  // Confirm edit after warning
  const handleConfirmEdit = () => {
    const entryIdToEdit = pendingEditId;
    setShowUnsavedWarning(false);
    // Clear pendingEditId first, then load the new entry
    setPendingEditId(null);
    
    if (entryIdToEdit) {
      // Reset form first to clear any existing data
      resetForm();
      // Small delay to ensure form is reset before loading new entry
      setTimeout(() => {
        loadEntryForEdit(entryIdToEdit);
      }, 10);
    }
  };

  // Validate form function
  const validateForm = async (): Promise<boolean> => {
    try {
      // Validate all fields first to show error messages
      await form.validateAllFields('change');
      
      // Wait a bit for validation to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check for field-level errors
      const fieldErrors: string[] = [];
      Object.keys(form.state.fieldMeta).forEach(key => {
        const meta = form.state.fieldMeta[key];
        if (meta?.errors && meta.errors.length > 0) {
          fieldErrors.push(key);
        }
      });
      
      // Validate against the schema directly
      const formValues = form.state.values;
      if (!formValues) {
        return false;
      }
      
      const result = voucherSchema.safeParse(formValues);
      if (!result.success) {
        return false;
      }
      
      return fieldErrors.length === 0;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  };

  // Update entry in table
  const handleUpdateEntry = async () => {
    if (!pendingEditId) return;

    // Validate all fields first to show error messages
    await form.validateAllFields('change');
    
    // Wait a bit for validation to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Check for field-level errors
    const fieldErrors: string[] = [];
    Object.keys(form.state.fieldMeta).forEach(key => {
      const meta = form.state.fieldMeta[key];
      if (meta?.errors && meta.errors.length > 0) {
        fieldErrors.push(key);
        console.log(`Field ${key} has errors:`, meta.errors);
      }
    });
    
    // Validate against the schema directly
    const formValues = form.state.values;
    if (!formValues) {
      console.error('Form values are empty');
      return;
    }
    
    const result = voucherSchema.safeParse(formValues);
    if (!result.success || fieldErrors.length > 0) {
      console.log('Validation failed for update');
      // Scroll to first error field
      setTimeout(() => {
        const firstErrorField = document.querySelector('[data-field-error="true"], .text-destructive, [class*="text-destructive"]');
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === pendingEditId ? { ...formValues, id: pendingEditId } : entry
      )
    );

    resetForm();
  };

  // Cancel edit
  const handleCancelEdit = () => {
    resetForm();
  };

  // Delete entry from table
  const handleDeleteEntry = (entryId: string) => {
    // Prevent deletion if this entry is being edited
    if (pendingEditId === entryId) {
      return;
    }
    
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  // Delete all entries
  const handleDeleteAll = () => {
    if (entries.length === 0) return;
    
    // If editing, prevent delete all
    if (pendingEditId) {
      return;
    }
    
    setEntries([]);
  };

  // Submit all entries
  const handleSubmitAll = async () => {
    if (entries.length === 0) {
      return;
    }

    // TODO: API call will be integrated here
    console.log('Submitting all entries:', entries);
    
    // After successful submission, clear entries
    setEntries([]);
    resetForm();
  };

  return (
    <div className="flex flex-1 flex-col p-6 gap-6 h-screen max-h-screen overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="flex flex-col min-h-0">
          
         

          {/* Form Box with Scroll */}
          <Card className="flex-1 flex flex-col !gap-2 min-h-0 max-h-[calc(100vh-10rem)] overflow-hidden">
             {/* Action Buttons */}
          <div className="flex justify-end gap-4 flex-shrink-0 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowResetWarning(true);
              }}
            >
              Reset
            </Button>
            {pendingEditId ? (
              <>
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpdateEntry}>
                  Update Entry
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handleAddEntry}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            )}
          </div>
            <CardContent className="flex-1 overflow-y-auto p-6 pt-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="space-y-6"
              >
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Voucher and document details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <form.Field
                    name="voucherType"
                    validators={{
                      onChange: voucherSchema.shape.voucherType,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Voucher Type</FieldLabel>
                        <FieldContent>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value as VoucherFormData['voucherType'])}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue placeholder="Select Voucher Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="General Journal">General Journal</SelectItem>
                              <SelectItem value="Cash Payment">Cash Payment</SelectItem>
                              <SelectItem value="Cash Receipt">Cash Receipt</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="documentType"
                    validators={{
                      onChange: voucherSchema.shape.documentType,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Document Type</FieldLabel>
                        <FieldContent>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value as VoucherFormData['documentType'])}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue placeholder="Select Document Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Payment">Payment</SelectItem>
                              <SelectItem value="Invoice">Invoice</SelectItem>
                              <SelectItem value="Credit Memo">Credit Memo</SelectItem>
                              <SelectItem value="Refund">Refund</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="postingDate"
                    validators={{
                      onChange: voucherSchema.shape.postingDate,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Posting Date</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="date"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="documentDate"
                    validators={{
                      onChange: voucherSchema.shape.documentDate,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Document Date</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="date"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Primary account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <form.Field
                    name="accountType"
                    validators={{
                      onChange: voucherSchema.shape.accountType,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Account Type</FieldLabel>
                        <FieldContent>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => {
                              const newAccountType = value as VoucherFormData['accountType'];
                              field.handleChange(newAccountType);
                              setAccountType(newAccountType);
                              // Initialize or reset TDS/TCS sections when account type changes
                              if (value === 'Vendor') {
                                form.setFieldValue('tdsSection', { tdsType: '', tdsAmount: 0 });
                                form.setFieldValue('tcsSection', undefined);
                              } else if (value === 'Customer') {
                                form.setFieldValue('tcsSection', { tcsType: '', tcsAmount: 0 });
                                form.setFieldValue('tdsSection', undefined);
                              } else {
                                form.setFieldValue('tdsSection', undefined);
                                form.setFieldValue('tcsSection', undefined);
                              }
                            }}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue placeholder="Select Account Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="G/L Account">G/L Account</SelectItem>
                              <SelectItem value="Customer">Customer</SelectItem>
                              <SelectItem value="Vendor">Vendor</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="accountNo"
                    validators={{
                      onChange: voucherSchema.shape.accountNo,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Account No.</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter Account No."
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="externalDocumentNo"
                    validators={{
                      onChange: voucherSchema.shape.externalDocumentNo,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>External Document No.</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter External Document No."
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>
                </div>
              </CardContent>
            </Card>

            {/* TDS Section - Conditional (Vendor only) */}
            {showTdsSection && (
              <Card>
                <CardHeader>
                  <CardTitle>TDS Section</CardTitle>
                  <CardDescription>Tax Deducted at Source details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form.Field
                    name="tdsSection"
                    validators={{
                      onChange: voucherSchema.shape.tdsSection,
                    }}
                  >
                    {(field) => (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field>
                          <FieldLabel>TDS Type</FieldLabel>
                          <FieldContent>
                            <Input
                              type="text"
                              value={field.state.value?.tdsType || ''}
                              onChange={(e) =>
                                field.handleChange({
                                  ...field.state.value,
                                  tdsType: e.target.value,
                                })
                              }
                              placeholder="Enter TDS Type"
                            />
                            <FieldError errors={field.state.meta.errors} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>TDS Amount</FieldLabel>
                          <FieldContent>
                            <Input
                              type="number"
                              step="0.01"
                              value={field.state.value?.tdsAmount || ''}
                              onChange={(e) =>
                                field.handleChange({
                                  ...field.state.value,
                                  tdsAmount: e.target.value ? parseFloat(e.target.value) : 0,
                                })
                              }
                              placeholder="Enter TDS Amount"
                            />
                            <FieldError errors={field.state.meta.errors} />
                          </FieldContent>
                        </Field>
                      </div>
                    )}
                  </form.Field>
                </CardContent>
              </Card>
            )}

            {/* TCS Section - Conditional (Customer only) */}
            {showTcsSection && (
              <Card>
                <CardHeader>
                  <CardTitle>TCS Section</CardTitle>
                  <CardDescription>Tax Collected at Source details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form.Field
                    name="tcsSection"
                    validators={{
                      onChange: voucherSchema.shape.tcsSection,
                    }}
                  >
                    {(field) => (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field>
                          <FieldLabel>TCS Type</FieldLabel>
                          <FieldContent>
                            <Input
                              type="text"
                              value={field.state.value?.tcsType || ''}
                              onChange={(e) =>
                                field.handleChange({
                                  ...field.state.value,
                                  tcsType: e.target.value,
                                })
                              }
                              placeholder="Enter TCS Type"
                            />
                            <FieldError errors={field.state.meta.errors} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>TCS Amount</FieldLabel>
                          <FieldContent>
                            <Input
                              type="number"
                              step="0.01"
                              value={field.state.value?.tcsAmount || ''}
                              onChange={(e) =>
                                field.handleChange({
                                  ...field.state.value,
                                  tcsAmount: e.target.value ? parseFloat(e.target.value) : 0,
                                })
                              }
                              placeholder="Enter TCS Amount"
                            />
                            <FieldError errors={field.state.meta.errors} />
                          </FieldContent>
                        </Field>
                      </div>
                    )}
                  </form.Field>
                </CardContent>
              </Card>
            )}

            {/* Transaction Details */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
                <CardDescription>Amount and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form.Field
                  name="description"
                  validators={{
                    onChange: voucherSchema.shape.description,
                  }}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id={field.name}
                          value={field.state.value || ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="Enter description"
                          rows={3}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </FieldContent>
                    </Field>
                  )}
                </form.Field>

                <form.Field
                  name="amount"
                  validators={{
                    onChange: voucherSchema.shape.amount,
                  }}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
                      <FieldContent>
                        <Input
                          id={field.name}
                          type="number"
                          step="0.01"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          onBlur={field.handleBlur}
                          placeholder="Enter amount"
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </FieldContent>
                    </Field>
                  )}
                </form.Field>
              </CardContent>
            </Card>

            {/* Balance Account */}
            <Card>
              <CardHeader>
                <CardTitle>Balance Account</CardTitle>
                <CardDescription>Balance account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <form.Field
                    name="balanceAccountType"
                    validators={{
                      onChange: voucherSchema.shape.balanceAccountType,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Balance Account Type</FieldLabel>
                        <FieldContent>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value as VoucherFormData['balanceAccountType'])}
                          >
                            <SelectTrigger id={field.name}>
                              <SelectValue placeholder="Select Balance Account Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="G/L Account">G/L Account</SelectItem>
                              <SelectItem value="Customer">Customer</SelectItem>
                              <SelectItem value="Vendor">Vendor</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="balanceAccountNo"
                    validators={{
                      onChange: voucherSchema.shape.balanceAccountNo,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Balance Account No.</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter Balance Account No."
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Additional details and metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form.Field
                  name="lineNarration"
                  validators={{
                    onChange: voucherSchema.shape.lineNarration,
                  }}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Line Narration</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id={field.name}
                          value={field.state.value || ''}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          placeholder="Enter line narration"
                          rows={3}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </FieldContent>
                    </Field>
                  )}
                </form.Field>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <form.Field
                    name="lob"
                    validators={{
                      onChange: voucherSchema.shape.lob,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>LOB</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter LOB"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="branch"
                    validators={{
                      onChange: voucherSchema.shape.branch,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Branch</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter Branch"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="loc"
                    validators={{
                      onChange: voucherSchema.shape.loc,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>LOC</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter LOC"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="employee"
                    validators={{
                      onChange: voucherSchema.shape.employee,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Employee</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter Employee"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field
                    name="assignment"
                    validators={{
                      onChange: voucherSchema.shape.assignment,
                    }}
                  >
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Assignment</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Enter Assignment"
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </FieldContent>
                      </Field>
                    )}
                  </form.Field>
                </div>
              </CardContent>
            </Card>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <div className="flex flex-col min-h-0">
          <Card>
            <CardHeader>
              <CardTitle>Voucher Entries</CardTitle>
              <CardDescription>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} added
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No entries yet.</p>
                  <p className="text-sm mt-2">Fill the form and click "Add" to add entries.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Voucher</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.voucherType}</TableCell>
                            <TableCell>{entry.accountNo}</TableCell>
                            <TableCell className="text-right">{entry.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditClick(entry.id)}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="h-8 w-8 text-destructive"
                                  disabled={pendingEditId === entry.id}
                                  title={pendingEditId === entry.id ? 'Cannot delete entry being edited' : 'Delete entry'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={handleSubmitAll}
                      disabled={entries.length === 0}
                    >
                      Submit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-[40%]"
                      onClick={handleDeleteAll}
                      disabled={entries.length === 0 || pendingEditId !== null}
                      title={pendingEditId ? 'Cannot delete all while editing an entry' : 'Delete all entries'}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unsaved Changes Warning Dialog (for Edit) */}
      <Dialog 
        open={showUnsavedWarning} 
        onOpenChange={(open) => {
          setShowUnsavedWarning(open);
          // If dialog is closed without confirming, clear pendingEditId
          if (!open) {
            setPendingEditId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes in the form. If you continue, your current changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowUnsavedWarning(false);
                setPendingEditId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmEdit}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Warning Dialog */}
      <Dialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Form</DialogTitle>
            <DialogDescription>
              This action will erase all data in the form. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetWarning(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetForm();
                setShowResetWarning(false);
              }}
            >
              Reset Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
