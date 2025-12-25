'use client';

/**
 * Voucher Form component
 * Excel-style single-row grid with entries table below
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
import { FieldTitle } from '@/components/ui/field';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { AccountSelect } from './account-select';
import { DimensionSelect } from './dimension-select';
import {
  getTDSSection,
  getTCSSection,
  createVoucher,
  uploadAttachment,
  type TDSSection,
  type TCSSection,
  type CreateVoucherPayload,
} from '@/lib/api/services/voucher.service';
import { getCustomerByNo } from '@/lib/api/services/customer.service';
import { useAuthStore } from '@/lib/stores/auth-store';

type VoucherEntry = VoucherFormData & { id: string; attachments?: File[] };

type FormState = {
  voucherType: VoucherFormData['voucherType'] | undefined;
  documentType: VoucherFormData['documentType'] | undefined;
  postingDate: string;
  documentDate: string;
  accountType: VoucherFormData['accountType'] | undefined;
  accountNo: string;
  accountTdsSection: { tdsType: string; tdsAmount: string } | undefined;
  accountTcsSection: { tcsType: string; tcsAmount: string } | undefined;
  externalDocumentNo: string;
  description: string | undefined;
  amount: string;
  balanceAccountType: VoucherFormData['balanceAccountType'] | undefined;
  balanceAccountNo: string;
  balanceTdsSection: { tdsType: string; tdsAmount: string } | undefined;
  balanceTcsSection: { tcsType: string; tcsAmount: string } | undefined;
  lineNarration: string;
  lob: string;
  branch: string;
  loc: string;
  employee: string | undefined;
  assignment: string | undefined;
};

type ValidationErrors = Record<string, string[]>;

const defaultFormState: FormState = {
  voucherType: undefined,
  documentType: undefined,
  postingDate: '',
  documentDate: '',
  accountType: undefined,
  accountNo: '',
  accountTdsSection: undefined,
  accountTcsSection: undefined,
  externalDocumentNo: '',
  description: '',
  amount: '',
  balanceAccountType: undefined,
  balanceAccountNo: '',
  balanceTdsSection: undefined,
  balanceTcsSection: undefined,
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

export function VoucherForm() {
  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const { user } = useAuthStore();

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [accountTdsSections, setAccountTdsSections] = useState<TDSSection[]>([]);
  const [accountTcsSections, setAccountTcsSections] = useState<TCSSection[]>([]);
  const [balanceTdsSections, setBalanceTdsSections] = useState<TDSSection[]>([]);
  const [balanceTcsSections, setBalanceTcsSections] = useState<TCSSection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TDS/TCS visibility for Account Type
  const showAccountTds = accountType === 'Vendor';
  const showAccountTcs = accountType === 'Customer';
  
  // TDS/TCS visibility for Balance Account Type
  const showBalanceTds = formData.balanceAccountType === 'Vendor';
  const showBalanceTcs = formData.balanceAccountType === 'Customer';

  // Progressive field enablement logic
  const datesFilled = formData.postingDate && formData.documentDate;
  const voucherTypeEnabled = datesFilled;
  const accountTypeEnabled = voucherTypeEnabled && formData.voucherType && formData.documentType;
  const accountNoEnabled = accountTypeEnabled && formData.accountType;
  const basicFieldsEnabled = accountNoEnabled && formData.accountNo;
  const balanceAccountEnabled = basicFieldsEnabled && formData.amount;
  const restFieldsEnabled = balanceAccountEnabled && formData.balanceAccountType && formData.balanceAccountNo;

  const postingDateRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Validate all fields - used on Add button click
  const validateAllFields = (formDataToValidate: FormState): ValidationErrors => {
    const data = formStateToVoucherData(formDataToValidate);
    const result = voucherSchema.safeParse(data);

    if (result.success) return {};

    const errors: ValidationErrors = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    });

    return errors;
  };

  // Validate conditional fields only - used for real-time validation
  const validateConditionalFields = (formDataToValidate: FormState): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Validate External Document No. if conditions are met
    const shouldRequireExternalDoc = 
      formDataToValidate.voucherType === 'General Journal' && 
      (formDataToValidate.documentType === 'Invoice' || formDataToValidate.documentType === 'Credit Memo');
    
    if (shouldRequireExternalDoc) {
      if (!formDataToValidate.externalDocumentNo || formDataToValidate.externalDocumentNo.trim() === '') {
        errors.externalDocumentNo = ['External Document No. is required when Voucher Type is General Journal and Document Type is Invoice or Credit Memo'];
      }
    }
    
    return errors;
  };

  const getValidationSummaryMessage = (): string => {
    const errorCount = Object.keys(validationErrors).length;
    if (errorCount === 0) return '';

    // Prioritize specific error messages
    if (validationErrors.externalDocumentNo?.length) {
      return validationErrors.externalDocumentNo[0];
    }
    if (validationErrors.accountTdsSection?.length) {
      return validationErrors.accountTdsSection[0] ?? 'Fill all fields';
    }
    if (validationErrors.accountTcsSection?.length) {
      return validationErrors.accountTcsSection[0] ?? 'Fill all fields';
    }
    if (validationErrors.balanceTdsSection?.length) {
      return validationErrors.balanceTdsSection[0] ?? 'Fill all fields';
    }
    if (validationErrors.balanceTcsSection?.length) {
      return validationErrors.balanceTcsSection[0] ?? 'Fill all fields';
    }

    // If multiple errors, show the first specific error message
    const firstErrorKey = Object.keys(validationErrors)[0];
    if (validationErrors[firstErrorKey]?.[0]) {
      return validationErrors[firstErrorKey][0];
    }

    return 'Fill all fields';
  };

  // Fetch Account TDS sections when Account Type is Vendor AND Account No is selected
  // Check Assessee_Code if Balance Account Type is Customer
  useEffect(() => {
    const fetchAccountTDSSections = async () => {
      if (accountType === 'Vendor' && formData.accountNo) {
        // If Balance Account Type is Customer, check Assessee_Code
        if (formData.balanceAccountType === 'Customer' && formData.balanceAccountNo) {
          try {
            const customer = await getCustomerByNo(formData.balanceAccountNo);
            if (customer?.Assessee_Code && customer.Assessee_Code.trim() !== '') {
              const sections = await getTDSSection(formData.accountNo);
              setAccountTdsSections(sections);
            } else {
              setAccountTdsSections([]);
            }
          } catch (error) {
            console.error('Error fetching Account TDS sections:', error);
            setAccountTdsSections([]);
          }
        } else {
          // No Balance Account Customer, fetch directly
          try {
            const sections = await getTDSSection(formData.accountNo);
            setAccountTdsSections(sections);
          } catch (error) {
            console.error('Error fetching Account TDS sections:', error);
            setAccountTdsSections([]);
          }
        }
      } else {
        setAccountTdsSections([]);
      }
    };
    fetchAccountTDSSections();
  }, [accountType, formData.accountNo, formData.balanceAccountType, formData.balanceAccountNo]);

  // Fetch Account TCS sections when Account Type is Customer AND Account No is selected AND Assessee_Code is not blank
  useEffect(() => {
    const fetchAccountTCSSections = async () => {
      if (accountType === 'Customer' && formData.accountNo) {
        try {
          const customer = await getCustomerByNo(formData.accountNo);
          if (customer?.Assessee_Code && customer.Assessee_Code.trim() !== '') {
            const sections = await getTCSSection(formData.accountNo);
            setAccountTcsSections(sections);
          } else {
            setAccountTcsSections([]);
          }
        } catch (error) {
          console.error('Error fetching Account TCS sections:', error);
          setAccountTcsSections([]);
        }
      } else {
        setAccountTcsSections([]);
      }
    };
    fetchAccountTCSSections();
  }, [accountType, formData.accountNo]);

  // Fetch Balance Account TDS sections when Balance Account Type is Vendor AND Balance Account No is selected
  // Check Assessee_Code if Account Type is Customer
  useEffect(() => {
    const fetchBalanceTDSSections = async () => {
      if (formData.balanceAccountType === 'Vendor' && formData.balanceAccountNo) {
        // If Account Type is Customer, check Assessee_Code
        if (accountType === 'Customer' && formData.accountNo) {
          try {
            const customer = await getCustomerByNo(formData.accountNo);
            if (customer?.Assessee_Code && customer.Assessee_Code.trim() !== '') {
              const sections = await getTDSSection(formData.balanceAccountNo);
              setBalanceTdsSections(sections);
            } else {
              setBalanceTdsSections([]);
            }
          } catch (error) {
            console.error('Error fetching Balance Account TDS sections:', error);
            setBalanceTdsSections([]);
          }
        } else {
          // No Account Customer, fetch directly
          try {
            const sections = await getTDSSection(formData.balanceAccountNo);
            setBalanceTdsSections(sections);
          } catch (error) {
            console.error('Error fetching Balance Account TDS sections:', error);
            setBalanceTdsSections([]);
          }
        }
      } else {
        setBalanceTdsSections([]);
      }
    };
    fetchBalanceTDSSections();
  }, [accountType, formData.accountNo, formData.balanceAccountType, formData.balanceAccountNo]);

  // Fetch Balance Account TCS sections when Balance Account Type is Customer AND Balance Account No is selected AND Assessee_Code is not blank
  useEffect(() => {
    const fetchBalanceTCSSections = async () => {
      if (formData.balanceAccountType === 'Customer' && formData.balanceAccountNo) {
        try {
          const customer = await getCustomerByNo(formData.balanceAccountNo);
          if (customer?.Assessee_Code && customer.Assessee_Code.trim() !== '') {
            const sections = await getTCSSection(formData.balanceAccountNo);
            setBalanceTcsSections(sections);
          } else {
            setBalanceTcsSections([]);
          }
        } catch (error) {
          console.error('Error fetching Balance Account TCS sections:', error);
          setBalanceTcsSections([]);
        }
      } else {
        setBalanceTcsSections([]);
      }
    };
    fetchBalanceTCSSections();
  }, [formData.balanceAccountType, formData.balanceAccountNo]);

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
    setAttachments([]);
    setAccountTdsSections([]);
    setAccountTcsSections([]);
    setBalanceTdsSections([]);
    setBalanceTcsSections([]);
  }, []);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-fill document date when posting date changes
      if (field === 'postingDate' && value && !prev.documentDate) {
        updated.documentDate = value as string;
      }
      
      return updated;
    });
    
    // Clear error for the field being updated
    if (validationErrors[field as string]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  // Real-time validation for conditional fields only
  // This runs when dependency values change (voucherType, documentType, externalDocumentNo)
  useEffect(() => {
    const conditionalErrors = validateConditionalFields(formData);
    
    // Update only conditional field errors
    setValidationErrors((prev) => {
      const next = { ...prev };
      
      // Update External Document No. error if validation fails
      if (conditionalErrors.externalDocumentNo) {
        next.externalDocumentNo = conditionalErrors.externalDocumentNo;
      } else {
        // Clear error if validation passes or condition is no longer met
        // Check if condition is still met - if not, clear the error
        const shouldRequireExternalDoc = 
          formData.voucherType === 'General Journal' && 
          (formData.documentType === 'Invoice' || formData.documentType === 'Credit Memo');
        
        if (!shouldRequireExternalDoc || (formData.externalDocumentNo && formData.externalDocumentNo.trim() !== '')) {
          delete next.externalDocumentNo;
        }
      }
      
      return next;
    });
  }, [formData.voucherType, formData.documentType, formData.externalDocumentNo]);

  const handleAccountTypeChange = (value: string) => {
    const newAccountType = value as VoucherFormData['accountType'];
    setAccountType(newAccountType);
    updateField('accountType', newAccountType);

    // Clear Account TDS/TCS when account type changes
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
    // Validate all fields on Add button click
    const errors = validateAllFields(formData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      scrollToFirstError();
      return;
    }

    const data = formStateToVoucherData(formData) as VoucherFormData;
    const newEntry: VoucherEntry = { 
      ...data, 
      id: Date.now().toString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };
    setEntries((prev) => [...prev, newEntry]);
    resetForm();
    setAttachments([]);
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
      accountTdsSection: entry.accountTdsSection
        ? { tdsType: entry.accountTdsSection.tdsType, tdsAmount: entry.accountTdsSection.tdsAmount.toString() }
        : undefined,
      accountTcsSection: entry.accountTcsSection
        ? { tcsType: entry.accountTcsSection.tcsType, tcsAmount: entry.accountTcsSection.tcsAmount.toString() }
        : undefined,
      externalDocumentNo: entry.externalDocumentNo || '',
      description: entry.description || undefined,
      amount: entry.amount.toString(),
      balanceAccountType: entry.balanceAccountType,
      balanceAccountNo: entry.balanceAccountNo,
      balanceTdsSection: entry.balanceTdsSection
        ? { tdsType: entry.balanceTdsSection.tdsType, tdsAmount: entry.balanceTdsSection.tdsAmount.toString() }
        : undefined,
      balanceTcsSection: entry.balanceTcsSection
        ? { tcsType: entry.balanceTcsSection.tcsType, tcsAmount: entry.balanceTcsSection.tcsAmount.toString() }
        : undefined,
      lineNarration: entry.lineNarration || '',
      lob: entry.lob,
      branch: entry.branch,
      loc: entry.loc,
      employee: entry.employee,
      assignment: entry.assignment,
    });

    setAccountType(entry.accountType as VoucherFormData['accountType']);
    setPendingEditId(entryId);
    setHasUnsavedChanges(true);
    setValidationErrors({});
    setAttachments(entry.attachments || []);

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

    // Validate all fields on Update button click
    const errors = validateAllFields(formData);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const mapVoucherTypeToTemplate = (voucherType: string): string => {
    switch (voucherType) {
      case 'General Journal':
        return 'GENERAL';
      case 'Cash Payment':
        return 'CASH PAYM';
      case 'Cash Receipt':
        return 'CASH RECE';
      default:
        return 'GENERAL';
    }
  };

  const buildVoucherPayload = (entry: VoucherEntry): CreateVoucherPayload => {
    const payload: CreateVoucherPayload = {
      Journal_Template_Name: mapVoucherTypeToTemplate(entry.voucherType),
      Journal_Batch_Name: 'DEFAULT',
      Posting_Date: entry.postingDate,
      Document_Type: entry.documentType || 'Payment',
      Account_Type: entry.accountType,
      Amount: entry.amount,
      Bal_Account_Type: entry.balanceAccountType,
      Bal_Account_No: entry.balanceAccountNo,
      Document_Date: entry.documentDate,
      Party_Type: '0',
      Party_Code: '',
      User_ID: user?.username || '',
      Shortcut_Dimension_1_Code: entry.lob,
      Shortcut_Dimension_2_Code: entry.branch,
      ShortcutDimCode3: entry.loc,
      ShortcutDimCode4: entry.employee || '',
      ShortcutDimCode5: entry.assignment || '',
    };

    // Add optional fields only if they have values
    if (entry.description) {
      payload.Description = entry.description;
    }
    if (entry.externalDocumentNo) {
      payload.External_Document_No = entry.externalDocumentNo;
    }
    if (entry.lineNarration) {
      payload.Line_Narration1 = entry.lineNarration;
    }
    if (entry.loc) {
      payload.Shortcut_Dimension_3_Code = entry.loc;
    }

    // Set Party_Type and Party_Code if ANY TDS/TCS is present (and not NA)
    // Priority: Account Type TDS/TCS first, then Balance Account Type
    // Party_Type equals account type when TDS/TCS is not blank
    if (entry.accountTdsSection && entry.accountTdsSection.tdsType && entry.accountTdsSection.tdsType !== 'NA') {
      payload.Party_Type = entry.accountType;
      payload.Party_Code = entry.accountNo;
      payload.TDS_Section_Code = entry.accountTdsSection.tdsType;
    } else if (entry.accountTcsSection && entry.accountTcsSection.tcsType && entry.accountTcsSection.tcsType !== 'NA') {
      payload.Party_Type = entry.accountType;
      payload.Party_Code = entry.accountNo;
    } else if (entry.balanceTdsSection && entry.balanceTdsSection.tdsType && entry.balanceTdsSection.tdsType !== 'NA') {
      payload.Party_Type = entry.balanceAccountType;
      payload.Party_Code = entry.balanceAccountNo;
      payload.TDS_Section_Code = entry.balanceTdsSection.tdsType;
    } else if (entry.balanceTcsSection && entry.balanceTcsSection.tcsType && entry.balanceTcsSection.tcsType !== 'NA') {
      payload.Party_Type = entry.balanceAccountType;
      payload.Party_Code = entry.balanceAccountNo;
    }

    return payload;
  };

  const handleSubmitAll = async () => {
    if (entries.length === 0) return;
    
    setIsSubmitting(true);
    const errors: string[] = [];

    try {
      for (const entry of entries) {
        try {
          // Create voucher
          const payload = buildVoucherPayload(entry);
          const response = await createVoucher(payload);
          const documentNo = response.Document_No;

          // Upload attachments if any
          if (entry.attachments && entry.attachments.length > 0) {
            for (const file of entry.attachments) {
              try {
                const base64 = await convertFileToBase64(file);
                await uploadAttachment({
                  recNo: documentNo,
                  fileName: file.name,
                  fileEncodedTextDialog: base64,
                });
              } catch (error) {
                console.error(`Error uploading attachment ${file.name}:`, error);
                errors.push(`Failed to upload ${file.name} for entry ${entry.id}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error creating voucher for entry ${entry.id}:`, error);
          errors.push(`Failed to create voucher for entry ${entry.id}`);
        }
      }

      if (errors.length > 0) {
        alert(`Some entries failed to submit:\n${errors.join('\n')}`);
      } else {
        // Success - clear entries and reset form
        setEntries([]);
        resetForm();
        alert('All entries submitted successfully!');
      }
    } catch (error) {
      console.error('Error submitting entries:', error);
      alert('An error occurred while submitting entries. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

  const colHead = 'px-2 py-1.5 text-xs font-semibold text-foreground/80 bg-muted/30';
  const colCell = 'p-1.5 align-top';
  const control = 'h-9 text-sm shadow-sm';
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
            <div className="text-sm font-medium text-foreground/80">Voucher</div>
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
              <TableHead className={cn(colHead, 'w-[140px]')}>
                <FieldTitle required>Posting Date</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[140px]')}>
                <FieldTitle required>Document Date</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle required>Voucher Type</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle required>Document Type</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[150px]')}>
                <FieldTitle required>Account Type</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle required>Account No.</FieldTitle>
              </TableHead>
              {/* TDS Type header - shown when Account Type is Vendor */}
              {showAccountTds && (
                <TableHead className={cn(colHead, 'w-[160px]')}>
                  <FieldTitle>TDS Type</FieldTitle>
                </TableHead>
              )}
              {/* TDS Amount header - shown when Account Type is Vendor */}
              {showAccountTds && (
                <TableHead className={cn(colHead, 'w-[130px]')}>
                  <FieldTitle>TDS Amount</FieldTitle>
                </TableHead>
              )}
              {/* TCS Type header - shown when Account Type is Customer */}
              {showAccountTcs && (
                <TableHead className={cn(colHead, 'w-[160px]')}>
                  <FieldTitle>TCS Type</FieldTitle>
                </TableHead>
              )}
              {/* TCS Amount header - shown when Account Type is Customer */}
              {showAccountTcs && (
                <TableHead className={cn(colHead, 'w-[130px]')}>
                  <FieldTitle>TCS Amount</FieldTitle>
                </TableHead>
              )}
              <TableHead className={cn(colHead, 'w-[180px]')}>
                <FieldTitle required={formData.voucherType === 'General Journal' && (formData.documentType === 'Invoice' || formData.documentType === 'Credit Memo')}>
                  External Doc No.
                </FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[180px]')}>
                <FieldTitle>Description</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[130px] text-right')}>
                <FieldTitle required>Amount</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[150px]')}>
                <FieldTitle required>Bal. Acc Type</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle required>Bal. Acc No.</FieldTitle>
              </TableHead>
              {/* TDS Type header - shown when Balance Account Type is Vendor */}
              {showBalanceTds && (
                <TableHead className={cn(colHead, 'w-[160px]')}>
                  <FieldTitle>TDS Type</FieldTitle>
                </TableHead>
              )}
              {/* TDS Amount header - shown when Balance Account Type is Vendor */}
              {showBalanceTds && (
                <TableHead className={cn(colHead, 'w-[130px]')}>
                  <FieldTitle>TDS Amount</FieldTitle>
                </TableHead>
              )}
              {/* TCS Type header - shown when Balance Account Type is Customer */}
              {showBalanceTcs && (
                <TableHead className={cn(colHead, 'w-[160px]')}>
                  <FieldTitle>TCS Type</FieldTitle>
                </TableHead>
              )}
              {/* TCS Amount header - shown when Balance Account Type is Customer */}
              {showBalanceTcs && (
                <TableHead className={cn(colHead, 'w-[130px]')}>
                  <FieldTitle>TCS Amount</FieldTitle>
                </TableHead>
              )}
              <TableHead className={cn(colHead, 'w-[200px]')}>
                <FieldTitle>Line Narration</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle required>LOB</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle required>Branch</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle required>LOC</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle>Employee</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle>Assignment</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[200px]')}>
                <FieldTitle>Upload Files</FieldTitle>
              </TableHead>
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
                    key={formData.voucherType || 'reset-voucher'}
                    disabled={!voucherTypeEnabled}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('voucherType'), 'w-full', !voucherTypeEnabled && 'cursor-not-allowed')}
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
                    key={formData.documentType || 'reset-document'}
                    disabled={!voucherTypeEnabled}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('documentType'), 'w-full', !voucherTypeEnabled && 'cursor-not-allowed')}
                      data-field-error={hasError('documentType')}
                    >
                      <SelectValue placeholder={getPlaceholder('documentType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NA">NA</SelectItem>
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
                    key={formData.accountType || 'reset-accountType'}
                    disabled={!accountTypeEnabled}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('accountType'), 'w-full', !accountTypeEnabled && 'cursor-not-allowed')}
                      data-field-error={hasError('accountType')}
                    >
                      <SelectValue placeholder={getPlaceholder('accountType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G/L Account" disabled={formData.balanceAccountType === 'G/L Account'}>
                        G/L Account
                      </SelectItem>
                      <SelectItem value="Customer" disabled={formData.balanceAccountType === 'Customer'}>
                        Customer
                      </SelectItem>
                      <SelectItem value="Vendor" disabled={formData.balanceAccountType === 'Vendor'}>
                        Vendor
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('accountNo')}>
                  <AccountSelect
                    accountType={formData.accountType}
                    value={formData.accountNo}
                    onChange={(value) => {
                      updateField('accountNo', value);
                      // Clear Bal. Acc No. if it matches the new Account No.
                      if (formData.balanceAccountNo === value) {
                        updateField('balanceAccountNo', '');
                      }
                    }}
                    placeholder={getPlaceholder('accountNo', '')}
                    className={cn(control, !accountNoEnabled && 'cursor-not-allowed')}
                    hasError={hasError('accountNo')}
                    errorClass={getFieldErrorClass('accountNo')}
                    disabled={!accountNoEnabled}
                  />
                </CellWithTooltip>
              </TableCell>

              {/* Account TDS Type - shown when Account Type is Vendor */}
              {showAccountTds && (
                <TableCell className={colCell}>
                  <CellWithTooltip errorMessage={getFullErrorMessage('accountTdsSection.tdsType')}>
                    <Select
                      value={formData.accountTdsSection?.tdsType || ''}
                      onValueChange={(value) => {
                        if (value === 'NA') {
                          updateField('accountTdsSection', undefined);
                        } else {
                          updateField('accountTdsSection', {
                            ...formData.accountTdsSection,
                            tdsType: value,
                            tdsAmount: formData.accountTdsSection?.tdsAmount || '',
                          });
                        }
                      }}
                      disabled={!accountNoEnabled || !formData.accountNo}
                    >
                      <SelectTrigger
                        className={cn(control, getFieldErrorClass('accountTdsSection.tdsType'), 'w-full', (!accountNoEnabled || !formData.accountNo) && 'cursor-not-allowed')}
                        data-field-error={hasError('accountTdsSection.tdsType')}
                      >
                        <SelectValue placeholder={getPlaceholder('accountTdsSection.tdsType', 'Select TDS Type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NA">NA</SelectItem>
                        {accountTdsSections.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No TDS sections available</div>
                        ) : (
                          accountTdsSections.map((section) => (
                            <SelectItem key={section.TDS_Section} value={section.TDS_Section}>
                              {section.TDS_Section}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </CellWithTooltip>
                </TableCell>
              )}

              {/* Account TDS Amount - shown when Account Type is Vendor */}
              {showAccountTds && (
                <TableCell className={colCell}>
                  <InputWithTooltip
                    hasError={hasError('accountTdsSection.tdsAmount')}
                    errorClass={getFieldErrorClass('accountTdsSection.tdsAmount')}
                    fullErrorMessage={getFullErrorMessage('accountTdsSection.tdsAmount')}
                    placeholder={getPlaceholder('accountTdsSection.tdsAmount', '')}
                  >
                    <Input
                      value={formData.accountTdsSection?.tdsAmount || ''}
                      onChange={(e) =>
                        updateField('accountTdsSection', {
                          ...formData.accountTdsSection,
                          tdsType: formData.accountTdsSection?.tdsType || '',
                          tdsAmount: e.target.value,
                        })
                      }
                      className={cn(control, (!accountNoEnabled || !formData.accountNo || !formData.accountTdsSection?.tdsType || formData.accountTdsSection.tdsType === 'NA') && 'cursor-not-allowed')}
                      inputMode="decimal"
                      disabled={!accountNoEnabled || !formData.accountNo || !formData.accountTdsSection?.tdsType || formData.accountTdsSection.tdsType === 'NA'}
                    />
                  </InputWithTooltip>
                </TableCell>
              )}

              {/* Account TCS Type - shown when Account Type is Customer */}
              {showAccountTcs && (
                <TableCell className={colCell}>
                  <CellWithTooltip errorMessage={getFullErrorMessage('accountTcsSection.tcsType')}>
                    <Select
                      value={formData.accountTcsSection?.tcsType || ''}
                      onValueChange={(value) => {
                        if (value === 'NA') {
                          updateField('accountTcsSection', undefined);
                        } else {
                          updateField('accountTcsSection', {
                            ...formData.accountTcsSection,
                            tcsType: value,
                            tcsAmount: formData.accountTcsSection?.tcsAmount || '',
                          });
                        }
                      }}
                      disabled={!accountNoEnabled || !formData.accountNo}
                    >
                      <SelectTrigger
                        className={cn(control, getFieldErrorClass('accountTcsSection.tcsType'), 'w-full', (!accountNoEnabled || !formData.accountNo) && 'cursor-not-allowed')}
                        data-field-error={hasError('accountTcsSection.tcsType')}
                      >
                        <SelectValue placeholder={getPlaceholder('accountTcsSection.tcsType', 'Select TCS Type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NA">NA</SelectItem>
                        {accountTcsSections.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No TCS sections available</div>
                        ) : (
                          accountTcsSections.map((section) => (
                            <SelectItem key={section.TCS_Nature_of_Collection} value={section.TCS_Nature_of_Collection}>
                              {section.TCS_Nature_of_Collection}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </CellWithTooltip>
                </TableCell>
              )}

              {/* Account TCS Amount - shown when Account Type is Customer */}
              {showAccountTcs && (
                <TableCell className={colCell}>
                  <InputWithTooltip
                    hasError={hasError('accountTcsSection.tcsAmount')}
                    errorClass={getFieldErrorClass('accountTcsSection.tcsAmount')}
                    fullErrorMessage={getFullErrorMessage('accountTcsSection.tcsAmount')}
                    placeholder={getPlaceholder('accountTcsSection.tcsAmount', '')}
                  >
                    <Input
                      value={formData.accountTcsSection?.tcsAmount || ''}
                      onChange={(e) =>
                        updateField('accountTcsSection', {
                          ...formData.accountTcsSection,
                          tcsType: formData.accountTcsSection?.tcsType || '',
                          tcsAmount: e.target.value,
                        })
                      }
                      className={cn(control, (!accountNoEnabled || !formData.accountNo || !formData.accountTcsSection?.tcsType || formData.accountTcsSection.tcsType === 'NA') && 'cursor-not-allowed')}
                      inputMode="decimal"
                      disabled={!accountNoEnabled || !formData.accountNo || !formData.accountTcsSection?.tcsType || formData.accountTcsSection.tcsType === 'NA'}
                    />
                  </InputWithTooltip>
                </TableCell>
              )}

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
                    className={cn(control, !basicFieldsEnabled && 'cursor-not-allowed')}
                    disabled={!basicFieldsEnabled}
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
                    className={cn(control, !basicFieldsEnabled && 'cursor-not-allowed')}
                    disabled={!basicFieldsEnabled}
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
                    className={cn(control, 'text-right tabular-nums', !basicFieldsEnabled && 'cursor-not-allowed')}
                    inputMode="decimal"
                    disabled={!basicFieldsEnabled}
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
                    key={formData.balanceAccountType || 'reset-balanceType'}
                    disabled={!balanceAccountEnabled}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('balanceAccountType'), 'w-full', !balanceAccountEnabled && 'cursor-not-allowed')}
                      data-field-error={hasError('balanceAccountType')}
                    >
                      <SelectValue placeholder={getPlaceholder('balanceAccountType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G/L Account" disabled={formData.accountType === 'G/L Account'}>
                        G/L Account
                      </SelectItem>
                      <SelectItem value="Customer" disabled={formData.accountType === 'Customer'}>
                        Customer
                      </SelectItem>
                      <SelectItem value="Vendor" disabled={formData.accountType === 'Vendor'}>
                        Vendor
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('balanceAccountNo')}>
                  <AccountSelect
                    accountType={formData.balanceAccountType}
                    value={formData.balanceAccountNo}
                    onChange={(value) => updateField('balanceAccountNo', value)}
                    placeholder={getPlaceholder('balanceAccountNo', '')}
                    className={cn(control, !balanceAccountEnabled && 'cursor-not-allowed')}
                    hasError={hasError('balanceAccountNo')}
                    errorClass={getFieldErrorClass('balanceAccountNo')}
                    excludeValue={formData.accountNo} // Exclude Account No. from Bal. Acc No. list
                    disabled={!balanceAccountEnabled}
                  />
                </CellWithTooltip>
              </TableCell>

              {/* Balance Account TDS Type - shown when Balance Account Type is Vendor */}
              {showBalanceTds && (
                <TableCell className={colCell}>
                  <CellWithTooltip errorMessage={getFullErrorMessage('balanceTdsSection.tdsType')}>
                    <Select
                      value={formData.balanceTdsSection?.tdsType || ''}
                      onValueChange={(value) => {
                        if (value === 'NA') {
                          updateField('balanceTdsSection', undefined);
                        } else {
                          updateField('balanceTdsSection', {
                            ...formData.balanceTdsSection,
                            tdsType: value,
                            tdsAmount: formData.balanceTdsSection?.tdsAmount || '',
                          });
                        }
                      }}
                      disabled={!balanceAccountEnabled || !formData.balanceAccountNo}
                    >
                      <SelectTrigger
                        className={cn(control, getFieldErrorClass('balanceTdsSection.tdsType'), 'w-full', (!balanceAccountEnabled || !formData.balanceAccountNo) && 'cursor-not-allowed')}
                        data-field-error={hasError('balanceTdsSection.tdsType')}
                      >
                        <SelectValue placeholder={getPlaceholder('balanceTdsSection.tdsType', 'Select TDS Type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NA">NA</SelectItem>
                        {balanceTdsSections.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No TDS sections available</div>
                        ) : (
                          balanceTdsSections.map((section) => (
                            <SelectItem key={section.TDS_Section} value={section.TDS_Section}>
                              {section.TDS_Section}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </CellWithTooltip>
                </TableCell>
              )}

              {/* Balance Account TDS Amount - shown when Balance Account Type is Vendor */}
              {showBalanceTds && (
                <TableCell className={colCell}>
                  <InputWithTooltip
                    hasError={hasError('balanceTdsSection.tdsAmount')}
                    errorClass={getFieldErrorClass('balanceTdsSection.tdsAmount')}
                    fullErrorMessage={getFullErrorMessage('balanceTdsSection.tdsAmount')}
                    placeholder={getPlaceholder('balanceTdsSection.tdsAmount', '')}
                  >
                    <Input
                      value={formData.balanceTdsSection?.tdsAmount || ''}
                      onChange={(e) =>
                        updateField('balanceTdsSection', {
                          ...formData.balanceTdsSection,
                          tdsType: formData.balanceTdsSection?.tdsType || '',
                          tdsAmount: e.target.value,
                        })
                      }
                      className={cn(control, (!balanceAccountEnabled || !formData.balanceAccountNo || !formData.balanceTdsSection?.tdsType || formData.balanceTdsSection.tdsType === 'NA') && 'cursor-not-allowed')}
                      inputMode="decimal"
                      disabled={!balanceAccountEnabled || !formData.balanceAccountNo || !formData.balanceTdsSection?.tdsType || formData.balanceTdsSection.tdsType === 'NA'}
                    />
                  </InputWithTooltip>
                </TableCell>
              )}

              {/* Balance Account TCS Type - shown when Balance Account Type is Customer */}
              {showBalanceTcs && (
                <TableCell className={colCell}>
                  <CellWithTooltip errorMessage={getFullErrorMessage('balanceTcsSection.tcsType')}>
                    <Select
                      value={formData.balanceTcsSection?.tcsType || ''}
                      onValueChange={(value) => {
                        if (value === 'NA') {
                          updateField('balanceTcsSection', undefined);
                        } else {
                          updateField('balanceTcsSection', {
                            ...formData.balanceTcsSection,
                            tcsType: value,
                            tcsAmount: formData.balanceTcsSection?.tcsAmount || '',
                          });
                        }
                      }}
                      disabled={!balanceAccountEnabled || !formData.balanceAccountNo}
                    >
                      <SelectTrigger
                        className={cn(control, getFieldErrorClass('balanceTcsSection.tcsType'), 'w-full', (!balanceAccountEnabled || !formData.balanceAccountNo) && 'cursor-not-allowed')}
                        data-field-error={hasError('balanceTcsSection.tcsType')}
                      >
                        <SelectValue placeholder={getPlaceholder('balanceTcsSection.tcsType', 'Select TCS Type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NA">NA</SelectItem>
                        {balanceTcsSections.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No TCS sections available</div>
                        ) : (
                          balanceTcsSections.map((section) => (
                            <SelectItem key={section.TCS_Nature_of_Collection} value={section.TCS_Nature_of_Collection}>
                              {section.TCS_Nature_of_Collection}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </CellWithTooltip>
                </TableCell>
              )}

              {/* Balance Account TCS Amount - shown when Balance Account Type is Customer */}
              {showBalanceTcs && (
                <TableCell className={colCell}>
                  <InputWithTooltip
                    hasError={hasError('balanceTcsSection.tcsAmount')}
                    errorClass={getFieldErrorClass('balanceTcsSection.tcsAmount')}
                    fullErrorMessage={getFullErrorMessage('balanceTcsSection.tcsAmount')}
                    placeholder={getPlaceholder('balanceTcsSection.tcsAmount', '')}
                  >
                    <Input
                      value={formData.balanceTcsSection?.tcsAmount || ''}
                      onChange={(e) =>
                        updateField('balanceTcsSection', {
                          ...formData.balanceTcsSection,
                          tcsType: formData.balanceTcsSection?.tcsType || '',
                          tcsAmount: e.target.value,
                        })
                      }
                      className={cn(control, (!balanceAccountEnabled || !formData.balanceAccountNo || !formData.balanceTcsSection?.tcsType || formData.balanceTcsSection.tcsType === 'NA') && 'cursor-not-allowed')}
                      inputMode="decimal"
                      disabled={!balanceAccountEnabled || !formData.balanceAccountNo || !formData.balanceTcsSection?.tcsType || formData.balanceTcsSection.tcsType === 'NA'}
                    />
                  </InputWithTooltip>
                </TableCell>
              )}

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
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    disabled={!restFieldsEnabled}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('lob')}>
                  <DimensionSelect
                    dimensionType="LOB"
                    value={formData.lob}
                    onChange={(value) => updateField('lob', value)}
                    placeholder={getPlaceholder('lob', '')}
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    hasError={hasError('lob')}
                    errorClass={getFieldErrorClass('lob')}
                    disabled={!restFieldsEnabled}
                  />
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('branch')}>
                  <DimensionSelect
                    dimensionType="BRANCH"
                    value={formData.branch}
                    onChange={(value) => updateField('branch', value)}
                    placeholder={getPlaceholder('branch', '')}
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    hasError={hasError('branch')}
                    errorClass={getFieldErrorClass('branch')}
                    disabled={!restFieldsEnabled}
                  />
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('loc')}>
                  <DimensionSelect
                    dimensionType="LOC"
                    value={formData.loc}
                    onChange={(value) => updateField('loc', value)}
                    placeholder={getPlaceholder('loc', '')}
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    hasError={hasError('loc')}
                    errorClass={getFieldErrorClass('loc')}
                    disabled={!restFieldsEnabled}
                  />
                </CellWithTooltip>
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
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    disabled={!restFieldsEnabled}
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
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    disabled={!restFieldsEnabled}
                  />
                </InputWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn("w-full text-xs", !restFieldsEnabled && 'cursor-not-allowed')}
                      disabled={isSubmitting || !restFieldsEnabled}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Files
                    </Button>
                  </div>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded"
                        >
                          <span className="truncate max-w-[120px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-destructive hover:text-destructive/80"
                            disabled={isSubmitting}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TableCell>

            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 min-h-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="text-sm text-foreground/70">
            {entries.length === 0 ? 'No entries' : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} added`}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitAll}
              disabled={entries.length === 0 || pendingEditId !== null || isSubmitting}
              title={pendingEditId ? 'Cannot submit while editing an entry' : isSubmitting ? 'Submitting entries...' : 'Submit all entries to ERP'}
            >
              {isSubmitting ? 'Submitting...' : 'Submit to ERP'}
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
          <div className="rounded-md border bg-muted/20 p-6 text-center text-foreground/70">
            <div>No entries yet.</div>
            <div className="text-sm mt-1">Fill the row and click "Add".</div>
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
                  <TableHead className={cn(colHead, 'w-[200px]')}>Upload Files</TableHead>
                  <TableHead className={cn(colHead, 'w-[110px]')}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <ContextMenu key={entry.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow className={cn(pendingEditId === entry.id && 'bg-primary/5')}>
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
                    <TableCell className="p-2 text-xs text-right tabular-nums">
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
                    <TableCell className="p-2 text-xs text-right tabular-nums">
                      {entry.accountTcsSection?.tcsAmount
                        ? entry.accountTcsSection.tcsAmount.toFixed(2)
                        : entry.balanceTcsSection?.tcsAmount
                        ? entry.balanceTcsSection.tcsAmount.toFixed(2)
                        : ''}
                    </TableCell>
                    <TableCell className="p-2 text-xs">
                      {entry.attachments && entry.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {entry.attachments.map((file, index) => (
                            <span key={index} className="bg-muted px-1.5 py-0.5 rounded text-xs truncate max-w-[150px]" title={file.name}>
                              {file.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => handleEditClick(entry.id)}
                        disabled={pendingEditId !== null && pendingEditId !== entry.id}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleDeleteEntry(entry.id)}
                        variant="destructive"
                        disabled={pendingEditId === entry.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
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
