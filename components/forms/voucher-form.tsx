'use client';

/**
 * Voucher Form component
 * Excel-style single-row grid with entries table below
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Pencil, Plus, Trash2, Upload, Info, Loader2, X } from 'lucide-react';

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
import { ErrorDialog, type ErrorDetail } from '@/components/ui/error-dialog';
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
import { CascadingDimensionSelect } from './cascading-dimension-select';
import {
  getTDSSection,
  getTCSSection,
  createVoucher,
  uploadAttachment,
  createNoSeriesForVouchers,
  getVoucherEntries,
  postVouchers,
  deleteVoucher,
  updateVoucher,
  getDefaultDimensions,
  getTaxComponentsInJson,
  type TDSSection,
  type TCSSection,
  type CreateVoucherPayload,
  type VoucherEntryResponse,
  type DefaultDimension,
} from '@/lib/api/services/voucher.service';
import { getCustomerByNo } from '@/lib/api/services/customer.service';
import { useAuth } from '@/lib/contexts/auth-context';
import type { ApiError } from '@/lib/api/client';

type VoucherEntry = VoucherFormData & { 
  id: string; 
  attachments?: File[]; 
  status?: 'pending' | 'success' | 'failed' | 'partial';
  errorMessage?: string;
  failedFiles?: string[];
};

type FormState = {
  voucherType: VoucherFormData['voucherType'] | undefined;
  documentType: VoucherFormData['documentType'] | undefined;
  postingDate: string;
  documentDate: string;
  accountType: VoucherFormData['accountType'] | undefined;
  accountNo: string;
  accountTdsSection: { tdsType: string } | undefined;
  accountTcsSection: { tcsType: string } | undefined;
  externalDocumentNo: string;
  description: string | undefined;
  amount: string;
  balanceAccountType: VoucherFormData['balanceAccountType'] | undefined;
  balanceAccountNo: string;
  balanceTdsSection: { tdsType: string } | undefined;
  balanceTcsSection: { tcsType: string } | undefined;
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
  id,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: {
  hasError: boolean;
  errorClass: string;
  fullErrorMessage?: string;
  placeholder: string;
  children: React.ReactElement<React.ComponentProps<typeof Input>>;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}) {
  const childProps = children.props as React.ComponentProps<typeof Input>;
  const inputProps = {
    ...childProps,
    id,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    className: cn(childProps.className, 'w-full', hasError && errorClass),
    placeholder,
    'data-field-error': hasError,
    title: fullErrorMessage || undefined, // Use native title attribute instead of tooltip
  } as React.ComponentProps<typeof Input>;

  // Return input directly without tooltip wrapper to prevent focus loss
  return React.cloneElement(children, inputProps);
}

export function VoucherForm() {
  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const { userID } = useAuth();
  
  // Refs for drag-to-scroll functionality
  const formTableRef = useRef<HTMLDivElement>(null);
  const entriesTableRef = useRef<HTMLDivElement>(null);
  const vouchersTableRef = useRef<HTMLDivElement>(null);
  
  // Simple horizontal scroll hook
  const useHorizontalScroll = (ref: React.RefObject<HTMLDivElement | null>) => {
    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;

      const onMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('input, select, button, textarea')) return;
        isDown = true;
        el.style.cursor = 'grabbing';
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        e.preventDefault();
      };

      const onMouseLeave = () => {
        isDown = false;
        el.style.cursor = 'grab';
      };

      const onMouseUp = () => {
        isDown = false;
        el.style.cursor = 'grab';
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 2;
        el.scrollLeft = scrollLeft - walk;
      };

      const onWheel = (e: WheelEvent) => {
        if (el.scrollWidth > el.clientWidth) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      };

      el.style.cursor = 'grab';
      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('mouseleave', onMouseLeave);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mousemove', onMouseMove);
      el.addEventListener('wheel', onWheel, { passive: false });

      return () => {
        el.removeEventListener('mousedown', onMouseDown);
        el.removeEventListener('mouseleave', onMouseLeave);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('wheel', onWheel);
      };
    }, [ref]);
  };

  useHorizontalScroll(formTableRef);
  useHorizontalScroll(entriesTableRef);
  useHorizontalScroll(vouchersTableRef);

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
  const [fetchedVouchers, setFetchedVouchers] = useState<VoucherEntryResponse[]>([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isDeletingVoucher, setIsDeletingVoucher] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<VoucherEntryResponse | null>(null);
  const [showDeleteVoucherWarning, setShowDeleteVoucherWarning] = useState(false);
  // Edit voucher state
  const [voucherToEdit, setVoucherToEdit] = useState<VoucherEntryResponse | null>(null);
  const [isUpdatingVoucher, setIsUpdatingVoucher] = useState(false);
  const [showUpdateVoucherWarning, setShowUpdateVoucherWarning] = useState(false);
  const [isEditingVoucher, setIsEditingVoucher] = useState(false);
  // Track which voucher line numbers failed (for highlighting)
  const [failedVoucherLineNos, setFailedVoucherLineNos] = useState<Set<number>>(new Set());
  
  // Success dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Error dialog state
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogData, setErrorDialogData] = useState<{
    title?: string;
    message?: string;
    errors: ErrorDetail[];
    type?: 'submit' | 'post' | 'upload' | 'general';
  }>({ errors: [] });
  
  // State for tax details (used for tooltip)
  const [taxDetails, setTaxDetails] = useState<Record<string, unknown[]>>({});
  const [loadingTaxDetails, setLoadingTaxDetails] = useState<Record<string, boolean>>({});
  // Track which tooltip is currently open (only one at a time)
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  // Track which document is currently being fetched (for cancellation)
  // Only one API call should be active at a time
  const fetchingDocumentRef = useRef<string | null>(null);
  const activeRequestRef = useRef<Promise<unknown[]> | null>(null);
  
  // State for conditional Employee/Assignment dimensions
  const [isEmployeeMandatory, setIsEmployeeMandatory] = useState(false);
  const [isAssignmentMandatory, setIsAssignmentMandatory] = useState(false);

  // TDS/TCS visibility for Account Type
  // Show only when account type is Vendor/Customer, account number is selected, and sections are available
  const showAccountTds = accountType === 'Vendor' && formData.accountNo && accountTdsSections.length > 0;
  const showAccountTcs = accountType === 'Customer' && formData.accountNo && accountTcsSections.length > 0;
  
  // TDS/TCS visibility for Balance Account Type
  // Show only when balance account type is Vendor/Customer, balance account number is selected, and sections are available
  const showBalanceTds = formData.balanceAccountType === 'Vendor' && formData.balanceAccountNo && balanceTdsSections.length > 0;
  const showBalanceTcs = formData.balanceAccountType === 'Customer' && formData.balanceAccountNo && balanceTcsSections.length > 0;

  // Progressive field enablement logic
  // When editing (pendingEditId !== null), enable all fields
  const isEditing = pendingEditId !== null;
  const datesFilled = formData.postingDate && formData.documentDate;
  const voucherTypeEnabled = isEditing || datesFilled;
  const accountTypeEnabled = isEditing || (voucherTypeEnabled && formData.voucherType && formData.documentType);
  const accountNoEnabled = isEditing || (accountTypeEnabled && formData.accountType);
  const basicFieldsEnabled = isEditing || (accountNoEnabled && formData.accountNo);
  const balanceAccountEnabled = isEditing || (basicFieldsEnabled && formData.amount);
  const restFieldsEnabled = isEditing || (balanceAccountEnabled && formData.balanceAccountType && formData.balanceAccountNo);

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
      data.accountTdsSection = {
        tdsType: state.accountTdsSection.tdsType,
      };
    }

    if (state.accountTcsSection && state.accountTcsSection.tcsType && state.accountTcsSection.tcsType !== 'NA') {
      data.accountTcsSection = {
        tcsType: state.accountTcsSection.tcsType,
        };
    }

    if (state.balanceTdsSection && state.balanceTdsSection.tdsType && state.balanceTdsSection.tdsType !== 'NA') {
      data.balanceTdsSection = {
        tdsType: state.balanceTdsSection.tdsType,
      };
    }

    if (state.balanceTcsSection && state.balanceTcsSection.tcsType && state.balanceTcsSection.tcsType !== 'NA') {
      data.balanceTcsSection = {
        tcsType: state.balanceTcsSection.tcsType,
        };
    }

    return data;
  };

  // Validate all fields - used on Add button click
  const validateAllFields = (formDataToValidate: FormState, attachmentsToValidate: File[] = attachments): ValidationErrors => {
    const data = formStateToVoucherData(formDataToValidate);
    const result = voucherSchema.safeParse(data);

    const errors: ValidationErrors = {};
    
    // Add schema validation errors
    if (!result.success) {
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    });
    }

    // Add conditional validation for Employee/Assignment
    if (isEmployeeMandatory && (!formDataToValidate.employee || formDataToValidate.employee.trim() === '')) {
      errors.employee = ['Employee is required'];
    }
    if (isAssignmentMandatory && (!formDataToValidate.assignment || formDataToValidate.assignment.trim() === '')) {
      errors.assignment = ['Assignment is required'];
    }

    // Validate attachments for Cash Payment
    if (formDataToValidate.voucherType === 'Cash Payment') {
      if (!attachmentsToValidate || attachmentsToValidate.length === 0) {
        errors.attachments = ['Attachment is required when Voucher Type is Cash Payment'];
      }
    }

    return errors;
  };

  // Validate conditional fields only - used for real-time validation
  const validateConditionalFields = (formDataToValidate: FormState): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Validate External Document No. if Voucher Type is General Journal
    if (formDataToValidate.voucherType === 'General Journal') {
      if (!formDataToValidate.externalDocumentNo || formDataToValidate.externalDocumentNo.trim() === '') {
        errors.externalDocumentNo = ['External Document No. is required when Voucher Type is General Journal'];
      }
    }
    
    // Validate Employee/Assignment if mandatory
    if (isEmployeeMandatory && (!formDataToValidate.employee || formDataToValidate.employee.trim() === '')) {
      errors.employee = ['Employee is required'];
    }
    if (isAssignmentMandatory && (!formDataToValidate.assignment || formDataToValidate.assignment.trim() === '')) {
      errors.assignment = ['Assignment is required'];
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
    setIsEditingVoucher(false);
    setVoucherToEdit(null);
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
  // Auto-set Balance Account Type to "G/L Account" when Account Type is Customer or Vendor
  useEffect(() => {
    if (formData.accountType === 'Customer' || formData.accountType === 'Vendor') {
      if (formData.balanceAccountType !== 'G/L Account') {
        updateField('balanceAccountType', 'G/L Account');
        updateField('balanceAccountNo', ''); // Clear Balance Account No. when auto-setting
      }
    }
  }, [formData.accountType]);

  // Fetch vouchers from ERP - reusable function
  const fetchVouchersFromERP = useCallback(async () => {
    setIsLoadingVouchers(true);
    try {
      if (!userID) {
        console.warn('User ID not available, cannot fetch vouchers');
        setFetchedVouchers([]);
        return;
      }
      
      // Fetch vouchers from all three types with userID filter
      const [gjVouchers, crVouchers, cpVouchers] = await Promise.all([
        getVoucherEntries('General Journal', userID),
        getVoucherEntries('Cash Receipt', userID),
        getVoucherEntries('Cash Payment', userID),
      ]);
      
      // Combine all vouchers
      setFetchedVouchers([...gjVouchers, ...crVouchers, ...cpVouchers]);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      setFetchedVouchers([]);
    } finally {
      setIsLoadingVouchers(false);
    }
  }, [userID]);

  // Fetch vouchers from API on component mount
  useEffect(() => {
    fetchVouchersFromERP();
  }, [fetchVouchersFromERP]);

  // Note: Employee and Assignment values are now fetched on-demand by DimensionSelect component
  // No need to pre-fetch them here

  // Fetch default dimensions when Account No. or Balance Account No. changes
  // This only determines if Employee/Assignment are mandatory, not whether to fetch values
  useEffect(() => {
    const fetchDimensions = async () => {
      const accountNumbers = [formData.accountNo, formData.balanceAccountNo].filter(Boolean);
      if (accountNumbers.length === 0) {
        setIsEmployeeMandatory(false);
        setIsAssignmentMandatory(false);
        return;
      }

      try {
        // Fetch dimensions for both account numbers
        const dimensionPromises = accountNumbers.map(no => getDefaultDimensions(no));
        const dimensionResults = await Promise.all(dimensionPromises);
        const allDimensions = dimensionResults.flat();

        // Check for Employee and Assignment dimensions
        // If dimension exists, it's mandatory (no need to check Value_Posting)
        const employeeDim = allDimensions.find(d => d.Dimension_Code === 'EMPLOYEE');
        const assignmentDim = allDimensions.find(d => d.Dimension_Code === 'ASSIGNMENT');

        const employeeMandatory = !!employeeDim;
        const assignmentMandatory = !!assignmentDim;

        setIsEmployeeMandatory(employeeMandatory);
        setIsAssignmentMandatory(assignmentMandatory);

        // Clear Employee/Assignment if no longer mandatory
        setFormData(prev => {
          const updated = { ...prev };
          if (!employeeMandatory && prev.employee) {
            updated.employee = undefined;
          }
          if (!assignmentMandatory && prev.assignment) {
            updated.assignment = undefined;
          }
          return updated;
        });
      } catch (error) {
        console.error('Error fetching default dimensions:', error);
        setIsEmployeeMandatory(false);
        setIsAssignmentMandatory(false);
      }
    };

    fetchDimensions();
  }, [formData.accountNo, formData.balanceAccountNo]);

  // Scroll management for accessibility - scroll focused inputs into view
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // Check if the focused element is an input, select, or textarea
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        // Find the scrollable container (the table wrapper)
        const scrollContainer = target.closest('.overflow-x-auto, .overflow-auto, [style*="overflow"]') as HTMLElement;
        if (scrollContainer) {
          // Scroll the focused element into view within its container
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest', 
            inline: 'center' 
          });
        } else {
          // If no scroll container found, scroll into view normally
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest', 
            inline: 'center' 
          });
        }
      }
    };
    
    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  // Helper to get voucher type from template name
  const getVoucherTypeFromTemplate = (templateName: string): string => {
    const template = templateName.toUpperCase();
    if (template === 'GENERAL') {
      return 'General Journal';
    } else if (template === 'CASH RECE' || template === 'CASH RECEIPT') {
      return 'Cash Receipt';
    } else if (template === 'CASH PAYM' || template === 'CASH PAYMENT') {
      return 'Cash Payment';
    }
    return 'General Journal'; // Default
  };

  // Load voucher for editing
  const loadVoucherForEdit = (voucher: VoucherEntryResponse) => {
    // Set accountType FIRST before setting form data
    setAccountType(voucher.Account_Type as VoucherFormData['accountType']);

    // Use setTimeout to ensure AccountSelect components have time to initialize
    setTimeout(() => {
      setFormData({
        voucherType: getVoucherTypeFromTemplate(voucher.Journal_Template_Name) as 'General Journal' | 'Cash Receipt' | 'Cash Payment' | undefined,
        // Map empty string Document_Type to 'NA' - check for empty string, null, undefined, or whitespace
        documentType: (voucher.Document_Type === '' || 
                       voucher.Document_Type === null || 
                       voucher.Document_Type === undefined || 
                       (typeof voucher.Document_Type === 'string' && voucher.Document_Type.trim() === ''))
          ? 'NA' 
          : (voucher.Document_Type as 'Payment' | 'Invoice' | 'Credit Memo' | 'Refund' | 'NA' | null | undefined),
        postingDate: voucher.Posting_Date,
        documentDate: voucher.Document_Date,
        accountType: voucher.Account_Type as 'G/L Account' | 'Customer' | 'Vendor' | undefined,
        accountNo: voucher.Account_No,
        accountTdsSection: voucher.TDS_Section_Code ? { tdsType: voucher.TDS_Section_Code } : undefined,
        accountTcsSection: voucher.TCS_Nature_of_Collection ? { tcsType: voucher.TCS_Nature_of_Collection } : undefined,
        externalDocumentNo: voucher.External_Document_No || '',
        description: voucher.Description || undefined,
        amount: voucher.Amount.toString(),
        balanceAccountType: voucher.Bal_Account_Type as 'G/L Account' | 'Customer' | 'Vendor' | undefined,
        balanceAccountNo: voucher.Bal_Account_No,
        balanceTdsSection: undefined, // Not available in response
        balanceTcsSection: undefined, // Not available in response
        lineNarration: voucher.Line_Narration1 || '',
        lob: voucher.Shortcut_Dimension_1_Code || '',
        branch: voucher.Shortcut_Dimension_2_Code || '',
        loc: voucher.ShortcutDimCode3 || '',
        employee: voucher.ShortcutDimCode4 || '',
        assignment: voucher.ShortcutDimCode5 || '',
      });
    }, 0);

    setVoucherToEdit(voucher);
    setIsEditingVoucher(true);
    setHasUnsavedChanges(true);
    setValidationErrors({});
    setPendingEditId(null); // Not editing entry

    // Scroll to form
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
        }
      }
    }, 100);
  };

  // Handle updating a voucher
  const handleUpdateVoucher = async () => {
    if (!voucherToEdit) return;

    setIsUpdatingVoucher(true);
    try {
      // Validate all fields
      const errors = validateAllFields(formData);
      setValidationErrors(errors);
      
      if (Object.keys(errors).length > 0) {
        scrollToFirstError();
        setIsUpdatingVoucher(false);
        return;
      }

      // Build update payload from form data
      const data = formStateToVoucherData(formData) as VoucherFormData;
      
      // Compare with original voucher to only include changed fields
      const original = voucherToEdit;
      const updatePayload: Partial<VoucherEntryResponse> = {};
      
      // Helper to check if values are different
      const hasChanged = (newVal: unknown, oldVal: unknown): boolean => {
        // Handle empty string vs undefined/null
        const normalizedNew = newVal === '' || newVal === null ? undefined : newVal;
        const normalizedOld = oldVal === '' || oldVal === null ? undefined : oldVal;
        return normalizedNew !== normalizedOld;
      };
      
      // Only add fields that have changed
      if (hasChanged(data.postingDate, original.Posting_Date)) {
        updatePayload.Posting_Date = data.postingDate;
      }
      if (hasChanged(data.documentDate, original.Document_Date)) {
        updatePayload.Document_Date = data.documentDate;
      }
      // Handle Document_Type: compare form value (NA -> '') with original ('' -> NA)
      // Normalize both to empty string for comparison
      const formDocType = data.documentType === 'NA' ? '' : (data.documentType || '');
      const originalDocType = (!original.Document_Type || 
                               original.Document_Type === '' || 
                               original.Document_Type === null || 
                               original.Document_Type === undefined ||
                               (typeof original.Document_Type === 'string' && original.Document_Type.trim() === ''))
        ? '' 
        : original.Document_Type;
      // Only include if they're different
      if (formDocType !== originalDocType) {
        updatePayload.Document_Type = formDocType;
      }
      if (hasChanged(data.accountType, original.Account_Type)) {
        updatePayload.Account_Type = data.accountType;
      }
      if (hasChanged(data.accountNo, original.Account_No)) {
        updatePayload.Account_No = data.accountNo;
      }
      if (hasChanged(data.description, original.Description)) {
        updatePayload.Description = data.description;
      }
      const formAmount = typeof data.amount === 'string' ? parseFloat(data.amount) || 0 : data.amount;
      if (formAmount !== original.Amount) {
        updatePayload.Amount = formAmount;
      }
      if (hasChanged(data.balanceAccountType, original.Bal_Account_Type)) {
        updatePayload.Bal_Account_Type = data.balanceAccountType;
      }
      if (hasChanged(data.balanceAccountNo, original.Bal_Account_No)) {
        updatePayload.Bal_Account_No = data.balanceAccountNo;
      }
      if (hasChanged(data.externalDocumentNo, original.External_Document_No)) {
        updatePayload.External_Document_No = data.externalDocumentNo || undefined;
      }
      if (hasChanged(data.lineNarration, original.Line_Narration1)) {
        updatePayload.Line_Narration1 = data.lineNarration || undefined;
      }
      if (hasChanged(data.lob, original.Shortcut_Dimension_1_Code)) {
        updatePayload.Shortcut_Dimension_1_Code = data.lob || undefined;
      }
      if (hasChanged(data.branch, original.Shortcut_Dimension_2_Code)) {
        updatePayload.Shortcut_Dimension_2_Code = data.branch || undefined;
      }
      if (hasChanged(data.loc, original.ShortcutDimCode3)) {
        updatePayload.ShortcutDimCode3 = data.loc || undefined;
      }
      if (hasChanged(data.employee, original.ShortcutDimCode4)) {
        updatePayload.ShortcutDimCode4 = data.employee || undefined;
      }
      if (hasChanged(data.assignment, original.ShortcutDimCode5)) {
        updatePayload.ShortcutDimCode5 = data.assignment || undefined;
      }
      if (hasChanged(data.accountTdsSection?.tdsType, original.TDS_Section_Code)) {
        updatePayload.TDS_Section_Code = data.accountTdsSection?.tdsType;
      }
      if (hasChanged(data.accountTcsSection?.tcsType, original.TCS_Nature_of_Collection)) {
        updatePayload.TCS_Nature_of_Collection = data.accountTcsSection?.tcsType;
      }
      
      // Remove undefined values, but keep Document_Type even if it's empty string
      Object.keys(updatePayload).forEach(key => {
        const value = updatePayload[key as keyof typeof updatePayload];
        // Keep Document_Type even if it's empty string (for NA case)
        if (key === 'Document_Type') {
          if (value === undefined || value === null) {
            delete updatePayload[key as keyof typeof updatePayload];
          }
        } else {
          if (value === undefined) {
            delete updatePayload[key as keyof typeof updatePayload];
          }
        }
      });
      
      // If no fields changed, show message and return
      if (Object.keys(updatePayload).length === 0) {
        setSuccessMessage('No changes detected. Voucher was not updated.');
        setSuccessDialogOpen(true);
        setIsUpdatingVoucher(false);
        return;
      }

      await updateVoucher(
        voucherToEdit.Journal_Template_Name,
        voucherToEdit.Journal_Batch_Name || 'DEFAULT',
        voucherToEdit.Line_No,
        updatePayload
      );

      // Success
      setSuccessMessage(`Voucher ${voucherToEdit.Document_No} updated successfully!`);
      setSuccessDialogOpen(true);
      
      // Reset form and clear edit state
      resetForm();
      setIsEditingVoucher(false);
      setVoucherToEdit(null);
      setShowUpdateVoucherWarning(false);
      
      // Reload vouchers
      await fetchVouchersFromERP();
    } catch (error) {
      console.error('Error updating voucher:', error);
      const errorDetail = extractErrorDetails(error);
      setErrorDialogData({
        title: 'Update Voucher Failed',
        message: 'Failed to update voucher. Please review the error details below.',
        errors: [errorDetail],
        type: 'general',
      });
      setErrorDialogOpen(true);
    } finally {
      setIsUpdatingVoucher(false);
    }
  };

  // Handle deleting a voucher
  const handleDeleteVoucher = async (voucher: VoucherEntryResponse) => {
    setIsDeletingVoucher(true);
    try {
      await deleteVoucher(
        voucher.Journal_Template_Name,
        voucher.Journal_Batch_Name || 'DEFAULT',
        voucher.Line_No
      );
      
      // Reload vouchers after successful deletion
      await fetchVouchersFromERP();
      
      // Close dialog
      setShowDeleteVoucherWarning(false);
      setVoucherToDelete(null);
    } catch (error) {
      console.error('Error deleting voucher:', error);
      const errorDetail = extractErrorDetails(error);
      setErrorDialogData({
        title: 'Delete Voucher Failed',
        message: 'Failed to delete voucher. Please review the error details below.',
        errors: [errorDetail],
        type: 'general',
      });
      setErrorDialogOpen(true);
    } finally {
      setIsDeletingVoucher(false);
    }
  };

  // Handle posting vouchers
  const handlePostVouchers = async () => {
    setIsPosting(true);
    try {
      if (!userID) {
        setErrorDialogData({
          title: 'Post Vouchers Error',
          message: 'User ID not available. Please login again.',
          errors: [],
          type: 'post',
        });
        setErrorDialogOpen(true);
        return;
      }
      await postVouchers(userID);
      alert('Vouchers posted successfully');
      // Clear any previous failed voucher highlights
      setFailedVoucherLineNos(new Set());
      // Refresh vouchers from ERP to reflect posted status
      await fetchVouchersFromERP();
    } catch (error) {
      console.error('Error posting vouchers:', error);
      const errorDetail = extractErrorDetails(error);
      
      // Extract Line_No from error message and highlight the voucher
      const lineNo = extractLineNoFromError(errorDetail.message);
      if (lineNo !== null) {
        setFailedVoucherLineNos(new Set([lineNo]));
      }
      
      // Find the voucher that failed to add to error details
      let failedVoucher: VoucherEntryResponse | undefined;
      if (lineNo !== null) {
        failedVoucher = fetchedVouchers.find(v => v.Line_No === lineNo);
        if (failedVoucher) {
          errorDetail.entryLabel = `Voucher ${failedVoucher.Document_No} (Line No. ${lineNo})`;
        }
      }
      
      setErrorDialogData({
        title: 'Post Vouchers Failed',
        message: 'Failed to post vouchers. Please review the error details below.',
        errors: [errorDetail],
        type: 'post',
      });
      setErrorDialogOpen(true);
    } finally {
      setIsPosting(false);
    }
  };

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
        const shouldRequireExternalDoc = formData.voucherType === 'General Journal';
        
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

    // Clear Account No. when Account Type changes
    updateField('accountNo', '');

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

    // Auto-set Balance Account Type to "G/L Account" when Account Type is Customer or Vendor
    if (value === 'Customer' || value === 'Vendor') {
      updateField('balanceAccountType', 'G/L Account');
      updateField('balanceAccountNo', ''); // Clear Balance Account No. when Account Type changes
    } else if (value === 'G/L Account') {
      // Clear Balance Account Type when Account Type is set to G/L Account
      updateField('balanceAccountType', undefined);
      updateField('balanceAccountNo', '');
    }
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstErrorField = document.querySelector('[data-field-error="true"]') as HTMLElement | null;
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 100);
  };

  const handleAddEntry = () => {
    // If editing voucher, show update confirmation
    if (isEditingVoucher && voucherToEdit) {
      setShowUpdateVoucherWarning(true);
      return;
    }

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
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      status: 'pending'
    };
    setEntries((prev) => [...prev, newEntry]);
    resetForm();
    setAttachments([]);
  };

  const loadEntryForEdit = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    // Set accountType FIRST before setting form data so AccountSelect can display values properly
    // Use setTimeout to ensure accountType is set before form data
    setAccountType(entry.accountType as VoucherFormData['accountType']);

    // Use setTimeout to ensure AccountSelect components have time to initialize with accountType
    setTimeout(() => {
    setFormData({
      voucherType: entry.voucherType,
      documentType: entry.documentType,
      postingDate: entry.postingDate,
      documentDate: entry.documentDate,
      accountType: entry.accountType,
      accountNo: entry.accountNo,
        accountTdsSection: entry.accountTdsSection
          ? { tdsType: entry.accountTdsSection.tdsType }
        : undefined,
        accountTcsSection: entry.accountTcsSection
          ? { tcsType: entry.accountTcsSection.tcsType }
        : undefined,
        externalDocumentNo: entry.externalDocumentNo || '',
        description: entry.description || undefined,
      amount: entry.amount.toString(),
      balanceAccountType: entry.balanceAccountType,
      balanceAccountNo: entry.balanceAccountNo,
        balanceTdsSection: entry.balanceTdsSection
          ? { tdsType: entry.balanceTdsSection.tdsType }
          : undefined,
        balanceTcsSection: entry.balanceTcsSection
          ? { tcsType: entry.balanceTcsSection.tcsType }
          : undefined,
      lineNarration: entry.lineNarration || '',
      lob: entry.lob,
      branch: entry.branch,
      loc: entry.loc,
      employee: entry.employee,
      assignment: entry.assignment,
    });
    }, 0);

    setPendingEditId(entryId);
    setHasUnsavedChanges(true);
    setValidationErrors({});
    setAttachments(entry.attachments || []);
    setIsEditingVoucher(false); // Not editing voucher, editing entry

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
    // Preserve attachments when updating entry
    setEntries((prev) => prev.map((e) => (e.id === pendingEditId ? { ...data, id: pendingEditId, attachments: attachments } : e)));
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

  const buildVoucherPayload = (entry: VoucherEntry, documentNo: string): CreateVoucherPayload => {
    // Build base payload with required fields only
    const payload: Partial<CreateVoucherPayload> = {
      Journal_Template_Name: mapVoucherTypeToTemplate(entry.voucherType),
      Journal_Batch_Name: 'DEFAULT',
      Posting_Date: entry.postingDate,
      // Send empty string for Document_Type if it's NA, otherwise send the value or default to 'Payment'
      Document_Type: entry.documentType === 'NA' ? '' : (entry.documentType || 'Payment'),
      Account_Type: entry.accountType,
      Account_No: entry.accountNo,
      Amount: entry.amount,
      Bal_Account_Type: entry.balanceAccountType,
      Document_Date: entry.documentDate,
      Document_No: documentNo,
    };

    // Add User_ID only if it has a value
    if (userID && userID.trim() !== '') {
      payload.User_ID = userID;
    }

    // Add optional fields only if they have non-empty values
    if (entry.balanceAccountNo && entry.balanceAccountNo.trim() !== '') {
      payload.Bal_Account_No = entry.balanceAccountNo;
    }
    if (entry.description && entry.description.trim() !== '') {
      payload.Description = entry.description;
    }
    if (entry.externalDocumentNo && entry.externalDocumentNo.trim() !== '') {
      payload.External_Document_No = entry.externalDocumentNo;
    }
    if (entry.lineNarration && entry.lineNarration.trim() !== '') {
      payload.Line_Narration1 = entry.lineNarration;
    }
    if (entry.lob && entry.lob.trim() !== '') {
      payload.Shortcut_Dimension_1_Code = entry.lob;
    }
    if (entry.branch && entry.branch.trim() !== '') {
      payload.Shortcut_Dimension_2_Code = entry.branch;
    }
    if (entry.loc && entry.loc.trim() !== '') {
      payload.ShortcutDimCode3 = entry.loc;
    }
    if (entry.employee && entry.employee.trim() !== '') {
      payload.ShortcutDimCode4 = entry.employee;
    }
    if (entry.assignment && entry.assignment.trim() !== '') {
      payload.ShortcutDimCode5 = entry.assignment;
    }

    // Set Party_Type and Party_Code ONLY if Account-related TDS/TCS is present (and not NA)
    // Party_Type = Account_Type and Party_Code = Account_No when TDS/TCS is applicable
    if (entry.accountTdsSection && entry.accountTdsSection.tdsType && entry.accountTdsSection.tdsType !== 'NA') {
      payload.Party_Type = entry.accountType;
      payload.Party_Code = entry.accountNo;
      payload.TDS_Section_Code = entry.accountTdsSection.tdsType;
    } else if (entry.accountTcsSection && entry.accountTcsSection.tcsType && entry.accountTcsSection.tcsType !== 'NA') {
      payload.Party_Type = entry.accountType;
      payload.Party_Code = entry.accountNo;
      payload.TCS_Nature_of_Collection = entry.accountTcsSection.tcsType;
    }

    // Remove any undefined or empty string values before returning
    // BUT keep Document_Type even if it's empty string (for NA case)
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([key, value]) => {
        // Always keep Document_Type even if empty string
        if (key === 'Document_Type') {
          return value !== undefined && value !== null;
        }
        // Keep the value if it's not undefined, null, or empty string
        return value !== undefined && value !== null && value !== '';
      })
    ) as unknown as CreateVoucherPayload;

    return cleanPayload;
  };

  // Helper function to extract Line_No from error message
  const extractLineNoFromError = (errorMessage: string): number | null => {
    // Pattern: "Line No.=10000" or "Line No.= 10000" or "Line No.=10000."
    const match = errorMessage.match(/Line\s+No\.\s*=\s*(\d+)/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  };

  // Helper function to extract error details from API errors
  const extractErrorDetails = (error: unknown, entryId?: string, entryLabel?: string): ErrorDetail => {
    let errorMessage = '';
    let lineNo: number | null = null;

    if (error && typeof error === 'object' && 'message' in error) {
      const apiError = error as ApiError;
      errorMessage = apiError.message || 'Unknown error';
      lineNo = extractLineNoFromError(errorMessage);
      
      return {
        entryId,
        entryLabel,
        message: errorMessage,
        code: apiError.code,
        status: apiError.status,
        details: apiError.details,
      };
    }
    if (error instanceof Error) {
      errorMessage = error.message;
      lineNo = extractLineNoFromError(errorMessage);
      return {
        entryId,
        entryLabel,
        message: errorMessage,
      };
    }
    errorMessage = String(error) || 'Unknown error';
    lineNo = extractLineNoFromError(errorMessage);
    return {
      entryId,
      entryLabel,
      message: errorMessage,
    };
  };

  const handleSubmitAll = async () => {
    if (entries.length === 0) return;
    
    setIsSubmitting(true);
    const errorDetails: ErrorDetail[] = [];
    const successfulEntryIds: string[] = [];

    try {
      // Validate entries before submission - check for required attachments
      const entriesWithErrors = entries.filter(entry => {
        if (entry.voucherType === 'Cash Payment' && (!entry.attachments || entry.attachments.length === 0)) {
          errorDetails.push({
            entryId: entry.id,
            entryLabel: `Entry ${entry.id}`,
            message: 'Attachment is required when Voucher Type is Cash Payment',
          });
          return true;
        }
        return false;
      });

      if (entriesWithErrors.length > 0) {
        setErrorDialogData({
          title: 'Validation Error',
          message: 'Some entries have validation errors. Please fix them before submitting.',
          errors: errorDetails,
          type: 'submit',
        });
        setErrorDialogOpen(true);
        setIsSubmitting(false);
        return;
      }

      // Process each entry and track status
      const updatedEntries = await Promise.all(
        entries.map(async (entry) => {
          try {
            // Step 1: Create document number first
            const documentNo = await createNoSeriesForVouchers(entry.voucherType);
            
            // Step 2: Create voucher with the document number
            const payload = buildVoucherPayload(entry, documentNo);
            await createVoucher(payload, entry.voucherType);

            // Step 3: Upload attachments if any (using the same document number)
            const failedFiles: string[] = [];
            if (entry.attachments && entry.attachments.length > 0) {
              for (const file of entry.attachments) {
                try {
                  const base64 = await convertFileToBase64(file);
                  const result = await uploadAttachment(
                    {
                      recNo: documentNo,
                      fileName: file.name,
                      fileEncodedTextDialog: base64,
                    },
                    entry.voucherType
                  );
                  console.log(`${file.name}: ${result.message || 'Uploaded successfully'}`);
                } catch (error) {
                  console.error(`Error uploading attachment ${file.name}:`, error);
                  failedFiles.push(file.name);
                  errorDetails.push(
                    extractErrorDetails(
                      error,
                      entry.id,
                      `Entry ${entry.id} - File: ${file.name}`
                    )
                  );
                }
              }
            }

            // Entry created successfully
            if (failedFiles.length > 0) {
              // Partial success - entry created but some files failed
              return {
                ...entry,
                status: 'partial' as const,
                failedFiles,
                errorMessage: `Entry created but ${failedFiles.length} file(s) failed to upload`,
              };
            } else {
              // Complete success
              successfulEntryIds.push(entry.id);
              return {
                ...entry,
                status: 'success' as const,
              };
            }
          } catch (error) {
            // Entry creation failed
            console.error(`Error creating voucher for entry ${entry.id}:`, error);
            const errorDetail = extractErrorDetails(
              error,
              entry.id,
              `Entry ${entry.id} - Voucher Creation`
            );
            errorDetails.push(errorDetail);
            return {
              ...entry,
              status: 'failed' as const,
              errorMessage: errorDetail.message,
            };
          }
        })
      );

      // Update entries - keep failed and partial, remove successful
      const remainingEntries = updatedEntries.filter(
        (entry) => entry.status === 'failed' || entry.status === 'partial'
      );
      setEntries(remainingEntries);

      // Refresh vouchers from ERP to show newly created entries
      await fetchVouchersFromERP();

      // Show summary
      const successCount = successfulEntryIds.length;
      const failedCount = remainingEntries.filter((e) => e.status === 'failed').length;
      const partialCount = remainingEntries.filter((e) => e.status === 'partial').length;

      if (successCount > 0 && failedCount === 0 && partialCount === 0) {
        // All successful
        setSuccessMessage(`All ${successCount} ${successCount === 1 ? 'entry' : 'entries'} submitted successfully!`);
        setSuccessDialogOpen(true);
    resetForm();
      } else if (errorDetails.length > 0) {
        // Show error dialog with detailed errors
        setErrorDialogData({
          title: 'Voucher Submission Errors',
          message: `Submitted ${successCount} entry(ies) successfully. ${failedCount + partialCount} entry(ies) had errors.`,
          errors: errorDetails,
          type: 'submit',
        });
        setErrorDialogOpen(true);
      } else {
        // Some failures or partials but no detailed errors captured
        setErrorDialogData({
          title: 'Voucher Submission Issues',
          message: `Submitted ${successCount} entry(ies) successfully. ${failedCount} entry(ies) failed to create. ${partialCount} entry(ies) created but had file upload issues.`,
          errors: [],
          type: 'submit',
        });
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error('Error submitting entries:', error);
      const errorDetail = extractErrorDetails(error);
      setErrorDialogData({
        title: 'Submission Error',
        message: 'An error occurred while submitting entries.',
        errors: [errorDetail],
        type: 'submit',
      });
      setErrorDialogOpen(true);
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

  const handleTestScenarios = () => {
    // Add test entries with different scenarios to demonstrate status handling
    const testEntries: VoucherEntry[] = [
      {
        id: `test-1-${Date.now()}`,
        voucherType: 'General Journal',
        documentType: 'Invoice',
        postingDate: new Date().toISOString().split('T')[0],
        documentDate: new Date().toISOString().split('T')[0],
        accountType: 'G/L Account',
        accountNo: 'ACC001',
        amount: 1000,
        balanceAccountType: 'G/L Account',
        balanceAccountNo: 'ACC002',
        lineNarration: 'Test entry - will succeed',
        lob: 'Feed',
        branch: 'Mumbai',
        loc: 'LOC001',
        status: 'pending',
      },
      {
        id: `test-2-${Date.now()}`,
        voucherType: 'Cash Payment',
        documentType: 'Payment',
        postingDate: new Date().toISOString().split('T')[0],
        documentDate: new Date().toISOString().split('T')[0],
        accountType: 'G/L Account',
        accountNo: 'ACC001',
        amount: 2000,
        balanceAccountType: 'G/L Account',
        balanceAccountNo: 'ACC002',
        lineNarration: 'Test entry - will fail',
        lob: 'Feed',
        branch: 'Mumbai',
        loc: 'LOC001',
        status: 'failed',
        errorMessage: 'Simulated failure for testing',
      },
      {
        id: `test-3-${Date.now()}`,
        voucherType: 'Cash Receipt',
        documentType: 'Refund',
        postingDate: new Date().toISOString().split('T')[0],
        documentDate: new Date().toISOString().split('T')[0],
        accountType: 'G/L Account',
        accountNo: 'ACC001',
        amount: 3000,
        balanceAccountType: 'G/L Account',
        balanceAccountNo: 'ACC002',
        lineNarration: 'Test entry - partial (file failed)',
        lob: 'Feed',
        branch: 'Mumbai',
        loc: 'LOC001',
        status: 'partial',
        errorMessage: 'Entry created but file upload failed',
        failedFiles: ['test-file.pdf', 'another-file.docx'],
      },
    ];
    setEntries([...entries, ...testEntries]);
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
    <div className="flex w-full min-w-0 flex-col p-4 gap-3">
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
            <>
            <Button type="button" size="sm" variant="outline" onClick={handleFillForm}>
              Fill
            </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleTestScenarios}>
                Test
              </Button>
            </>
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
          ) : isEditingVoucher ? (
            <>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                }}
                disabled={isUpdatingVoucher}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                size="sm" 
                onClick={handleAddEntry}
                disabled={isUpdatingVoucher}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {isUpdatingVoucher ? 'Updating...' : 'Update'}
              </Button>
            </>
          ) : (
            <Button 
              type="button" 
              size="sm" 
              onClick={handleAddEntry}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </div>

      {isEditingVoucher && (
        <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-500 rounded-md text-sm font-medium text-yellow-800 dark:text-yellow-200">
          Editing EDP record: {voucherToEdit?.Document_No} (Line No. {voucherToEdit?.Line_No})
        </div>
      )}
      <div 
        ref={formTableRef}
        data-form-card 
        className={cn(excelWrap, "min-w-0 overflow-x-auto cursor-grab", isEditingVoucher && "ring-2 ring-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10")}
      >
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
              {/* TCS Type header - shown when Account Type is Customer */}
              {showAccountTcs && (
                <TableHead className={cn(colHead, 'w-[160px]')}>
                  <FieldTitle>TCS Type</FieldTitle>
                </TableHead>
              )}
              <TableHead className={cn(colHead, 'w-[180px]')}>
                <FieldTitle required={formData.voucherType === 'General Journal'}>
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
              {/* TCS Type header - shown when Balance Account Type is Customer */}
              {showBalanceTcs && (
              <TableHead className={cn(colHead, 'w-[160px]')}>
                  <FieldTitle>TCS Type</FieldTitle>
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
                <FieldTitle required={isEmployeeMandatory}>Employee</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[160px]')}>
                <FieldTitle required={isAssignmentMandatory}>Assignment</FieldTitle>
              </TableHead>
              <TableHead className={cn(colHead, 'w-[200px]')}>
                <FieldTitle required={formData.voucherType === 'Cash Payment'}>Upload Files</FieldTitle>
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
                  id="postingDate"
                  aria-label="Posting Date"
                  aria-describedby={hasError('postingDate') ? 'postingDate-error' : undefined}
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
                  id="documentDate"
                  aria-label="Document Date"
                  aria-describedby={hasError('documentDate') ? 'documentDate-error' : undefined}
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
                    onValueChange={(v) => {
                      const newVoucherType = v as VoucherFormData['voucherType'];
                      updateField('voucherType', newVoucherType);
                      // Clear documentType if switching between incompatible types
                      if (newVoucherType === 'General Journal' && (formData.documentType === 'Payment' || formData.documentType === 'Refund')) {
                        updateField('documentType', null);
                      } else if ((newVoucherType === 'Cash Payment' || newVoucherType === 'Cash Receipt') && 
                                 (formData.documentType === 'NA' || formData.documentType === 'Invoice' || formData.documentType === 'Credit Memo')) {
                        updateField('documentType', null);
                      }
                    }}
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
                    disabled={!voucherTypeEnabled}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('documentType'), 'w-full', !voucherTypeEnabled && 'cursor-not-allowed')}
                      data-field-error={hasError('documentType')}
                    >
                      <SelectValue placeholder={getPlaceholder('documentType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.voucherType === 'General Journal' ? (
                        <>
                          <SelectItem value="NA">NA</SelectItem>
                      <SelectItem value="Invoice">Invoice</SelectItem>
                      <SelectItem value="Credit Memo">Credit Memo</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Payment">Payment</SelectItem>
                      <SelectItem value="Refund">Refund</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('accountType')}>
                  <Select
                    value={formData.accountType || undefined}
                    onValueChange={handleAccountTypeChange}
                    disabled={!accountTypeEnabled}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('accountType'), 'w-full', !accountTypeEnabled && 'cursor-not-allowed')}
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
                            tdsType: value,
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
                            tcsType: value,
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

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('externalDocumentNo')}
                  errorClass={getFieldErrorClass('externalDocumentNo')}
                  fullErrorMessage={getFullErrorMessage('externalDocumentNo')}
                  placeholder={getPlaceholder('externalDocumentNo', '')}
                  id="externalDocumentNo"
                  aria-label="External Document Number"
                  aria-describedby={hasError('externalDocumentNo') ? 'externalDocumentNo-error' : undefined}
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
                  id="description"
                  aria-label="Description"
                  aria-describedby={hasError('description') ? 'description-error' : undefined}
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
                  id="amount"
                  aria-label="Amount"
                  aria-describedby={hasError('amount') ? 'amount-error' : undefined}
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
                    onValueChange={(v) => {
                      updateField('balanceAccountType', v as VoucherFormData['balanceAccountType']);
                      // Clear Balance Account No. when Balance Account Type changes
                      updateField('balanceAccountNo', '');
                    }}
                    disabled={!balanceAccountEnabled || formData.accountType === 'Customer' || formData.accountType === 'Vendor'}
                  >
                    <SelectTrigger
                      className={cn(control, getFieldErrorClass('balanceAccountType'), 'w-full', (!balanceAccountEnabled || formData.accountType === 'Customer' || formData.accountType === 'Vendor') && 'cursor-not-allowed')}
                      data-field-error={hasError('balanceAccountType')}
                    >
                      <SelectValue placeholder={getPlaceholder('balanceAccountType', '')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.accountType === 'G/L Account' ? (
                        // When Account Type is G/L Account, show all 3 options
                        <>
                          <SelectItem value="G/L Account" disabled={true}>
                            G/L Account
                          </SelectItem>
                          <SelectItem value="Customer" disabled={false}>
                            Customer
                          </SelectItem>
                          <SelectItem value="Vendor" disabled={false}>
                            Vendor
                          </SelectItem>
                        </>
                      ) : (
                        // When Account Type is Customer or Vendor, only show G/L Account
                      <SelectItem value="G/L Account">G/L Account</SelectItem>
                      )}
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
                            tdsType: value,
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
                            tcsType: value,
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

              <TableCell className={colCell}>
                <InputWithTooltip
                  hasError={hasError('lineNarration')}
                  errorClass={getFieldErrorClass('lineNarration')}
                  fullErrorMessage={getFullErrorMessage('lineNarration')}
                  placeholder={getPlaceholder('lineNarration', '')}
                  id="lineNarration"
                  aria-label="Line Narration"
                  aria-describedby={hasError('lineNarration') ? 'lineNarration-error' : undefined}
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
                  <CascadingDimensionSelect
                    dimensionType="LOB"
                    value={formData.lob}
                    onChange={(value) => {
                      updateField('lob', value);
                      // Clear Branch and LOC when LOB changes
                      if (formData.branch) updateField('branch', '');
                      if (formData.loc) updateField('loc', '');
                    }}
                    placeholder={getPlaceholder('lob', 'Select LOB')}
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    userId={userID || undefined}
                    hasError={hasError('lob')}
                    errorClass={getFieldErrorClass('lob')}
                    disabled={!restFieldsEnabled}
                  />
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('branch')}>
                  <CascadingDimensionSelect
                    dimensionType="BRANCH"
                    value={formData.branch}
                    onChange={(value) => {
                      updateField('branch', value);
                      // Clear LOC when Branch changes
                      if (formData.loc) updateField('loc', '');
                    }}
                    placeholder={getPlaceholder('branch', 'Select Branch')}
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    hasError={hasError('branch')}
                    userId={userID || undefined}
                    lobValue={formData.lob}
                    errorClass={getFieldErrorClass('branch')}
                    disabled={!restFieldsEnabled}
                  />
                </CellWithTooltip>
              </TableCell>

              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('loc')}>
                  <CascadingDimensionSelect
                    dimensionType="LOC"
                    value={formData.loc}
                    onChange={(value) => updateField('loc', value)}
                    placeholder={getPlaceholder('loc', 'Select LOC')}
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                    hasError={hasError('loc')}
                    errorClass={getFieldErrorClass('loc')}
                    disabled={!restFieldsEnabled}
                    lobValue={formData.lob}
                    branchValue={formData.branch}
                    userId={userID || undefined}
                  />
                </CellWithTooltip>
              </TableCell>

              {/* Employee - always shown after LOC, required if mandatory */}
              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('employee')}>
                  <DimensionSelect
                    dimensionType="EMPLOYEE"
                    value={formData.employee || ''}
                    onChange={(value) => updateField('employee', value)}
                    placeholder={getPlaceholder('employee', 'Select Employee')}
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                  hasError={hasError('employee')}
                  errorClass={getFieldErrorClass('employee')}
                    disabled={!restFieldsEnabled}
                  />
                </CellWithTooltip>
              </TableCell>

              {/* Assignment - always shown after LOC, required if mandatory */}
              <TableCell className={colCell}>
                <CellWithTooltip errorMessage={getFullErrorMessage('assignment')}>
                  <DimensionSelect
                    dimensionType="ASSIGNMENT"
                    value={formData.assignment || ''}
                    onChange={(value) => updateField('assignment', value)}
                    placeholder={getPlaceholder('assignment', 'Select Assignment')}
                    className={cn(control, !restFieldsEnabled && 'cursor-not-allowed')}
                  hasError={hasError('assignment')}
                  errorClass={getFieldErrorClass('assignment')}
                    disabled={!restFieldsEnabled}
                  />
                </CellWithTooltip>
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
                      variant="default"
                      size="sm"
                      className={cn("w-full", !restFieldsEnabled && 'cursor-not-allowed')}
                      disabled={isSubmitting || !restFieldsEnabled}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
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
          <div 
            ref={entriesTableRef}
            className="rounded-md border bg-background overflow-x-auto cursor-grab"
          >
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
                  <TableHead className={cn(colHead, 'w-[140px]')}>TDS</TableHead>
                  <TableHead className={cn(colHead, 'w-[140px]')}>TCS</TableHead>
                  <TableHead className={cn(colHead, 'w-[200px]')}>Upload Files</TableHead>
                  <TableHead className={cn(colHead, 'w-[120px]')}>Status</TableHead>
                  <TableHead className={cn(colHead, 'w-[110px]')}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <ContextMenu key={entry.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow className={cn(
                        pendingEditId === entry.id && 'bg-primary/5',
                        entry.status === 'failed' && 'bg-destructive/10 hover:bg-destructive/15',
                        entry.status === 'partial' && 'bg-yellow-500/10 hover:bg-yellow-500/15'
                      )}>
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
                        : '-'}
                    </TableCell>
                    <TableCell className="p-2 text-xs">
                      {entry.accountTcsSection?.tcsType && entry.accountTcsSection.tcsType !== 'NA'
                        ? entry.accountTcsSection.tcsType
                        : entry.balanceTcsSection?.tcsType && entry.balanceTcsSection.tcsType !== 'NA'
                        ? entry.balanceTcsSection.tcsType
                        : '-'}
                    </TableCell>
                    <TableCell className="p-2 text-xs">
                      {entry.attachments && entry.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {entry.attachments.map((file, index) => {
                            const isFailed = entry.failedFiles?.includes(file.name);
                            return (
                              <span 
                                key={index} 
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-xs truncate max-w-[150px]",
                                  isFailed ? "bg-destructive/20 text-destructive border border-destructive/30" : "bg-muted"
                                )} 
                                title={isFailed ? `${file.name} - Upload failed` : file.name}
                              >
                                {file.name}
                                {isFailed && ' ⚠'}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex flex-col gap-1">
                        {entry.status === 'failed' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30" title={entry.errorMessage}>
                            Failed
                          </span>
                        )}
                        {entry.status === 'partial' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 border border-yellow-500/30">
                              Partial
                            </span>
                            {entry.failedFiles && entry.failedFiles.length > 0 && (
                              <span className="text-xs text-muted-foreground" title={entry.errorMessage}>
                                {entry.failedFiles.length} file(s) failed
                              </span>
                            )}
                          </div>
                        )}
                        {entry.status === 'success' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-500 border border-green-500/30">
                            Success
                          </span>
                        )}
                        {(!entry.status || entry.status === 'pending') && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </div>
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

        {/* Legend */}
        {entries.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="font-semibold mb-2 text-foreground/80">Status Legend:</div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/10 border border-destructive/30"></div>
                <span>Entry failed to create</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/10 border border-yellow-500/30"></div>
                <span>Entry created but file(s) failed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/30 text-xs">File ⚠</span>
                <span>File upload failed</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fetched Vouchers Table */}
      <div className="flex flex-col gap-2 mt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground/80">
            Vouchers from ERP
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handlePostVouchers}
            disabled={isPosting || fetchedVouchers.length === 0}
            title={fetchedVouchers.length === 0 ? 'No vouchers to post' : 'Post all vouchers'}
          >
            {isPosting ? 'Posting...' : 'Post'}
          </Button>
        </div>
        {isLoadingVouchers ? (
          <div className="rounded-md border bg-muted/20 p-6 text-center text-foreground/70">
            <div>Loading vouchers...</div>
          </div>
        ) : fetchedVouchers.length === 0 ? (
          <div className="rounded-md border bg-muted/20 p-6 text-center text-foreground/70">
            <div>No vouchers found.</div>
          </div>
        ) : (
          <div 
            ref={vouchersTableRef}
            className="rounded-md border bg-background overflow-x-auto cursor-grab"
          >
            <Table className={tableClass}>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted sticky left-0 z-20', 'w-[100px]')} style={{ borderRight: '2px solid hsl(var(--border))' }}>Doc No</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted sticky left-[100px] z-20', 'w-[90px]')} style={{ borderRight: '2px solid hsl(var(--border))' }}>Posting</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted sticky left-[190px] z-20', 'w-[100px]')} style={{ borderRight: '2px solid hsl(var(--border))' }}>Template</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[90px]')}>Doc Type</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[90px]')}>Acc Type</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[100px]')}>Acc No</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[110px]')}>Ext Doc</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[130px]')}>Description</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30 text-right', 'w-[90px]')}>Amount</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[90px]')}>Bal Type</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[100px]')}>Bal No</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[140px]')}>Narration</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[80px]')}>LOB</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[90px]')}>Branch</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[80px]')}>LOC</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[90px]')}>Employee</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[100px]')}>Assignment</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[80px]')}>TDS</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[80px]')}>TCS</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[60px]')}>Tax</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[100px]')}>User ID</TableHead>
                  <TableHead className={cn('px-1 py-1 text-xs font-semibold text-foreground/80 bg-muted/30', 'w-[80px]')}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fetchedVouchers.map((voucher, index) => (
                  <React.Fragment key={`${voucher.Document_No}-${index}`}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <TableRow className={failedVoucherLineNos.has(voucher.Line_No) ? 'bg-destructive/10 hover:bg-destructive/15' : ''}>
                    <TableCell className={cn("px-1 py-0.5 text-xs font-medium sticky left-0 z-20 bg-background", failedVoucherLineNos.has(voucher.Line_No) && 'bg-destructive/10')} style={{ borderRight: '2px solid hsl(var(--border))' }}>{voucher.Document_No}</TableCell>
                    <TableCell className={cn("px-1 py-0.5 text-xs sticky left-[100px] z-20 bg-background")} style={{ borderRight: '2px solid hsl(var(--border))' }}>{voucher.Posting_Date}</TableCell>
                    <TableCell className={cn("px-1 py-0.5 text-xs sticky left-[190px] z-20 bg-background")} style={{ borderRight: '2px solid hsl(var(--border))' }}>{voucher.Journal_Template_Name}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Document_Type}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Account_Type}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Account_No}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.External_Document_No || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Description || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs text-right tabular-nums">{voucher.Amount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Bal_Account_Type}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Bal_Account_No}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Line_Narration1 || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Shortcut_Dimension_1_Code || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.Shortcut_Dimension_2_Code || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.ShortcutDimCode3 || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.ShortcutDimCode4 || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.ShortcutDimCode5 || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.TDS_Section_Code || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.TCS_Nature_of_Collection || '-'}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">
                      <Tooltip
                        open={openTooltipId === voucher.Document_No}
                        onOpenChange={(open) => {
                          if (open) {
                            const currentDocNo = voucher.Document_No;
                            
                            // Close any other open tooltip and cancel its request
                            if (openTooltipId && openTooltipId !== currentDocNo) {
                              // Mark previous request as cancelled
                              fetchingDocumentRef.current = null;
                              activeRequestRef.current = null;
                              // Clear loading state for previous tooltip
                              setLoadingTaxDetails(prev => {
                                const next = { ...prev };
                                delete next[openTooltipId];
                                return next;
                              });
                            }
                            
                            setOpenTooltipId(currentDocNo);
                            
                            // Fetch tax details if not already loaded
                            if (!taxDetails[currentDocNo] && !loadingTaxDetails[currentDocNo]) {
                              // If there's already an active request, wait for it to complete or be cancelled
                              // But since we're using refs, we can just cancel it and start new one
                              if (activeRequestRef.current) {
                                // Previous request will be ignored via fetchingDocumentRef check
                                fetchingDocumentRef.current = null;
                                activeRequestRef.current = null;
                              }
                              
                              // Mark this as the current fetching document
                              fetchingDocumentRef.current = currentDocNo;
                              setLoadingTaxDetails(prev => ({ ...prev, [currentDocNo]: true }));
                              
                              // Start new request and store the promise
                              const requestPromise = getTaxComponentsInJson(currentDocNo)
                                .then((details) => {
                                  // Only update if this is still the current fetching document
                                  // This ensures only the latest request updates state
                                  if (fetchingDocumentRef.current === currentDocNo && activeRequestRef.current === requestPromise) {
                                    setTaxDetails(prev => ({ ...prev, [currentDocNo]: details }));
                                    setLoadingTaxDetails(prev => ({ ...prev, [currentDocNo]: false }));
                                    fetchingDocumentRef.current = null;
                                    activeRequestRef.current = null;
                                  }
                                  return details;
                                })
                                .catch((error) => {
                                  // Only update if this is still the current fetching document
                                  if (fetchingDocumentRef.current === currentDocNo && activeRequestRef.current === requestPromise) {
                                console.error('Error fetching tax details:', error);
                                    setTaxDetails(prev => ({ ...prev, [currentDocNo]: [] }));
                                    setLoadingTaxDetails(prev => ({ ...prev, [currentDocNo]: false }));
                                    fetchingDocumentRef.current = null;
                                    activeRequestRef.current = null;
                                  }
                                  throw error;
                                });
                              
                              // Store the active request promise
                              activeRequestRef.current = requestPromise;
                            }
                          } else {
                            setOpenTooltipId(null);
                            // Mark request as cancelled if this was the one being fetched
                            if (fetchingDocumentRef.current === voucher.Document_No) {
                              fetchingDocumentRef.current = null;
                              activeRequestRef.current = null;
                            }
                            // Clear loading state
                            setLoadingTaxDetails(prev => {
                              const next = { ...prev };
                              delete next[voucher.Document_No];
                              return next;
                            });
                              }
                        }}
                      >
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                        className="flex items-center justify-center w-full h-full hover:bg-muted/50 rounded p-1 transition-colors"
                      >
                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-5xl relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenTooltipId(null);
                              // Mark request as cancelled if this was the one being fetched
                              if (fetchingDocumentRef.current === voucher.Document_No) {
                                fetchingDocumentRef.current = null;
                                activeRequestRef.current = null;
                              }
                              // Clear loading state
                              setLoadingTaxDetails(prev => {
                                const next = { ...prev };
                                delete next[voucher.Document_No];
                                return next;
                              });
                            }}
                            className="absolute top-1 right-1 p-1 hover:bg-muted rounded-sm transition-colors z-10"
                            aria-label="Close"
                              >
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            {loadingTaxDetails[voucher.Document_No] ? (
                            <div className="flex items-center gap-2 py-3 pr-8">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <span className="text-sm font-medium">Fetching tax details...</span>
                              </div>
                            ) : taxDetails[voucher.Document_No] && taxDetails[voucher.Document_No].length > 0 ? (
                            <div className="space-y-3 pr-8">
                              <div className="text-sm font-semibold">Tax Details:</div>
                              <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
                                    {taxDetails[voucher.Document_No].map((detail, idx) => (
                                  <div key={idx} className="border-b last:border-b-0 pb-2 last:pb-0">
                                    {Object.entries(detail as Record<string, unknown>).map(([key, value]) => (
                                      <div key={key} className="flex gap-3 py-0.5">
                                        <span className="font-medium min-w-[150px]">{key}:</span>
                                        <span className="flex-1">{String(value ?? '-')}</span>
                                      </div>
                                        ))}
                                  </div>
                                    ))}
                              </div>
                            </div>
                          ) : taxDetails[voucher.Document_No]?.length === 0 ? (
                            <div className="py-2 pr-8">
                              <span className="text-sm">No tax details found</span>
                              </div>
                            ) : (
                            <div className="py-2 pr-8">
                              <span className="text-sm">Click to load tax details</span>
                              </div>
                            )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">{voucher.User_ID}</TableCell>
                    <TableCell className="px-1 py-0.5 text-xs">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            loadVoucherForEdit(voucher);
                          }}
                          className="h-8 w-8"
                          disabled={isUpdatingVoucher || isEditingVoucher}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setVoucherToDelete(voucher);
                            setShowDeleteVoucherWarning(true);
                          }}
                          className="h-8 w-8"
                          disabled={isDeletingVoucher || isEditingVoucher}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          loadVoucherForEdit(voucher);
                        }}
                        disabled={isUpdatingVoucher || isEditingVoucher}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          setVoucherToDelete(voucher);
                          setShowDeleteVoucherWarning(true);
                        }}
                        variant="destructive"
                        disabled={isDeletingVoucher || isEditingVoucher}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  </React.Fragment>
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

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <DialogTitle className="text-green-600 dark:text-green-400">Success</DialogTitle>
            </div>
            <DialogDescription className="pt-2">{successMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSuccessDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialogOpen}
        onOpenChange={(open) => {
          setErrorDialogOpen(open);
          // Clear highlights when dialog is closed
          if (!open) {
            setFailedVoucherLineNos(new Set());
          }
        }}
        title={errorDialogData.title}
        message={errorDialogData.message}
        errors={errorDialogData.errors}
        type={errorDialogData.type}
      />

      {/* Update Voucher Warning Dialog */}
      <Dialog open={showUpdateVoucherWarning} onOpenChange={setShowUpdateVoucherWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Voucher</DialogTitle>
            <DialogDescription>
              Are you sure you want to update voucher {voucherToEdit?.Document_No} (Line No. {voucherToEdit?.Line_No})? This will modify the existing record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUpdateVoucherWarning(false);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleUpdateVoucher();
              }}
              disabled={isUpdatingVoucher}
            >
              {isUpdatingVoucher ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Voucher Warning Dialog */}
      <Dialog open={showDeleteVoucherWarning} onOpenChange={setShowDeleteVoucherWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Voucher</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete voucher {voucherToDelete?.Document_No}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteVoucherWarning(false);
              setVoucherToDelete(null);
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (voucherToDelete) {
                  handleDeleteVoucher(voucherToDelete);
                }
              }}
              disabled={isDeletingVoucher}
            >
              {isDeletingVoucher ? 'Deleting...' : 'Delete'}
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
