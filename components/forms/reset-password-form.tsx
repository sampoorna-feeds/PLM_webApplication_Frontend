'use client';

/**
 * Reset Password Form component
 * Form to reset password for authenticated users
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
import { useAuth } from '@/lib/contexts/auth-context';
import { resetPassword } from '@/lib/api/services/auth.service';

const resetPasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormState = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ValidationErrors = {
  oldPassword?: string[];
  newPassword?: string[];
  confirmPassword?: string[];
};

interface ResetPasswordFormProps {
  className?: string;
}

export function ResetPasswordForm({ className }: ResetPasswordFormProps) {
  const { userID } = useAuth();
  const [formData, setFormData] = useState<ResetPasswordFormState>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate form
    const result = resetPasswordSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: ValidationErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ResetPasswordFormState;
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

    if (!userID) {
      setError('You must be logged in to reset your password.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Call ERP reset password API directly
      const response = await resetPassword(userID, formData.oldPassword, formData.newPassword);

      // Check if reset was successful
      if (response.value !== 'Password has been Sucussfully reset') {
        setError('Password reset failed. Please check your current password.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);
      
      // Reset form
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error('Reset password error:', err);
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('Invalid')) {
          setError('Invalid current password. Please try again.');
        } else {
          setError(err.message || 'An error occurred. Please try again.');
        }
      } else {
        setError('An error occurred. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof ResetPasswordFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Clear success message when user starts typing
    if (success) {
      setSuccess(false);
    }
  };

  return (
    <form
      className={cn('flex flex-col gap-4', className)}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="old-password">Current Password</FieldLabel>
          <Input
            id="old-password"
            type="password"
            value={formData.oldPassword}
            onChange={(e) => updateField('oldPassword', e.target.value)}
            placeholder="Enter current password"
            required
          />
          {validationErrors.oldPassword && validationErrors.oldPassword.length > 0 && (
            <p className="text-sm text-destructive mt-1">
              {validationErrors.oldPassword[0]}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="new-password">New Password</FieldLabel>
          <Input
            id="new-password"
            type="password"
            value={formData.newPassword}
            onChange={(e) => updateField('newPassword', e.target.value)}
            placeholder="Enter new password"
            required
          />
          {validationErrors.newPassword && validationErrors.newPassword.length > 0 && (
            <p className="text-sm text-destructive mt-1">
              {validationErrors.newPassword[0]}
            </p>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
          <Input
            id="confirm-password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            placeholder="Confirm new password"
            required
          />
          {validationErrors.confirmPassword && validationErrors.confirmPassword.length > 0 && (
            <p className="text-sm text-destructive mt-1">
              {validationErrors.confirmPassword[0]}
            </p>
          )}
        </Field>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 text-sm text-green-900 dark:text-green-100">
            Password has been successfully reset
          </div>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
        </Button>
      </div>
    </form>
  );
}

