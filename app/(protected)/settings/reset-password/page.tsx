'use client';

/**
 * Reset Password Page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResetPasswordForm } from '@/components/forms/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 flex-col p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-muted-foreground mt-2">
          Change your password to keep your account secure
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

