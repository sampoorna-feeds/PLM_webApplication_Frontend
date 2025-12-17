'use client';

/**
 * Login form component - login-02 style
 * Uses simple React forms with Zod validation
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';

type LoginFormState = {
  username: string;
  password: string;
};

type ValidationErrors = {
  username?: string[];
  password?: string[];
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'form'>) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState<LoginFormState>({
    username: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate form
    const result = loginSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: ValidationErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginFormState;
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
    setIsSubmitting(true);

    // Call login with dummy validation (temp/temp)
    login(formData.username, formData.password);
    
    // Wait a tick for Zustand state to update, then redirect
    await new Promise(resolve => setTimeout(resolve, 0));
    router.replace('/voucher-form');
  };

  const updateField = (field: keyof LoginFormState, value: string) => {
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

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
        </div>
        
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => updateField('username', e.target.value)}
            placeholder="Enter username"
            required
          />
          {validationErrors.username && validationErrors.username.length > 0 && (
            <p className="text-sm text-destructive mt-1">
              {validationErrors.username[0]}
            </p>
          )}
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
          </div>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="Enter password"
            required
          />
          {validationErrors.password && validationErrors.password.length > 0 && (
            <p className="text-sm text-destructive mt-1">
              {validationErrors.password[0]}
            </p>
          )}
        </Field>

        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
