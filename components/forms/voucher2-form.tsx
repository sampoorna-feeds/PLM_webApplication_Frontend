'use client';

/**
 * Voucher 2 Form component
 * Excel-style single-row grid with entries table below
 * Reuses the same schema/behavior as VoucherForm
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { voucherSchema, type VoucherFormData } from '@/lib/validations/voucher.validation';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type VoucherEntry = VoucherFormData & { id: string };

type FormState = {
  voucherType: VoucherFormData['voucherType'] | undefined;
  documentType: VoucherFormData['documentType'] | undefined;
  postingDate: string;
  documentDate: string;
  accountType: VoucherFormData['accountType'] | undefined;
  accountNo: string;
  externalDocumentNo: string;
  accountTdsSection: { tdsType: string; tdsAmount: string } | undefined;
  accountTcsSection: { tcsType: string; tcsAmount: string } | undefined;
  balanceTdsSection: { tdsType: string; tdsAmount: string } | undefined;
  balanceTcsSection: { tcsType: string; tcsAmount: string } | undefined;
  description: string | undefined;
  amount: string;
  balanceAccountType: VoucherFormData['balanceAccountType'] | undefined;
  balanceAccountNo: string;
  lineNarration: string;
  lob: string;
  branch: string;
  loc: string;
  employee: string;
  assignment: string;
};

type ValidationErrors = Record<string, string[]>;

const defaultFormState: FormState = {
  voucherType: undefined,
  documentType: undefined,
  postingDate: '',
  documentDate: '',
  accountType: undefined,
  accountNo: '',
  externalDocumentNo: '',
  accountTdsSection: undefined,
  accountTcsSection: undefined,
  balanceTdsSection: undefined,
  balanceTcsSection: undefined,
  description: '',
  amount: '',
  balanceAccountType: undefined,
  balanceAccountNo: '',
  lineNarration: '',
  lob: '',
  branch: '',
  loc: '',
  employee: '',
  assignment: '',
};

function CellWithTooltip({
  errorMessage,
  children,
}: {
  errorMessage?: string;
  children: React.ReactElement;
}) {
  if (!errorMessage) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{errorMessage}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function InputWithTooltip({
  hasError,
  errorClass,
  fullErrorMessage,
  placeholder,
  children,
}: {
  hasError: boolean;
  errorClass: string;
  fullErrorMessage?: string;
  placeholder: string;
  children: React.ReactElement<React.ComponentProps<typeof Input>>;
}) {
  const childProps = children.props as React.ComponentProps<typeof Input>;
  const base = React.cloneElement(children, {
    ...childProps,
    className: cn(childProps.className, 'w-full'),
    placeholder,
    'data-field-error': hasError,
  } as React.ComponentProps<typeof Input>);

  if (!fullErrorMessage) return base;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {React.cloneElement(base, {
          className: cn((base.props as React.ComponentProps<typeof Input>).className, errorClass),
        })}
      </TooltipTrigger>
      <TooltipContent>
        <p>{fullErrorMessage}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function Voucher2Form() {
  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const [accountType, setAccountType] = useState<VoucherFormData['accountType'] | undefined>(
    undefined
  );

  const [entries, setEntries] = useState<VoucherEntry[]>([]);

  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showDeleteAllWarning, setShowDeleteAllWarning] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const showTdsSection = accountType === 'Vendor';
  const showTcsSection = accountType === 'Customer';

  const postingDateRef = useRef<HTMLInputElement | null>(null);

  const formStateToVoucherData = (state: FormState): Partial<VoucherFormData> => {
    const data: Partial<VoucherFormData> = {
      voucherType: state.voucherType,
      documentType: state.documentType,
      postingDate: state.postingDate,
      documentDate: state.documentDate,
      accountType: state.accountType as VoucherFormData['accountType'] | undefined,
      accountNo: state.accountNo,
      externalDocumentNo: state.externalDocumentNo,
      description: state.description,
      balanceAccountType: state.balanceAccountType,
      balanceAccountNo: state.balanceAccountNo,
      lineNarration: state.lineNarration,
      lob: state.lob,
      branch: state.branch,
      loc: state.loc,
      employee: state.employee,
      assignment: state.assignment,
    };

    if (state.amount) {
      const parsedAmount = parseFloat(state.amount);
      if (!isNaN(parsedAmount)) data.amount = parsedAmount;
    }

    if (state.accountTdsSection && state.accountTdsSection.tdsType && state.accountTdsSection.tdsType !== 'NA') {
      const tdsAmount = parseFloat(state.accountTdsSection.tdsAmount);
      if (!isNaN(tdsAmount)) {
        data.accountTdsSection = {
          tdsType: state.accountTdsSection.tdsType,
          tdsAmount,
        };
      }
    }

    if (state.accountTcsSection && state.accountTcsSection.tcsType && state.accountTcsSection.tcsType !== 'NA') {
      const tcsAmount = parseFloat(state.accountTcsSection.tcsAmount);
      if (!isNaN(tcsAmount)) {
        data.accountTcsSection = {
          tcsType: state.accountTcsSection.tcsType,
          tcsAmount,
        };
      }
    }

    if (state.balanceTdsSection && state.balanceTdsSection.tdsType && state.balanceTdsSection.tdsType !== 'NA') {
      const tdsAmount = parseFloat(state.balanceTdsSection.tdsAmount);
      if (!isNaN(tdsAmount)) {
        data.balanceTdsSection = {
          tdsType: state.balanceTdsSection.tdsType,
          tdsAmount,
        };
      }
    }

    if (state.balanceTcsSection && state.balanceTcsSection.tcsType && state.balanceTcsSection.tcsType !== 'NA') {
      const tcsAmount = parseFloat(state.balanceTcsSection.tcsAmount);
      if (!isNaN(tcsAmount)) {
        data.balanceTcsSection = {
          tcsType: state.balanceTcsSection.tcsType,
          tcsAmount,
        };
      }
    }

    return data;
  };

  const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
    const data = formStateToVoucherData(formData);
    const result = voucherSchema.safeParse(data);

    if (result.success) return { isValid: true, errors: {} };

    const errors: ValidationErrors = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    });

    return { isValid: false, errors };
  };

  const getValidationSummaryMessage = (): string => {
    const errorCount = Object.keys(validationErrors).length;
    if (errorCount === 0) return '';

    if (validationErrors.tdsSection?.length) return validationErrors.tdsSection[0] ?? 'Fill all fields';
    if (validationErrors.tcsSection?.length) return validationErrors.tcsSection[0] ?? 'Fill all fields';

    if (errorCount > 1) return 'Fill all fields';

    const firstErrorKey = Object.keys(validationErrors)[0];
    return validationErrors[firstErrorKey]?.[0] || 'Fill all fields';
  };

  useEffect(() => {
    const hasValues = Object.values(formData).some((val) => {
      if (val === undefined || val === '') return false;
      if (typeof val === 'object' && val !== null) {
        return Object.values(val).some((v) => v !== undefined && v !== '');
      }
      return true;
    });
    setHasUnsavedChanges(hasValues);
  }, [formData]);

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

  const resetForm = useCallback(() => {
    setFormData(defaultFormState);
    setAccountType(undefined as VoucherFormData['accountType'] | undefined);
    setHasUnsavedChanges(false);
    setPendingEditId(null);
    setValidationErrors({});
  }, []);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field as string]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const handleAccountTypeChange = (value: string) => {
    const newAccountType = value as VoucherFormData['accountType'];
    setAccountType(newAccountType);
    updateField('accountType', newAccountType);

    if (value === 'Vendor') {
      updateField('accountTdsSection', undefined);
      updateField('accountTcsSection', undefined);
    } else if (value === 'Customer') {
      updateField('accountTcsSection', undefined);
      updateField('accountTdsSection', undefined);
    } else {
      updateField('accountTdsSection', undefined);
      updateField('accountTcsSection', undefined);
    }
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstErrorField = document.querySelector('[data-field-error="true"]') as HTMLElement | null;
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 100);
  };

  const handleAddEntry = () => {
    const validation = validateForm();
    setValidationErrors(validation.errors);
    if (!validation.isValid) {
      scrollToFirstError();
      return;
    }

    const data = formStateToVoucherData(formData) as VoucherFormData;
    const newEntry: VoucherEntry = { ...data, id: Date.now().toString() };
    setEntries((prev) => [...prev, newEntry]);
    resetForm();
  };

  const loadEntryForEdit = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    setFormData({
      voucherType: entry.voucherType,
      documentType: entry.documentType,
      postingDate: entry.postingDate,
      documentDate: entry.documentDate,
      accountType: entry.accountType,
      accountNo: entry.accountNo,
      externalDocumentNo: entry.externalDocumentNo || '',
      accountTdsSection: entry.accountTdsSection
        ? { tdsType: entry.accountTdsSection.tdsType, tdsAmount: entry.accountTdsSection.tdsAmount.toString() }
        : undefined,
      accountTcsSection: entry.accountTcsSection
        ? { tcsType: entry.accountTcsSection.tcsType, tcsAmount: entry.accountTcsSection.tcsAmount.toString() }
        : undefined,
      balanceTdsSection: entry.balanceTdsSection
        ? { tdsType: entry.balanceTdsSection.tdsType, tdsAmount: entry.balanceTdsSection.tdsAmount.toString() }
        : undefined,
      balanceTcsSection: entry.balanceTcsSection
        ? { tcsType: entry.balanceTcsSection.tcsType, tcsAmount: entry.balanceTcsSection.tcsAmount.toString() }
        : undefined,
      description: entry.description || undefined,
      amount: entry.amount.toString(),
      balanceAccountType: entry.balanceAccountType,
      balanceAccountNo: entry.balanceAccountNo,
      lineNarration: entry.lineNarration || '',
      lob: entry.lob,
      branch: entry.branch,
      loc: entry.loc,
      employee: entry.employee || '',
      assignment: entry.assignment || '',
    });

    setAccountType(entry.accountType as VoucherFormData['accountType']);
    setPendingEditId(entryId);
    setHasUnsavedChanges(true);
    setValidationErrors({});

    setTimeout(() => {
      const formCard = document.querySelector('[data-form-card]');
      if (formCard) {
        const contentContainer = document.querySelector('.flex.flex-1.flex-col.overflow-y-auto') as HTMLElement | null;
        if (contentContainer) {
          const cardRect = formCard.getBoundingClientRect();
          const containerRect = contentContainer.getBoundingClientRect();
          const scrollTop = contentContainer.scrollTop;
          const relativeTop = cardRect.top - containerRect.top + scrollTop - 20;
          contentContainer.scrollTo({ top: Math.max(0, relativeTop), behavior: 'smooth' });
        } else {
          formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      postingDateRef.current?.focus();
    }, 100);
  };

  const handleEditClick = (entryId: string) => {
    if (pendingEditId === entryId) return;

    if (pendingEditId !== null || hasUnsavedChanges) {
      setPendingEditId(entryId);
      setShowUnsavedWarning(true);
      return;
    }

    loadEntryForEdit(entryId);
  };

  const handleConfirmEdit = () => {
    const entryIdToEdit = pendingEditId;
    setShowUnsavedWarning(false);
    setPendingEditId(null);

    if (entryIdToEdit) {
      resetForm();
      setTimeout(() => loadEntryForEdit(entryIdToEdit), 10);
    }
  };

  const handleUpdateEntry = () => {
    if (!pendingEditId) return;

    const validation = validateForm();
    setValidationErrors(validation.errors);
    if (!validation.isValid) {
      scrollToFirstError();
      return;
    }

    const data = formStateToVoucherData(formData) as VoucherFormData;
    setEntries((prev) => prev.map((e) => (e.id === pendingEditId ? { ...data, id: pendingEditId } : e)));
    resetForm();
  };

  const handleCancelEdit = () => resetForm();

  const handleDeleteEntry = (entryId: string) => {
    if (pendingEditId === entryId) return;
    setPendingDeleteId(entryId);
    setShowDeleteWarning(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) {
      setEntries((prev) => prev.filter((e) => e.id !== pendingDeleteId));
      setPendingDeleteId(null);
    }
    setShowDeleteWarning(false);
  };

  const handleDeleteAll = () => {
    if (entries.length === 0) return;
    if (pendingEditId) return;
    setShowDeleteAllWarning(true);
  };

  const handleConfirmDeleteAll = () => {
    setEntries([]);
    setShowDeleteAllWarning(false);
  };

  const handleSubmitAll = async () => {
    if (entries.length === 0) return;
    // TODO: API integration later
    // eslint-disable-next-line no-console
    console.log('Submitting all entries:', entries);
    setEntries([]);
    resetForm();
  };

  const getPlaceholder = (fieldName: string, defaultPlaceholder: string): string => {
    if (validationErrors[fieldName]?.length) return 'Required';
    return defaultPlaceholder;
  };

  const getFullErrorMessage = (fieldName: string): string | undefined => {
    if (validationErrors[fieldName]?.length) return validationErrors[fieldName][0];
    return undefined;
  };

  const hasError = (fieldName: string): boolean => !!validationErrors[fieldName]?.length;

  const getFieldErrorClass = (fieldName: string): string =>
    hasError(fieldName) ? 'border-destructive ring-destructive' : '';

  const validationSummaryMessage = getValidationSummaryMessage();

  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleFillForm = () => {
    // lightweight dev helper (mirrors VoucherForm behavior, without large pools)
    updateField('voucherType', 'General Journal');
    updateField('documentType', 'Payment');
    updateField('postingDate', new Date().toISOString().split('T')[0]);
    updateField('documentDate', new Date().toISOString().split('T')[0]);
    handleAccountTypeChange('G/L Account');
    updateField('accountNo', 'ACC001');
    updateField('externalDocumentNo', 'EXT001');
    updateField('description', 'Test entry');
    updateField('amount', '100.00');
    updateField('balanceAccountType', 'G/L Account');
    updateField('balanceAccountNo', 'ACC002');
    updateField('lineNarration', 'Narration');
    updateField('lob', 'Feed');
    updateField('branch', 'Mumbai');
    updateField('loc', 'LOC001');
    updateField('employee', 'EMP001');
    updateField('assignment', 'ASSIGN001');
    setValidationErrors({});
  };

  const colHead = 'px-2 py-1 text-[11px] font-semibold text-muted-foreground';
  const colCell = 'p-1 align-top';
  const control = 'h-8 text-xs';
  const tableClass = 'min-w-max';
  const excelWrap = cn(
    'rounded-md border bg-background',
    pendingEditId && 'ring-2 ring-primary ring-offset-2'
  );

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col p-4 gap-3 min-h-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0">
          {pendingEditId ? (
            <div className="text-sm font-medium text-primary">Editing entry</div>
          ) : (
            <div className="text-sm font-medium text-muted-foreground">Voucher 2</div>
          )}
          {validationSummaryMessage && (
            <div className="text-destructive text-sm">{validationSummaryMessage}</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {isDevelopment && (
            <Button type="button" size="sm" variant="outline" onClick={handleFillForm}>
              Fill
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setShowResetWarning(true);
            }}
          >
            Reset
          </Button>

          {pendingEditId ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleUpdateEntry}>
                Update Entry
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={handleAddEntry}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </div>

      <div data-form-card className={cn(excelWrap, "min-w-0")}>
        <Table className={tableClass}>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(colHead, 'w-[140px]')}>Posting Date</TableHead>
              <TableHead className={cn(colHead, 'w-[140px]')}>Document Date</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>Voucher Type</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>Document Type</TableHead>
              <TableHead className={cn(colHead, 'w-[150px]')}>Account Type</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>Account No.</TableHead>
              <TableHead className={cn(colHead, 'w-[180px]')}>External Doc No.</TableHead>
              <TableHead className={cn(colHead, 'w-[180px]')}>Description</TableHead>
              <TableHead className={cn(colHead, 'w-[130px] text-right')}>Amount</TableHead>
              <TableHead className={cn(colHead, 'w-[150px]')}>Bal. Acc Type</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>Bal. Acc No.</TableHead>
              <TableHead className={cn(colHead, 'w-[200px]')}>Line Narration</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>LOB</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>Branch</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>LOC</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>Employee</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>Assignment</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>TDS Type</TableHead>
              <TableHead className={cn(colHead, 'w-[130px]')}>TDS Amount</TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>TCS Type</TableHead>
              <TableHead className={cn(colHead, 'w-[130px]')}>TCS Amount</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow>
              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('postingDate')}
                  errorClass={getFieldErrorClass('postingDate')}
                  fullErrorMessage={getFullErrorMessage('postingDate')}
                  placeholder={getPlaceholder('postingDate', '')}
                >
                  <Input
                    ref={postingDateRef}
                    type="date"
                    value={formData.postingDate}
                    onChange={(e) => updateField('postingDate', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('documentDate')}
                  errorClass={getFieldErrorClass('documentDate')}
                  fullErrorMessage={getFullErrorMessage('documentDate')}
                  placeholder={getPlaceholder('documentDate', '')}
                >
                  <Input
                    type="date"
                    value={formData.documentDate}
                    onChange={(e) => updateField('documentDate', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('voucherType')}>
                  <Select
                    value={formData.voucherType || undefined}
                    onValueChange={(v) => updateField('voucherType', v as VoucherFormData['voucherType'])}
                    key={formData.voucherType || 'reset-voucher2-voucher'}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('voucherType'))}
                      data-field-error={hasError('voucherType')}
                    >
                      <SelectValue placeholder={getPlaceholder('voucherType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General Journal">General Journal</SelectItem>
                      <SelectItem value="Cash Payment">Cash Payment</SelectItem>
                      <SelectItem value="Cash Receipt">Cash Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('documentType')}>
                  <Select
                    value={formData.documentType || undefined}
                    onValueChange={(v) => updateField('documentType', v as VoucherFormData['documentType'])}
                    key={formData.documentType || 'reset-voucher2-document'}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('documentType'))}
                      data-field-error={hasError('documentType')}
                    >
                      <SelectValue placeholder={getPlaceholder('documentType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Payment">Payment</SelectItem>
                      <SelectItem value="Invoice">Invoice</SelectItem>
                      <SelectItem value="Credit Memo">Credit Memo</SelectItem>
                      <SelectItem value="Refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('accountType')}>
                  <Select
                    value={formData.accountType || undefined}
                    onValueChange={handleAccountTypeChange}
                    key={formData.accountType || 'reset-voucher2-accountType'}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('accountType'))}
                      data-field-error={hasError('accountType')}
                    >
                      <SelectValue placeholder={getPlaceholder('accountType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G/L Account">G/L Account</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('accountNo')}
                  errorClass={getFieldErrorClass('accountNo')}
                  fullErrorMessage={getFullErrorMessage('accountNo')}
                  placeholder={getPlaceholder('accountNo', '')}
                >
                  <Input
                    value={formData.accountNo}
                    onChange={(e) => updateField('accountNo', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('externalDocumentNo')}
                  errorClass={getFieldErrorClass('externalDocumentNo')}
                  fullErrorMessage={getFullErrorMessage('externalDocumentNo')}
                  placeholder={getPlaceholder('externalDocumentNo', '')}
                >
                  <Input
                    value={formData.externalDocumentNo}
                    onChange={(e) => updateField('externalDocumentNo', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('description')}
                  errorClass={getFieldErrorClass('description')}
                  fullErrorMessage={getFullErrorMessage('description')}
                  placeholder={getPlaceholder('description', '')}
                >
                  <Input
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={cn(colCell, 'text-right')}>
                <InputWithTooltip
                  hasError={hasError('amount')}
                  errorClass={getFieldErrorClass('amount')}
                  fullErrorMessage={getFullErrorMessage('amount')}
                  placeholder={getPlaceholder('amount', '')}
                >
                  <Input
                    value={formData.amount}
                    onChange={(e) => updateField('amount', e.target.value)}
                    className={cn(control, 'text-right tabular-nums')}
                    inputMode="decimal"
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('balanceAccountType')}>
                  <Select
                    value={formData.balanceAccountType || undefined}
                    onValueChange={(v) =>
                      updateField('balanceAccountType', v as VoucherFormData['balanceAccountType'])
                    }
                    key={formData.balanceAccountType || 'reset-voucher2-balanceType'}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('balanceAccountType'))}
                      data-field-error={hasError('balanceAccountType')}
                    >
                      <SelectValue placeholder={getPlaceholder('balanceAccountType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G/L Account">G/L Account</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('balanceAccountNo')}
                  errorClass={getFieldErrorClass('balanceAccountNo')}
                  fullErrorMessage={getFullErrorMessage('balanceAccountNo')}
                  placeholder={getPlaceholder('balanceAccountNo', '')}
                >
                  <Input
                    value={formData.balanceAccountNo}
                    onChange={(e) => updateField('balanceAccountNo', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('lineNarration')}
                  errorClass={getFieldErrorClass('lineNarration')}
                  fullErrorMessage={getFullErrorMessage('lineNarration')}
                  placeholder={getPlaceholder('lineNarration', '')}
                >
                  <Input
                    value={formData.lineNarration}
                    onChange={(e) => updateField('lineNarration', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('lob')}
                  errorClass={getFieldErrorClass('lob')}
                  fullErrorMessage={getFullErrorMessage('lob')}
                  placeholder={getPlaceholder('lob', '')}
                >
                  <Input
                    value={formData.lob}
                    onChange={(e) => updateField('lob', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('branch')}
                  errorClass={getFieldErrorClass('branch')}
                  fullErrorMessage={getFullErrorMessage('branch')}
                  placeholder={getPlaceholder('branch', '')}
                >
                  <Input
                    value={formData.branch}
                    onChange={(e) => updateField('branch', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('loc')}
                  errorClass={getFieldErrorClass('loc')}
                  fullErrorMessage={getFullErrorMessage('loc')}
                  placeholder={getPlaceholder('loc', '')}
                >
                  <Input
                    value={formData.loc}
                    onChange={(e) => updateField('loc', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('employee')}
                  errorClass={getFieldErrorClass('employee')}
                  fullErrorMessage={getFullErrorMessage('employee')}
                  placeholder={getPlaceholder('employee', '')}
                >
                  <Input
                    value={formData.employee}
                    onChange={(e) => updateField('employee', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('assignment')}
                  errorClass={getFieldErrorClass('assignment')}
                  fullErrorMessage={getFullErrorMessage('assignment')}
                  placeholder={getPlaceholder('assignment', '')}
                >
                  <Input
                    value={formData.assignment}
                    onChange={(e) => updateField('assignment', e.target.value)}
                    className={control}
                  />
                </InputWithTooltip>
              </TableCell>

              {/* TDS/TCS fields removed - this form is a duplicate, use voucher-form.tsx for the updated implementation */}
              <TableCell className={colCell}></TableCell>
              <TableCell className={colCell}></TableCell>
              <TableCell className={colCell}></TableCell>
              <TableCell className={colCell}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 min-h-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} added
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button type="button" size="sm" onClick={handleSubmitAll} disabled={entries.length === 0}>
              Submit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={entries.length === 0 || pendingEditId !== null}
              title={pendingEditId ? 'Cannot delete all while editing an entry' : 'Delete all entries'}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground">
            <div>No entries yet.</div>
            <div className="text-sm mt-1">Fill the row and click “Add”.</div>
          </div>
        ) : (
          <div className="rounded-md border bg-background">
            <Table className={tableClass}>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(colHead, 'w-[120px]')}>Posting</TableHead>
                  <TableHead className={cn(colHead, 'w-[120px]')}>Document</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>Voucher</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>Doc Type</TableHead>
                  <TableHead className={cn(colHead, 'w-[130px]')}>Acc Type</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>Acc No</TableHead>
                  <TableHead className={cn(colHead, 'w-[160px]')}>Ext Doc</TableHead>
                  <TableHead className={cn(colHead, 'w-[180px]')}>Description</TableHead>
                  <TableHead className={cn(colHead, 'w-[120px] text-right')}>Amount</TableHead>
                  <TableHead className={cn(colHead, 'w-[130px]')}>Bal Type</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>Bal No</TableHead>
                  <TableHead className={cn(colHead, 'w-[200px]')}>Narration</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>LOB</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>Branch</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>LOC</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>Employee</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>Assignment</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>TDS Type</TableHead>
                  <TableHead className={cn(colHead, 'w-[120px]')}>TDS Amt</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>TCS Type</TableHead>
                  <TableHead className={cn(colHead, 'w-[120px]')}>TCS Amt</TableHead>
                  <TableHead className={cn(colHead, 'w-[110px]')}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className={cn(pendingEditId === entry.id && 'bg-primary/5')}>
                    <TableCell className="p-2 text-xs">{entry.postingDate}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.documentDate}</TableCell>
                    <TableCell className="p-2 text-xs font-medium">{entry.voucherType}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.documentType}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.accountType}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.accountNo}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.externalDocumentNo}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.description}</TableCell>
                    <TableCell className="p-2 text-xs text-right tabular-nums">{entry.amount.toFixed(2)}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.balanceAccountType}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.balanceAccountNo}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.lineNarration}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.lob}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.branch}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.loc}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.employee}</TableCell>
                    <TableCell className="p-2 text-xs">{entry.assignment}</TableCell>
                    <TableCell className="p-2 text-xs">
                      {entry.accountTdsSection?.tdsType && entry.accountTdsSection.tdsType !== 'NA'
                        ? entry.accountTdsSection.tdsType
                        : entry.balanceTdsSection?.tdsType && entry.balanceTdsSection.tdsType !== 'NA'
                        ? entry.balanceTdsSection.tdsType
                        : ''}
                    </TableCell>
                    <TableCell className="p-2 text-xs tabular-nums">
                      {entry.accountTdsSection?.tdsAmount
                        ? entry.accountTdsSection.tdsAmount.toFixed(2)
                        : entry.balanceTdsSection?.tdsAmount
                        ? entry.balanceTdsSection.tdsAmount.toFixed(2)
                        : ''}
                    </TableCell>
                    <TableCell className="p-2 text-xs">
                      {entry.accountTcsSection?.tcsType && entry.accountTcsSection.tcsType !== 'NA'
                        ? entry.accountTcsSection.tcsType
                        : entry.balanceTcsSection?.tcsType && entry.balanceTcsSection.tcsType !== 'NA'
                        ? entry.balanceTcsSection.tcsType
                        : ''}
                    </TableCell>
                    <TableCell className="p-2 text-xs tabular-nums">
                      {entry.accountTcsSection?.tcsAmount
                        ? entry.accountTcsSection.tcsAmount.toFixed(2)
                        : entry.balanceTcsSection?.tcsAmount
                        ? entry.balanceTcsSection.tcsAmount.toFixed(2)
                        : ''}
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex items-center gap-1">
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
                          className="h-8 w-8"
                          disabled={pendingEditId === entry.id}
                          title={
                            pendingEditId === entry.id
                              ? 'Cannot delete entry being edited'
                              : 'Delete entry'
                          }
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
        )}
      </div>

      {/* Unsaved Changes Warning Dialog (for Edit) */}
      <Dialog
        open={showUnsavedWarning}
        onOpenChange={(open) => {
          setShowUnsavedWarning(open);
          if (!open) setPendingEditId(null);
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

      {/* Delete Entry Warning Dialog */}
      <Dialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteWarning(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Warning Dialog */}
      <Dialog open={showDeleteAllWarning} onOpenChange={setShowDeleteAllWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Entries</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {entries.length} entries? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllWarning(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteAll}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


