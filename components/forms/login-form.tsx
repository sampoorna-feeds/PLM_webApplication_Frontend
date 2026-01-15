'use client';

/**
 * Login form component - login-02 style
 * Uses simple React forms with Zod validation
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { loginUser } from '@/lib/api/services/auth.service';
import { setAuthCredentials, getRememberedUsername } from '@/lib/auth/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';

type LoginFormState = {
  username: string;
  password: string;
  rememberMe: boolean;
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
  const searchParams = useSearchParams();
  const { refreshAuth } = useAuth();
  // Load remembered username from storage on mount
  const [formData, setFormData] = useState<LoginFormState>(() => {
    if (typeof window !== 'undefined') {
      const rememberedUsername = getRememberedUsername();
      return {
        username: rememberedUsername || '',
        password: '',
        rememberMe: !!rememberedUsername, // Auto-check if username was remembered
      };
    }
    return {
      username: '',
      password: '',
      rememberMe: false,
    };
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate form
    const result = loginSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: ValidationErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginFormState;
        // Only include fields that are in ValidationErrors (skip rememberMe)
        if (field === 'username' || field === 'password') {
          if (!errors[field]) {
            errors[field] = [];
          }
          errors[field]!.push(issue.message);
        }
      });
      setValidationErrors(errors);
      return;
    }

    // Clear errors
    setValidationErrors({});
    setError(null);
    setIsSubmitting(true);

    try {
      // Call ERP login API directly
      const response = await loginUser(formData.username, formData.password);

      // Check if login was successful (ERP returns "OK" in value field)
      if (response.value !== 'OK') {
        setError('Invalid credentials. Please check your username and password.');
        setIsSubmitting(false);
        return;
      }

      // Store credentials in localStorage/sessionStorage
      setAuthCredentials(formData.username, formData.password, formData.rememberMe);

      // Refresh auth context to get userID
      await refreshAuth();
      
      // Redirect to intended page or default
      const redirect = searchParams.get('redirect') || '/voucher-form';
      router.replace(redirect);
    } catch (err) {
      console.error('Login error:', err);
      // Check if it's an authentication error
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('Invalid')) {
          setError('Invalid credentials. Please check your username and password.');
        } else {
          setError(err.message || 'An error occurred. Please try again.');
        }
      } else {
        setError('An error occurred. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof LoginFormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={formData.rememberMe}
              onCheckedChange={(checked) => updateField('rememberMe', checked === true)}
            />
            <label
              htmlFor="rememberMe"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Remember me
            </label>
          </div>
        </Field>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
