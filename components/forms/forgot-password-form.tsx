'use client';

/**
 * Forgot Password Form component
 * Simple form to request password reset via registered mobile number
 */

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { forgotPassword } from '@/lib/api/services/auth.service';

const forgotPasswordSchema = z.object({
  userID: z.string().min(1, 'UserID is required'),
  registredModileNo: z.string().min(1, 'Registered mobile number is required'),
});

type ForgotPasswordFormState = {
  userID: string;
  registredModileNo: string;
};

type ValidationErrors = {
  userID?: string[];
  registredModileNo?: string[];
};

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function ForgotPasswordForm({
  onSuccess,
  onCancel,
  className,
}: ForgotPasswordFormProps) {
  const [formData, setFormData] = useState<ForgotPasswordFormState>({
    userID: '',
    registredModileNo: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate form
    const result = forgotPasswordSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: ValidationErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ForgotPasswordFormState;
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field]!.push(issue.message);
      });
      setValidationErrors(errors);
      return;
    }

    // Clear errors
    setValidationErrors({});
    setError(null);
    setIsSubmitting(true);

    try {
      // Call ERP forgot password API directly
      const response = await forgotPassword(formData.userID, formData.registredModileNo);

      // Check if request was successful
      if (response.value !== 'Password has been sent your registered mobile no.') {
        setError('Failed to send password. Please check your UserID and mobile number.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);
      
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      if (err instanceof Error) {
        setError(err.message || 'An error occurred. Please try again.');
      } else {
        setError('An error occurred. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof ForgotPasswordFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (success) {
    return (
      <div className={cn('flex flex-col gap-4 p-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800', className)}>
        <div className="text-sm font-medium text-green-900 dark:text-green-100">
          Password has been sent to your registered mobile number.
        </div>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Back to Login
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className={cn('flex flex-col gap-4', className)}
      onSubmit={handleSubmit}
    >
      <div className="text-sm font-medium">Forgot Password?</div>
      <p className="text-xs text-muted-foreground">
        Enter your UserID and registered mobile number to receive your password.
      </p>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="forgot-userID">UserID</FieldLabel>
          <Input
            id="forgot-userID"
            type="text"
            value={formData.userID}
            onChange={(e) => updateField('userID', e.target.value)}
            placeholder="Enter your UserID"
            required
          />
          {validationErrors.userID && validationErrors.userID.length > 0 && (
            <p className="text-sm text-destructive mt-1">
              {validationErrors.userID[0]}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="forgot-mobile">Registered Mobile Number</FieldLabel>
          <Input
            id="forgot-mobile"
            type="text"
            value={formData.registredModileNo}
            onChange={(e) => updateField('registredModileNo', e.target.value)}
            placeholder="Enter registered mobile number"
            required
          />
          {validationErrors.registredModileNo && validationErrors.registredModileNo.length > 0 && (
            <p className="text-sm text-destructive mt-1">
              {validationErrors.registredModileNo[0]}
            </p>
          )}
        </Field>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button type="submit" className={onCancel ? 'flex-1' : 'w-full'} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Password'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

